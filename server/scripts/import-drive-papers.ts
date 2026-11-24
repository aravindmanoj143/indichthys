/**
 * Import publications from a list of research papers (built from PDF file names in the owner's Google Drive).
 *
 *   npm --prefix server run data:drive            # import
 *   npm --prefix server run data:drive -- --dry-run
 *
 * The list lives in scripts/data/drive-papers.json: {query, keys, author, year} per paper. Only that query text
 * is sent to Crossref; no file contents leave the machine. A Crossref record is accepted only when its title
 * contains every key (usually the species epithet), the named author is on it, and the year is within ±1
 * (print vs online). Papers without a confident match are listed at the end and skipped.
 * Idempotent: re-running updates the same DOIs.
 */
import { readFileSync } from 'node:fs';
import { createPrisma } from '../src/db';
import { type Candidate, type CrossrefWork, getJson, issuedDate, sleep, upsertPublication } from './publication-import';
import { cleanTitle } from './sample-data.helpers';

const DRY_RUN = process.argv.includes('--dry-run');
const db = createPrisma();

interface DrivePaper {
  query: string;
  keys: string[];
  author: string | null;
  year: number | null;
}

const NOTICE = /^(erratum|corrigendum|correction|retraction)\b/i;
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function accepts(p: DrivePaper, w: CrossrefWork): boolean {
  const title = fold(cleanTitle(w.title?.[0] ?? ''));
  if (!title || NOTICE.test(title)) return false;
  if (!p.keys.every((k) => title.includes(k.toLowerCase()))) return false;
  if (p.author && !(w.author ?? []).some((a) => fold(a.family ?? a.name ?? '') === fold(p.author!))) return false;
  const year = issuedDate(w)?.getUTCFullYear();
  if (p.year && (!year || Math.abs(year - p.year) > 1)) return false;
  return true;
}

async function resolve(p: DrivePaper): Promise<Candidate | null> {
  const url = `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(p.query)}&rows=10&select=DOI,title,author,container-title,volume,issue,page,publisher,issued,published,type`;
  const res = await getJson<{ message: { items: (CrossrefWork & { type?: string })[] } }>(url);
  const work = res?.message.items.find((w) => ['journal-article', 'book-chapter', 'proceedings-article'].includes(w.type ?? '') && accepts(p, w));
  return work ? { work, title: cleanTitle(work.title![0]!), date: issuedDate(work) } : null;
}

async function main() {
  const papers = JSON.parse(readFileSync(new URL('./data/drive-papers.json', import.meta.url), 'utf8')) as DrivePaper[];
  console.log(`${DRY_RUN ? 'DRY RUN: ' : ''}resolving ${papers.length} papers on Crossref…`);
  const areas = new Map((await db.expertiseArea.findMany({ select: { id: true, slug: true } })).map((a) => [a.slug, a.id]));
  // Sample profiles to credit: family name = last word of the name, given name must start with the same letter.
  const people = (await db.ichthyologist.findMany({ where: { isDemo: true }, select: { id: true, fullName: true } })).map((p) => ({
    id: p.id,
    family: fold(p.fullName.split(' ').at(-1)!),
    initial: fold(p.fullName)[0]!,
  }));

  const seen = new Set<string>();
  const missed: string[] = [];
  let created = 0;
  let updated = 0;
  let credited = 0;
  for (const p of papers) {
    const c = await resolve(p);
    await sleep(250);
    if (!c) {
      missed.push(p.query);
      continue;
    }
    const doi = c.work.DOI.toLowerCase();
    if (seen.has(doi)) continue;
    seen.add(doi);
    const r = await upsertPublication(db, c, areas, DRY_RUN);
    if (!r) continue;
    if (r.created) created++;
    else updated++;
    for (const person of people) {
      const isAuthor = (c.work.author ?? []).some((a) => fold(a.family ?? '') === person.family && fold(a.given ?? '').startsWith(person.initial));
      if (!isAuthor) continue;
      await db.publicationAuthor.upsert({
        where: { publicationId_profileId: { publicationId: r.id, profileId: person.id } },
        update: {},
        create: { publicationId: r.id, profileId: person.id },
      });
      credited++;
    }
  }
  console.log(`\nMatched ${seen.size} of ${papers.length}; ${created} new, ${updated} already present; ${credited} sample-profile authorships.`);
  if (missed.length) console.log(`No confident Crossref match (${missed.length}):\n${missed.map((m) => `  - ${m}`).join('\n')}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
