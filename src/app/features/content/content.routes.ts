import { Routes } from '@angular/router';
import { adminGuard, authGuard } from '../../core/guards';

const opportunityList = () => import('./pages/opportunities').then((m) => m.Opportunities);

export const NEWS_ROUTES: Routes = [
  { path: '', title: 'News · Indichthys', loadComponent: () => import('./pages/news-list').then((m) => m.NewsList) },
  { path: ':slug', title: 'News · Indichthys', loadComponent: () => import('./pages/news-detail').then((m) => m.NewsDetail) },
];

/** Learning → Workshops: the events list limited to training formats. */
export const WORKSHOP_ROUTES: Routes = [
  {
    path: '',
    title: 'Workshops & field training · Indichthys',
    loadComponent: () => import('./pages/events').then((m) => m.Events),
    data: {
      crumb: 'Learning',
      heading: 'Workshops & field training',
      intro: 'Hands-on workshops, field courses and webinars on fish taxonomy, identification and field methods. Organisers can add their own.',
      kinds: 'workshop,field-course,webinar',
    },
  },
];

export const EVENT_ROUTES: Routes = [
  { path: '', title: 'Events · Indichthys', loadComponent: () => import('./pages/events').then((m) => m.Events) },
  { path: 'submit', title: 'Add an event · Indichthys', canActivate: [authGuard], loadComponent: () => import('./pages/events').then((m) => m.EventSubmit) },
  { path: ':slug', title: 'Event · Indichthys', loadComponent: () => import('./pages/events').then((m) => m.EventDetail) },
];

/** Grants, Jobs and Fellowships share one listing page, configured by route data. */
export const OPPORTUNITY_ROUTES: Routes = [
  {
    path: 'grants',
    title: 'Grants & funding · Indichthys',
    loadComponent: opportunityList,
    data: {
      section: 'funding',
      heading: 'Grants & funding',
      intro: 'Research grants, conservation and CSR funding, government schemes, funded projects and proposal-writing resources.',
    },
  },
  {
    path: 'jobs',
    title: 'Jobs · Indichthys',
    loadComponent: opportunityList,
    data: {
      section: 'jobs',
      heading: 'Jobs & positions',
      intro: 'Ichthyology jobs, research assistant and field biologist posts, PhD and postdoctoral positions, internships and volunteering.',
    },
  },
  {
    path: 'fellowships',
    title: 'Fellowships · Indichthys',
    loadComponent: opportunityList,
    data: { fixedType: 'fellowship', heading: 'Fellowships', intro: 'Research and study fellowships in ichthyology and freshwater conservation.' },
  },
  {
    path: 'opportunities/submit',
    title: 'Post an opportunity · Indichthys',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/opportunities').then((m) => m.OpportunitySubmit),
  },
  {
    path: 'opportunities/:slug',
    title: 'Opportunity · Indichthys',
    loadComponent: () => import('./pages/opportunities').then((m) => m.OpportunityDetail),
  },
];

export const CONSERVATION_ROUTES: Routes = [
  { path: 'conservation', title: 'Conservation · Indichthys', loadComponent: () => import('./pages/conservation').then((m) => m.Conservation) },
  {
    path: 'conservation/submit',
    title: 'Add a project · Indichthys',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/conservation').then((m) => m.ProjectSubmit),
  },
  { path: 'conservation/:slug', title: 'Conservation project · Indichthys', loadComponent: () => import('./pages/conservation').then((m) => m.ProjectDetail) },
  { path: 'threatened', title: 'Threatened species · Indichthys', loadComponent: () => import('./pages/conservation').then((m) => m.Threatened) },
  { path: 'organisations', title: 'Organisations · Indichthys', loadComponent: () => import('./pages/organisations').then((m) => m.Organisations) },
  { path: 'organisations/:id', title: 'Organisation · Indichthys', loadComponent: () => import('./pages/organisations').then((m) => m.OrganisationDetail) },
];

export const CONTENT_ADMIN_ROUTES: Routes = [
  { path: 'moderation', title: 'Moderation · Indichthys', canActivate: [adminGuard], loadComponent: () => import('./pages/moderation').then((m) => m.Moderation) },
  { path: 'news', title: 'News posts · Indichthys', canActivate: [adminGuard], loadComponent: () => import('./pages/news-admin').then((m) => m.NewsAdmin) },
  { path: 'news/:id', title: 'Edit post · Indichthys', canActivate: [adminGuard], loadComponent: () => import('./pages/news-admin').then((m) => m.NewsEditor) },
];

export const SPECIMEN_ROUTES: Routes = [
  { path: '', title: 'Specimens · Indichthys', loadComponent: () => import('../specimens/pages/specimen-search').then((m) => m.SpecimenSearch) },
  { path: ':key', title: 'Specimen · Indichthys', loadComponent: () => import('../specimens/pages/specimen-detail').then((m) => m.SpecimenDetail) },
];
