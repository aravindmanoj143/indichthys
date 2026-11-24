import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { rxResource, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideExternalLink, lucideLoaderCircle, lucidePlus, lucideSearch, lucideTrash2, lucideX } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { debounceTime, of } from 'rxjs';
import { apiErrorMessage } from '../../../core/api-error';
import { AuthService } from '../../../core/auth.service';
import { VerifiedBadge } from '../components/verified-badge';
import {
  AffiliationInput,
  INSTITUTION_TYPE_LABELS,
  Institution,
  InstitutionType,
  MyProfile,
  PublicationInput,
  RegistryApi,
  crossrefLookup,
} from '../registry.api';

interface EditableAffiliation {
  institution: Institution | { name: string; type: InstitutionType; city: string | null };
  role: string;
  department: string;
  startYear: number | null;
  endYear: number | null;
  isCurrent: boolean;
}

const SELECT_CLASS = 'border-input dark:bg-input/30 h-9 rounded-md border bg-transparent px-2.5 text-sm shadow-xs outline-none';
const CATEGORY_LABELS: Record<string, string> = { discipline: 'Disciplines', taxon: 'Fish groups', region: 'Regions' };

@Component({
  selector: 'app-my-profile',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NgIcon,
    HlmBadgeImports,
    HlmButtonImports,
    HlmCardImports,
    HlmInputImports,
    HlmLabelImports,
    VerifiedBadge,
  ],
  providers: [provideIcons({ lucideLoaderCircle, lucidePlus, lucideTrash2, lucideX, lucideSearch, lucideExternalLink })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div class="space-y-1">
        <p class="text-muted-foreground text-sm">Account</p>
        <h1 class="text-2xl font-semibold tracking-tight">My ichthyologist profile</h1>
        <p class="text-muted-foreground">Signed in as {{ auth.user()?.email }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <a hlmBtn variant="ghost" routerLink="/account/inbox">Inbox</a>
        <a hlmBtn variant="ghost" routerLink="/account/submissions">My submissions</a>
        @if (mine.value(); as m) {
          <a hlmBtn variant="outline" [routerLink]="['/ichthyologists', m.slug]"><ng-icon name="lucideExternalLink" /> View public profile</a>
        }
      </div>
    </header>

    @if (mine.error()) {
      <p class="text-destructive">{{ error(mine.error()) }}</p>
    } @else if (mine.isLoading() && !mine.hasValue()) {
      <p class="text-muted-foreground">Loading…</p>
    } @else {
      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <form class="space-y-6" [formGroup]="form" (ngSubmit)="save()">
          <!-- Basics -->
          <div hlmCard>
            <div hlmCardHeader>
              <h2 hlmCardTitle>About you</h2>
              @if (!mine.value()) { <p hlmCardDescription>Create your profile to appear in the researcher directory.</p> }
            </div>
            <div hlmCardContent class="grid gap-4 sm:grid-cols-6">
              <div class="flex flex-col gap-1.5 sm:col-span-1">
                <label hlmLabel for="honorific">Title</label>
                <input hlmInput id="honorific" formControlName="honorific" placeholder="Dr" />
              </div>
              <div class="flex flex-col gap-1.5 sm:col-span-5">
                <label hlmLabel for="fullName">Full name *</label>
                <input hlmInput id="fullName" formControlName="fullName" autocomplete="name" />
                @if (mine.value()?.verificationStatus === 'verified') {
                  <p class="text-muted-foreground text-xs">Changing your name resets expert verification.</p>
                }
              </div>
              <div class="flex flex-col gap-1.5 sm:col-span-6">
                <label hlmLabel for="position">Position</label>
                <input hlmInput id="position" formControlName="position" placeholder="e.g. Assistant Professor, PhD scholar" />
              </div>
              <div class="flex flex-col gap-1.5 sm:col-span-6">
                <label hlmLabel for="bio">Short bio</label>
                <textarea hlmInput id="bio" formControlName="bio" rows="4" class="h-auto py-2" placeholder="Your research in a few sentences"></textarea>
              </div>
              <div class="flex flex-col gap-1.5 sm:col-span-2">
                <label hlmLabel for="city">City</label>
                <input hlmInput id="city" formControlName="city" />
              </div>
              <div class="flex flex-col gap-1.5 sm:col-span-2">
                <label hlmLabel for="region">State / region</label>
                <input hlmInput id="region" formControlName="region" placeholder="e.g. Kerala" />
              </div>
              <div class="flex flex-col gap-1.5 sm:col-span-2">
                <label hlmLabel for="country">Country code</label>
                <input hlmInput id="country" formControlName="country" maxlength="2" class="uppercase" />
              </div>
            </div>
          </div>

          <!-- Expertise & interests -->
          <div hlmCard>
            <div hlmCardHeader>
              <h2 hlmCardTitle>Areas of expertise</h2>
              <p hlmCardDescription>Pick everything that applies.</p>
            </div>
            <div hlmCardContent class="space-y-4">
              @for (g of expertiseGroups(); track g.label) {
                <fieldset>
                  <legend class="text-muted-foreground mb-2 text-xs uppercase">{{ g.label }}</legend>
                  <div class="flex flex-wrap gap-2">
                    @for (e of g.items; track e.slug) {
                      <button hlmBtn type="button" size="sm" [variant]="expertise().has(e.slug) ? 'default' : 'outline'"
                        [attr.aria-pressed]="expertise().has(e.slug)" (click)="toggleExpertise(e.slug)">{{ e.name }}</button>
                    }
                  </div>
                </fieldset>
              }
              <div>
                <label hlmLabel for="interest">Research interests</label>
                <div class="mt-1.5 flex flex-wrap gap-1.5">
                  @for (i of interests(); track i) {
                    <span hlmBadge variant="secondary" class="gap-1">{{ i }}
                      <button type="button" [attr.aria-label]="'Remove ' + i" (click)="removeInterest(i)"><ng-icon name="lucideX" size="12" /></button>
                    </span>
                  }
                </div>
                <input hlmInput id="interest" class="mt-2" placeholder="Type an interest and press Enter" #interest
                  (keydown.enter)="$event.preventDefault(); addInterest(interest.value); interest.value = ''" />
              </div>
            </div>
          </div>

          <!-- Affiliations -->
          <div hlmCard>
            <div hlmCardHeader><h2 hlmCardTitle>Institutional affiliations</h2></div>
            <div hlmCardContent class="space-y-4">
              @for (a of affiliations(); track $index; let i = $index) {
                <div class="space-y-3 rounded-md border p-3">
                  <div class="flex items-start justify-between gap-2">
                    <p class="font-medium">{{ a.institution.name }}</p>
                    <button hlmBtn type="button" variant="ghost" size="icon-sm" [attr.aria-label]="'Remove ' + a.institution.name" (click)="removeAffiliation(i)"><ng-icon name="lucideTrash2" /></button>
                  </div>
                  <div class="grid gap-3 sm:grid-cols-4">
                    <input hlmInput class="sm:col-span-2" placeholder="Role" [value]="a.role" (input)="patchAffiliation(i, { role: $any($event.target).value })" aria-label="Role" />
                    <input hlmInput class="sm:col-span-2" placeholder="Department" [value]="a.department" (input)="patchAffiliation(i, { department: $any($event.target).value })" aria-label="Department" />
                    <input hlmInput type="number" placeholder="From (year)" [value]="a.startYear ?? ''" (input)="patchAffiliation(i, { startYear: year($any($event.target).value) })" aria-label="Start year" />
                    @if (!a.isCurrent) {
                      <input hlmInput type="number" placeholder="To (year)" [value]="a.endYear ?? ''" (input)="patchAffiliation(i, { endYear: year($any($event.target).value) })" aria-label="End year" />
                    }
                    <label class="flex items-center gap-2 text-sm sm:col-span-2">
                      <input type="checkbox" class="accent-primary size-4" [checked]="a.isCurrent" (change)="patchAffiliation(i, { isCurrent: $any($event.target).checked })" /> Current
                    </label>
                  </div>
                </div>
              }

              <div class="space-y-2">
                <label hlmLabel for="inst">Add an institution</label>
                <div class="relative">
                  <ng-icon name="lucideSearch" class="text-muted-foreground absolute top-2.5 left-2.5" />
                  <input hlmInput id="inst" class="pl-8" placeholder="Search institutions…" autocomplete="off" [value]="instQuery()" (input)="instQuery.set($any($event.target).value)" />
                </div>
                @if (instQuery().trim().length >= 2) {
                  <ul class="rounded-md border">
                    @for (inst of instResults.value() ?? []; track inst.id) {
                      <li><button type="button" class="hover:bg-muted w-full px-3 py-2 text-left text-sm" (click)="addAffiliation(inst)">
                        {{ inst.name }} <span class="text-muted-foreground text-xs">{{ inst.city }}</span></button></li>
                    }
                    <li class="border-t p-3">
                      <p class="text-muted-foreground mb-2 text-xs">Not listed? Add “{{ instQuery().trim() }}” as a new institution:</p>
                      <div class="flex flex-wrap gap-2">
                        <select [class]="selectClass" #newType aria-label="Institution type">
                          @for (t of institutionTypes; track t[0]) { <option [value]="t[0]">{{ t[1] }}</option> }
                        </select>
                        <input hlmInput class="w-40" placeholder="City" #newCity aria-label="City" />
                        <button hlmBtn type="button" size="sm" (click)="addAffiliation({ name: instQuery().trim(), type: $any(newType.value), city: newCity.value || null })">
                          <ng-icon name="lucidePlus" /> Add
                        </button>
                      </div>
                    </li>
                  </ul>
                }
              </div>
            </div>
          </div>

          <!-- Contact & links -->
          <div hlmCard>
            <div hlmCardHeader><h2 hlmCardTitle>Links &amp; contact preferences</h2></div>
            <div hlmCardContent class="grid gap-4 sm:grid-cols-2">
              <div class="flex flex-col gap-1.5">
                <label hlmLabel for="orcid">ORCID iD</label>
                <input hlmInput id="orcid" formControlName="orcid" placeholder="0000-0002-1825-0097" />
              </div>
              <div class="flex flex-col gap-1.5">
                <label hlmLabel for="website">Website</label>
                <input hlmInput id="website" formControlName="website" placeholder="https://" />
              </div>
              <div class="flex flex-col gap-1.5">
                <label hlmLabel for="googleScholar">Google Scholar URL</label>
                <input hlmInput id="googleScholar" formControlName="googleScholar" placeholder="https://scholar.google.com/…" />
              </div>
              <div class="flex flex-col gap-1.5">
                <label hlmLabel for="researchGate">ResearchGate URL</label>
                <input hlmInput id="researchGate" formControlName="researchGate" placeholder="https://www.researchgate.net/…" />
              </div>
              <div class="flex flex-col gap-1.5 sm:col-span-2">
                <label hlmLabel for="contactEmail">Contact email (private)</label>
                <input hlmInput id="contactEmail" type="email" formControlName="contactEmail" />
                <p class="text-muted-foreground text-xs">Never shown. People reach you through the contact form and your inbox.</p>
              </div>
              <label class="flex items-center gap-2 text-sm"><input type="checkbox" class="accent-primary size-4" formControlName="acceptingCollaboration" /> Open to collaboration requests</label>
              <label class="flex items-center gap-2 text-sm"><input type="checkbox" class="accent-primary size-4" formControlName="acceptingStudents" /> Taking students</label>
              <label class="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" class="accent-primary size-4" formControlName="isPublic" /> Show my profile in the public directory</label>
            </div>
          </div>

          @if (saveError()) { <p class="text-destructive text-sm" role="alert">{{ saveError() }}</p> }
          @if (saved()) { <p class="text-sm text-emerald-700 dark:text-emerald-400" role="status">Profile saved.</p> }
          <div class="flex justify-end">
            <button hlmBtn type="submit" [disabled]="saving()">
              @if (saving()) { <ng-icon name="lucideLoaderCircle" class="animate-spin" /> }
              {{ mine.value() ? 'Save profile' : 'Create profile' }}
            </button>
          </div>
        </form>

        <aside class="space-y-4">
          <!-- Verification -->
          <div hlmCard size="sm">
            <div hlmCardHeader>
              <h2 hlmCardTitle>Expert verification</h2>
              <p hlmCardDescription>Verified experts' identifications count towards verifying fish records.</p>
            </div>
            <div hlmCardContent class="space-y-3 text-sm">
              @if (!mine.value()) {
                <p class="text-muted-foreground">Create your profile first.</p>
              } @else {
                @switch (mine.value()!.verificationStatus) {
                  @case ('verified') { <app-verified-badge status="verified" /> }
                  @case ('pending') {
                    <app-verified-badge status="pending" [showAll]="true" />
                    <p class="text-muted-foreground">An administrator will review your request.</p>
                  }
                  @default {
                    @if (mine.value()!.verificationStatus === 'rejected') {
                      <app-verified-badge status="rejected" [showAll]="true" />
                      <p class="text-muted-foreground">You can add more evidence and ask again.</p>
                    }
                    <textarea hlmInput rows="5" class="h-auto py-2" [value]="evidence()" (input)="evidence.set($any($event.target).value)" aria-label="Evidence"
                      placeholder="Your training and work on fishes: degree, institution, papers, collections you've worked with. Add your ORCID above."></textarea>
                    <button hlmBtn size="sm" class="w-full" [disabled]="evidence().trim().length < 20 || requesting()" (click)="requestVerification()">Request verification</button>
                    @if (verifyError()) { <p class="text-destructive">{{ verifyError() }}</p> }
                  }
                }
              }
            </div>
          </div>

          <!-- Publications -->
          <div hlmCard size="sm">
            <div hlmCardHeader><h2 hlmCardTitle>Publications</h2></div>
            <div hlmCardContent class="space-y-3 text-sm">
              @if (!mine.value()) {
                <p class="text-muted-foreground">Create your profile first.</p>
              } @else {
                <ul class="space-y-2">
                  @for (p of mine.value()!.publications; track p.id) {
                    <li class="flex gap-2">
                      <span class="flex-1">{{ p.title }} <span class="text-muted-foreground">({{ p.year }})</span></span>
                      <button hlmBtn variant="ghost" size="icon-xs" [attr.aria-label]="'Remove ' + p.title" (click)="removePublication(p.id)"><ng-icon name="lucideTrash2" /></button>
                    </li>
                  } @empty { <li class="text-muted-foreground">None yet.</li> }
                </ul>
                <div class="space-y-2 border-t pt-3" [formGroup]="pubForm">
                  <div class="flex gap-2">
                    <input hlmInput formControlName="doi" placeholder="DOI, e.g. 10.11646/zootaxa…" aria-label="DOI" />
                    <button hlmBtn type="button" size="sm" variant="outline" [disabled]="!pubForm.controls.doi.value || looking()" (click)="lookup()">
                      @if (looking()) { <ng-icon name="lucideLoaderCircle" class="animate-spin" /> } Look up
                    </button>
                  </div>
                  <input hlmInput formControlName="title" placeholder="Title *" aria-label="Title" />
                  <input hlmInput formControlName="authors" placeholder="Authors *" aria-label="Authors" />
                  <div class="flex gap-2">
                    <input hlmInput formControlName="journal" placeholder="Journal" aria-label="Journal" />
                    <input hlmInput type="number" class="w-24" formControlName="year" placeholder="Year" aria-label="Year" />
                  </div>
                  @if (pubError()) { <p class="text-destructive">{{ pubError() }}</p> }
                  <button hlmBtn type="button" size="sm" class="w-full" [disabled]="pubForm.invalid" (click)="addPublication()"><ng-icon name="lucidePlus" /> Add publication</button>
                  <p class="text-muted-foreground text-xs">“Look up” fetches details from Crossref using only the DOI.</p>
                </div>
              }
            </div>
          </div>
        </aside>
      </div>
    }
  `,
})
export class MyProfilePage {
  private readonly api = inject(RegistryApi);
  private readonly http = inject(HttpClient);
  protected readonly auth = inject(AuthService);
  protected readonly error = apiErrorMessage;
  protected readonly selectClass = SELECT_CLASS;
  protected readonly institutionTypes = Object.entries(INSTITUTION_TYPE_LABELS);

  protected readonly mine = rxResource({ stream: () => this.api.myProfile() });
  private readonly vocab = rxResource({ stream: () => this.api.expertise() });
  protected readonly expertiseGroups = computed(() => {
    const all = this.vocab.value() ?? [];
    return ['discipline', 'taxon', 'region'].map((c) => ({ label: CATEGORY_LABELS[c]!, items: all.filter((e) => e.category === c) }));
  });

  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    honorific: [''],
    position: [''],
    bio: [''],
    city: [''],
    region: [''],
    country: ['IN', [Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)]],
    contactEmail: ['', Validators.email],
    website: [''],
    orcid: [''],
    googleScholar: [''],
    researchGate: [''],
    acceptingCollaboration: [true],
    acceptingStudents: [false],
    isPublic: [true],
  });
  protected readonly expertise = signal(new Set<string>());
  protected readonly interests = signal<string[]>([]);
  protected readonly affiliations = signal<EditableAffiliation[]>([]);

  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly saveError = signal<string | null>(null);

  // Institution search
  protected readonly instQuery = signal('');
  private readonly instDebounced = toSignal(toObservable(this.instQuery).pipe(debounceTime(250)), { initialValue: '' });
  protected readonly instResults = rxResource({
    params: () => this.instDebounced().trim(),
    stream: ({ params }) => (params.length < 2 ? of([]) : this.api.institutions(params)),
  });

  // Verification
  protected readonly evidence = signal('');
  protected readonly requesting = signal(false);
  protected readonly verifyError = signal<string | null>(null);

  // Publications
  protected readonly pubForm = this.fb.group({
    doi: [''],
    title: ['', [Validators.required, Validators.minLength(3)]],
    authors: ['', [Validators.required, Validators.minLength(2)]],
    journal: [''],
    year: [null as number | null],
    volume: [''],
    pages: [''],
    url: [''],
    type: ['article'],
  });
  protected readonly looking = signal(false);
  protected readonly pubError = signal<string | null>(null);

  constructor() {
    // Fill the form once the profile (or the lack of one) is known.
    effect(() => {
      if (!this.mine.hasValue()) return;
      const m = this.mine.value();
      if (m) this.fill(m);
      else if (!this.form.controls.fullName.value) this.form.patchValue({ fullName: this.auth.user()?.displayName ?? '' });
    });
  }

  private fill(m: MyProfile): void {
    this.form.patchValue({
      fullName: m.fullName,
      honorific: m.honorific ?? '',
      position: m.position ?? '',
      bio: m.bio ?? '',
      city: m.city ?? '',
      region: m.region ?? '',
      country: m.country,
      contactEmail: m.contactEmail ?? '',
      website: m.website ?? '',
      orcid: m.orcid ?? '',
      googleScholar: m.googleScholar ?? '',
      researchGate: m.researchGate ?? '',
      acceptingCollaboration: m.acceptingCollaboration,
      acceptingStudents: m.acceptingStudents,
      isPublic: m.isPublic,
    });
    this.expertise.set(new Set(m.expertise.map((e) => e.slug)));
    this.interests.set([...m.interests]);
    this.affiliations.set(
      m.affiliations.map((a) => ({
        institution: a.institution,
        role: a.role ?? '',
        department: a.department ?? '',
        startYear: a.startYear,
        endYear: a.endYear,
        isCurrent: a.isCurrent,
      })),
    );
    this.evidence.set(m.verificationEvidence ?? '');
  }

  protected toggleExpertise(slug: string): void {
    this.expertise.update((s) => {
      const next = new Set(s);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  protected addInterest(value: string): void {
    const v = value.trim();
    if (v.length >= 2 && !this.interests().some((i) => i.toLowerCase() === v.toLowerCase())) this.interests.update((l) => [...l, v]);
  }
  protected removeInterest(value: string): void {
    this.interests.update((l) => l.filter((i) => i !== value));
  }

  protected addAffiliation(institution: EditableAffiliation['institution']): void {
    this.affiliations.update((l) => [...l, { institution, role: '', department: '', startYear: null, endYear: null, isCurrent: true }]);
    this.instQuery.set('');
  }
  protected patchAffiliation(i: number, patch: Partial<EditableAffiliation>): void {
    this.affiliations.update((l) => l.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  }
  protected removeAffiliation(i: number): void {
    this.affiliations.update((l) => l.filter((_, j) => j !== i));
  }
  protected year(v: string): number | null {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.saveError.set('Check your name, country code (2 letters) and contact email.');
      return;
    }
    const v = this.form.getRawValue();
    const blank = (s: string) => (s.trim() ? s.trim() : null);
    const affiliations: AffiliationInput[] = this.affiliations().map((a) => ({
      institution: 'id' in a.institution ? { id: a.institution.id } : { name: a.institution.name, type: a.institution.type, city: a.institution.city },
      role: blank(a.role),
      department: blank(a.department),
      startYear: a.startYear,
      endYear: a.isCurrent ? null : a.endYear,
      isCurrent: a.isCurrent,
    }));
    this.saving.set(true);
    this.saved.set(false);
    this.saveError.set(null);
    this.api
      .saveProfile({
        ...v,
        fullName: v.fullName.trim(),
        country: v.country.toUpperCase(),
        honorific: blank(v.honorific),
        position: blank(v.position),
        bio: blank(v.bio),
        city: blank(v.city),
        region: blank(v.region),
        contactEmail: blank(v.contactEmail),
        website: blank(v.website),
        orcid: blank(v.orcid),
        googleScholar: blank(v.googleScholar),
        researchGate: blank(v.researchGate),
        expertise: [...this.expertise()],
        interests: this.interests(),
        affiliations,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.saved.set(true);
          this.mine.reload();
          this.auth.refresh().subscribe();
        },
        error: (e) => {
          this.saving.set(false);
          this.saveError.set(apiErrorMessage(e));
        },
      });
  }

  protected requestVerification(): void {
    this.requesting.set(true);
    this.verifyError.set(null);
    this.api.requestVerification(this.evidence().trim()).subscribe({
      next: () => {
        this.requesting.set(false);
        this.mine.reload();
      },
      error: (e) => {
        this.requesting.set(false);
        this.verifyError.set(apiErrorMessage(e));
      },
    });
  }

  protected lookup(): void {
    this.looking.set(true);
    this.pubError.set(null);
    crossrefLookup(this.http, this.pubForm.controls.doi.value).subscribe({
      next: (meta) => {
        this.looking.set(false);
        this.pubForm.patchValue({
          doi: meta.doi ?? this.pubForm.controls.doi.value,
          title: meta.title ?? '',
          authors: meta.authors ?? '',
          year: meta.year ?? null,
          journal: meta.journal ?? '',
          volume: meta.volume ?? '',
          pages: meta.pages ?? '',
          url: meta.url ?? '',
          type: meta.type ?? 'article',
        });
      },
      error: () => {
        this.looking.set(false);
        this.pubError.set('DOI not found on Crossref. Enter the details by hand.');
      },
    });
  }

  protected addPublication(): void {
    const v = this.pubForm.getRawValue();
    const blank = (s: string) => (s.trim() ? s.trim() : null);
    const body: PublicationInput = {
      title: v.title.trim(),
      authors: v.authors.trim(),
      year: v.year ? Number(v.year) : null,
      journal: blank(v.journal),
      volume: blank(v.volume),
      pages: blank(v.pages),
      doi: blank(v.doi),
      url: blank(v.url),
      type: v.type,
    };
    this.pubError.set(null);
    this.api.addPublication(body).subscribe({
      next: () => {
        this.pubForm.reset({ type: 'article', year: null });
        this.mine.reload();
      },
      error: (e) => this.pubError.set(apiErrorMessage(e)),
    });
  }

  protected removePublication(id: number): void {
    this.api.removePublication(id).subscribe({ next: () => this.mine.reload(), error: (e) => this.pubError.set(apiErrorMessage(e)) });
  }
}
