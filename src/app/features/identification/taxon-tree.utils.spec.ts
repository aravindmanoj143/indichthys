import { TaxonRef } from './identification.api';
import { buildTaxonTree, countTaxa, filterTaxa } from './taxon-tree.utils';

const taxon = (id: number, scientificName: string, rank: string, family: string | null, order: string | null): TaxonRef => ({
  id,
  gbifKey: null,
  scientificName,
  authorship: null,
  rank,
  family,
  order,
});

describe('buildTaxonTree', () => {
  const tree = buildTaxonTree([
    taxon(1, 'Labeo rohita', 'species', 'Cyprinidae', 'Cypriniformes'),
    taxon(2, 'Cyprinidae', 'family', 'Cyprinidae', 'Cypriniformes'),
    taxon(3, 'Labeo catla', 'species', 'Cyprinidae', 'Cypriniformes'),
    taxon(4, 'Bagridae', 'family', 'Bagridae', 'Siluriformes'),
    taxon(5, 'Mystery fish', 'species', null, null),
  ]);

  it('groups by order, family and genus, with unplaced taxa last', () => {
    expect(tree.map((n) => n.name)).toEqual(['Cypriniformes', 'Siluriformes', 'Unplaced']);
    const cyprinidae = tree[0]!.children[0]!;
    expect(cyprinidae.name).toBe('Cyprinidae');
    expect(cyprinidae.taxon?.id).toBe(2);
    const labeo = cyprinidae.children[0]!;
    expect(labeo.rank).toBe('genus');
    expect(labeo.children.map((s) => s.name)).toEqual(['Labeo catla', 'Labeo rohita']);
  });

  it('counts selectable taxa', () => {
    expect(countTaxa(tree[0]!)).toBe(3);
  });
});

describe('filterTaxa', () => {
  const taxa = [taxon(1, 'Labeo rohita', 'species', 'Cyprinidae', 'Cypriniformes'), taxon(2, 'Bagridae', 'family', 'Bagridae', 'Siluriformes')];
  it('matches name, family or order, ignoring case', () => {
    expect(filterTaxa(taxa, 'ROHITA').map((t) => t.id)).toEqual([1]);
    expect(filterTaxa(taxa, 'siluri').map((t) => t.id)).toEqual([2]);
    expect(filterTaxa(taxa, '  ').length).toBe(2);
  });
});
