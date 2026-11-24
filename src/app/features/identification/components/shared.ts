import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideTriangleAlert } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { RequestStatus, TaxonRef } from '../identification.api';

/** Taxon name; links to the Taxonomy module when it is a GBIF species. */
@Component({
  selector: 'app-taxon-name',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let t = taxon();
    @if (link()) {
      <a [routerLink]="['/taxonomy/species', t.gbifKey]" class="text-primary underline-offset-4 hover:underline">
        <em>{{ t.scientificName }}</em>
      </a>
    } @else {
      <span [class.italic]="italic()">{{ t.scientificName }}</span>
    }
    @if (showAuthor() && t.authorship) {
      <span class="text-muted-foreground ml-1 text-xs">{{ t.authorship }}</span>
    }
    @if (t.rank !== 'species') {
      <span class="text-muted-foreground ml-1 text-xs">({{ t.rank }})</span>
    }
  `,
})
export class TaxonName {
  readonly taxon = input.required<TaxonRef>();
  readonly showAuthor = input(true);
  protected readonly link = computed(() => this.taxon().gbifKey && this.taxon().rank === 'species');
  /** Genus and species names are italicised; higher ranks are not. */
  protected readonly italic = computed(() => ['species', 'genus'].includes(this.taxon().rank));
}

const STATUS_VARIANT: Record<RequestStatus, 'default' | 'secondary' | 'outline'> = {
  open: 'outline',
  proposed: 'secondary',
  verified: 'default',
  closed: 'outline',
};

@Component({
  selector: 'app-request-status',
  imports: [HlmBadgeImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span hlmBadge [variant]="variant()" class="capitalize">{{ status() }}</span>`,
})
export class RequestStatusBadge {
  readonly status = input.required<RequestStatus>();
  protected readonly variant = computed(() => STATUS_VARIANT[this.status()]);
}

/** Banner shown on demo content. */
@Component({
  selector: 'app-demo-banner',
  imports: [NgIcon],
  host: { class: 'block' },
  providers: [provideIcons({ lucideTriangleAlert })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
      <ng-icon name="lucideTriangleAlert" class="mt-0.5 shrink-0" />
      <span><ng-content>Demonstration content: verify against published keys and revisions before relying on it.</ng-content></span>
    </div>
  `,
})
export class DemoBanner {}
