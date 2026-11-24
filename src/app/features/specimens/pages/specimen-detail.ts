import { ChangeDetectionStrategy, Component, computed, inject, input, numberAttribute } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideExternalLink, lucideMapPin } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { gbifErrorMessage } from '../../taxonomy/gbif/gbif-taxonomy.service';
import { GBIF_WEB } from '../../taxonomy/gbif/gbif.config';
import { SpecimenService, catalogueNumber } from '../specimens';

@Component({
  selector: 'app-specimen-detail',
  imports: [RouterLink, NgIcon, HlmBadgeImports, HlmButtonImports, HlmCardImports],
  providers: [provideIcons({ lucideArrowLeft, lucideExternalLink, lucideMapPin })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a hlmBtn variant="ghost" size="sm" routerLink="/specimens" class="mb-4 -ml-2"><ng-icon name="lucideArrowLeft" /> Specimens</a>
    @if (specimen.error()) {
      <p class="text-destructive">{{ gbifError(specimen.error()) }}</p>
    } @else if (specimen.hasValue()) {
      @let s = specimen.value();
      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section class="space-y-6">
          <header class="space-y-2">
            <p class="flex flex-wrap items-center gap-2">
              @if (s.typeStatus) { <span hlmBadge>{{ s.typeStatus }}</span> }
              <span class="text-muted-foreground text-sm">{{ catalogue() }}</span>
            </p>
            <h1 class="text-3xl font-semibold tracking-tight">
              @if (s.speciesKey) { <a [routerLink]="['/taxonomy/species', s.speciesKey]" class="hover:underline"><em>{{ s.species }}</em></a> }
              @else { <em>{{ s.scientificName }}</em> }
            </h1>
            <p class="text-muted-foreground">As recorded: {{ s.scientificName }}{{ s.family ? ' · ' + s.family : '' }}</p>
          </header>

          @if (images().length) {
            <div class="grid gap-3 sm:grid-cols-2">
              @for (m of images(); track m.identifier) {
                <figure>
                  <img [src]="m.identifier" [alt]="m.title || 'Specimen photograph'" class="w-full rounded-md bg-black/5 object-contain" loading="lazy" />
                  <figcaption class="text-muted-foreground mt-1 text-xs">{{ m.rightsHolder }}{{ m.license ? ' · ' + licence(m.license) : '' }}</figcaption>
                </figure>
              }
            </div>
          }

          <div hlmCard>
            <div hlmCardHeader><h2 hlmCardTitle>Collection event</h2></div>
            <div hlmCardContent>
              <dl class="grid grid-cols-[9rem_1fr] gap-y-2 text-sm">
                @for (f of eventFields(); track f[0]) { <dt class="text-muted-foreground">{{ f[0] }}</dt><dd class="whitespace-pre-line">{{ f[1] }}</dd> }
              </dl>
            </div>
          </div>
          <div hlmCard>
            <div hlmCardHeader><h2 hlmCardTitle>Specimen</h2></div>
            <div hlmCardContent>
              <dl class="grid grid-cols-[9rem_1fr] gap-y-2 text-sm">
                @for (f of specimenFields(); track f[0]) { <dt class="text-muted-foreground">{{ f[0] }}</dt><dd class="whitespace-pre-line">{{ f[1] }}</dd> }
              </dl>
            </div>
          </div>
        </section>
        <aside class="space-y-3">
          @if (s.decimalLatitude != null && s.decimalLongitude != null) {
            <a hlmBtn variant="outline" class="w-full" target="_blank" rel="noopener"
               [href]="'https://www.openstreetmap.org/?mlat=' + s.decimalLatitude + '&mlon=' + s.decimalLongitude + '#map=11/' + s.decimalLatitude + '/' + s.decimalLongitude">
              <ng-icon name="lucideMapPin" /> {{ s.decimalLatitude }}, {{ s.decimalLongitude }}
            </a>
          }
          <a hlmBtn variant="outline" class="w-full" [href]="gbifWeb + '/occurrence/' + s.key" target="_blank" rel="noopener">View on GBIF <ng-icon name="lucideExternalLink" /></a>
          @if (s.references) {
            <a hlmBtn variant="outline" class="w-full" [href]="s.references" target="_blank" rel="noopener">Museum record <ng-icon name="lucideExternalLink" /></a>
          }
          <p class="text-muted-foreground text-xs">Data published by the holding institution through GBIF. Cite the original dataset.</p>
        </aside>
      </div>
    } @else {
      <p class="text-muted-foreground">Loading from GBIF…</p>
    }
  `,
})
export class SpecimenDetail {
  private readonly svc = inject(SpecimenService);
  protected readonly gbifError = gbifErrorMessage;
  protected readonly gbifWeb = GBIF_WEB;
  readonly key = input.required({ transform: numberAttribute });
  protected readonly specimen = rxResource({ params: () => this.key(), stream: ({ params }) => this.svc.specimen(params) });

  protected readonly catalogue = computed(() => (this.specimen.value() ? catalogueNumber(this.specimen.value()!) : ''));
  protected readonly images = computed(() =>
    (this.specimen.value()?.media ?? []).filter((m) => m.type === 'StillImage' && m.identifier?.startsWith('http')),
  );
  private fields(pairs: [string, unknown][]): [string, string][] {
    return pairs.filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)]);
  }
  protected readonly eventFields = computed(() => {
    const s = this.specimen.value();
    if (!s) return [];
    return this.fields([
      ['Locality', s.locality],
      ['Water body', s.waterBody],
      ['State / province', s.stateProvince],
      ['Country', s.country],
      ['Date', s.eventDate?.slice(0, 10) ?? s.year],
      ['Collector(s)', s.recordedBy],
    ]);
  });
  protected readonly specimenFields = computed(() => {
    const s = this.specimen.value();
    if (!s) return [];
    return this.fields([
      ['Institution', s.institutionCode],
      ['Collection', s.collectionCode],
      ['Catalogue number', s.catalogNumber],
      ['Type status', s.typeStatus],
      ['Identified by', s.identifiedBy],
      ['Preparation', s.preparations],
      ['Individuals', s.individualCount],
      ['Remarks', s.occurrenceRemarks],
      ['Dataset', s.datasetName],
    ]);
  });
  protected licence(url: string): string {
    const m = /licenses\/([a-z-]+)\/([\d.]+)/i.exec(url);
    return m ? `CC ${m[1]!.toUpperCase()} ${m[2]}` : url;
  }
}
