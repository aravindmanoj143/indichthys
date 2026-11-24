import { ChangeDetectionStrategy, Component, computed, inject, input, numberAttribute } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucideChevronRight,
  lucideExternalLink,
  lucideLoaderCircle,
} from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { forkJoin } from 'rxjs';
import { EstablishmentBadge, IucnBadge } from '../components/status-badges';
import { GbifTaxonomyService, gbifErrorMessage } from '../gbif/gbif-taxonomy.service';
import { FOCUS_COUNTRY, GBIF_WEB } from '../gbif/gbif.config';

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const languageNames = new Intl.DisplayNames(['en'], { type: 'language' });

function countryName(code: string): string {
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

function languageName(code?: string): string {
  if (!code) return '—';
  try {
    return languageNames.of(code) ?? code;
  } catch {
    return code;
  }
}

@Component({
  selector: 'app-species-detail',
  imports: [
    RouterLink,
    NgIcon,
    HlmBadgeImports,
    HlmButtonImports,
    HlmCardImports,
    HlmTableImports,
    HlmTabsImports,
    IucnBadge,
    EstablishmentBadge,
  ],
  providers: [provideIcons({ lucideArrowLeft, lucideChevronRight, lucideExternalLink, lucideLoaderCircle })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a hlmBtn variant="ghost" size="sm" routerLink="/taxonomy" class="mb-4 -ml-2">
      <ng-icon name="lucideArrowLeft" /> All species
    </a>

    @if (detail.isLoading() && !detail.hasValue()) {
      <p class="text-muted-foreground flex items-center gap-2"><ng-icon name="lucideLoaderCircle" class="animate-spin" /> Loading from GBIF…</p>
    } @else if (detail.error()) {
      <div hlmCard>
        <div hlmCardHeader>
          <h3 hlmCardTitle>Could not load this taxon</h3>
          <p hlmCardDescription>{{ errorMessage() }}</p>
        </div>
        <div hlmCardFooter><button hlmBtn variant="outline" (click)="detail.reload()">Retry</button></div>
      </div>
    } @else if (detail.hasValue()) {
      @let d = detail.value();
      @let u = d.usage;
      <section class="space-y-6">
        <header class="space-y-3">
          <nav aria-label="Classification" class="text-muted-foreground flex flex-wrap items-center gap-1 text-sm">
            @for (p of d.parents; track p.key; let last = $last) {
              <span [class.italic]="p.rank === 'GENUS'" [title]="p.rank">{{ p.canonicalName }}</span>
              @if (!last) { <ng-icon name="lucideChevronRight" size="14" /> }
            }
          </nav>
          <h1 class="text-3xl font-semibold tracking-tight">
            <em>{{ u.canonicalName ?? u.scientificName }}</em>
            <span class="text-muted-foreground ml-2 text-lg font-normal">{{ u.authorship }}</span>
          </h1>
          @if (commonNames().length) {
            <p class="text-muted-foreground">{{ commonNames().join(', ') }}</p>
          }
          @if (u.taxonomicStatus && u.taxonomicStatus !== 'ACCEPTED' && u.acceptedKey) {
            <p class="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              This name is a {{ u.taxonomicStatus.toLowerCase().replaceAll('_', ' ') }}. Accepted name:
              <a [routerLink]="['/taxonomy/species', u.acceptedKey]" class="underline"><em>{{ u.accepted }}</em></a>
            </p>
          }
          <div class="flex flex-wrap items-center gap-2">
            <span hlmBadge variant="outline">{{ u.rank.toLowerCase() }}</span>
            @if (u.taxonomicStatus) {
              <span hlmBadge variant="outline">{{ u.taxonomicStatus.toLowerCase().replaceAll('_', ' ') }}</span>
            }
            <app-iucn-badge [status]="d.iucn?.category" [showLabel]="true" />
            @for (e of countryEstablishment(); track e.source) {
              <span class="inline-flex items-center gap-1 text-xs" [title]="'Source: ' + e.source">
                <app-establishment-badge [means]="e.means" />
                <span class="text-muted-foreground">in {{ country.name }} ({{ e.source }})</span>
              </span>
            }
            <a hlmBtn variant="link" size="sm" [href]="gbifWeb + '/species/' + u.key" target="_blank" rel="noopener">
              View on GBIF <ng-icon name="lucideExternalLink" />
            </a>
          </div>
        </header>

        <hlm-tabs tab="overview" class="w-full">
          <hlm-tabs-list aria-label="Species sections">
            <button hlmTabsTrigger="overview">Overview</button>
            <button hlmTabsTrigger="synonyms">Synonyms ({{ d.synonyms.length }})</button>
            <button hlmTabsTrigger="names">Common names ({{ d.vernacularNames.length }})</button>
            <button hlmTabsTrigger="distribution">Distribution</button>
            <button hlmTabsTrigger="references">References ({{ d.references.length }})</button>
          </hlm-tabs-list>

          <!-- Overview -->
          <div hlmTabsContent="overview" class="grid gap-4 pt-2 md:grid-cols-2">
            <div hlmCard>
              <div hlmCardHeader><h3 hlmCardTitle>Classification</h3></div>
              <div hlmCardContent>
                <dl class="grid grid-cols-[7rem_1fr] gap-y-2">
                  @for (p of d.parents; track p.key) {
                    <dt class="text-muted-foreground capitalize">{{ p.rank.toLowerCase() }}</dt>
                    <dd [class.italic]="p.rank === 'GENUS'">{{ p.canonicalName }}</dd>
                  }
                  <dt class="text-muted-foreground capitalize">{{ u.rank.toLowerCase() }}</dt>
                  <dd><em>{{ u.canonicalName }}</em> {{ u.authorship }}</dd>
                </dl>
              </div>
            </div>
            <div hlmCard>
              <div hlmCardHeader><h3 hlmCardTitle>Nomenclature</h3></div>
              <div hlmCardContent class="space-y-3">
                @if (u.basionym) {
                  <div>
                    <p class="text-muted-foreground text-xs uppercase">Basionym (original combination)</p>
                    <p>
                      @if (u.basionymKey) {
                        <a [routerLink]="['/taxonomy/species', u.basionymKey]" class="text-primary hover:underline">{{ u.basionym }}</a>
                      } @else { {{ u.basionym }} }
                    </p>
                  </div>
                }
                @if (u.publishedIn) {
                  <div>
                    <p class="text-muted-foreground text-xs uppercase">Published in</p>
                    <p [innerHTML]="u.publishedIn"></p>
                  </div>
                }
                <div>
                  <p class="text-muted-foreground text-xs uppercase">GBIF key</p>
                  <p class="tabular-nums">{{ u.key }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Synonyms -->
          <div hlmTabsContent="synonyms" class="pt-2">
            <div hlmTableContainer class="rounded-md border">
              <table hlmTable>
                <thead hlmTHead>
                  <tr hlmTr><th hlmTh>Name</th><th hlmTh>Authority</th><th hlmTh>Status</th></tr>
                </thead>
                <tbody hlmTBody>
                  @for (s of d.synonyms; track s.key) {
                    <tr hlmTr>
                      <td hlmTd>
                        <em>{{ s.canonicalName ?? s.scientificName }}</em>
                        @if (s.key === u.basionymKey) { <span hlmBadge variant="outline" class="ml-2">basionym</span> }
                      </td>
                      <td hlmTd>{{ s.authorship }}</td>
                      <td hlmTd class="text-muted-foreground">{{ s.taxonomicStatus?.toLowerCase()?.replaceAll('_', ' ') }}</td>
                    </tr>
                  } @empty {
                    <tr hlmTr><td hlmTd colspan="3" class="text-muted-foreground py-6 text-center">No synonyms in GBIF.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- Common names -->
          <div hlmTabsContent="names" class="pt-2">
            <div hlmTableContainer class="rounded-md border">
              <table hlmTable>
                <thead hlmTHead>
                  <tr hlmTr><th hlmTh>Name</th><th hlmTh>Language</th><th hlmTh>Source</th></tr>
                </thead>
                <tbody hlmTBody>
                  @for (v of d.vernacularNames; track $index) {
                    <tr hlmTr>
                      <td hlmTd>{{ v.vernacularName }}</td>
                      <td hlmTd>{{ languageName(v.language) }}</td>
                      <td hlmTd class="text-muted-foreground">{{ v.source }}</td>
                    </tr>
                  } @empty {
                    <tr hlmTr><td hlmTd colspan="3" class="text-muted-foreground py-6 text-center">No common names in GBIF.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- Distribution -->
          <div hlmTabsContent="distribution" class="space-y-4 pt-2">
            <div class="grid gap-4 md:grid-cols-2">
              <div hlmCard>
                <div hlmCardHeader>
                  <h3 hlmCardTitle>Occurrence records by country</h3>
                  <p hlmCardDescription>{{ occurrences.hasValue() ? occurrences.value().byCountry.total.toLocaleString() : '…' }} records worldwide</p>
                </div>
                <div hlmCardContent>
                  @if (occurrences.hasValue()) {
                    <ul class="space-y-1 text-sm">
                      @for (c of occurrences.value().byCountry.counts; track c.name) {
                        <li class="flex justify-between gap-4">
                          <span>{{ countryName(c.name) }}</span>
                          <span class="tabular-nums">{{ c.count.toLocaleString() }}</span>
                        </li>
                      } @empty { <li class="text-muted-foreground">No occurrence records.</li> }
                    </ul>
                  } @else if (occurrences.error()) {
                    <p class="text-destructive text-sm">{{ gbifErrorMessage(occurrences.error()) }}</p>
                  } @else {
                    <p class="text-muted-foreground text-sm">Loading…</p>
                  }
                </div>
              </div>
              <div hlmCard>
                <div hlmCardHeader>
                  <h3 hlmCardTitle>Records in {{ country.name }} by state</h3>
                  <p hlmCardDescription>As written by the data publishers (not standardised).</p>
                  <div hlmCardAction>
                    <a hlmBtn variant="link" size="sm" target="_blank" rel="noopener"
                       [href]="gbifWeb + '/occurrence/search?taxon_key=' + u.key + '&country=' + country.code">
                      Map <ng-icon name="lucideExternalLink" />
                    </a>
                  </div>
                </div>
                <div hlmCardContent>
                  @if (occurrences.hasValue()) {
                    <ul class="space-y-1 text-sm">
                      @for (c of occurrences.value().byState.counts; track c.name) {
                        <li class="flex justify-between gap-4">
                          <span>{{ c.name }}</span>
                          <span class="tabular-nums">{{ c.count.toLocaleString() }}</span>
                        </li>
                      } @empty { <li class="text-muted-foreground">No records with a state.</li> }
                    </ul>
                  } @else {
                    <p class="text-muted-foreground text-sm">Loading…</p>
                  }
                </div>
              </div>
            </div>

            <div hlmCard>
              <div hlmCardHeader>
                <h3 hlmCardTitle>Distribution statements</h3>
                <p hlmCardDescription>From checklists aggregated by GBIF. Sources can disagree, so check each one.</p>
              </div>
              <div hlmCardContent>
                <div hlmTableContainer class="rounded-md border">
                  <table hlmTable>
                    <thead hlmTHead>
                      <tr hlmTr><th hlmTh>Location</th><th hlmTh>Status</th><th hlmTh>Threat</th><th hlmTh>Source</th></tr>
                    </thead>
                    <tbody hlmTBody>
                      @for (x of d.distributions; track $index) {
                        <tr hlmTr>
                          <td hlmTd>{{ x.country ? countryName(x.country) : (x.locality ?? x.locationId) }}</td>
                          <td hlmTd>
                            @if (x.establishmentMeans) { <app-establishment-badge [means]="x.establishmentMeans" /> }
                            @else { {{ x.status?.toLowerCase() ?? '—' }} }
                          </td>
                          <td hlmTd><app-iucn-badge [status]="x.threatStatus" /></td>
                          <td hlmTd class="text-muted-foreground">{{ x.source }}</td>
                        </tr>
                      } @empty {
                        <tr hlmTr><td hlmTd colspan="4" class="text-muted-foreground py-6 text-center">No distribution statements in GBIF.</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <!-- References -->
          <div hlmTabsContent="references" class="pt-2">
            <ul class="divide-border divide-y">
              @for (r of d.references; track $index) {
                <li class="py-3 text-sm">
                  <span [innerHTML]="r.citation"></span>
                  @if (r.doi) {
                    <a class="text-primary ml-1 hover:underline" [href]="'https://doi.org/' + r.doi" target="_blank" rel="noopener">doi:{{ r.doi }}</a>
                  }
                  @if (r.source) { <p class="text-muted-foreground text-xs">via {{ r.source }}</p> }
                </li>
              } @empty {
                <li class="text-muted-foreground py-6 text-center text-sm">No references in GBIF.</li>
              }
            </ul>
          </div>
        </hlm-tabs>
      </section>
    }
  `,
})
export class SpeciesDetail {
  private readonly gbif = inject(GbifTaxonomyService);
  protected readonly gbifWeb = GBIF_WEB;
  protected readonly country = FOCUS_COUNTRY;
  protected readonly countryName = countryName;
  protected readonly languageName = languageName;
  protected readonly gbifErrorMessage = gbifErrorMessage;

  /** GBIF usage key, bound from the `:key` route param. */
  readonly key = input.required({ transform: numberAttribute });

  protected readonly detail = rxResource({
    params: () => this.key(),
    stream: ({ params: key }) => this.gbif.getSpeciesDetail(key),
  });

  protected readonly occurrences = rxResource({
    params: () => this.key(),
    stream: ({ params: key }) =>
      forkJoin({
        byCountry: this.gbif.occurrenceFacet({ taxonKey: key }, 'country', 10),
        byState: this.gbif.occurrenceFacet({ taxonKey: key, country: FOCUS_COUNTRY.code }, 'stateProvince', 15),
      }),
  });

  protected readonly errorMessage = computed(() => gbifErrorMessage(this.detail.error()));

  protected readonly commonNames = computed(() => {
    if (!this.detail.hasValue()) return [];
    const names = this.detail
      .value()
      .vernacularNames.filter((v) => v.language === 'eng')
      .map((v) => v.vernacularName.trim());
    const seen = new Set<string>();
    return names.filter((n) => !seen.has(n.toLowerCase()) && seen.add(n.toLowerCase())).slice(0, 5);
  });

  /** Native / introduced statements for the focus country, one per source. */
  protected readonly countryEstablishment = computed(() => {
    if (!this.detail.hasValue()) return [];
    return this.detail
      .value()
      .distributions.filter((x) => x.country === FOCUS_COUNTRY.code && x.establishmentMeans)
      .map((x) => ({ means: x.establishmentMeans!, source: x.source ?? 'unknown source' }));
  });
}
