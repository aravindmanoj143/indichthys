import { ChangeDetectionStrategy, Component, computed, inject, input, numberAttribute, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronLeft, lucideChevronRight, lucideSearch, lucideX } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { switchMap, map } from 'rxjs';
import { SELECT_CLASS, queryNavigator } from '../../content/components/shared';
import { gbifErrorMessage } from '../../taxonomy/gbif/gbif-taxonomy.service';
import { FOCUS_COUNTRY } from '../../taxonomy/gbif/gbif.config';
import { SPECIMEN_PAGE_SIZE, SpecimenService, TYPE_STATUSES, catalogueNumber } from '../specimens';

/** Museum specimen search (GBIF preserved specimens of fishes). Filters live in the URL. */
@Component({
  selector: 'app-specimen-search',
  imports: [RouterLink, NgIcon, HlmBadgeImports, HlmButtonImports, HlmCardImports, HlmInputImports, HlmLabelImports, HlmTableImports, HlmTabsImports],
  providers: [provideIcons({ lucideSearch, lucideX, lucideChevronLeft, lucideChevronRight })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      <header class="space-y-1">
        <p class="text-muted-foreground text-sm">Research</p>
        <h1 class="text-3xl font-semibold tracking-tight">Specimens &amp; museum collections</h1>
        <p class="text-muted-foreground max-w-3xl">Preserved fish specimens held in museums worldwide, including type specimens, from collections published to GBIF.</p>
      </header>

      <div class="flex flex-wrap items-end gap-3">
        <div class="relative min-w-64 flex-1">
          <ng-icon name="lucideSearch" class="text-muted-foreground absolute top-2.5 left-2.5" />
          <input hlmInput type="search" class="pl-8" placeholder="Species, catalogue number, locality, collector…" aria-label="Search specimens"
            [value]="q() ?? ''" (change)="go({ q: $any($event.target).value })" />
        </div>
        <div class="flex flex-col gap-1">
          <label hlmLabel for="country">Collected in</label>
          <select id="country" [class]="selectClass" (change)="go({ country: $any($event.target).value })">
            <option [value]="''" [selected]="country() !== 'any'">{{ focus.name }}</option>
            <option value="any" [selected]="country() === 'any'">Anywhere</option>
          </select>
        </div>
        <div class="flex flex-col gap-1">
          <label hlmLabel for="type">Type status</label>
          <select id="type" [class]="selectClass" (change)="go({ type: $any($event.target).value })">
            <option value="" [selected]="!type()">Any specimen</option>
            @for (t of typeStatuses; track t) { <option [value]="t" [selected]="type() === t">{{ t }}{{ typeCount(t) }}</option> }
          </select>
        </div>
        @if (q() || type() || inst() || country() === 'any') {
          <button hlmBtn variant="ghost" size="sm" (click)="clear()"><ng-icon name="lucideX" /> Clear</button>
        }
      </div>

      <hlm-tabs [tab]="view()" (tabActivated)="view.set($any($event))">
        <hlm-tabs-list aria-label="Views">
          <button hlmTabsTrigger="specimens">Specimens</button>
          <button hlmTabsTrigger="collections">Holding collections</button>
        </hlm-tabs-list>
      </hlm-tabs>

      @if (inst()) {
        <p class="flex items-center gap-2 text-sm">Collection: <span hlmBadge>{{ institutionName(inst()!) }}</span>
          <button hlmBtn variant="ghost" size="icon-xs" aria-label="Remove collection filter" (click)="go({ inst: '' })"><ng-icon name="lucideX" /></button></p>
      }

      @if (view() === 'specimens') {
        @if (results.error()) {
          <p class="text-destructive">{{ gbifError(results.error()) }}</p>
        } @else if (results.hasValue()) {
          <p class="text-muted-foreground text-xs">{{ (results.value().count ?? 0).toLocaleString() }} specimens</p>
          <div hlmTableContainer class="rounded-md border" [class.opacity-60]="results.isLoading()">
            <table hlmTable>
              <thead hlmTHead>
                <tr hlmTr><th hlmTh>Catalogue no.</th><th hlmTh>Taxon</th><th hlmTh>Type</th><th hlmTh>Locality</th><th hlmTh>Collected</th></tr>
              </thead>
              <tbody hlmTBody>
                @for (s of results.value().results; track s.key) {
                  <tr hlmTr>
                    <td hlmTd class="whitespace-nowrap"><a [routerLink]="[s.key]" class="text-primary hover:underline">{{ catalogue(s) || 'record ' + s.key }}</a></td>
                    <td hlmTd><em>{{ s.species ?? s.scientificName }}</em><span class="text-muted-foreground ml-2 text-xs">{{ s.family }}</span></td>
                    <td hlmTd>@if (s.typeStatus) { <span hlmBadge [variant]="s.typeStatus === 'Holotype' ? 'default' : 'secondary'">{{ s.typeStatus }}</span> }</td>
                    <td hlmTd class="max-w-80 truncate" [title]="s.locality ?? ''">{{ s.stateProvince ?? s.locality ?? s.country }}</td>
                    <td hlmTd class="whitespace-nowrap">{{ s.year ?? '' }}</td>
                  </tr>
                } @empty {
                  <tr hlmTr><td hlmTd colspan="5" class="text-muted-foreground py-6 text-center">No specimens match.</td></tr>
                }
              </tbody>
            </table>
          </div>
          <div class="flex items-center justify-end gap-2">
            <span class="text-muted-foreground text-xs">Page {{ page() + 1 }}</span>
            <button hlmBtn variant="outline" size="sm" [disabled]="page() === 0" (click)="go({ page: page() - 1 }, false)" aria-label="Previous page"><ng-icon name="lucideChevronLeft" /></button>
            <button hlmBtn variant="outline" size="sm" [disabled]="results.value().endOfRecords" (click)="go({ page: page() + 1 }, false)" aria-label="Next page"><ng-icon name="lucideChevronRight" /></button>
          </div>
        } @else {
          <p class="text-muted-foreground">Searching GBIF…</p>
        }
      } @else {
        @if (facets.hasValue()) {
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            @for (c of facets.value().facets.institutions; track c.name) {
              <button type="button" hlmCard size="sm" class="hover:ring-primary/40 text-left transition-shadow" (click)="pickInstitution(c.name)">
                <div hlmCardHeader>
                  <h2 hlmCardTitle>{{ facets.value().names[c.name] || c.name.toUpperCase() }}</h2>
                  <p hlmCardDescription>{{ c.name.toUpperCase() }} · {{ c.count.toLocaleString() }} specimens{{ country() === 'any' ? '' : ' from ' + focus.name }}</p>
                </div>
              </button>
            }
          </div>
        } @else if (facets.error()) {
          <p class="text-destructive">{{ gbifError(facets.error()) }}</p>
        } @else {
          <p class="text-muted-foreground">Loading collections…</p>
        }
      }
    </section>
  `,
})
export class SpecimenSearch {
  private readonly svc = inject(SpecimenService);
  protected readonly gbifError = gbifErrorMessage;
  protected readonly go = queryNavigator(inject(Router));
  protected readonly selectClass = SELECT_CLASS;
  protected readonly typeStatuses = TYPE_STATUSES;
  protected readonly focus = FOCUS_COUNTRY;
  protected readonly catalogue = catalogueNumber;
  protected readonly pageSize = SPECIMEN_PAGE_SIZE;

  readonly q = input<string>();
  readonly country = input<string>();
  readonly type = input<string>();
  readonly inst = input<string>();
  readonly page = input(0, { transform: (v: unknown) => (v ? numberAttribute(v) : 0) });

  protected readonly view = signal<'specimens' | 'collections'>('specimens');

  private readonly base = computed(() => ({
    q: this.q(),
    country: this.country() === 'any' ? undefined : FOCUS_COUNTRY.code,
    typeStatus: this.type() || undefined,
    institutionCode: this.inst() || undefined,
  }));

  protected readonly results = rxResource({ params: () => ({ ...this.base(), page: this.page() }), stream: ({ params }) => this.svc.search(params) });

  /** Facet counts plus institution names (looked up once per filter change). */
  protected readonly facets = rxResource({
    params: () => ({ q: this.base().q, country: this.base().country }),
    stream: ({ params }) =>
      this.svc.facets(params).pipe(
        switchMap((facets) => this.svc.institutionNames(facets.institutions.slice(0, 30).map((i) => i.name)).pipe(map((names) => ({ facets, names })))),
      ),
  });

  protected typeCount(t: string): string {
    const c = this.facets.value()?.facets.typeStatus.find((x) => x.name === t)?.count;
    return c ? ` (${c})` : '';
  }
  protected institutionName(code: string): string {
    return this.facets.value()?.names[code] || code.toUpperCase();
  }
  protected pickInstitution(code: string): void {
    this.view.set('specimens');
    this.go({ inst: code });
  }
  protected clear(): void {
    this.go({ q: '', type: '', inst: '', country: '' });
  }
}
