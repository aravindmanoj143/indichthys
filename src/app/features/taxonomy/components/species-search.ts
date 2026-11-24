import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronLeft, lucideChevronRight, lucideLoaderCircle, lucideSearch, lucideX } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { debounceTime } from 'rxjs';
import { GbifTaxonomyService, SpeciesSearch, gbifErrorMessage } from '../gbif/gbif-taxonomy.service';
import { FISH_ORDERS } from '../gbif/gbif.config';
import { GbifNameUsage, GbifThreatStatus, IUCN } from '../gbif/gbif.models';
import { IucnBadge } from './status-badges';

const PAGE_SIZE = 20;
export const SELECT_CLASS =
  'border-input dark:bg-input/30 h-9 rounded-md border bg-transparent px-2.5 text-sm shadow-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50';

export function englishName(u: GbifNameUsage): string {
  return (
    u.vernacularNames?.find((v) => v.language === 'eng')?.vernacularName ?? u.vernacularName ?? ''
  );
}

@Component({
  selector: 'app-species-search',
  imports: [RouterLink, NgIcon, HlmButtonImports, HlmInputImports, HlmLabelImports, HlmTableImports, IucnBadge],
  providers: [provideIcons({ lucideSearch, lucideX, lucideChevronLeft, lucideChevronRight, lucideLoaderCircle })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-end gap-3">
        <div class="relative min-w-64 flex-1">
          <ng-icon name="lucideSearch" class="text-muted-foreground absolute top-2.5 left-2.5" />
          <input
            hlmInput
            class="pl-8"
            type="search"
            placeholder="Search scientific or common name, genus, family…"
            aria-label="Search species"
            [value]="query()"
            (input)="query.set($any($event.target).value)"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label hlmLabel for="order-filter">Order</label>
          <select id="order-filter" [class]="selectClass" (change)="setOrder($any($event.target).value)">
            <option value="" [selected]="orderKey() === null">All fish orders</option>
            @for (o of orders; track o.key) {
              <option [value]="o.key" [selected]="orderKey() === o.key">{{ o.name }}</option>
            }
          </select>
        </div>
        <div class="flex flex-col gap-1">
          <label hlmLabel for="iucn-filter">IUCN</label>
          <select id="iucn-filter" [class]="selectClass" (change)="threat.set($any($event.target).value || null)">
            <option value="" [selected]="threat() === null">Any</option>
            <option value="threatened" [selected]="threat() === 'threatened'">Threatened (CR, EN, VU)</option>
            @for (i of iucn; track i.status) {
              <option [value]="i.status" [selected]="threat() === i.status">{{ i.code }} · {{ i.label }}</option>
            }
          </select>
        </div>
        <label class="flex h-9 items-center gap-2 text-sm">
          <input type="checkbox" class="accent-primary size-4" [checked]="freshwaterOnly()" (change)="freshwaterOnly.set($any($event.target).checked)" />
          Freshwater only
        </label>
        @if (hasFilters()) {
          <button hlmBtn variant="ghost" size="sm" (click)="reset()"><ng-icon name="lucideX" /> Clear</button>
        }
      </div>

      @if (results.error()) {
        <div class="text-destructive rounded-md border border-current/30 p-4 text-sm">
          {{ errorMessage() }}
          <button hlmBtn variant="link" size="sm" (click)="results.reload()">Retry</button>
        </div>
      } @else {
        <div hlmTableContainer class="relative rounded-md border" [class.opacity-60]="results.isLoading()">
          <table hlmTable>
            <thead hlmTHead>
              <tr hlmTr>
                <th hlmTh>Scientific name</th>
                <th hlmTh>Common name</th>
                <th hlmTh>Family</th>
                <th hlmTh>Order</th>
                <th hlmTh>IUCN</th>
              </tr>
            </thead>
            <tbody hlmTBody>
              @for (s of rows(); track s.key) {
                <tr hlmTr>
                  <td hlmTd>
                    <a [routerLink]="['species', s.key]" class="text-primary underline-offset-4 hover:underline">
                      <em>{{ s.canonicalName ?? s.scientificName }}</em>
                    </a>
                    <span class="text-muted-foreground ml-1 text-xs">{{ s.authorship }}</span>
                  </td>
                  <td hlmTd>{{ englishName(s) }}</td>
                  <td hlmTd>{{ s.family }}</td>
                  <td hlmTd>{{ s.order }}</td>
                  <td hlmTd><app-iucn-badge [status]="s.threatStatuses?.[0]" /></td>
                </tr>
              } @empty {
                <tr hlmTr>
                  <td hlmTd colspan="5" class="text-muted-foreground py-8 text-center">
                    @if (results.isLoading()) {
                      <span class="inline-flex items-center gap-2"><ng-icon name="lucideLoaderCircle" class="animate-spin" /> Searching GBIF…</span>
                    } @else {
                      No species match these filters.
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="flex items-center justify-between gap-2">
          <p class="text-muted-foreground text-xs tabular-nums">
            @if (total()) {
              {{ from() }}–{{ to() }} of {{ total().toLocaleString() }} species · GBIF Backbone Taxonomy
            }
          </p>
          <div class="flex gap-2">
            <button hlmBtn variant="outline" size="sm" [disabled]="page() === 0 || results.isLoading()" (click)="page.set(page() - 1)">
              <ng-icon name="lucideChevronLeft" /> Previous
            </button>
            <button hlmBtn variant="outline" size="sm" [disabled]="to() >= total() || results.isLoading()" (click)="page.set(page() + 1)">
              Next <ng-icon name="lucideChevronRight" />
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class SpeciesSearchPanel {
  private readonly gbif = inject(GbifTaxonomyService);
  protected readonly orders = FISH_ORDERS;
  protected readonly iucn = IUCN;
  protected readonly selectClass = SELECT_CLASS;
  protected readonly englishName = englishName;

  protected readonly query = signal('');
  private readonly debouncedQuery = toSignal(toObservable(this.query).pipe(debounceTime(350)), {
    initialValue: '',
  });
  protected readonly orderKey = signal<number | null>(null);
  protected readonly threat = signal<GbifThreatStatus | 'threatened' | null>(null);
  protected readonly freshwaterOnly = signal(true);

  private readonly filters = computed(() => ({
    q: this.debouncedQuery(),
    orderKey: this.orderKey(),
    threat: this.threat(),
    freshwaterOnly: this.freshwaterOnly(),
  }));

  /** Back to page 1 whenever the filters change. */
  protected readonly page = linkedSignal({ source: this.filters, computation: () => 0 });

  protected readonly results = rxResource({
    params: (): SpeciesSearch => ({ ...this.filters(), offset: this.page() * PAGE_SIZE, limit: PAGE_SIZE }),
    stream: ({ params }) => this.gbif.searchSpecies(params),
  });

  protected readonly rows = computed(() => (this.results.hasValue() ? this.results.value().results : []));
  protected readonly total = computed(() => (this.results.hasValue() ? (this.results.value().count ?? 0) : 0));
  protected readonly from = computed(() => (this.total() ? this.page() * PAGE_SIZE + 1 : 0));
  protected readonly to = computed(() => Math.min((this.page() + 1) * PAGE_SIZE, this.total()));
  protected readonly errorMessage = computed(() => gbifErrorMessage(this.results.error()));

  protected readonly hasFilters = computed(
    () => !!this.query() || this.orderKey() !== null || this.threat() !== null || !this.freshwaterOnly(),
  );

  protected setOrder(value: string): void {
    this.orderKey.set(value ? Number(value) : null);
  }

  protected reset(): void {
    this.query.set('');
    this.orderKey.set(null);
    this.threat.set(null);
    this.freshwaterOnly.set(true);
  }
}
