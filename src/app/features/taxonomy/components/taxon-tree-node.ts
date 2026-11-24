import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronRight, lucideLoaderCircle } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCollapsibleImports } from '@spartan-ng/helm/collapsible';
import { GbifTaxonomyService, gbifErrorMessage } from '../gbif/gbif-taxonomy.service';
import { GbifNameUsage } from '../gbif/gbif.models';

const PAGE = 100;

export interface TreeTaxon {
  key: number;
  name: string;
  rank: string;
  numDescendants?: number;
}

export const toTreeTaxon = (u: GbifNameUsage): TreeTaxon => ({
  key: u.key,
  name: u.canonicalName ?? u.scientificName,
  rank: u.rank,
  numDescendants: u.numDescendants,
});

/** One node of the GBIF classification; children load from GBIF on first expand. */
@Component({
  selector: 'app-taxon-tree-node',
  imports: [HlmCollapsibleImports, HlmButtonImports, NgIcon, RouterLink],
  providers: [provideIcons({ lucideChevronRight, lucideLoaderCircle })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let t = taxon();
    @if (t.rank === 'SPECIES') {
      <a
        [routerLink]="['/taxonomy/species', t.key]"
        class="hover:bg-muted ml-6 flex items-center gap-2 rounded-md px-2 py-1 text-sm"
      >
        <span class="text-muted-foreground w-16 text-xs lowercase">species</span>
        <em class="text-primary underline-offset-4 hover:underline">{{ t.name }}</em>
      </a>
    } @else {
      <div hlmCollapsible [expanded]="open()" (expandedChange)="toggle($event)">
        <button
          hlmCollapsibleTrigger
          class="hover:bg-muted group flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm"
        >
          <ng-icon
            name="lucideChevronRight"
            class="text-muted-foreground shrink-0 transition-transform group-data-[state=open]:rotate-90"
          />
          <span class="text-muted-foreground w-16 text-xs lowercase">{{ t.rank }}</span>
          <span [class.italic]="t.rank === 'GENUS'" class="font-medium">{{ t.name }}</span>
          @if (t.numDescendants) {
            <span class="text-muted-foreground ml-auto text-xs tabular-nums">{{ t.numDescendants }} taxa</span>
          }
        </button>
        <hlm-collapsible-content class="border-border ml-4 border-l pl-2">
          @for (child of children(); track child.key) {
            <app-taxon-tree-node [taxon]="child" />
          }
          @if (loading()) {
            <p class="text-muted-foreground flex items-center gap-2 px-2 py-1 text-sm">
              <ng-icon name="lucideLoaderCircle" class="animate-spin" /> Loading from GBIF…
            </p>
          } @else if (error()) {
            <p class="text-destructive px-2 py-1 text-sm">{{ error() }}</p>
          } @else if (hasMore()) {
            <button hlmBtn variant="link" size="sm" (click)="load()">Load more…</button>
          } @else if (loaded() && !children().length) {
            <p class="text-muted-foreground px-2 py-1 text-sm">No child taxa.</p>
          }
        </hlm-collapsible-content>
      </div>
    }
  `,
})
export class TaxonTreeNode {
  private readonly gbif = inject(GbifTaxonomyService);

  readonly taxon = input.required<TreeTaxon>();

  protected readonly open = signal(false);
  protected readonly children = signal<TreeTaxon[]>([]);
  protected readonly loading = signal(false);
  protected readonly loaded = signal(false);
  protected readonly hasMore = signal(false);
  protected readonly error = signal<string | null>(null);

  protected toggle(expanded: boolean): void {
    this.open.set(expanded);
    if (expanded && !this.loaded()) this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.gbif.getChildren(this.taxon().key, this.children().length, PAGE).subscribe({
      next: (page) => {
        this.children.update((c) => [...c, ...page.results.map(toTreeTaxon)]);
        this.hasMore.set(!page.endOfRecords);
        this.loaded.set(true);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(gbifErrorMessage(e));
        this.loading.set(false);
      },
    });
  }
}
