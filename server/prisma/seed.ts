/**
 * DEMO seed data for the Identification module.
 *
 * Everything here is illustrative (isDemo / source = DEMO) so the UI can be
 * exercised. Family-level characters follow standard textbook diagnoses but
 * are simplified; numeric ranges for the carps are APPROXIMATE. Replace with
 * values from published keys and revisions before public use.
 *
 * Idempotent: clears identification content (not requests) and re-creates it.
 */
import { createPrisma } from '../src/db';
import { INDICHTHYS_COURSES } from './learning-content';

const db = createPrisma();
const DEMO = 'DEMO – unverified';

// ───────────────────────── Taxa ─────────────────────────

const FAMILIES: [name: string, gbifKey: number, order: string][] = [
  ['Cyprinidae', 7336, 'Cypriniformes'],
  ['Danionidae', 10087461, 'Cypriniformes'],
  ['Balitoridae', 3383, 'Cypriniformes'],
  ['Nemacheilidae', 6759123, 'Cypriniformes'],
  ['Cobitidae', 3385, 'Cypriniformes'],
  ['Bagridae', 8974, 'Siluriformes'],
  ['Siluridae', 5168, 'Siluriformes'],
  ['Clariidae', 8978, 'Siluriformes'],
  ['Heteropneustidae', 5152, 'Siluriformes'],
  ['Channidae', 4259, 'Perciformes'],
  ['Cichlidae', 8522, 'Perciformes'],
  ['Anabantidae', 8488, 'Perciformes'],
  ['Osphronemidae', 8553, 'Perciformes'],
  ['Mastacembelidae', 2224, 'Synbranchiformes'],
  ['Synbranchidae', 2223, 'Synbranchiformes'],
  ['Notopteridae', 4231, 'Osteoglossiformes'],
  ['Gobiidae', 4274, 'Perciformes'],
  ['Aplocheilidae', 7337, 'Cyprinodontiformes'],
  ['Ambassidae', 4235, 'Perciformes'],
  ['Belonidae', 7190, 'Beloniformes'],
];

const SPECIES: [name: string, authorship: string, gbifKey: number, family: string][] = [
  ['Labeo rohita', '(Hamilton, 1822)', 5206083, 'Cyprinidae'],
  ['Labeo catla', '(Hamilton, 1822)', 2365855, 'Cyprinidae'],
  ['Cirrhinus mrigala', '(Hamilton, 1822)', 5206447, 'Cyprinidae'],
  ['Tor tor', '(Hamilton, 1822)', 2364495, 'Cyprinidae'],
  ['Tor khudree', '(Sykes, 1839)', 2364516, 'Cyprinidae'],
  ['Puntius sophore', '(Hamilton, 1822)', 2363965, 'Cyprinidae'],
  ['Cyprinus carpio', 'Linnaeus, 1758', 4286975, 'Cyprinidae'],
  ['Garra mullya', '(Sykes, 1839)', 2366755, 'Cyprinidae'],
  ['Dawkinsia filamentosa', '(Valenciennes, 1844)', 7741827, 'Cyprinidae'],
  ['Devario malabaricus', '(Jerdon, 1849)', 2361527, 'Cyprinidae'],
  ['Bhavania australis', '(Jerdon, 1849)', 2358767, 'Balitoridae'],
  ['Ghatsa montana', '(Herre, 1945)', 9357826, 'Balitoridae'],
];

// ─────────────────────── Characters ───────────────────────

const CATEGORICAL: { code: string; name: string; group: string; states: [string, string][] }[] = [
  { code: 'body_scales', name: 'Body scales', group: 'Body', states: [['present', 'Present, clearly visible'], ['minute', 'Minute or embedded'], ['absent', 'Absent (naked skin)']] },
  { code: 'body_shape', name: 'Body shape', group: 'Body', states: [['elongate', 'Elongate / fusiform'], ['compressed', 'Laterally compressed'], ['depressed', 'Flattened (depressed) below'], ['eel_like', 'Eel-like']] },
  { code: 'barbels', name: 'Barbels', group: 'Head', states: [['none', 'None'], ['one_pair', '1 pair'], ['two_pairs', '2 pairs'], ['three_pairs', '3 pairs'], ['four_pairs', '4 pairs']] },
  { code: 'mouth_position', name: 'Mouth position', group: 'Head', states: [['terminal', 'Terminal'], ['subterminal', 'Subterminal'], ['inferior', 'Inferior (underneath)'], ['superior', 'Superior (upturned)']] },
  { code: 'adipose_fin', name: 'Adipose fin', group: 'Fins', states: [['present', 'Present'], ['absent', 'Absent']] },
  { code: 'dorsal_spines', name: 'Dorsal fin spines', group: 'Fins', states: [['present', 'True spines present'], ['absent', 'No true spines']] },
  { code: 'pelvic_fins', name: 'Pelvic fins', group: 'Fins', states: [['present', 'Present, separate'], ['fused_disc', 'Fused into a disc'], ['absent', 'Absent']] },
];

const NUMERIC: { code: string; name: string; kind: 'meristic' | 'morphometric'; unit: string; group: string; description: string }[] = [
  { code: 'lateral_line_scales', name: 'Lateral-line scales', kind: 'meristic', unit: 'count', group: 'Scales', description: 'Pored scales along the lateral line to the end of the hypural plate.' },
  { code: 'dorsal_branched_rays', name: 'Branched dorsal-fin rays', kind: 'meristic', unit: 'count', group: 'Fins', description: 'Count only branched (soft) rays; the last two sharing a base count as one.' },
  { code: 'body_depth_sl', name: 'Body depth', kind: 'morphometric', unit: '% SL', group: 'Body', description: 'Greatest body depth as a percentage of standard length.' },
];

/** family → character code → state codes (simplified family diagnoses). */
const FAMILY_STATES: Record<string, Record<string, string[]>> = {
  Cyprinidae: { body_scales: ['present'], body_shape: ['elongate', 'compressed'], barbels: ['none', 'one_pair', 'two_pairs'], mouth_position: ['terminal', 'subterminal', 'inferior'], adipose_fin: ['absent'], dorsal_spines: ['absent'], pelvic_fins: ['present'] },
  Danionidae: { body_scales: ['present'], body_shape: ['elongate', 'compressed'], barbels: ['none', 'one_pair', 'two_pairs'], mouth_position: ['terminal', 'superior'], adipose_fin: ['absent'], dorsal_spines: ['absent'], pelvic_fins: ['present'] },
  Balitoridae: { body_scales: ['present', 'minute'], body_shape: ['depressed'], barbels: ['two_pairs', 'three_pairs'], mouth_position: ['inferior'], adipose_fin: ['absent'], dorsal_spines: ['absent'], pelvic_fins: ['present'] },
  Nemacheilidae: { body_scales: ['present', 'minute'], body_shape: ['elongate'], barbels: ['three_pairs'], mouth_position: ['inferior'], adipose_fin: ['absent'], dorsal_spines: ['absent'], pelvic_fins: ['present'] },
  Cobitidae: { body_scales: ['minute'], body_shape: ['elongate', 'eel_like'], barbels: ['three_pairs', 'four_pairs'], mouth_position: ['inferior'], adipose_fin: ['absent'], dorsal_spines: ['absent'], pelvic_fins: ['present'] },
  Bagridae: { body_scales: ['absent'], body_shape: ['elongate'], barbels: ['four_pairs'], mouth_position: ['terminal', 'subterminal'], adipose_fin: ['present'], dorsal_spines: ['present'], pelvic_fins: ['present'] },
  Siluridae: { body_scales: ['absent'], body_shape: ['elongate', 'compressed'], barbels: ['one_pair', 'two_pairs'], mouth_position: ['terminal', 'superior'], adipose_fin: ['absent'], dorsal_spines: ['absent'], pelvic_fins: ['present'] },
  Clariidae: { body_scales: ['absent'], body_shape: ['elongate'], barbels: ['four_pairs'], mouth_position: ['terminal'], adipose_fin: ['absent'], dorsal_spines: ['absent'], pelvic_fins: ['present'] },
  Heteropneustidae: { body_scales: ['absent'], body_shape: ['elongate', 'compressed'], barbels: ['four_pairs'], mouth_position: ['terminal'], adipose_fin: ['absent'], dorsal_spines: ['absent'], pelvic_fins: ['present'] },
  Channidae: { body_scales: ['present'], body_shape: ['elongate'], barbels: ['none'], mouth_position: ['terminal'], adipose_fin: ['absent'], dorsal_spines: ['absent'], pelvic_fins: ['present', 'absent'] },
  Cichlidae: { body_scales: ['present'], body_shape: ['compressed'], barbels: ['none'], mouth_position: ['terminal'], adipose_fin: ['absent'], dorsal_spines: ['present'], pelvic_fins: ['present'] },
  Anabantidae: { body_scales: ['present'], body_shape: ['compressed', 'elongate'], barbels: ['none'], mouth_position: ['terminal'], adipose_fin: ['absent'], dorsal_spines: ['present'], pelvic_fins: ['present'] },
  Osphronemidae: { body_scales: ['present'], body_shape: ['compressed'], barbels: ['none'], mouth_position: ['terminal', 'superior'], adipose_fin: ['absent'], dorsal_spines: ['present'], pelvic_fins: ['present'] },
  Mastacembelidae: { body_scales: ['minute'], body_shape: ['eel_like'], barbels: ['none'], mouth_position: ['subterminal'], adipose_fin: ['absent'], dorsal_spines: ['present'], pelvic_fins: ['absent'] },
  Synbranchidae: { body_scales: ['absent', 'minute'], body_shape: ['eel_like'], barbels: ['none'], mouth_position: ['terminal'], adipose_fin: ['absent'], dorsal_spines: ['absent'], pelvic_fins: ['absent'] },
  Notopteridae: { body_scales: ['present'], body_shape: ['compressed'], barbels: ['none'], mouth_position: ['terminal'], adipose_fin: ['absent'], dorsal_spines: ['absent'], pelvic_fins: ['present', 'absent'] },
  Gobiidae: { body_scales: ['present'], body_shape: ['elongate'], barbels: ['none'], mouth_position: ['terminal'], adipose_fin: ['absent'], dorsal_spines: ['present'], pelvic_fins: ['fused_disc'] },
  Aplocheilidae: { body_scales: ['present'], body_shape: ['elongate'], barbels: ['none'], mouth_position: ['superior'], adipose_fin: ['absent'], dorsal_spines: ['absent'], pelvic_fins: ['present'] },
  Ambassidae: { body_scales: ['present'], body_shape: ['compressed'], barbels: ['none'], mouth_position: ['terminal'], adipose_fin: ['absent'], dorsal_spines: ['present'], pelvic_fins: ['present'] },
  Belonidae: { body_scales: ['present'], body_shape: ['elongate'], barbels: ['none'], mouth_position: ['terminal'], adipose_fin: ['absent'], dorsal_spines: ['absent'], pelvic_fins: ['present'] },
};

/** species → character code → [min, max]. APPROXIMATE demo values. */
const SPECIES_RANGES: Record<string, Record<string, [number, number]>> = {
  'Labeo rohita': { lateral_line_scales: [40, 44], dorsal_branched_rays: [12, 14], body_depth_sl: [25, 30] },
  'Labeo catla': { lateral_line_scales: [40, 43], dorsal_branched_rays: [14, 16], body_depth_sl: [33, 40] },
  'Cirrhinus mrigala': { lateral_line_scales: [40, 45], dorsal_branched_rays: [12, 13], body_depth_sl: [22, 27] },
  'Tor tor': { lateral_line_scales: [22, 27], dorsal_branched_rays: [8, 9], body_depth_sl: [28, 34] },
  'Tor khudree': { lateral_line_scales: [25, 28], dorsal_branched_rays: [8, 9], body_depth_sl: [24, 30] },
  'Puntius sophore': { lateral_line_scales: [22, 26], dorsal_branched_rays: [8, 8], body_depth_sl: [33, 40] },
  'Cyprinus carpio': { lateral_line_scales: [32, 38], dorsal_branched_rays: [17, 22], body_depth_sl: [30, 38] },
};

/** Species also get the categorical states of their family (scales, barbels…). */
const SPECIES_BARBELS: Record<string, string[]> = {
  'Labeo rohita': ['one_pair'],
  'Labeo catla': ['none'],
  'Cirrhinus mrigala': ['one_pair'],
  'Tor tor': ['two_pairs'],
  'Tor khudree': ['two_pairs'],
  'Puntius sophore': ['none'],
  'Cyprinus carpio': ['two_pairs'],
};

// ─────────────────── Dichotomous key (families) ───────────────────

type Lead = [couplet: number, label: 'a' | 'b', text: string, next: number | null, result?: string];
const FAMILY_KEY: Lead[] = [
  [1, 'a', 'Body eel-like; pelvic fins absent.', 2],
  [1, 'b', 'Body not eel-like; pelvic fins usually present.', 3],
  [2, 'a', 'A series of free spines in front of the soft dorsal fin; snout with a fleshy appendage.', null, 'Mastacembelidae'],
  [2, 'b', 'No dorsal spines; gill openings united into a single slit under the head.', null, 'Synbranchidae'],
  [3, 'a', 'Body naked (no scales); barbels present.', 4],
  [3, 'b', 'Body covered with scales.', 7],
  [4, 'a', 'Adipose fin present; dorsal fin with a strong spine.', null, 'Bagridae'],
  [4, 'b', 'Adipose fin absent.', 5],
  [5, 'a', 'Dorsal fin long, running along most of the back; 4 pairs of barbels.', null, 'Clariidae'],
  [5, 'b', 'Dorsal fin short, minute or absent.', 6],
  [6, 'a', '4 pairs of barbels; air sac extends back from the gill chamber into the body.', null, 'Heteropneustidae'],
  [6, 'b', '1–2 pairs of barbels; dorsal fin minute or absent; anal fin very long.', null, 'Siluridae'],
  [7, 'a', 'Dorsal fin without true spines.', 8],
  [7, 'b', 'Dorsal fin with a spiny part.', 11],
  [8, 'a', 'Head covered with scales; long dorsal and anal fins; no barbels.', null, 'Channidae'],
  [8, 'b', 'Head without scales.', 9],
  [9, 'a', 'Body knife-shaped, strongly compressed; anal fin very long and joined to the caudal fin.', null, 'Notopteridae'],
  [9, 'b', 'Anal fin short, separate from the caudal fin.', 10],
  [10, 'a', 'Both jaws drawn out into a long, toothed beak.', null, 'Belonidae'],
  [10, 'b', 'Jaws not beak-like.', 12],
  [11, 'a', 'Pelvic fins fused into a sucking disc; two separate dorsal fins.', null, 'Gobiidae'],
  [11, 'b', 'Pelvic fins separate.', 14],
  [12, 'a', 'Mouth upturned (superior); dorsal fin set far back, above the anal fin; jaws toothed.', null, 'Aplocheilidae'],
  [12, 'b', 'Mouth terminal or underneath; jaws toothless.', 13],
  [13, 'a', '3 or more pairs of barbels; mouth underneath; body elongate or flattened below.', null, 'Loaches: Balitoridae, Nemacheilidae, Cobitidae'],
  [13, 'b', '0–2 pairs of barbels.', null, 'Carps, barbs & danios: Cyprinidae, Danionidae'],
  [14, 'a', 'One nostril on each side of the snout; lateral line in two parts.', null, 'Cichlidae'],
  [14, 'b', 'Two nostrils on each side of the snout.', 15],
  [15, 'a', 'Body semi-transparent; dorsal fin deeply notched between spiny and soft parts.', null, 'Ambassidae'],
  [15, 'b', 'Body opaque; air-breathing labyrinth organ above the gills.', 16],
  [16, 'a', 'Gill cover edged with spines; pelvic fins without long filaments.', null, 'Anabantidae'],
  [16, 'b', 'Pelvic fins with a long thread-like ray.', null, 'Osphronemidae'],
];

// ─────────────────── Regional guide ───────────────────

const WG_GUIDE: [species: string, fieldMarks: string, similar: string][] = [
  ['Bhavania australis', 'Body flattened below; broad, horizontal paired fins form an adhesive surface for clinging to rocks in fast water; mouth underneath.', 'Ghatsa montana: compare fin-ray counts and head shape.'],
  ['Ghatsa montana', 'Hillstream loach of the southern Western Ghats; flattened body with enlarged paired fins; mouth underneath.', 'Bhavania australis.'],
  ['Garra mullya', 'Adhesive disc on the lower lip (mental disc); mouth underneath; scraping rocks in streams.', 'Other Garra species: check disc shape and scale counts.'],
  ['Dawkinsia filamentosa', 'Black blotch on the caudal peduncle; adult males with extended, filament-like dorsal rays.', 'Other Dawkinsia species: compare blotch position and fin colour.'],
  ['Devario malabaricus', 'Compressed body with blue and yellow horizontal stripes; schooling in open water of streams.', 'Other Devario: stripe pattern.'],
  ['Tor khudree', 'Large mahseer with large scales and thick, fleshy lips; 2 pairs of barbels.', 'Tor tor, Tor putitora and other mahseers: lip and head shape.'],
];

// ─────────────── Registry vocabularies (Module 4) ───────────────

const EXPERTISE: [category: string, slug: string, name: string][] = [
  ['discipline', 'taxonomy', 'Taxonomy & systematics'],
  ['discipline', 'molecular-phylogenetics', 'Molecular phylogenetics & DNA barcoding'],
  ['discipline', 'morphometrics', 'Morphometrics & meristics'],
  ['discipline', 'osteology', 'Osteology & anatomy'],
  ['discipline', 'ecology', 'Freshwater ecology'],
  ['discipline', 'biogeography', 'Biogeography'],
  ['discipline', 'conservation', 'Conservation biology'],
  ['discipline', 'fisheries', 'Fisheries science'],
  ['discipline', 'aquaculture', 'Aquaculture'],
  ['discipline', 'invasive-species', 'Invasive species'],
  ['discipline', 'ichthyoplankton', 'Larval fish & early life history'],
  ['discipline', 'museum-curation', 'Museum curation & collections'],
  ['discipline', 'field-surveys', 'Field surveys & monitoring'],
  ['discipline', 'fish-photography', 'Fish photography & illustration'],
  ['taxon', 'cypriniformes', 'Cypriniformes (carps, barbs, loaches)'],
  ['taxon', 'siluriformes', 'Siluriformes (catfishes)'],
  ['taxon', 'anabantiformes', 'Anabantiformes (snakeheads, gouramis)'],
  ['taxon', 'cichlids', 'Cichlids'],
  ['taxon', 'gobies', 'Gobies & sleepers'],
  ['taxon', 'killifishes', 'Killifishes & ricefishes'],
  ['taxon', 'eels', 'Eels & spiny eels'],
  ['taxon', 'mahseers', 'Mahseers (Tor, Neolissochilus)'],
  ['taxon', 'hillstream-loaches', 'Hillstream loaches'],
  ['region', 'western-ghats', 'Western Ghats'],
  ['region', 'eastern-ghats', 'Eastern Ghats'],
  ['region', 'himalaya', 'Himalaya'],
  ['region', 'northeast-india', 'Northeast India'],
  ['region', 'indo-gangetic-plain', 'Indo-Gangetic plain'],
  ['region', 'deccan', 'Deccan plateau'],
  ['region', 'andaman-nicobar', 'Andaman & Nicobar Islands'],
  ['region', 'sri-lanka', 'Sri Lanka'],
  ['region', 'southeast-asia', 'Southeast Asia'],
];

const INSTITUTIONS: { name: string; type: string; city: string; region: string; website: string }[] = [
  { name: 'Zoological Survey of India', type: 'government', city: 'Kolkata', region: 'West Bengal', website: 'https://zsi.gov.in' },
  { name: 'ICAR-National Bureau of Fish Genetic Resources', type: 'research-institute', city: 'Lucknow', region: 'Uttar Pradesh', website: 'https://nbfgr.res.in' },
  { name: 'ICAR-Central Inland Fisheries Research Institute', type: 'research-institute', city: 'Barrackpore', region: 'West Bengal', website: 'https://cifri.res.in' },
  { name: 'Kerala University of Fisheries and Ocean Studies', type: 'university', city: 'Kochi', region: 'Kerala', website: 'https://kufos.ac.in' },
  { name: 'Bombay Natural History Society', type: 'ngo', city: 'Mumbai', region: 'Maharashtra', website: 'https://www.bnhs.org' },
  { name: 'Wildlife Institute of India', type: 'research-institute', city: 'Dehradun', region: 'Uttarakhand', website: 'https://wii.gov.in' },
];

async function seedRegistry() {
  for (const [i, [category, slug, name]] of EXPERTISE.entries()) {
    await db.expertiseArea.upsert({ where: { slug }, update: { name, category, sortOrder: i }, create: { slug, name, category, sortOrder: i } });
  }
  for (const inst of INSTITUTIONS) {
    await db.institution.upsert({
      where: { name_country: { name: inst.name, country: 'IN' } },
      update: { type: inst.type, city: inst.city, region: inst.region, website: inst.website },
      create: { ...inst, country: 'IN' },
    });
  }
}

/** Indichthys courses (Module 5). Upserts by slug/position, so re-seeding keeps learners' progress. */
async function seedLearning() {
  for (const c of INDICHTHYS_COURSES) {
    const { lessons, quiz, ...fields } = c;
    const course = await db.course.upsert({
      where: { slug: c.slug },
      update: { ...fields, kind: 'indichthys', format: 'online', provider: 'Indichthys', cost: 'Free', status: 'published' },
      create: { ...fields, kind: 'indichthys', format: 'online', provider: 'Indichthys', cost: 'Free', status: 'published' },
    });
    for (const [i, l] of lessons.entries()) {
      await db.lesson.upsert({
        where: { courseId_position: { courseId: course.id, position: i + 1 } },
        update: l,
        create: { ...l, courseId: course.id, position: i + 1 },
      });
    }
    await db.lesson.deleteMany({ where: { courseId: course.id, position: { gt: lessons.length } } });
    // Quiz questions are replaced wholesale (answers are not stored).
    await db.quizQuestion.deleteMany({ where: { courseId: course.id } });
    for (const [i, q] of quiz.entries()) {
      await db.quizQuestion.create({
        data: {
          courseId: course.id,
          position: i + 1,
          prompt: q.prompt,
          explanation: q.explanation,
          options: { create: q.options.map((label, j) => ({ label, position: j + 1, isCorrect: j === q.correct })) },
        },
      });
    }
  }
}

async function main() {
  await seedRegistry();
  await seedLearning();

  // Clear identification content (keeps user-submitted requests & proposals).
  await db.$transaction([
    db.keyLead.deleteMany(),
    db.identificationKey.deleteMany(),
    db.guideEntry.deleteMany(),
    db.regionalGuide.deleteMany(),
    db.taxonNumericRange.deleteMany(),
    db.taxonCharacterState.deleteMany(),
    db.characterState.deleteMany(),
    db.character.deleteMany(),
  ]);

  // Taxa (upsert by GBIF key so requests that reference them survive re-seeding)
  const taxonId = new Map<string, number>();
  for (const [name, gbifKey, order] of FAMILIES) {
    const t = await db.taxon.upsert({
      where: { gbifKey },
      update: { scientificName: name, rank: 'family', family: name, order },
      create: { gbifKey, scientificName: name, rank: 'family', family: name, order },
    });
    taxonId.set(name, t.id);
  }
  for (const [name, authorship, gbifKey, family] of SPECIES) {
    const order = FAMILIES.find((f) => f[0] === family)![2];
    const t = await db.taxon.upsert({
      where: { gbifKey },
      update: { scientificName: name, authorship, rank: 'species', family, order },
      create: { gbifKey, scientificName: name, authorship, rank: 'species', family, order },
    });
    taxonId.set(name, t.id);
  }

  // Characters
  const stateId = new Map<string, number>(); // "char.state" → id
  const characterId = new Map<string, number>();
  for (const [i, c] of CATEGORICAL.entries()) {
    const created = await db.character.create({
      data: {
        code: c.code,
        name: c.name,
        kind: 'categorical',
        group: c.group,
        sortOrder: i,
        states: { create: c.states.map(([code, label], j) => ({ code, label, sortOrder: j })) },
      },
      include: { states: true },
    });
    characterId.set(c.code, created.id);
    for (const s of created.states) stateId.set(`${c.code}.${s.code}`, s.id);
  }
  for (const [i, c] of NUMERIC.entries()) {
    const created = await db.character.create({ data: { ...c, sortOrder: i } });
    characterId.set(c.code, created.id);
  }

  // Scoring
  const scoreStates = async (taxon: string, states: Record<string, string[]>) => {
    const data = Object.entries(states).flatMap(([char, codes]) =>
      codes.map((code) => ({ taxonId: taxonId.get(taxon)!, stateId: stateId.get(`${char}.${code}`)! })),
    );
    await db.taxonCharacterState.createMany({ data });
  };
  for (const [family, states] of Object.entries(FAMILY_STATES)) await scoreStates(family, states);
  for (const [species, ranges] of Object.entries(SPECIES_RANGES)) {
    const family = SPECIES.find((s) => s[0] === species)![3];
    await scoreStates(species, { ...FAMILY_STATES[family], barbels: SPECIES_BARBELS[species] ?? [] });
    await db.taxonNumericRange.createMany({
      data: Object.entries(ranges).map(([code, [min, max]]) => ({
        taxonId: taxonId.get(species)!,
        characterId: characterId.get(code)!,
        min,
        max,
        source: DEMO,
      })),
    });
  }

  // Dichotomous key
  await db.identificationKey.create({
    data: {
      slug: 'freshwater-fish-families-india-demo',
      title: 'Key to common freshwater fish families of India',
      description:
        'A simplified demonstration key to frequently encountered freshwater fish families. Not exhaustive: rarer and marine-derived families are omitted.',
      region: 'India',
      scope: 'Families of freshwater fishes',
      authors: 'Indichthys (demo)',
      status: 'published',
      isDemo: true,
      leads: {
        create: FAMILY_KEY.map(([couplet, label, text, next, result]) => ({
          couplet,
          label,
          text,
          nextCouplet: next,
          taxonId: result ? (taxonId.get(result) ?? null) : null,
          resultName: result && !taxonId.has(result) ? result : null,
        })),
      },
    },
  });

  // Regional guide
  await db.regionalGuide.create({
    data: {
      slug: 'western-ghats-hill-streams-demo',
      title: 'Hill-stream fishes of the Western Ghats',
      region: 'Western Ghats, India',
      description:
        'Field marks for a few characteristic fishes of fast-flowing streams in the Western Ghats. Demonstration content.',
      authors: 'Indichthys (demo)',
      isDemo: true,
      entries: {
        create: WG_GUIDE.map(([species, fieldMarks, similar], i) => ({
          taxonId: taxonId.get(species)!,
          fieldMarks,
          similar,
          sortOrder: i,
        })),
      },
    },
  });

  const counts = {
    taxa: await db.taxon.count(),
    characters: await db.character.count(),
    keyLeads: await db.keyLead.count(),
    guideEntries: await db.guideEntry.count(),
    expertiseAreas: await db.expertiseArea.count(),
    institutions: await db.institution.count(),
    courses: await db.course.count(),
    lessons: await db.lesson.count(),
    quizQuestions: await db.quizQuestion.count(),
  };
  console.log('Seeded', counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
