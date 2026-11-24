import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of } from 'rxjs';
import { GbifTaxonomyService, Params } from '../taxonomy/gbif/gbif-taxonomy.service';
import { FISH_ORDER_KEYS } from '../taxonomy/gbif/gbif.config';
import { GbifPage } from '../taxonomy/gbif/gbif.models';

/** GBIF occurrence fields used for museum specimens. */
export interface Specimen {
  key: number;
  scientificName: string;
  acceptedScientificName?: string;
  species?: string;
  speciesKey?: number;
  family?: string;
  order?: string;
  institutionCode?: string;
  collectionCode?: string;
  catalogNumber?: string;
  typeStatus?: string;
  locality?: string;
  stateProvince?: string;
  country?: string;
  countryCode?: string;
  waterBody?: string;
  eventDate?: string;
  year?: number;
  recordedBy?: string;
  identifiedBy?: string;
  preparations?: string;
  individualCount?: number;
  decimalLatitude?: number;
  decimalLongitude?: number;
  datasetName?: string;
  datasetKey?: string;
  references?: string;
  occurrenceID?: string;
  occurrenceRemarks?: string;
  media?: { type?: string; identifier?: string; title?: string; rightsHolder?: string; license?: string }[];
}

export interface SpecimenQuery {
  q?: string;
  country?: string;
  typeStatus?: string;
  institutionCode?: string;
  page: number;
}

/** Type statuses offered as filters (GBIF vocabulary values). */
export const TYPE_STATUSES = ['Holotype', 'Paratype', 'Syntype', 'Lectotype', 'Paralectotype', 'Neotype', 'Type'] as const;
export const SPECIMEN_PAGE_SIZE = 20;

@Injectable({ providedIn: 'root' })
export class SpecimenService {
  private readonly gbif = inject(GbifTaxonomyService);

  private filters(q: Omit<SpecimenQuery, 'page'>): Params {
    const p: Params = { basisOfRecord: 'PRESERVED_SPECIMEN', taxonKey: FISH_ORDER_KEYS };
    if (q.q?.trim()) p['q'] = q.q.trim();
    if (q.country) p['country'] = q.country;
    if (q.typeStatus) p['typeStatus'] = q.typeStatus;
    if (q.institutionCode) p['institutionCode'] = q.institutionCode;
    return p;
  }

  search(q: SpecimenQuery): Observable<GbifPage<Specimen>> {
    return this.gbif.occurrences<GbifPage<Specimen>>({ ...this.filters(q), limit: SPECIMEN_PAGE_SIZE, offset: q.page * SPECIMEN_PAGE_SIZE });
  }

  /** Counts by type status and by holding institution for the current filters. */
  facets(q: Omit<SpecimenQuery, 'page'>): Observable<{ typeStatus: { name: string; count: number }[]; institutions: { name: string; count: number }[] }> {
    return this.gbif
      .occurrences<{ facets: { field: string; counts: { name: string; count: number }[] }[] }>({
        ...this.filters({ ...q, typeStatus: undefined, institutionCode: undefined }),
        limit: 0,
        facet: ['typeStatus', 'institutionCode'],
        facetLimit: 60,
      })
      .pipe(
        map((r) => ({
          typeStatus: r.facets.find((f) => f.field === 'TYPE_STATUS')?.counts ?? [],
          institutions: r.facets.find((f) => f.field === 'INSTITUTION_CODE')?.counts ?? [],
        })),
      );
  }

  /** Institution codes → names from the GBIF registry (codes are case-insensitive there). */
  institutionNames(codes: string[]): Observable<Record<string, string>> {
    if (!codes.length) return of({});
    return forkJoin(codes.map((c) => this.gbif.institutionByCode(c.toUpperCase()).pipe(map((i) => [c, i?.name ?? ''] as const)))).pipe(
      map((pairs) => Object.fromEntries(pairs.filter(([, n]) => n))),
    );
  }

  specimen(key: number): Observable<Specimen> {
    return this.gbif.occurrence<Specimen>(key);
  }
}

export const catalogueNumber = (s: Specimen) => [s.institutionCode, s.collectionCode, s.catalogNumber].filter((x) => !!x).join(' ');
