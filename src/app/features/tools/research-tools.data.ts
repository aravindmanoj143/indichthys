/**
 * Research Tools directory (Module 10).
 * To add a tool: append an entry. `tasks` link it to the module's sections; `link` is
 * external (https://…) or an Indichthys route (/…). Links were checked on 2026-11-24.
 */

export const TASKS = {
  morphometrics: 'Fish morphometrics',
  meristics: 'Meristic counts (scales, fin rays)',
  annotation: 'Image annotation',
  statistics: 'Statistical analysis',
  comparison: 'Species comparison & identification',
  molecular: 'DNA barcoding & phylogenetics',
  reference: 'Taxonomic & conservation references',
  mapping: 'Mapping & data standards',
  writing: 'References & illustration',
} as const;
export type Task = keyof typeof TASKS;

export interface ResearchTool {
  name: string;
  description: string;
  link: string;
  tasks: Task[];
  /** e.g. "Free · Windows/macOS/Linux", "Web", "R package" */
  access: string;
  /** Built into Indichthys. */
  internal?: boolean;
}

export const RESEARCH_TOOLS: ResearchTool[] = [
  // ── Built into Indichthys ──
  {
    name: 'Key identification',
    description: 'Browse fishes in a taxon tree and see the key characters and morphological, meristic and morphometric profile of each.',
    link: '/identification/taxa',
    tasks: ['comparison', 'meristics', 'morphometrics'],
    access: 'Indichthys',
    internal: true,
  },
  {
    name: 'Species search & taxonomic tree',
    description: 'Accepted names, synonyms, classification, IUCN status and distribution of fishes, live from GBIF.',
    link: '/taxonomy',
    tasks: ['reference', 'comparison'],
    access: 'Indichthys',
    internal: true,
  },
  {
    name: 'Museum specimens',
    description: 'Search preserved specimens and type material held in museums worldwide.',
    link: '/specimens',
    tasks: ['reference', 'comparison'],
    access: 'Indichthys',
    internal: true,
  },
  {
    name: 'Expert identification',
    description: 'Upload photos with counts and measurements and get identifications verified by experts.',
    link: '/identification/requests',
    tasks: ['comparison'],
    access: 'Indichthys',
    internal: true,
  },

  // ── Morphometrics, meristics & image work ──
  {
    name: 'ImageJ',
    description: 'Public-domain image analysis program: calibrate a scale bar, then measure lengths, angles and areas on fish photographs.',
    link: 'https://imagej.net/ij/',
    tasks: ['morphometrics', 'annotation'],
    access: 'Free · Windows/macOS/Linux',
  },
  {
    name: 'Fiji',
    description: 'ImageJ bundled with plugins for scientific imaging. Good default for measuring and annotating specimen photographs.',
    link: 'https://fiji.sc/',
    tasks: ['morphometrics', 'annotation'],
    access: 'Free, open source · Windows/macOS/Linux',
  },
  {
    name: 'Cell Counter (Fiji plugin)',
    description: 'Click to mark and tally objects on an image by category, handy for counting scales, fin rays or gill rakers on photographs and X-rays.',
    link: 'https://imagej.net/plugins/cell-counter',
    tasks: ['meristics', 'annotation'],
    access: 'Free · runs in Fiji/ImageJ',
  },
  {
    name: 'tps series (tpsDig2, tpsUtil, tpsRelw)',
    description: 'Classic software for digitising landmarks on specimen images and running thin-plate-spline geometric morphometrics.',
    link: 'https://www.sbmorphometrics.org/',
    tasks: ['morphometrics'],
    access: 'Free · Windows',
  },
  {
    name: 'MorphoJ',
    description: 'Geometric morphometrics with a graphical interface: Procrustes fit, PCA, CVA, regression and shape visualisation.',
    link: 'https://morphometrics.uk/MorphoJ_page.html',
    tasks: ['morphometrics', 'statistics'],
    access: 'Free · Windows/macOS/Linux (Java)',
  },
  {
    name: 'geomorph',
    description: 'R package for geometric morphometric analysis of landmark data: Procrustes ANOVA, allometry, integration and phylogenetic signal.',
    link: 'https://cran.r-project.org/package=geomorph',
    tasks: ['morphometrics', 'statistics'],
    access: 'Free, open source · R package',
  },
  {
    name: 'CVAT',
    description: 'Open-source tool for annotating images with points, boxes and polygons, e.g. to build training sets for future AI identification.',
    link: 'https://www.cvat.ai/',
    tasks: ['annotation'],
    access: 'Open source · Web / self-hosted',
  },
  {
    name: 'Label Studio',
    description: 'Open-source data labelling tool for images and other data, with export to common machine-learning formats.',
    link: 'https://labelstud.io/',
    tasks: ['annotation'],
    access: 'Open source · Web / self-hosted',
  },

  // ── Statistics ──
  {
    name: 'R',
    description: 'Free statistical computing environment; the standard for analysing morphometric, ecological and survey data.',
    link: 'https://www.r-project.org/',
    tasks: ['statistics'],
    access: 'Free, open source · Windows/macOS/Linux',
  },
  {
    name: 'PAST',
    description: 'Easy-to-use statistics program for natural history data: multivariate analysis (PCA, CVA), morphometrics, diversity indices and more.',
    link: 'https://www.nhm.uio.no/english/research/resources/past/',
    tasks: ['statistics', 'morphometrics'],
    access: 'Free · Windows/macOS',
  },

  // ── Molecular ──
  {
    name: 'BOLD Systems',
    description: 'Barcode of Life Data System: store DNA barcode (COI) records and identify specimens against the reference library.',
    link: 'https://www.boldsystems.org/',
    tasks: ['molecular', 'comparison'],
    access: 'Free · Web',
  },
  {
    name: 'NCBI BLAST',
    description: 'Compare a DNA sequence against GenBank to find the most similar published sequences.',
    link: 'https://blast.ncbi.nlm.nih.gov/',
    tasks: ['molecular', 'comparison'],
    access: 'Free · Web',
  },
  {
    name: 'GenBank',
    description: 'NIH public database of DNA sequences; where barcodes and other sequences are deposited for publication.',
    link: 'https://www.ncbi.nlm.nih.gov/genbank/',
    tasks: ['molecular'],
    access: 'Free · Web',
  },
  {
    name: 'MEGA',
    description: 'Molecular Evolutionary Genetics Analysis: sequence alignment, genetic distances and phylogenetic trees.',
    link: 'https://www.megasoftware.net/',
    tasks: ['molecular', 'statistics'],
    access: 'Free · Windows/macOS/Linux',
  },

  // ── References ──
  {
    name: "Eschmeyer's Catalog of Fishes",
    description: 'Authoritative catalogue of fish names: original descriptions, type specimens, synonyms and current status.',
    link: 'https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatmain.asp',
    tasks: ['reference', 'comparison'],
    access: 'Free · Web',
  },
  {
    name: 'FishBase',
    description: 'Global database of fish species: biology, ecology, morphology, distribution, photos and references.',
    link: 'https://www.fishbase.se/',
    tasks: ['reference', 'comparison'],
    access: 'Free · Web',
  },
  {
    name: 'GBIF',
    description: 'Global Biodiversity Information Facility: occurrence records, checklists and specimen data; the source behind Indichthys taxonomy pages.',
    link: 'https://www.gbif.org/',
    tasks: ['reference', 'mapping'],
    access: 'Free · Web & API',
  },
  {
    name: 'IUCN Red List',
    description: 'Global conservation status assessments, with ranges, threats and population trends.',
    link: 'https://www.iucnredlist.org/',
    tasks: ['reference'],
    access: 'Free · Web',
  },
  {
    name: 'iNaturalist',
    description: 'Community platform for sharing photo observations and getting identifications; useful for distribution records and citizen science.',
    link: 'https://www.inaturalist.org/',
    tasks: ['comparison', 'mapping'],
    access: 'Free · Web & mobile',
  },

  // ── Mapping & data ──
  {
    name: 'QGIS',
    description: 'Free GIS for mapping survey localities, river basins and species distributions.',
    link: 'https://qgis.org/',
    tasks: ['mapping'],
    access: 'Free, open source · Windows/macOS/Linux',
  },
  {
    name: 'Darwin Core',
    description: 'The standard vocabulary for sharing species occurrence and specimen data (used by GBIF). Use it for your data exports.',
    link: 'https://dwc.tdwg.org/',
    tasks: ['mapping'],
    access: 'Open standard',
  },

  // ── Writing & illustration ──
  {
    name: 'Zotero',
    description: 'Free reference manager: collect papers, manage citations and build bibliographies in any journal style.',
    link: 'https://www.zotero.org/',
    tasks: ['writing'],
    access: 'Free, open source · Windows/macOS/Linux',
  },
  {
    name: 'Inkscape',
    description: 'Free vector graphics editor for preparing figures, plates and scientific illustrations.',
    link: 'https://inkscape.org/',
    tasks: ['writing'],
    access: 'Free, open source · Windows/macOS/Linux',
  },
];
