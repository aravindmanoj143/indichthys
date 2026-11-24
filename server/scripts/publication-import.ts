/** Shared Crossref → Publication import helpers (sample data and Drive paper imports). */
import type { createPrisma } from '../src/db';
import { binomials, fixCaps, topicsFor } from './sample-data.helpers';

export const USER_AGENT = 'Indichthys-sample-import/1.0';
type Db = ReturnType<typeof createPrisma>;
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getJson<T>(url: string): Promise<T | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
      if (res.ok) return (await res.json()) as T;
      if (res.status === 404) return null;
    } catch {
      /* retry */
    }
    await sleep(1000 * (attempt + 1));
  }
  console.warn(`  ! failed: ${url}`);
  return null;
}

export interface CrossrefWork {
  DOI: string;
  title?: string[];
  author?: { given?: string; family?: string; name?: string }[];
  'container-title'?: string[];
  volume?: string;
  issue?: string;
  page?: string;
  publisher?: string;
  issued?: { 'date-parts'?: number[][] };
  published?: { 'date-parts'?: number[][] };
}

export function authorList(work: CrossrefWork): string {
  return (work.author ?? [])
    .map((a) => {
      if (!a.family) return a.name ?? '';
      const initials = (a.given ?? '')
        .split(/[\s.-]+/)
        .filter((g) => g)
        .map((g) => g[0]!.toUpperCase())
        .join('');
      return [fixCaps(a.family), initials].filter(Boolean).join(' ');
    })
    .filter(Boolean)
    .join(', ');
}

export function classify(title: string): string {
  if (/\b(new (?:\w+ )?species|new genus|two new|three new|four new|sp\. nov)\b/i.test(title)) return 'species-description';
  if (/\b(revision|revalidation|redescription|synonym\w*)\b/i.test(title)) return 'taxonomic-revision';
  return 'article';
}

export async function gbifSpecies(name: string): Promise<{ gbifKey: number; scientificName: string } | null> {
  const r = await getJson<{ usageKey?: number; acceptedUsageKey?: number; matchType?: string; rank?: string; canonicalName?: string; kingdom?: string }>(
    `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(name)}&kingdom=Animalia&strict=true`,
  );
  if (!r || r.matchType !== 'EXACT' || r.rank !== 'SPECIES' || !r.usageKey) return null;
  return { gbifKey: r.acceptedUsageKey ?? r.usageKey, scientificName: r.canonicalName ?? name };
}

export function issuedDate(w: CrossrefWork): Date | null {
  const parts = w.published?.['date-parts']?.[0] ?? w.issued?.['date-parts']?.[0];
  if (!parts?.[0]) return null;
  return new Date(Date.UTC(parts[0], (parts[1] ?? 1) - 1, parts[2] ?? 1));
}

export interface Candidate {
  work: CrossrefWork;
  title: string;
  date: Date | null;
}

/** Insert or update one Crossref work with its topics and GBIF-matched taxa. */
export async function upsertPublication(db: Db, c: Candidate, areas: Map<string, number>, DRY_RUN = false): Promise<{ id: number; type: string; created: boolean } | null> {
  const w = c.work;
  const type = classify(c.title);
  const taxa: { gbifKey: number; scientificName: string }[] = [];
  for (const name of binomials(c.title)) {
    const m = await gbifSpecies(name);
    if (m && !taxa.some((t) => t.gbifKey === m.gbifKey)) taxa.push(m);
    await sleep(100);
  }
  const topics = topicsFor(c.title).filter((t) => areas.has(t));
  if (DRY_RUN) {
    console.log(`  + ${type.padEnd(19)} ${c.title.slice(0, 80)}  [${taxa.map((t) => t.scientificName).join(', ')}]`);
    return null;
  }
  const data = {
    title: c.title,
    authors: authorList(w),
    year: c.date?.getUTCFullYear() ?? null,
    journal: w['container-title']?.[0] ?? null,
    volume: w.volume ?? null,
    issue: w.issue ?? null,
    pages: w.page ?? null,
    publisher: w.publisher ?? null,
    type,
  };
  const doi = w.DOI.toLowerCase();
  const existed = await db.publication.findUnique({ where: { doi }, select: { id: true } });
  const pub = await db.publication.upsert({ where: { doi }, update: data, create: { ...data, doi } });
  await db.publicationTopic.deleteMany({ where: { publicationId: pub.id } });
  await db.publicationTopic.createMany({ data: topics.map((t) => ({ publicationId: pub.id, areaId: areas.get(t)! })) });
  await db.publicationTaxon.deleteMany({ where: { publicationId: pub.id } });
  await db.publicationTaxon.createMany({ data: taxa.map((t) => ({ publicationId: pub.id, ...t })) });
  return { id: pub.id, type, created: !existed };
}
