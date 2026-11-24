import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards';

export const OBSERVATION_ROUTES: Routes = [
  { path: '', title: 'Observations · Indichthys', loadComponent: () => import('./pages/observation-list').then((m) => m.ObservationList) },
  {
    // Open to guests: they give a name (and optionally an email) instead of signing in.
    path: 'new',
    title: 'Add an observation · Indichthys',
    loadComponent: () => import('./pages/observation-form').then((m) => m.ObservationForm),
  },
  { path: ':id', title: 'Observation · Indichthys', loadComponent: () => import('./pages/observation-detail').then((m) => m.ObservationDetail) },
  {
    path: ':id/edit',
    title: 'Edit observation · Indichthys',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/observation-form').then((m) => m.ObservationForm),
  },
];
