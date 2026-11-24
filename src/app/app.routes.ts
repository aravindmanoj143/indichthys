import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'taxonomy' },
  {
    path: 'taxonomy',
    loadChildren: () => import('./features/taxonomy/taxonomy.routes').then((m) => m.TAXONOMY_ROUTES),
  },
  {
    path: 'identification',
    loadChildren: () =>
      import('./features/identification/identification.routes').then((m) => m.IDENTIFICATION_ROUTES),
  },
  {
    path: 'ichthyologists',
    loadChildren: () => import('./features/registry/registry.routes').then((m) => m.ICHTHYOLOGIST_ROUTES),
  },
  {
    path: 'account',
    loadChildren: () => import('./features/registry/registry.routes').then((m) => m.ACCOUNT_ROUTES),
  },
  {
    path: 'admin',
    loadChildren: () =>
      Promise.all([import('./features/registry/registry.routes'), import('./features/content/content.routes')]).then(([r, c]) => [
        ...r.ADMIN_ROUTES,
        ...c.CONTENT_ADMIN_ROUTES,
      ]),
  },
  { path: 'news', loadChildren: () => import('./features/content/content.routes').then((m) => m.NEWS_ROUTES) },
  { path: 'events', loadChildren: () => import('./features/content/content.routes').then((m) => m.EVENT_ROUTES) },
  { path: 'learning', loadChildren: () => import('./features/learning/learning.routes').then((m) => m.LEARNING_ROUTES) },
  { path: 'workshops', loadChildren: () => import('./features/content/content.routes').then((m) => m.WORKSHOP_ROUTES) },
  { path: 'publications', loadChildren: () => import('./features/publications/publications.routes').then((m) => m.PUBLICATION_ROUTES) },
  {
    path: 'tools',
    title: 'Research tools · Indichthys',
    loadComponent: () => import('./features/tools/research-tools').then((m) => m.ResearchTools),
  },
  { path: 'specimens', loadChildren: () => import('./features/content/content.routes').then((m) => m.SPECIMEN_ROUTES) },
  // Grants, jobs, fellowships, opportunities/*, conservation, threatened, organisations (top-level paths).
  { path: '', loadChildren: () => import('./features/content/content.routes').then((m) => m.OPPORTUNITY_ROUTES) },
  { path: '', loadChildren: () => import('./features/content/content.routes').then((m) => m.CONSERVATION_ROUTES) },
  {
    path: 'section/:section',
    title: 'Coming soon · Indichthys',
    loadComponent: () => import('./shared/coming-soon').then((m) => m.ComingSoon),
  },
  { path: '**', redirectTo: 'taxonomy' },
];
