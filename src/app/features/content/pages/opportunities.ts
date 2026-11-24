import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, numberAttribute, signal } from '@angular/core';
import { rxResource, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideBuilding2, lucideChevronLeft, lucideChevronRight, lucideExternalLink, lucideLoaderCircle, lucideMapPin, lucideSearch, lucideWallet } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { debounceTime, skip } from 'rxjs';
import { apiErrorMessage } from '../../../core/api-error';
import { Deadline, InstitutionPicker, ModerationNotice, Paragraphs, SELECT_CLASS, SubmitButton, queryNavigator } from '../components/shared';
import { ContentApi, FUNDING_TYPES, JOB_TYPES, Opportunity, Section, opportunityTypeLabel } from '../content.api';

/**
 * Listing page for Grants (section=funding), Jobs (section=jobs) and Fellowships (type=fellowship, both sections).
 * `section`, `fixedType`, `heading` and `intro` come from route data.
 */
@Component({
  selector: 'app-opportunities',
  imports: [RouterLink, NgIcon, HlmBadgeImports, HlmButtonImports, HlmCardImports, HlmInputImports, SubmitButton, Deadline],
  providers: [provideIcons({ lucideSearch, lucideBuilding2, lucideMapPin, lucideWallet, lucideChevronLeft, lucideChevronRight })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      <header class="flex flex-wrap items-end justify-between gap-4">
        <div class="space-y-1">
          <p class="text-muted-foreground text-sm">Opportunities</p>
          <h1 class="text-3xl font-semibold tracking-tight">{{ heading() ?? 'Opportunities' }}</h1>
          <p class="text-muted-foreground max-w-2xl">{{ intro() ?? '' }}</p>
        </div>
        <app-submit-button link="/opportunities/submit" [params]="submitParams()" label="Post an opportunity" />
      </header>

      <div class="flex flex-wrap items-center gap-3">
        <div class="relative min-w-64 flex-1">
          <ng-icon name="lucideSearch" class="text-muted-foreground absolute top-2.5 left-2.5" />
          <input hlmInput type="search" class="pl-8" placeholder="Search title, organisation, place…" aria-label="Search"
            [value]="q() ?? ''" (input)="query.set($any($event.target).value)" />
        </div>
        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" class="accent-primary size-4" [checked]="closed() === 'true'" (change)="go({ closed: $any($event.target).checked ? 'true' : '' })" />
          Include closed
        </label>
      </div>
      @if (!fixedType()) {
        <nav class="flex flex-wrap gap-2" aria-label="Types">
          <button hlmBtn size="sm" [variant]="!type() ? 'default' : 'outline'" (click)="go({ type: '' })">All</button>
          @for (t of types(); track t[0]) {
            <button hlmBtn size="sm" [variant]="type() === t[0] ? 'default' : 'outline'" (click)="go({ type: t[0] })">{{ t[1] }}</button>
          }
        </nav>
      }

      @if (list.error()) {
        <p class="text-destructive">{{ error(list.error()) }}</p>
      } @else if (list.hasValue()) {
        <div class="grid gap-4 md:grid-cols-2" [class.opacity-60]="list.isLoading()">
          @for (o of list.value().items; track o.id) {
            <article hlmCard size="sm">
              <div hlmCardHeader>
                <p class="flex flex-wrap items-center gap-2"><span hlmBadge variant="secondary">{{ typeLabel(o) }}</span><app-deadline [deadline]="o.deadline" /></p>
                <h2 hlmCardTitle><a [routerLink]="['/opportunities', o.slug]" class="hover:underline">{{ o.title }}</a></h2>
                <p hlmCardDescription class="flex flex-wrap gap-x-3 gap-y-1">
                  <span class="inline-flex items-center gap-1"><ng-icon name="lucideBuilding2" size="14" /> {{ o.organisation }}</span>
                  @if (o.location || o.isRemote) { <span class="inline-flex items-center gap-1"><ng-icon name="lucideMapPin" size="14" /> {{ o.isRemote ? 'Remote' : o.location }}</span> }
                  @if (o.amount) { <span class="inline-flex items-center gap-1"><ng-icon name="lucideWallet" size="14" /> {{ o.amount }}</span> }
                </p>
              </div>
            </article>
          } @empty {
            <p class="text-muted-foreground md:col-span-2">Nothing listed right now.</p>
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
export class Opportunities {
  private readonly api = inject(ContentApi);
  protected readonly error = apiErrorMessage;
  protected readonly go = queryNavigator(inject(Router));

  // Route data
  readonly section = input<Section>();
  readonly fixedType = input<string>();
  readonly heading = input<string>();
  readonly intro = input<string>();
  // Query params
  readonly q = input<string>();
  readonly type = input<string>();
  readonly closed = input<string>();
  readonly page = input(0, { transform: (v: unknown) => (v ? numberAttribute(v) : 0) });

  protected readonly query = signal('');
  constructor() {
    // skip(1): the initial empty value must not clear a ?q= that came in the URL.
    toObservable(this.query)
      .pipe(skip(1), debounceTime(300))
      .subscribe((q) => this.go({ q }));
  }

  protected readonly types = computed(() => Object.entries(this.section() === 'jobs' ? JOB_TYPES : FUNDING_TYPES));
  protected readonly submitParams = computed(() => ({ section: this.section() ?? 'jobs', ...(this.fixedType() ? { type: this.fixedType()! } : {}) }));

  protected readonly list = rxResource({
    params: () => ({
      section: this.section(),
      type: this.fixedType() ?? this.type(),
      q: this.q(),
      includeClosed: this.closed() === 'true',
      page: this.page(),
    }),
    stream: ({ params }) => this.api.opportunities(params),
  });
  protected readonly pages = computed(() => Math.ceil((this.list.value()?.total ?? 0) / (this.list.value()?.pageSize ?? 1)));
  protected typeLabel(o: Opportunity): string {
    return opportunityTypeLabel(o.section, o.type);
  }
}

@Component({
  selector: 'app-opportunity-detail',
  imports: [DatePipe, RouterLink, NgIcon, HlmBadgeImports, HlmButtonImports, HlmCardImports, Paragraphs, ModerationNotice, Deadline],
  providers: [provideIcons({ lucideArrowLeft, lucideExternalLink, lucideBuilding2 })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (item.error()) {
      <p class="text-destructive">{{ error(item.error()) }}</p>
    } @else if (item.hasValue()) {
      @let o = item.value();
      <a hlmBtn variant="ghost" size="sm" [routerLink]="o.section === 'funding' ? '/grants' : '/jobs'" class="mb-4 -ml-2">
        <ng-icon name="lucideArrowLeft" /> {{ o.section === 'funding' ? 'Grants & funding' : 'Jobs' }}
      </a>
      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <article class="space-y-4">
          <app-moderation-notice [status]="o.status" />
          <p class="flex flex-wrap items-center gap-2"><span hlmBadge variant="secondary">{{ typeLabel() }}</span><app-deadline [deadline]="o.deadline" /></p>
          <h1 class="text-3xl font-semibold tracking-tight">{{ o.title }}</h1>
          <app-paragraphs [text]="o.description" />
          @if (o.eligibility) {
            <section>
              <h2 class="mb-2 text-lg font-semibold">Eligibility</h2>
              <app-paragraphs [text]="o.eligibility" />
            </section>
          }
        </article>
        <aside hlmCard size="sm" class="lg:self-start">
          <div hlmCardContent>
            <dl class="grid grid-cols-[7rem_1fr] gap-y-2 text-sm">
              <dt class="text-muted-foreground">Organisation</dt>
              <dd>
                @if (o.institution) { <a [routerLink]="['/organisations', o.institution.id]" class="text-primary hover:underline">{{ o.organisation }}</a> }
                @else { {{ o.organisation }} }
              </dd>
              @if (o.amount) { <dt class="text-muted-foreground">{{ o.section === 'jobs' ? 'Salary' : 'Amount' }}</dt><dd>{{ o.amount }}</dd> }
              @if (o.location || o.isRemote) { <dt class="text-muted-foreground">Location</dt><dd>{{ o.isRemote ? 'Remote' : o.location }}</dd> }
              @if (o.deadline) { <dt class="text-muted-foreground">Deadline</dt><dd>{{ o.deadline | date: 'mediumDate' }}</dd> }
              @if (o.startDate) { <dt class="text-muted-foreground">Starts</dt><dd>{{ o.startDate | date: 'mediumDate' }}</dd> }
            </dl>
          </div>
          @if (o.applyUrl) {
            <div hlmCardFooter><a hlmBtn class="w-full" [href]="o.applyUrl" target="_blank" rel="noopener">{{ o.type === 'proposal-resource' || o.type === 'funded-project' ? 'Open link' : 'Apply' }} <ng-icon name="lucideExternalLink" /></a></div>
          }
        </aside>
      </div>
    } @else {
      <p class="text-muted-foreground">Loading…</p>
    }
  `,
})
export class OpportunityDetail {
  private readonly api = inject(ContentApi);
  protected readonly error = apiErrorMessage;
  readonly slug = input.required<string>();
  protected readonly item = rxResource({ params: () => this.slug(), stream: ({ params }) => this.api.opportunity(params) });
  protected readonly typeLabel = computed(() => (this.item.value() ? opportunityTypeLabel(this.item.value()!.section, this.item.value()!.type) : ''));
}

@Component({
  selector: 'app-opportunity-submit',
  imports: [ReactiveFormsModule, RouterLink, NgIcon, HlmButtonImports, HlmCardImports, HlmInputImports, HlmLabelImports, InstitutionPicker],
  providers: [provideIcons({ lucideArrowLeft, lucideLoaderCircle })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form hlmCard class="mx-auto max-w-3xl" [formGroup]="form" (ngSubmit)="submit()">
      <div hlmCardHeader>
        <h1 hlmCardTitle class="text-xl">Post an opportunity</h1>
        <p hlmCardDescription>Grants, funding, jobs, studentships and fellowships. An administrator reviews posts before they appear.</p>
      </div>
      <div hlmCardContent class="grid gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-1.5">
          <label hlmLabel for="section">Category</label>
          <select id="section" formControlName="section" [class]="selectClass" (change)="form.controls.type.setValue(firstType())">
            <option value="funding">Grants & funding</option>
            <option value="jobs">Jobs & positions</option>
          </select>
        </div>
        <div class="flex flex-col gap-1.5">
          <label hlmLabel for="type">Type</label>
          <select id="type" formControlName="type" [class]="selectClass">@for (t of types(); track t[0]) { <option [value]="t[0]">{{ t[1] }}</option> }</select>
        </div>
        <div class="flex flex-col gap-1.5 sm:col-span-2"><label hlmLabel for="title">Title *</label><input hlmInput id="title" formControlName="title" /></div>
        <div class="flex flex-col gap-1.5"><label hlmLabel for="organisation">Organisation *</label><input hlmInput id="organisation" formControlName="organisation" /></div>
        <div class="flex flex-col gap-1.5"><label hlmLabel>Directory link</label><app-institution-picker [(value)]="institution" /></div>
        <div class="flex flex-col gap-1.5"><label hlmLabel for="amount">{{ form.controls.section.value === 'jobs' ? 'Salary / stipend' : 'Amount' }}</label><input hlmInput id="amount" formControlName="amount" placeholder="e.g. Up to ₹5 lakh" /></div>
        <div class="flex flex-col gap-1.5"><label hlmLabel for="location">Location</label><input hlmInput id="location" formControlName="location" /></div>
        <div class="flex flex-col gap-1.5"><label hlmLabel for="deadline">Deadline</label><input hlmInput id="deadline" type="date" formControlName="deadline" /></div>
        <div class="flex flex-col gap-1.5"><label hlmLabel for="startDate">Start date</label><input hlmInput id="startDate" type="date" formControlName="startDate" /></div>
        <div class="flex flex-col gap-1.5 sm:col-span-2"><label hlmLabel for="applyUrl">Link to apply / details</label><input hlmInput id="applyUrl" formControlName="applyUrl" placeholder="https://" /></div>
        <label class="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" class="accent-primary size-4" formControlName="isRemote" /> Remote / not location-bound</label>
        <div class="flex flex-col gap-1.5 sm:col-span-2"><label hlmLabel for="description">Description *</label><textarea hlmInput id="description" formControlName="description" rows="8" class="h-auto py-2"></textarea></div>
        <div class="flex flex-col gap-1.5 sm:col-span-2"><label hlmLabel for="eligibility">Eligibility</label><textarea hlmInput id="eligibility" formControlName="eligibility" rows="4" class="h-auto py-2"></textarea></div>
        @if (error()) { <p class="text-destructive text-sm sm:col-span-2" role="alert">{{ error() }}</p> }
      </div>
      <div hlmCardFooter class="justify-end gap-2">
        <a hlmBtn variant="ghost" [routerLink]="form.controls.section.value === 'funding' ? '/grants' : '/jobs'">Cancel</a>
        <button hlmBtn type="submit" [disabled]="busy()">@if (busy()) { <ng-icon name="lucideLoaderCircle" class="animate-spin" /> } Submit</button>
      </div>
    </form>
  `,
})
export class OpportunitySubmit implements OnInit {
  private readonly api = inject(ContentApi);
  private readonly router = inject(Router);
  protected readonly selectClass = SELECT_CLASS;

  readonly section = input<Section>();
  readonly type = input<string>();

  protected readonly form = inject(FormBuilder).nonNullable.group({
    section: ['jobs' as Section],
    type: ['job'],
    title: ['', [Validators.required, Validators.minLength(5)]],
    organisation: ['', [Validators.required, Validators.minLength(2)]],
    amount: [''],
    location: [''],
    deadline: [''],
    startDate: [''],
    applyUrl: [''],
    isRemote: [false],
    description: ['', [Validators.required, Validators.minLength(20)]],
    eligibility: [''],
  });
  private readonly sectionValue = toSignal(this.form.controls.section.valueChanges, { initialValue: this.form.controls.section.value });
  protected readonly types = computed(() => Object.entries(this.sectionValue() === 'funding' ? FUNDING_TYPES : JOB_TYPES));
  protected readonly institution = signal<{ id: number; name: string } | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const section = this.section() ?? 'jobs';
    this.form.patchValue({ section });
    this.form.controls.type.setValue(this.type() ?? this.firstType());
  }

  protected firstType(): string {
    return Object.keys(this.form.controls.section.value === 'funding' ? FUNDING_TYPES : JOB_TYPES)[0]!;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.error.set('Title (5+), organisation and a description (20+ characters) are required.');
      return;
    }
    const v = this.form.getRawValue();
    const blank = (s: string) => s.trim() || null;
    this.busy.set(true);
    this.error.set(null);
    this.api
      .submitOpportunity({
        ...v,
        institutionId: this.institution()?.id ?? null,
        amount: blank(v.amount),
        location: blank(v.location),
        deadline: blank(v.deadline),
        startDate: blank(v.startDate),
        applyUrl: blank(v.applyUrl),
        eligibility: blank(v.eligibility),
        country: 'IN',
      })
      .subscribe({
        next: (r) => this.router.navigate(['/opportunities', r.slug]),
        error: (e) => {
          this.busy.set(false);
          this.error.set(apiErrorMessage(e));
        },
      });
  }
}
