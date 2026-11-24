import { Routes } from '@angular/router';

export const TAXONOMY_ROUTES: Routes = [
  {
    path: '',
    title: 'Taxonomy · Indichthys',
    loadComponent: () => import('./pages/taxonomy-overview').then((m) => m.TaxonomyOverview),
  },
  {
    path: 'species/:key',
    title: 'Species · Indichthys',
    loadComponent: () => import('./pages/species-detail').then((m) => m.SpeciesDetail),
  },
];
