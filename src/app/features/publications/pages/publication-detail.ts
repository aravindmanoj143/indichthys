import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, numberAttribute, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideBookmark, lucideBookmarkCheck, lucideCopy, lucideDownload, lucideExternalLink, lucidePenLine, lucideTrash2, lucideUserCheck } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { apiErrorMessage } from '../../../core/api-error';
import { AuthService } from '../../../core/auth.service';
import { Paragraphs } from '../../content/components/shared';
import { displayName } from '../../registry/display-name';
import { bibtexKey, download, formatCitation, toBibTeX, toRIS } from '../citation';
import { PUBLICATION_TYPES, PublicationsApi } from '../publications.api';

type Format = 'citation' | 'bibtex' | 'ris';

@Component({
  selector: 'app-publication-detail',
  imports: [DatePipe, RouterLink, NgIcon, HlmBadgeImports, HlmButtonImports, HlmCardImports, Paragraphs],
  providers: [provideIcons({ lucideArrowLeft, lucideExternalLink, lucideCopy, lucideDownload, lucideBookmark, lucideBookmarkCheck, lucidePenLine, lucideTrash2, lucideUserCheck })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a hlmBtn variant="ghost" size="sm" routerLink="/publications" class="mb-4 -ml-2"><ng-icon name="lucideArrowLeft" /> Publications</a>
    @if (pub.error()) {
      <p class="text-destructive">{{ error(pub.error()) }}</p>
    } @else if (pub.hasValue()) {
      @let p = pub.value();
      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <article class="space-y-6">
          <header class="space-y-2">
            <p class="flex flex-wrap items-center gap-2 text-sm"><span hlmBadge variant="secondary">{{ types[p.type] }}</span>
              @if (p.year) { <span class="text-muted-foreground">{{ p.year }}</span> }</p>
            <h1 class="text-2xl font-semibold tracking-tight">{{ p.title }}</h1>
            <p>{{ p.authors }}</p>
            <p class="text-muted-foreground">
              @if (p.journal) {
                <a routerLink="/publications" [queryParams]="{ journal: p.journal }" class="hover:underline"><em>{{ p.journal }}</em></a>
                @if (p.volume) { {{ ' ' + p.volume }}@if (p.issue) {({{ p.issue }})} }@if (p.pages) {: {{ p.pages }}}
              }
              @if (p.publisher) { <span>{{ p.journal ? ' · ' : '' }}{{ p.publisher }}</span> }
            </p>
            <div class="flex flex-wrap gap-2 pt-1">
              @if (p.doi) { <a hlmBtn size="sm" [href]="'https://doi.org/' + p.doi" target="_blank" rel="noopener">doi:{{ p.doi }} <ng-icon name="lucideExternalLink" /></a> }
              @else if (p.url) { <a hlmBtn size="sm" [href]="p.url" target="_blank" rel="noopener">Open <ng-icon name="lucideExternalLink" /></a> }
              @if (auth.signedIn()) {
                <button hlmBtn size="sm" variant="outline" (click)="toggleSave()">
                  <ng-icon [name]="saved() ? 'lucideBookmarkCheck' : 'lucideBookmark'" /> {{ saved() ? 'In my library' : 'Save to my library' }}
                </button>
              }
            </div>
          </header>

          @if (p.abstract) {
            <section><h2 class="mb-2 text-lg font-semibold">Abstract</h2><app-paragraphs [text]="p.abstract" /></section>
          }

          <section hlmCard size="sm">
            <div hlmCardHeader>
              <h2 hlmCardTitle>Cite</h2>
              <div hlmCardAction class="flex gap-1">
                @for (f of formats; track f[0]) {
                  <button hlmBtn size="xs" [variant]="format() === f[0] ? 'default' : 'ghost'" (click)="format.set(f[0])">{{ f[1] }}</button>
                }
              </div>
            </div>
            <div hlmCardContent>
              <pre class="bg-muted overflow-x-auto rounded-md p-3 text-xs whitespace-pre-wrap">{{ citationText() }}</pre>
            </div>
            <div hlmCardFooter class="gap-2">
              <button hlmBtn size="sm" variant="outline" (click)="copy()"><ng-icon name="lucideCopy" /> {{ copied() ? 'Copied' : 'Copy' }}</button>
              @if (format() !== 'citation') {
                <button hlmBtn size="sm" variant="ghost" (click)="save()"><ng-icon name="lucideDownload" /> Download .{{ format() === 'bibtex' ? 'bib' : 'ris' }}</button>
              }
            </div>
          </section>
        </article>

        <aside class="space-y-4">
          @if (p.profiles.length || auth.user()?.profile) {
            <div hlmCard size="sm">
              <div hlmCardHeader><h2 hlmCardTitle>Authors on Indichthys</h2></div>
              <div hlmCardContent class="space-y-3 text-sm">
                <ul class="space-y-1">
                  @for (a of p.profiles; track a.slug) {
                    <li><a [routerLink]="['/ichthyologists', a.slug]" class="text-primary hover:underline">{{ name(a) }}</a></li>
                  } @empty { <li class="text-muted-foreground">No linked profiles.</li> }
                </ul>
                @if (auth.user()?.profile) {
                  <button hlmBtn size="sm" variant="outline" (click)="toggleClaim()">
                    <ng-icon name="lucideUserCheck" /> {{ p.isAuthor ? 'Remove me as an author' : "I'm an author" }}
                  </button>
                }
              </div>
            </div>
          }
          @if (p.taxa.length) {
            <div hlmCard size="sm">
              <div hlmCardHeader><h2 hlmCardTitle>Species</h2></div>
              <div hlmCardContent><ul class="space-y-1 text-sm">
                @for (t of p.taxa; track t.gbifKey) {
                  <li><a [routerLink]="['/taxonomy/species', t.gbifKey]" class="text-primary hover:underline"><em>{{ t.scientificName }}</em></a>
                    <a routerLink="/publications" [queryParams]="{ taxon: t.gbifKey }" class="text-muted-foreground ml-2 text-xs hover:underline">other papers</a></li>
                }
              </ul></div>
            </div>
          }
          @if (p.topics.length) {
            <div hlmCard size="sm">
              <div hlmCardHeader><h2 hlmCardTitle>Topics</h2></div>
              <div hlmCardContent class="flex flex-wrap gap-1.5">
                @for (t of p.topics; track t.slug) { <a hlmBadge variant="secondary" routerLink="/publications" [queryParams]="{ topic: t.slug }">{{ t.name }}</a> }
              </div>
            </div>
          }
          <p class="text-muted-foreground text-xs">
            Added {{ p.addedBy ? 'by ' + p.addedBy : '' }} · updated {{ p.updatedAt | date: 'mediumDate' }} · in {{ p.savedCount }} librar{{ p.savedCount === 1 ? 'y' : 'ies' }}
          </p>
          <div class="flex gap-2">
            @if (p.canEdit) { <a hlmBtn size="sm" variant="outline" [routerLink]="['/publications', p.id, 'edit']"><ng-icon name="lucidePenLine" /> Edit</a> }
            @if (auth.isAdmin()) { <button hlmBtn size="sm" variant="ghost" class="text-destructive" (click)="remove()"><ng-icon name="lucideTrash2" /> Delete</button> }
          </div>
          @if (actionError()) { <p class="text-destructive text-sm">{{ actionError() }}</p> }
        </aside>
      </div>
    } @else {
      <p class="text-muted-foreground">Loading…</p>
    }
  `,
})
export class PublicationDetailPage {
  private readonly api = inject(PublicationsApi);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly error = apiErrorMessage;
  protected readonly types = PUBLICATION_TYPES;
  protected readonly name = displayName;
  protected readonly formats: [Format, string][] = [['citation', 'Citation'], ['bibtex', 'BibTeX'], ['ris', 'RIS']];

  readonly id = input.required({ transform: numberAttribute });
  protected readonly pub = rxResource({ params: () => this.id(), stream: ({ params }) => this.api.get(params) });

  protected readonly format = signal<Format>('citation');
  protected readonly copied = signal(false);
  protected readonly savedOverride = signal<boolean | null>(null);
  protected readonly saved = computed(() => this.savedOverride() ?? this.pub.value()?.saved ?? false);
  protected readonly actionError = signal<string | null>(null);

  protected readonly citationText = computed(() => {
    const p = this.pub.value();
    if (!p) return '';
    return this.format() === 'bibtex' ? toBibTeX([p]) : this.format() === 'ris' ? toRIS([p]) : formatCitation(p);
  });

  protected copy(): void {
    navigator.clipboard?.writeText(this.citationText()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    });
  }

  protected save(): void {
    const p = this.pub.value()!;
    const bibtex = this.format() === 'bibtex';
    download(`${bibtexKey(p)}.${bibtex ? 'bib' : 'ris'}`, this.citationText(), bibtex ? 'application/x-bibtex' : 'application/x-research-info-systems');
  }

  protected toggleSave(): void {
    const next = !this.saved();
    this.savedOverride.set(next);
    this.api.save(this.id(), next).subscribe({ error: () => this.savedOverride.set(!next) });
  }

  protected toggleClaim(): void {
    const p = this.pub.value()!;
    this.api.claim(p.id, !p.isAuthor).subscribe({ next: () => this.pub.reload(), error: (e) => this.actionError.set(apiErrorMessage(e)) });
  }

  protected remove(): void {
    if (!confirm('Delete this publication from the repository?')) return;
    this.api.remove(this.id()).subscribe(() => this.router.navigate(['/publications']));
  }
}
