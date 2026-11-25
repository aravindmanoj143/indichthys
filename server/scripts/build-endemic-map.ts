/**
 * Build the data behind Fieldwork → Endemics: a map of places where fishes endemic to India were recorded.
 *
 *   npm --prefix server run data:endemics        # writes public/data/endemic-fishes.json (commit it)
 *
 * "Endemic" here is derived from GBIF, not a published checklist: a fish species counts as endemic to India
 * when it has at least MIN_INDIA_RECORDS GBIF occurrence records in India and at least ENDEMIC_SHARE of all
 * its GBIF records worldwide are from India. Marine-only species (by GBIF species profiles) are left out.
 * Record locations are snapped to a CELL_DEG grid (≈ 11 km), which also blurs sensitive sites. Each place is
 * named from its records' most common water body / locality and state.
 *
 *   npm --prefix server run data:endemics -- --places-only   # keep the species list, rebuild places only
 */
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getJson, sleep } from './publication-import';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GBIF = 'https://api.gbif.org/v1';
const MIN_INDIA_RECORDS = 3;
const ENDEMIC_SHARE = 0.95;
const CELL_DEG = 0.1;
const PLACES_ONLY = process.argv.includes('--places-only');

/** A readable place name from a GBIF locality / water body, or null for codes, coordinates and junk. */
export function cleanPlace(raw: string | undefined): string | null {
  if (!raw) return null;
  let t = raw.replace(/\s+/g, ' ').replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, '').trim();
  if (t.length < 3 || /^(na|n\/a|unknown|not recorded|none|india)$/i.test(t) || /\d+\.\d{3,}/.test(t) || !/[a-z]{3}/i.test(t)) return null;
  if (t.length > 60) t = (t.slice(0, 60).split(/[,;(]/)[0] ?? '').trim() || t.slice(0, 57).trim() + '…';
  return t.charAt(0).toUpperCase() + t.slice(1);
}
/** Reverse-geocoded district/state per place (OpenStreetMap Nominatim), cached so re-runs don't repeat requests. */
const GEO_CACHE = path.resolve(HERE, 'data/endemic-place-geocode.json');
type Geo = { district: string | null; state: string | null; town: string | null };
async function reverseGeocode(lat: number, lng: number, cache: Record<string, Geo>): Promise<Geo> {
  const id = `${lat.toFixed(1)},${lng.toFixed(1)}`;
  if (cache[id]) return cache[id];
  await sleep(1100); // Nominatim usage policy: max 1 request per second
  const r = await getJson<{ address?: Record<string, string> }>(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&accept-language=en&lat=${lat}&lon=${lng}`,
  );
  const a = r?.address ?? {};
  const geo = {
    district: a['state_district'] ?? a['county'] ?? null,
    state: a['state'] ?? a['territory'] ?? null,
    town: a['city'] ?? a['town'] ?? a['village'] ?? a['municipality'] ?? null,
  };
  cache[id] = geo;
  return geo;
}
const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
const OUT = path.resolve(HERE, '../../public/data/endemic-fishes.json');

/** Fish orders in the GBIF Backbone (same list as src/app/features/taxonomy/gbif/gbif.config.ts). */
const FISH_ORDER_KEYS = [
  1103, 494, 495, 496, 498, 887, 879, 537, 538, 1153, 547, 1162, 548, 549, 550, 1164, 1165, 1167, 1067, 8214029, 1068, 1069,
];

async function pool<T, R>(items: T[], size: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]!);
      }
    }),
  );
  return out;
}

async function speciesFromGbif() {
  // Orders list must match the frontend's; read it from there so they can't drift.
  const cfg = readFileSync(path.resolve(HERE, '../../src/app/features/taxonomy/gbif/gbif.config.ts'), 'utf8');
  const orderKeys = [...cfg.matchAll(/\{ key: (\d+), name: '\w+' \}/g)].map((m) => Number(m[1]));
  const orders = orderKeys.length ? orderKeys : FISH_ORDER_KEYS;
  const taxonParams = orders.map((k) => `taxonKey=${k}`).join('&');

  const facet = await getJson<{ facets: { counts: { name: string; count: number }[] }[] }>(
    `${GBIF}/occurrence/search?country=IN&${taxonParams}&limit=0&facet=speciesKey&facetLimit=10000`,
  );
  const inIndia = (facet?.facets[0]?.counts ?? []).map((c) => ({ key: Number(c.name), india: c.count })).filter((s) => s.india >= MIN_INDIA_RECORDS);
  console.log(`Fish species with ≥${MIN_INDIA_RECORDS} records in India: ${inIndia.length}`);

  let done = 0;
  const totals = await pool(inIndia, 8, async (s) => {
    const r = await getJson<{ count: number }>(`${GBIF}/occurrence/search?taxonKey=${s.key}&limit=0`);
    if (++done % 250 === 0) console.log(`  checked ${done}/${inIndia.length}`);
    return r?.count ?? 0;
  });
  const candidates = inIndia.filter((s, i) => totals[i]! > 0 && s.india / totals[i]! >= ENDEMIC_SHARE);
  console.log(`Candidates (≥${ENDEMIC_SHARE * 100}% of records in India): ${candidates.length}`);

  const details = await pool(candidates, 8, async (s) => {
    const [sp, profiles] = await Promise.all([
      getJson<{ canonicalName?: string; family?: string; taxonomicStatus?: string; rank?: string }>(`${GBIF}/species/${s.key}`),
      getJson<{ results: { freshwater?: boolean; marine?: boolean }[] }>(`${GBIF}/species/${s.key}/speciesProfiles`),
    ]);
    const flags = (profiles?.results ?? []).filter((p) => p.freshwater != null || p.marine != null);
    const marineOnly = flags.length > 0 && !flags.some((p) => p.freshwater === true);
    return { ...s, name: sp?.canonicalName ?? '', family: sp?.family ?? '', ok: sp?.rank === 'SPECIES' && sp.taxonomicStatus === 'ACCEPTED' && !marineOnly };
  });
  const species = details.filter((d) => d.ok && d.name).sort((a, b) => a.name.localeCompare(b.name));
  console.log(`Endemic freshwater species kept: ${species.length}`);
  return species;
}

async function main() {
  const species: { key: number; name: string; family: string; india: number }[] = PLACES_ONLY
    ? (JSON.parse(readFileSync(OUT, 'utf8')) as { species: { key: number; name: string; family: string; records: number }[] }).species.map((s) => ({ ...s, india: s.records }))
    : await speciesFromGbif();
  if (PLACES_ONLY) console.log(`Reusing ${species.length} species from ${OUT}`);

  // Occurrence points in India, in batches of species.
  const index = new Map(species.map((s, i) => [s.key, i]));
  type Cell = { lat: number; lng: number; species: Set<number>; records: number; names: Map<string, number>; states: Map<string, number> };
  const cells = new Map<string, Cell>();
  const bump = (m: Map<string, number>, k: string | null) => k && m.set(k, (m.get(k) ?? 0) + 1);
  for (let b = 0; b < species.length; b += 40) {
    const keys = species.slice(b, b + 40).map((s) => `taxonKey=${s.key}`).join('&');
    for (let offset = 0; offset < 100_000; offset += 300) {
      const page = await getJson<{
        endOfRecords: boolean;
        results: { speciesKey?: number; decimalLatitude?: number; decimalLongitude?: number; waterBody?: string; locality?: string; stateProvince?: string }[];
      }>(
        `${GBIF}/occurrence/search?${keys}&country=IN&hasCoordinate=true&hasGeospatialIssue=false&limit=300&offset=${offset}`,
      );
      if (!page) break;
      for (const r of page.results) {
        const i = r.speciesKey != null ? index.get(r.speciesKey) : undefined;
        if (i == null || r.decimalLatitude == null || r.decimalLongitude == null) continue;
        const lat = Math.round(r.decimalLatitude / CELL_DEG) * CELL_DEG;
        const lng = Math.round(r.decimalLongitude / CELL_DEG) * CELL_DEG;
        const id = `${lat.toFixed(1)},${lng.toFixed(1)}`;
        const c = cells.get(id) ?? { lat: Number(lat.toFixed(1)), lng: Number(lng.toFixed(1)), species: new Set<number>(), records: 0, names: new Map(), states: new Map() };
        c.species.add(i);
        c.records++;
        bump(c.names, cleanPlace(r.waterBody) ?? cleanPlace(r.locality));
        bump(c.states, cleanPlace(r.stateProvince));
        cells.set(id, c);
      }
      if (page.endOfRecords) break;
      await sleep(150);
    }
    console.log(`  points: species ${Math.min(b + 40, species.length)}/${species.length}, ${cells.size} places`);
  }

  const cache: Record<string, Geo> = existsSync(GEO_CACHE) ? JSON.parse(readFileSync(GEO_CACHE, 'utf8')) : {};
  const named: (string | null)[][] = [];
  let n = 0;
  for (const c of cells.values()) {
    const g = await reverseGeocode(c.lat, c.lng, cache);
    // Drop a leading state name ("Kerala, Vythiri" → "Vythiri"): the state is shown in the region line.
    const state = g.state ?? top(c.states);
    const local = top(c.names)?.replace(new RegExp(`^${(state ?? '-').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')},\\s*`, 'i'), '') || null;
    const name = local ?? g.town ?? g.district;
    const region = [g.district, state].filter((x, i, a) => x && a.indexOf(x) === i && x !== name).join(', ') || null;
    named.push([name, region]);
    if (++n % 50 === 0) {
      console.log(`  named ${n}/${cells.size}`);
      await writeFile(GEO_CACHE, JSON.stringify(cache));
    }
  }
  await mkdir(path.dirname(GEO_CACHE), { recursive: true });
  await writeFile(GEO_CACHE, JSON.stringify(cache));

  const out = {
    generated: new Date().toISOString().slice(0, 10),
    source: 'GBIF.org occurrence data',
    criteria: { minIndiaRecords: MIN_INDIA_RECORDS, endemicShare: ENDEMIC_SHARE, cellDeg: CELL_DEG },
    species: species.map((s) => ({ key: s.key, name: s.name, family: s.family, records: s.india })),
    /** [lat, lng, records, speciesIndexes[], placeName | null, "district, state" | null] */
    places: [...cells.values()].map((c, i) => [c.lat, c.lng, c.records, [...c.species].sort((a, b) => a - b), named[i]![0], named[i]![1]]),
    attribution: 'Place names: GBIF records and © OpenStreetMap contributors (Nominatim)',
  };
  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(out));
  console.log(`Wrote ${OUT}: ${out.species.length} species, ${out.places.length} places.`);
}

if (process.argv[1]?.endsWith('build-endemic-map.ts')) main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
