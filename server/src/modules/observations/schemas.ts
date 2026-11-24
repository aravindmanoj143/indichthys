import { z } from 'zod';

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const HABITATS = ['river', 'stream', 'lake', 'reservoir', 'pond', 'wetland', 'floodplain', 'estuary', 'canal', 'paddy-field', 'spring', 'cave', 'other'] as const;
export const QUALITY_GRADES = ['casual', 'needs-id', 'research'] as const;

const boolish = z
  .union([z.boolean(), z.enum(['true', 'false', 'on', '1', '0'])])
  .transform((v) => v === true || v === 'true' || v === 'on' || v === '1');

/** All fields of an observation (multipart strings are coerced); missing = null, so a save replaces every field. */
export const ObservationFields = z
  .object({
    observedAt: z
      .string()
      .trim()
      .optional()
      .nullable()
      .transform((v) => (v ? new Date(v) : null))
      .refine((d) => d == null || (!Number.isNaN(d.getTime()) && d.getTime() <= Date.now() + 36 * 3600e3), 'Date cannot be in the future'),
    latitude: z.coerce.number().min(-90).max(90).optional().nullable().transform((v) => v ?? null),
    longitude: z.coerce.number().min(-180).max(180).optional().nullable().transform((v) => v ?? null),
    accuracyM: z.coerce.number().int().min(0).max(100000).optional().nullable().transform((v) => v ?? null),
    placeName: text(200),
    waterBody: text(200),
    habitat: z.enum(HABITATS).optional().nullable().transform((v) => v ?? null),
    individuals: z.coerce.number().int().min(1).max(1000000).optional().nullable().transform((v) => v ?? null),
    captive: boolish.default(false),
    geoprivacy: z.enum(['open', 'obscured']).default('open'),
    notes: text(4000),
  })
  .refine((o) => (o.latitude == null) === (o.longitude == null), { message: 'Give both latitude and longitude, or neither', path: ['longitude'] });

export const TaxonFields = z.object({
  taxonName: z.string().trim().min(2).max(200),
  gbifKey: z.coerce.number().int().positive().optional().nullable(),
  taxonRank: z.string().trim().max(30).optional().nullable(),
});

/** Optional details when adding an observation without signing in (no name = shown as "Guest"). */
export const GuestFields = z.object({
  guestName: z
    .string()
    .trim()
    .max(120)
    .optional()
    .nullable()
    .transform((v) => v || null),
  guestEmail: z
    .email('Email looks invalid')
    .max(200)
    .optional()
    .nullable()
    .transform((v) => v || null),
});

export const IdentificationBody = TaxonFields.extend({ comment: text(2000) });

export const ListQuery = z.object({
  q: z.string().trim().max(100).optional(),
  quality: z.enum(QUALITY_GRADES).optional(),
  gbifKey: z.coerce.number().int().positive().optional(),
  mine: z.coerce.boolean().optional(),
  /** west,south,east,north */
  bbox: z
    .string()
    .regex(/^-?[\d.]+,-?[\d.]+,-?[\d.]+,-?[\d.]+$/)
    .transform((s) => s.split(',').map(Number) as [number, number, number, number])
    .optional(),
  page: z.coerce.number().int().min(0).default(0),
  pageSize: z.coerce.number().int().min(1).max(60).default(24),
});

export const IdParam = z.object({ id: z.coerce.number().int().positive() });
export const IdentParam = IdParam.extend({ identId: z.coerce.number().int().positive() });
