/** Allowed values for string "enum" columns (kept as strings for SQLite/Postgres portability). */

export const CHARACTER_KINDS = ['categorical', 'meristic', 'morphometric'] as const;
export type CharacterKind = (typeof CHARACTER_KINDS)[number];

export const KEY_STATUSES = ['draft', 'published'] as const;

export const REQUEST_STATUSES = ['open', 'proposed', 'verified', 'closed'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const CONFIDENCE_LEVELS = ['certain', 'likely', 'possible'] as const;

export const REVIEW_DECISIONS = ['agree', 'disagree'] as const;
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

/**
 * When a proposal counts as verified (research grade):
 * at least `minAgree` agreeing reviews, at least `minExpertAgree` of them from
 * experts, and more expert agreements than expert disagreements.
 */
export const VERIFICATION_RULE = {
  minAgree: 2,
  minExpertAgree: 1,
} as const;
