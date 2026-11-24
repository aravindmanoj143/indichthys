import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { GbifTaxonomyService } from './gbif-taxonomy.service';
import { FISH_ORDER_KEYS, GBIF_API } from './gbif.config';

describe('GbifTaxonomyService', () => {
  let service: GbifTaxonomyService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(GbifTaxonomyService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('searches accepted fish species with all filters applied', () => {
    service
      .searchSpecies({ q: ' garra ', orderKey: 1153, threat: 'threatened', freshwaterOnly: true, offset: 20, limit: 20 })
      .subscribe();
    const req = http.expectOne((r) => r.url === `${GBIF_API}/species/search`);
    const p = req.request.params;
    expect(p.get('q')).toBe('garra');
    expect(p.get('rank')).toBe('SPECIES');
    expect(p.get('status')).toBe('ACCEPTED');
    expect(p.get('habitat')).toBe('FRESHWATER');
    expect(p.getAll('highertaxonKey')).toEqual(['1153']);
    expect(p.getAll('threat')).toEqual(['CRITICALLY_ENDANGERED', 'ENDANGERED', 'VULNERABLE']);
    expect(p.get('offset')).toBe('20');
    req.flush({ offset: 20, limit: 20, endOfRecords: true, count: 0, results: [] });
  });

  it('searches every fish order when no order is chosen', () => {
    service.searchSpecies({ q: '', orderKey: null, threat: null, freshwaterOnly: false, offset: 0, limit: 5 }).subscribe();
    const req = http.expectOne((r) => r.url === `${GBIF_API}/species/search`);
    expect(req.request.params.getAll('highertaxonKey')?.length).toBe(FISH_ORDER_KEYS.length);
    expect(req.request.params.has('q')).toBe(false);
    expect(req.request.params.has('habitat')).toBe(false);
    req.flush({ offset: 0, limit: 5, endOfRecords: true, results: [] });
  });

  it('builds a country checklist from occurrence facets', () => {
    let result: { totalOccurrences: number; entries: { occurrences: number }[] } | undefined;
    service.countryChecklist('IN', 0, 2).subscribe((r) => (result = r));
    http
      .expectOne((r) => r.url === `${GBIF_API}/occurrence/search` && r.params.get('country') === 'IN')
      .flush({ count: 99, facets: [{ field: 'SPECIES_KEY', counts: [{ name: '1', count: 10 }, { name: '2', count: 5 }] }] });
    http.expectOne(`${GBIF_API}/species/1`).flush({ key: 1, scientificName: 'A a', rank: 'SPECIES' });
    http.expectOne(`${GBIF_API}/species/2`).flush({ key: 2, scientificName: 'B b', rank: 'SPECIES' });
    expect(result?.totalOccurrences).toBe(99);
    expect(result?.entries.map((e) => e.occurrences)).toEqual([10, 5]);
  });

  it('treats a missing IUCN category as null rather than failing the species page', () => {
    let iucn: unknown = 'unset';
    service.getSpeciesDetail(5).subscribe((d) => (iucn = d.iucn));
    http.expectOne(`${GBIF_API}/species/5`).flush({ key: 5, scientificName: 'X y', rank: 'SPECIES' });
    http.expectOne(`${GBIF_API}/species/5/parents`).flush([]);
    for (const p of ['synonyms', 'vernacularNames', 'distributions', 'references']) {
      http.expectOne((r) => r.url === `${GBIF_API}/species/5/${p}`).flush({ results: [] });
    }
    http.expectOne(`${GBIF_API}/species/5/iucnRedListCategory`).flush(null, { status: 404, statusText: 'Not Found' });
    expect(iucn).toBeNull();
  });
});
