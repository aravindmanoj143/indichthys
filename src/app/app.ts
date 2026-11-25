import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideClipboardCheck, lucideInbox, lucideLogOut, lucideMenu, lucideShieldCheck, lucideUser, lucideX } from '@ng-icons/lucide';
import { catchError, filter, map, of } from 'rxjs';
import { AuthService } from './core/auth.service';
import { MAIN_NAV, NavItem, sectionForUrl } from './core/navigation';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIcon],
  providers: [provideIcons({ lucideUser, lucideInbox, lucideLogOut, lucideShieldCheck, lucideClipboardCheck, lucideMenu, lucideX })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly nav = MAIN_NAV;
  protected readonly year = new Date().getFullYear();

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly activeSection = computed(() => sectionForUrl(this.url()));

  /** Mobile navigation drawer; closes on every navigation. */
  protected readonly menuOpen = signal(false);
  private readonly closeMenuOnNavigate = effect(() => {
    this.url();
    this.menuOpen.set(false);
  });

  /** Pending moderation items (admins), refreshed on navigation. */
  private readonly http = inject(HttpClient);
  protected readonly pending = rxResource({
    params: () => (this.auth.isAdmin() ? this.url() : undefined),
    stream: () =>
      this.http.get<{ pending: number }>('/api/moderation/count').pipe(
        map((r) => r.pending),
        catchError(() => of(0)),
      ),
  });

  protected signOut(): void {
    this.auth.logout().subscribe(() => this.router.navigateByUrl('/'));
  }

  protected loginParams(): Record<string, string> {
    const url = this.url();
    return url.startsWith('/account/') ? {} : { next: url };
  }

  protected sectionLink(item: NavItem): string | string[] {
    return item.route ?? ['/section', item.label.toLowerCase()];
  }
}
