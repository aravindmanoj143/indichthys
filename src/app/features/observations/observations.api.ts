import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_BASE } from '../../core/api-base';
import { Observable } from 'rxjs';

const API = '/api/observations';
export const UPLOADS = `${API_BASE}/api/uploads`;
/** Photo URL: uploaded files come from /api/uploads; imported (e.g. iNaturalist) photos are full URLs. */
export const photoSrc = (fileName: string) => (/^https?:\/\//.test(fileName) ? fileName : `${UPLOADS}/${fileName}`);

export type QualityGrade = 'casual' | 'needs-id' | 'research';

export const QUALITY_LABELS: Record<QualityGrade, string> = {
  research: 'Research grade',
  'needs-id': 'Needs ID',
  casual: 'Casual',
};

/** Marker colours (also used for the legend). */
export const QUALITY_COLOURS: Record<QualityGrade, string> = {
  research: '#16a34a',
  'needs-id': '#d97706',
  casual: '#6b7280',
};

export const HABITATS: [value: string, label: string][] = [
  ['river', 'River'],
  ['stream', 'Stream / hill stream'],
  ['lake', 'Lake'],
  ['reservoir', 'Reservoir / dam'],
  ['pond', 'Pond / tank'],
  ['wetland', 'Wetland / marsh'],
  ['floodplain', 'Floodplain'],
  ['estuary', 'Estuary / backwater'],
  ['canal', 'Canal / ditch'],
  ['paddy-field', 'Paddy field'],
  ['spring', 'Spring'],
  ['cave', 'Cave / subterranean'],
  ['other', 'Other'],
];

export interface Person {
  name: string;
  profileSlug: string | null;
  verified: boolean;
  /** Added without an account. */
  guest: boolean;
}

export interface ObservationSummary {
  id: number;
  taxonName: string | null;
  taxonRank: string | null;
  qualityGrade: QualityGrade;
  observedAt: string | null;
  placeName: string | null;
  waterBody: string | null;
  latitude: number | null;
  longitude: number | null;
  observer: Person;
  photo: string | null;
  sourceUrl: string | null;
  identifications: number;
}

export interface ObservationPage {
  total: number;
  species: number;
  page: number;
  pageSize: number;
  items: ObservationSummary[];
}

export interface MapPoint {
  id: number;
  lat: number;
  lng: number;
  quality: QualityGrade;
  taxonName: string | null;
}

export interface Identification {
  id: number;
  taxonName: string;
  gbifKey: number | null;
  taxonRank: string | null;
  comment: string | null;
  isCurrent: boolean;
  createdAt: string;
  by: Person;
  isMine: boolean;
}

export interface ObservationDetail {
  id: number;
  observedAt: string | null;
  latitude: number | null;
  longitude: number | null;
  publicLatitude: number | null;
  publicLongitude: number | null;
  accuracyM: number | null;
  placeName: string | null;
  waterBody: string | null;
  habitat: string | null;
  individuals: number | null;
  captive: boolean;
  geoprivacy: 'open' | 'obscured';
  notes: string | null;
  taxonName: string | null;
  gbifKey: number | null;
  taxonRank: string | null;
  qualityGrade: QualityGrade;
  /** Original record when imported (e.g. iNaturalist). */
  sourceUrl: string | null;
  createdAt: string;
  observer: Person;
  photos: { id: number; fileName: string }[];
  community: { taxonName: string; gbifKey: number | null; agreements: number; total: number } | null;
  identifications: Identification[];
  myCurrentId: number | null;
  isOwn: boolean;
  canDelete: boolean;
}

export interface ObservationQuery {
  q?: string;
  quality?: QualityGrade | '';
  mine?: boolean;
  bbox?: string;
  page?: number;
}

export interface ObservationInput {
  observedAt: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracyM: number | null;
  placeName: string | null;
  waterBody: string | null;
  habitat: string | null;
  individuals: number | null;
  captive: boolean;
  geoprivacy: 'open' | 'obscured';
  notes: string | null;
}

export interface IdentificationInput {
  taxonName: string;
  gbifKey?: number | null;
  taxonRank?: string | null;
  comment?: string | null;
}

const params = (q: ObservationQuery) => {
  const p: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== '' && v !== false && v !== null) p[k] = v;
  return p;
};

@Injectable({ providedIn: 'root' })
export class ObservationsApi {
  private readonly http = inject(HttpClient);

  list(q: ObservationQuery): Observable<ObservationPage> {
    return this.http.get<ObservationPage>(API, { params: params(q) });
  }
  map(q: ObservationQuery): Observable<MapPoint[]> {
    return this.http.get<MapPoint[]>(`${API}/map`, { params: params({ ...q, bbox: undefined, page: undefined }) });
  }
  get(id: number): Observable<ObservationDetail> {
    return this.http.get<ObservationDetail>(`${API}/${id}`);
  }
  create(form: FormData): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(API, form);
  }
  update(id: number, body: ObservationInput): Observable<unknown> {
    return this.http.patch(`${API}/${id}`, body);
  }
  remove(id: number): Observable<unknown> {
    return this.http.delete(`${API}/${id}`);
  }
  identify(id: number, body: IdentificationInput): Observable<unknown> {
    return this.http.post(`${API}/${id}/identifications`, body);
  }
  withdraw(id: number, identId: number): Observable<unknown> {
    return this.http.delete(`${API}/${id}/identifications/${identId}`);
  }
}

export { apiErrorMessage } from '../../core/api-error';
