import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards';

export const PUBLICATION_ROUTES: Routes = [
  { path: '', title: 'Publications · Indichthys', loadComponent: () => import('./pages/repository').then((m) => m.Repository) },
  { path: 'journals', title: 'Journals · Indichthys', loadComponent: () => import('./pages/directories').then((m) => m.Journals) },
  { path: 'topics', title: 'Research topics · Indichthys', loadComponent: () => import('./pages/directories').then((m) => m.Topics) },
  { path: 'library', title: 'My library · Indichthys', canActivate: [authGuard], loadComponent: () => import('./pages/directories').then((m) => m.Library) },
  { path: 'add', title: 'Add a publication · Indichthys', canActivate: [authGuard], loadComponent: () => import('./pages/publication-form').then((m) => m.PublicationForm) },
  { path: ':id', title: 'Publication · Indichthys', loadComponent: () => import('./pages/publication-detail').then((m) => m.PublicationDetailPage) },
  { path: ':id/edit', title: 'Edit publication · Indichthys', canActivate: [authGuard], loadComponent: () => import('./pages/publication-form').then((m) => m.PublicationForm) },
];
