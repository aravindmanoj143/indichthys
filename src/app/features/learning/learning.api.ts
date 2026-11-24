import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export const SUBJECTS = {
  ichthyology: 'Ichthyology',
  taxonomy: 'Fish taxonomy',
  identification: 'Fish identification',
  photography: 'Fish photography',
  morphometrics: 'Morphometrics',
  'field-methods': 'Field methods',
  molecular: 'Molecular methods',
} as const;
export type Subject = keyof typeof SUBJECTS;

export const FORMATS = { online: 'Online', 'in-person': 'In person', field: 'Field', blended: 'Blended' } as const;
export const LEVELS = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' } as const;

export interface CourseSummary {
  id: number;
  slug: string;
  title: string;
  summary: string;
  kind: 'indichthys' | 'external';
  subject: Subject;
  format: keyof typeof FORMATS;
  level: keyof typeof LEVELS;
  provider: string;
  url: string | null;
  duration: string | null;
  cost: string | null;
  lessonCount: number;
  questionCount: number;
  lessonsDone: number;
  certificate: string | null;
}

export interface CourseDetail extends Omit<CourseSummary, 'lessonCount' | 'lessonsDone' | 'certificate'> {
  description: string | null;
  passMark: number;
  lessons: { position: number; title: string; done: boolean }[];
  certificate: { code: string; score: number } | null;
}

export interface LessonPage {
  courseTitle: string;
  position: number;
  title: string;
  body: string;
  total: number;
  done: boolean;
}

export interface Quiz {
  title: string;
  passMark: number;
  questions: { id: number; prompt: string; options: { id: number; label: string }[] }[];
}

export interface QuizResult {
  score: number;
  passMark: number;
  passed: boolean;
  certificate: { code: string } | null;
  results: { questionId: number; correct: boolean; correctOptionId: number | null; explanation: string | null }[];
}

export interface CertificateInfo {
  code: string;
  recipientName: string;
  score: number;
  issuedAt: string;
  course: { slug: string; title: string; provider: string };
}

const clean = (p: object) =>
  Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== null && v !== '')) as Record<string, string>;

@Injectable({ providedIn: 'root' })
export class LearningApi {
  private readonly http = inject(HttpClient);

  courses(q: { subject?: string; kind?: string; format?: string; level?: string; q?: string }): Observable<CourseSummary[]> {
    return this.http.get<CourseSummary[]>('/api/learning/courses', { params: clean(q) });
  }
  course(slug: string): Observable<CourseDetail> {
    return this.http.get<CourseDetail>(`/api/learning/courses/${slug}`);
  }
  lesson(slug: string, position: number): Observable<LessonPage> {
    return this.http.get<LessonPage>(`/api/learning/courses/${slug}/lessons/${position}`);
  }
  completeLesson(slug: string, position: number): Observable<unknown> {
    return this.http.post(`/api/learning/courses/${slug}/lessons/${position}/complete`, {});
  }
  quiz(slug: string): Observable<Quiz> {
    return this.http.get<Quiz>(`/api/learning/courses/${slug}/quiz`);
  }
  submitQuiz(slug: string, answers: Record<number, number>): Observable<QuizResult> {
    return this.http.post<QuizResult>(`/api/learning/courses/${slug}/quiz`, { answers });
  }
  certificate(code: string): Observable<CertificateInfo> {
    return this.http.get<CertificateInfo>(`/api/learning/certificates/${code}`);
  }
  myCertificates(): Observable<{ code: string; score: number; issuedAt: string; course: { slug: string; title: string } }[]> {
    return this.http.get<{ code: string; score: number; issuedAt: string; course: { slug: string; title: string } }[]>('/api/learning/me/certificates');
  }
}

/** Lesson text → blocks: paragraphs and bullet lists (lines starting with "- "). */
export type Block = { type: 'p'; text: string } | { type: 'ul'; items: string[] };

export function lessonBlocks(body: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of body.split(/\n\s*\n/)) {
    const lines = chunk.split('\n').map((l) => l.trim()).filter((l) => l);
    let para: string[] = [];
    let list: string[] = [];
    const flushPara = () => {
      if (para.length) blocks.push({ type: 'p', text: para.join(' ') });
      para = [];
    };
    const flushList = () => {
      if (list.length) blocks.push({ type: 'ul', items: list });
      list = [];
    };
    for (const line of lines) {
      if (line.startsWith('- ')) {
        flushPara();
        list.push(line.slice(2));
      } else {
        flushList();
        para.push(line);
      }
    }
    flushPara();
    flushList();
  }
  return blocks;
}
