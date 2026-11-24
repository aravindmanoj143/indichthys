import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export const PUBLICATION_TYPES = {
  article: 'Journal article',
  'species-description': 'Species description',
  'taxonomic-revision': 'Taxonomic revision',
  report: 'Research report',
  book: 'Book',
  'field-guide': 'Field guide',
  chapter: 'Book chapter',
  thesis: 'Thesis',
  other: 'Other',
} as const;
export type PublicationType = keyof typeof PUBLICATION_TYPES;

export interface PublicationItem {
  id: number;
  title: string;
  authors: string;
  year: number | null;
  journal: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  publisher: string | null;
  doi: string | null;
  url: string | null;
  type: PublicationType;
  createdAt: string;
  topics: { slug: string; name: string }[];
  taxa: { gbifKey: number; scientificName: string }[];
  profiles: { slug: string; fullName: string; honorific: string | null }[];
  saved: boolean;
}

export interface PublicationDetail extends PublicationItem {
  abstract: string | null;
  updatedAt: string;
  addedBy: string | null;
  savedCount: number;
  canEdit: boolean;
  isAuthor: boolean;
}

export interface PublicationInput {
  title: string;
  authors: string;
  year: number | null;
  journal: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  publisher: string | null;
  doi: string | null;
  url: string | null;
  abstract: string | null;
  type: PublicationType;
  topics: string[];
  taxa: { gbifKey: number; scientificName: string }[];
  claimAuthorship: boolean;
}

export interface PublicationQuery {
  q?: string;
  type?: string;
  topic?: string;
  journal?: string;
  taxon?: number;
  author?: string;
  yearFrom?: number;
  yearTo?: number;
  sort?: 'year' | 'added' | 'title';
  page?: number;
}

export interface Topic {
  slug: string;
  name: string;
  category: 'discipline' | 'taxon' | 'region';
  publications: number;
  researchers: number;
}

const clean = (p: object) =>
  Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== null && v !== '')) as Record<string, string | number>;

@Injectable({ providedIn: 'root' })
export class PublicationsApi {
  private readonly http = inject(HttpClient);

  search(q: PublicationQuery): Observable<{ total: number; page: number; pageSize: number; items: PublicationItem[] }> {
    return this.http.get<{ total: number; page: number; pageSize: number; items: PublicationItem[] }>('/api/publications', { params: clean(q) });
  }
  get(id: number): Observable<PublicationDetail> {
    return this.http.get<PublicationDetail>(`/api/publications/${id}`);
  }
  create(body: PublicationInput): Observable<{ id: number }> {
    return this.http.post<{ id: number }>('/api/publications', body);
  }
  update(id: number, body: PublicationInput): Observable<{ id: number }> {
    return this.http.put<{ id: number }>(`/api/publications/${id}`, body);
  }
  remove(id: number): Observable<unknown> {
    return this.http.delete(`/api/publications/${id}`);
  }
  doiCheck(doi: string): Observable<{ exists: boolean; publication: { id: number; title: string } | null }> {
    return this.http.get<{ exists: boolean; publication: { id: number; title: string } | null }>('/api/publications/doi-check', { params: { doi } });
  }
  journals(): Observable<{ journal: string; count: number; latestYear: number | null }[]> {
    return this.http.get<{ journal: string; count: number; latestYear: number | null }[]>('/api/publications/journals');
  }
  topics(): Observable<Topic[]> {
    return this.http.get<Topic[]>('/api/publications/topics');
  }
  library(): Observable<(PublicationItem & { abstract: string | null })[]> {
    return this.http.get<(PublicationItem & { abstract: string | null })[]>('/api/publications/library');
  }
  save(id: number, saved: boolean): Observable<{ saved: boolean }> {
    return saved ? this.http.post<{ saved: boolean }>(`/api/publications/${id}/save`, {}) : this.http.delete<{ saved: boolean }>(`/api/publications/${id}/save`);
  }
  claim(id: number, claimed: boolean): Observable<unknown> {
    return claimed ? this.http.post(`/api/publications/${id}/authorship`, {}) : this.http.delete(`/api/publications/${id}/authorship`);
  }
}
