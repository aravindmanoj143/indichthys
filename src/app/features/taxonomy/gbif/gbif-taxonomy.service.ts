import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { FISH_ORDER_KEYS, GBIF_API, GBIF_BACKBONE_KEY } from './gbif.config';
import {
  GbifDistribution,
  GbifFacetCount,
  GbifIucnCategory,
  GbifNameUsage,
  GbifOccurrenceFacetResponse,
  GbifPage,
  GbifReference,
  GbifThreatStatus,
  GbifVernacularName,
  THREATENED,
} from './gbif.models';

export type Params = Record<string, string | number | boolean | readonly (string | number)[]>;

export interface OccurrenceFilter {
  taxonKey: number | readonly number[];
  country?: string;
  /** Any other GBIF occurrence-search parameters (e.g. iucnRedListCategory, basisOfRecord). */
  extra?: Params;
}

export interface SpeciesSearch {
  q: string;
  /** A single order key, or null for all fish orders. */
  orderKey: number | null;
  /** 'threatened' = CR + EN + VU. */
  threat: GbifThreatStatus | 'threatened' | null;
  freshwaterOnly: boolean;
  offset: number;
  limit: number;
}

export interface SpeciesDetailData {
  usage: GbifNameUsage;
  parents: GbifNameUsage[];
  synonyms: GbifNameUsage[];
  vernacularNames: GbifVernacularName[];
  iucn: GbifIucnCategory | null;
  distributions: GbifDistribution[];
  references: GbifReference[];
}

export interface ChecklistEntry {
  usage: GbifNameUsage;
  occurrences: number;
}

/** Read-only client for the GBIF taxonomy and occurrence APIs. */
@Injectable({ providedIn: 'root' })
export class GbifTaxonomyService {
  private readonly http = inject(HttpClient);

  private get<T>(path: string, params?: Params): Observable<T> {
    return this.http.get<T>(`${GBIF_API}${path}`, { params });
  }

  /** Full-text search of accepted fish species in the GBIF Backbone. */
  searchSpecies(s: SpeciesSearch): Observable<GbifPage<GbifNameUsage>> {
    const params: Params = {
      datasetKey: GBIF_BACKBONE_KEY,
      rank: 'SPECIES',
      status: 'ACCEPTED',
      highertaxonKey: s.orderKey ? [s.orderKey] : FISH_ORDER_KEYS,
      offset: s.offset,
      limit: s.limit,
    };
    if (s.q.trim()) params['q'] = s.q.trim();
    if (s.freshwaterOnly) params['habitat'] = 'FRESHWATER';
    if (s.threat) params['threat'] = s.threat === 'threatened' ? THREATENED : [s.threat];
    return this.get('/species/search', params);
  }

  /** Number of species matching a search (no records fetched). */
  countSpecies(s: Omit<SpeciesSearch, 'offset' | 'limit'>): Observable<number> {
    return this.searchSpecies({ ...s, offset: 0, limit: 0 }).pipe(map((p) => p.count ?? 0));
  }

  getUsage(key: number): Observable<GbifNameUsage> {
    return this.get(`/species/${key}`);
  }

  getChildren(key: number, offset = 0, limit = 100): Observable<GbifPage<GbifNameUsage>> {
    return this.get(`/species/${key}/children`, { offset, limit });
  }

  /** Everything the species page needs, loaded in parallel. */
  getSpeciesDetail(key: number): Observable<SpeciesDetailData> {
    const list = <T>(path: string, limit = 100) =>
      this.get<GbifPage<T>>(`/species/${key}/${path}`, { limit }).pipe(
        map((p) => p.results),
        catchError(() => of([] as T[])),
      );
    return forkJoin({
      usage: this.getUsage(key),
      parents: this.get<GbifNameUsage[]>(`/species/${key}/parents`).pipe(catchError(() => of([]))),
      synonyms: list<GbifNameUsage>('synonyms'),
      vernacularNames: list<GbifVernacularName>('vernacularNames', 200),
      iucn: this.get<GbifIucnCategory>(`/species/${key}/iucnRedListCategory`).pipe(
        catchError(() => of(null)),
      ),
      distributions: list<GbifDistribution>('distributions'),
      references: list<GbifReference>('references'),
    });
  }

  /** IUCN Red List category of a species, or null when GBIF has none. */
  iucnCategory(key: number): Observable<GbifIucnCategory | null> {
    return this.get<GbifIucnCategory>(`/species/${key}/iucnRedListCategory`).pipe(catchError(() => of(null)));
  }

  /** Total number of occurrence records for a taxon (optionally within a country). */
  occurrenceCount(filter: OccurrenceFilter): Observable<number> {
    const params: Params = { ...filter.extra, taxonKey: filter.taxonKey, limit: 0 };
    if (filter.country) params['country'] = filter.country;
    return this.get<{ count: number }>('/occurrence/search', params).pipe(map((r) => r.count));
  }

  /** Occurrence counts for a taxon, faceted by a field (e.g. country, stateProvince). */
  occurrenceFacet(
    filter: OccurrenceFilter,
    facet: string,
    facetLimit = 10,
    facetOffset = 0,
  ): Observable<{ total: number; counts: GbifFacetCount[] }> {
    const params: Params = {
      ...filter.extra,
      taxonKey: filter.taxonKey,
      limit: 0,
      facet,
      facetLimit,
      facetOffset,
    };
    if (filter.country) params['country'] = filter.country;
    return this.get<GbifOccurrenceFacetResponse>('/occurrence/search', params).pipe(
      map((r) => ({ total: r.count, counts: r.facets[0]?.counts ?? [] })),
    );
  }

  /**
   * Threatened fish species with records in a country, for one IUCN category, ranked by record count.
   * Uses GBIF's IUCN Red List filter on occurrences.
   */
  threatenedInCountry(country: string, category: 'CR' | 'EN' | 'VU', offset: number, limit: number) {
    return this.occurrenceFacet(
      { taxonKey: FISH_ORDER_KEYS, country, extra: { iucnRedListCategory: category } },
      'speciesKey',
      limit,
      offset,
    ).pipe(
      switchMap(({ total, counts }) =>
        counts.length
          ? forkJoin(
              counts.map((c) =>
                forkJoin({ usage: this.getUsage(Number(c.name)), freshwater: this.isFreshwater(Number(c.name)) }).pipe(
                  map(({ usage, freshwater }) => ({ usage, occurrences: c.count, freshwater })),
                ),
              ),
            ).pipe(map((entries) => ({ totalOccurrences: total, entries })))
          : of({ totalOccurrences: total, entries: [] as (ChecklistEntry & { freshwater: boolean | null })[] }),
      ),
    );
  }

  /**
   * Whether any GBIF species profile flags the species as freshwater.
   * null = no habitat information (don't hide it).
   */
  isFreshwater(key: number): Observable<boolean | null> {
    return this.get<GbifPage<{ freshwater?: boolean; marine?: boolean }>>(`/species/${key}/speciesProfiles`).pipe(
      map((p) => {
        const flags = p.results.filter((r) => r.freshwater != null || r.marine != null);
        return flags.length ? flags.some((r) => r.freshwater === true) : null;
      }),
      catchError(() => of(null)),
    );
  }

  /** Raw occurrence search (used for museum specimens). */
  occurrences<T>(params: Params): Observable<T> {
    return this.get<T>('/occurrence/search', params);
  }

  occurrence<T>(key: number): Observable<T> {
    return this.get<T>(`/occurrence/${key}`);
  }

  /** GBIF registry (GrSciColl) institution by code, e.g. "NHMUK". */
  institutionByCode(code: string): Observable<{ key: string; code: string; name: string; address?: { city?: string; country?: string } } | null> {
    return this.get<GbifPage<{ key: string; code: string; name: string; address?: { city?: string; country?: string } }>>('/grscicoll/institution', {
      code,
      limit: 1,
    }).pipe(
      map((p) => p.results[0] ?? null),
      catchError(() => of(null)),
    );
  }

  /**
   * Fish species with occurrence records in a country, ranked by record count.
   * GBIF facets don't report a total, so page until fewer than `limit` come back.
   */
  countryChecklist(
    country: string,
    offset: number,
    limit: number,
  ): Observable<{ totalOccurrences: number; entries: ChecklistEntry[] }> {
    return this.occurrenceFacet({ taxonKey: FISH_ORDER_KEYS, country }, 'speciesKey', limit, offset).pipe(
      switchMap(({ total, counts }) => {
        if (!counts.length) return of({ totalOccurrences: total, entries: [] });
        return forkJoin(
          counts.map((c) =>
            this.getUsage(Number(c.name)).pipe(map((usage) => ({ usage, occurrences: c.count }))),
          ),
        ).pipe(map((entries) => ({ totalOccurrences: total, entries })));
      }),
    );
  }
}

/** Human-readable message for a failed GBIF call. */
export function gbifErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'Could not reach GBIF. Check your internet connection.';
    if (err.status === 404) return 'Not found in GBIF.';
    return `GBIF returned an error (${err.status}).`;
  }
  return 'Something went wrong loading data from GBIF.';
}
