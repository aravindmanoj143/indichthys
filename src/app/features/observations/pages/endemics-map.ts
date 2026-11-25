import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowRight, lucideBookOpen, lucideCamera, lucideCheck, lucideExternalLink, lucideInfo, lucideMapPin, lucideMountain, lucideSearch, lucideX } from '@ng-icons/lucide';
import { Observable, catchError, forkJoin, from, map, of, timeout } from 'rxjs';
import { IucnBadge } from '../../taxonomy/components/status-badges';
import type { GbifIucnCategory } from '../../taxonomy/gbif/gbif.models';
import { GbifTaxonomyService } from '../../taxonomy/gbif/gbif-taxonomy.service';
import * as L from 'leaflet';

/** public/data/endemic-fishes.json, built by `npm --prefix server run data:endemics`. */
interface EndemicData {
  generated: string;
  source: string;
  criteria: { minIndiaRecords: number; endemicShare: number; cellDeg: number };
  species: { key: number; name: string; family: string; records: number }[];
  /** [lat, lng, records, speciesIndexes, placeName, "district, state"] */
  places: [number, number, number, number[], string | null, string | null][];
}
type Place = EndemicData['places'][number];

const INDIA: L.LatLngTuple = [22, 80];
const LAYER_KEY = 'indichthys.endemics.layer';

/** Colour by how many endemic species a place has. */
const STEPS: { min: number; colour: string; label: string }[] = [
  { min: 10, colour: '#f43f5e', label: '10+ species' },
  { min: 5, colour: '#f59e0b', label: '5–9' },
  { min: 2, colour: '#10b981', label: '2–4' },
  { min: 1, colour: '#38bdf8', label: '1 species' },
];
const colourFor = (n: number) => STEPS.find((s) => n >= s.min)!.colour;
const placeTitle = (p: Place) => p[4] ?? p[5] ?? `${p[0].toFixed(1)}°N, ${p[1].toFixed(1)}°E`;

@Component({
  selector: 'app-endemics-map',
  imports: [NgIcon, RouterLink, IucnBadge],
  providers: [provideIcons({ lucideArrowRight, lucideBookOpen, lucideCamera, lucideCheck, lucideExternalLink, lucideInfo, lucideMapPin, lucideMountain, lucideSearch, lucideX })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="sr-only">Endemic fishes of India</h1>
    <div class="-mt-4 grid gap-4 lg:h-[calc(100vh-11rem)] lg:min-h-[560px] lg:grid-cols-[minmax(0,1fr)_21rem]">
      <!-- ───────── Map ───────── -->
      <section class="relative isolate h-[70vh] min-h-[460px] overflow-hidden rounded-3xl border border-black/5 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.45)] lg:h-full dark:border-white/10">
        <div #map class="h-full w-full bg-slate-900"></div>

        <!-- Species details (opens when a fish is picked) -->
        @if (selected(); as s) {
          @if (cardOpen()) {
            <article
              class="bg-background/95 absolute top-4 left-4 z-[500] flex max-h-[calc(100%-6.5rem)] w-[min(22rem,calc(100%-5rem))] flex-col overflow-hidden rounded-2xl border border-black/5 shadow-2xl backdrop-blur-md dark:border-white/10"
              aria-label="Species details"
            >
              @if (details.value()?.photo; as ph) {
                <div class="relative h-36 shrink-0 bg-slate-900">
                  <img [src]="ph.src" [alt]="s.name" class="h-full w-full object-cover" />
                  <a [href]="ph.link" target="_blank" rel="noopener noreferrer" class="absolute right-2 bottom-1.5 inline-flex items-center gap-1 rounded bg-black/45 px-1.5 py-0.5 text-[10px] text-white/90 backdrop-blur hover:text-white">
                    <ng-icon name="lucideCamera" size="11" /> {{ ph.credit }}
                  </a>
                </div>
              }
              <button
                type="button"
                (click)="cardOpen.set(false)"
                class="absolute top-2 right-2 z-10 grid size-7 place-items-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/60"
                aria-label="Close details"
              >
                <ng-icon name="lucideX" size="14" />
              </button>
              <div class="space-y-3 overflow-y-auto p-4">
                <div class="pr-6">
                  <h2 class="font-display text-xl leading-tight font-medium italic">{{ s.name }}</h2>
                  @if (details.value()?.authorship; as a) { <p class="text-muted-foreground text-xs">{{ a }}</p> }
                  @if (details.value()?.common; as c) { <p class="mt-0.5 text-sm">{{ c }}</p> }
                </div>
                @if (details.value()?.iucn; as iucn) { <app-iucn-badge [status]="iucn" [showLabel]="true" /> }

                @if (details.isLoading()) {
                  <div class="space-y-2" aria-busy="true">
                    <div class="bg-muted h-3 w-3/4 animate-pulse rounded"></div>
                    <div class="bg-muted h-3 w-1/2 animate-pulse rounded"></div>
                    <div class="bg-muted h-3 w-2/3 animate-pulse rounded"></div>
                  </div>
                } @else if (details.value(); as d) {
                  <dl class="grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-2 text-xs">
                    @if (d.authors) {
                      <dt class="text-muted-foreground">Described by</dt>
                      <dd>{{ d.authors }}</dd>
                    }
                    @if (d.year) {
                      <dt class="text-muted-foreground">Year</dt>
                      <dd>
                        {{ d.year }}
                        @if (d.movedGenus) { <span class="text-muted-foreground">· first described in another genus</span> }
                      </dd>
                    }
                    @if (d.family) {
                      <dt class="text-muted-foreground">Classification</dt>
                      <dd>{{ d.order ? d.order + ' › ' : '' }}{{ d.family }}</dd>
                    }
                    <dt class="text-muted-foreground">Recorded in</dt>
                    <dd>{{ states().join(', ') || 'India' }}</dd>
                    <dt class="text-muted-foreground">Records</dt>
                    <dd>{{ s.records }} records at {{ s.places }} place{{ s.places === 1 ? '' : 's' }}</dd>
                    @if (d.elevation; as e) {
                      <dt class="text-muted-foreground" title="Elevation at the centre of each ~11 km square where the species was recorded">Elevation (approx.)</dt>
                      <dd class="flex items-center gap-1">
                        <ng-icon name="lucideMountain" size="12" class="text-muted-foreground" />
                        {{ e.min === e.max ? e.min + ' m' : e.min + '–' + e.max + ' m' }}
                      </dd>
                    }
                  </dl>
                  @if (d.publishedIn) {
                    <div class="bg-muted/60 space-y-1 rounded-xl p-3 text-[11px] leading-relaxed">
                      <p class="text-muted-foreground flex items-center gap-1.5 font-medium"><ng-icon name="lucideBookOpen" size="12" /> Original description</p>
                      <p [innerHTML]="d.publishedIn"></p>
                    </div>
                  }
                }
                <div class="flex items-center justify-between gap-2 pt-1">
                  <a [routerLink]="['/taxonomy/species', s.key]" class="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900">
                    Species profile <ng-icon name="lucideArrowRight" size="13" />
                  </a>
                  <a [href]="'https://www.gbif.org/species/' + s.key" target="_blank" rel="noopener noreferrer" class="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs">
                    GBIF <ng-icon name="lucideExternalLink" size="12" />
                  </a>
                </div>
              </div>
            </article>
          } @else {
            <button
              type="button"
              (click)="cardOpen.set(true)"
              class="bg-background/95 absolute top-4 left-4 z-[500] inline-flex items-center gap-2 rounded-full border border-black/5 px-3.5 py-2 text-xs font-medium shadow-lg backdrop-blur dark:border-white/10"
            >
              <ng-icon name="lucideInfo" size="14" /> About <em>{{ s.name }}</em>
            </button>
          }
        }

      </section>

      <!-- ───────── Species list ───────── -->
      <aside
        class="bg-card flex max-h-[32rem] flex-col overflow-hidden rounded-3xl border border-black/5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.18)] lg:max-h-none dark:border-white/10"
        aria-labelledby="endemic-list"
      >
        <header class="space-y-3 border-b border-black/5 p-4 dark:border-white/10">
          <div class="flex items-baseline justify-between gap-2">
            <h2 id="endemic-list" class="font-display text-lg font-medium">Endemic species</h2>
            <span class="text-muted-foreground text-xs tabular-nums">
              @if (data.hasValue()) {
                {{ selected() ? visiblePlaces().length : data.value().places.length }} places
              } @else if (data.error()) {
                <span class="text-destructive">Could not load</span>
              } @else {
                Loading…
              }
            </span>
          </div>
          <div class="relative">
            <ng-icon name="lucideSearch" size="15" class="text-muted-foreground absolute top-2.5 left-3" />
            <input
              class="bg-background border-input h-9 w-full rounded-xl border pr-8 pl-9 text-sm outline-none focus:ring-2 focus:ring-amber-300/60"
              placeholder="Filter by species or family"
              aria-label="Filter species"
              [value]="query()"
              (input)="query.set($any($event.target).value)"
            />
            @if (query()) {
              <button type="button" class="text-muted-foreground hover:text-foreground absolute top-2 right-2 p-0.5" (click)="query.set('')" aria-label="Clear filter">
                <ng-icon name="lucideX" size="15" />
              </button>
            }
          </div>
          @if (selected(); as s) {
            <button
              type="button"
              (click)="selectedKey.set(null)"
              class="flex w-full items-center justify-between rounded-xl bg-amber-50 px-3 py-2 text-left text-xs text-amber-900 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/30"
            >
              <span>Showing <em class="font-semibold">{{ s.name }}</em></span>
              <span class="inline-flex items-center gap-1 font-medium">Show all <ng-icon name="lucideX" size="13" /></span>
            </button>
          }
        </header>
        <ul class="flex-1 overflow-y-auto p-2" role="listbox" aria-label="Endemic species">
          @for (s of filtered(); track s.key) {
            <li>
              <button
                type="button"
                role="option"
                [attr.aria-selected]="selectedKey() === s.key"
                (click)="toggle(s.key)"
                class="group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors"
                [class]="selectedKey() === s.key ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'hover:bg-muted/70'"
              >
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-medium italic">{{ s.name }}</span>
                  <span class="block truncate text-[11px] opacity-60">{{ s.family }}</span>
                </span>
                <span class="flex shrink-0 items-center gap-1 text-[11px] tabular-nums opacity-70">
                  <ng-icon name="lucideMapPin" size="12" />{{ s.places }}
                </span>
              </button>
            </li>
          } @empty {
            @if (data.hasValue()) {
              <li class="text-muted-foreground px-3 py-8 text-center text-sm">No species match “{{ query() }}”.</li>
            }
          }
        </ul>
        <footer class="space-y-2 border-t border-black/5 px-4 py-3 dark:border-white/10">
          <ul class="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-[11px]" aria-label="Endemic species at a place">
            @for (s of steps; track s.min) {
              <li class="flex items-center gap-1.5">
                <span class="size-2.5 rounded-full ring-1 ring-black/10" [style.background]="s.colour"></span>{{ s.label }}
              </li>
            }
          </ul>
          <details class="text-muted-foreground text-[11px] leading-relaxed">
            <summary class="hover:text-foreground flex cursor-pointer list-none items-center gap-1.5 font-medium">
              <ng-icon name="lucideInfo" size="13" /> How this map is made
            </summary>
            @if (data.value(); as d) {
              <p class="mt-2">
                Species count as endemic when at least {{ d.criteria.endemicShare * 100 }}% of their GBIF records (and at least
                {{ d.criteria.minIndiaRecords }}) are from India; marine-only species are left out. It is derived from open records, not an
                official checklist. Places are grouped into ~11 km squares, which also blurs sensitive sites. Data: GBIF.org ({{ d.generated }});
                place names from the records and OpenStreetMap; elevation from Open-Meteo.
              </p>
            }
          </details>
        </footer>
      </aside>
    </div>
  `,
})
export class EndemicsMap {
  private readonly http = inject(HttpClient);
  private readonly gbif = inject(GbifTaxonomyService);
  /** Details card for the selected species (closable; reopens on the next pick). */
  protected readonly cardOpen = signal(true);
  /** The details card is on screen (it covers the top-left of the map). */
  private readonly cardShowing = computed(() => !!this.selected() && this.cardOpen());
  private readonly router = inject(Router);
  private readonly mapEl = viewChild.required<ElementRef<HTMLElement>>('map');
  private map?: L.Map;
  private readonly layer = L.layerGroup();
  /** Outlines of endemic areas, drawn under the points. */
  private readonly areaLayer = L.layerGroup();

  protected readonly steps = STEPS;
  protected readonly query = signal('');
  /** Selected species (also in the URL as ?species=<GBIF key>, so a view can be shared). */
  protected readonly selectedKey = signal<number | null>(Number(inject(ActivatedRoute).snapshot.queryParamMap.get('species')) || null);
  protected readonly data = rxResource({ stream: () => this.http.get<EndemicData>('data/endemic-fishes.json') });

  /** Species with how many places each was recorded at. */
  private readonly species = computed(() => {
    const d = this.data.value();
    if (!d) return [];
    const places = new Array<number>(d.species.length).fill(0);
    for (const p of d.places) for (const i of p[3]) places[i]!++;
    // Species without any mappable record are left out of the list.
    return d.species.map((s, index) => ({ ...s, index, places: places[index]! })).filter((s) => s.places > 0);
  });

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const list = this.species();
    return q ? list.filter((s) => s.name.toLowerCase().includes(q) || s.family.toLowerCase().includes(q)) : list;
  });

  protected readonly selected = computed(() => this.species().find((s) => s.key === this.selectedKey()) ?? null);

  /** States the selected species was recorded in (from the places' "district, state"). */
  protected readonly states = computed(() => {
    const regions = this.visiblePlaces().map((p) => p[5]?.split(',').pop()?.trim()).filter((x): x is string => !!x);
    return this.selected() ? [...new Set(regions)].sort() : [];
  });

  protected readonly details = rxResource({
    params: () => {
      const s = this.selected();
      return s ? { key: s.key, points: this.visiblePlaces().map((p) => [p[0], p[1]] as [number, number]) } : undefined;
    },
    stream: ({ params }) => this.loadDetails(params.key, params.points),
  });

  protected readonly visiblePlaces = computed(() => {
    const d = this.data.value();
    if (!d) return [];
    const s = this.selected();
    return s ? d.places.filter((p) => p[3].includes(s.index)) : d.places;
  });

  constructor() {
    afterNextRender(() => {
      const esri = 'https://server.arcgisonline.com/ArcGIS/rest/services';
      const labels = () => L.tileLayer(`${esri}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`, { maxZoom: 19 });
      const satellite = L.layerGroup([
        L.tileLayer(`${esri}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, { maxZoom: 19, attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics' }),
        labels(),
      ]);
      const light = L.layerGroup([
        L.tileLayer(`${esri}/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`, {
          maxZoom: 16,
          attribution: 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors',
        }),
        L.tileLayer(`${esri}/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, { maxZoom: 16 }),
      ]);
      const bases: Record<string, L.Layer> = { Satellite: satellite, Map: light };
      // Remember the viewer's choice; satellite by default.
      const saved = readSetting(LAYER_KEY);
      const base = (saved && bases[saved]) || satellite;

      const m = (this.map = L.map(this.mapEl().nativeElement, { center: INDIA, zoom: 5, layers: [base, this.areaLayer, this.layer], zoomControl: false, worldCopyJump: true }));
      L.control.zoom({ position: 'bottomright' }).addTo(m);
      L.control.layers(bases, undefined, { position: 'topright' }).addTo(m);
      L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(m);
      this.addElevation(m);
      this.zoomToSelection();
      m.on('baselayerchange', (e: L.LayersControlEvent) => writeSetting(LAYER_KEY, e.name));
      this.draw();
    });

    effect(() => {
      this.visiblePlaces();
      this.cardShowing(); // popups need the card's padding
      this.draw();
    });
    effect(() => {
      const key = this.selectedKey();
      untracked(() => this.router.navigate([], { queryParams: { species: key }, replaceUrl: true }));
    });
    // Zoom to the chosen species, or back to India when cleared.
    effect(() => {
      this.selected();
      this.cardShowing(); // re-fit when the card opens or closes
      untracked(() => this.zoomToSelection());
    });
    inject(DestroyRef).onDestroy(() => this.map?.remove());
  }

  /** Bottom-left readout: elevation and coordinates under the cursor (map centre on touch screens). */
  private addElevation(m: L.Map): void {
    const box = el('div', 'leaflet-control rounded-md bg-white/90 px-2 py-1 text-[11px] text-slate-700 shadow-sm ring-1 ring-black/10 tabular-nums backdrop-blur');
    box.textContent = 'Elevation: move over the map';
    const Ctl = L.Control.extend({ onAdd: () => box });
    new Ctl({ position: 'bottomleft' }).addTo(m);

    const cache = new Map<string, number | null>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pending: AbortController | undefined;
    const show = (lat: number, lng: number, metres: number | null | undefined) => {
      const pos = `${Math.abs(lat).toFixed(3)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(3)}°${lng >= 0 ? 'E' : 'W'}`;
      const elev = metres === undefined ? '…' : metres === null ? '—' : `${Math.round(metres).toLocaleString('en-IN')} m`;
      box.textContent = `Elevation ${elev} · ${pos}`;
    };
    const lookup = (ll: L.LatLng) => {
      const lat = Number(ll.lat.toFixed(3));
      const lng = Number(L.Util.wrapNum(ll.lng, [-180, 180], true).toFixed(3));
      const id = `${lat},${lng}`;
      if (cache.has(id)) return show(lat, lng, cache.get(id));
      show(lat, lng, undefined);
      clearTimeout(timer);
      timer = setTimeout(async () => {
        pending?.abort();
        pending = new AbortController();
        try {
          const r = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`, { signal: pending.signal });
          const v = r.ok ? ((await r.json()) as { elevation?: number[] }).elevation?.[0] : undefined;
          cache.set(id, typeof v === 'number' ? v : null);
          show(lat, lng, cache.get(id));
        } catch {
          /* aborted by a newer position, or offline */
        }
      }, 250);
    };
    m.on('mousemove', (e: L.LeafletMouseEvent) => lookup(e.latlng));
    m.on('click', (e: L.LeafletMouseEvent) => lookup(e.latlng));
    if (matchMedia('(hover: none)').matches) {
      m.on('moveend', () => lookup(m.getCenter()));
      lookup(m.getCenter());
    }
  }

  /** Fit the map to the selected species' places (or India). Called when the selection, the data or the map arrive. */
  private zoomToSelection(): void {
    const s = this.selected();
    const places = this.visiblePlaces();
    if (!this.map) return;
    if (s && places.length) {
      // Keep the places clear of the details card: fit them into the part of the map to its right.
      this.map.flyToBounds(L.latLngBounds(places.map((p) => [p[0], p[1]] as L.LatLngTuple)), {
        paddingTopLeft: [this.cardInset() + 40, 60],
        paddingBottomRight: [60, 60],
        maxZoom: 9,
        duration: 0.8,
      });
    }
    else if (!s) this.map.flyTo(INDIA, 5, { duration: 0.8 });
  }

  /** Width of map hidden by the details card (0 when it's closed); capped so narrow maps keep room. */
  private cardInset(): number {
    if (!this.map || !this.cardShowing()) return 0;
    const card = this.mapEl().nativeElement.parentElement?.querySelector('article[aria-label="Species details"]') as HTMLElement | null;
    const width = (card?.offsetWidth ?? 352) + 16;
    return Math.min(width, this.map.getSize().x * 0.6);
  }

  protected toggle(key: number): void {
    this.selectedKey.update((k) => (k === key ? null : key));
    this.cardOpen.set(true);
  }

  /** Name, authorship, original description, IUCN status, a photo and the elevation range of the species' places. */
  private loadDetails(key: number, points: [number, number][]): Observable<SpeciesDetails> {
    const s = this.species().find((x) => x.key === key);
    const gbif = 'https://api.gbif.org/v1';
    const species$ = this.http
      .get<{ authorship?: string; publishedIn?: string; order?: string; family?: string }>(`${gbif}/species/${key}`)
      .pipe(catchError(() => of({} as { authorship?: string; publishedIn?: string; order?: string; family?: string })));
    const common$ = this.http.get<{ results: { vernacularName: string; language?: string }[] }>(`${gbif}/species/${key}/vernacularNames?limit=50`).pipe(
      map((r) => r.results.find((v) => v.language === 'eng')?.vernacularName ?? null),
      catchError(() => of(null)),
    );
    const photo$ = this.http
      .get<{ results: { key: number; media?: { identifier?: string; rightsHolder?: string; creator?: string; license?: string }[] }[] }>(
        `${gbif}/occurrence/search?taxonKey=${key}&mediaType=StillImage&license=CC0_1_0&license=CC_BY_4_0&license=CC_BY_NC_4_0&limit=5`,
      )
      .pipe(
        map((r) => {
          for (const o of r.results) {
            const m = o.media?.find((x) => x.identifier);
            if (m?.identifier) {
              return {
                src: m.identifier.replace('/original.', '/medium.'),
                credit: `${m.rightsHolder ?? m.creator ?? 'Unknown'} · ${licenceLabel(m.license)}`,
                link: `https://www.gbif.org/occurrence/${o.key}`,
              };
            }
          }
          return null;
        }),
        catchError(() => of(null)),
      );
    const iucn$ = this.gbif.iucnCategory(key).pipe(map((c: GbifIucnCategory | null) => c?.category ?? null));
    const elevation$ = from(elevationRange(points)).pipe(catchError(() => of(null)));
    // Each source gets a time limit, so one slow service can't hold the card in "loading".
    const limit = <T>(o: Observable<T>, fallback: T) => o.pipe(timeout(10_000), catchError(() => of(fallback)));
    return forkJoin({
      sp: limit(species$, {} as { authorship?: string; publishedIn?: string; order?: string; family?: string }),
      common: limit(common$, null),
      photo: limit(photo$, null),
      iucn: limit(iucn$, null),
      elevation: limit(elevation$, null),
    }).pipe(
      map(({ sp, common, photo, iucn, elevation }) => {
        const a = parseAuthorship(sp.authorship ?? '');
        return {
          authorship: sp.authorship?.trim() || null,
          authors: a.authors,
          year: a.year,
          movedGenus: a.parenthesised,
          publishedIn: sp.publishedIn?.trim() || null,
          order: sp.order ?? null,
          family: sp.family ?? s?.family ?? null,
          common,
          photo,
          iucn,
          elevation,
        };
      }),
    );
  }

  private draw(): void {
    const d = this.data.value();
    if (!this.map || !d) return;
    this.layer.clearLayers();
    this.areaLayer.clearLayers();
    const sel = this.selected();
    const inset = untracked(() => this.cardInset());
    const places = [...this.visiblePlaces()].sort((a, b) => a[3].length - b[3].length); // richest on top

    // Endemic areas: clusters of nearby places, outlined. All species: hotspots (≥4 places within ~55 km
    // of each other). One species: its whole recorded range, including single places.
    const pts = places.map((p) => [p[0], p[1]] as [number, number]);
    for (const ring of endemicAreas(pts, sel ? 1 : 0.5, sel ? 1 : 4, 0.4)) {
      L.polygon(ring, {
        color: '#facc15',
        weight: 3,
        opacity: 0.95,
        dashArray: '8 6',
        fillColor: '#fbbf24',
        fillOpacity: sel ? 0.18 : 0.14,
        interactive: false,
      }).addTo(this.areaLayer);
    }
    for (const p of places) {
      const n = p[3].length;
      L.circleMarker([p[0], p[1]], {
        radius: 5 + Math.min(10, Math.sqrt(n) * 2.2),
        weight: 2,
        color: '#ffffff',
        fillColor: sel ? '#fbbf24' : colourFor(n),
        fillOpacity: 0.9,
      })
        .bindTooltip(`<strong>${escapeHtml(placeTitle(p))}</strong><br>${n} endemic species`, { direction: 'top', offset: [0, -6] })
        .bindPopup(() => this.popup(d, p, sel?.index ?? null), {
          maxWidth: 300,
          minWidth: 240,
          // With the details card open, pan popups out from under it (to its right).
          autoPanPaddingTopLeft: [inset + 20, 20],
          autoPanPaddingBottomRight: [20, 20],
        })
        .addTo(this.layer);
    }
  }

  /** Popup: place name and region, then the endemic species recorded there (names open the species page). */
  private popup(d: EndemicData, p: Place, highlight: number | null): HTMLElement {
    const [lat, lng, records, idx, , region] = p;
    const root = el('div', 'space-y-2 text-xs');
    const title = el('p', 'text-sm font-semibold text-slate-900 leading-snug');
    title.textContent = placeTitle(p);
    root.append(title);
    if (region && region !== title.textContent) root.append(Object.assign(el('p', '-mt-1.5 text-[11px] text-slate-500'), { textContent: region }));
    root.append(
      Object.assign(el('p', 'text-[11px] text-slate-500'), {
        textContent: `${idx.length} endemic species · ${records} record${records === 1 ? '' : 's'} · ${lat.toFixed(1)}°N, ${lng.toFixed(1)}°E`,
      }),
    );
    const list = el('ul', 'max-h-52 space-y-1 overflow-y-auto border-t border-slate-200 pt-2 pr-1');
    for (const i of [...idx].sort((a, b) => d.species[a]!.name.localeCompare(d.species[b]!.name))) {
      const s = d.species[i]!;
      const li = el('li', i === highlight ? 'rounded bg-amber-100 px-1 -mx-1' : '');
      const a = Object.assign(el('a', 'font-medium italic text-slate-900 hover:underline'), { href: `taxonomy/species/${s.key}`, textContent: s.name }) as HTMLAnchorElement;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        this.router.navigate(['/taxonomy/species', s.key]);
      });
      li.append(a, Object.assign(el('span', 'ml-1 text-slate-500'), { textContent: s.family }));
      list.append(li);
    }
    root.append(list);
    return root;
  }
}

/**
 * Endemic areas: places grouped by DBSCAN (eps in degrees, minPts places per core), each group outlined by the
 * convex hull of its places padded with a ring of points (so single places and thin lines still get an area).
 */
export function endemicAreas(points: [number, number][], eps: number, minPts: number, pad = 0.2): [number, number][][] {
  const n = points.length;
  const near = (i: number) => points.flatMap((q, j) => (Math.hypot(q[0] - points[i]![0], q[1] - points[i]![1]) <= eps ? [j] : []));
  const label = new Array<number>(n).fill(-1);
  let cluster = 0;
  for (let i = 0; i < n; i++) {
    if (label[i] !== -1) continue;
    const seeds = near(i);
    if (seeds.length < minPts) continue; // noise (or a border point picked up later)
    label[i] = cluster;
    for (let k = 0; k < seeds.length; k++) {
      const j = seeds[k]!;
      if (label[j] !== -1) continue;
      label[j] = cluster;
      const more = near(j);
      if (more.length >= minPts) seeds.push(...more.filter((x) => !seeds.includes(x)));
    }
    cluster++;
  }
  const rings: [number, number][][] = [];
  for (let c = 0; c < cluster; c++) {
    const padded: [number, number][] = [];
    points.forEach((p, i) => {
      if (label[i] !== c) return;
      for (let a = 0; a < 12; a++) padded.push([p[0] + pad * Math.sin((a * Math.PI) / 6), p[1] + pad * Math.cos((a * Math.PI) / 6)]);
    });
    rings.push(convexHull(padded));
  }
  return rings;
}

/** Monotone-chain convex hull of [lat, lng] points. */
function convexHull(pts: [number, number][]): [number, number][] {
  const p = [...pts].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const cross = (o: [number, number], a: [number, number], b: [number, number]) => (a[1] - o[1]) * (b[0] - o[0]) - (a[0] - o[0]) * (b[1] - o[1]);
  const lower: [number, number][] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: [number, number][] = [];
  for (const q of p.reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, q) <= 0) upper.pop();
    upper.push(q);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

interface SpeciesDetails {
  authorship: string | null;
  authors: string | null;
  year: string | null;
  /** Authorship in parentheses: the species was first described in another genus. */
  movedGenus: boolean;
  /** Citation of the original description (GBIF; may contain <em>). */
  publishedIn: string | null;
  order: string | null;
  family: string | null;
  common: string | null;
  photo: { src: string; credit: string; link: string } | null;
  iucn: GbifIucnCategory['category'] | null;
  elevation: { min: number; max: number } | null;
}

/** "(Day, 1867)" → authors "Day", year "1867", parenthesised. */
export function parseAuthorship(raw: string): { authors: string | null; year: string | null; parenthesised: boolean } {
  const t = raw.trim();
  if (!t) return { authors: null, year: null, parenthesised: false };
  const parenthesised = /^\(.*\)$/.test(t);
  const inner = t.replace(/^\(|\)$/g, '').trim();
  const m = inner.match(/^(.*?),?\s*(\d{4})$/);
  return { authors: (m ? m[1]! : inner).trim() || null, year: m ? m[2]! : null, parenthesised };
}

const licenceLabel = (url?: string) =>
  !url ? 'licence unknown' : url.includes('/zero/') || url.includes('CC0') ? 'CC0' : url.includes('by-nc') || url.includes('BY_NC') ? 'CC BY-NC' : 'CC BY';

/** Min/max elevation (m) over a species' places, from Open-Meteo (up to 100 points per request). */
async function elevationRange(points: [number, number][]): Promise<{ min: number; max: number } | null> {
  if (!points.length) return null;
  const sample = points.length > 100 ? points.filter((_, i) => i % Math.ceil(points.length / 100) === 0) : points;
  const lat = sample.map((p) => p[0]).join(',');
  const lng = sample.map((p) => p[1]).join(',');
  const r = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`);
  if (!r.ok) return null;
  const v = ((await r.json()) as { elevation?: number[] }).elevation?.filter((x) => Number.isFinite(x)) ?? [];
  return v.length ? { min: Math.round(Math.min(...v)), max: Math.round(Math.max(...v)) } : null;
}

function el(tag: string, className: string): HTMLElement {
  const e = document.createElement(tag);
  e.className = className;
  return e;
}
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
function readSetting(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeSetting(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode): the choice just isn't remembered */
  }
}
