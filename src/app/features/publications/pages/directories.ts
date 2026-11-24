import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideDownload, lucideExternalLink } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { apiErrorMessage } from '../../../core/api-error';
import { download, formatCitation, toBibTeX, toRIS } from '../citation';
import { KEY_JOURNALS } from '../journals.data';
import { PublicationsApi } from '../publications.api';
import { PublicationCard } from './publication-card';
import { PublicationsNav } from './publications-nav';

/** Scientific journals: curated key journals + journals in the repository. */
@Component({
  selector: 'app-journals',
  imports: [RouterLink, NgIcon, HlmBadgeImports, HlmButtonImports, HlmCardImports, HlmTableImports, PublicationsNav],
  providers: [provideIcons({ lucideExternalLink })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      <app-publications-nav />
      <h2 class="text-lg font-semibold">Key journals</h2>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        @for (j of key; track j.name) {
          <article hlmCard size="sm">
            <div hlmCardHeader>
              <h3 hlmCardTitle>{{ j.name }}</h3>
              <p hlmCardDescription>{{ j.focus }}</p>
            </div>
            <div hlmCardFooter class="mt-auto items-center justify-between gap-2">
              <span class="text-muted-foreground text-xs">{{ j.publisher }}@if (j.openAccess) { · <span hlmBadge variant="outline">open access</span> }</span>
              <a hlmBtn size="sm" variant="outline" [href]="j.url" target="_blank" rel="noopener" [attr.aria-label]="'Visit ' + j.name">Visit <ng-icon name="lucideExternalLink" /></a>
            </div>
          </article>
        }
      </div>

      <h2 class="text-lg font-semibold">Journals in the repository</h2>
      @if (journals.error()) {
        <p class="text-destructive">{{ error(journals.error()) }}</p>
      } @else if (journals.hasValue()) {
        <div hlmTableContainer class="rounded-md border">
          <table hlmTable>
            <thead hlmTHead><tr hlmTr><th hlmTh>Journal</th><th hlmTh class="text-right">Publications</th><th hlmTh class="text-right">Latest</th></tr></thead>
            <tbody hlmTBody>
              @for (j of journals.value(); track j.journal) {
                <tr hlmTr>
                  <td hlmTd><a routerLink="/publications" [queryParams]="{ journal: j.journal }" class="text-primary hover:underline"><em>{{ j.journal }}</em></a></td>
                  <td hlmTd class="text-right tabular-nums">{{ j.count }}</td>
                  <td hlmTd class="text-right tabular-nums">{{ j.latestYear }}</td>
                </tr>
              } @empty {
                <tr hlmTr><td hlmTd colspan="3" class="text-muted-foreground py-6 text-center">No publications yet.</td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
})
export class Journals {
  private readonly api = inject(PublicationsApi);
  protected readonly error = apiErrorMessage;
  protected readonly key = KEY_JOURNALS;
  protected readonly journals = rxResource({ stream: () => this.api.journals() });
}

/** Research topic directory. */
@Component({
  selector: 'app-topics',
  imports: [RouterLink, HlmCardImports, PublicationsNav],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      <app-publications-nav />
      @if (topics.error()) {
        <p class="text-destructive">{{ error(topics.error()) }}</p>
      } @else if (topics.hasValue()) {
        @for (g of groups(); track g.label) {
          <section class="space-y-3">
            <h2 class="text-lg font-semibold">{{ g.label }}</h2>
            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              @for (t of g.items; track t.slug) {
                <div hlmCard size="sm">
                  <div hlmCardHeader>
                    <h3 hlmCardTitle>{{ t.name }}</h3>
                    <p hlmCardDescription class="flex gap-4">
                      <a routerLink="/publications" [queryParams]="{ topic: t.slug }" class="hover:underline">{{ t.publications }} publication{{ t.publications === 1 ? '' : 's' }}</a>
                      <a routerLink="/ichthyologists" [queryParams]="{ expertise: t.slug }" class="hover:underline">{{ t.researchers }} researcher{{ t.researchers === 1 ? '' : 's' }}</a>
                    </p>
                  </div>
                </div>
              }
            </div>
          </section>
        }
      } @else {
        <p class="text-muted-foreground">Loading…</p>
      }
    </section>
  `,
})
export class Topics {
  private readonly api = inject(PublicationsApi);
  protected readonly error = apiErrorMessage;
  protected readonly topics = rxResource({ stream: () => this.api.topics() });
  protected readonly groups = computed(() => {
    const all = this.topics.value() ?? [];
    return [
      { label: 'Disciplines', items: all.filter((t) => t.category === 'discipline') },
      { label: 'Fish groups', items: all.filter((t) => t.category === 'taxon') },
      { label: 'Regions', items: all.filter((t) => t.category === 'region') },
    ];
  });
}

/** My library: saved publications with bibliography export. */
@Component({
  selector: 'app-library',
  imports: [RouterLink, NgIcon, HlmButtonImports, HlmCardImports, PublicationsNav, PublicationCard],
  providers: [provideIcons({ lucideDownload })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      <app-publications-nav />
      @if (lib.error()) {
        <p class="text-destructive">{{ error(lib.error()) }}</p>
      } @else if (lib.hasValue()) {
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-muted-foreground text-sm">{{ lib.value().length }} saved publication{{ lib.value().length === 1 ? '' : 's' }}</p>
          @if (lib.value().length) {
            <div class="flex flex-wrap gap-2">
              <button hlmBtn size="sm" variant="outline" (click)="export('bib')"><ng-icon name="lucideDownload" /> BibTeX</button>
              <button hlmBtn size="sm" variant="outline" (click)="export('ris')"><ng-icon name="lucideDownload" /> RIS (Zotero, EndNote, Mendeley)</button>
              <button hlmBtn size="sm" variant="outline" (click)="export('txt')"><ng-icon name="lucideDownload" /> Reference list</button>
            </div>
          }
        </div>
        <div hlmCard>
          <div hlmCardContent>
            @for (p of lib.value(); track p.id) {
              <app-publication-card [pub]="p" (savedChange)="lib.reload()" />
            } @empty {
              <p class="text-muted-foreground py-6 text-center text-sm">Save publications with the bookmark icon to build your bibliography.
                <a routerLink="/publications" class="text-primary hover:underline">Browse the repository</a></p>
            }
          </div>
        </div>
      } @else {
        <p class="text-muted-foreground">Loading…</p>
      }
    </section>
  `,
})
export class Library {
  private readonly api = inject(PublicationsApi);
  protected readonly error = apiErrorMessage;
  protected readonly lib = rxResource({ stream: () => this.api.library() });

  protected export(kind: 'bib' | 'ris' | 'txt'): void {
    const pubs = this.lib.value() ?? [];
    const stamp = new Date().toISOString().slice(0, 10);
    if (kind === 'bib') download(`indichthys-library-${stamp}.bib`, toBibTeX(pubs), 'application/x-bibtex');
    else if (kind === 'ris') download(`indichthys-library-${stamp}.ris`, toRIS(pubs), 'application/x-research-info-systems');
    else {
      const sorted = [...pubs].sort((a, b) => a.authors.localeCompare(b.authors) || (a.year ?? 0) - (b.year ?? 0));
      download(`indichthys-library-${stamp}.txt`, sorted.map(formatCitation).join('\n\n'), 'text/plain');
    }
  }
}
