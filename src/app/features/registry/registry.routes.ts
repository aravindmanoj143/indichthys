import { Routes } from '@angular/router';
import { adminGuard, authGuard } from '../../core/guards';

export const ICHTHYOLOGIST_ROUTES: Routes = [
  {
    path: '',
    title: 'Ichthyologists · Indichthys',
    loadComponent: () => import('./pages/directory').then((m) => m.Directory),
  },
  {
    path: ':slug',
    title: 'Ichthyologist · Indichthys',
    loadComponent: () => import('./pages/profile-page').then((m) => m.ProfilePage),
  },
];

export const ACCOUNT_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'profile' },
  {
    path: 'login',
    title: 'Sign in · Indichthys',
    loadComponent: () => import('../account/login').then((m) => m.Login),
  },
  {
    path: 'register',
    title: 'Create account · Indichthys',
    loadComponent: () => import('../account/register').then((m) => m.Register),
  },
  {
    path: 'profile',
    title: 'My profile · Indichthys',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/my-profile').then((m) => m.MyProfilePage),
  },
  {
    path: 'submissions',
    title: 'My submissions · Indichthys',
    canActivate: [authGuard],
    loadComponent: () => import('../content/pages/moderation').then((m) => m.MySubmissionsPage),
  },
  {
    path: 'inbox',
    title: 'Inbox · Indichthys',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/inbox').then((m) => m.Inbox),
  },
];

export const ADMIN_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'verification' },
  {
    path: 'verification',
    title: 'Expert verification · Indichthys',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/admin-verification').then((m) => m.AdminVerification),
  },
];
