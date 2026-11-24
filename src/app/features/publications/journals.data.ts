/** Key journals for fish taxonomy and freshwater ichthyology. Links checked 2026-11-24. */
export interface JournalInfo {
  name: string;
  publisher: string;
  focus: string;
  url: string;
  openAccess: boolean;
}

export const KEY_JOURNALS: JournalInfo[] = [
  { name: 'Zootaxa', publisher: 'Magnolia Press', focus: 'Animal taxonomy, including many new fish species descriptions and revisions.', url: 'https://mapress.com/zt/', openAccess: false },
  { name: 'Ichthyological Exploration of Freshwaters', publisher: 'Verlag Dr. Friedrich Pfeil', focus: 'Taxonomy, systematics and biogeography of freshwater fishes.', url: 'https://pfeil-verlag.de/publikationen/ichthyological-exploration-of-freshwaters-uebersicht/', openAccess: false },
  { name: 'Journal of Threatened Taxa', publisher: 'Wildlife Information Liaison Development Society', focus: 'Conservation, taxonomy and natural history, with a strong South Asian focus.', url: 'https://threatenedtaxa.org/', openAccess: true },
  { name: 'Vertebrate Zoology', publisher: 'Senckenberg / Pensoft', focus: 'Systematics, morphology and evolution of vertebrates.', url: 'https://vertebrate-zoology.arphahub.com/', openAccess: true },
  { name: 'ZooKeys', publisher: 'Pensoft', focus: 'Zoological taxonomy, phylogeny and biogeography.', url: 'https://zookeys.pensoft.net/', openAccess: true },
  { name: 'Raffles Bulletin of Zoology', publisher: 'Lee Kong Chian Natural History Museum', focus: 'Systematics and ecology of Southeast and South Asian fauna.', url: 'https://lkcnhm.nus.edu.sg/publications/raffles-bulletin-of-zoology/', openAccess: true },
  { name: 'Ichthyology & Herpetology (formerly Copeia)', publisher: 'American Society of Ichthyologists and Herpetologists', focus: 'Biology of fishes, amphibians and reptiles.', url: 'https://bioone.org/journals/ichthyology-and-herpetology', openAccess: false },
  { name: 'Ichthyological Research', publisher: 'Springer / Ichthyological Society of Japan', focus: 'All aspects of fish biology, including systematics.', url: 'https://link.springer.com/journal/10228', openAccess: false },
  { name: 'Environmental Biology of Fishes', publisher: 'Springer', focus: 'Ecology, behaviour and conservation of fishes.', url: 'https://link.springer.com/journal/10641', openAccess: false },
  { name: 'Journal of Fish Biology', publisher: 'Wiley / Fisheries Society of the British Isles', focus: 'All areas of fish biology.', url: 'https://onlinelibrary.wiley.com/journal/10958649', openAccess: false },
  { name: 'Aquatic Conservation: Marine and Freshwater Ecosystems', publisher: 'Wiley', focus: 'Conservation of aquatic habitats and species.', url: 'https://onlinelibrary.wiley.com/journal/10990755', openAccess: false },
  { name: 'Journal of the Bombay Natural History Society', publisher: 'Bombay Natural History Society', focus: 'Natural history of the Indian subcontinent.', url: 'https://www.bnhsjournal.org/', openAccess: true },
  { name: 'Indian Journal of Fisheries', publisher: 'ICAR', focus: 'Fisheries science and fish biology in India.', url: 'https://epubs.icar.org.in/index.php/IJF', openAccess: true },
];
