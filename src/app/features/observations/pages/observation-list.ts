import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCamera, lucideChevronLeft, lucideChevronRight, lucideLoaderCircle, lucideMapPin, lucidePlus, lucideSearch } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { debounceTime } from 'rxjs';
import { AuthService } from '../../../core/auth.service';
import { SELECT_CLASS } from '../../content/components/shared';
import { ObservationMap } from '../components/observation-map';
import { QualityBadge } from '../components/quality-badge';
import { type QualityGrade, ObservationsApi, QUALITY_COLOURS, QUALITY_LABELS, apiErrorMessage, photoSrc } from '../observations.api';

@Component({
  selector: 'app-observation-list',
  imports: [DatePipe, RouterLink, NgIcon, HlmBadgeImports, HlmButtonImports, HlmInputImports, ObservationMap, QualityBadge],
  providers: [provideIcons({ lucidePlus, lucideSearch, lucideMapPin, lucideCamera, lucideChevronLeft, lucideChevronRight, lucideLoaderCircle })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div class="space-y-1">
        <h1 class="text-2xl font-semibold tracking-tight">Observations</h1>
        <p class="text-muted-foreground max-w-2xl">
          Fish sightings from the field, with photos, date and location. Anyone can add an observation, and signed-in members help identify them;
          records agreed by the community become research grade.
        </p>
      </div>
      <a hlmBtn routerLink="/observations/new"><ng-icon name="lucidePlus" /> Add observation</a>
    </header>

    <div class="mb-4 flex flex-wrap items-center gap-3">
      <div class="relative w-full sm:w-72">
        <ng-icon name="lucideSearch" class="text-muted-foreground absolute top-2.5 left-2.5" />
        <input hlmInput type="search" class="w-full pl-8" placeholder="Species or genus…" aria-label="Search by species"
          [value]="q()" (input)="q.set($any($event.target).value); page.set(0)" />
      </div>
      <select [class]="selectClass" aria-label="Quality grade" [value]="quality()" (change)="quality.set($any($event.target).value); page.set(0)">
        <option value="">All quality grades</option>
        @for (g of grades; track g) { <option [value]="g">{{ labels[g] }}</option> }
      </select>
      <label class="flex items-center gap-2 text-sm">
        <input type="checkbox" class="accent-primary size-4" [checked]="inArea()" (change)="inArea.set($any($event.target).checked); page.set(0)" />
        Only in map area
      </label>
      @if (auth.user()) {
        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" class="accent-primary size-4" [checked]="mine()" (change)="mine.set($any($event.target).checked); page.set(0)" />
          My observations
        </label>
      }
      @if (list.value(); as l) {
        <p class="text-muted-foreground ml-auto text-sm">
          <strong class="text-foreground">{{ l.total }}</strong> observation{{ l.total === 1 ? '' : 's' }} ·
          <strong class="text-foreground">{{ l.species }}</strong> species
        </p>
      }
    </div>

    <div class="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div class="lg:sticky lg:top-4 lg:self-start">
        <app-observation-map class="h-[360px] lg:h-[560px]" [points]="points.value() ?? []" [fitPoints]="true"
          (boundsChange)="bbox.set($event)" (pointClick)="open($event)" />
        <p class="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          @for (g of grades; track g) {
            <span class="flex items-center gap-1.5"><span class="inline-block size-2.5 rounded-full" [style.background]="colours[g]"></span>{{ labels[g] }}</span>
          }
          <span>Obscured locations are shown at the centre of a ~20 km square.</span>
        </p>
      </div>

      <section aria-label="Observation list">
        @if (list.error()) {
          <p class="text-destructive text-sm" role="alert">{{ error(list.error()) }}</p>
        } @else if (list.isLoading() && !list.hasValue()) {
          <p class="text-muted-foreground flex items-center gap-2 text-sm"><ng-icon name="lucideLoaderCircle" class="animate-spin" /> Loading…</p>
        } @else if (list.value(); as l) {
          @if (!l.items.length) {
            <div class="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
              @if (q() || quality() || inArea() || mine()) { No observations match these filters. }
              @else { No observations yet. Be the first to share a fish you've seen in the field. }
            </div>
          }
          <ul class="grid gap-3 sm:grid-cols-2">
            @for (o of l.items; track o.id) {
              <li>
                <a [routerLink]="['/observations', o.id]" class="hover:bg-muted/50 flex h-full gap-3 rounded-lg border p-2 transition-colors">
                  @if (o.photo) {
                    <img [src]="photoSrc(o.photo)" alt="" loading="lazy" class="size-24 shrink-0 rounded-md object-cover" />
                  } @else {
                    <div class="bg-muted text-muted-foreground flex size-24 shrink-0 items-center justify-center rounded-md"><ng-icon name="lucideCamera" size="22" /></div>
                  }
                  <div class="min-w-0 space-y-1 py-0.5 text-sm">
                    <p class="truncate font-medium">
                      @if (o.taxonName) { <em>{{ o.taxonName }}</em> } @else { <span class="text-muted-foreground">Unidentified fish</span> }
                    </p>
                    <app-quality-badge [grade]="o.qualityGrade" />
                    <p class="text-muted-foreground truncate text-xs">
                      <ng-icon name="lucideMapPin" size="12" class="mr-0.5 align-[-1px]" />{{ o.placeName || o.waterBody || 'Location not given' }}
                    </p>
                    <p class="text-muted-foreground text-xs">
                      {{ o.observedAt ? (o.observedAt | date: 'd MMM y') : 'No date' }} · {{ o.observer.name }}
                      @if (o.sourceUrl) { <span class="bg-muted ml-1 rounded px-1 py-px text-[10px]">iNaturalist</span> }
                    </p>
                  </div>
                </a>
              </li>
            }
          </ul>
          @if (l.total > l.pageSize) {
            <nav class="mt-4 flex items-center justify-between text-sm" aria-label="Pages">
              <button hlmBtn variant="outline" size="sm" [disabled]="page() === 0" (click)="page.set(page() - 1)"><ng-icon name="lucideChevronLeft" /> Previous</button>
              <span class="text-muted-foreground">Page {{ page() + 1 }} of {{ pages() }}</span>
              <button hlmBtn variant="outline" size="sm" [disabled]="page() + 1 >= pages()" (click)="page.set(page() + 1)">Next <ng-icon name="lucideChevronRight" /></button>
            </nav>
          }
        }
      </section>
    </div>
  `,
})
export class ObservationList {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(ObservationsApi);
  private readonly router = inject(Router);

  protected readonly selectClass = SELECT_CLASS;
  protected readonly photoSrc = photoSrc;
  protected readonly grades: QualityGrade[] = ['research', 'needs-id', 'casual'];
  protected readonly labels = QUALITY_LABELS;
  protected readonly colours = QUALITY_COLOURS;

  protected readonly q = signal('');
  protected readonly quality = signal<QualityGrade | ''>('');
  protected readonly inArea = signal(false);
  protected readonly mine = signal(false);
  protected readonly bbox = signal('');
  protected readonly page = signal(0);

  private readonly search = toSignal(toObservable(this.q).pipe(debounceTime(300)), { initialValue: '' });
  /** Map pans only matter when "Only in map area" is on. */
  private readonly area = toSignal(toObservable(computed(() => (this.inArea() ? this.bbox() : ''))).pipe(debounceTime(250)), { initialValue: '' });

  private readonly filters = computed(() => ({ q: this.search().trim(), quality: this.quality(), mine: this.mine() }));

  protected readonly points = rxResource({ params: this.filters, stream: ({ params }) => this.api.map(params) });
  protected readonly list = rxResource({
    params: () => ({ ...this.filters(), bbox: this.area() || undefined, page: this.page() }),
    stream: ({ params }) => this.api.list(params),
  });
  protected readonly pages = computed(() => {
    const l = this.list.value();
    return l ? Math.ceil(l.total / l.pageSize) : 1;
  });

  protected open(id: number): void {
    this.router.navigate(['/observations', id]);
  }
  protected error(e: unknown): string {
    return apiErrorMessage(e);
  }
}
