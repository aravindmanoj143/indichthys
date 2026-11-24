import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

const API = '/api/registry';

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';
export type ExpertiseCategory = 'discipline' | 'taxon' | 'region';
export type ContactKind = 'contact' | 'collaboration' | 'identification' | 'student';
export type InstitutionType = 'university' | 'research-institute' | 'museum' | 'government' | 'ngo' | 'other';

export interface ExpertiseArea {
  id?: number;
  slug: string;
  name: string;
  category: ExpertiseCategory;
}

export interface Institution {
  id: number;
  name: string;
  type: InstitutionType;
  city: string | null;
  region: string | null;
  country: string;
  website: string | null;
}

export interface Affiliation {
  id: number;
  role: string | null;
  department: string | null;
  startYear: number | null;
  endYear: number | null;
  isCurrent: boolean;
  institution: Institution;
}

export interface Publication {
  id: number;
  title: string;
  authors: string;
  year: number | null;
  journal: string | null;
  volume: string | null;
  pages: string | null;
  doi: string | null;
  url: string | null;
  type: string;
}

export interface Contributions {
  proposals: number;
  verifiedIdentifications: number;
  reviews: number;
}

export interface Profile {
  id: number;
  slug: string;
  fullName: string;
  honorific: string | null;
  position: string | null;
  bio: string | null;
  country: string;
  region: string | null;
  city: string | null;
  website: string | null;
  orcid: string | null;
  googleScholar: string | null;
  researchGate: string | null;
  acceptingCollaboration: boolean;
  acceptingStudents: boolean;
  isDemo: boolean;
  verificationStatus: VerificationStatus;
  verifiedAt: string | null;
  createdAt: string;
  expertise: ExpertiseArea[];
  interests: string[];
  affiliations: Affiliation[];
  publications: Publication[];
  contributions: Contributions;
  isOwn?: boolean;
  canReceiveMessages?: boolean;
}

/** The owner's view adds private fields. */
export interface MyProfile extends Profile {
  contactEmail: string | null;
  isPublic: boolean;
  verificationEvidence: string | null;
}

export interface DirectoryEntry {
  slug: string;
  fullName: string;
  honorific: string | null;
  position: string | null;
  region: string | null;
  country: string;
  verificationStatus: VerificationStatus;
  acceptingCollaboration: boolean;
  isDemo: boolean;
  expertise: ExpertiseArea[];
  interests: string[];
  institution: string | null;
}

export interface DirectoryPage {
  total: number;
  page: number;
  pageSize: number;
  regions: string[];
  items: DirectoryEntry[];
}

export interface DirectoryQuery {
  q?: string;
  expertise?: string;
  region?: string;
  verified?: boolean;
  collaboration?: boolean;
  page?: number;
}

export interface AffiliationInput {
  institution: { id: number } | { name: string; type: InstitutionType; city?: string | null; region?: string | null; country?: string };
  role?: string | null;
  department?: string | null;
  startYear?: number | null;
  endYear?: number | null;
  isCurrent: boolean;
}

export interface ProfileInput {
  fullName: string;
  honorific?: string | null;
  position?: string | null;
  bio?: string | null;
  country: string;
  region?: string | null;
  city?: string | null;
  contactEmail?: string | null;
  website?: string | null;
  orcid?: string | null;
  googleScholar?: string | null;
  researchGate?: string | null;
  acceptingCollaboration: boolean;
  acceptingStudents: boolean;
  isPublic: boolean;
  expertise: string[];
  interests: string[];
  affiliations: AffiliationInput[];
}

export type PublicationInput = Omit<Publication, 'id'>;

export interface ContactMessage {
  id: number;
  senderName: string;
  senderEmail: string;
  kind: ContactKind;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'archived';
  createdAt: string;
}

export interface VerificationCandidate {
  id: number;
  slug: string;
  fullName: string;
  honorific: string | null;
  position: string | null;
  orcid: string | null;
  website: string | null;
  verificationStatus: VerificationStatus;
  verificationEvidence: string | null;
  updatedAt: string;
  user: { email: string } | null;
  affiliations: { institution: { name: string } }[];
  authorships: { publication: { title: string; year: number | null; doi: string | null } }[];
  verification: { action: string; note: string | null; createdAt: string }[];
}

export const CONTACT_KIND_LABELS: Record<ContactKind, string> = {
  contact: 'General enquiry',
  collaboration: 'Research collaboration',
  identification: 'Help with an identification',
  student: 'Student / supervision',
};

export const INSTITUTION_TYPE_LABELS: Record<InstitutionType, string> = {
  university: 'University',
  'research-institute': 'Research institute',
  museum: 'Museum',
  government: 'Government agency',
  ngo: 'NGO',
  other: 'Other',
};

@Injectable({ providedIn: 'root' })
export class RegistryApi {
  private readonly http = inject(HttpClient);

  expertise(): Observable<ExpertiseArea[]> {
    return this.http.get<ExpertiseArea[]>(`${API}/expertise`);
  }
  institutions(q: string): Observable<Institution[]> {
    return this.http.get<Institution[]>(`${API}/institutions`, { params: { q } });
  }

  directory(query: DirectoryQuery): Observable<DirectoryPage> {
    const params: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== '' && v !== false) params[k] = v;
    return this.http.get<DirectoryPage>(`${API}/ichthyologists`, { params });
  }
  profile(slug: string): Observable<Profile> {
    return this.http.get<Profile>(`${API}/ichthyologists/${slug}`);
  }
  contact(slug: string, body: { senderName: string; senderEmail: string; kind: ContactKind; subject: string; message: string }) {
    return this.http.post(`${API}/ichthyologists/${slug}/contact`, body);
  }

  myProfile(): Observable<MyProfile | null> {
    return this.http.get<{ profile: MyProfile | null }>(`${API}/me/profile`).pipe(map((r) => r.profile));
  }
  saveProfile(body: ProfileInput): Observable<{ slug: string }> {
    return this.http.put<{ slug: string }>(`${API}/me/profile`, body);
  }
  addPublication(body: PublicationInput): Observable<Publication> {
    return this.http.post<Publication>(`${API}/me/publications`, body);
  }
  removePublication(id: number): Observable<unknown> {
    return this.http.delete(`${API}/me/publications/${id}`);
  }
  requestVerification(evidence: string): Observable<unknown> {
    return this.http.post(`${API}/me/verification`, { evidence });
  }

  inbox(status?: 'new' | 'read' | 'archived'): Observable<{ items: ContactMessage[]; unread: number }> {
    return this.http.get<{ items: ContactMessage[]; unread: number }>(`${API}/me/inbox`, { params: status ? { status } : {} });
  }
  setMessageStatus(id: number, status: 'new' | 'read' | 'archived'): Observable<unknown> {
    return this.http.patch(`${API}/me/inbox/${id}`, { status });
  }

  verificationQueue(status: VerificationStatus = 'pending'): Observable<VerificationCandidate[]> {
    return this.http.get<VerificationCandidate[]>(`${API}/admin/verification`, { params: { status } });
  }
  decide(profileId: number, decision: 'verify' | 'reject' | 'revoke', note?: string): Observable<unknown> {
    return this.http.post(`${API}/admin/verification/${profileId}`, { decision, note });
  }
}

/** "RANDALL" → "Randall", "de PINNA" → "de Pinna"; leaves normally-cased names alone. */
export function fixCaps(name: string): string {
  return name === name.toUpperCase() && /[A-Z]{2}/.test(name)
    ? name.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, sep: string, c: string) => sep + c.toUpperCase())
    : name;
}

/** Publication metadata from Crossref by DOI (public API; only the DOI is sent). */
export function crossrefLookup(http: HttpClient, doi: string): Observable<Partial<PublicationInput> & { issue?: string | null }> {
  const clean = doi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
  return http.get<{ message: CrossrefWork }>(`https://api.crossref.org/works/${encodeURIComponent(clean)}`).pipe(
    map(({ message: m }) => ({
      doi: clean.toLowerCase(),
      title: (m.title?.[0] ?? '').replace(/\s+/g, ' ').trim(),
      authors: (m.author ?? [])
        .map((a) => [a.family ? fixCaps(a.family) : '', a.given?.split(/[\s.-]+/).filter((g) => g).map((g) => g[0]!.toUpperCase()).join('')].filter(Boolean).join(' '))
        .join(', '),
      year: m.issued?.['date-parts']?.[0]?.[0] ?? null,
      journal: m['container-title']?.[0] ?? null,
      volume: m.volume ?? null,
      issue: m.issue ?? null,
      pages: m.page ?? null,
      // A DOI already links to the paper, so no separate URL.
      url: null,
      type: m.type === 'book' ? 'book' : m.type === 'book-chapter' ? 'chapter' : m.type === 'report' ? 'report' : 'article',
    })),
  );
}

interface CrossrefWork {
  title?: string[];
  author?: { given?: string; family?: string }[];
  issued?: { 'date-parts'?: number[][] };
  'container-title'?: string[];
  volume?: string;
  issue?: string;
  page?: string;
  URL?: string;
  type?: string;
}
