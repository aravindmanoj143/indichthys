/** Community identification and quality grade for observations (iNaturalist-style, simplified). */

export interface IdVote {
  taxonName: string;
  gbifKey: number | null;
  taxonRank: string | null;
}

export interface CommunityTaxon extends IdVote {
  /** Current identifications agreeing with this taxon. */
  agreements: number;
  /** All current identifications. */
  total: number;
}

const keyOf = (v: IdVote) => (v.gbifKey != null ? `k${v.gbifKey}` : `n${v.taxonName.trim().toLowerCase()}`);

/** Rank of a name when none was recorded: two words = species. */
export const inferRank = (v: IdVote) => v.taxonRank ?? (v.taxonName.trim().split(/\s+/).length >= 2 ? 'species' : null);

/** The taxon with the most current identifications (earliest wins a tie), or null if there are none. */
export function communityTaxon(votes: IdVote[]): CommunityTaxon | null {
  if (!votes.length) return null;
  const counts = new Map<string, { vote: IdVote; n: number }>();
  for (const v of votes) {
    const k = keyOf(v);
    const c = counts.get(k);
    if (c) c.n++;
    else counts.set(k, { vote: v, n: 1 });
  }
  let best: { vote: IdVote; n: number } | null = null;
  for (const c of counts.values()) if (!best || c.n > best.n) best = c;
  return { ...best!.vote, taxonRank: inferRank(best!.vote), agreements: best!.n, total: votes.length };
}

export interface GradeInput {
  hasPhoto: boolean;
  observedAt: Date | null;
  latitude: number | null;
  longitude: number | null;
  captive: boolean;
}

export type QualityGrade = 'casual' | 'needs-id' | 'research';

/**
 * casual: missing photo, date or location, or captive.
 * research: at least two people agree on a species and they are more than 2/3 of current identifications.
 * needs-id: everything else.
 */
export function qualityGrade(o: GradeInput, community: CommunityTaxon | null): QualityGrade {
  if (!o.hasPhoto || !o.observedAt || o.latitude == null || o.longitude == null || o.captive) return 'casual';
  if (community && community.agreements >= 2 && community.agreements / community.total > 2 / 3 && community.taxonRank === 'species') {
    return 'research';
  }
  return 'needs-id';
}

/** Size of the grid cell an obscured location is snapped to (≈ 22 km north–south). */
export const OBSCURE_CELL_DEG = 0.2;

/** Centre of the 0.2° cell containing the point. */
export function obscure(lat: number, lng: number): { latitude: number; longitude: number } {
  const snap = (v: number) => Math.round((Math.floor(v / OBSCURE_CELL_DEG) * OBSCURE_CELL_DEG + OBSCURE_CELL_DEG / 2) * 1e4) / 1e4;
  return { latitude: snap(lat), longitude: snap(lng) };
}

export function publicPosition(o: { latitude: number | null; longitude: number | null; geoprivacy: string }) {
  if (o.latitude == null || o.longitude == null) return { latitude: null, longitude: null };
  return o.geoprivacy === 'obscured' ? obscure(o.latitude, o.longitude) : { latitude: o.latitude, longitude: o.longitude };
}
