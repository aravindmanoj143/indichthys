import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLoaderCircle, lucideX } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { of } from 'rxjs';
import { apiErrorMessage } from '../../../core/api-error';
import { AuthService } from '../../../core/auth.service';
import { SELECT_CLASS } from '../../content/components/shared';
import { TaxonPicker } from '../../identification/components/taxon-picker';
import { TaxonInput } from '../../identification/identification.api';
import { RegistryApi, crossrefLookup } from '../../registry/registry.api';
import { PUBLICATION_TYPES, PublicationType, PublicationsApi } from '../publications.api';

const CATEGORY_LABELS: Record<string, string> = { discipline: 'Disciplines', taxon: 'Fish groups', region: 'Regions' };

/** Add a publication (route `publications/add`) or edit one (`publications/:id/edit`). */
@Component({
  selector: 'app-publication-form',
  imports: [ReactiveFormsModule, RouterLink, NgIcon, HlmBadgeImports, HlmButtonImports, HlmCardImports, HlmInputImports, HlmLabelImports, TaxonPicker],
  providers: [provideIcons({ lucideLoaderCircle, lucideX })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form hlmCard class="mx-auto max-w-3xl" [formGroup]="form" (ngSubmit)="submit()">
      <div hlmCardHeader>
        <h1 hlmCardTitle class="text-xl">{{ editId() ? 'Edit publication' : 'Add a publication' }}</h1>
        <p hlmCardDescription>Start with the DOI if it has one; the details are filled in from Crossref.</p>
      </div>
      <div hlmCardContent class="space-y-5">
        <div class="flex flex-col gap-1.5">
          <label hlmLabel for="doi">DOI</label>
          <div class="flex gap-2">
            <input hlmInput id="doi" formControlName="doi" placeholder="10.11646/zootaxa.…" />
            <button hlmBtn type="button" variant="outline" [disabled]="!form.controls.doi.value || looking()" (click)="lookup()">
              @if (looking()) { <ng-icon name="lucideLoaderCircle" class="animate-spin" /> } Look up
            </button>
          </div>
          @if (duplicate(); as d) {
            <p class="text-sm text-amber-700 dark:text-amber-400">Already in the repository: <a [routerLink]="['/publications', d.id]" class="underline">{{ d.title }}</a></p>
          }
          @if (lookupMessage()) { <p class="text-muted-foreground text-sm">{{ lookupMessage() }}</p> }
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="type">Type</label>
            <select id="type" formControlName="type" [class]="selectClass">@for (t of types; track t[0]) { <option [value]="t[0]">{{ t[1] }}</option> }</select>
          </div>
          <div class="flex flex-col gap-1.5"><label hlmLabel for="year">Year</label><input hlmInput id="year" type="number" formControlName="year" /></div>
          <div class="flex flex-col gap-1.5 sm:col-span-2"><label hlmLabel for="title">Title *</label><textarea hlmInput id="title" formControlName="title" rows="2" class="h-auto py-2"></textarea></div>
          <div class="flex flex-col gap-1.5 sm:col-span-2">
            <label hlmLabel for="authors">Authors * <span class="text-muted-foreground font-normal">(as cited, e.g. “Pethiyagoda R, Meegaskumbura M”)</span></label>
            <input hlmInput id="authors" formControlName="authors" />
          </div>
          <div class="flex flex-col gap-1.5 sm:col-span-2"><label hlmLabel for="journal">{{ isBook() ? 'Book / series title' : 'Journal' }}</label><input hlmInput id="journal" formControlName="journal" /></div>
          <div class="grid grid-cols-3 gap-2 sm:col-span-2">
            <div class="flex flex-col gap-1.5"><label hlmLabel for="volume">Volume</label><input hlmInput id="volume" formControlName="volume" /></div>
            <div class="flex flex-col gap-1.5"><label hlmLabel for="issue">Issue</label><input hlmInput id="issue" formControlName="issue" /></div>
            <div class="flex flex-col gap-1.5"><label hlmLabel for="pages">Pages</label><input hlmInput id="pages" formControlName="pages" placeholder="69-95" /></div>
          </div>
          <div class="flex flex-col gap-1.5"><label hlmLabel for="publisher">Publisher</label><input hlmInput id="publisher" formControlName="publisher" /></div>
          <div class="flex flex-col gap-1.5"><label hlmLabel for="url">Link (if no DOI)</label><input hlmInput id="url" formControlName="url" placeholder="https://" /></div>
          <div class="flex flex-col gap-1.5 sm:col-span-2"><label hlmLabel for="abstract">Abstract</label><textarea hlmInput id="abstract" formControlName="abstract" rows="5" class="h-auto py-2"></textarea></div>
        </div>

        <div class="space-y-2">
          <p class="text-sm font-medium">Species described or revised</p>
          <div class="flex flex-wrap gap-1.5">
            @for (t of taxa(); track t.gbifKey) {
              <span hlmBadge variant="secondary" class="gap-1"><em>{{ t.scientificName }}</em>
                <button type="button" [attr.aria-label]="'Remove ' + t.scientificName" (click)="removeTaxon(t.gbifKey)"><ng-icon name="lucideX" size="12" /></button></span>
            }
          </div>
          <app-taxon-picker [(value)]="pickerValue" (valueChange)="addTaxon($event)" />
        </div>

        <div class="space-y-3">
          <p class="text-sm font-medium">Topics</p>
          @for (g of topicGroups(); track g.label) {
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="text-muted-foreground w-24 text-xs uppercase">{{ g.label }}</span>
              @for (t of g.items; track t.slug) {
                <button hlmBtn type="button" size="xs" [variant]="topics().has(t.slug) ? 'default' : 'outline'" [attr.aria-pressed]="topics().has(t.slug)" (click)="toggleTopic(t.slug)">{{ t.name }}</button>
              }
            </div>
          }
        </div>

        @if (auth.user()?.profile) {
          <label class="flex items-center gap-2 text-sm"><input type="checkbox" class="accent-primary size-4" formControlName="claimAuthorship" /> I'm an author of this publication (links it to my profile)</label>
        }
        @if (error()) { <p class="text-destructive text-sm" role="alert">{{ error() }}</p> }
      </div>
      <div hlmCardFooter class="justify-end gap-2">
        <a hlmBtn variant="ghost" [routerLink]="editId() ? ['/publications', editId()] : ['/publications']">Cancel</a>
        <button hlmBtn type="submit" [disabled]="busy()">@if (busy()) { <ng-icon name="lucideLoaderCircle" class="animate-spin" /> } {{ editId() ? 'Save' : 'Add publication' }}</button>
      </div>
    </form>
  `,
})
export class PublicationForm {
  private readonly api = inject(PublicationsApi);
  private readonly registry = inject(RegistryApi);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly selectClass = SELECT_CLASS;
  protected readonly types = Object.entries(PUBLICATION_TYPES);

  /** Route param on the edit route. */
  readonly id = input<string>();
  protected readonly editId = computed(() => (this.id() ? Number(this.id()) : null));

  protected readonly form = inject(FormBuilder).nonNullable.group({
    doi: [''],
    type: ['article' as PublicationType],
    year: [null as number | null],
    title: ['', [Validators.required, Validators.minLength(3)]],
    authors: ['', [Validators.required, Validators.minLength(2)]],
    journal: [''],
    volume: [''],
    issue: [''],
    pages: [''],
    publisher: [''],
    url: [''],
    abstract: [''],
    claimAuthorship: [false],
  });
  protected readonly taxa = signal<{ gbifKey: number; scientificName: string }[]>([]);
  /** The picker's own value; reset after each pick so several species can be added in a row. */
  protected readonly pickerValue = signal<TaxonInput | null>(null);
  protected readonly topics = signal(new Set<string>());
  protected readonly looking = signal(false);
  protected readonly lookupMessage = signal<string | null>(null);
  protected readonly duplicate = signal<{ id: number; title: string } | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly vocab = rxResource({ stream: () => this.registry.expertise() });
  protected readonly topicGroups = computed(() =>
    ['discipline', 'taxon', 'region'].map((c) => ({ label: CATEGORY_LABELS[c]!, items: (this.vocab.value() ?? []).filter((e) => e.category === c) })),
  );
  private readonly existing = rxResource({
    params: () => this.editId() ?? undefined,
    stream: ({ params }) => (params ? this.api.get(params) : of(null)),
  });
  protected readonly isBook = computed(() => ['book', 'field-guide', 'chapter'].includes(this.typeValue()));
  private readonly typeValue = signal<string>('article');

  constructor() {
    this.form.controls.type.valueChanges.subscribe((t) => this.typeValue.set(t));
    effect(() => {
      const p = this.existing.value();
      if (!p) return;
      this.form.patchValue({
        doi: p.doi ?? '',
        type: p.type,
        year: p.year,
        title: p.title,
        authors: p.authors,
        journal: p.journal ?? '',
        volume: p.volume ?? '',
        issue: p.issue ?? '',
        pages: p.pages ?? '',
        publisher: p.publisher ?? '',
        url: p.url ?? '',
        abstract: p.abstract ?? '',
      });
      this.taxa.set(p.taxa);
      this.topics.set(new Set(p.topics.map((t) => t.slug)));
    });
  }

  protected lookup(): void {
    const doi = this.form.controls.doi.value.trim();
    this.looking.set(true);
    this.lookupMessage.set(null);
    this.duplicate.set(null);
    this.api.doiCheck(doi).subscribe((r) => {
      if (r.exists && r.publication && r.publication.id !== this.editId()) this.duplicate.set(r.publication);
    });
    crossrefLookup(this.http, doi).subscribe({
      next: (m) => {
        this.looking.set(false);
        this.form.patchValue({
          doi: m.doi ?? doi,
          title: m.title ?? '',
          authors: m.authors ?? '',
          year: m.year ?? null,
          journal: m.journal ?? '',
          volume: m.volume ?? '',
          issue: m.issue ?? '',
          pages: m.pages ?? '',
          url: '',
          type: (m.type as PublicationType) ?? 'article',
        });
        this.lookupMessage.set('Filled in from Crossref. Check the details, then add species and topics.');
      },
      error: () => {
        this.looking.set(false);
        this.lookupMessage.set('Not found on Crossref. Enter the details by hand.');
      },
    });
  }

  protected addTaxon(t: TaxonInput | null): void {
    if (!t) return;
    if (t.gbifKey && !this.taxa().some((x) => x.gbifKey === t.gbifKey)) {
      this.taxa.update((l) => [...l, { gbifKey: t.gbifKey!, scientificName: t.scientificName }]);
    }
    queueMicrotask(() => this.pickerValue.set(null));
  }
  protected removeTaxon(key: number): void {
    this.taxa.update((l) => l.filter((t) => t.gbifKey !== key));
  }
  protected toggleTopic(slug: string): void {
    this.topics.update((s) => {
      const n = new Set(s);
      if (n.has(slug)) n.delete(slug);
      else n.add(slug);
      return n;
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.error.set('A title and authors are required.');
      return;
    }
    const v = this.form.getRawValue();
    const blank = (s: string) => s.trim() || null;
    const body = {
      ...v,
      doi: blank(v.doi),
      year: v.year ? Number(v.year) : null,
      title: v.title.trim(),
      authors: v.authors.trim(),
      journal: blank(v.journal),
      volume: blank(v.volume),
      issue: blank(v.issue),
      pages: blank(v.pages),
      publisher: blank(v.publisher),
      url: blank(v.url),
      abstract: blank(v.abstract),
      topics: [...this.topics()],
      taxa: this.taxa(),
    };
    const id = this.editId();
    this.busy.set(true);
    this.error.set(null);
    (id ? this.api.update(id, body) : this.api.create(body)).subscribe({
      next: (r) => this.router.navigate(['/publications', r.id]),
      error: (e: unknown) => {
        this.busy.set(false);
        const existingId = e instanceof HttpErrorResponse && e.status === 409 ? (e.error as { id?: number }).id : undefined;
        if (existingId) this.duplicate.set({ id: existingId, title: 'open the existing record' });
        this.error.set(apiErrorMessage(e));
      },
    });
  }
}
