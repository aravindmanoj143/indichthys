import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Db } from '../../db';
import type { Prisma } from '../../generated/prisma/client';
import { requireAdmin, requireUser } from '../auth/auth';
import {
  ContactInput,
  DirectoryQuery,
  InboxUpdate,
  ProfileInput,
  PublicationInput,
  VerificationDecision,
  VerificationRequestInput,
} from './schemas';
import { slugify, uniqueSlug } from './slug';

const IdParam = z.object({ id: z.coerce.number().int().positive() });
const SlugParam = z.object({ slug: z.string().regex(/^[a-z0-9-]+$/) });

/** Public fields of a profile (never contactEmail or verification evidence). */
const publicProfileSelect = {
  id: true,
  slug: true,
  fullName: true,
  honorific: true,
  position: true,
  bio: true,
  country: true,
  region: true,
  city: true,
  website: true,
  orcid: true,
  googleScholar: true,
  researchGate: true,
  acceptingCollaboration: true,
  acceptingStudents: true,
  isDemo: true,
  verificationStatus: true,
  verifiedAt: true,
  createdAt: true,
  expertise: { select: { area: { select: { slug: true, name: true, category: true } } } },
  interests: { select: { label: true }, orderBy: { label: 'asc' as const } },
  affiliations: {
    orderBy: [{ isCurrent: 'desc' as const }, { startYear: 'desc' as const }],
    select: {
      id: true,
      role: true,
      department: true,
      startYear: true,
      endYear: true,
      isCurrent: true,
      institution: { select: { id: true, name: true, type: true, city: true, region: true, country: true, website: true } },
    },
  },
  authorships: {
    select: { publication: true },
    orderBy: { publication: { year: 'desc' as const } },
  },
} satisfies Prisma.IchthyologistSelect;

function flattenProfile<T extends { expertise: { area: unknown }[]; interests: { label: string }[]; authorships: { publication: unknown }[] }>(
  p: T,
) {
  const { expertise, interests, authorships, ...rest } = p;
  return {
    ...rest,
    expertise: expertise.map((e) => e.area),
    interests: interests.map((i) => i.label),
    publications: authorships.map((a) => a.publication),
  };
}

/** Identification contributions (Module 2) of the profile's owner. */
async function contributions(db: Db, userId: number | null) {
  if (!userId) return { proposals: 0, verifiedIdentifications: 0, reviews: 0 };
  const [proposals, reviews, verified] = await Promise.all([
    db.identificationProposal.count({ where: { userId } }),
    db.proposalReview.count({ where: { userId } }),
    db.identificationProposal.findMany({
      where: { userId, request: { status: 'verified' } },
      select: { taxonId: true, request: { select: { verifiedTaxonId: true } } },
    }),
  ]);
  return {
    proposals,
    reviews,
    verifiedIdentifications: verified.filter((p) => p.taxonId === p.request.verifiedTaxonId).length,
  };
}

/** Create institutions given by name and return affiliation rows. */
async function resolveAffiliations(db: Db, input: ProfileInput['affiliations']) {
  const rows = [];
  for (const a of input) {
    let institutionId: number;
    if ('id' in a.institution) {
      const found = await db.institution.findUnique({ where: { id: a.institution.id }, select: { id: true } });
      if (!found) throw Object.assign(new Error(`Unknown institution ${a.institution.id}`), { statusCode: 400 });
      institutionId = found.id;
    } else {
      const { name, country, ...rest } = a.institution;
      const inst = await db.institution.upsert({
        where: { name_country: { name, country } },
        update: {},
        create: { name, country, ...rest },
      });
      institutionId = inst.id;
    }
    rows.push({
      institutionId,
      role: a.role,
      department: a.department,
      startYear: a.startYear ?? null,
      endYear: a.isCurrent ? null : (a.endYear ?? null),
      isCurrent: a.isCurrent,
    });
  }
  return rows;
}

export async function registryRoutes(app: FastifyInstance, { db }: { db: Db }) {
  // ───── Vocabularies ─────

  app.get('/expertise', async () =>
    db.expertiseArea.findMany({ orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }] }),
  );

  app.get('/institutions', async (request) => {
    const { q } = z.object({ q: z.string().trim().max(100).default('') }).parse(request.query);
    return db.institution.findMany({
      where: q ? { name: { contains: q } } : {},
      orderBy: { name: 'asc' },
      take: 20,
    });
  });

  // ───── Directory & public profiles ─────

  app.get('/ichthyologists', async (request) => {
    const q = DirectoryQuery.parse(request.query);
    const where = {
      isPublic: true,
      ...(q.verified ? { verificationStatus: 'verified' } : {}),
      ...(q.collaboration ? { acceptingCollaboration: true } : {}),
      ...(q.region ? { region: q.region } : {}),
      ...(q.expertise ? { expertise: { some: { area: { slug: q.expertise } } } } : {}),
      ...(q.q
        ? {
            OR: [
              { fullName: { contains: q.q } },
              { position: { contains: q.q } },
              { interests: { some: { label: { contains: q.q } } } },
              { expertise: { some: { area: { name: { contains: q.q } } } } },
              { affiliations: { some: { institution: { name: { contains: q.q } } } } },
            ],
          }
        : {}),
    };
    const [total, items, regions] = await Promise.all([
      db.ichthyologist.count({ where }),
      db.ichthyologist.findMany({
        where,
        orderBy: [{ verificationStatus: 'desc' }, { fullName: 'asc' }],
        skip: q.page * q.pageSize,
        take: q.pageSize,
        select: {
          slug: true,
          fullName: true,
          honorific: true,
          position: true,
          region: true,
          country: true,
          verificationStatus: true,
          acceptingCollaboration: true,
          isDemo: true,
          expertise: { select: { area: { select: { slug: true, name: true, category: true } } }, take: 6 },
          interests: { select: { label: true }, take: 4 },
          affiliations: { where: { isCurrent: true }, take: 1, select: { institution: { select: { name: true } } } },
        },
      }),
      db.ichthyologist.findMany({
        where: { isPublic: true, region: { not: null } },
        distinct: ['region'],
        select: { region: true },
        orderBy: { region: 'asc' },
      }),
    ]);
    return {
      total,
      page: q.page,
      pageSize: q.pageSize,
      regions: regions.map((r) => r.region),
      items: items.map(({ expertise, interests, affiliations, ...p }) => ({
        ...p,
        expertise: expertise.map((e) => e.area),
        interests: interests.map((i) => i.label),
        institution: affiliations[0]?.institution.name ?? null,
      })),
    };
  });

  app.get('/ichthyologists/:slug', async (request, reply) => {
    const { slug } = SlugParam.parse(request.params);
    const p = await db.ichthyologist.findFirst({
      where: { slug, isPublic: true },
      select: { ...publicProfileSelect, userId: true },
    });
    if (!p) return reply.code(404).send({ error: 'Profile not found' });
    const { userId, ...profile } = p;
    return {
      ...flattenProfile(profile),
      contributions: await contributions(db, userId),
      isOwn: !!request.user && request.user.id === userId,
      /** Profiles without an account (e.g. sample data) can't receive messages. */
      canReceiveMessages: !!userId,
    };
  });

  app.post(
    '/ichthyologists/:slug/contact',
    { config: { rateLimit: { max: 5, timeWindow: '1 hour' } } },
    async (request, reply) => {
      const { slug } = SlugParam.parse(request.params);
      const body = ContactInput.parse(request.body);
      const profile = await db.ichthyologist.findFirst({
        where: { slug, isPublic: true },
        select: { id: true, userId: true, acceptingCollaboration: true, acceptingStudents: true },
      });
      if (!profile) return reply.code(404).send({ error: 'Profile not found' });
      if (!profile.userId) return reply.code(409).send({ error: 'This profile has no account to receive messages yet.' });
      if (request.user?.id === profile.userId) return reply.code(400).send({ error: 'You cannot message yourself.' });
      if (body.kind === 'collaboration' && !profile.acceptingCollaboration) {
        return reply.code(409).send({ error: 'This researcher is not taking collaboration requests right now.' });
      }
      if (body.kind === 'student' && !profile.acceptingStudents) {
        return reply.code(409).send({ error: 'This researcher is not taking students right now.' });
      }
      await db.contactRequest.create({
        data: { ...body, profileId: profile.id, senderUserId: request.user?.id ?? null },
      });
      return reply.code(201).send({ ok: true });
    },
  );

  // ───── My profile ─────

  app.get('/me/profile', async (request) => {
    const user = requireUser(request);
    const p = await db.ichthyologist.findUnique({
      where: { userId: user.id },
      select: { ...publicProfileSelect, contactEmail: true, isPublic: true, verificationEvidence: true },
    });
    if (!p) return { profile: null };
    return { profile: { ...flattenProfile(p), contributions: await contributions(db, user.id) } };
  });

  app.put('/me/profile', async (request) => {
    const user = requireUser(request);
    const body = ProfileInput.parse(request.body);
    const { expertise, interests, affiliations, ...fields } = body;

    const areas = await db.expertiseArea.findMany({ where: { slug: { in: expertise } }, select: { id: true } });
    const affiliationRows = await resolveAffiliations(db, affiliations);
    const uniqueInterests = [...new Map(interests.map((i) => [i.toLowerCase(), i])).values()];
    const existing = await db.ichthyologist.findUnique({ where: { userId: user.id } });

    const profile = await db.$transaction(async (tx) => {
      let id: number;
      if (existing) {
        // A verified identity is tied to the name: changing it needs re-verification.
        const nameChanged = existing.fullName.trim() !== fields.fullName;
        const reset = nameChanged && ['verified', 'pending'].includes(existing.verificationStatus);
        await tx.ichthyologist.update({
          where: { id: existing.id },
          data: { ...fields, ...(reset ? { verificationStatus: 'unverified', verifiedAt: null, verifiedById: null } : {}) },
        });
        if (reset) {
          await tx.verificationEvent.create({
            data: { profileId: existing.id, actorId: user.id, action: 'revoked', note: 'Name changed; verification reset.' },
          });
        }
        id = existing.id;
      } else {
        const slug = await uniqueSlug(slugify(fields.fullName), async (s) => !!(await tx.ichthyologist.findUnique({ where: { slug: s } })));
        id = (await tx.ichthyologist.create({ data: { ...fields, slug, userId: user.id } })).id;
      }
      await tx.profileExpertise.deleteMany({ where: { profileId: id } });
      await tx.profileExpertise.createMany({ data: areas.map((a) => ({ profileId: id, areaId: a.id })) });
      await tx.researchInterest.deleteMany({ where: { profileId: id } });
      await tx.researchInterest.createMany({ data: uniqueInterests.map((label) => ({ profileId: id, label })) });
      await tx.affiliation.deleteMany({ where: { profileId: id } });
      await tx.affiliation.createMany({ data: affiliationRows.map((a) => ({ ...a, profileId: id })) });
      return tx.ichthyologist.findUniqueOrThrow({ where: { id }, select: { slug: true } });
    });
    return profile;
  });

  // ───── My publications ─────

  app.post('/me/publications', async (request, reply) => {
    const user = requireUser(request);
    const body = PublicationInput.parse(request.body);
    const profile = await db.ichthyologist.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!profile) return reply.code(409).send({ error: 'Create your profile first.' });

    const publication = body.doi
      ? await db.publication.upsert({ where: { doi: body.doi }, update: {}, create: { ...body, addedById: user.id } })
      : await db.publication.create({ data: { ...body, addedById: user.id } });
    await db.publicationAuthor.upsert({
      where: { publicationId_profileId: { publicationId: publication.id, profileId: profile.id } },
      update: {},
      create: { publicationId: publication.id, profileId: profile.id },
    });
    return reply.code(201).send(publication);
  });

  app.delete('/me/publications/:id', async (request) => {
    const user = requireUser(request);
    const { id } = IdParam.parse(request.params);
    const profile = await db.ichthyologist.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (profile) await db.publicationAuthor.deleteMany({ where: { publicationId: id, profileId: profile.id } });
    return { ok: true };
  });

  // ───── Expert verification (owner) ─────

  app.post('/me/verification', async (request, reply) => {
    const user = requireUser(request);
    const { evidence } = VerificationRequestInput.parse(request.body);
    const profile = await db.ichthyologist.findUnique({ where: { userId: user.id } });
    if (!profile) return reply.code(409).send({ error: 'Create your profile first.' });
    if (profile.verificationStatus === 'verified') return reply.code(409).send({ error: 'Your profile is already verified.' });
    await db.$transaction([
      db.ichthyologist.update({
        where: { id: profile.id },
        data: { verificationStatus: 'pending', verificationEvidence: evidence },
      }),
      db.verificationEvent.create({ data: { profileId: profile.id, actorId: user.id, action: 'requested', note: evidence } }),
    ]);
    return { ok: true };
  });

  // ───── Inbox (contact & collaboration requests) ─────

  app.get('/me/inbox', async (request) => {
    const user = requireUser(request);
    const { status } = z.object({ status: z.enum(['new', 'read', 'archived']).optional() }).parse(request.query);
    const profile = await db.ichthyologist.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!profile) return { items: [], unread: 0 };
    const [items, unread] = await Promise.all([
      db.contactRequest.findMany({
        where: { profileId: profile.id, ...(status ? { status } : { status: { not: 'archived' } }) },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      db.contactRequest.count({ where: { profileId: profile.id, status: 'new' } }),
    ]);
    return { items, unread };
  });

  app.patch('/me/inbox/:id', async (request, reply) => {
    const user = requireUser(request);
    const { id } = IdParam.parse(request.params);
    const { status } = InboxUpdate.parse(request.body);
    const updated = await db.contactRequest.updateMany({
      where: { id, profile: { userId: user.id } },
      data: { status },
    });
    return updated.count ? { ok: true } : reply.code(404).send({ error: 'Message not found' });
  });

  // ───── Expert verification (admin) ─────

  app.get('/admin/verification', async (request) => {
    requireAdmin(request);
    const { status } = z
      .object({ status: z.enum(['pending', 'verified', 'rejected', 'unverified']).default('pending') })
      .parse(request.query);
    return db.ichthyologist.findMany({
      where: { verificationStatus: status },
      orderBy: { updatedAt: 'asc' },
      select: {
        id: true,
        slug: true,
        fullName: true,
        honorific: true,
        position: true,
        orcid: true,
        website: true,
        verificationStatus: true,
        verificationEvidence: true,
        updatedAt: true,
        user: { select: { email: true } },
        affiliations: { where: { isCurrent: true }, select: { institution: { select: { name: true } } } },
        authorships: { select: { publication: { select: { title: true, year: true, doi: true } } }, take: 5 },
        verification: { orderBy: { createdAt: 'desc' }, take: 5, select: { action: true, note: true, createdAt: true } },
      },
    });
  });

  app.post('/admin/verification/:id', async (request, reply) => {
    const admin = requireAdmin(request);
    const { id } = IdParam.parse(request.params);
    const { decision, note } = VerificationDecision.parse(request.body);
    const profile = await db.ichthyologist.findUnique({ where: { id }, select: { id: true } });
    if (!profile) return reply.code(404).send({ error: 'Profile not found' });
    const status = decision === 'verify' ? 'verified' : decision === 'reject' ? 'rejected' : 'unverified';
    await db.$transaction([
      db.ichthyologist.update({
        where: { id },
        data: {
          verificationStatus: status,
          verifiedAt: status === 'verified' ? new Date() : null,
          verifiedById: status === 'verified' ? admin.id : null,
        },
      }),
      db.verificationEvent.create({
        data: { profileId: id, actorId: admin.id, action: decision === 'verify' ? 'verified' : decision === 'reject' ? 'rejected' : 'revoked', note },
      }),
    ]);
    return { ok: true, status };
  });
}
