import { ChangeDetectionStrategy, Component, computed, inject, input, numberAttribute } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronLeft, lucideChevronRight, lucideSearch, lucideX } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { apiErrorMessage } from '../../../core/api-error';
import { SELECT_CLASS, queryNavigator } from '../../content/components/shared';
import { PUBLICATION_TYPES, PublicationsApi } from '../publications.api';
import { PublicationCard } from './publication-card';
import { PublicationsNav } from './publications-nav';

const num = (v: unknown) => (v == null || v === '' ? undefined : numberAttribute(v));

/** Research paper repository. All filters are query params. */
@Component({
  selector: 'app-repository',
  imports: [NgIcon, HlmButtonImports, HlmCardImports, HlmInputImports, HlmLabelImports, PublicationsNav, PublicationCard],
  providers: [provideIcons({ lucideSearch, lucideX, lucideChevronLeft, lucideChevronRight })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      <app-publications-nav />

      <div class="flex flex-wrap items-end gap-3">
        <div class="relative min-w-64 flex-1">
          <ng-icon name="lucideSearch" class="text-muted-foreground absolute top-2.5 left-2.5" />
          <input hlmInput type="search" class="pl-8" placeholder="Title, author, journal, species, DOI…" aria-label="Search publications"
            [value]="q() ?? ''" (change)="go({ q: $any($event.target).value })" />
        </div>
        <div class="flex flex-col gap-1">
          <label hlmLabel for="from">From</label>
          <input hlmInput id="from" type="number" class="w-24" placeholder="year" [value]="yearFrom() ?? ''" (change)="go({ yearFrom: $any($event.target).value })" />
        </div>
        <div class="flex flex-col gap-1">
          <label hlmLabel for="to">To</label>
          <input hlmInput id="to" type="number" class="w-24" placeholder="year" [value]="yearTo() ?? ''" (change)="go({ yearTo: $any($event.target).value })" />
        </div>
        <div class="flex flex-col gap-1">
          <label hlmLabel for="sort">Sort</label>
          <select id="sort" [class]="selectClass" (change)="go({ sort: $any($event.target).value })">
            <option value="" [selected]="!sort()">Newest first</option>
            <option value="added" [selected]="sort() === 'added'">Recently added</option>
            <option value="title" [selected]="sort() === 'title'">Title A–Z</option>
          </select>
        </div>
        @if (filtered()) { <button hlmBtn variant="ghost" size="sm" (click)="clear()"><ng-icon name="lucideX" /> Clear</button> }
      </div>
      <nav class="flex flex-wrap gap-2" aria-label="Publication types">
        <button hlmBtn size="sm" [variant]="!type() ? 'default' : 'outline'" (click)="go({ type: '' })">All types</button>
        @for (t of types; track t[0]) {
          <button hlmBtn size="sm" [variant]="type() === t[0] ? 'default' : 'outline'" (click)="go({ type: t[0] })">{{ t[1] }}</button>
        }
      </nav>
      @if (topic() || journal() || taxon() || author()) {
        <p class="text-muted-foreground text-sm">
          Filtered by {{ topic() ? 'topic “' + topic() + '”' : journal() ? 'journal “' + journal() + '”' : taxon() ? 'species' : 'author' }}.
        </p>
      }

      @if (list.error()) {
        <p class="text-destructive">{{ error(list.error()) }}</p>
      } @else if (list.hasValue()) {
        <p class="text-muted-foreground text-xs">{{ list.value().total }} publication{{ list.value().total === 1 ? '' : 's' }}</p>
        <div hlmCard [class.opacity-60]="list.isLoading()">
          <div hlmCardContent>
            @for (p of list.value().items; track p.id) {
              <app-publication-card [pub]="p" />
            } @empty {
              <p class="text-muted-foreground py-6 text-center text-sm">No publications yet{{ filtered() ? ' for these filters' : '' }}. Add the first one.</p>
            }
          </div>
        </div>
        @if (pages() > 1) {
          <div class="flex items-center justify-end gap-2">
            <span class="text-muted-foreground text-xs">Page {{ page() + 1 }} of {{ pages() }}</span>
            <button hlmBtn variant="outline" size="sm" [disabled]="page() === 0" (click)="go({ page: page() - 1 }, false)" aria-label="Previous page"><ng-icon name="lucideChevronLeft" /></button>
            <button hlmBtn variant="outline" size="sm" [disabled]="page() + 1 >= pages()" (click)="go({ page: page() + 1 }, false)" aria-label="Next page"><ng-icon name="lucideChevronRight" /></button>
          </div>
        }
      } @else {
        <p class="text-muted-foreground">Loading…</p>
      }
    </section>
  `,
})
export class Repository {
  private readonly api = inject(PublicationsApi);
  private readonly router = inject(Router);
  protected readonly error = apiErrorMessage;
  protected readonly go = queryNavigator(this.router);
  protected readonly selectClass = SELECT_CLASS;
  protected readonly types = Object.entries(PUBLICATION_TYPES);

  readonly q = input<string>();
  readonly type = input<string>();
  readonly topic = input<string>();
  readonly journal = input<string>();
  readonly author = input<string>();
  readonly sort = input<'added' | 'title'>();
  readonly taxon = input(undefined, { transform: num });
  readonly yearFrom = input(undefined, { transform: num });
  readonly yearTo = input(undefined, { transform: num });
  readonly page = input(0, { transform: (v: unknown) => num(v) ?? 0 });

  protected readonly list = rxResource({
    params: () => ({
      q: this.q(),
      type: this.type(),
      topic: this.topic(),
      journal: this.journal(),
      author: this.author(),
      taxon: this.taxon(),
      yearFrom: this.yearFrom(),
      yearTo: this.yearTo(),
      sort: this.sort(),
      page: this.page(),
    }),
    stream: ({ params }) => this.api.search(params),
  });
  protected readonly pages = computed(() => Math.ceil((this.list.value()?.total ?? 0) / (this.list.value()?.pageSize ?? 1)));
  protected readonly filtered = computed(() =>
    [this.q(), this.type(), this.topic(), this.journal(), this.author(), this.taxon(), this.yearFrom(), this.yearTo()].some((v) => v != null && v !== ''),
  );

  protected clear(): void {
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }
}
