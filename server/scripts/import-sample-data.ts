/**
 * Fill the database with real, openly licensed sample data.
 *
 *   npm --prefix server run data:import            # import
 *   npm --prefix server run data:import -- --dry-run
 *
 * Sources (no web scraping):
 *  - Crossref REST API: publication metadata (CC0) for recent papers on South Asian freshwater fishes.
 *  - GBIF API: matches species named in titles so publications link to Taxonomy pages.
 *  - Curated lists below: real institutions, recurring funding/fellowship programmes and conservation
 *    initiatives, described in our own words, with links checked on 2026-11-24.
 * News posts are generated from the Crossref records (citation + DOI link), not copied from news sites.
 *
 * Events and external courses are curated, with dates/fees confirmed on the organisers' pages.
 * Sample ichthyologist profiles: only the people listed in SAMPLE_PEOPLE (requested by the platform owner),
 * marked as demo, with public facts only. Job vacancies are not imported (short-lived; stale posts mislead). Idempotent: re-running updates instead of duplicating.
 */
import { createPrisma } from '../src/db';
import { TAXONOMIC, cleanTitle } from './sample-data.helpers';
import { type Candidate, type CrossrefWork, USER_AGENT, authorList, getJson, issuedDate, sleep, upsertPublication } from './publication-import';

const DRY_RUN = process.argv.includes('--dry-run');
const db = createPrisma();


// ═══════════════ Curated reference data ═══════════════

const INSTITUTIONS = [
  { name: 'Ashoka Trust for Research in Ecology and the Environment (ATREE)', type: 'research-institute', city: 'Bengaluru', region: 'Karnataka', country: 'IN', website: 'https://www.atree.org', description: 'Research organisation working on biodiversity, conservation and sustainability, including freshwater ecosystems.' },
  { name: 'Nature Conservation Foundation', type: 'ngo', city: 'Mysuru', region: 'Karnataka', country: 'IN', website: 'https://www.ncf-india.org', description: 'Wildlife research and conservation organisation working across India.' },
  { name: 'WWF-India', type: 'ngo', city: 'New Delhi', region: 'Delhi', country: 'IN', website: 'https://www.wwfindia.org', description: 'Conservation organisation with programmes on rivers, wetlands and freshwater species.' },
  { name: 'Mahseer Trust', type: 'ngo', city: null, region: null, country: 'GB', website: 'https://www.mahseertrust.org', description: 'Charity dedicated to the conservation of mahseer fishes and the rivers they live in.' },
  { name: 'Natural History Museum, London', type: 'museum', city: 'London', region: null, country: 'GB', website: 'https://www.nhm.ac.uk', description: 'Holds one of the largest fish collections in the world, including many South Asian type specimens.' },
  { name: 'Smithsonian National Museum of Natural History', type: 'museum', city: 'Washington, DC', region: null, country: 'US', website: 'https://naturalhistory.si.edu', description: 'Major natural history museum with an extensive fish collection.' },
  { name: 'California Academy of Sciences', type: 'museum', city: 'San Francisco', region: 'California', country: 'US', website: 'https://www.calacademy.org', description: "Research museum; home of Eschmeyer's Catalog of Fishes." },
  { name: 'Museum and Art Gallery of the Northern Territory', type: 'museum', city: 'Darwin', region: 'Northern Territory', country: 'AU', website: 'https://www.magnt.net.au', description: 'Museum in Darwin with natural history collections, including fishes of northern Australia and the Indo-West Pacific.' },
  { name: 'Shoal', type: 'ngo', city: null, region: null, country: 'GB', website: 'https://shoal.org', description: 'Global partnership working to protect freshwater species from extinction.' },
] as const;

interface CuratedOpportunity {
  slug: string;
  section: 'funding' | 'jobs';
  type: string;
  title: string;
  organisation: string;
  description: string;
  eligibility: string | null;
  applyUrl: string;
  isRemote?: boolean;
  location?: string;
  country?: string;
}

const CHECK_SITE = 'Calls and deadlines change: check the funder’s website for the current round.';

const OPPORTUNITIES: CuratedOpportunity[] = [
  {
    slug: 'rufford-small-grants',
    section: 'funding',
    type: 'conservation-funding',
    title: 'Rufford Small Grants for nature conservation',
    organisation: 'The Rufford Foundation',
    description: `Small grants for nature conservation projects in developing countries, open to early-career conservationists. Freshwater fish surveys and species conservation projects have been funded.\n\n${CHECK_SITE}`,
    eligibility: 'Individuals and small groups leading conservation projects in eligible countries; see the foundation’s guidance.',
    applyUrl: 'https://www.rufford.org',
    location: 'International',
    country: 'GB',
  },
  {
    slug: 'mohamed-bin-zayed-species-conservation-fund',
    section: 'funding',
    type: 'conservation-funding',
    title: 'Mohamed bin Zayed Species Conservation Fund',
    organisation: 'Mohamed bin Zayed Species Conservation Fund',
    description: `Grants for species conservation projects worldwide, including fishes and other aquatic species.\n\n${CHECK_SITE}`,
    eligibility: 'Projects focused on the conservation of specific species; see eligibility on the fund’s website.',
    applyUrl: 'https://www.speciesconservation.org',
    location: 'International',
    country: 'AE',
  },
  {
    slug: 'conservation-leadership-programme-awards',
    section: 'funding',
    type: 'conservation-funding',
    title: 'Conservation Leadership Programme project awards',
    organisation: 'Conservation Leadership Programme',
    description: `Team awards and training for early-career conservationists working on globally threatened species and sites.\n\n${CHECK_SITE}`,
    eligibility: 'Early-career conservation teams in eligible countries.',
    applyUrl: 'https://www.conservationleadershipprogramme.org',
    location: 'International',
    country: 'GB',
  },
  {
    slug: 'national-geographic-society-grants',
    section: 'funding',
    type: 'research-grant',
    title: 'National Geographic Society grants',
    organisation: 'National Geographic Society',
    description: `Grants for research, conservation, education and storytelling projects, including fieldwork on freshwater biodiversity.\n\n${CHECK_SITE}`,
    eligibility: 'Open to applicants worldwide; criteria vary by programme.',
    applyUrl: 'https://www.nationalgeographic.org/explore/grants-investments',
    location: 'International',
    country: 'US',
  },
  {
    // Guidelines PDF checked 2026-11-25 (MoEF&CC, 2024).
    slug: 'npca-aquatic-ecosystems-scheme',
    section: 'funding',
    type: 'government-grant',
    title: 'National Plan for Conservation of Aquatic Ecosystems (NPCA)',
    organisation: 'Ministry of Environment, Forest and Climate Change',
    description: `Centrally sponsored scheme of the Government of India for the conservation and management of wetlands and lakes, implemented through state governments. The revised 2024 guidelines explain how projects are proposed, approved and funded.\n\n${CHECK_SITE}`,
    eligibility: 'Proposals are submitted by state/UT governments and their wetland authorities; researchers and NGOs usually take part through state-led projects.',
    applyUrl: 'https://moef.gov.in/uploads/2024/04/NPCA-guidelines-2024-Wetlands.pdf',
    location: 'India',
    country: 'IN',
  },
  {
    slug: 'anrf-research-grants',
    section: 'funding',
    type: 'government-grant',
    title: 'ANRF research grants (Anusandhan National Research Foundation)',
    organisation: 'Anusandhan National Research Foundation',
    description: `Government of India research funding schemes for researchers at Indian institutions (successor to SERB).\n\n${CHECK_SITE}`,
    eligibility: 'Researchers at recognised Indian institutions; see each scheme’s rules.',
    applyUrl: 'https://anrfonline.in',
    location: 'India',
    country: 'IN',
  },
  {
    slug: 'dst-inspire-fellowship',
    section: 'jobs',
    type: 'fellowship',
    title: 'DST INSPIRE Fellowship (doctoral)',
    organisation: 'Department of Science and Technology, Government of India',
    description: `Doctoral fellowship under the INSPIRE programme for students pursuing a PhD in science in India.\n\n${CHECK_SITE}`,
    eligibility: 'Students meeting the INSPIRE academic criteria; see the official portal.',
    applyUrl: 'https://online-inspire.gov.in',
    location: 'India',
    country: 'IN',
  },
  {
    slug: 'fulbright-nehru-fellowships',
    section: 'funding',
    type: 'fellowship',
    title: 'Fulbright-Nehru Fellowships',
    organisation: 'United States-India Educational Foundation (USIEF)',
    description: `Fellowships for Indian students, researchers and professionals to study, teach or do research in the United States.\n\n${CHECK_SITE}`,
    eligibility: 'Indian citizens; categories and criteria vary.',
    applyUrl: 'https://www.usief.org.in',
    location: 'India / United States',
    country: 'IN',
  },
  {
    slug: 'humboldt-research-fellowship',
    section: 'jobs',
    type: 'fellowship',
    title: 'Humboldt Research Fellowship',
    organisation: 'Alexander von Humboldt Foundation',
    description: `Postdoctoral and experienced-researcher fellowships for research stays at institutions in Germany, which hold major fish collections.\n\n${CHECK_SITE}`,
    eligibility: 'Researchers with a doctorate; see the foundation’s criteria.',
    applyUrl: 'https://www.humboldt-foundation.de/en/apply/sponsorship-programmes/humboldt-research-fellowship',
    location: 'Germany',
    country: 'DE',
  },
];

const PROJECTS = [
  {
    slug: 'mahseer-trust-conservation-programme',
    title: 'Mahseer conservation research and river protection',
    kind: 'project',
    summary: 'Research and advocacy for mahseer fishes (Tor and related genera) and the rivers they depend on.',
    description: 'The Mahseer Trust works with researchers and communities on the status, ecology and conservation of mahseer species across South and Southeast Asia, including the Western Ghats.\n\nSee the Trust’s project pages for current work.',
    institution: 'Mahseer Trust',
    region: 'South & Southeast Asia',
    focusSpecies: 'Mahseers (Tor spp.)',
    url: 'https://www.mahseertrust.org/projects',
  },
  {
    slug: 'shoal-freshwater-species-partnership',
    title: 'Shoal: partnership for threatened freshwater species',
    kind: 'initiative',
    summary: 'A global partnership that funds and coordinates action for the world’s most threatened freshwater species.',
    description: 'Shoal brings together conservation organisations, researchers and funders to prevent freshwater species extinctions, including fishes.',
    institution: 'Shoal',
    region: 'Global',
    focusSpecies: 'Threatened freshwater species',
    url: 'https://shoal.org',
  },
  {
    // Workshop page checked 2026-11-25.
    slug: 'community-fish-conservation-zones',
    title: 'Community-based fish conservation in free-flowing rivers',
    kind: 'initiative',
    summary: 'Research and practice on community-run fish conservation zones and similar local models for protecting river fishes in India.',
    description: 'A project led by the Indian Institute for Human Settlements (IIHS) with the Foundation for Ecological Research, Advocacy and Learning (FERAL) studies community-based approaches to protecting and managing free-flowing rivers and their fishes.\n\nA national workshop at IIHS, Bengaluru on 1 December 2023 brought together researchers, NGOs and conservation practitioners working on community fish conservation models across India.',
    institution: null,
    organisation: 'IIHS and FERAL',
    region: 'India',
    focusSpecies: 'River fishes, including mahseers',
    url: 'https://www.feralindia.org/events/conservation-freshwater-ecosystems-workshop-community-based-approaches-protection-and',
  },
  {
    slug: 'india-biodiversity-portal-citizen-science',
    title: 'India Biodiversity Portal observations',
    kind: 'citizen-programme',
    summary: 'Share and identify species observations, including freshwater fishes, on an open Indian biodiversity platform.',
    description: 'The India Biodiversity Portal lets anyone contribute species observations and checklists, building open distribution data for India.',
    institution: null,
    organisation: 'India Biodiversity Portal',
    region: 'India',
    focusSpecies: 'All taxa, including freshwater fishes',
    url: 'https://indiabiodiversity.org',
    howToJoin: 'Create a free account on the portal and upload observations with photographs and locations.',
  },
] as const;

/** Upcoming meetings, each confirmed on the organiser's page on 2026-11-24. */
const EVENTS = [
  {
    slug: 'jmih-2027-panama',
    title: 'Joint Meeting of Ichthyologists and Herpetologists (JMIH) 2027',
    kind: 'conference',
    startsOn: '2027-07-21',
    endsOn: '2027-07-25',
    venue: 'Westin Playa Bonita',
    city: 'Panama City',
    country: 'PA',
    organiser: 'ASIH, SSAR and partner societies',
    url: 'https://www.asih.org/meetings',
    description:
      'The annual joint meeting of the major North American societies for ichthyology and herpetology, with symposia, contributed talks and posters on all aspects of fish biology and systematics.\n\nOrganiser pages differ on the last day (ASIH lists 21–24 July, SSAR 21–25 July); check the official programme before booking.',
  },
  {
    slug: 'icfa-2027-bangkok',
    title: '14th International Conference on Fisheries and Aquaculture (ICFA 2027)',
    kind: 'conference',
    startsOn: '2027-09-16',
    endsOn: '2027-09-17',
    venue: null,
    city: 'Bangkok',
    country: 'TH',
    organiser: 'TIIKM',
    url: 'https://aquaconference.tiikm.com/',
    description: 'International conference on fisheries and aquaculture research, policy and practice, with an Asian focus.',
  },
  {
    slug: 'asian-pacific-aquaculture-2027',
    title: 'Asian-Pacific Aquaculture 2027',
    kind: 'conference',
    startsOn: '2027-09-07',
    endsOn: '2027-09-10',
    venue: null,
    city: 'Nha Trang',
    country: 'VN',
    organiser: 'World Aquaculture Society, Asian Pacific Chapter',
    url: 'https://was.org/Meeting/Code/APA2027',
    description: 'Regional aquaculture conference and trade show with scientific sessions, including fish biology and health.',
  },
  {
    slug: 'asi-2027-chiang-mai',
    title: 'Asian Society of Ichthyologists International Conference 2027',
    kind: 'conference',
    startsOn: '2027-11-03',
    endsOn: '2027-11-06',
    venue: 'Maejo University',
    city: 'Chiang Mai',
    country: 'TH',
    organiser: 'Asian Society of Ichthyologists',
    url: 'https://www.asi-fish.org/',
    description: 'International conference of the Asian Society of Ichthyologists on the diversity, systematics and biology of Asian fishes.',
  },
] as const;

/** External courses, details confirmed on the provider's page (2026-11-24). */
const EXTERNAL_COURSES = [
  {
    slug: 'usfws-fish-identification',
    title: 'Fish Identification (FWS-CSP2220)',
    summary: 'Hands-on, laboratory-intensive course developing fish identification skills, with field exercises providing fresh specimens.',
    description:
      'Run by the US Fish and Wildlife Service National Conservation Training Center. The regional fishes emphasised depend on the course location. Graduate credit is available through West Virginia University.',
    subject: 'identification',
    format: 'in-person',
    level: 'intermediate',
    provider: 'US Fish & Wildlife Service, National Conservation Training Center',
    url: 'https://www.fws.gov/course/fish-identification',
    duration: '38 hours',
    cost: 'US$2,190 tuition',
  },
  {
    slug: 'viu-identification-of-freshwater-fishes',
    title: 'Identification of Freshwater Fishes',
    summary: 'One- or two-day laboratory course using identification keys on preserved and live specimens of freshwater fishes.',
    description:
      'Practical introduction to identifying salmonid and non-salmonid freshwater fishes common to a province, including classification, voucher sampling, key design and use, and threatened species.',
    subject: 'identification',
    format: 'in-person',
    level: 'beginner',
    provider: 'Vancouver Island University, Natural Resource Extension',
    url: 'https://scitech.viu.ca/natural-resource-extension/identification-freshwater-fishes',
    duration: '1 or 2 days',
    cost: null,
  },
  {
    slug: 'amnh-diversity-of-fishes',
    title: 'The Diversity of Fishes',
    summary: 'Six-week online course exploring fish evolution, diversity and biogeography alongside museum scientists.',
    description: 'Part of the American Museum of Natural History’s Seminars on Science programme for educators.',
    subject: 'ichthyology',
    format: 'online',
    level: 'beginner',
    provider: 'American Museum of Natural History, Seminars on Science',
    url: 'https://www.amnh.org/learn-teach/seminars-on-science/courses/the-diversity-of-fishes',
    duration: '6 weeks',
    cost: null,
  },
] as const;

/**
 * Sample ichthyologist profiles, requested by the platform owner for development data.
 * Only well-established public facts (name, field, well-known affiliation) are used; everything else
 * is left blank. Publications are linked only when Crossref lists the person by exact family name and
 * given-name prefix. Profiles are marked isDemo, unverified, and have no account or contact email.
 */
const SAMPLE_BIO =
  'Sample profile for Indichthys development data, compiled from public publication records. It was not created, reviewed or verified by this person; details may be incomplete.';

interface SamplePerson {
  slug: string;
  fullName: string;
  honorific?: string;
  country: string;
  region?: string;
  city?: string;
  expertise: string[];
  affiliations: { institution: string; current: boolean }[];
  /** Crossref author match: exact family name, given name starting with one of these. */
  crossref?: { family: string; given: string[] };
  /** Profile text supplied by the person (replaces the generic sample note). */
  bio?: string;
  position?: string;
  researchGate?: string;
  interests?: string[];
  acceptingCollaboration?: boolean;
  /** Papers listed by the person themselves, resolved on Crossref by DOI. */
  dois?: string[];
  /** Works without a DOI (books, field guides). */
  works?: { title: string; authors: string; year: number; type: string; publisher?: string; url?: string }[];
}

const SAMPLE_PEOPLE: SamplePerson[] = [
  {
    slug: 'rajeev-raghavan',
    fullName: 'Rajeev Raghavan',
    honorific: 'Dr',
    country: 'IN',
    region: 'Kerala',
    city: 'Kochi',
    expertise: ['taxonomy', 'conservation', 'western-ghats', 'hillstream-loaches'],
    affiliations: [{ institution: 'Kerala University of Fisheries and Ocean Studies', current: true }],
    crossref: { family: 'Raghavan', given: ['rajeev'] },
  },
  {
    slug: 'jd-marcus-knight',
    fullName: 'J.D. Marcus Knight',
    country: 'IN',
    region: 'Tamil Nadu',
    city: 'Chennai',
    expertise: ['taxonomy', 'western-ghats', 'anabantiformes', 'cypriniformes', 'invasive-species'],
    affiliations: [],
    crossref: { family: 'Knight', given: ['j.d. marcus', 'j. d. marcus', 'john daniel marcus', 'jd marcus', 'j.d.m.'] },
  },
  {
    slug: 'helen-larson',
    fullName: 'Helen K. Larson',
    honorific: 'Dr',
    country: 'AU',
    expertise: ['taxonomy', 'gobies'],
    affiliations: [{ institution: 'Museum and Art Gallery of the Northern Territory', current: false }],
    crossref: { family: 'Larson', given: ['helen'] },
  },
  { slug: 'balaji-vijayakumar', fullName: 'Balaji Vijayakumar', country: 'IN', expertise: [], affiliations: [] },
  {
    // From his research portfolio (Aravind G, publishes as Aravind Manoj), supplied by the platform owner.
    slug: 'aravind-manoj',
    fullName: 'Aravind Manoj',
    position: 'Independent ichthyological researcher & conservation photographer',
    country: 'IN',
    region: 'Tamil Nadu',
    bio: [
      'Independent ichthyological researcher, biodiversity surveyor and conservation photographer based in Tamil Nadu (Aravind G; publishes as Aravind Manoj). His work covers the biodiversity, taxonomy, ecology and conservation of freshwater fishes, with emphasis on poorly documented and endemic species of South India and the Western Ghats, including hill-stream balitorids (Travancoria, Bhavania) and gobioid fishes (Mugilogobius, Mangarinus).',
      'Over six years of fieldwork he has documented more than 200 freshwater fish species, with freshwater fish surveys in Maredumilli and Upper Sileru (Andhra Pradesh), Ariyalur, Siruseri and Sirumalai (Tamil Nadu). He is co-author of the photographic field guide Fishes of Chennai and received the Melvin Selvan Memorial Award (EWET) for work on identifying and protecting native fishes.',
      'Open to collaboration on freshwater fish surveys, taxonomic and species-documentation projects, Western Ghats hill-stream research, conservation assessments, photographic documentation for publications, field guides and citizen science.',
    ].join('\n\n'),
    researchGate: 'https://www.researchgate.net/profile/Aravind-Manoj-3',
    interests: ['Freshwater fish biodiversity', 'Endemic species', 'Gobioid fishes', 'Non-native fishes', 'Scientific photography', 'Citizen science'],
    acceptingCollaboration: true,
    expertise: ['taxonomy', 'ecology', 'conservation', 'invasive-species', 'field-surveys', 'fish-photography', 'gobies', 'hillstream-loaches', 'western-ghats', 'sri-lanka'],
    affiliations: [],
    dois: ['10.59120/drj.v17i3.627', '10.1017/s0025315424000316', '10.47605/tapro.v11i1.279'],
    works: [
      { title: 'Fishes of Chennai: A Comprehensive Visual Field Guide', authors: 'Aravind Manoj, Beta Mahatvaraj', year: 2026, type: 'field-guide' },
    ],
  },
];

const authorMatches = (w: CrossrefWork, m: { family: string; given: string[] }) =>
  (w.author ?? []).some(
    (a) => a.family?.toLowerCase() === m.family.toLowerCase() && m.given.some((g) => (a.given ?? '').toLowerCase().replace(/\s+/g, ' ').startsWith(g)),
  );

/** A person's fish papers on Crossref (exact author match). */
async function personWorks(m: { family: string; given: string[] }): Promise<Candidate[]> {
  const out = new Map<string, Candidate>();
  for (const given of [m.given[0]!]) {
    const url = `https://api.crossref.org/works?query.author=${encodeURIComponent(`${given} ${m.family}`)}&query.bibliographic=fish&filter=type:journal-article&rows=40&select=DOI,title,author,container-title,volume,issue,page,publisher,issued,published`;
    const res = await getJson<{ message: { items: CrossrefWork[] } }>(url);
    for (const work of res?.message.items ?? []) {
      const title = cleanTitle(work.title?.[0] ?? '');
      if (!title || !authorMatches(work, m) || NOTICE.test(title) || OFF_TOPIC.test(title)) continue;
      out.set(work.DOI.toLowerCase(), { work, title, date: issuedDate(work) });
    }
  }
  return [...out.values()];
}

// ═══════════════ Crossref publications ═══════════════

/** Individually chosen papers (verified on Crossref). */
const FEATURED_DOIS = ['10.1016/j.scitotenv.2025.180695'];

/** News written in our own words about verified items; figures are only included when checked against the source. */
const CURATED_NEWS = [
  {
    slug: 'data-science-assessment-indian-freshwater-fishes-2025',
    title: 'Data science used to assess native Indian freshwater fishes and their conservation status',
    summary: 'A 2025 study in Science of the Total Environment by Sahu, Das Sarkar & Naskar applies data-science methods to India’s native freshwater fish taxa.',
    body: [
      'Sahu SK, Das Sarkar S, Naskar M (2025). Utilizing data science to assess native Indian freshwater fish taxa and their conservation status. Science of the Total Environment 1003: 180695.',
      'The authors use data-science and machine-learning methods to compile and analyse records of native Indian freshwater fishes, including trends in species discovery and their threat status.',
      'Read the paper: https://doi.org/10.1016/j.scitotenv.2025.180695',
    ].join('\n\n'),
    category: 'research',
    sourceUrl: 'https://doi.org/10.1016/j.scitotenv.2025.180695',
    publishedAt: new Date('2025-11-01T00:00:00Z'),
  },
];

const QUERIES = [
  'new species Garra India',
  'new species Schistura India',
  'new species Pethia India',
  'Glyptothorax new species India',
  'Channa new species India',
  'Mystus new species India',
  'Badis new species India',
  'Indoreonectes new species',
  'Puntius revision South Asia',
  'Devario new species India',
  'Dawkinsia new species',
  'Tor mahseer taxonomy',
  'Balitoridae Western Ghats',
  'Nemacheilidae new species northeast India',
  'Exostoma new species India',
  'Danio new species India',
  'Garra new species Western Ghats',
  'freshwater fishes checklist Western Ghats',
];

const FISH_WORDS = /\b(teleostei|actinopterygii|cyprinidae|danionidae|nemacheilidae|balitoridae|sisoridae|bagridae|channidae|badidae|siluriformes|cypriniformes|fish|fishes|loach|catfish|snakehead|barb|danio|mahseer|garra|schistura|pethia|puntius|glyptothorax|channa|mystus|badis|devario|dawkinsia|indoreonectes|exostoma|tor)\b/i;
const OFF_TOPIC = /\b(parasit\w*|infect\w*|nematod\w*|procamallanus|trematod\w*|gyrodactylus|helminth\w*|monogenea\w*|crab|cercariae|plant|length[- ]weight|breeding|aquaculture|diet|culture)\b/i;
/** Notices rather than papers. */
const NOTICE = /^(erratum|corrigendum|correction|retraction)\b/i;
/** Same paper under two DOIs (e.g. a translated edition): compare normalised titles. */
const titleKey = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '');
const REGION = /\b(india|indian|sri lanka|bangladesh|nepal|bhutan|western ghats|himalaya\w*|meghalaya|manipur|mizoram|nagaland|assam|arunachal|sikkim|kerala|karnataka|tamil nadu|maharashtra|goa|west bengal|odisha|brahmaputra|ganga|gangetic|godavari|krishna|cauvery|narmada|barak|chindwin)\b/i;


async function collectPublications(): Promise<Candidate[]> {
  const byDoi = new Map<string, Candidate>();
  const seenTitles = new Set<string>();
  for (const q of QUERIES) {
    const url = `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(q)}&filter=type:journal-article,from-pub-date:2012&rows=12&select=DOI,title,author,container-title,volume,issue,page,publisher,issued,published`;
    const res = await getJson<{ message: { items: CrossrefWork[] } }>(url);
    let kept = 0;
    for (const work of res?.message.items ?? []) {
      const title = cleanTitle(work.title?.[0] ?? '');
      if (!title || !work.author?.length) continue;
      if (!FISH_WORDS.test(title) || OFF_TOPIC.test(title) || NOTICE.test(title) || !TAXONOMIC.test(title) || !REGION.test(title)) continue;
      const doi = work.DOI.toLowerCase();
      if (seenTitles.has(titleKey(title))) continue;
      seenTitles.add(titleKey(title));
      if (!byDoi.has(doi)) {
        byDoi.set(doi, { work, title, date: issuedDate(work) });
        kept++;
      }
    }
    console.log(`  crossref "${q}": kept ${kept}`);
    await sleep(300);
  }
  return [...byDoi.values()];
}


async function importPeople(areas: Map<string, number>) {
  for (const p of SAMPLE_PEOPLE) {
    const works = p.crossref ? await personWorks(p.crossref) : [];
    for (const doi of p.dois ?? []) {
      const res = await getJson<{ message: CrossrefWork }>(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
      if (res && !works.some((w) => w.work.DOI.toLowerCase() === doi)) works.push({ work: res.message, title: cleanTitle(res.message.title?.[0] ?? ''), date: issuedDate(res.message) });
    }
    if (DRY_RUN) {
      console.log(`  person ${p.fullName}: ${works.length + (p.works?.length ?? 0)} papers`);
      continue;
    }
    const data = {
      fullName: p.fullName,
      honorific: p.honorific ?? null,
      country: p.country,
      region: p.region ?? null,
      city: p.city ?? null,
      bio: p.bio ?? SAMPLE_BIO,
      position: p.position ?? null,
      researchGate: p.researchGate ?? null,
      isDemo: true,
      isPublic: true,
      acceptingCollaboration: p.acceptingCollaboration ?? false,
      acceptingStudents: false,
      verificationStatus: 'unverified',
    };
    const profile = await db.ichthyologist.upsert({ where: { slug: p.slug }, update: data, create: { slug: p.slug, ...data } });
    const areaIds = p.expertise.map((e) => areas.get(e)).filter((x): x is number => x != null);
    await db.profileExpertise.deleteMany({ where: { profileId: profile.id } });
    await db.profileExpertise.createMany({ data: areaIds.map((areaId) => ({ profileId: profile.id, areaId })) });
    await db.affiliation.deleteMany({ where: { profileId: profile.id } });
    for (const a of p.affiliations) {
      const inst = await db.institution.findFirst({ where: { name: a.institution }, select: { id: true } });
      if (inst) await db.affiliation.create({ data: { profileId: profile.id, institutionId: inst.id, isCurrent: a.current } });
    }
    await db.researchInterest.deleteMany({ where: { profileId: profile.id } });
    await db.researchInterest.createMany({ data: (p.interests ?? []).map((label) => ({ profileId: profile.id, label })) });
    const link = (publicationId: number, profileId: number) =>
      db.publicationAuthor.upsert({ where: { publicationId_profileId: { publicationId, profileId } }, update: {}, create: { publicationId, profileId } });
    let linked = 0;
    for (const c of works) {
      const r = await upsertPublication(db, c, areas, DRY_RUN);
      if (!r) continue;
      await link(r.id, profile.id);
      linked++;
      // Co-authors who also have a sample profile (e.g. Larson and Knight on Aravind Manoj's papers).
      for (const q of SAMPLE_PEOPLE) {
        if (q === p || !q.crossref || !authorMatches(c.work, q.crossref)) continue;
        const other = await db.ichthyologist.findUnique({ where: { slug: q.slug }, select: { id: true } });
        if (other) await link(r.id, other.id);
      }
    }
    for (const w of p.works ?? []) {
      const data = { title: w.title, authors: w.authors, year: w.year, type: w.type, publisher: w.publisher ?? null, url: w.url ?? null };
      const existing = await db.publication.findFirst({ where: { title: w.title, doi: null }, select: { id: true } });
      const pub = existing ? await db.publication.update({ where: { id: existing.id }, data }) : await db.publication.create({ data });
      await link(pub.id, profile.id);
      linked++;
    }
    console.log(`  person ${p.fullName}: ${linked} publications linked`);
    await sleep(300);
  }
}

// ═══════════════ Import ═══════════════

async function main() {
  console.log(DRY_RUN ? 'DRY RUN: nothing will be written.' : 'Importing sample data…');

  // Institutions
  const institutionId = new Map<string, number>();
  for (const inst of INSTITUTIONS) {
    if (DRY_RUN) continue;
    const row = await db.institution.upsert({
      where: { name_country: { name: inst.name, country: inst.country } },
      update: { type: inst.type, city: inst.city, region: inst.region, website: inst.website, description: inst.description },
      create: { ...inst },
    });
    institutionId.set(inst.name, row.id);
  }
  console.log(`Institutions: ${INSTITUTIONS.length}`);

  // Funding & fellowships
  for (const o of OPPORTUNITIES) {
    if (DRY_RUN) continue;
    const institution = await db.institution.findFirst({ where: { name: o.organisation }, select: { id: true } });
    const data = {
      section: o.section,
      type: o.type,
      title: o.title,
      organisation: o.organisation,
      institutionId: institution?.id ?? null,
      description: o.description,
      eligibility: o.eligibility,
      location: o.location ?? null,
      country: o.country ?? 'IN',
      isRemote: o.isRemote ?? false,
      deadline: null,
      applyUrl: o.applyUrl,
      status: 'published',
    };
    await db.opportunity.upsert({ where: { slug: o.slug }, update: data, create: { slug: o.slug, ...data } });
  }
  console.log(`Funding & fellowship programmes: ${OPPORTUNITIES.length}`);

  // Conservation projects
  for (const p of PROJECTS) {
    if (DRY_RUN) continue;
    const { slug, institution, ...rest } = p;
    const data = {
      ...rest,
      institutionId: institution ? (institutionId.get(institution) ?? null) : null,
      organisation: 'organisation' in p ? p.organisation : institution,
      projectStatus: 'ongoing',
      status: 'published',
    };
    await db.conservationProject.upsert({ where: { slug }, update: data, create: { slug, ...data } });
  }
  console.log(`Conservation projects: ${PROJECTS.length}`);

  // Events
  for (const e of EVENTS) {
    if (DRY_RUN) continue;
    const { slug, startsOn, endsOn, ...rest } = e;
    const data = { ...rest, startsOn: new Date(startsOn), endsOn: new Date(endsOn), isOnline: false, status: 'published' };
    await db.event.upsert({ where: { slug }, update: data, create: { slug, ...data } });
  }
  console.log(`Events: ${EVENTS.length}`);

  // External courses
  for (const c of EXTERNAL_COURSES) {
    if (DRY_RUN) continue;
    const { slug, ...rest } = c;
    const data = { ...rest, kind: 'external', status: 'published' };
    await db.course.upsert({ where: { slug }, update: data, create: { slug, ...data } });
  }
  console.log(`External courses: ${EXTERNAL_COURSES.length}`);

  // Publications
  const candidates = await collectPublications();
  const areas = new Map((await db.expertiseArea.findMany({ select: { id: true, slug: true } })).map((a) => [a.slug, a.id]));
  let added = 0;
  const imported: { id: number; candidate: Candidate; type: string }[] = [];
  for (const c of candidates) {
    const r = await upsertPublication(db, c, areas, DRY_RUN);
    if (r?.created) added++;
    if (r) imported.push({ id: r.id, candidate: c, type: r.type });
  }
  console.log(`Publications: ${candidates.length} found, ${added} new`);
  for (const doi of FEATURED_DOIS) {
    const res = await getJson<{ message: CrossrefWork }>(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
    if (res) await upsertPublication(db, { work: res.message, title: cleanTitle(res.message.title?.[0] ?? ''), date: issuedDate(res.message) }, areas, DRY_RUN);
  }
  for (const n of CURATED_NEWS) {
    if (DRY_RUN) continue;
    const { slug, ...data } = n;
    await db.newsPost.upsert({ where: { slug }, update: { ...data, status: 'published' }, create: { slug, ...data, status: 'published' } });
  }
  console.log(`Featured papers: ${FEATURED_DOIS.length}; curated news: ${CURATED_NEWS.length}`);

  // Sample ichthyologists (after publications, so shared papers are linked too)
  console.log('Ichthyologists:');
  await importPeople(areas);

  // News: newest species descriptions & revisions, generated from their citations.
  const recent = imported
    .filter((i) => i.type !== 'article' && i.candidate.date)
    .sort((a, b) => b.candidate.date!.getTime() - a.candidate.date!.getTime())
    .slice(0, 10);
  for (const { candidate: c, type } of recent) {
    if (DRY_RUN) continue;
    const w = c.work;
    const authors = authorList(w);
    const firstAuthor = authors.split(', ')[0] ?? 'The authors';
    const etAl = (w.author?.length ?? 0) > 2 ? ' et al.' : (w.author?.length ?? 0) === 2 ? ` & ${authors.split(', ')[1]}` : '';
    const journal = w['container-title']?.[0] ?? 'a journal';
    const year = c.date!.getUTCFullYear();
    const slug = `paper-${w.DOI.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`.slice(0, 80);
    const data = {
      title: c.title.length > 200 ? `${c.title.slice(0, 197)}…` : c.title,
      summary: `${type === 'species-description' ? 'New species described' : 'Taxonomic update'} in ${journal} (${year}) by ${firstAuthor}${etAl}.`.replace(/\.\.$/, '.'),
      body: [
        `${authors} (${year}). ${c.title}. ${journal}${w.volume ? ` ${w.volume}` : ''}${w.issue ? `(${w.issue})` : ''}${w.page ? `: ${w.page}` : ''}.`,
        `Read the paper: https://doi.org/${w.DOI}`,
        'This news item was generated automatically from the publication’s Crossref record and is also listed in the Indichthys publications repository.',
      ].join('\n\n'),
      category: type === 'species-description' ? 'new-species' : 'taxonomic-update',
      sourceUrl: `https://doi.org/${w.DOI}`,
      status: 'published',
      publishedAt: c.date!,
    };
    await db.newsPost.upsert({ where: { slug }, update: data, create: { slug, ...data } });
  }
  console.log(`News posts: ${recent.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
