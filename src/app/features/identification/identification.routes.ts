import { Routes } from '@angular/router';

export const IDENTIFICATION_ROUTES: Routes = [
  {
    path: '',
    title: 'Identification · Indichthys',
    loadComponent: () => import('./pages/identification-hub').then((m) => m.IdentificationHub),
  },
  {
    path: 'taxa',
    title: 'Key identification · Indichthys',
    loadComponent: () => import('./pages/key-identification').then((m) => m.KeyIdentification),
  },
  // Former pages, merged into key identification.
  { path: 'characters', redirectTo: 'taxa' },
  { path: 'keys/:slug', redirectTo: 'taxa' },
  {
    path: 'guides/:slug',
    title: 'Regional guide · Indichthys',
    loadComponent: () => import('./pages/guide-detail').then((m) => m.GuideDetail),
  },
  {
    path: 'requests',
    title: 'Identification requests · Indichthys',
    loadComponent: () => import('./pages/request-list').then((m) => m.RequestList),
  },
  {
    path: 'requests/new',
    title: 'New identification request · Indichthys',
    loadComponent: () => import('./pages/request-new').then((m) => m.RequestNew),
  },
  {
    path: 'requests/:id',
    title: 'Identification request · Indichthys',
    loadComponent: () => import('./pages/request-detail').then((m) => m.RequestDetail),
  },
];
