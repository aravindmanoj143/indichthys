import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronLeft, lucideChevronRight, lucideExternalLink, lucideLoaderCircle } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { GbifTaxonomyService, gbifErrorMessage } from '../gbif/gbif-taxonomy.service';
import { FOCUS_COUNTRY, GBIF_WEB } from '../gbif/gbif.config';

const PAGE_SIZE = 25;

/** Fish species with GBIF occurrence records in the focus country. */
@Component({
  selector: 'app-country-checklist',
  imports: [RouterLink, NgIcon, HlmButtonImports, HlmTableImports],
  providers: [provideIcons({ lucideChevronLeft, lucideChevronRight, lucideExternalLink, lucideLoaderCircle })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <p class="text-muted-foreground text-sm">
        Fish species with occurrence records in {{ country.name }} on GBIF, ranked by number of records.
        Records come from many datasets and may include misidentifications. Check the species page before relying on a record.
      </p>

      @if (checklist.error()) {
        <div class="text-destructive rounded-md border border-current/30 p-4 text-sm">
          {{ errorMessage() }}
          <button hlmBtn variant="link" size="sm" (click)="checklist.reload()">Retry</button>
        </div>
      } @else {
        <div hlmTableContainer class="rounded-md border" [class.opacity-60]="checklist.isLoading()">
          <table hlmTable>
            <thead hlmTHead>
              <tr hlmTr>
                <th hlmTh class="w-12">#</th>
                <th hlmTh>Scientific name</th>
                <th hlmTh>Family</th>
                <th hlmTh>Order</th>
                <th hlmTh class="text-right">Records in {{ country.name }}</th>
              </tr>
            </thead>
            <tbody hlmTBody>
              @for (e of entries(); track e.usage.key; let i = $index) {
                <tr hlmTr>
                  <td hlmTd class="text-muted-foreground tabular-nums">{{ page() * pageSize + i + 1 }}</td>
                  <td hlmTd>
                    <a [routerLink]="['species', e.usage.key]" class="text-primary underline-offset-4 hover:underline">
                      <em>{{ e.usage.canonicalName ?? e.usage.scientificName }}</em>
                    </a>
                    <span class="text-muted-foreground ml-1 text-xs">{{ e.usage.authorship }}</span>
                  </td>
                  <td hlmTd>{{ e.usage.family }}</td>
                  <td hlmTd>{{ e.usage.order }}</td>
                  <td hlmTd class="text-right tabular-nums">
                    <a
                      class="hover:underline"
                      target="_blank"
                      rel="noopener"
                      [href]="gbifWeb + '/occurrence/search?taxon_key=' + e.usage.key + '&country=' + country.code"
                    >
                      {{ e.occurrences.toLocaleString() }}
                    </a>
                  </td>
                </tr>
              } @empty {
                <tr hlmTr>
                  <td hlmTd colspan="5" class="text-muted-foreground py-8 text-center">
                    @if (checklist.isLoading()) {
                      <span class="inline-flex items-center gap-2"><ng-icon name="lucideLoaderCircle" class="animate-spin" /> Loading from GBIF…</span>
                    } @else {
                      No more species.
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="flex justify-end gap-2">
          <button hlmBtn variant="outline" size="sm" [disabled]="page() === 0 || checklist.isLoading()" (click)="page.set(page() - 1)">
            <ng-icon name="lucideChevronLeft" /> Previous
          </button>
          <button hlmBtn variant="outline" size="sm" [disabled]="entries().length < pageSize || checklist.isLoading()" (click)="page.set(page() + 1)">
            Next <ng-icon name="lucideChevronRight" />
          </button>
        </div>
      }
    </div>
  `,
})
export class CountryChecklist {
  private readonly gbif = inject(GbifTaxonomyService);
  protected readonly country = FOCUS_COUNTRY;
  protected readonly gbifWeb = GBIF_WEB;
  protected readonly pageSize = PAGE_SIZE;
  protected readonly page = signal(0);

  protected readonly checklist = rxResource({
    params: () => this.page(),
    stream: ({ params: page }) => this.gbif.countryChecklist(FOCUS_COUNTRY.code, page * PAGE_SIZE, PAGE_SIZE),
  });

  protected readonly entries = computed(() => (this.checklist.hasValue() ? this.checklist.value().entries : []));
  protected readonly errorMessage = computed(() => gbifErrorMessage(this.checklist.error()));
}
