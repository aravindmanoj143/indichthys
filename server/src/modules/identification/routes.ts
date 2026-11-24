import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { FastifyInstance } from 'fastify';
import { config } from '../../config';
import type { Db } from '../../db';
import { isVerifiedExpert, requireUser } from '../auth/auth';
import { getAiProvider } from './ai/ai-provider';
import { pathToLead } from './key-path';
import {
  IdParam,
  ProposalBody,
  RequestFields,
  RequestListQuery,
  ReviewBody,
  SlugParam,
  TaxonInput,
} from './schemas';
import { deriveRequestStatus, tallyProposal } from './verification';

const PHOTO_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const taxonSelect = {
  id: true,
  gbifKey: true,
  scientificName: true,
  authorship: true,
  rank: true,
  family: true,
  order: true,
} as const;

/** Find a taxon by GBIF key (or name + rank) and create it if missing. */
async function upsertTaxon(db: Db, t: TaxonInput) {
  if (t.gbifKey) {
    return db.taxon.upsert({
      where: { gbifKey: t.gbifKey },
      update: {},
      create: { ...t },
    });
  }
  const existing = await db.taxon.findFirst({ where: { scientificName: t.scientificName, rank: t.rank } });
  return existing ?? db.taxon.create({ data: { ...t } });
}

async function refreshRequestStatus(db: Db, requestId: number) {
  const req = await db.identificationRequest.findUniqueOrThrow({
    where: { id: requestId },
    include: { proposals: { include: { reviews: true } } },
  });
  const { status, verifiedTaxonId } = deriveRequestStatus(req.status, req.proposals);
  const changed = status !== req.status || verifiedTaxonId !== req.verifiedTaxonId;
  if (changed) {
    await db.identificationRequest.update({
      where: { id: requestId },
      data: { status, verifiedTaxonId, verifiedAt: status === 'verified' ? new Date() : null },
    });
  }
}

export async function identificationRoutes(app: FastifyInstance, { db }: { db: Db }) {
  // ───── Key identification: browse taxa → characters + key paths ─────

  app.get('/characters', async () =>
    db.character.findMany({
      orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }],
      include: { states: { orderBy: { sortOrder: 'asc' } } },
    }),
  );

  /** Loads every lead of the published keys, grouped by key. */
  async function publishedKeyLeads() {
    const keys = await db.identificationKey.findMany({
      where: { status: 'published' },
      orderBy: { title: 'asc' },
      select: {
        id: true,
        slug: true,
        title: true,
        isDemo: true,
        leads: { select: { id: true, couplet: true, label: true, text: true, nextCouplet: true, taxonId: true, resultName: true } },
      },
    });
    return keys;
  }

  /**
   * Everything that can be browsed: taxa with character data or that are end points of a
   * published key, plus key end points that are named groups rather than a single taxon.
   */
  app.get('/taxa', async () => {
    const [taxa, keys] = await Promise.all([
      db.taxon.findMany({
        where: {
          OR: [
            { characterStates: { some: {} } },
            { numericRanges: { some: {} } },
            { keyLeads: { some: { nextCouplet: null, key: { status: 'published' } } } },
          ],
        },
        select: taxonSelect,
        orderBy: [{ order: 'asc' }, { family: 'asc' }, { scientificName: 'asc' }],
      }),
      publishedKeyLeads(),
    ]);
    const groups = keys.flatMap((k) =>
      k.leads
        .filter((l) => l.nextCouplet == null && l.taxonId == null && l.resultName)
        .map((l) => ({
          leadId: l.id,
          name: l.resultName!,
          key: { slug: k.slug, title: k.title },
          endPoint: `${l.couplet}${l.label}`,
          path: pathToLead(k.leads, l.id),
        })),
    );
    return {
      keys: keys.map(({ leads, ...k }) => ({ ...k, endPoints: leads.filter((l) => l.nextCouplet == null).length })),
      taxa,
      groups,
    };
  });

  /** A taxon's scored characters and its path through every published key that reaches it. */
  app.get('/taxa/:id/profile', async (request, reply) => {
    const { id } = IdParam.parse(request.params);
    const taxon = await db.taxon.findUnique({
      where: { id },
      select: {
        ...taxonSelect,
        characterStates: { select: { state: { select: { id: true, label: true, characterId: true } } } },
        numericRanges: { select: { characterId: true, min: true, max: true, source: true } },
      },
    });
    if (!taxon) return reply.code(404).send({ error: 'Taxon not found' });

    const scoredIds = new Set([
      ...taxon.characterStates.map((cs) => cs.state.characterId),
      ...taxon.numericRanges.map((r) => r.characterId),
    ]);
    const [characters, keys] = await Promise.all([
      db.character.findMany({
        where: { id: { in: [...scoredIds] } },
        orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }],
        select: { id: true, code: true, name: true, kind: true, unit: true, group: true, description: true },
      }),
      publishedKeyLeads(),
    ]);

    const { characterStates, numericRanges, ...rest } = taxon;
    return {
      taxon: rest,
      characters: characters.map((c) => {
        const range = numericRanges.find((r) => r.characterId === c.id);
        return {
          ...c,
          states: characterStates
            .filter((cs) => cs.state.characterId === c.id)
            .map((cs) => ({ id: cs.state.id, label: cs.state.label })),
          range: range ? { min: range.min, max: range.max, source: range.source } : null,
        };
      }),
      keys: keys.flatMap((k) =>
        k.leads
          .filter((l) => l.taxonId === id && l.nextCouplet == null)
          .map((l) => ({
            slug: k.slug,
            title: k.title,
            isDemo: k.isDemo,
            endPoint: `${l.couplet}${l.label}`,
            path: pathToLead(k.leads, l.id),
          })),
      ),
    };
  });

  // ───── Regional identification guides ─────

  app.get('/guides', async () =>
    db.regionalGuide.findMany({
      orderBy: { title: 'asc' },
      include: { _count: { select: { entries: true } } },
    }),
  );

  app.get('/guides/:slug', async (request, reply) => {
    const { slug } = SlugParam.parse(request.params);
    const guide = await db.regionalGuide.findUnique({
      where: { slug },
      include: { entries: { orderBy: { sortOrder: 'asc' }, include: { taxon: { select: taxonSelect } } } },
    });
    return guide ?? reply.code(404).send({ error: 'Guide not found' });
  });

  // ───── Expert identification requests ─────

  app.get('/requests', async (request) => {
    const q = RequestListQuery.parse(request.query);
    const where = q.status ? { status: q.status } : {};
    const [total, items] = await Promise.all([
      db.identificationRequest.count({ where }),
      db.identificationRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: q.page * q.pageSize,
        take: q.pageSize,
        select: {
          id: true,
          title: true,
          submitterName: true,
          locality: true,
          region: true,
          country: true,
          observedOn: true,
          status: true,
          createdAt: true,
          verifiedTaxon: { select: taxonSelect },
          photos: { select: { fileName: true }, take: 1, orderBy: { id: 'asc' } },
          _count: { select: { proposals: true } },
        },
      }),
    ]);
    return { total, page: q.page, pageSize: q.pageSize, items };
  });

  app.get('/requests/:id', async (request, reply) => {
    const { id } = IdParam.parse(request.params);
    const req = await db.identificationRequest.findUnique({
      where: { id },
      // submitterEmail is deliberately not returned.
      omit: { submitterEmail: true },
      include: {
        verifiedTaxon: { select: taxonSelect },
        photos: { orderBy: { id: 'asc' } },
        proposals: {
          orderBy: { createdAt: 'asc' },
          include: {
            taxon: { select: taxonSelect },
            user: { select: { profile: { select: { slug: true } } } },
            reviews: {
              orderBy: { createdAt: 'asc' },
              include: { user: { select: { profile: { select: { slug: true } } } } },
            },
          },
        },
      },
    });
    if (!req) return reply.code(404).send({ error: 'Request not found' });
    const me = request.user?.id;
    return {
      ...req,
      proposals: req.proposals.map(({ user, reviews, userId, ...p }) => ({
        ...p,
        profileSlug: user?.profile?.slug ?? null,
        isMine: !!me && me === userId,
        myReview: reviews.find((r) => !!me && r.userId === me)?.decision ?? null,
        reviews: reviews.map(({ user: ru, userId: _u, ...r }) => ({ ...r, profileSlug: ru?.profile?.slug ?? null })),
        tally: tallyProposal({ ...p, reviews }),
      })),
    };
  });

  app.post('/requests', async (request, reply) => {
    const fields: Record<string, string> = {};
    const saved: { fileName: string; originalName: string; mimeType: string; size: number }[] = [];
    const cleanup = () => Promise.all(saved.map((f) => unlink(path.join(config.uploadDir, f.fileName)).catch(() => {})));

    try {
      for await (const part of request.parts()) {
        if (part.type === 'field') {
          fields[part.fieldname] = String(part.value);
          continue;
        }
        const ext = PHOTO_TYPES[part.mimetype];
        if (!ext) {
          part.file.resume();
          throw Object.assign(new Error(`Unsupported photo type: ${part.mimetype}`), { statusCode: 400 });
        }
        if (saved.length >= config.maxPhotosPerRequest) {
          part.file.resume();
          throw Object.assign(new Error(`At most ${config.maxPhotosPerRequest} photos`), { statusCode: 400 });
        }
        const fileName = `${randomUUID()}${ext}`;
        await pipeline(part.file, createWriteStream(path.join(config.uploadDir, fileName)));
        if (part.file.truncated) {
          saved.push({ fileName, originalName: part.filename, mimeType: part.mimetype, size: 0 });
          throw Object.assign(new Error('Photo too large (max 10 MB)'), { statusCode: 413 });
        }
        saved.push({
          fileName,
          originalName: part.filename.slice(0, 200),
          mimeType: part.mimetype,
          size: part.file.bytesRead,
        });
      }

      const data = RequestFields.parse(
        Object.fromEntries(Object.entries(fields).filter(([, v]) => v.trim() !== '')),
      );
      const created = await db.identificationRequest.create({
        data: {
          ...data,
          submitterId: request.user?.id ?? null,
          observedOn: data.observedOn ? new Date(data.observedOn) : null,
          photos: { create: saved },
        },
        select: { id: true },
      });
      return reply.code(201).send(created);
    } catch (err) {
      await cleanup();
      throw err;
    }
  });

  app.post('/requests/:id/proposals', async (request, reply) => {
    const user = requireUser(request);
    const { id } = IdParam.parse(request.params);
    const body = ProposalBody.parse(request.body);
    const req = await db.identificationRequest.findUnique({ where: { id }, select: { status: true } });
    if (!req) return reply.code(404).send({ error: 'Request not found' });
    if (req.status === 'closed') return reply.code(409).send({ error: 'Request is closed' });

    const taxon = await upsertTaxon(db, body.taxon);
    const proposal = await db.identificationProposal.create({
      data: {
        requestId: id,
        taxonId: taxon.id,
        userId: user.id,
        proposedBy: user.profile?.fullName ?? user.displayName,
        isExpert: isVerifiedExpert(user),
        confidence: body.confidence,
        reasoning: body.reasoning,
      },
    });
    await refreshRequestStatus(db, id);
    return reply.code(201).send(proposal);
  });

  app.post('/proposals/:id/reviews', async (request, reply) => {
    const user = requireUser(request);
    const { id } = IdParam.parse(request.params);
    const body = ReviewBody.parse(request.body);
    const proposal = await db.identificationProposal.findUnique({
      where: { id },
      select: { requestId: true, userId: true, request: { select: { status: true } } },
    });
    if (!proposal) return reply.code(404).send({ error: 'Proposal not found' });
    if (proposal.request.status === 'closed') return reply.code(409).send({ error: 'Request is closed' });
    if (proposal.userId === user.id) return reply.code(409).send({ error: 'You cannot review your own identification.' });

    // One review per person: a second review replaces the first (people may change their mind).
    const snapshot = { reviewer: user.profile?.fullName ?? user.displayName, isExpert: isVerifiedExpert(user) };
    const review = await db.proposalReview.upsert({
      where: { proposalId_userId: { proposalId: id, userId: user.id } },
      update: { ...body, ...snapshot },
      create: { proposalId: id, userId: user.id, ...body, ...snapshot },
    });
    await refreshRequestStatus(db, proposal.requestId);
    return reply.code(201).send(review);
  });

  // ───── AI (placeholder; see ai/ai-provider.ts) ─────

  app.get('/ai/status', async () => {
    const provider = getAiProvider();
    return { enabled: !!provider, provider: provider?.name ?? null };
  });

  app.post('/ai/identify', async (_request, reply) => {
    if (!getAiProvider()) {
      return reply.code(501).send({ error: 'AI identification is not enabled yet.' });
    }
    return reply.code(501).send({ error: 'Not implemented' });
  });
}
