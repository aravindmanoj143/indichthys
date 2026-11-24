import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export type ModerationStatus = 'pending' | 'published' | 'rejected' | 'archived';

export interface Page<T> {
  total: number;
  page: number;
  pageSize: number;
  items: T[];
}

// ───── Labels ─────

export const NEWS_CATEGORIES = {
  news: 'News',
  'new-species': 'New species',
  'taxonomic-update': 'Taxonomic update',
  research: 'Research',
  conservation: 'Conservation',
  announcement: 'Announcement',
} as const;
export type NewsCategory = keyof typeof NEWS_CATEGORIES;

export const EVENT_KINDS = {
  conference: 'Conference',
  seminar: 'Seminar',
  workshop: 'Workshop',
  'field-course': 'Field course',
  webinar: 'Webinar',
  other: 'Other',
} as const;
export type EventKind = keyof typeof EVENT_KINDS;

export const FUNDING_TYPES = {
  'research-grant': 'Research grant',
  'conservation-funding': 'Conservation funding',
  'government-grant': 'Government grant',
  'csr-funding': 'CSR funding',
  fellowship: 'Fellowship',
  'funded-project': 'Funded project',
  'proposal-resource': 'Proposal resource',
} as const;
export const JOB_TYPES = {
  job: 'Job',
  'research-assistant': 'Research assistant',
  'field-biologist': 'Field biologist',
  phd: 'PhD position',
  postdoc: 'Postdoctoral position',
  internship: 'Internship',
  volunteer: 'Volunteer',
  fellowship: 'Research fellowship',
} as const;
export type Section = 'funding' | 'jobs';
export const opportunityTypeLabel = (section: Section, type: string) =>
  ((section === 'funding' ? FUNDING_TYPES : JOB_TYPES) as Record<string, string>)[type] ?? type;

export const PROJECT_KINDS = {
  project: 'Conservation project',
  initiative: 'Conservation initiative',
  'citizen-programme': 'Citizen programme',
} as const;
export type ProjectKind = keyof typeof PROJECT_KINDS;

// ───── Types ─────

export interface NewsSummary {
  id: number;
  slug: string;
  title: string;
  summary: string;
  category: NewsCategory;
  publishedAt: string;
}
export interface NewsPost extends NewsSummary {
  body: string;
  sourceUrl: string | null;
  status: 'draft' | 'published';
  author: { displayName: string } | null;
}
export interface NewsInput {
  title: string;
  summary: string;
  body: string;
  category: NewsCategory;
  sourceUrl: string | null;
  status: 'draft' | 'published';
}

export interface EventItem {
  id: number;
  slug: string;
  title: string;
  description?: string;
  kind: EventKind;
  startsOn: string;
  endsOn: string | null;
  isOnline: boolean;
  venue: string | null;
  city: string | null;
  country: string;
  organiser: string | null;
  url: string | null;
  registrationDeadline: string | null;
  status: ModerationStatus;
}
export type EventInput = Omit<EventItem, 'id' | 'slug' | 'status' | 'description'> & { description: string };

export interface InstitutionRef {
  id: number;
  name: string;
  city: string | null;
  region: string | null;
}

export interface Opportunity {
  id: number;
  slug: string;
  section: Section;
  type: string;
  title: string;
  organisation: string;
  institutionId: number | null;
  institution?: InstitutionRef | null;
  description?: string;
  eligibility?: string | null;
  amount: string | null;
  location: string | null;
  country: string;
  isRemote: boolean;
  deadline: string | null;
  startDate: string | null;
  applyUrl: string | null;
  status: ModerationStatus;
}
export interface OpportunityInput {
  section: Section;
  type: string;
  title: string;
  organisation: string;
  institutionId: number | null;
  description: string;
  eligibility: string | null;
  amount: string | null;
  location: string | null;
  country: string;
  isRemote: boolean;
  deadline: string | null;
  startDate: string | null;
  applyUrl: string | null;
}

export interface Project {
  id: number;
  slug: string;
  title: string;
  kind: ProjectKind;
  summary: string;
  description?: string | null;
  institution: InstitutionRef | null;
  organisation: string | null;
  region: string | null;
  focusSpecies: string | null;
  projectStatus: 'planned' | 'ongoing' | 'completed';
  startYear: number | null;
  endYear: number | null;
  url: string | null;
  howToJoin: string | null;
  status: ModerationStatus;
}
export interface ProjectInput {
  title: string;
  kind: ProjectKind;
  summary: string;
  description: string | null;
  institutionId: number | null;
  organisation: string | null;
  region: string | null;
  focusSpecies: string | null;
  projectStatus: 'planned' | 'ongoing' | 'completed';
  startYear: number | null;
  endYear: number | null;
  url: string | null;
  howToJoin: string | null;
}

export interface Organisation {
  id: number;
  name: string;
  type: string;
  city: string | null;
  region: string | null;
  country: string;
  website: string | null;
  description: string | null;
  _count: { affiliations: number; projects: number; opportunities: number };
}
export interface OrganisationDetail extends Omit<Organisation, '_count'> {
  affiliations: { role: string | null; profile: { slug: string; fullName: string; honorific: string | null; position: string | null; verificationStatus: string } }[];
  projects: { slug: string; title: string; kind: ProjectKind; projectStatus: string; summary: string }[];
  opportunities: { slug: string; title: string; section: Section; type: string; deadline: string | null }[];
}

interface Submitter {
  submittedBy: { displayName: string; email: string } | null;
  moderationNote: string | null;
  createdAt: string;
}
export interface ModerationQueue {
  events: (EventItem & Submitter)[];
  opportunities: (Opportunity & Submitter)[];
  projects: (Project & Submitter)[];
}

export interface MySubmissions {
  events: { slug: string; title: string; status: ModerationStatus; moderationNote: string | null; createdAt: string }[];
  opportunities: { slug: string; title: string; section: Section; status: ModerationStatus; moderationNote: string | null; createdAt: string }[];
  projects: { slug: string; title: string; status: ModerationStatus; moderationNote: string | null; createdAt: string }[];
}

type Params = Record<string, string | number | boolean | undefined | null>;
const clean = (p: Params) =>
  Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== false)) as Record<string, string | number | boolean>;

@Injectable({ providedIn: 'root' })
export class ContentApi {
  private readonly http = inject(HttpClient);

  // News
  news(p: { category?: string; page?: number }): Observable<Page<NewsSummary>> {
    return this.http.get<Page<NewsSummary>>('/api/news', { params: clean(p) });
  }
  newsPost(slug: string): Observable<NewsPost> {
    return this.http.get<NewsPost>(`/api/news/${slug}`);
  }
  allNews(): Observable<(Pick<NewsPost, 'id' | 'slug' | 'title' | 'category' | 'status' | 'publishedAt'> & { updatedAt: string })[]> {
    return this.http.get<(Pick<NewsPost, 'id' | 'slug' | 'title' | 'category' | 'status' | 'publishedAt'> & { updatedAt: string })[]>('/api/news/admin/all');
  }
  newsById(id: number): Observable<NewsPost> {
    return this.http.get<NewsPost>(`/api/news/admin/${id}`);
  }
  createNews(body: NewsInput): Observable<NewsPost> {
    return this.http.post<NewsPost>('/api/news', body);
  }
  updateNews(id: number, body: NewsInput): Observable<NewsPost> {
    return this.http.put<NewsPost>(`/api/news/${id}`, body);
  }
  deleteNews(id: number): Observable<unknown> {
    return this.http.delete(`/api/news/${id}`);
  }

  // Events
  events(p: { when: 'upcoming' | 'past'; kind?: string; kinds?: string; page?: number }): Observable<Page<EventItem>> {
    return this.http.get<Page<EventItem>>('/api/events', { params: clean(p) });
  }
  event(slug: string): Observable<EventItem> {
    return this.http.get<EventItem>(`/api/events/${slug}`);
  }
  submitEvent(body: EventInput): Observable<{ slug: string; status: ModerationStatus }> {
    return this.http.post<{ slug: string; status: ModerationStatus }>('/api/events', body);
  }

  // Opportunities
  opportunities(p: { section?: Section; type?: string; q?: string; includeClosed?: boolean; page?: number }): Observable<Page<Opportunity>> {
    return this.http.get<Page<Opportunity>>('/api/opportunities', { params: clean(p) });
  }
  opportunity(slug: string): Observable<Opportunity> {
    return this.http.get<Opportunity>(`/api/opportunities/${slug}`);
  }
  submitOpportunity(body: OpportunityInput): Observable<{ slug: string; status: ModerationStatus }> {
    return this.http.post<{ slug: string; status: ModerationStatus }>('/api/opportunities', body);
  }

  // Conservation
  projects(p: { kind?: string; q?: string; page?: number }): Observable<Page<Project>> {
    return this.http.get<Page<Project>>('/api/conservation/projects', { params: clean(p) });
  }
  project(slug: string): Observable<Project> {
    return this.http.get<Project>(`/api/conservation/projects/${slug}`);
  }
  submitProject(body: ProjectInput): Observable<{ slug: string; status: ModerationStatus }> {
    return this.http.post<{ slug: string; status: ModerationStatus }>('/api/conservation/projects', body);
  }

  // Organisations
  organisations(p: { q?: string; type?: string; page?: number }): Observable<Page<Organisation>> {
    return this.http.get<Page<Organisation>>('/api/organisations', { params: clean(p) });
  }
  organisation(id: number): Observable<OrganisationDetail> {
    return this.http.get<OrganisationDetail>(`/api/organisations/${id}`);
  }
  updateOrganisation(id: number, body: Partial<Pick<Organisation, 'name' | 'type' | 'city' | 'region' | 'website' | 'description'>>): Observable<unknown> {
    return this.http.patch(`/api/organisations/${id}`, body);
  }

  // Moderation & submissions
  moderation(status: 'pending' | 'rejected' | 'archived'): Observable<ModerationQueue> {
    return this.http.get<ModerationQueue>('/api/moderation', { params: { status } });
  }
  pendingCount(): Observable<{ pending: number }> {
    return this.http.get<{ pending: number }>('/api/moderation/count');
  }
  moderate(type: 'event' | 'opportunity' | 'project', id: number, decision: 'publish' | 'reject' | 'archive', note?: string): Observable<unknown> {
    return this.http.post(`/api/moderation/${type}/${id}`, { decision, note });
  }
  mySubmissions(): Observable<MySubmissions> {
    return this.http.get<MySubmissions>('/api/me/submissions');
  }
}

/** Split plain text into paragraphs on blank lines. */
export const paragraphs = (text: string | null | undefined) =>
  (text ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length);

/** Days from today until a date (negative when past). */
export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}
