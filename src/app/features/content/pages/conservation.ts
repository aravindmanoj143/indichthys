import { ChangeDetectionStrategy, Component, computed, inject, input, numberAttribute, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucideBuilding2,
  lucideChevronLeft,
  lucideChevronRight,
  lucideExternalLink,
  lucideFish,
  lucideLoaderCircle,
  lucideMapPin,
  lucideTriangleAlert,
} from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { apiErrorMessage } from '../../../core/api-error';
import { IucnBadge } from '../../taxonomy/components/status-badges';
import { GbifTaxonomyService, gbifErrorMessage } from '../../taxonomy/gbif/gbif-taxonomy.service';
import { FOCUS_COUNTRY, GBIF_WEB } from '../../taxonomy/gbif/gbif.config';
import { GbifThreatStatus } from '../../taxonomy/gbif/gbif.models';
import { InstitutionPicker, ModerationNotice, Paragraphs, SELECT_CLASS, SubmitButton, queryNavigator } from '../components/shared';
import { ContentApi, PROJECT_KINDS, ProjectKind } from '../content.api';

const PROJECT_STATUS = { planned: 'Planned', ongoing: 'Ongoing', completed: 'Completed' } as const;

@Component({
  selector: 'app-conservation',
  imports: [RouterLink, NgIcon, HlmBadgeImports, HlmButtonImports, HlmCardImports, HlmInputImports, SubmitButton],
  providers: [provideIcons({ lucideMapPin, lucideBuilding2, lucideFish, lucideTriangleAlert, lucideChevronLeft, lucideChevronRight })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      <header class="flex flex-wrap items-end justify-between gap-4">
        <div class="space-y-1">
          <p class="text-muted-foreground text-sm">Conservation</p>
          <h1 class="text-3xl font-semibold tracking-tight">Conservation projects &amp; initiatives</h1>
          <p class="text-muted-foreground max-w-2xl">Projects, initiatives and citizen programmes protecting freshwater fishes and their habitats.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <a hlmBtn variant="outline" routerLink="/threatened"><ng-icon name="lucideTriangleAlert" /> Threatened species</a>
          <app-submit-button link="/conservation/submit" label="Add a project" />
        </div>
      </header>

      <div class="flex flex-wrap items-center gap-2">
        <button hlmBtn size="sm" [variant]="!kind() ? 'default' : 'outline'" (click)="go({ kind: '' })">All</button>
        @for (k of kinds; track k[0]) {
          <button hlmBtn size="sm" [variant]="kind() === k[0] ? 'default' : 'outline'" (click)="go({ kind: k[0] })">{{ k[1] }}s</button>
        }
        <input hlmInput type="search" class="ml-auto max-w-xs" placeholder="Search species, region…" aria-label="Search projects"
          [value]="q() ?? ''" (change)="go({ q: $any($event.target).value })" />
      </div>

      @if (list.error()) {
        <p class="text-destructive">{{ error(list.error()) }}</p>
      } @else if (list.hasValue()) {
        <div class="grid gap-4 md:grid-cols-2" [class.opacity-60]="list.isLoading()">
          @for (p of list.value().items; track p.id) {
            <article hlmCard size="sm">
              <div hlmCardHeader>
                <p class="flex flex-wrap gap-2"><span hlmBadge variant="secondary">{{ kindLabel(p.kind) }}</span><span hlmBadge variant="outline">{{ statusLabel(p.projectStatus) }}</span></p>
                <h2 hlmCardTitle><a [routerLink]="[p.slug]" class="hover:underline">{{ p.title }}</a></h2>
                <p hlmCardDescription>{{ p.summary }}</p>
              </div>
              <div hlmCardContent class="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-xs">
                @if (p.institution || p.organisation) { <span class="inline-flex items-center gap-1"><ng-icon name="lucideBuilding2" size="13" /> {{ p.institution?.name ?? p.organisation }}</span> }
                @if (p.region) { <span class="inline-flex items-center gap-1"><ng-icon name="lucideMapPin" size="13" /> {{ p.region }}</span> }
                @if (p.focusSpecies) { <span class="inline-flex items-center gap-1"><ng-icon name="lucideFish" size="13" /> {{ p.focusSpecies }}</span> }
              </div>
            </article>
          } @empty {
            <p class="text-muted-foreground md:col-span-2">No projects listed yet. Add yours.</p>
          }
        </div>
        @if (pages() > 1) {
          <div class="flex justify-end gap-2">
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
export class Conservation {
  private readonly api = inject(ContentApi);
  protected readonly error = apiErrorMessage;
  protected readonly go = queryNavigator(inject(Router));
  protected readonly kinds = Object.entries(PROJECT_KINDS);
  readonly kind = input<string>();
  readonly q = input<string>();
  readonly page = input(0, { transform: (v: unknown) => (v ? numberAttribute(v) : 0) });
  protected readonly list = rxResource({
    params: () => ({ kind: this.kind(), q: this.q(), page: this.page() }),
    stream: ({ params }) => this.api.projects(params),
  });
  protected readonly pages = computed(() => Math.ceil((this.list.value()?.total ?? 0) / (this.list.value()?.pageSize ?? 1)));
  protected kindLabel(k: ProjectKind): string {
    return PROJECT_KINDS[k];
  }
  protected statusLabel(s: keyof typeof PROJECT_STATUS): string {
    return PROJECT_STATUS[s];
  }
}

@Component({
  selector: 'app-project-detail',
  imports: [RouterLink, NgIcon, HlmBadgeImports, HlmButtonImports, HlmCardImports, Paragraphs, ModerationNotice],
  providers: [provideIcons({ lucideArrowLeft, lucideExternalLink })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a hlmBtn variant="ghost" size="sm" routerLink="/conservation" class="mb-4 -ml-2"><ng-icon name="lucideArrowLeft" /> Conservation</a>
    @if (project.error()) {
      <p class="text-destructive">{{ error(project.error()) }}</p>
    } @else if (project.hasValue()) {
      @let p = project.value();
      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <article class="space-y-4">
          <app-moderation-notice [status]="p.status" />
          <p class="flex gap-2"><span hlmBadge variant="secondary">{{ kinds[p.kind] }}</span><span hlmBadge variant="outline">{{ statuses[p.projectStatus] }}</span></p>
          <h1 class="text-3xl font-semibold tracking-tight">{{ p.title }}</h1>
          <p class="text-muted-foreground text-lg">{{ p.summary }}</p>
          <app-paragraphs [text]="p.description" />
          @if (p.howToJoin) {
            <section hlmCard size="sm">
              <div hlmCardHeader><h2 hlmCardTitle>How to take part</h2></div>
              <div hlmCardContent><app-paragraphs [text]="p.howToJoin" /></div>
            </section>
          }
        </article>
        <aside hlmCard size="sm" class="lg:self-start">
          <div hlmCardContent>
            <dl class="grid grid-cols-[6.5rem_1fr] gap-y-2 text-sm">
              @if (p.institution || p.organisation) {
                <dt class="text-muted-foreground">Organisation</dt>
                <dd>
                  @if (p.institution) { <a [routerLink]="['/organisations', p.institution.id]" class="text-primary hover:underline">{{ p.institution.name }}</a> }
                  @else { {{ p.organisation }} }
                </dd>
              }
              @if (p.region) { <dt class="text-muted-foreground">Region</dt><dd>{{ p.region }}</dd> }
              @if (p.focusSpecies) { <dt class="text-muted-foreground">Species</dt><dd>{{ p.focusSpecies }}</dd> }
              @if (p.startYear) { <dt class="text-muted-foreground">Years</dt><dd>{{ p.startYear }}–{{ p.endYear ?? (p.projectStatus === 'completed' ? '' : 'present') }}</dd> }
            </dl>
          </div>
          @if (p.url) { <div hlmCardFooter><a hlmBtn class="w-full" [href]="p.url" target="_blank" rel="noopener">Project website <ng-icon name="lucideExternalLink" /></a></div> }
        </aside>
      </div>
    } @else {
      <p class="text-muted-foreground">Loading…</p>
    }
  `,
})
export class ProjectDetail {
  private readonly api = inject(ContentApi);
  protected readonly error = apiErrorMessage;
  protected readonly kinds = PROJECT_KINDS;
  protected readonly statuses = PROJECT_STATUS;
  readonly slug = input.required<string>();
  protected readonly project = rxResource({ params: () => this.slug(), stream: ({ params }) => this.api.project(params) });
}

@Component({
  selector: 'app-project-submit',
  imports: [ReactiveFormsModule, RouterLink, NgIcon, HlmButtonImports, HlmCardImports, HlmInputImports, HlmLabelImports, InstitutionPicker],
  providers: [provideIcons({ lucideLoaderCircle })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form hlmCard class="mx-auto max-w-3xl" [formGroup]="form" (ngSubmit)="submit()">
      <div hlmCardHeader>
        <h1 hlmCardTitle class="text-xl">Add a conservation project</h1>
        <p hlmCardDescription>Projects, initiatives and citizen programmes. An administrator reviews new entries.</p>
      </div>
      <div hlmCardContent class="grid gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-1.5 sm:col-span-2"><label hlmLabel for="title">Title *</label><input hlmInput id="title" formControlName="title" /></div>
        <div class="flex flex-col gap-1.5">
          <label hlmLabel for="kind">Type</label>
          <select id="kind" formControlName="kind" [class]="selectClass">@for (k of kinds; track k[0]) { <option [value]="k[0]">{{ k[1] }}</option> }</select>
        </div>
        <div class="flex flex-col gap-1.5">
          <label hlmLabel for="projectStatus">Status</label>
          <select id="projectStatus" formControlName="projectStatus" [class]="selectClass">
            <option value="planned">Planned</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option>
          </select>
        </div>
        <div class="flex flex-col gap-1.5 sm:col-span-2"><label hlmLabel for="summary">One-line summary *</label><input hlmInput id="summary" formControlName="summary" /></div>
        <div class="flex flex-col gap-1.5"><label hlmLabel>Lead organisation (directory)</label><app-institution-picker [(value)]="institution" /></div>
        <div class="flex flex-col gap-1.5"><label hlmLabel for="organisation">…or organisation name</label><input hlmInput id="organisation" formControlName="organisation" /></div>
        <div class="flex flex-col gap-1.5"><label hlmLabel for="region">Region / river basin</label><input hlmInput id="region" formControlName="region" /></div>
        <div class="flex flex-col gap-1.5"><label hlmLabel for="focusSpecies">Focus species</label><input hlmInput id="focusSpecies" formControlName="focusSpecies" placeholder="e.g. Tor khudree" /></div>
        <div class="flex flex-col gap-1.5"><label hlmLabel for="startYear">Start year</label><input hlmInput id="startYear" type="number" formControlName="startYear" /></div>
        <div class="flex flex-col gap-1.5"><label hlmLabel for="endYear">End year</label><input hlmInput id="endYear" type="number" formControlName="endYear" /></div>
        <div class="flex flex-col gap-1.5 sm:col-span-2"><label hlmLabel for="url">Website</label><input hlmInput id="url" formControlName="url" placeholder="https://" /></div>
        <div class="flex flex-col gap-1.5 sm:col-span-2"><label hlmLabel for="description">Description</label><textarea hlmInput id="description" formControlName="description" rows="6" class="h-auto py-2"></textarea></div>
        <div class="flex flex-col gap-1.5 sm:col-span-2"><label hlmLabel for="howToJoin">How people can take part</label><textarea hlmInput id="howToJoin" formControlName="howToJoin" rows="3" class="h-auto py-2"></textarea></div>
        @if (error()) { <p class="text-destructive text-sm sm:col-span-2" role="alert">{{ error() }}</p> }
      </div>
      <div hlmCardFooter class="justify-end gap-2">
        <a hlmBtn variant="ghost" routerLink="/conservation">Cancel</a>
        <button hlmBtn type="submit" [disabled]="busy()">@if (busy()) { <ng-icon name="lucideLoaderCircle" class="animate-spin" /> } Submit</button>
      </div>
    </form>
  `,
})
export class ProjectSubmit {
  private readonly api = inject(ContentApi);
  private readonly router = inject(Router);
  protected readonly selectClass = SELECT_CLASS;
  protected readonly kinds = Object.entries(PROJECT_KINDS);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(5)]],
    kind: ['project' as ProjectKind],
    projectStatus: ['ongoing' as 'planned' | 'ongoing' | 'completed'],
    summary: ['', [Validators.required, Validators.minLength(10)]],
    organisation: [''],
    region: [''],
    focusSpecies: [''],
    startYear: [null as number | null],
    endYear: [null as number | null],
    url: [''],
    description: [''],
    howToJoin: [''],
  });
  protected readonly institution = signal<{ id: number; name: string } | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected submit(): void {
    if (this.form.invalid) {
      this.error.set('Title (5+) and a summary (10+ characters) are required.');
      return;
    }
    const v = this.form.getRawValue();
    const blank = (s: string) => s.trim() || null;
    this.busy.set(true);
    this.error.set(null);
    this.api
      .submitProject({
        ...v,
        institutionId: this.institution()?.id ?? null,
        organisation: blank(v.organisation),
        region: blank(v.region),
        focusSpecies: blank(v.focusSpecies),
        startYear: v.startYear ? Number(v.startYear) : null,
        endYear: v.endYear ? Number(v.endYear) : null,
        url: blank(v.url),
        description: blank(v.description),
        howToJoin: blank(v.howToJoin),
      })
      .subscribe({
        next: (r) => this.router.navigate(['/conservation', r.slug]),
        error: (e) => {
          this.busy.set(false);
          this.error.set(apiErrorMessage(e));
        },
      });
  }
}

const THREAT_TABS: { code: 'CR' | 'EN' | 'VU'; status: GbifThreatStatus; label: string }[] = [
  { code: 'CR', status: 'CRITICALLY_ENDANGERED', label: 'Critically Endangered' },
  { code: 'EN', status: 'ENDANGERED', label: 'Endangered' },
  { code: 'VU', status: 'VULNERABLE', label: 'Vulnerable' },
];
const PAGE_SIZE = 25;

/** Threatened fishes recorded in the focus country (IUCN categories from GBIF). */
@Component({
  selector: 'app-threatened',
  imports: [RouterLink, NgIcon, HlmButtonImports, HlmTableImports, HlmTabsImports, IucnBadge],
  providers: [provideIcons({ lucideChevronLeft, lucideChevronRight, lucideExternalLink })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      <header class="space-y-1">
        <p class="text-muted-foreground text-sm">Conservation</p>
        <h1 class="text-3xl font-semibold tracking-tight">Threatened species</h1>
        <p class="text-muted-foreground max-w-3xl">
          Fishes with occurrence records in {{ country.name }} whose IUCN Red List category is Critically Endangered, Endangered or
          Vulnerable, ranked by number of records. Categories and records come live from GBIF; check the Red List assessment before citing.
        </p>
      </header>

      <div class="flex flex-wrap items-center gap-4">
        <hlm-tabs [tab]="category()" (tabActivated)="setCategory($any($event))">
          <hlm-tabs-list aria-label="IUCN category">
            @for (t of tabs; track t.code) { <button [hlmTabsTrigger]="t.code">{{ t.code }} · {{ t.label }}</button> }
          </hlm-tabs-list>
        </hlm-tabs>
        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" class="accent-primary size-4" [checked]="freshwaterOnly()" (change)="freshwaterOnly.set($any($event.target).checked)" />
          Freshwater only
        </label>
      </div>

      @if (list.error()) {
        <p class="text-destructive">{{ gbifError(list.error()) }}</p>
      } @else if (list.hasValue()) {
        <p class="text-muted-foreground text-xs">
          {{ list.value().totalOccurrences.toLocaleString() }} records of {{ current().label.toLowerCase() }} fishes in {{ country.name }}
          @if (hidden()) { · {{ hidden() }} marine-only species hidden on this page }
        </p>
        <div hlmTableContainer class="rounded-md border" [class.opacity-60]="list.isLoading()">
          <table hlmTable>
            <thead hlmTHead>
              <tr hlmTr><th hlmTh>Species</th><th hlmTh>Family</th><th hlmTh>Order</th><th hlmTh>IUCN</th><th hlmTh class="text-right">Records in {{ country.name }}</th></tr>
            </thead>
            <tbody hlmTBody>
              @for (e of rows(); track e.usage.key) {
                <tr hlmTr>
                  <td hlmTd><a [routerLink]="['/taxonomy/species', e.usage.key]" class="text-primary hover:underline"><em>{{ e.usage.canonicalName ?? e.usage.scientificName }}</em></a>
                    <span class="text-muted-foreground ml-1 text-xs">{{ e.usage.authorship }}</span></td>
                  <td hlmTd>{{ e.usage.family }}</td>
                  <td hlmTd>{{ e.usage.order }}</td>
                  <td hlmTd><app-iucn-badge [status]="current().status" /></td>
                  <td hlmTd class="text-right tabular-nums">
                    <a class="hover:underline" target="_blank" rel="noopener" [href]="gbifWeb + '/occurrence/search?taxon_key=' + e.usage.key + '&country=' + country.code">{{ e.occurrences.toLocaleString() }}</a>
                  </td>
                </tr>
              } @empty {
                <tr hlmTr><td hlmTd colspan="5" class="text-muted-foreground py-6 text-center">No species in this category.</td></tr>
              }
            </tbody>
          </table>
        </div>
        <div class="flex justify-end gap-2">
          <button hlmBtn variant="outline" size="sm" [disabled]="page() === 0 || list.isLoading()" (click)="page.set(page() - 1)" aria-label="Previous page"><ng-icon name="lucideChevronLeft" /></button>
          <button hlmBtn variant="outline" size="sm" [disabled]="list.value().entries.length < pageSize || list.isLoading()" (click)="page.set(page() + 1)" aria-label="Next page"><ng-icon name="lucideChevronRight" /></button>
        </div>
      } @else {
        <p class="text-muted-foreground">Loading from GBIF…</p>
      }
      <p class="text-muted-foreground text-xs">
        Endemic-species lists are not included yet: GBIF has no reliable endemism flag, so they need a curated source.
      </p>
    </section>
  `,
})
export class Threatened {
  private readonly gbif = inject(GbifTaxonomyService);
  protected readonly gbifError = gbifErrorMessage;
  protected readonly country = FOCUS_COUNTRY;
  protected readonly gbifWeb = GBIF_WEB;
  protected readonly tabs = THREAT_TABS;
  protected readonly pageSize = PAGE_SIZE;
  protected readonly category = signal<'CR' | 'EN' | 'VU'>('CR');
  protected readonly page = signal(0);
  protected readonly current = computed(() => THREAT_TABS.find((t) => t.code === this.category())!);
  /** Uses GBIF species profiles; species without habitat data are kept. */
  protected readonly freshwaterOnly = signal(true);
  private readonly entries = computed(() => this.list.value()?.entries ?? []);
  protected readonly rows = computed(() => (this.freshwaterOnly() ? this.entries().filter((e) => e.freshwater !== false) : this.entries()));
  protected readonly hidden = computed(() => this.entries().length - this.rows().length);
  protected readonly list = rxResource({
    params: () => ({ category: this.category(), page: this.page() }),
    stream: ({ params }) => this.gbif.threatenedInCountry(FOCUS_COUNTRY.code, params.category, params.page * PAGE_SIZE, PAGE_SIZE),
  });
  protected setCategory(c: 'CR' | 'EN' | 'VU'): void {
    this.category.set(c);
    this.page.set(0);
  }
}
