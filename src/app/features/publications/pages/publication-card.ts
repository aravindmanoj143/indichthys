import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBookmark, lucideBookmarkCheck, lucideExternalLink } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { AuthService } from '../../../core/auth.service';
import { PUBLICATION_TYPES, PublicationItem, PublicationsApi } from '../publications.api';

/** One publication in a list, with a save-to-library toggle. */
@Component({
  selector: 'app-publication-card',
  imports: [RouterLink, NgIcon, HlmBadgeImports, HlmButtonImports],
  providers: [provideIcons({ lucideBookmark, lucideBookmarkCheck, lucideExternalLink })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @let p = pub();
    <article class="flex gap-3 border-b py-4 last:border-b-0">
      <div class="min-w-0 flex-1 space-y-1">
        <p class="flex flex-wrap items-center gap-2 text-xs">
          <span hlmBadge variant="secondary">{{ types[p.type] }}</span>
          @if (p.year) { <span class="text-muted-foreground">{{ p.year }}</span> }
        </p>
        <h3 class="font-medium"><a [routerLink]="['/publications', p.id]" class="hover:underline">{{ p.title }}</a></h3>
        <p class="text-muted-foreground text-sm">{{ p.authors }}</p>
        <p class="text-muted-foreground text-sm">
          @if (p.journal) { <em>{{ p.journal }}</em>@if (p.volume) { {{ ' ' + p.volume }}@if (p.issue) {({{ p.issue }})} }@if (p.pages) {: {{ p.pages }}} }
          @else if (p.publisher) { {{ p.publisher }} }
          @if (p.doi) { <a class="text-primary ml-2 hover:underline" [href]="'https://doi.org/' + p.doi" target="_blank" rel="noopener">doi:{{ p.doi }}</a> }
        </p>
        @if (p.taxa.length || p.topics.length) {
          <p class="flex flex-wrap gap-1.5 pt-1">
            @for (t of p.taxa; track t.gbifKey) {
              <a hlmBadge variant="outline" [routerLink]="['/taxonomy/species', t.gbifKey]"><em>{{ t.scientificName }}</em></a>
            }
            @for (t of p.topics; track t.slug) {
              <a hlmBadge variant="outline" routerLink="/publications" [queryParams]="{ topic: t.slug }">{{ t.name }}</a>
            }
          </p>
        }
      </div>
      @if (auth.signedIn()) {
        <button hlmBtn variant="ghost" size="icon-sm" [attr.aria-pressed]="saved()" [attr.aria-label]="saved() ? 'Remove from my library' : 'Save to my library'"
          [title]="saved() ? 'In my library' : 'Save to my library'" (click)="toggle()">
          <ng-icon [name]="saved() ? 'lucideBookmarkCheck' : 'lucideBookmark'" [class.text-primary]="saved()" />
        </button>
      }
    </article>
  `,
})
export class PublicationCard implements OnInit {
  private readonly api = inject(PublicationsApi);
  protected readonly auth = inject(AuthService);
  protected readonly types = PUBLICATION_TYPES;
  readonly pub = input.required<PublicationItem>();
  readonly savedChange = output<boolean>();
  protected readonly saved = signal(false);

  ngOnInit(): void {
    this.saved.set(this.pub().saved);
  }

  protected toggle(): void {
    const next = !this.saved();
    this.saved.set(next);
    this.api.save(this.pub().id, next).subscribe({
      next: () => this.savedChange.emit(next),
      error: () => this.saved.set(!next),
    });
  }
}
