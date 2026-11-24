import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { Observable, catchError, forkJoin, of } from 'rxjs';
import { CountryChecklist } from '../components/country-checklist';
import { SpeciesSearchPanel } from '../components/species-search';
import { TaxonTreeNode, TreeTaxon } from '../components/taxon-tree-node';
import { GbifTaxonomyService } from '../gbif/gbif-taxonomy.service';
import { FISH_ORDERS, FISH_ORDER_KEYS, FOCUS_COUNTRY, GBIF_WEB } from '../gbif/gbif.config';

@Component({
  selector: 'app-taxonomy-overview',
  imports: [HlmCardImports, HlmTabsImports, SpeciesSearchPanel, CountryChecklist, TaxonTreeNode],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      <header class="space-y-1">
        <p class="text-muted-foreground text-sm">Explore</p>
        <h1 class="text-3xl font-semibold tracking-tight">Fish Taxonomy &amp; Biodiversity</h1>
        <p class="text-muted-foreground max-w-2xl">
          Accepted names, synonyms, classification, conservation status and occurrence of fishes, live from
          <a [href]="gbifWeb" target="_blank" rel="noopener" class="text-primary hover:underline">GBIF</a>.
        </p>
      </header>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        @for (s of statCards(); track s.label) {
          <div hlmCard size="sm">
            <div hlmCardContent>
              <p class="text-muted-foreground text-xs">{{ s.label }}</p>
              <p class="text-2xl font-semibold tabular-nums">
                @if (stats.isLoading()) {
                  <span class="bg-muted inline-block h-7 w-20 animate-pulse rounded"></span>
                } @else if (s.value != null) {
                  {{ s.value.toLocaleString() }}
                } @else {
                  <span class="text-muted-foreground text-base">unavailable</span>
                }
              </p>
            </div>
          </div>
        }
      </div>

      <hlm-tabs [tab]="view() || 'species'" (tabActivated)="setView($event)" class="w-full">
        <hlm-tabs-list aria-label="Taxonomy views">
          <button hlmTabsTrigger="species">Species search</button>
          <button hlmTabsTrigger="checklist">{{ country.name }} checklist</button>
          <button hlmTabsTrigger="tree">Taxonomic tree</button>
        </hlm-tabs-list>

        <div hlmTabsContent="species" class="pt-2">
          <app-species-search />
        </div>

        <div hlmTabsContent="checklist" class="pt-2">
          <ng-template hlmTabsContentLazy><app-country-checklist /></ng-template>
        </div>

        <div hlmTabsContent="tree" class="pt-2">
          <ng-template hlmTabsContentLazy>
          <div hlmCard>
            <div hlmCardHeader>
              <h3 hlmCardTitle>Classification</h3>
              <p hlmCardDescription>
                GBIF Backbone: Animalia › Chordata › Order › Family › Genus › Species. Expand a node to load its children.
              </p>
            </div>
            <div hlmCardContent>
              @for (o of orderRoots; track o.key) {
                <app-taxon-tree-node [taxon]="o" />
              }
            </div>
          </div>
          </ng-template>
        </div>
      </hlm-tabs>

      <p class="text-muted-foreground text-xs">
        Data: GBIF.org, GBIF Backbone Taxonomy and occurrence index, accessed {{ today }}. Cite the
        original datasets when publishing.
      </p>
    </section>
  `,
})
export class TaxonomyOverview {
  private readonly gbif = inject(GbifTaxonomyService);
  private readonly router = inject(Router);

  /** Active tab, bound from the `?view=` query param so tabs can be linked to. */
  readonly view = input<string>();

  protected setView(tab: string): void {
    if (tab === (this.view() || 'species')) return;
    this.router.navigate([], { queryParams: { view: tab === 'species' ? null : tab }, replaceUrl: true });
  }

  protected readonly gbifWeb = GBIF_WEB;
  protected readonly country = FOCUS_COUNTRY;
  protected readonly today = new Date().toISOString().slice(0, 10);
  protected readonly orderRoots: TreeTaxon[] = FISH_ORDERS.map((o) => ({ ...o, rank: 'ORDER' }));

  /** Each count fails independently (null) so one GBIF error doesn't blank every card. */
  protected readonly stats = rxResource({
    stream: () => {
      const safe = (o: Observable<number>) => o.pipe(catchError(() => of(null)));
      return forkJoin({
        freshwater: safe(this.gbif.countSpecies({ q: '', orderKey: null, threat: null, freshwaterOnly: true })),
        threatened: safe(this.gbif.countSpecies({ q: '', orderKey: null, threat: 'threatened', freshwaterOnly: true })),
        countryRecords: safe(this.gbif.occurrenceCount({ taxonKey: FISH_ORDER_KEYS, country: FOCUS_COUNTRY.code })),
      });
    },
  });

  protected readonly statCards = computed(() => {
    const s = this.stats.value();
    return [
      { label: 'Freshwater fish species (global)', value: s?.freshwater },
      { label: 'Threatened (CR, EN, VU)', value: s?.threatened },
      { label: `Fish occurrence records in ${FOCUS_COUNTRY.name}`, value: s?.countryRecords },
    ];
  });
}
