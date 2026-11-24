export interface NavModule {
  label: string;
  /** Undefined = not built yet. */
  route?: string;
}

export interface NavItem {
  label: string;
  /** Route of the first available module in the section; undefined = nothing built yet. */
  route?: string;
  modules: NavModule[];
}

/** Top-level navigation: 15 platform modules grouped into 8 sections. */
export const MAIN_NAV: NavItem[] = [
  {
    label: 'Explore',
    route: '/taxonomy',
    modules: [
      { label: 'Taxonomy', route: '/taxonomy' },
      { label: 'Identification', route: '/identification' },
      { label: 'Biodiversity Media' },
    ],
  },
  {
    label: 'Research',
    route: '/publications',
    modules: [
      { label: 'Publications', route: '/publications' },
      { label: 'Research Tools', route: '/tools' },
      { label: 'Specimens', route: '/specimens' },
    ],
  },
  {
    label: 'People',
    route: '/ichthyologists',
    modules: [
      { label: 'Ichthyologists', route: '/ichthyologists' },
      { label: 'Organisations', route: '/organisations' },
      { label: 'Community' },
    ],
  },
  {
    label: 'Fieldwork',
    route: '/observations',
    modules: [{ label: 'Observations', route: '/observations' }, { label: 'Surveys' }, { label: 'Expeditions' }],
  },
  {
    label: 'Conservation',
    route: '/conservation',
    modules: [
      { label: 'Conservation', route: '/conservation' },
      { label: 'Threatened Species', route: '/threatened' },
    ],
  },
  {
    label: 'Learning',
    route: '/learning',
    modules: [
      { label: 'Courses', route: '/learning' },
      { label: 'Workshops', route: '/workshops' },
    ],
  },
  {
    label: 'Opportunities',
    route: '/grants',
    modules: [
      { label: 'Grants', route: '/grants' },
      { label: 'Jobs', route: '/jobs' },
      { label: 'Fellowships', route: '/fellowships' },
    ],
  },
  {
    label: 'Discover',
    route: '/news',
    modules: [
      { label: 'News', route: '/news' },
      { label: 'Events', route: '/events' },
    ],
  },
];

/** Paths that belong to a section without being one of its menu routes. */
const EXTRA_SECTION_PATHS: [prefix: string, section: string][] = [['/opportunities', 'Opportunities']];

/** The section whose modules own a URL. */
export function sectionForUrl(url: string): NavItem | undefined {
  const path = url.split(/[?#]/)[0] ?? '';
  const extra = EXTRA_SECTION_PATHS.find(([prefix]) => path === prefix || path.startsWith(prefix + '/'));
  if (extra) return MAIN_NAV.find((s) => s.label === extra[1]);
  return MAIN_NAV.find((s) => s.modules.some((m) => m.route && (path === m.route || path.startsWith(m.route + '/'))))
    ?? MAIN_NAV.find((s) => path === `/section/${s.label.toLowerCase()}`);
}
