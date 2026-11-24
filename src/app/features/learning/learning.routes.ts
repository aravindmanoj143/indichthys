import { Routes } from '@angular/router';

export const LEARNING_ROUTES: Routes = [
  { path: '', title: 'Courses · Indichthys', loadComponent: () => import('./pages/catalogue').then((m) => m.LearningCatalogue) },
  { path: 'certificates/:code', title: 'Certificate · Indichthys', loadComponent: () => import('./pages/certificate').then((m) => m.CertificatePage) },
  { path: ':slug', title: 'Course · Indichthys', loadComponent: () => import('./pages/course').then((m) => m.CoursePage) },
  { path: ':slug/lessons/:position', title: 'Lesson · Indichthys', loadComponent: () => import('./pages/lesson').then((m) => m.LessonPageComponent) },
  { path: ':slug/quiz', title: 'Assessment · Indichthys', loadComponent: () => import('./pages/quiz').then((m) => m.QuizPage) },
];
