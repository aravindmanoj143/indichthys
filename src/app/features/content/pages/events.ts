import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, numberAttribute, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideCalendar, lucideChevronLeft, lucideChevronRight, lucideExternalLink, lucideGlobe, lucideLoaderCircle, lucideMapPin } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { apiErrorMessage } from '../../../core/api-error';
import { Deadline, ModerationNotice, Paragraphs, SELECT_CLASS, SubmitButton, queryNavigator } from '../components/shared';
import { ContentApi, EVENT_KINDS, EventItem, EventKind } from '../content.api';

/** "10 – 11 Feb 2027", "10 Feb 2027". Always day-month-year so the compact range reads correctly. */
export function dateRange(start: string, end: string | null): string {
  const s = new Date(start);
  const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString('en-GB', o);
  if (!end || new Date(end).toDateString() === s.toDateString()) return fmt(s, { day: 'numeric', month: 'short', year: 'numeric' });
  const e = new Date(end);
  return s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()
    ? `${s.getDate()} – ${fmt(e, { day: 'numeric', month: 'short', year: 'numeric' })}`
    : `${fmt(s, { day: 'numeric', month: 'short' })} – ${fmt(e, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

const place = (e: EventItem) => (e.isOnline ? 'Online' : [e.venue, e.city].filter((x) => !!x).join(', '));

@Component({
  selector: 'app-events',
  imports: [RouterLink, NgIcon, HlmBadgeImports, HlmButtonImports, HlmCardImports, HlmTabsImports, SubmitButton, Deadline],
  providers: [provideIcons({ lucideCalendar, lucideMapPin, lucideGlobe, lucideChevronLeft, lucideChevronRight })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      <header class="flex flex-wrap items-end justify-between gap-4">
        <div class="space-y-1">
          <p class="text-muted-foreground text-sm">{{ crumb() ?? 'Discover' }}</p>
          <h1 class="text-3xl font-semibold tracking-tight">{{ heading() ?? 'Events' }}</h1>
          <p class="text-muted-foreground max-w-2xl">{{ intro() ?? 'Conferences, seminars, workshops and field courses in ichthyology.' }}</p>
        </div>
        <app-submit-button link="/events/submit" label="Add an event" />
      </header>

      <div class="flex flex-wrap items-center gap-3">
        <hlm-tabs [tab]="when() ?? 'upcoming'" (tabActivated)="go({ when: $event === 'upcoming' ? '' : $event })">
          <hlm-tabs-list aria-label="When">
            <button hlmTabsTrigger="upcoming">Upcoming</button>
            <button hlmTabsTrigger="past">Past</button>
          </hlm-tabs-list>
        </hlm-tabs>
        <div class="flex flex-wrap gap-2">
          <button hlmBtn size="sm" [variant]="!kind() ? 'default' : 'outline'" (click)="go({ kind: '' })">All</button>
          @for (k of visibleKinds(); track k[0]) {
            <button hlmBtn size="sm" [variant]="kind() === k[0] ? 'default' : 'outline'" (click)="go({ kind: k[0] })">{{ k[1] }}</button>
          }
        </div>
      </div>

      @if (list.error()) {
        <p class="text-destructive">{{ error(list.error()) }}</p>
      } @else if (list.hasValue()) {
        <div class="space-y-6" [class.opacity-60]="list.isLoading()">
          @for (m of months(); track m.label) {
            <section>
              <h2 class="text-muted-foreground mb-2 text-sm font-medium">{{ m.label }}</h2>
              <div class="space-y-3">
                @for (e of m.items; track e.id) {
                  <article hlmCard size="sm">
                    <div hlmCardHeader>
                      <div class="flex gap-4">
                        <div class="bg-muted flex w-14 shrink-0 flex-col items-center justify-center rounded-md py-1 text-center">
                          <span class="text-xs uppercase">{{ month(e.startsOn) }}</span>
                          <span class="text-xl font-semibold">{{ day(e.startsOn) }}</span>
                        </div>
                        <div class="min-w-0 space-y-1">
                          <h3 hlmCardTitle><a [routerLink]="[e.slug]" class="hover:underline">{{ e.title }}</a></h3>
                          <p hlmCardDescription class="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span hlmBadge variant="secondary">{{ kindLabel(e.kind) }}</span>
                            <span class="inline-flex items-center gap-1"><ng-icon name="lucideCalendar" size="14" /> {{ range(e) }}</span>
                            <span class="inline-flex items-center gap-1"><ng-icon [name]="e.isOnline ? 'lucideGlobe' : 'lucideMapPin'" size="14" /> {{ where(e) }}</span>
                            @if (e.organiser) { <span>{{ e.organiser }}</span> }
                          </p>
                          @if (e.registrationDeadline) { <p class="text-xs">Registration: <app-deadline [deadline]="e.registrationDeadline" /></p> }
                        </div>
                      </div>
                    </div>
                  </article>
                }
              </div>
            </section>
          } @empty {
            <p class="text-muted-foreground">Nothing {{ when() === 'past' ? 'in the past' : 'upcoming' }} here yet. Know of one? Add it.</p>
          }
        </div>
        @if (pages() > 1) {
          <div class="flex items-center justify-end gap-2">
            <button hlmBtn variant="outline" size="sm" [disabled]="page() === 0" (click)="go({ page: page() - 1 }, false)" aria-label="Previous page"><ng-icon name="lucideChevronLeft" /></button>
            <button hlmBtn variant="outline" size="sm" [disabled]="page() + 1 >= pages()" (click)="go({ page: page() + 1 }, false)" aria-label="Next page"><ng-icon name="lucideChevronRight" /></button>
          </div>
        }
      } @else {
        <p class="text-muted-foreground">Loading…</p>
      }
    </section>
  `,
})
export class Events {
  private readonly api = inject(ContentApi);
  protected readonly error = apiErrorMessage;
  protected readonly go = queryNavigator(inject(Router));
  protected readonly kindsAll = Object.entries(EVENT_KINDS);
  protected readonly range = (e: EventItem) => dateRange(e.startsOn, e.endsOn);
  protected readonly where = place;

  // Route data (Learning → Workshops shows only training-type events). Component input binding
  // sets inputs missing from the route to undefined, so defaults live in the template.
  readonly crumb = input<string>();
  readonly heading = input<string>();
  readonly intro = input<string>();
  /** Comma-separated event kinds to restrict the list to. */
  readonly kinds = input<string>();
  protected readonly visibleKinds = computed(() => {
    const only = this.kinds()?.split(',');
    return only ? this.kindsAll.filter(([k]) => only.includes(k)) : this.kindsAll;
  });

  readonly when = input<'upcoming' | 'past'>();
  readonly kind = input<string>();
  readonly page = input(0, { transform: (v: unknown) => (v ? numberAttribute(v) : 0) });

  protected readonly list = rxResource({
    params: () => ({ when: this.when() ?? 'upcoming', kind: this.kind(), kinds: this.kinds(), page: this.page() }),
    stream: ({ params }) => this.api.events(params as { when: 'upcoming' | 'past'; kind?: string; kinds?: string; page: number }),
  });
  protected readonly pages = computed(() => Math.ceil((this.list.value()?.total ?? 0) / (this.list.value()?.pageSize ?? 1)));

  /** Group by month for a calendar-like list. */
  protected readonly months = computed(() => {
    const groups = new Map<string, EventItem[]>();
    for (const e of this.list.value()?.items ?? []) {
      const label = new Date(e.startsOn).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      groups.set(label, [...(groups.get(label) ?? []), e]);
    }
    return [...groups].map(([label, items]) => ({ label, items }));
  });

  protected month(d: string): string {
    return new Date(d).toLocaleDateString(undefined, { month: 'short' });
  }
  protected day(d: string): number {
    return new Date(d).getDate();
  }
  protected kindLabel(k: EventKind): string {
    return EVENT_KINDS[k] ?? k;
  }
}

@Component({
  selector: 'app-event-detail',
  imports: [DatePipe, RouterLink, NgIcon, HlmBadgeImports, HlmButtonImports, HlmCardImports, Paragraphs, ModerationNotice, Deadline],
  providers: [provideIcons({ lucideArrowLeft, lucideCalendar, lucideMapPin, lucideGlobe, lucideExternalLink })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a hlmBtn variant="ghost" size="sm" routerLink="/events" class="mb-4 -ml-2"><ng-icon name="lucideArrowLeft" /> Events</a>
    @if (event.error()) {
      <p class="text-destructive">{{ error(event.error()) }}</p>
    } @else if (event.hasValue()) {
      @let e = event.value();
      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <article class="space-y-4">
          <app-moderation-notice [status]="e.status" />
          <p><span hlmBadge variant="secondary">{{ kinds[e.kind] }}</span></p>
          <h1 class="text-3xl font-semibold tracking-tight">{{ e.title }}</h1>
          <app-paragraphs [text]="e.description" />
        </article>
        <aside hlmCard size="sm" class="lg:self-start">
          <div hlmCardContent class="space-y-3 text-sm">
            <p class="flex gap-2"><ng-icon name="lucideCalendar" class="mt-0.5 shrink-0" /> {{ range(e) }}</p>
            <p class="flex gap-2"><ng-icon [name]="e.isOnline ? 'lucideGlobe' : 'lucideMapPin'" class="mt-0.5 shrink-0" /> {{ where(e) }}{{ e.isOnline ? '' : ' (' + e.country + ')' }}</p>
            @if (e.organiser) { <p><span class="text-muted-foreground">Organiser:</span> {{ e.organiser }}</p> }
            @if (e.registrationDeadline) {
              <p><span class="text-muted-foreground">Registration closes</span> {{ e.registrationDeadline | date: 'mediumDate' }} <app-deadline [deadline]="e.registrationDeadline" /></p>
            }
          </div>
          @if (e.url) {
            <div hlmCardFooter><a hlmBtn class="w-full" [href]="e.url" target="_blank" rel="noopener">Event website <ng-icon name="lucideExternalLink" /></a></div>
          }
        </aside>
      </div>
    } @else {
      <p class="text-muted-foreground">Loading…</p>
    }
  `,
})
export class EventDetail {
  private readonly api = inject(ContentApi);
  protected readonly error = apiErrorMessage;
  protected readonly kinds = EVENT_KINDS;
  protected readonly range = (e: EventItem) => dateRange(e.startsOn, e.endsOn);
  protected readonly where = place;
  readonly slug = input.required<string>();
  protected readonly event = rxResource({ params: () => this.slug(), stream: ({ params }) => this.api.event(params) });
}

@Component({
  selector: 'app-event-submit',
  imports: [ReactiveFormsModule, RouterLink, NgIcon, HlmButtonImports, HlmCardImports, HlmInputImports, HlmLabelImports],
  providers: [provideIcons({ lucideArrowLeft, lucideLoaderCircle })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a hlmBtn variant="ghost" size="sm" routerLink="/events" class="mb-4 -ml-2"><ng-icon name="lucideArrowLeft" /> Events</a>
    <form hlmCard class="mx-auto max-w-3xl" [formGroup]="form" (ngSubmit)="submit()">
      <div hlmCardHeader>
        <h1 hlmCardTitle class="text-xl">Add an event</h1>
        <p hlmCardDescription>An administrator reviews new events before they appear publicly.</p>
      </div>
      <div hlmCardContent class="grid gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-1.5 sm:col-span-2"><label hlmLabel for="title">Title *</label><input hlmInput id="title" formControlName="title" /></div>
        <div class="flex flex-col gap-1.5">
          <label hlmLabel for="kind">Type</label>
          <select id="kind" formControlName="kind" [class]="selectClass">@for (k of kinds; track k[0]) { <option [value]="k[0]">{{ k[1] }}</option> }</select>
        </div>
        <div class="flex flex-col gap-1.5"><label hlmLabel for="organiser">Organiser</label><input hlmInput id="organiser" formControlName="organiser" /></div>
        <div class="flex flex-col gap-1.5"><label hlmLabel for="startsOn">Starts *</label><input hlmInput id="startsOn" type="date" formControlName="startsOn" /></div>
        <div class="flex flex-col gap-1.5"><label hlmLabel for="endsOn">Ends</label><input hlmInput id="endsOn" type="date" formControlName="endsOn" /></div>
        <label class="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" class="accent-primary size-4" formControlName="isOnline" /> Online event</label>
        @if (!form.controls.isOnline.value) {
          <div class="flex flex-col gap-1.5"><label hlmLabel for="venue">Venue</label><input hlmInput id="venue" formControlName="venue" /></div>
          <div class="flex flex-col gap-1.5"><label hlmLabel for="city">City</label><input hlmInput id="city" formControlName="city" /></div>
        }
        <div class="flex flex-col gap-1.5"><label hlmLabel for="url">Website</label><input hlmInput id="url" formControlName="url" placeholder="https://" /></div>
        <div class="flex flex-col gap-1.5"><label hlmLabel for="reg">Registration deadline</label><input hlmInput id="reg" type="date" formControlName="registrationDeadline" /></div>
        <div class="flex flex-col gap-1.5 sm:col-span-2">
          <label hlmLabel for="description">Description *</label>
          <textarea hlmInput id="description" formControlName="description" rows="8" class="h-auto py-2"></textarea>
        </div>
        @if (error()) { <p class="text-destructive text-sm sm:col-span-2" role="alert">{{ error() }}</p> }
      </div>
      <div hlmCardFooter class="justify-end">
        <button hlmBtn type="submit" [disabled]="busy()">@if (busy()) { <ng-icon name="lucideLoaderCircle" class="animate-spin" /> } Submit event</button>
      </div>
    </form>
  `,
})
export class EventSubmit {
  private readonly api = inject(ContentApi);
  private readonly router = inject(Router);
  protected readonly selectClass = SELECT_CLASS;
  protected readonly kinds = Object.entries(EVENT_KINDS);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(5)]],
    kind: ['conference' as EventKind],
    organiser: [''],
    startsOn: ['', Validators.required],
    endsOn: [''],
    isOnline: [false],
    venue: [''],
    city: [''],
    url: [''],
    registrationDeadline: [''],
    description: ['', [Validators.required, Validators.minLength(20)]],
  });
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected submit(): void {
    if (this.form.invalid) {
      this.error.set('Title (5+ characters), start date and a description (20+ characters) are required.');
      return;
    }
    const v = this.form.getRawValue();
    const blank = (s: string) => s.trim() || null;
    this.busy.set(true);
    this.error.set(null);
    this.api
      .submitEvent({
        ...v,
        organiser: blank(v.organiser),
        endsOn: blank(v.endsOn),
        venue: v.isOnline ? null : blank(v.venue),
        city: v.isOnline ? null : blank(v.city),
        url: blank(v.url),
        registrationDeadline: blank(v.registrationDeadline),
        country: 'IN',
      })
      .subscribe({
        next: (r) => this.router.navigate(['/events', r.slug]),
        error: (e) => {
          this.busy.set(false);
          this.error.set(apiErrorMessage(e));
        },
      });
  }
}
