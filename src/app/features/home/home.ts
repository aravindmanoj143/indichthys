import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowRight,
  lucideArrowUpRight,
  lucideBookOpen,
  lucideCalendarDays,
  lucideCamera,
  lucideChevronLeft,
  lucideChevronRight,
  lucideCompass,
  lucideFish,
  lucideFlaskConical,
  lucideGraduationCap,
  lucideLeaf,
  lucideMapPin,
  lucideMegaphone,
  lucideNetwork,
  lucideNewspaper,
  lucideScanSearch,
  lucideShieldCheck,
  lucideSparkles,
  lucideUsers,
} from '@ng-icons/lucide';
import { map } from 'rxjs';
import { ContentApi, NEWS_CATEGORIES, NewsCategory } from '../content/content.api';
import { IucnBadge } from '../taxonomy/components/status-badges';
import { GbifTaxonomyService } from '../taxonomy/gbif/gbif-taxonomy.service';
import { FeaturedFish, HERO_SLIDES, PHOTO_CREDIT, featuredFor, isoWeek, observationUrl } from './home.data';

/** Each slide's display time; the progress bar's animation drives autoplay. */
const SLIDE_SECONDS = 7;

const NEWS_STYLE: Record<NewsCategory, { icon: string; tile: string; text: string }> = {
  news: { icon: 'lucideNewspaper', tile: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300', text: 'text-slate-600 dark:text-slate-300' },
  'new-species': { icon: 'lucideSparkles', tile: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', text: 'text-emerald-700 dark:text-emerald-300' },
  'taxonomic-update': { icon: 'lucideNetwork', tile: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300', text: 'text-violet-700 dark:text-violet-300' },
  research: { icon: 'lucideFlaskConical', tile: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300', text: 'text-sky-700 dark:text-sky-300' },
  conservation: { icon: 'lucideLeaf', tile: 'bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300', text: 'text-teal-700 dark:text-teal-300' },
  announcement: { icon: 'lucideMegaphone', tile: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', text: 'text-amber-700 dark:text-amber-300' },
};

const EXPLORE = [
  { label: 'Taxonomy', text: 'Classification and species profiles', link: '/taxonomy', icon: 'lucideFish' },
  { label: 'Identification', text: 'Keys, guides and ID help', link: '/identification', icon: 'lucideScanSearch' },
  { label: 'Observations', text: 'Field records on a map', link: '/observations', icon: 'lucideMapPin' },
  { label: 'Publications', text: 'Papers and field guides', link: '/publications', icon: 'lucideBookOpen' },
  { label: 'Ichthyologists', text: 'Find researchers to work with', link: '/ichthyologists', icon: 'lucideUsers' },
  { label: 'Conservation', text: 'Projects and threatened species', link: '/conservation', icon: 'lucideShieldCheck' },
  { label: 'Learning', text: 'Courses and workshops', link: '/learning', icon: 'lucideGraduationCap' },
  { label: 'Events', text: 'Conferences and seminars', link: '/events', icon: 'lucideCalendarDays' },
] as const;

@Component({
  selector: 'app-home',
  imports: [DatePipe, RouterLink, NgIcon, IucnBadge],
  providers: [
    provideIcons({
      lucideArrowRight,
      lucideArrowUpRight,
      lucideBookOpen,
      lucideCalendarDays,
      lucideCamera,
      lucideChevronLeft,
      lucideChevronRight,
      lucideCompass,
      lucideFish,
      lucideFlaskConical,
      lucideGraduationCap,
      lucideLeaf,
      lucideMapPin,
      lucideMegaphone,
      lucideNetwork,
      lucideNewspaper,
      lucideScanSearch,
      lucideShieldCheck,
      lucideSparkles,
      lucideUsers,
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-16">
      <div class="grid gap-6 lg:grid-cols-3">
        <!-- ───────────── Carousel ───────────── -->
        <section
          class="group relative isolate h-[400px] overflow-hidden rounded-3xl bg-slate-950 shadow-2xl ring-1 shadow-slate-900/15 ring-black/5 sm:h-[460px] lg:col-span-2 lg:h-[500px]"
          aria-roledescription="carousel"
          aria-label="Highlights"
          tabindex="0"
          (mouseenter)="paused.set(true)"
          (mouseleave)="paused.set(false)"
          (focusin)="paused.set(true)"
          (focusout)="paused.set(false)"
          (keydown.arrowleft)="prev()"
          (keydown.arrowright)="next()"
          (touchstart)="touchStart($event)"
          (touchend)="touchEnd($event)"
        >
          @for (s of slides; track s.link; let i = $index) {
            <div
              class="absolute inset-0 transition-opacity duration-1000 ease-out motion-reduce:transition-none"
              [class.opacity-0]="i !== index()"
              [class.pointer-events-none]="i !== index()"
              role="group"
              aria-roledescription="slide"
              [attr.aria-label]="i + 1 + ' of ' + slides.length"
              [attr.aria-hidden]="i !== index()"
              [attr.inert]="i !== index() ? '' : null"
            >
              <img
                [src]="s.photo.src"
                [alt]="s.species"
                class="h-full w-full object-cover transition-transform duration-[9000ms] ease-out motion-reduce:transition-none"
                [class.scale-110]="i === index()"
                [attr.loading]="i === 0 ? 'eager' : 'lazy'"
                [attr.fetchpriority]="i === 0 ? 'high' : null"
                decoding="async"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-slate-950/10"></div>
              <div class="absolute inset-0 bg-gradient-to-r from-slate-950/60 via-slate-950/10 to-transparent"></div>

              <div class="absolute inset-x-0 bottom-0 p-6 pb-14 sm:p-9 sm:pb-16">
                <div class="max-w-md space-y-3">
                  <p class="flex items-center gap-2.5 text-[10px] font-semibold tracking-[0.22em] text-amber-200/90 uppercase">
                    <span class="grid size-7 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 backdrop-blur">
                      <ng-icon [name]="s.icon" size="14" />
                    </span>
                    {{ s.eyebrow }}
                  </p>
                  <h2 class="font-display text-2xl leading-tight font-medium text-balance text-white sm:text-[1.7rem]">{{ s.title }}</h2>
                  <p class="text-xs leading-relaxed text-white/75 sm:text-sm">{{ s.text }}</p>
                  <a
                    [routerLink]="s.link"
                    class="group/cta mt-1 inline-flex items-center gap-3 rounded-full bg-white py-1 pr-1 pl-4 text-xs font-semibold text-slate-900 shadow-lg shadow-black/20 transition hover:bg-amber-50"
                  >
                    {{ s.cta }}
                    <span class="grid size-7 place-items-center rounded-full bg-slate-900 text-white transition-transform group-hover/cta:translate-x-0.5">
                      <ng-icon name="lucideArrowRight" size="14" />
                    </span>
                  </a>
                </div>
              </div>

              <a
                [href]="observationUrl(s.photo.observation)"
                target="_blank"
                rel="noopener noreferrer"
                class="absolute top-4 right-4 inline-flex max-w-[70%] items-center gap-1.5 truncate rounded-full bg-black/35 px-3 py-1 text-[11px] text-white/80 ring-1 ring-white/10 backdrop-blur-md transition hover:text-white"
              >
                <ng-icon name="lucideCamera" size="12" />
                <em>{{ s.species }}</em> · {{ credit }}
              </a>
            </div>
          }

          <!-- Counter -->
          <p class="font-display pointer-events-none absolute top-4 left-6 text-sm text-white/85 tabular-nums sm:left-9">
            {{ pad(index() + 1) }} <span class="text-white/40">/ {{ pad(slides.length) }}</span>
          </p>

          <!-- Arrows -->
          <button
            type="button"
            (click)="prev()"
            class="absolute top-1/2 left-4 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white opacity-0 ring-1 ring-white/20 backdrop-blur-md transition group-hover:opacity-100 hover:bg-white/20 focus-visible:opacity-100"
            aria-label="Previous slide"
          >
            <ng-icon name="lucideChevronLeft" size="20" />
          </button>
          <button
            type="button"
            (click)="next()"
            class="absolute top-1/2 right-4 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white opacity-0 ring-1 ring-white/20 backdrop-blur-md transition group-hover:opacity-100 hover:bg-white/20 focus-visible:opacity-100"
            aria-label="Next slide"
          >
            <ng-icon name="lucideChevronRight" size="20" />
          </button>

          <!-- Thumbnails (tablet and up) -->
          <div class="absolute right-6 bottom-6 hidden items-end gap-2 sm:flex" role="tablist" aria-label="Choose slide">
            @for (s of slides; track s.link; let i = $index) {
              <button
                type="button"
                role="tab"
                (click)="go(i)"
                class="relative overflow-hidden rounded-lg ring-2 transition-all duration-300"
                [class]="i === index() ? 'h-12 w-[4.5rem] ring-white shadow-lg shadow-black/40' : 'h-11 w-16 opacity-60 ring-white/0 hover:opacity-100 hover:ring-white/50'"
                [attr.aria-selected]="i === index()"
                [attr.aria-label]="'Show slide ' + (i + 1) + ': ' + s.eyebrow"
                [title]="s.eyebrow"
              >
                <img [src]="s.photo.src" alt="" class="h-full w-full object-cover" loading="lazy" decoding="async" />
              </button>
            }
          </div>

          <!-- Dots (phones) -->
          <div class="absolute bottom-6 left-6 flex items-center gap-1.5 sm:hidden">
            @for (s of slides; track s.link; let i = $index) {
              <button
                type="button"
                (click)="go(i)"
                class="h-1.5 rounded-full transition-all duration-300"
                [class]="i === index() ? 'w-6 bg-white' : 'w-1.5 bg-white/45'"
                [attr.aria-label]="'Show slide ' + (i + 1) + ': ' + s.eyebrow"
                [attr.aria-current]="i === index() ? 'true' : null"
              ></button>
            }
          </div>

          <!-- Progress (drives autoplay; restarts on every slide change) -->
          <div class="absolute inset-x-0 bottom-0 h-[3px] bg-white/10">
            @for (k of [index()]; track k) {
              <div
                class="h-full origin-left bg-gradient-to-r from-amber-200 to-amber-400 motion-reduce:hidden"
                [style.animation]="'progress-grow ' + slideSeconds + 's linear forwards'"
                [style.animation-play-state]="paused() ? 'paused' : 'running'"
                (animationend)="next()"
              ></div>
            }
          </div>
        </section>

        <!-- ───────────── News ───────────── -->
        <aside
          class="bg-card flex flex-col overflow-hidden rounded-3xl border border-black/5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.18)] lg:h-[500px] dark:border-white/10"
          aria-labelledby="home-news"
        >
          <header class="flex items-center justify-between px-6 pt-6 pb-4">
            <div class="flex items-center gap-3">
              <span class="grid size-9 place-items-center rounded-xl bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900">
                <ng-icon name="lucideNewspaper" size="16" />
              </span>
              <div>
                <p class="text-muted-foreground text-[10px] font-semibold tracking-[0.2em] uppercase">Discover</p>
                <h2 id="home-news" class="font-display text-lg leading-tight font-medium">Latest news</h2>
              </div>
            </div>
            <a routerLink="/news" class="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs font-medium">
              View all <ng-icon name="lucideArrowRight" size="13" />
            </a>
          </header>
          <div class="mx-6 h-px bg-gradient-to-r from-transparent via-black/10 to-transparent dark:via-white/10"></div>
          <div class="flex-1 overflow-y-auto px-3 py-2">
            @if (news.hasValue()) {
              <ul class="space-y-0.5">
                @for (n of news.value(); track n.id) {
                  <li>
                    <a [routerLink]="['/news', n.slug]" class="group/news hover:bg-muted/70 flex gap-3.5 rounded-2xl p-3 transition-colors">
                      <span class="grid size-11 shrink-0 place-items-center rounded-xl ring-1 ring-black/5 dark:ring-white/10" [class]="style(n.category).tile">
                        <ng-icon [name]="style(n.category).icon" size="18" />
                      </span>
                      <span class="min-w-0 flex-1">
                        <span class="flex items-center gap-2 text-[10px] font-semibold tracking-wider uppercase">
                          <span [class]="style(n.category).text">{{ label(n.category) }}</span>
                          <span class="text-muted-foreground/60">•</span>
                          <time class="text-muted-foreground font-medium normal-case tracking-normal" [attr.datetime]="n.publishedAt">{{ n.publishedAt | date: 'd MMM y' }}</time>
                        </span>
                        <span class="mt-1 line-clamp-2 text-[13px] leading-snug font-medium">{{ n.title }}</span>
                      </span>
                      <ng-icon
                        name="lucideArrowUpRight"
                        size="15"
                        class="text-muted-foreground mt-0.5 shrink-0 opacity-0 transition group-hover/news:translate-x-0.5 group-hover/news:opacity-100"
                      />
                    </a>
                  </li>
                } @empty {
                  <li class="text-muted-foreground px-3 py-10 text-center text-sm">No news yet.</li>
                }
              </ul>
            } @else if (news.error()) {
              <p class="text-muted-foreground px-3 py-10 text-center text-sm">News is unavailable right now.</p>
            } @else {
              <ul class="space-y-0.5" aria-busy="true" aria-label="Loading news">
                @for (i of [1, 2, 3, 4, 5]; track i) {
                  <li class="flex gap-3.5 p-3">
                    <div class="bg-muted size-11 shrink-0 animate-pulse rounded-xl"></div>
                    <div class="flex-1 space-y-2 pt-1">
                      <div class="bg-muted h-2.5 w-28 animate-pulse rounded"></div>
                      <div class="bg-muted h-3.5 w-full animate-pulse rounded"></div>
                      <div class="bg-muted h-3.5 w-2/3 animate-pulse rounded"></div>
                    </div>
                  </li>
                }
              </ul>
            }
          </div>
        </aside>
      </div>

      <!-- ───────────── Fish of the week / month ───────────── -->
      <section class="space-y-6" aria-labelledby="featured-fish">
        <div class="flex items-end justify-between gap-4">
          <div class="space-y-1">
            <p class="flex items-center gap-2 text-[10px] font-semibold tracking-[0.22em] text-amber-600 uppercase dark:text-amber-300">
              <ng-icon name="lucideSparkles" size="13" /> Featured
            </p>
            <h2 id="featured-fish" class="font-display text-3xl font-medium tracking-tight">Meet the fishes</h2>
          </div>
          <a routerLink="/taxonomy" class="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm font-medium">
            All species <ng-icon name="lucideArrowRight" size="14" />
          </a>
        </div>
        <div class="grid gap-6 md:grid-cols-2">
          @for (f of featured(); track f.kind) {
            <article
              class="bg-card group/fish flex flex-col overflow-hidden rounded-3xl border border-black/5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.18)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_24px_48px_-20px_rgba(15,23,42,0.3)] dark:border-white/10"
            >
              <div class="relative aspect-[16/10] overflow-hidden bg-slate-950">
                <img
                  [src]="f.fish.photo.src"
                  [alt]="f.fish.common ? f.fish.name + ', ' + f.fish.common : f.fish.name"
                  class="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover/fish:scale-105"
                  loading="lazy"
                  decoding="async"
                />
                <div class="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-slate-950/20"></div>
                <span
                  class="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full bg-white/95 py-1 pr-3 pl-1 text-xs font-semibold text-slate-900 shadow-lg shadow-black/10"
                >
                  <span class="grid size-6 place-items-center rounded-full bg-slate-900 text-amber-200">
                    <ng-icon [name]="f.kind === 'week' ? 'lucideCalendarDays' : 'lucideSparkles'" size="12" />
                  </span>
                  {{ f.title }}
                </span>
                <span class="font-display absolute top-4 right-4 rounded-full bg-black/35 px-3 py-1 text-xs text-white ring-1 ring-white/15 backdrop-blur-md">{{ f.when }}</span>
                <a
                  [href]="observationUrl(f.fish.photo.observation)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="absolute right-4 bottom-3 inline-flex items-center gap-1.5 text-[11px] text-white/80 hover:text-white"
                >
                  <ng-icon name="lucideCamera" size="12" /> {{ credit }}
                </a>
              </div>
              <div class="flex flex-1 flex-col gap-4 p-6">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 class="font-display text-2xl leading-tight font-medium italic">{{ f.fish.name }}</h3>
                    @if (f.fish.common) {
                      <p class="text-muted-foreground mt-0.5 text-sm">{{ f.fish.common }}</p>
                    }
                  </div>
                  @if (f.kind === 'week' ? weekIucn.value()?.category : monthIucn.value()?.category; as status) {
                    <app-iucn-badge [status]="status" [showLabel]="true" />
                  }
                </div>
                <p class="text-muted-foreground text-sm leading-relaxed">{{ f.fish.about }}</p>
                <div class="mt-auto flex items-center justify-between border-t border-black/5 pt-4 dark:border-white/10">
                  <a [routerLink]="['/taxonomy/species', f.fish.key]" class="group/link inline-flex items-center gap-3 text-sm font-semibold">
                    Species profile
                    <span
                      class="grid size-8 place-items-center rounded-full border border-black/10 transition group-hover/link:border-slate-900 group-hover/link:bg-slate-900 group-hover/link:text-white dark:border-white/15 dark:group-hover/link:bg-white dark:group-hover/link:text-slate-900"
                    >
                      <ng-icon name="lucideArrowRight" size="14" />
                    </span>
                  </a>
                  <a
                    [href]="observationUrl(f.fish.photo.observation)"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
                  >
                    iNaturalist <ng-icon name="lucideArrowUpRight" size="13" />
                  </a>
                </div>
              </div>
            </article>
          }
        </div>
      </section>

      <!-- ───────────── Explore ───────────── -->
      <section class="space-y-6" aria-labelledby="explore">
        <div class="space-y-1">
          <p class="flex items-center gap-2 text-[10px] font-semibold tracking-[0.22em] text-amber-600 uppercase dark:text-amber-300">
            <ng-icon name="lucideCompass" size="13" /> Explore
          </p>
          <h2 id="explore" class="font-display text-3xl font-medium tracking-tight">Everything for fish research</h2>
        </div>
        <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          @for (e of explore; track e.link) {
            <a
              [routerLink]="e.link"
              class="bg-card group/tile relative flex flex-col gap-4 rounded-2xl border border-black/5 p-5 transition duration-300 hover:-translate-y-0.5 hover:border-black/10 hover:shadow-[0_16px_40px_-20px_rgba(15,23,42,0.35)] dark:border-white/10"
            >
              <span
                class="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 text-amber-200 shadow-md ring-1 shadow-slate-900/20 ring-white/10"
              >
                <ng-icon [name]="e.icon" size="19" />
              </span>
              <span>
                <span class="block text-sm font-semibold">{{ e.label }}</span>
                <span class="text-muted-foreground mt-0.5 block text-xs leading-snug">{{ e.text }}</span>
              </span>
              <ng-icon
                name="lucideArrowUpRight"
                size="16"
                class="text-muted-foreground absolute top-5 right-5 opacity-0 transition group-hover/tile:translate-x-0.5 group-hover/tile:-translate-y-0.5 group-hover/tile:opacity-100"
              />
            </a>
          }
        </div>
      </section>
    </div>
  `,
})
export class Home {
  private readonly content = inject(ContentApi);
  private readonly gbif = inject(GbifTaxonomyService);

  protected readonly slides = HERO_SLIDES;
  protected readonly explore = EXPLORE;
  protected readonly slideSeconds = SLIDE_SECONDS;
  protected readonly observationUrl = observationUrl;
  protected readonly credit = PHOTO_CREDIT;
  protected readonly index = signal(0);
  protected readonly paused = signal(false);

  protected readonly news = rxResource({
    stream: () => this.content.news({ page: 0 }).pipe(map((p) => p.items.slice(0, 6))),
  });

  private readonly today = new Date();
  private readonly picks = featuredFor(this.today);
  protected readonly featured = computed(() => {
    const { week } = isoWeek(this.today);
    return [
      { kind: 'week', title: 'Fish of the week', when: `Week ${week}`, fish: this.picks.week },
      { kind: 'month', title: 'Fish of the month', when: this.today.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }), fish: this.picks.month },
    ] satisfies { kind: string; title: string; when: string; fish: FeaturedFish }[];
  });
  protected readonly weekIucn = rxResource({ stream: () => this.gbif.iucnCategory(this.picks.week.key) });
  protected readonly monthIucn = rxResource({ stream: () => this.gbif.iucnCategory(this.picks.month.key) });

  private touchX: number | null = null;

  protected go(i: number): void {
    const n = this.slides.length;
    this.index.set(((i % n) + n) % n);
  }
  protected next(): void {
    this.go(this.index() + 1);
  }
  protected prev(): void {
    this.go(this.index() - 1);
  }

  protected touchStart(e: TouchEvent): void {
    this.touchX = e.touches[0]?.clientX ?? null;
  }
  protected touchEnd(e: TouchEvent): void {
    const end = e.changedTouches[0]?.clientX;
    if (this.touchX == null || end == null) return;
    const dx = end - this.touchX;
    if (Math.abs(dx) > 40) (dx < 0 ? this.next() : this.prev());
    this.touchX = null;
  }

  protected pad(n: number): string {
    return String(n).padStart(2, '0');
  }
  protected label(c: NewsCategory): string {
    return NEWS_CATEGORIES[c] ?? c;
  }
  protected style(c: NewsCategory) {
    return NEWS_STYLE[c] ?? NEWS_STYLE.news;
  }
}
