import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, switchMap, tap } from 'rxjs';

export interface CurrentUser {
  id: number;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  profile: { id: number; slug: string; fullName: string; verificationStatus: string } | null;
}

/** Signed-in user (session cookie). `undefined` = not loaded yet, `null` = signed out. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly state = signal<CurrentUser | null | undefined>(undefined);

  /**
   * Public sign-in features (Sign in links, "sign in to…" prompts, account sign-up).
   * While false they are hidden; /account/login still works by URL so admins can sign in.
   */
  readonly signInEnabled = false;

  readonly user = this.state.asReadonly();
  readonly loaded = computed(() => this.state() !== undefined);
  readonly signedIn = computed(() => !!this.state());
  readonly isAdmin = computed(() => this.state()?.role === 'admin');
  readonly isVerifiedExpert = computed(() => this.state()?.profile?.verificationStatus === 'verified');

  /** Load (or reload) the current user. Never errors: an unreachable API means signed out. */
  refresh(): Observable<CurrentUser | null> {
    return this.http.get<{ user: CurrentUser | null }>('/api/auth/me').pipe(
      map((r) => r.user),
      catchError(() => of(null)),
      tap((u) => this.state.set(u)),
    );
  }

  login(email: string, password: string): Observable<CurrentUser | null> {
    return this.http.post('/api/auth/login', { email, password }).pipe(switchMap(() => this.refresh()));
  }

  register(displayName: string, email: string, password: string): Observable<unknown> {
    return this.http.post('/api/auth/register', { displayName, email, password }).pipe(switchMap(() => this.refresh()));
  }

  logout(): Observable<unknown> {
    return this.http.post('/api/auth/logout', {}).pipe(tap(() => this.state.set(null)));
  }

  changePassword(currentPassword: string, newPassword: string): Observable<unknown> {
    return this.http.post('/api/auth/password', { currentPassword, newPassword });
  }
}
