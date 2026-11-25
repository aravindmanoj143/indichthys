/**
 * Homepage photos: all by Aravind Manoj (iNaturalist user "aravindmanoj"), all rights reserved, used here
 * by the photographer. Files live in public/images/fish (resized from the originals on 2026-11-25).
 * Each links back to its iNaturalist observation.
 */
export const PHOTO_CREDIT = '© Aravind Manoj';

export interface Photo {
  /** Path under public/ (relative, so it works under any base href). */
  src: string;
  /** iNaturalist observation id. */
  observation: number;
}

const img = (file: string) => `images/fish/${file}`;
export const observationUrl = (id: number) => `https://www.inaturalist.org/observations/${id}`;

export interface HeroSlide {
  eyebrow: string;
  /** Lucide icon name (registered in home.ts). */
  icon: string;
  title: string;
  text: string;
  cta: string;
  link: string;
  species: string;
  photo: Photo;
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    eyebrow: 'Explore',
    icon: 'lucideCompass',
    title: 'India’s freshwater fishes, in one place',
    text: 'Browse the classification, species profiles, distributions and Red List status of fishes across India.',
    cta: 'Explore species',
    link: '/taxonomy',
    species: 'Danio rerio',
    photo: { src: img('danio-rerio-hero.jpg'), observation: 125288735 },
  },
  {
    eyebrow: 'Identify',
    icon: 'lucideScanSearch',
    title: 'What fish is that?',
    text: 'Work through interactive keys and regional guides, or ask the community to identify your photo.',
    cta: 'Identify a fish',
    link: '/identification',
    species: 'Haludaria fasciata',
    photo: { src: img('haludaria-fasciata-hero.jpg'), observation: 143624504 },
  },
  {
    eyebrow: 'Fieldwork',
    icon: 'lucideMapPin',
    title: 'Record the fishes you find',
    text: 'Add an observation with a photo and a location. Every record helps map where species live.',
    cta: 'Add an observation',
    link: '/observations/new',
    species: 'Garra kalakadensis',
    photo: { src: img('garra-kalakadensis.jpg'), observation: 125289673 },
  },
  {
    eyebrow: 'Conservation',
    icon: 'lucideShieldCheck',
    title: 'Protect the fishes of the Western Ghats',
    text: 'Threatened species, conservation projects and government schemes for India’s freshwater fishes.',
    cta: 'See conservation',
    link: '/conservation',
    species: 'Ghatsa montana',
    photo: { src: img('ghatsa-montana-hero.jpg'), observation: 270738088 },
  },
  {
    eyebrow: 'Research',
    icon: 'lucideBookOpen',
    title: 'Papers, people and collections',
    text: 'Publications, ichthyologists and museum specimens for anyone studying South Asian fishes.',
    cta: 'Browse publications',
    link: '/publications',
    species: 'Glyptothorax davissinghi',
    photo: { src: img('glyptothorax-davissinghi-hero.jpg'), observation: 269089240 },
  },
];

export interface FeaturedFish {
  /** GBIF Backbone key (links to /taxonomy/species/:key). */
  key: number;
  name: string;
  /** Common name, '' when none is in use. */
  common: string;
  about: string;
  photo: Photo;
}

/** Rotates through this list: one fish per ISO week and one per calendar month. */
export const FEATURED_FISH: FeaturedFish[] = [
  {
    key: 9357826,
    name: 'Ghatsa montana',
    common: 'Anamalai loach',
    about: 'A hillstream loach of the southern Western Ghats. Its flattened body and wide, sucker-like paired fins let it cling to rocks in fast, cold torrents.',
    photo: { src: img('ghatsa-montana.jpg'), observation: 270738088 },
  },
  {
    key: 7784174,
    name: 'Haludaria fasciata',
    common: 'Ember barb, melon barb',
    about: 'A Western Ghats barb with dark bars across an orange-red body. Its colours vary a lot from one river to the next.',
    photo: { src: img('haludaria-fasciata.jpg'), observation: 143624504 },
  },
  {
    key: 2341315,
    name: 'Glyptothorax davissinghi',
    common: '',
    about: 'A torrent catfish of the Western Ghats. Like other Glyptothorax, it has a ridged adhesive pad on its chest that helps it hold on to rocks in fast water.',
    photo: { src: img('glyptothorax-davissinghi.jpg'), observation: 269089240 },
  },
  {
    key: 9797255,
    name: 'Danio rerio',
    common: 'Zebrafish',
    about: 'Native to streams and paddy fields of eastern India and its neighbours, the zebrafish is now one of the most important animals in genetics and medical research.',
    photo: { src: img('danio-rerio.jpg'), observation: 125288735 },
  },
  {
    key: 2358116,
    name: 'Travancoria jonesi',
    common: '',
    about: 'A flattened hillstream loach found only in the southern Western Ghats, where it lives on rocks in clear, fast-flowing streams.',
    photo: { src: img('travancoria-jonesi.jpg'), observation: 163070533 },
  },
  {
    key: 9690607,
    name: 'Horadandia brittani',
    common: 'Dwarf fire rasbora',
    about: 'One of India’s smallest fishes, about 2 cm long, with a glowing orange stripe. It lives among plants in slow streams and ponds near the south-west coast.',
    photo: { src: img('horadandia-brittani.jpg'), observation: 151614834 },
  },
  {
    key: 2366789,
    name: 'Garra kalakadensis',
    common: '',
    about: 'A garra from hill streams at the southern tip of the Western Ghats. A sucker-like disc under its mouth lets it graze algae off rocks in moving water.',
    photo: { src: img('garra-kalakadensis.jpg'), observation: 125289673 },
  },
  {
    key: 5961312,
    name: 'Pseudolaguvia austrina',
    common: '',
    about: 'A tiny sisorid catfish of the southern Western Ghats. Pseudolaguvia are among the smallest catfishes in South Asia and hide among gravel and leaf litter in streams.',
    photo: { src: img('pseudolaguvia-austrina.jpg'), observation: 263035717 },
  },
  {
    key: 2394090,
    name: 'Pseudosphromenus dayi',
    common: 'Brown spiketail gourami',
    about: 'A small gourami of the south-western lowlands with a pointed, spiky tail. Males build bubble nests at the surface and guard the eggs.',
    photo: { src: img('pseudosphromenus-dayi.jpg'), observation: 68627503 },
  },
  {
    key: 2377840,
    name: 'Mangarinus waterousi',
    common: '',
    about: 'A small, colourful goby of mangroves and tidal creeks. Males show bright blue and red fins.',
    photo: { src: img('mangarinus-waterousi.jpg'), observation: 134684198 },
  },
  {
    key: 2363303,
    name: 'Opsarius gatensis',
    common: 'Malabar baril',
    about: 'A fast-water fish of Western Ghats streams, silver with rows of blue-grey bars along its sides. It feeds on insects in riffles and pools.',
    photo: { src: img('opsarius-gatensis.jpg'), observation: 263035421 },
  },
  {
    key: 7741827,
    name: 'Dawkinsia filamentosa',
    common: 'Filament barb',
    about: 'A barb of southern India with a dark blotch near the tail. Adult males grow long filaments from the dorsal fin.',
    photo: { src: img('dawkinsia-filamentosa.jpg'), observation: 142581891 },
  },
  {
    key: 2364598,
    name: 'Esomus thermoicos',
    common: 'South Indian flying barb',
    about: 'A slender barb of southern India with very long barbels and large, wing-like pectoral fins, which give flying barbs their name.',
    photo: { src: img('esomus-thermoicos.jpg'), observation: 141972857 },
  },
  {
    key: 2372834,
    name: 'Etroplus suratensis',
    common: 'Pearlspot, green chromide (karimeen)',
    about: 'A cichlid of coastal lagoons and backwaters that thrives in fresh and brackish water. It is the state fish of Kerala.',
    photo: { src: img('etroplus-suratensis.jpg'), observation: 64056136 },
  },
  {
    key: 2337824,
    name: 'Wallago attu',
    common: 'Wallago',
    about: 'One of the largest freshwater catfishes in South Asia, with a huge mouth and long barbels. It is a fast, powerful predator of rivers and reservoirs.',
    photo: { src: img('wallago-attu.jpg'), observation: 68627238 },
  },
  {
    key: 5202584,
    name: 'Pachypterus atherinoides',
    common: 'Indian potasi',
    about: 'A small, see-through schooling catfish with dark stripes along its body, found in rivers and floodplains across India.',
    photo: { src: img('pachypterus-atherinoides.jpg'), observation: 151714488 },
  },
  {
    key: 2347854,
    name: 'Aplocheilus lineatus',
    common: 'Striped panchax',
    about: 'A killifish that cruises just under the surface of ponds, ditches and paddy fields, picking off mosquito larvae and other insects.',
    photo: { src: img('aplocheilus-lineatus.jpg'), observation: 125290305 },
  },
  {
    key: 2391490,
    name: 'Channa punctata',
    common: 'Spotted snakehead',
    about: 'A small snakehead common in ponds, canals and paddy fields across India. It breathes air and survives in shallow, oxygen-poor water.',
    photo: { src: img('channa-punctata.jpg'), observation: 125288869 },
  },
  {
    key: 2363872,
    name: 'Systomus sarana',
    common: 'Olive barb',
    about: 'A silvery-olive barb with reddish fins, widespread in rivers, lakes and reservoirs, and caught for food.',
    photo: { src: img('systomus-sarana.jpg'), observation: 87722130 },
  },
  {
    key: 2363965,
    name: 'Puntius sophore',
    common: 'Pool barb',
    about: 'One of the commonest small barbs of the plains, with black spots at the base of the tail and on the dorsal fin. It lives in ponds, canals and slow rivers.',
    photo: { src: img('puntius-sophore.jpg'), observation: 63895800 },
  },
  {
    key: 2376882,
    name: 'Mugilogobius tigrinus',
    common: 'Tiger dwarf goby',
    about: 'A tiny goby of mangroves and brackish pools, banded like a tiger.',
    photo: { src: img('mugilogobius-tigrinus.jpg'), observation: 145017367 },
  },
];

/** ISO-8601 week number and its year. */
export function isoWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return { year: d.getUTCFullYear(), week: Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7) };
}

/** Fish of the month and fish of the week for a date (never the same species). */
export function featuredFor(date: Date, pool: readonly FeaturedFish[] = FEATURED_FISH): { month: FeaturedFish; week: FeaturedFish } {
  const month = pool[(date.getFullYear() * 12 + date.getMonth()) % pool.length]!;
  // Pick the week's fish from the rest of the pool, so consecutive weeks within a month always differ.
  const rest = pool.filter((f) => f !== month);
  const { year, week } = isoWeek(date);
  return { month, week: rest[(year * 53 + week) % rest.length]! };
}
