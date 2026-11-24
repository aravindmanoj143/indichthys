/**
 * Citation formats for the repository and "My library".
 * Authors are stored as cited ("Pethiyagoda R, Meegaskumbura M, Maduwage K"); we split on commas,
 * semicolons and "&"/"and", then treat the first word of each name as the family name.
 */

export interface Citable {
  id: number;
  title: string;
  authors: string;
  year: number | null;
  journal: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  publisher: string | null;
  doi: string | null;
  url: string | null;
  type: string;
  abstract?: string | null;
}

export interface AuthorName {
  family: string;
  given: string;
}

export function splitAuthors(authors: string): AuthorName[] {
  return authors
    .split(/\s*(?:;|,|&|\band\b)\s*/i)
    .map((a) => a.trim())
    .filter((a) => a.length)
    .map((a) => {
      const [family, ...rest] = a.split(/\s+/);
      return { family: family ?? a, given: rest.join(' ') };
    });
}

const pageRange = (p: string | null) => (p ? p.replace(/\s*[-–]\s*/, '–') : '');

/** Author (Year). Title. Journal Volume(Issue): pages. https://doi.org/… */
export function formatCitation(p: Citable): string {
  const parts: string[] = [];
  parts.push(`${p.authors.trim()} (${p.year ?? 'n.d.'}).`);
  parts.push(`${p.title.trim().replace(/\.$/, '')}.`);
  if (p.journal) {
    let src = p.journal;
    if (p.volume) src += ` ${p.volume}${p.issue ? `(${p.issue})` : ''}`;
    if (p.pages) src += `: ${pageRange(p.pages)}`;
    parts.push(`${src}.`);
  } else if (p.publisher) {
    parts.push(`${p.publisher}${p.pages ? `, ${pageRange(p.pages)} pp` : ''}.`);
  }
  if (p.doi) parts.push(`https://doi.org/${p.doi}`);
  else if (p.url) parts.push(p.url);
  return parts.join(' ');
}

const BIBTEX_TYPES: Record<string, string> = {
  book: 'book',
  'field-guide': 'book',
  chapter: 'incollection',
  report: 'techreport',
  thesis: 'phdthesis',
  other: 'misc',
};

/** Escape BibTeX special characters in a field value. */
const bib = (s: string) => s.replace(/([{}%&$#_])/g, '\\$1');

export function bibtexKey(p: Citable): string {
  const family = (splitAuthors(p.authors)[0]?.family ?? 'anon').normalize('NFKD').replace(/[^A-Za-z]/g, '');
  const word = (p.title.match(/[A-Za-z]{4,}/)?.[0] ?? 'item').toLowerCase();
  return `${family}${p.year ?? ''}${word}`;
}

export function toBibTeX(pubs: Citable[]): string {
  return pubs
    .map((p) => {
      const type = BIBTEX_TYPES[p.type] ?? 'article';
      const fields: [string, string | null | undefined][] = [
        ['author', splitAuthors(p.authors).map((a) => (a.given ? `${a.family}, ${a.given}` : a.family)).join(' and ')],
        ['title', `{${p.title}}`],
        ['journal', type === 'article' ? p.journal : null],
        ['booktitle', type === 'incollection' ? p.journal : null],
        ['year', p.year?.toString()],
        ['volume', p.volume],
        ['number', p.issue],
        ['pages', p.pages?.replace(/\s*[-–]\s*/, '--')],
        ['publisher', p.publisher],
        ['doi', p.doi],
        ['url', p.doi ? null : p.url],
      ];
      const body = fields
        .filter(([, v]) => v)
        .map(([k, v]) => `  ${k} = {${k === 'title' ? v : bib(v!)}}`)
        .join(',\n');
      return `@${type}{${bibtexKey(p)},\n${body}\n}`;
    })
    .join('\n\n');
}

const RIS_TYPES: Record<string, string> = {
  book: 'BOOK',
  'field-guide': 'BOOK',
  chapter: 'CHAP',
  report: 'RPRT',
  thesis: 'THES',
  other: 'GEN',
};

export function toRIS(pubs: Citable[]): string {
  return pubs
    .map((p) => {
      const lines: string[] = [`TY  - ${RIS_TYPES[p.type] ?? 'JOUR'}`];
      for (const a of splitAuthors(p.authors)) lines.push(`AU  - ${a.given ? `${a.family}, ${a.given}` : a.family}`);
      lines.push(`TI  - ${p.title}`);
      if (p.journal) lines.push(`${p.type === 'chapter' ? 'T2' : 'JO'}  - ${p.journal}`);
      if (p.year) lines.push(`PY  - ${p.year}`);
      if (p.volume) lines.push(`VL  - ${p.volume}`);
      if (p.issue) lines.push(`IS  - ${p.issue}`);
      if (p.pages) {
        const [sp, ep] = p.pages.split(/\s*[-–]\s*/);
        if (sp) lines.push(`SP  - ${sp}`);
        if (ep) lines.push(`EP  - ${ep}`);
      }
      if (p.publisher) lines.push(`PB  - ${p.publisher}`);
      if (p.doi) lines.push(`DO  - ${p.doi}`);
      if (p.url) lines.push(`UR  - ${p.url}`);
      if (p.abstract) lines.push(`AB  - ${p.abstract.replace(/\s+/g, ' ')}`);
      lines.push('ER  - ');
      return lines.join('\n');
    })
    .join('\n\n');
}

/** Save text as a file in the browser. */
export function download(filename: string, text: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
