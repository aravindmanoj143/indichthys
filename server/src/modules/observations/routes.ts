import type { FastifyInstance } from 'fastify';
import type { Prisma } from '../../generated/prisma/client';
import type { Db } from '../../db';
import { requireUser } from '../auth/auth';
import { deleteUploads, readPhotoForm } from '../uploads';
import { communityTaxon, publicPosition, qualityGrade } from './quality';
import { GuestFields, IdParam, IdentParam, IdentificationBody, ListQuery, ObservationFields, TaxonFields } from './schemas';

const createLimit = {
  config: {
    // Guests (no account) get a tighter limit than signed-in users.
    rateLimit: { max: (request: { user: { id: number } | null }) => (request.user ? 30 : 6), timeWindow: '1 hour' },
  },
};

const personSelect = {
  displayName: true,
  profile: { select: { slug: true, fullName: true, verificationStatus: true } },
} satisfies Prisma.UserSelect;

type Person = Prisma.UserGetPayload<{ select: typeof personSelect }>;
/** Display info for an account, or a guest's given name. */
const person = (u: Person | null, guestName: string | null) =>
  u
    ? { name: u.profile?.fullName ?? u.displayName, profileSlug: u.profile?.slug ?? null, verified: u.profile?.verificationStatus === 'verified', guest: false }
    : { name: guestName ?? 'Guest', profileSlug: null, verified: false, guest: true };

/** Recompute community taxon and quality grade from current identifications. */
async function refresh(db: Db, id: number) {
  const o = await db.observation.findUniqueOrThrow({
    where: { id },
    select: {
      observedAt: true,
      latitude: true,
      longitude: true,
      captive: true,
      _count: { select: { photos: true } },
      identifications: { where: { isCurrent: true }, orderBy: { createdAt: 'asc' }, select: { taxonName: true, gbifKey: true, taxonRank: true } },
    },
  });
  const community = communityTaxon(o.identifications);
  await db.observation.update({
    where: { id },
    data: {
      taxonName: community?.taxonName ?? null,
      gbifKey: community?.gbifKey ?? null,
      taxonRank: community?.taxonRank ?? null,
      qualityGrade: qualityGrade({ ...o, hasPhoto: o._count.photos > 0 }, community),
    },
  });
}

export async function observationRoutes(app: FastifyInstance, { db }: { db: Db }) {
  app.get('/', async (request) => {
    const q = ListQuery.parse(request.query);
    const where: Prisma.ObservationWhereInput = {
      ...(q.q ? { taxonName: { contains: q.q } } : {}),
      ...(q.quality ? { qualityGrade: q.quality } : {}),
      ...(q.gbifKey ? { gbifKey: q.gbifKey } : {}),
      ...(q.mine ? { userId: requireUser(request).id } : {}),
      ...(q.bbox
        ? { publicLongitude: { gte: q.bbox[0], lte: q.bbox[2] }, publicLatitude: { gte: q.bbox[1], lte: q.bbox[3] } }
        : {}),
    };
    const [total, rows, species] = await Promise.all([
      db.observation.count({ where }),
      db.observation.findMany({
        where,
        orderBy: [{ observedAt: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }],
        skip: q.page * q.pageSize,
        take: q.pageSize,
        select: {
          id: true,
          taxonName: true,
          taxonRank: true,
          qualityGrade: true,
          observedAt: true,
          placeName: true,
          waterBody: true,
          guestName: true,
          publicLatitude: true,
          publicLongitude: true,
          user: { select: personSelect },
          photos: { select: { fileName: true }, orderBy: { id: 'asc' }, take: 1 },
          _count: { select: { identifications: { where: { isCurrent: true } } } },
        },
      }),
      db.observation.groupBy({ by: ['taxonName'], where: { ...where, taxonRank: 'species' } }),
    ]);
    return {
      total,
      species: species.length,
      page: q.page,
      pageSize: q.pageSize,
      items: rows.map(({ user, guestName, photos, _count, publicLatitude, publicLongitude, ...o }) => ({
        ...o,
        latitude: publicLatitude,
        longitude: publicLongitude,
        observer: person(user, guestName),
        photo: photos[0]?.fileName ?? null,
        identifications: _count.identifications,
      })),
    };
  });

  /** Light-weight points for the map (public positions only). */
  app.get('/map', async (request) => {
    const q = ListQuery.parse(request.query);
    const rows = await db.observation.findMany({
      where: {
        publicLatitude: { not: null },
        ...(q.q ? { taxonName: { contains: q.q } } : {}),
        ...(q.quality ? { qualityGrade: q.quality } : {}),
        ...(q.gbifKey ? { gbifKey: q.gbifKey } : {}),
        ...(q.mine ? { userId: requireUser(request).id } : {}),
      },
      orderBy: { id: 'desc' },
      take: 5000,
      select: { id: true, publicLatitude: true, publicLongitude: true, qualityGrade: true, taxonName: true },
    });
    return rows.map((r) => ({ id: r.id, lat: r.publicLatitude!, lng: r.publicLongitude!, quality: r.qualityGrade, taxonName: r.taxonName }));
  });

  app.get('/:id', async (request, reply) => {
    const { id } = IdParam.parse(request.params);
    const o = await db.observation.findUnique({
      where: { id },
      include: {
        user: { select: personSelect },
        photos: { orderBy: { id: 'asc' }, select: { id: true, fileName: true } },
        identifications: { orderBy: { createdAt: 'asc' }, include: { user: { select: personSelect } } },
      },
    });
    if (!o) return reply.code(404).send({ error: 'Observation not found' });
    const me = request.user;
    const isOwn = !!me && me.id === o.userId;
    const current = o.identifications.filter((i) => i.isCurrent);
    const community = communityTaxon(current);
    const { user, identifications, userId: _u, guestName, guestEmail: _e, latitude, longitude, publicLatitude, publicLongitude, ...rest } = o;
    return {
      ...rest,
      // The owner sees the exact position; everyone else the public one.
      latitude: isOwn ? latitude : publicLatitude,
      longitude: isOwn ? longitude : publicLongitude,
      publicLatitude,
      publicLongitude,
      observer: person(user, guestName),
      community: community && { taxonName: community.taxonName, gbifKey: community.gbifKey, agreements: community.agreements, total: community.total },
      identifications: identifications.map(({ user: iu, userId, guestName: g, ...i }) => ({ ...i, by: person(iu, g), isMine: !!me && me.id === userId })),
      myCurrentId: (me && current.find((i) => i.userId === me.id)?.id) ?? null,
      isOwn,
      canDelete: isOwn || me?.role === 'admin',
    };
  });

  /** Signed-in users, or guests (name and email optional; email kept private). */
  app.post('/', createLimit, async (request, reply) => {
    const user = request.user;
    const { fields, photos, cleanup } = await readPhotoForm(request);
    try {
      const data = ObservationFields.parse(fields);
      const guest = user ? null : GuestFields.parse(fields);
      const taxon = fields['taxonName'] ? TaxonFields.parse(fields) : null;
      const pos = publicPosition(data);
      const by = user ? { userId: user.id } : { guestName: guest!.guestName ?? 'Guest' };
      const created = await db.observation.create({
        data: {
          ...data,
          publicLatitude: pos.latitude,
          publicLongitude: pos.longitude,
          ...by,
          guestEmail: guest?.guestEmail ?? null,
          photos: { create: photos },
          ...(taxon ? { identifications: { create: { ...taxon, ...by } } } : {}),
        },
        select: { id: true },
      });
      await refresh(db, created.id);
      return reply.code(201).send(created);
    } catch (err) {
      await cleanup();
      throw err;
    }
  });

  /** Owner edits details (photos and taxon are handled separately). */
  app.patch('/:id', async (request, reply) => {
    const user = requireUser(request);
    const { id } = IdParam.parse(request.params);
    const o = await db.observation.findUnique({ where: { id }, select: { userId: true } });
    if (!o) return reply.code(404).send({ error: 'Observation not found' });
    if (o.userId !== user.id) return reply.code(403).send({ error: 'Only the observer can edit this observation' });
    const data = ObservationFields.parse(request.body);
    const pos = publicPosition(data);
    await db.observation.update({ where: { id }, data: { ...data, publicLatitude: pos.latitude, publicLongitude: pos.longitude } });
    await refresh(db, id);
    return { ok: true };
  });

  app.delete('/:id', async (request, reply) => {
    const user = requireUser(request);
    const { id } = IdParam.parse(request.params);
    const o = await db.observation.findUnique({ where: { id }, select: { userId: true, photos: { select: { fileName: true } } } });
    if (!o) return reply.code(404).send({ error: 'Observation not found' });
    if (o.userId !== user.id && user.role !== 'admin') return reply.code(403).send({ error: 'Not allowed' });
    await db.observation.delete({ where: { id } });
    await deleteUploads(o.photos.map((p) => p.fileName));
    return { ok: true };
  });

  /** Add an identification; it replaces the person's earlier one. */
  app.post('/:id/identifications', async (request, reply) => {
    const user = requireUser(request);
    const { id } = IdParam.parse(request.params);
    const body = IdentificationBody.parse(request.body);
    if (!(await db.observation.findUnique({ where: { id }, select: { id: true } }))) {
      return reply.code(404).send({ error: 'Observation not found' });
    }
    await db.$transaction([
      db.observationIdentification.updateMany({ where: { observationId: id, userId: user.id, isCurrent: true }, data: { isCurrent: false } }),
      db.observationIdentification.create({ data: { ...body, observationId: id, userId: user.id } }),
    ]);
    await refresh(db, id);
    return reply.code(201).send({ ok: true });
  });

  /** Withdraw your own identification (kept in the history). */
  app.delete('/:id/identifications/:identId', async (request, reply) => {
    const user = requireUser(request);
    const { id, identId } = IdentParam.parse(request.params);
    const r = await db.observationIdentification.updateMany({
      where: { id: identId, observationId: id, userId: user.id, isCurrent: true },
      data: { isCurrent: false },
    });
    if (!r.count) return reply.code(404).send({ error: 'Identification not found' });
    await refresh(db, id);
    return { ok: true };
  });
}
