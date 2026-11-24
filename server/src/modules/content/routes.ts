import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Db } from '../../db';
import { requireAdmin, requireUser } from '../auth/auth';
import { uniqueSlug } from '../registry/slug';
import {
  EventInput,
  EVENT_KINDS,
  FUNDING_TYPES,
  JOB_TYPES,
  ModerationDecision,
  NEWS_CATEGORIES,
  NewsInput,
  OpportunityInput,
  OrganisationUpdate,
  Paging,
  PROJECT_KINDS,
  ProjectInput,
} from './schemas';

const IdParam = z.object({ id: z.coerce.number().int().positive() });
const SlugParam = z.object({ slug: z.string().regex(/^[a-z0-9-]+$/) });

/** "New species of Garra from Kerala!" → "new-species-of-garra-from-kerala" */
export function titleSlug(title: string): string {
  return (
    title
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 70)
      .replace(/-+$/, '') || 'item'
  );
}

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Admins publish directly; everyone else's submissions wait for moderation. */
const initialStatus = (request: FastifyRequest) => (request.user?.role === 'admin' ? 'published' : 'pending');

/** Published, or visible to its submitter / an admin while pending. */
function canSee(request: FastifyRequest, item: { status: string; submittedById: number | null }) {
  return item.status === 'published' || request.user?.role === 'admin' || (!!request.user && request.user.id === item.submittedById);
}

const institutionRef = { select: { id: true, name: true, city: true, region: true } } as const;

export async function contentRoutes(app: FastifyInstance, { db }: { db: Db }) {
  // ═════════════ Module 14: News ═════════════

  app.get('/news', async (request) => {
    const { page, pageSize } = Paging.parse(request.query);
    const { category } = z.object({ category: z.enum(NEWS_CATEGORIES).optional() }).parse(request.query);
    const where = { status: 'published', ...(category ? { category } : {}) };
    const [total, items] = await Promise.all([
      db.newsPost.count({ where }),
      db.newsPost.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: page * pageSize,
        take: pageSize,
        select: { id: true, slug: true, title: true, summary: true, category: true, publishedAt: true },
      }),
    ]);
    return { total, page, pageSize, items };
  });

  app.get('/news/admin/all', async (request) => {
    requireAdmin(request);
    return db.newsPost.findMany({
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      select: { id: true, slug: true, title: true, category: true, status: true, publishedAt: true, updatedAt: true },
    });
  });

  app.get('/news/admin/:id', async (request, reply) => {
    requireAdmin(request);
    const { id } = IdParam.parse(request.params);
    return (await db.newsPost.findUnique({ where: { id } })) ?? reply.code(404).send({ error: 'Not found' });
  });

  app.get('/news/:slug', async (request, reply) => {
    const { slug } = SlugParam.parse(request.params);
    const post = await db.newsPost.findUnique({ where: { slug }, include: { author: { select: { displayName: true } } } });
    if (!post || (post.status !== 'published' && request.user?.role !== 'admin')) return reply.code(404).send({ error: 'Not found' });
    return post;
  });

  app.post('/news', async (request, reply) => {
    const admin = requireAdmin(request);
    const body = NewsInput.parse(request.body);
    const slug = await uniqueSlug(titleSlug(body.title), async (s) => !!(await db.newsPost.findUnique({ where: { slug: s } })));
    const post = await db.newsPost.create({
      data: { ...body, slug, authorId: admin.id, publishedAt: body.status === 'published' ? new Date() : null },
    });
    return reply.code(201).send(post);
  });

  app.put('/news/:id', async (request, reply) => {
    requireAdmin(request);
    const { id } = IdParam.parse(request.params);
    const body = NewsInput.parse(request.body);
    const existing = await db.newsPost.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: 'Not found' });
    return db.newsPost.update({
      where: { id },
      data: {
        ...body,
        // Keep the original publication date when re-saving a published post.
        publishedAt: body.status === 'published' ? (existing.publishedAt ?? new Date()) : null,
      },
    });
  });

  app.delete('/news/:id', async (request) => {
    requireAdmin(request);
    const { id } = IdParam.parse(request.params);
    await db.newsPost.deleteMany({ where: { id } });
    return { ok: true };
  });

  // ═════════════ Module 14: Events ═════════════

  app.get('/events', async (request) => {
    const q = z
      .object({
        when: z.enum(['upcoming', 'past']).default('upcoming'),
        kind: z.enum(EVENT_KINDS).optional(),
        /** Comma-separated kinds, e.g. "workshop,field-course,webinar" (Learning → Workshops). */
        kinds: z
          .string()
          .optional()
          .transform((v) => (v ? v.split(',').filter((k) => (EVENT_KINDS as readonly string[]).includes(k)) : undefined)),
      })
      .extend(Paging.shape)
      .parse(request.query);
    const today = startOfToday();
    const where = {
      status: 'published',
      ...(q.kind ? { kind: q.kind } : q.kinds?.length ? { kind: { in: q.kinds } } : {}),
      // An event is upcoming until its last day has passed.
      ...(q.when === 'upcoming'
        ? { OR: [{ endsOn: { gte: today } }, { endsOn: null, startsOn: { gte: today } }] }
        : { OR: [{ endsOn: { lt: today } }, { endsOn: null, startsOn: { lt: today } }] }),
    };
    const [total, items] = await Promise.all([
      db.event.count({ where }),
      db.event.findMany({
        where,
        orderBy: { startsOn: q.when === 'upcoming' ? 'asc' : 'desc' },
        skip: q.page * q.pageSize,
        take: q.pageSize,
        omit: { description: true, moderationNote: true },
      }),
    ]);
    return { total, page: q.page, pageSize: q.pageSize, items };
  });

  app.get('/events/:slug', async (request, reply) => {
    const { slug } = SlugParam.parse(request.params);
    const event = await db.event.findUnique({ where: { slug } });
    if (!event || !canSee(request, event)) return reply.code(404).send({ error: 'Not found' });
    return event;
  });

  app.post('/events', { config: { rateLimit: { max: 10, timeWindow: '1 hour' } } }, async (request, reply) => {
    const user = requireUser(request);
    const body = EventInput.parse(request.body);
    const slug = await uniqueSlug(titleSlug(body.title), async (s) => !!(await db.event.findUnique({ where: { slug: s } })));
    const event = await db.event.create({ data: { ...body, slug, status: initialStatus(request), submittedById: user.id } });
    return reply.code(201).send({ slug: event.slug, status: event.status });
  });

  // ═════════════ Modules 8 & 9: Opportunities ═════════════

  app.get('/opportunities', async (request) => {
    const q = z
      .object({
        /** Omit to search both sections (e.g. all fellowships). */
        section: z.enum(['funding', 'jobs']).optional(),
        type: z.string().max(40).optional(),
        q: z.string().trim().max(100).optional(),
        includeClosed: z.coerce.boolean().default(false),
      })
      .extend(Paging.shape)
      .parse(request.query);
    const where = {
      status: 'published',
      ...(q.section ? { section: q.section } : {}),
      ...(q.type ? { type: q.type } : {}),
      // Open = no deadline, or deadline today or later. Funded projects & resources never "close".
      ...(q.includeClosed ? {} : { OR: [{ deadline: null }, { deadline: { gte: startOfToday() } }] }),
      ...(q.q
        ? { AND: [{ OR: [{ title: { contains: q.q } }, { organisation: { contains: q.q } }, { description: { contains: q.q } }, { location: { contains: q.q } }] }] }
        : {}),
    };
    const [total, items] = await Promise.all([
      db.opportunity.count({ where }),
      db.opportunity.findMany({
        where,
        // Soonest deadline first; open-ended last.
        orderBy: [{ deadline: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
        skip: q.page * q.pageSize,
        take: q.pageSize,
        omit: { description: true, eligibility: true, moderationNote: true },
      }),
    ]);
    return { total, page: q.page, pageSize: q.pageSize, types: q.section === 'funding' ? FUNDING_TYPES : q.section === 'jobs' ? JOB_TYPES : [], items };
  });

  app.get('/opportunities/:slug', async (request, reply) => {
    const { slug } = SlugParam.parse(request.params);
    const item = await db.opportunity.findUnique({ where: { slug }, include: { institution: institutionRef } });
    if (!item || !canSee(request, item)) return reply.code(404).send({ error: 'Not found' });
    return item;
  });

  app.post('/opportunities', { config: { rateLimit: { max: 10, timeWindow: '1 hour' } } }, async (request, reply) => {
    const user = requireUser(request);
    const body = OpportunityInput.parse(request.body);
    const slug = await uniqueSlug(titleSlug(body.title), async (s) => !!(await db.opportunity.findUnique({ where: { slug: s } })));
    const item = await db.opportunity.create({ data: { ...body, slug, status: initialStatus(request), submittedById: user.id } });
    return reply.code(201).send({ slug: item.slug, status: item.status });
  });

  // ═════════════ Module 7: Conservation projects ═════════════

  app.get('/conservation/projects', async (request) => {
    const q = z
      .object({ kind: z.enum(PROJECT_KINDS).optional(), q: z.string().trim().max(100).optional() })
      .extend(Paging.shape)
      .parse(request.query);
    const where = {
      status: 'published',
      ...(q.kind ? { kind: q.kind } : {}),
      ...(q.q
        ? { OR: [{ title: { contains: q.q } }, { summary: { contains: q.q } }, { focusSpecies: { contains: q.q } }, { region: { contains: q.q } }] }
        : {}),
    };
    const [total, items] = await Promise.all([
      db.conservationProject.count({ where }),
      db.conservationProject.findMany({
        where,
        orderBy: [{ projectStatus: 'desc' }, { updatedAt: 'desc' }],
        skip: q.page * q.pageSize,
        take: q.pageSize,
        include: { institution: institutionRef },
        omit: { description: true, moderationNote: true },
      }),
    ]);
    return { total, page: q.page, pageSize: q.pageSize, items };
  });

  app.get('/conservation/projects/:slug', async (request, reply) => {
    const { slug } = SlugParam.parse(request.params);
    const item = await db.conservationProject.findUnique({ where: { slug }, include: { institution: institutionRef } });
    if (!item || !canSee(request, item)) return reply.code(404).send({ error: 'Not found' });
    return item;
  });

  app.post('/conservation/projects', { config: { rateLimit: { max: 10, timeWindow: '1 hour' } } }, async (request, reply) => {
    const user = requireUser(request);
    const body = ProjectInput.parse(request.body);
    const slug = await uniqueSlug(titleSlug(body.title), async (s) => !!(await db.conservationProject.findUnique({ where: { slug: s } })));
    const item = await db.conservationProject.create({ data: { ...body, slug, status: initialStatus(request), submittedById: user.id } });
    return reply.code(201).send({ slug: item.slug, status: item.status });
  });

  // ═════════════ Module 7: Organisation directory ═════════════

  app.get('/organisations', async (request) => {
    const q = z
      .object({ q: z.string().trim().max(100).optional(), type: z.string().max(40).optional() })
      .extend(Paging.shape)
      .parse(request.query);
    const where = { ...(q.type ? { type: q.type } : {}), ...(q.q ? { OR: [{ name: { contains: q.q } }, { city: { contains: q.q } }] } : {}) };
    const [total, items] = await Promise.all([
      db.institution.count({ where }),
      db.institution.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: q.page * q.pageSize,
        take: q.pageSize,
        include: {
          _count: {
            select: {
              affiliations: { where: { isCurrent: true, profile: { isPublic: true } } },
              projects: { where: { status: 'published' } },
              opportunities: { where: { status: 'published' } },
            },
          },
        },
      }),
    ]);
    return { total, page: q.page, pageSize: q.pageSize, items };
  });

  app.get('/organisations/:id', async (request, reply) => {
    const { id } = IdParam.parse(request.params);
    const org = await db.institution.findUnique({
      where: { id },
      include: {
        affiliations: {
          where: { isCurrent: true, profile: { isPublic: true } },
          select: { role: true, profile: { select: { slug: true, fullName: true, honorific: true, position: true, verificationStatus: true } } },
        },
        projects: { where: { status: 'published' }, select: { slug: true, title: true, kind: true, projectStatus: true, summary: true } },
        opportunities: {
          where: { status: 'published', OR: [{ deadline: null }, { deadline: { gte: startOfToday() } }] },
          select: { slug: true, title: true, section: true, type: true, deadline: true },
        },
      },
    });
    return org ?? reply.code(404).send({ error: 'Not found' });
  });

  app.patch('/organisations/:id', async (request) => {
    requireAdmin(request);
    const { id } = IdParam.parse(request.params);
    const body = OrganisationUpdate.parse(request.body);
    return db.institution.update({ where: { id }, data: Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)) });
  });

  // ═════════════ Moderation (admin) & my submissions ═════════════

  const moderated = {
    event: db.event,
    opportunity: db.opportunity,
    project: db.conservationProject,
  } as const;

  app.get('/moderation', async (request) => {
    requireAdmin(request);
    const { status } = z.object({ status: z.enum(['pending', 'rejected', 'archived']).default('pending') }).parse(request.query);
    const submitter = { select: { displayName: true, email: true } } as const;
    const [events, opportunities, projects] = await Promise.all([
      db.event.findMany({ where: { status }, orderBy: { createdAt: 'asc' }, include: { submittedBy: submitter } }),
      db.opportunity.findMany({ where: { status }, orderBy: { createdAt: 'asc' }, include: { submittedBy: submitter } }),
      db.conservationProject.findMany({ where: { status }, orderBy: { createdAt: 'asc' }, include: { submittedBy: submitter } }),
    ]);
    return { events, opportunities, projects };
  });

  app.get('/moderation/count', async (request) => {
    requireAdmin(request);
    const [a, b, c] = await Promise.all([
      db.event.count({ where: { status: 'pending' } }),
      db.opportunity.count({ where: { status: 'pending' } }),
      db.conservationProject.count({ where: { status: 'pending' } }),
    ]);
    return { pending: a + b + c };
  });

  app.post('/moderation/:type/:id', async (request, reply) => {
    requireAdmin(request);
    const { type, id } = z.object({ type: z.enum(['event', 'opportunity', 'project']), id: z.coerce.number().int().positive() }).parse(request.params);
    const { decision, note } = ModerationDecision.parse(request.body);
    const status = decision === 'publish' ? 'published' : decision === 'reject' ? 'rejected' : 'archived';
    // Each delegate has the same update signature for these fields.
    const delegate = moderated[type] as unknown as { updateMany(args: object): Promise<{ count: number }> };
    const { count } = await delegate.updateMany({ where: { id }, data: { status, moderationNote: note } });
    return count ? { ok: true, status } : reply.code(404).send({ error: 'Not found' });
  });

  app.get('/me/submissions', async (request) => {
    const user = requireUser(request);
    const where = { submittedById: user.id };
    const select = { slug: true, title: true, status: true, moderationNote: true, createdAt: true } as const;
    const [events, opportunities, projects] = await Promise.all([
      db.event.findMany({ where, select, orderBy: { createdAt: 'desc' } }),
      db.opportunity.findMany({ where, select: { ...select, section: true }, orderBy: { createdAt: 'desc' } }),
      db.conservationProject.findMany({ where, select, orderBy: { createdAt: 'desc' } }),
    ]);
    return { events, opportunities, projects };
  });
}
