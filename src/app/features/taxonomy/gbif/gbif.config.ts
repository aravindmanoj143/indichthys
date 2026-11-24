/** GBIF API v1 (public, read-only endpoints; no authentication needed). */
export const GBIF_API = 'https://api.gbif.org/v1';
export const GBIF_WEB = 'https://www.gbif.org';

/** The GBIF Backbone Taxonomy dataset. */
export const GBIF_BACKBONE_KEY = 'd7dddbf4-2cf0-4f39-9b2a-bb099caae36c';

/** Country the platform focuses on (ISO 3166-1 alpha-2). */
export const FOCUS_COUNTRY = { code: 'IN', name: 'India' } as const;

/**
 * Fish orders in the GBIF Backbone. The backbone places fish orders directly
 * under Chordata (no class rank), so the module is scoped by this list.
 * Keys were resolved with /species/match?rank=ORDER. Some modern orders
 * (e.g. Anabantiformes, Cichliformes, Gobiiformes) don't exist in the
 * backbone; their families sit under Perciformes there.
 */
export const FISH_ORDERS: readonly { key: number; name: string }[] = [
  { key: 1103, name: 'Acipenseriformes' },
  { key: 494, name: 'Amiiformes' },
  { key: 495, name: 'Anguilliformes' },
  { key: 496, name: 'Atheriniformes' },
  { key: 498, name: 'Beloniformes' },
  { key: 887, name: 'Carcharhiniformes' },
  { key: 879, name: 'Ceratodontiformes' },
  { key: 537, name: 'Characiformes' },
  { key: 538, name: 'Clupeiformes' },
  { key: 1153, name: 'Cypriniformes' },
  { key: 547, name: 'Cyprinodontiformes' },
  { key: 1162, name: 'Elopiformes' },
  { key: 548, name: 'Esociformes' },
  { key: 549, name: 'Gadiformes' },
  { key: 550, name: 'Gasterosteiformes' },
  { key: 1164, name: 'Gonorynchiformes' },
  { key: 1165, name: 'Gymnotiformes' },
  { key: 1167, name: 'Lepisosteiformes' },
  { key: 1067, name: 'Mugiliformes' },
  { key: 8214029, name: 'Myliobatiformes' },
  { key: 1068, name: 'Osmeriformes' },
  { key: 1069, name: 'Osteoglossiformes' },
  { key: 587, name: 'Perciformes' },
  { key: 1310, name: 'Percopsiformes' },
  { key: 771, name: 'Petromyzontiformes' },
  { key: 588, name: 'Pleuronectiformes' },
  { key: 1311, name: 'Polypteriformes' },
  { key: 1313, name: 'Salmoniformes' },
  { key: 590, name: 'Scorpaeniformes' },
  { key: 708, name: 'Siluriformes' },
  { key: 889, name: 'Synbranchiformes' },
  { key: 773, name: 'Syngnathiformes' },
  { key: 772, name: 'Tetraodontiformes' },
];

export const FISH_ORDER_KEYS = FISH_ORDERS.map((o) => o.key);
