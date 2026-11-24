/** Subset of GBIF API v1 response shapes used by the taxonomy module. */

export interface GbifPage<T> {
  offset: number;
  limit: number;
  endOfRecords: boolean;
  count?: number;
  results: T[];
}

export type GbifRank =
  | 'KINGDOM'
  | 'PHYLUM'
  | 'CLASS'
  | 'ORDER'
  | 'FAMILY'
  | 'SUBFAMILY'
  | 'GENUS'
  | 'SUBGENUS'
  | 'SPECIES'
  | 'SUBSPECIES'
  | 'VARIETY'
  | 'UNRANKED'
  | string;

export type GbifThreatStatus =
  | 'EXTINCT'
  | 'EXTINCT_IN_THE_WILD'
  | 'CRITICALLY_ENDANGERED'
  | 'ENDANGERED'
  | 'VULNERABLE'
  | 'NEAR_THREATENED'
  | 'LEAST_CONCERN'
  | 'DATA_DEFICIENT'
  | 'NOT_EVALUATED';

export interface GbifNameUsage {
  key: number;
  scientificName: string;
  canonicalName?: string;
  authorship?: string;
  rank: GbifRank;
  taxonomicStatus?: string;
  kingdom?: string;
  phylum?: string;
  order?: string;
  family?: string;
  genus?: string;
  species?: string;
  orderKey?: number;
  familyKey?: number;
  genusKey?: number;
  speciesKey?: number;
  parentKey?: number;
  parent?: string;
  acceptedKey?: number;
  accepted?: string;
  basionymKey?: number;
  basionym?: string;
  publishedIn?: string;
  numDescendants?: number;
  habitats?: string[];
  threatStatuses?: GbifThreatStatus[];
  /** Present on /species/{key}. */
  vernacularName?: string;
  /** Present on /species/search results. */
  vernacularNames?: { vernacularName: string; language?: string }[];
}

export interface GbifVernacularName {
  vernacularName: string;
  language?: string;
  source?: string;
}

export interface GbifDistribution {
  locationId?: string;
  locality?: string;
  country?: string;
  status?: string;
  establishmentMeans?: string;
  threatStatus?: GbifThreatStatus;
  source?: string;
}

export interface GbifReference {
  citation: string;
  doi?: string;
  link?: string;
  source?: string;
}

export interface GbifIucnCategory {
  category: GbifThreatStatus;
  code: string;
}

export interface GbifFacetCount {
  name: string;
  count: number;
}

export interface GbifOccurrenceFacetResponse {
  count: number;
  facets: { field: string; counts: GbifFacetCount[] }[];
}

/** IUCN categories, ordered most to least severe, with GBIF enum ↔ code. */
export const IUCN: readonly { status: GbifThreatStatus; code: string; label: string }[] = [
  { status: 'EXTINCT', code: 'EX', label: 'Extinct' },
  { status: 'EXTINCT_IN_THE_WILD', code: 'EW', label: 'Extinct in the Wild' },
  { status: 'CRITICALLY_ENDANGERED', code: 'CR', label: 'Critically Endangered' },
  { status: 'ENDANGERED', code: 'EN', label: 'Endangered' },
  { status: 'VULNERABLE', code: 'VU', label: 'Vulnerable' },
  { status: 'NEAR_THREATENED', code: 'NT', label: 'Near Threatened' },
  { status: 'LEAST_CONCERN', code: 'LC', label: 'Least Concern' },
  { status: 'DATA_DEFICIENT', code: 'DD', label: 'Data Deficient' },
  { status: 'NOT_EVALUATED', code: 'NE', label: 'Not Evaluated' },
];

export const THREATENED: readonly GbifThreatStatus[] = [
  'CRITICALLY_ENDANGERED',
  'ENDANGERED',
  'VULNERABLE',
];
