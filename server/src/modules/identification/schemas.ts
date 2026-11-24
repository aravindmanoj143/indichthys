import { z } from 'zod';
import { CONFIDENCE_LEVELS, REQUEST_STATUSES, REVIEW_DECISIONS } from './constants';

const name = z.string().trim().min(1).max(120);

/** A taxon chosen from GBIF (or typed) when proposing an identification. */
export const TaxonInput = z.object({
  gbifKey: z.number().int().positive().optional(),
  scientificName: z.string().trim().min(2).max(200),
  authorship: z.string().trim().max(200).optional(),
  rank: z.string().trim().toLowerCase().max(30).default('species'),
  family: z.string().trim().max(100).optional(),
  order: z.string().trim().max(100).optional(),
});
export type TaxonInput = z.infer<typeof TaxonInput>;

export const RequestFields = z.object({
  title: z.string().trim().min(3).max(200),
  submitterName: name,
  submitterEmail: z.email().max(200),
  observedOn: z.iso.date().optional().or(z.literal('').transform(() => undefined)),
  locality: z.string().trim().min(2).max(300),
  region: z.string().trim().max(120).optional(),
  country: z.string().trim().length(2).toUpperCase().default('IN'),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  habitat: z.string().trim().max(200).optional(),
  characterNotes: z.string().trim().max(4000).optional(),
  notes: z.string().trim().max(4000).optional(),
});

/** Proposer and expert status come from the signed-in user, not the request body. */
export const ProposalBody = z.object({
  taxon: TaxonInput,
  confidence: z.enum(CONFIDENCE_LEVELS),
  reasoning: z.string().trim().max(4000).optional(),
});

export const ReviewBody = z.object({
  decision: z.enum(REVIEW_DECISIONS),
  comment: z.string().trim().max(2000).optional(),
});

export const RequestListQuery = z.object({
  status: z.enum(REQUEST_STATUSES).optional(),
  page: z.coerce.number().int().min(0).default(0),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const IdParam = z.object({ id: z.coerce.number().int().positive() });
export const SlugParam = z.object({ slug: z.string().regex(/^[a-z0-9-]+$/) });
