import { ChangeDetectionStrategy, Component, computed, inject, model, signal } from '@angular/core';
import { rxResource, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLoaderCircle, lucideSearch, lucideX } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { debounceTime, of } from 'rxjs';
import { GbifTaxonomyService } from '../../taxonomy/gbif/gbif-taxonomy.service';
import { TaxonInput } from '../identification.api';

/** Search GBIF for an accepted fish species and pick one. */
@Component({
  selector: 'app-taxon-picker',
  imports: [NgIcon, HlmButtonImports, HlmInputImports],
  host: { class: 'block' },
  providers: [provideIcons({ lucideSearch, lucideX, lucideLoaderCircle })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (value(); as v) {
      <div class="border-input flex h-9 items-center gap-2 rounded-md border px-2.5 text-sm">
        <em>{{ v.scientificName }}</em>
        <span class="text-muted-foreground text-xs">{{ v.authorship }} · {{ v.family }}</span>
        <button hlmBtn variant="ghost" size="icon-xs" class="ml-auto" type="button" aria-label="Clear species" (click)="clear()">
          <ng-icon name="lucideX" />
        </button>
      </div>
    } @else {
      <div class="relative">
        <ng-icon name="lucideSearch" class="text-muted-foreground absolute top-2.5 left-2.5" />
        <input
          hlmInput
          class="pl-8"
          type="search"
          placeholder="Search GBIF for a species…"
          aria-label="Search species"
          autocomplete="off"
          [value]="query()"
          (input)="query.set($any($event.target).value)"
        />
        @if (query().trim().length >= 3) {
          <ul class="bg-popover text-popover-foreground absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border shadow-md" role="listbox">
            @if (results.isLoading()) {
              <li class="text-muted-foreground flex items-center gap-2 px-3 py-2 text-sm">
                <ng-icon name="lucideLoaderCircle" class="animate-spin" /> Searching GBIF…
              </li>
            }
            @for (r of options(); track r.key) {
              <li>
                <button type="button" role="option" class="hover:bg-muted w-full px-3 py-2 text-left text-sm" (click)="pick(r)">
                  <em>{{ r.canonicalName ?? r.scientificName }}</em>
                  <span class="text-muted-foreground ml-1 text-xs">{{ r.authorship }} · {{ r.family }}</span>
                </button>
              </li>
            } @empty {
              @if (!results.isLoading()) {
                <li class="text-muted-foreground px-3 py-2 text-sm">No accepted fish species found.</li>
              }
            }
          </ul>
        }
      </div>
    }
  `,
})
export class TaxonPicker {
  private readonly gbif = inject(GbifTaxonomyService);

  readonly value = model<TaxonInput | null>(null);
  protected readonly query = signal('');
  private readonly debounced = toSignal(toObservable(this.query).pipe(debounceTime(300)), { initialValue: '' });

  protected readonly results = rxResource({
    params: () => this.debounced().trim(),
    stream: ({ params: q }) =>
      q.length < 3
        ? of(null)
        : this.gbif.searchSpecies({ q, orderKey: null, threat: null, freshwaterOnly: false, offset: 0, limit: 10 }),
  });
  protected readonly options = computed(() => this.results.value()?.results ?? []);

  protected pick(r: { key: number; canonicalName?: string; scientificName: string; authorship?: string; family?: string; order?: string }): void {
    this.value.set({
      gbifKey: r.key,
      scientificName: r.canonicalName ?? r.scientificName,
      authorship: r.authorship || undefined,
      rank: 'species',
      family: r.family,
      order: r.order,
    });
    this.query.set('');
  }

  protected clear(): void {
    this.value.set(null);
  }
}
