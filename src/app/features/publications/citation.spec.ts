import { Citable, bibtexKey, formatCitation, splitAuthors, toBibTeX, toRIS } from './citation';

const synopsis: Citable = {
  id: 1,
  title: 'A synopsis of the South Asian fishes referred to Puntius (Pisces: Cyprinidae)',
  authors: 'Pethiyagoda R, Meegaskumbura M, Maduwage K',
  year: 2012,
  journal: 'Ichthyological Exploration of Freshwaters',
  volume: '23',
  issue: '1',
  pages: '69-95',
  publisher: null,
  doi: null,
  url: null,
  type: 'taxonomic-revision',
};

describe('citations', () => {
  it('splits author lists', () => {
    expect(splitAuthors('Pethiyagoda R, Meegaskumbura M & Maduwage K')).toEqual([
      { family: 'Pethiyagoda', given: 'R' },
      { family: 'Meegaskumbura', given: 'M' },
      { family: 'Maduwage', given: 'K' },
    ]);
  });

  it('formats a journal citation', () => {
    expect(formatCitation(synopsis)).toBe(
      'Pethiyagoda R, Meegaskumbura M, Maduwage K (2012). A synopsis of the South Asian fishes referred to Puntius (Pisces: Cyprinidae). Ichthyological Exploration of Freshwaters 23(1): 69–95.',
    );
    expect(formatCitation({ ...synopsis, doi: '10.1/x' })).toMatch(/https:\/\/doi\.org\/10\.1\/x$/);
  });

  it('exports BibTeX with a stable key and escaped fields', () => {
    expect(bibtexKey(synopsis)).toBe('Pethiyagoda2012synopsis');
    const b = toBibTeX([{ ...synopsis, journal: 'Fish & Rivers' }]);
    expect(b).toContain('@article{Pethiyagoda2012synopsis,');
    expect(b).toContain('author = {Pethiyagoda, R and Meegaskumbura, M and Maduwage, K}');
    expect(b).toContain('journal = {Fish \\& Rivers}');
    expect(b).toContain('pages = {69--95}');
  });

  it('exports RIS', () => {
    const r = toRIS([synopsis]).split('\n');
    expect(r[0]).toBe('TY  - JOUR');
    expect(r).toContain('AU  - Pethiyagoda, R');
    expect(r).toContain('SP  - 69');
    expect(r).toContain('EP  - 95');
    expect(r.at(-1)).toBe('ER  - ');
  });
});

import { fixCaps } from '../registry/registry.api';
describe('fixCaps', () => {
  it('normalises all-caps family names only', () => {
    expect(fixCaps('RANDALL')).toBe('Randall');
    expect(fixCaps('PAGE')).toBe('Page');
    expect(fixCaps("O'BRIEN-SMITH")).toBe("O'Brien-Smith");
    expect(fixCaps('Pethiyagoda')).toBe('Pethiyagoda');
    expect(fixCaps('de Pinna')).toBe('de Pinna');
  });
});
