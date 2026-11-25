/**
 * Import a person's fish observations from iNaturalist into Observations (Fieldwork).
 *
 *   npm --prefix server run data:inat                 # Aravind Manoj's fish (default)
 *   INAT_USER=someone npm --prefix server run data:inat
 *
 * Requested by the platform owner for their own iNaturalist account. Uses the public iNaturalist API
 * (no login). Each observation keeps its date, place, coordinates (iNaturalist's public ones, so obscured
 * records stay obscured), captive flag, notes, photos (shown from iNaturalist, credited and linked) and
 * every current identification, so the community taxon and quality grade are recomputed here with our
 * own rules. Idempotent: records are matched on sourceId "inat:<id>" and refreshed on each run.
 */
import { createPrisma } from '../src/db';
import { communityTaxon, publicPosition, qualityGrade } from '../src/modules/observations/quality';
import { USER_AGENT, getJson, sleep } from './publication-import';

const INAT_USER = process.env['INAT_USER'] ?? 'aravindmanoj';
/** Ray-finned fishes (Actinopterygii). */
const FISH_TAXON = 47178;
const db = createPrisma();

interface InatUser {
  login: string;
  name: string | null;
}
interface InatTaxon {
  name: string;
  rank: string;
}
interface InatObservation {
  id: number;
  uri: string;
  observed_on: string | null;
  time_observed_at: string | null;
  location: string | null;
  place_guess: string | null;
  positional_accuracy: number | null;
  obscured: boolean;
  captive: boolean;
  description: string | null;
  user: InatUser;
  photos: { id: number; url: string; attribution: string }[];
  identifications: { taxon: InatTaxon; current: boolean; body: string | null; created_at: string; user: InatUser }[];
}

const who = (u: InatUser) => u.name?.trim() || u.login;

const gbifCache = new Map<string, number | null>();
async function gbifKey(name: string): Promise<number | null> {
  if (gbifCache.has(name)) return gbifCache.get(name)!;
  const m = await getJson<{ usageKey?: number; acceptedUsageKey?: number; matchType?: string }>(
    `https://api.gbif.org/v1/species/match?kingdom=Animalia&name=${encodeURIComponent(name)}`,
  );
  const key = m && m.matchType !== 'NONE' ? (m.acceptedUsageKey ?? m.usageKey ?? null) : null;
  gbifCache.set(name, key);
  return key;
}

async function fetchAll(): Promise<InatObservation[]> {
  const out: InatObservation[] = [];
  for (let page = 1; ; page++) {
    const url = `https://api.inaturalist.org/v1/observations?user_id=${encodeURIComponent(INAT_USER)}&taxon_id=${FISH_TAXON}&verifiable=any&per_page=200&page=${page}&order_by=id&order=asc`;
    const res = await getJson<{ total_results: number; results: InatObservation[] }>(url);
    if (!res) throw new Error(`iNaturalist request failed: ${url}`);
    out.push(...res.results);
    if (res.results.length < 200 || out.length >= res.total_results) break;
    await sleep(1000); // iNaturalist asks for at most ~1 request per second
  }
  return out;
}

async function main() {
  console.log(`iNaturalist: fetching fish observations of "${INAT_USER}" (${USER_AGENT})…`);
  const all = await fetchAll();
  let added = 0;
  let updated = 0;
  for (const o of all) {
    const [lat, lng] = (o.location ?? '').split(',').map(Number);
    const latitude = Number.isFinite(lat) ? lat! : null;
    const longitude = Number.isFinite(lng) ? lng! : null;
    const geoprivacy = o.obscured ? 'obscured' : 'open';
    const pub = publicPosition({ latitude, longitude, geoprivacy });
    const observedAt = o.time_observed_at ? new Date(o.time_observed_at) : o.observed_on ? new Date(`${o.observed_on}T00:00:00Z`) : null;

    const idents: { guestName: string; taxonName: string; taxonRank: string; gbifKey: number | null; comment: string | null; createdAt: Date }[] = [];
    for (const i of o.identifications.filter((x) => x.current && x.taxon)) {
      idents.push({
        guestName: who(i.user),
        taxonName: i.taxon.name,
        taxonRank: i.taxon.rank,
        gbifKey: await gbifKey(i.taxon.name),
        comment: i.body?.trim() || null,
        createdAt: new Date(i.created_at),
      });
    }
    const community = communityTaxon(idents);
    const photos = o.photos.map((p) => ({
      // External photo: the full URL (the app shows http(s) names as-is instead of from /api/uploads).
      fileName: p.url.replace('/square.', '/large.'),
      originalName: `inaturalist-${p.id}`,
      mimeType: 'image/jpeg',
      size: 0,
    }));
    const data = {
      guestName: who(o.user),
      observedAt,
      latitude,
      longitude,
      publicLatitude: pub.latitude,
      publicLongitude: pub.longitude,
      accuracyM: o.positional_accuracy ?? null,
      placeName: o.place_guess?.slice(0, 200) ?? null,
      captive: o.captive,
      geoprivacy,
      notes: o.description?.trim().slice(0, 4000) || null,
      taxonName: community?.taxonName ?? null,
      gbifKey: community?.gbifKey ?? null,
      taxonRank: community?.taxonRank ?? null,
      qualityGrade: qualityGrade({ hasPhoto: photos.length > 0, observedAt, latitude, longitude, captive: o.captive }, community),
      sourceUrl: o.uri,
    };
    const sourceId = `inat:${o.id}`;
    const existing = await db.observation.findUnique({ where: { sourceId }, select: { id: true } });
    await db.$transaction(async (tx) => {
      const row = existing
        ? await tx.observation.update({ where: { id: existing.id }, data })
        : await tx.observation.create({ data: { ...data, sourceId } });
      await tx.observationPhoto.deleteMany({ where: { observationId: row.id } });
      await tx.observationIdentification.deleteMany({ where: { observationId: row.id } });
      await tx.observationPhoto.createMany({ data: photos.map((p) => ({ ...p, observationId: row.id })) });
      await tx.observationIdentification.createMany({ data: idents.map((i) => ({ ...i, observationId: row.id })) });
    });
    if (existing) updated++;
    else added++;
  }
  const grades = await db.observation.groupBy({ by: ['qualityGrade'], where: { sourceId: { startsWith: 'inat:' } }, _count: true });
  console.log(`iNaturalist: ${all.length} observations (${added} new, ${updated} updated); ${gbifCache.size} taxa matched to GBIF.`);
  console.log(`  quality: ${grades.map((g) => `${g.qualityGrade} ${g._count}`).join(', ')}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
