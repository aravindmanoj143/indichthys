import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

const API = '/api/identification';
export const UPLOADS = '/api/uploads';

// ───── Shared ─────

export interface TaxonRef {
  id: number;
  gbifKey: number | null;
  scientificName: string;
  authorship: string | null;
  rank: string;
  family: string | null;
  order: string | null;
}

export interface TaxonInput {
  gbifKey?: number;
  scientificName: string;
  authorship?: string;
  rank?: string;
  family?: string;
  order?: string;
}

// ───── Characters & matching ─────

export type CharacterKind = 'categorical' | 'meristic' | 'morphometric';

export interface CharacterState {
  id: number;
  code: string;
  label: string;
  description: string | null;
}

export interface Character {
  id: number;
  code: string;
  name: string;
  kind: CharacterKind;
  unit: string | null;
  group: string | null;
  description: string | null;
  states: CharacterState[];
}

export interface ProfileCharacter {
  id: number;
  code: string;
  name: string;
  kind: CharacterKind;
  unit: string | null;
  group: string | null;
  description: string | null;
  states: { id: number; label: string }[];
  range: { min: number; max: number; source: string | null } | null;
}

export interface KeyPathStep {
  couplet: number;
  label: string;
  text: string;
}

export interface TaxonKeyPath {
  slug: string;
  title: string;
  isDemo: boolean;
  /** e.g. "8a" */
  endPoint: string;
  /** Statements from couplet 1 to the end point; empty if the key is broken. */
  path: KeyPathStep[];
}

export interface TaxonProfile {
  taxon: TaxonRef;
  characters: ProfileCharacter[];
  keys: TaxonKeyPath[];
}

export interface KeyGroupEndPoint {
  leadId: number;
  /** e.g. "Loaches: Balitoridae, Nemacheilidae, Cobitidae" */
  name: string;
  key: { slug: string; title: string };
  endPoint: string;
  path: KeyPathStep[];
}

export interface BrowseData {
  keys: { id: number; slug: string; title: string; isDemo: boolean; endPoints: number }[];
  taxa: TaxonRef[];
  groups: KeyGroupEndPoint[];
}

// ───── Keys & guides ─────

export interface GuideSummary {
  id: number;
  slug: string;
  title: string;
  region: string;
  description: string | null;
  isDemo: boolean;
  _count: { entries: number };
}

export interface Guide extends Omit<GuideSummary, '_count'> {
  authors: string | null;
  entries: { id: number; fieldMarks: string | null; similar: string | null; taxon: TaxonRef }[];
}

// ───── Requests ─────

export type RequestStatus = 'open' | 'proposed' | 'verified' | 'closed';
export type Confidence = 'certain' | 'likely' | 'possible';

export interface RequestSummary {
  id: number;
  title: string;
  submitterName: string;
  locality: string;
  region: string | null;
  country: string;
  observedOn: string | null;
  status: RequestStatus;
  createdAt: string;
  verifiedTaxon: TaxonRef | null;
  photos: { fileName: string }[];
  _count: { proposals: number };
}

export interface Page<T> {
  total: number;
  page: number;
  pageSize: number;
  items: T[];
}

export interface Review {
  id: number;
  reviewer: string;
  profileSlug: string | null;
  isExpert: boolean;
  decision: 'agree' | 'disagree';
  comment: string | null;
  createdAt: string;
}

export interface Proposal {
  id: number;
  taxon: TaxonRef;
  proposedBy: string;
  profileSlug: string | null;
  isExpert: boolean;
  isMine: boolean;
  myReview: 'agree' | 'disagree' | null;
  confidence: Confidence;
  reasoning: string | null;
  createdAt: string;
  reviews: Review[];
  tally: { agree: number; disagree: number; expertAgree: number; expertDisagree: number; verified: boolean };
}

export interface RequestDetail extends Omit<RequestSummary, 'photos' | '_count'> {
  latitude: number | null;
  longitude: number | null;
  habitat: string | null;
  characterNotes: string | null;
  notes: string | null;
  verifiedAt: string | null;
  photos: { id: number; fileName: string; originalName: string }[];
  proposals: Proposal[];
}

/** Proposer and expert status come from the signed-in account. */
export interface NewProposal {
  taxon: TaxonInput;
  confidence: Confidence;
  reasoning?: string;
}

export interface NewReview {
  decision: 'agree' | 'disagree';
  comment?: string;
}

@Injectable({ providedIn: 'root' })
export class IdentificationApi {
  private readonly http = inject(HttpClient);

  characters(): Observable<Character[]> {
    return this.http.get<Character[]>(`${API}/characters`);
  }
  /** Taxa and key end points for the browse tree. */
  browse(): Observable<BrowseData> {
    return this.http.get<BrowseData>(`${API}/taxa`);
  }
  profile(taxonId: number): Observable<TaxonProfile> {
    return this.http.get<TaxonProfile>(`${API}/taxa/${taxonId}/profile`);
  }


  guides(): Observable<GuideSummary[]> {
    return this.http.get<GuideSummary[]>(`${API}/guides`);
  }
  guide(slug: string): Observable<Guide> {
    return this.http.get<Guide>(`${API}/guides/${slug}`);
  }

  requests(status: RequestStatus | null, page: number, pageSize = 20): Observable<Page<RequestSummary>> {
    const params: Record<string, string | number> = { page, pageSize };
    if (status) params['status'] = status;
    return this.http.get<Page<RequestSummary>>(`${API}/requests`, { params });
  }
  request(id: number): Observable<RequestDetail> {
    return this.http.get<RequestDetail>(`${API}/requests/${id}`);
  }
  createRequest(form: FormData): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${API}/requests`, form);
  }
  propose(requestId: number, body: NewProposal): Observable<unknown> {
    return this.http.post(`${API}/requests/${requestId}/proposals`, body);
  }
  review(proposalId: number, body: NewReview): Observable<unknown> {
    return this.http.post(`${API}/proposals/${proposalId}/reviews`, body);
  }

  aiStatus(): Observable<{ enabled: boolean; provider: string | null }> {
    return this.http.get<{ enabled: boolean; provider: string | null }>(`${API}/ai/status`);
  }
}

export { apiErrorMessage } from '../../core/api-error';

export const photoUrl = (fileName: string) => `${UPLOADS}/${fileName}`;
