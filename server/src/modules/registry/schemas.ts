import { z } from 'zod';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .refine((v) => v == null || /^https?:\/\//i.test(v), 'Must start with http:// or https://');

export const INSTITUTION_TYPES = ['university', 'research-institute', 'museum', 'government', 'ngo', 'other'] as const;
export const CONTACT_KINDS = ['contact', 'collaboration', 'identification', 'student'] as const;
export const PUBLICATION_TYPES = [
  'article',
  'species-description',
  'taxonomic-revision',
  'report',
  'book',
  'field-guide',
  'chapter',
  'thesis',
  'other',
] as const;
export const VERIFICATION_STATUSES = ['unverified', 'pending', 'verified', 'rejected'] as const;

/** ORCID iD: 0000-0000-0000-000X */
const orcid = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? v.replace(/^https?:\/\/orcid\.org\//i, '') : null))
  .refine((v) => v == null || /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(v), 'ORCID iD looks like 0000-0002-1825-0097');

export const AffiliationInput = z.object({
  institution: z.union([
    z.object({ id: z.number().int().positive() }),
    z.object({
      name: z.string().trim().min(2).max(200),
      type: z.enum(INSTITUTION_TYPES).default('other'),
      city: optionalText(100),
      region: optionalText(100),
      country: z.string().trim().length(2).toUpperCase().default('IN'),
      website: optionalUrl,
    }),
  ]),
  role: optionalText(120),
  department: optionalText(200),
  startYear: z.number().int().min(1900).max(2100).optional().nullable(),
  endYear: z.number().int().min(1900).max(2100).optional().nullable(),
  isCurrent: z.boolean().default(true),
});

export const ProfileInput = z.object({
  fullName: z.string().trim().min(2).max(120),
  honorific: optionalText(20),
  position: optionalText(120),
  bio: optionalText(4000),
  country: z.string().trim().length(2).toUpperCase().default('IN'),
  region: optionalText(100),
  city: optionalText(100),
  contactEmail: z.email().max(200).optional().nullable().or(z.literal('').transform(() => null)),
  website: optionalUrl,
  orcid,
  googleScholar: optionalUrl,
  researchGate: optionalUrl,
  acceptingCollaboration: z.boolean().default(true),
  acceptingStudents: z.boolean().default(false),
  isPublic: z.boolean().default(true),
  expertise: z.array(z.string().regex(/^[a-z0-9-]+$/)).max(30).default([]),
  interests: z.array(z.string().trim().min(2).max(60)).max(20).default([]),
  affiliations: z.array(AffiliationInput).max(10).default([]),
});
export type ProfileInput = z.infer<typeof ProfileInput>;

export const PublicationInput = z.object({
  title: z.string().trim().min(3).max(500),
  authors: z.string().trim().min(2).max(1000),
  year: z.number().int().min(1700).max(2100).optional().nullable(),
  journal: optionalText(300),
  volume: optionalText(50),
  pages: optionalText(50),
  doi: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v ? v.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').toLowerCase() : null))
    .refine((v) => v == null || /^10\.\d{4,9}\/\S+$/.test(v), 'DOI looks like 10.1234/abcd'),
  url: optionalUrl,
  type: z.enum(PUBLICATION_TYPES).default('article'),
  issue: optionalText(50),
  publisher: optionalText(200),
  abstract: optionalText(10000),
});

export const ContactInput = z.object({
  senderName: z.string().trim().min(2).max(120),
  senderEmail: z.email().max(200),
  kind: z.enum(CONTACT_KINDS),
  subject: z.string().trim().min(3).max(200),
  message: z.string().trim().min(10).max(5000),
});

export const DirectoryQuery = z.object({
  q: z.string().trim().max(100).optional(),
  expertise: z.string().regex(/^[a-z0-9-]+$/).optional(),
  region: z.string().trim().max(100).optional(),
  verified: z.coerce.boolean().optional(),
  collaboration: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(0).default(0),
  pageSize: z.coerce.number().int().min(1).max(50).default(18),
});

export const VerificationRequestInput = z.object({
  evidence: z.string().trim().min(20, 'Describe your work in a few sentences (at least 20 characters).').max(4000),
});

export const VerificationDecision = z.object({
  decision: z.enum(['verify', 'reject', 'revoke']),
  note: optionalText(2000),
});

export const InboxUpdate = z.object({ status: z.enum(['new', 'read', 'archived']) });
