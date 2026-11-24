import { ChangeDetectionStrategy, Component, computed, inject, input, numberAttribute } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideSearch } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { DemoBanner } from '../components/shared';
import { KeyPath, TaxonProfilePanel } from '../components/taxon-profile';
import { TaxonTree } from '../components/taxon-tree';
import { IdentificationApi, TaxonRef, apiErrorMessage } from '../identification.api';
import { buildTaxonTree, filterTaxa } from '../taxon-tree.utils';

/**
 * Key identification by browsing: pick a fish in the taxon tree to see its key characters
 * (its path through each dichotomous key) and its scored character profile.
 * Selection lives in the URL (?taxon=ID or ?group=LEAD_ID; ?q= filters) so it can be linked.
 */
@Component({
  selector: 'app-key-identification',
  imports: [RouterLink, NgIcon, HlmButtonImports, HlmCardImports, HlmInputImports, DemoBanner, TaxonTree, TaxonProfilePanel, KeyPath],
  providers: [provideIcons({ lucideArrowLeft, lucideSearch })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a hlmBtn variant="ghost" size="sm" routerLink="/identification" class="mb-4 -ml-2">
      <ng-icon name="lucideArrowLeft" /> Identification
    </a>
    <header class="mb-6 space-y-1">
      <h1 class="text-2xl font-semibold tracking-tight">Key identification</h1>
      <p class="text-muted-foreground max-w-2xl">
        Browse the fishes covered by the keys. Select one to see the key characters that lead to it and its full character profile.
      </p>
      @if (keysLabel()) { <p class="text-muted-foreground text-xs">Keys: {{ keysLabel() }}</p> }
    </header>

    @if (data.error()) {
      <div class="text-destructive rounded-md border border-current/30 p-4 text-sm">
        {{ error(data.error()) }}
        <button hlmBtn variant="link" size="sm" (click)="data.reload()">Retry</button>
      </div>
    } @else {
      @if (hasDemo()) { <app-demo-banner class="mb-6" /> }
      <div class="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <!-- Taxon tree -->
        <div hlmCard size="sm" class="lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:self-start lg:overflow-auto">
          <div hlmCardHeader>
            <h2 hlmCardTitle>Fishes</h2>
            <div class="relative mt-2">
              <ng-icon name="lucideSearch" class="text-muted-foreground absolute top-2.5 left-2.5" />
              <input hlmInput type="search" class="pl-8" placeholder="Filter by name, family, order…" aria-label="Filter fishes"
                [value]="q() ?? ''" (input)="setQuery($any($event.target).value)" />
            </div>
          </div>
          <div hlmCardContent class="space-y-4">
            @if (data.hasValue()) {
              <app-taxon-tree [nodes]="tree()" [selectedId]="taxon() ?? null" (pick)="selectTaxon($event)" label="Fishes" />
              @if (groups().length) {
                <div>
                  <p class="text-muted-foreground mb-1 text-xs uppercase">Groups (key end points)</p>
                  <ul class="space-y-0.5">
                    @for (g of groups(); track g.leadId) {
                      <li>
                        <button type="button" (click)="selectGroup(g.leadId)" [attr.aria-pressed]="group() === g.leadId"
                          class="w-full rounded-md px-2 py-1 text-left text-sm"
                          [class]="group() === g.leadId ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'">
                          {{ g.name }}
                        </button>
                      </li>
                    }
                  </ul>
                </div>
              }
            } @else {
              <p class="text-muted-foreground text-sm">Loading…</p>
            }
          </div>
        </div>

        <!-- Selected fish -->
        <div hlmCard>
          <div hlmCardContent>
            @if (taxon(); as id) {
              <app-taxon-profile [taxonId]="id" />
            } @else if (selectedGroup(); as g) {
              <div class="space-y-6">
                <header>
                  <h2 class="text-xl font-semibold">{{ g.name }}</h2>
                  <p class="text-muted-foreground text-sm">A group end point: the key stops here without naming a single taxon.</p>
                </header>
                <section>
                  <h3 class="text-muted-foreground mb-3 text-xs font-medium uppercase">Key characters</h3>
                  <app-key-path [title]="g.key.title" [endPoint]="g.endPoint" [path]="g.path" />
                </section>
              </div>
            } @else {
              <p class="text-muted-foreground text-sm">Select a fish in the tree to see its characters.</p>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class KeyIdentification {
  private readonly api = inject(IdentificationApi);
  private readonly router = inject(Router);
  protected readonly error = apiErrorMessage;

  /** Query params (bound via withComponentInputBinding). */
  readonly taxon = input(undefined, { transform: (v: unknown) => (v == null || v === '' ? undefined : numberAttribute(v)) });
  readonly group = input(undefined, { transform: (v: unknown) => (v == null || v === '' ? undefined : numberAttribute(v)) });
  readonly q = input<string>();

  protected readonly data = rxResource({ stream: () => this.api.browse() });

  private readonly filtered = computed(() => filterTaxa(this.data.value()?.taxa ?? [], this.q() ?? ''));
  protected readonly tree = computed(() => buildTaxonTree(this.filtered()));
  protected readonly groups = computed(() => {
    const q = (this.q() ?? '').trim().toLowerCase();
    const all = this.data.value()?.groups ?? [];
    return q ? all.filter((g) => g.name.toLowerCase().includes(q)) : all;
  });
  protected readonly selectedGroup = computed(() => this.data.value()?.groups.find((g) => g.leadId === this.group()));
  protected readonly keysLabel = computed(() =>
    (this.data.value()?.keys ?? []).map((k) => k.title + (k.isDemo ? ' (demo)' : '')).join(' · '),
  );
  protected readonly hasDemo = computed(() => this.data.value()?.keys.some((k) => k.isDemo) ?? false);

  private navigate(params: Record<string, string | number | null>): void {
    this.router.navigate([], { queryParams: params, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected selectTaxon(t: TaxonRef): void {
    this.navigate({ taxon: t.id, group: null });
  }

  protected selectGroup(leadId: number): void {
    this.navigate({ group: leadId, taxon: null });
  }

  protected setQuery(q: string): void {
    this.navigate({ q: q || null });
  }
}
