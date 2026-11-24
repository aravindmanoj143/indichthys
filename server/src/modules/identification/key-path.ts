/** Paths through dichotomous keys. Pure functions (unit-tested). */

export interface LeadLike {
  id: number;
  couplet: number;
  label: string;
  text: string;
  nextCouplet: number | null;
}

export interface PathStep {
  couplet: number;
  label: string;
  text: string;
}

/**
 * The leads followed from the first couplet to reach `targetId`, ending with the target.
 * Returns [] if the target can't be reached (a broken key).
 */
export function pathToLead(leads: readonly LeadLike[], targetId: number): PathStep[] {
  const target = leads.find((l) => l.id === targetId);
  if (!target || !leads.length) return [];
  const parentOf = new Map<number, LeadLike>();
  for (const l of leads) if (l.nextCouplet != null) parentOf.set(l.nextCouplet, l);
  const first = Math.min(...leads.map((l) => l.couplet));

  const path: LeadLike[] = [target];
  const seen = new Set<number>();
  let couplet = target.couplet;
  while (couplet !== first) {
    if (seen.has(couplet)) return [];
    seen.add(couplet);
    const parent = parentOf.get(couplet);
    if (!parent) return [];
    path.unshift(parent);
    couplet = parent.couplet;
  }
  return path.map(({ couplet, label, text }) => ({ couplet, label, text }));
}
