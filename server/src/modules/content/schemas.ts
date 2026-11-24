import { z } from 'zod';

const text = (min: number, max: number) => z.string().trim().min(min).max(max);
const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));
const url = z
  .string()
  .trim()
  .max(500)
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .refine((v) => v == null || /^https?:\/\//i.test(v), 'Must start with http:// or https://');
const date = z.iso.date();
const optionalDate = z
  .union([z.iso.date(), z.literal(''), z.null()])
  .optional()
  .transform((v) => (v ? new Date(v) : null));

export const NEWS_CATEGORIES = ['news', 'new-species', 'taxonomic-update', 'research', 'conservation', 'announcement'] as const;
export const EVENT_KINDS = ['conference', 'seminar', 'workshop', 'field-course', 'webinar', 'other'] as const;
export const FUNDING_TYPES = ['research-grant', 'conservation-funding', 'government-grant', 'csr-funding', 'fellowship', 'funded-project', 'proposal-resource'] as const;
export const JOB_TYPES = ['job', 'research-assistant', 'field-biologist', 'phd', 'postdoc', 'internship', 'volunteer', 'fellowship'] as const;
export const PROJECT_KINDS = ['project', 'initiative', 'citizen-programme'] as const;
export const PROJECT_STATUSES = ['planned', 'ongoing', 'completed'] as const;
export const MODERATION_STATUSES = ['pending', 'published', 'rejected', 'archived'] as const;

export const NewsInput = z.object({
  title: text(5, 200),
  summary: text(10, 500),
  body: text(20, 20000),
  category: z.enum(NEWS_CATEGORIES).default('news'),
  sourceUrl: url,
  status: z.enum(['draft', 'published']).default('draft'),
});

export const EventInput = z
  .object({
    title: text(5, 200),
    description: text(20, 10000),
    kind: z.enum(EVENT_KINDS).default('conference'),
    startsOn: date.transform((v) => new Date(v)),
    endsOn: optionalDate,
    isOnline: z.boolean().default(false),
    venue: optional(200),
    city: optional(100),
    country: z.string().trim().length(2).toUpperCase().default('IN'),
    organiser: optional(200),
    url,
    registrationDeadline: optionalDate,
  })
  .refine((e) => !e.endsOn || e.endsOn >= e.startsOn, { message: 'End date is before the start date', path: ['endsOn'] });

export const OpportunityInput = z
  .object({
    section: z.enum(['funding', 'jobs']),
    type: z.string(),
    title: text(5, 200),
    organisation: text(2, 200),
    institutionId: z.number().int().positive().optional().nullable(),
    description: text(20, 10000),
    eligibility: optional(4000),
    amount: optional(200),
    location: optional(200),
    country: z.string().trim().length(2).toUpperCase().default('IN'),
    isRemote: z.boolean().default(false),
    deadline: optionalDate,
    startDate: optionalDate,
    applyUrl: url,
  })
  .refine((o) => (o.section === 'funding' ? (FUNDING_TYPES as readonly string[]) : (JOB_TYPES as readonly string[])).includes(o.type), {
    message: 'Type does not match the section',
    path: ['type'],
  });

export const ProjectInput = z.object({
  title: text(5, 200),
  kind: z.enum(PROJECT_KINDS).default('project'),
  summary: text(10, 500),
  description: optional(10000),
  institutionId: z.number().int().positive().optional().nullable(),
  organisation: optional(200),
  region: optional(200),
  focusSpecies: optional(500),
  projectStatus: z.enum(PROJECT_STATUSES).default('ongoing'),
  startYear: z.number().int().min(1900).max(2100).optional().nullable(),
  endYear: z.number().int().min(1900).max(2100).optional().nullable(),
  url,
  howToJoin: optional(2000),
});

export const OrganisationUpdate = z.object({
  name: text(2, 200).optional(),
  type: z.enum(['university', 'research-institute', 'museum', 'government', 'ngo', 'other']).optional(),
  city: optional(100),
  region: optional(100),
  website: url,
  description: optional(4000),
});

export const Paging = z.object({
  page: z.coerce.number().int().min(0).default(0),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const ModerationDecision = z.object({
  decision: z.enum(['publish', 'reject', 'archive']),
  note: optional(1000),
});
