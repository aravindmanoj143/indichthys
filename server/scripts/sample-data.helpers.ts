/** Pure text helpers for the sample-data import (unit-tested in sample-data.helpers.test.ts). */

export const TAXONOMIC = /\b(new (?:\w+ )?species|new genus|two new|three new|four new|revision|revalidation|redescription|synonym\w*|checklist|taxonom\w*|phylogen\w*|systematics|diversity)\b/i;

/** Strip markup from Crossref titles: "of<i>Pethia</i>from" → "of Pethia from". */
export function cleanTitle(raw: string): string {
  return raw
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+([),:;.])/g, '$1')
    .trim();
}

export const fixCaps = (name: string) =>
  name === name.toUpperCase() && /[A-Z]{2}/.test(name)
    ? name.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, sep: string, c: string) => sep + c.toUpperCase())
    : name;

/** Expertise topic slugs suggested by a title. */
export function topicsFor(title: string): string[] {
  const t = title.toLowerCase();
  const topics = new Set<string>();
  if (TAXONOMIC.test(t)) topics.add('taxonomy');
  if (/phylogen|dna|barcod|molecular|mitochondrial/.test(t)) topics.add('molecular-phylogenetics');
  if (/morphometr|meristic/.test(t)) topics.add('morphometrics');
  if (/western ghats|kerala|karnataka|goa|tamil nadu|cauvery/.test(t)) topics.add('western-ghats');
  if (/meghalaya|manipur|mizoram|nagaland|assam|arunachal|brahmaputra|barak|northeast|north-east/.test(t)) topics.add('northeast-india');
  if (/himalaya|himachal|uttarakhand|sikkim|nepal|bhutan/.test(t)) topics.add('himalaya');
  if (/sri lanka/.test(t)) topics.add('sri-lanka');
  if (/\b(cyprinidae|danionidae|garra|pethia|puntius|devario|danio|dawkinsia|barbs?|tor|mahseers?)\b/.test(t)) topics.add('cypriniformes');
  if (/\b(nemacheilidae|balitoridae|loach(es)?|schistura|indoreonectes)\b/.test(t)) {
    topics.add('cypriniformes');
    topics.add('hillstream-loaches');
  }
  if (/\b(siluriformes|sisoridae|bagridae|catfish(es)?|glyptothorax|mystus|exostoma)\b/.test(t)) topics.add('siluriformes');
  if (/\b(channidae|snakeheads?|channa|badidae|badis|anabantiformes)\b/.test(t)) topics.add('anabantiformes');
  if (/mahseer|\btor\b/.test(t)) topics.add('mahseers');
  return [...topics];
}

/** Candidate binomials in a title, e.g. "Garra dohjei". */
export function binomials(title: string): string[] {
  const found = new Set<string>();
  for (const m of title.matchAll(/\b([A-Z][a-z]{2,})\s([a-z]{3,})\b/g)) {
    const [genus, epithet] = [m[1]!, m[2]!];
    if (['new', 'species', 'from', 'the', 'and', 'with', 'genus', 'fish', 'fishes', 'river', 'basin', 'drainage', 'india', 'northeast'].includes(epithet)) continue;
    if (['A', 'The', 'New', 'Two', 'Three', 'Four', 'On', 'Description', 'Revision', 'Gangetic'].includes(genus)) continue;
    found.add(`${genus} ${epithet}`);
  }
  return [...found].slice(0, 4);
}

