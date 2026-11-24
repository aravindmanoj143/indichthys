import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Db } from '../../db';
import type { Prisma } from '../../generated/prisma/client';
import { requireAdmin, requireUser } from '../auth/auth';
import { PUBLICATION_TYPES, PublicationInput } from '../registry/schemas';

const IdParam = z.object({ id: z.coerce.number().int().positive() });

/** A publication plus what the repository adds: topics, taxa, and claiming authorship. */
export const RepositoryInput = PublicationInput.extend({
  topics: z.array(z.string().regex(/^[a-z0-9-]+$/)).max(15).default([]),
  taxa: z
    .array(z.object({ gbifKey: z.number().int().positive(), scientificName: z.string().trim().min(2).max(200) }))
    .max(50)
    .default([]),
  /** Add the signed-in user's ichthyologist profile as an author. */
  claimAuthorship: z.boolean().default(false),
});

const SearchQuery = z.object({
  q: z.string().trim().max(200).optional(),
  type: z.enum(PUBLICATION_TYPES).optional(),
  topic: z.string().regex(/^[a-z0-9-]+$/).optional(),
  journal: z.string().trim().max(300).optional(),
  taxon: z.coerce.number().int().positive().optional(),
  author: z.string().regex(/^[a-z0-9-]+$/).optional(),
  yearFrom: z.coerce.number().int().min(1700).max(2100).optional(),
  yearTo: z.coerce.number().int().min(1700).max(2100).optional(),
  sort: z.enum(['year', 'added', 'title']).default('year'),
  page: z.coerce.number().int().min(0).default(0),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

const listSelect = {
  id: true,
  title: true,
  authors: true,
  year: true,
  journal: true,
  volume: true,
  issue: true,
  pages: true,
  publisher: true,
  doi: true,
  url: true,
  type: true,
  createdAt: true,
  topics: { select: { area: { select: { slug: true, name: true } } } },
  taxa: { select: { gbifKey: true, scientificName: true } },
  authorships: { select: { profile: { select: { slug: true, fullName: true, honorific: true } } } },
} satisfies Prisma.PublicationSelect;

type Listed = Prisma.PublicationGetPayload<{ select: typeof listSelect }>;
const flatten = ({ topics, authorships, ...p }: Listed, saved: Set<number>) => ({
  ...p,
  topics: topics.map((t) => t.area),
  profiles: authorships.map((a) => a.profile),
  saved: saved.has(p.id),
});

async function savedIds(db: Db, request: FastifyRequest, ids: number[]): Promise<Set<number>> {
  if (!request.user || !ids.length) return new Set();
  const rows = await db.savedPublication.findMany({ where: { userId: request.user.id, publicationId: { in: ids } }, select: { publicationId: true } });
  return new Set(rows.map((r) => r.publicationId));
}

/** Replace a publication's topics and taxa. */
async function setLinks(db: Prisma.TransactionClient, id: number, topics: string[], taxa: { gbifKey: number; scientificName: string }[]) {
  const areas = await db.expertiseArea.findMany({ where: { slug: { in: topics } }, select: { id: true } });
  await db.publicationTopic.deleteMany({ where: { publicationId: id } });
  await db.publicationTopic.createMany({ data: areas.map((a) => ({ publicationId: id, areaId: a.id })) });
  const unique = [...new Map(taxa.map((t) => [t.gbifKey, t])).values()];
  await db.publicationTaxon.deleteMany({ where: { publicationId: id } });
  await db.publicationTaxon.createMany({ data: unique.map((t) => ({ publicationId: id, ...t })) });
}

async function claim(db: Prisma.TransactionClient, request: FastifyRequest, publicationId: number) {
  const profileId = request.user?.profile?.id;
  if (!profileId) throw Object.assign(new Error('Create your ichthyologist profile first to claim authorship.'), { statusCode: 409 });
  await db.publicationAuthor.upsert({
    where: { publicationId_profileId: { publicationId, profileId } },
    update: {},
    create: { publicationId, profileId },
  });
}

export async function publicationRoutes(app: FastifyInstance, { db }: { db: Db }) {
  // ───── Repository search ─────

  app.get('/', async (request) => {
    const q = SearchQuery.parse(request.query);
    const and: Prisma.PublicationWhereInput[] = [];
    if (q.q) {
      and.push({
        OR: [
          { title: { contains: q.q } },
          { authors: { contains: q.q } },
          { journal: { contains: q.q } },
          { abstract: { contains: q.q } },
          { doi: { contains: q.q.toLowerCase() } },
          { taxa: { some: { scientificName: { contains: q.q } } } },
        ],
      });
    }
    if (q.type) and.push({ type: q.type });
    if (q.topic) and.push({ topics: { some: { area: { slug: q.topic } } } });
    if (q.journal) and.push({ journal: q.journal });
    if (q.taxon) and.push({ taxa: { some: { gbifKey: q.taxon } } });
    if (q.author) and.push({ authorships: { some: { profile: { slug: q.author } } } });
    if (q.yearFrom) and.push({ year: { gte: q.yearFrom } });
    if (q.yearTo) and.push({ year: { lte: q.yearTo } });
    const where: Prisma.PublicationWhereInput = and.length ? { AND: and } : {};
    const orderBy: Prisma.PublicationOrderByWithRelationInput[] =
      q.sort === 'title' ? [{ title: 'asc' }] : q.sort === 'added' ? [{ createdAt: 'desc' }] : [{ year: { sort: 'desc', nulls: 'last' } }, { title: 'asc' }];

    const [total, rows] = await Promise.all([
      db.publication.count({ where }),
      db.publication.findMany({ where, orderBy, skip: q.page * q.pageSize, take: q.pageSize, select: listSelect }),
    ]);
    const saved = await savedIds(db, request, rows.map((r) => r.id));
    return { total, page: q.page, pageSize: q.pageSize, items: rows.map((r) => flatten(r, saved)) };
  });

  /** Is this DOI already in the repository? */
  app.get('/doi-check', async (request) => {
    const { doi } = z.object({ doi: z.string().trim().min(3).max(300) }).parse(request.query);
    const clean = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').toLowerCase();
    const found = await db.publication.findUnique({ where: { doi: clean }, select: { id: true, title: true } });
    return { exists: !!found, publication: found };
  });

  /** Scientific journals represented in the repository, with counts. */
  app.get('/journals', async () => {
    const rows = await db.publication.groupBy({
      by: ['journal'],
      where: { journal: { not: null } },
      _count: { _all: true },
      _max: { year: true },
    });
    return rows
      .map((r) => ({ journal: r.journal!, count: r._count._all, latestYear: r._max.year }))
      .sort((a, b) => b.count - a.count || a.journal.localeCompare(b.journal));
  });

  /** Research topic directory: topics with publication and researcher counts. */
  app.get('/topics', async () => {
    const areas = await db.expertiseArea.findMany({
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
      select: {
        slug: true,
        name: true,
        category: true,
        _count: { select: { publications: true, profiles: { where: { profile: { isPublic: true } } } } },
      },
    });
    return areas.map(({ _count, ...a }) => ({ ...a, publications: _count.publications, researchers: _count.profiles }));
  });

  // ───── My library (bibliography) ─────

  app.get('/library', async (request) => {
    const user = requireUser(request);
    const rows = await db.savedPublication.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { publication: { select: { ...listSelect, abstract: true } } },
    });
    const all = new Set(rows.map((r) => r.publication.id));
    return rows.map((r) => ({ ...flatten(r.publication, all), abstract: r.publication.abstract }));
  });

  app.post('/:id/save', async (request, reply) => {
    const user = requireUser(request);
    const { id } = IdParam.parse(request.params);
    if (!(await db.publication.findUnique({ where: { id }, select: { id: true } }))) return reply.code(404).send({ error: 'Not found' });
    await db.savedPublication.upsert({ where: { userId_publicationId: { userId: user.id, publicationId: id } }, update: {}, create: { userId: user.id, publicationId: id } });
    return { saved: true };
  });

  app.delete('/:id/save', async (request) => {
    const user = requireUser(request);
    const { id } = IdParam.parse(request.params);
    await db.savedPublication.deleteMany({ where: { userId: user.id, publicationId: id } });
    return { saved: false };
  });

  // ───── Single publication ─────

  app.get('/:id', async (request, reply) => {
    const { id } = IdParam.parse(request.params);
    const p = await db.publication.findUnique({
      where: { id },
      select: { ...listSelect, abstract: true, addedById: true, updatedAt: true, addedBy: { select: { displayName: true } }, _count: { select: { savedBy: true } } },
    });
    if (!p) return reply.code(404).send({ error: 'Not found' });
    const { addedById, abstract, addedBy, updatedAt, _count, ...rest } = p;
    const saved = await savedIds(db, request, [id]);
    const me = request.user;
    return {
      ...flatten(rest, saved),
      abstract,
      updatedAt,
      addedBy: addedBy?.displayName ?? null,
      savedCount: _count.savedBy,
      canEdit: !!me && (me.role === 'admin' || me.id === addedById),
      isAuthor: !!me?.profile && rest.authorships.some((a) => a.profile.slug === me.profile!.slug),
    };
  });

  app.post('/', { config: { rateLimit: { max: 30, timeWindow: '1 hour' } } }, async (request, reply) => {
    const user = requireUser(request);
    const { topics, taxa, claimAuthorship, ...data } = RepositoryInput.parse(request.body);
    if (data.doi) {
      const existing = await db.publication.findUnique({ where: { doi: data.doi }, select: { id: true } });
      if (existing) return reply.code(409).send({ error: 'This DOI is already in the repository.', id: existing.id });
    }
    const created = await db.$transaction(async (tx) => {
      const p = await tx.publication.create({ data: { ...data, addedById: user.id } });
      await setLinks(tx, p.id, topics, taxa);
      if (claimAuthorship) await claim(tx, request, p.id);
      return p;
    });
    return reply.code(201).send({ id: created.id });
  });

  app.put('/:id', async (request, reply) => {
    const user = requireUser(request);
    const { id } = IdParam.parse(request.params);
    const existing = await db.publication.findUnique({ where: { id }, select: { addedById: true } });
    if (!existing) return reply.code(404).send({ error: 'Not found' });
    if (user.role !== 'admin' && existing.addedById !== user.id) {
      return reply.code(403).send({ error: 'Only the person who added this publication or an administrator can edit it.' });
    }
    const { topics, taxa, claimAuthorship, ...data } = RepositoryInput.parse(request.body);
    if (data.doi) {
      const clash = await db.publication.findFirst({ where: { doi: data.doi, NOT: { id } }, select: { id: true } });
      if (clash) return reply.code(409).send({ error: 'Another publication already has this DOI.', id: clash.id });
    }
    await db.$transaction(async (tx) => {
      await tx.publication.update({ where: { id }, data });
      await setLinks(tx, id, topics, taxa);
      if (claimAuthorship) await claim(tx, request, id);
    });
    return { id };
  });

  app.delete('/:id', async (request) => {
    requireAdmin(request);
    const { id } = IdParam.parse(request.params);
    await db.publication.deleteMany({ where: { id } });
    return { ok: true };
  });

  // ───── Authorship (research author profiles) ─────

  app.post('/:id/authorship', async (request, reply) => {
    requireUser(request);
    const { id } = IdParam.parse(request.params);
    if (!(await db.publication.findUnique({ where: { id }, select: { id: true } }))) return reply.code(404).send({ error: 'Not found' });
    await claim(db as unknown as Prisma.TransactionClient, request, id);
    return { ok: true };
  });

  app.delete('/:id/authorship', async (request) => {
    const user = requireUser(request);
    const { id } = IdParam.parse(request.params);
    if (user.profile) await db.publicationAuthor.deleteMany({ where: { publicationId: id, profileId: user.profile.id } });
    return { ok: true };
  });
}
