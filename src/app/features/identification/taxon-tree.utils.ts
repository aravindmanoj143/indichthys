import { TaxonRef } from './identification.api';

export interface TaxonTreeNode {
  /** Unique within the tree, e.g. "order:Cypriniformes". */
  key: string;
  rank: 'order' | 'family' | 'genus' | 'species' | string;
  name: string;
  /** Present when this node is itself a selectable taxon. */
  taxon?: TaxonRef;
  children: TaxonTreeNode[];
}

const UNPLACED = 'Unplaced';

/**
 * Order → Family → Genus → Species from a flat taxon list.
 * Taxa of family rank become the family node itself (selectable);
 * genus nodes are derived from the first word of species names.
 */
export function buildTaxonTree(taxa: readonly TaxonRef[]): TaxonTreeNode[] {
  const roots: TaxonTreeNode[] = [];
  const child = (list: TaxonTreeNode[], rank: string, name: string, parentKey: string) => {
    const key = `${parentKey}/${rank}:${name}`;
    let node = list.find((n) => n.key === key);
    if (!node) {
      node = { key, rank, name, children: [] };
      list.push(node);
    }
    return node;
  };

  for (const t of taxa) {
    const order = child(roots, 'order', t.order ?? UNPLACED, '');
    const family = child(order.children, 'family', t.family ?? (t.rank === 'family' ? t.scientificName : UNPLACED), order.key);
    if (t.rank === 'family') {
      family.taxon = t;
      continue;
    }
    if (t.rank === 'genus') {
      child(family.children, 'genus', t.scientificName, family.key).taxon = t;
      continue;
    }
    const genusName = t.scientificName.split(' ')[0] ?? t.scientificName;
    const genus = child(family.children, 'genus', genusName, family.key);
    genus.children.push({ key: `${genus.key}/${t.rank}:${t.scientificName}`, rank: t.rank, name: t.scientificName, taxon: t, children: [] });
  }

  const sort = (nodes: TaxonTreeNode[]) => {
    nodes.sort((a, b) => (a.name === UNPLACED ? 1 : b.name === UNPLACED ? -1 : a.name.localeCompare(b.name)));
    nodes.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

/** Number of selectable taxa under (and including) a node. */
export function countTaxa(node: TaxonTreeNode): number {
  return (node.taxon ? 1 : 0) + node.children.reduce((sum, c) => sum + countTaxa(c), 0);
}

/** Case-insensitive filter on scientific name, family and order. */
export function filterTaxa(taxa: readonly TaxonRef[], query: string): TaxonRef[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...taxa];
  return taxa.filter((t) => [t.scientificName, t.family, t.order].some((v) => v?.toLowerCase().includes(q)));
}
