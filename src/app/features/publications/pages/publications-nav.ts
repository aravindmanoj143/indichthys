import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlus } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { AuthService } from '../../../core/auth.service';

/** Header + sub-sections shared by the publication pages. */
@Component({
  selector: 'app-publications-nav',
  imports: [RouterLink, RouterLinkActive, NgIcon, HlmButtonImports],
  providers: [provideIcons({ lucidePlus })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block space-y-4' },
  template: `
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div class="space-y-1">
        <p class="text-muted-foreground text-sm">Research</p>
        <h1 class="text-3xl font-semibold tracking-tight">Publications</h1>
        <p class="text-muted-foreground max-w-3xl">Papers, species descriptions, taxonomic revisions, reports, books and field guides on fishes.</p>
      </div>
      @if (auth.signedIn() || auth.signInEnabled) {
        <a hlmBtn [routerLink]="auth.signedIn() ? '/publications/add' : '/account/login'" [queryParams]="auth.signedIn() ? {} : { next: '/publications/add' }">
          <ng-icon name="lucidePlus" /> Add a publication
        </a>
      }
    </header>
    <nav class="bg-muted inline-flex flex-wrap gap-1 rounded-lg p-1 text-sm" aria-label="Publications">
      @for (l of links; track l.path) {
        <a [routerLink]="l.path" routerLinkActive="bg-background text-foreground shadow-sm" [routerLinkActiveOptions]="{ exact: true }"
          class="text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5">{{ l.label }}</a>
      }
    </nav>
  `,
})
export class PublicationsNav {
  protected readonly auth = inject(AuthService);
  protected readonly links = [
    { path: '/publications', label: 'Repository' },
    { path: '/publications/journals', label: 'Journals' },
    { path: '/publications/topics', label: 'Research topics' },
    { path: '/publications/library', label: 'My library' },
  ];
}
