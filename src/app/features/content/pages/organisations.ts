import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, numberAttribute, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideChevronLeft, lucideChevronRight, lucideExternalLink, lucideMapPin, lucidePenLine } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { apiErrorMessage } from '../../../core/api-error';
import { AuthService } from '../../../core/auth.service';
import { VerifiedBadge } from '../../registry/components/verified-badge';
import { displayName } from '../../registry/display-name';
import { INSTITUTION_TYPE_LABELS, InstitutionType } from '../../registry/registry.api';
import { Paragraphs, SELECT_CLASS, queryNavigator } from '../components/shared';
import { ContentApi, PROJECT_KINDS, opportunityTypeLabel } from '../content.api';

@Component({
  selector: 'app-organisations',
  imports: [RouterLink, NgIcon, HlmBadgeImports, HlmButtonImports, HlmCardImports, HlmInputImports],
  providers: [provideIcons({ lucideMapPin, lucideChevronLeft, lucideChevronRight })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      <header class="space-y-1">
        <p class="text-muted-foreground text-sm">People</p>
        <h1 class="text-3xl font-semibold tracking-tight">Organisations</h1>
        <p class="text-muted-foreground max-w-2xl">Universities, research institutes, museums, government agencies and NGOs working on fishes.
          Organisations are added when researchers list their affiliations.</p>
      </header>
      <div class="flex flex-wrap items-center gap-2">
        <button hlmBtn size="sm" [variant]="!type() ? 'default' : 'outline'" (click)="go({ type: '' })">All</button>
        @for (t of types; track t[0]) {
          <button hlmBtn size="sm" [variant]="type() === t[0] ? 'default' : 'outline'" (click)="go({ type: t[0] })">{{ t[1] }}</button>
        }
        <input hlmInput type="search" class="ml-auto max-w-xs" placeholder="Search name or city…" aria-label="Search organisations"
          [value]="q() ?? ''" (change)="go({ q: $any($event.target).value })" />
      </div>
      @if (list.error()) {
        <p class="text-destructive">{{ error(list.error()) }}</p>
      } @else if (list.hasValue()) {
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" [class.opacity-60]="list.isLoading()">
          @for (o of list.value().items; track o.id) {
            <a hlmCard size="sm" [routerLink]="[o.id]" class="hover:ring-primary/40 transition-shadow">
              <div hlmCardHeader>
                <h2 hlmCardTitle>{{ o.name }}</h2>
                <p hlmCardDescription class="flex flex-wrap items-center gap-2">
                  <span hlmBadge variant="secondary">{{ typeLabel(o.type) }}</span>
                  @if (o.city || o.region) { <span class="inline-flex items-center gap-1"><ng-icon name="lucideMapPin" size="13" /> {{ join(o.city, o.region) }}</span> }
                </p>
              </div>
              <div hlmCardContent class="text-muted-foreground text-xs">
                {{ o._count.affiliations }} researcher{{ o._count.affiliations === 1 ? '' : 's' }} ·
                {{ o._count.projects }} project{{ o._count.projects === 1 ? '' : 's' }} ·
                {{ o._count.opportunities }} opportunit{{ o._count.opportunities === 1 ? 'y' : 'ies' }}
              </div>
            </a>
          } @empty {
            <p class="text-muted-foreground">No organisations match.</p>
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
export class Organisations {
  private readonly api = inject(ContentApi);
  protected readonly error = apiErrorMessage;
  protected readonly go = queryNavigator(inject(Router));
  protected readonly types = Object.entries(INSTITUTION_TYPE_LABELS);
  readonly type = input<string>();
  readonly q = input<string>();
  readonly page = input(0, { transform: (v: unknown) => (v ? numberAttribute(v) : 0) });
  protected readonly list = rxResource({
    params: () => ({ type: this.type(), q: this.q(), page: this.page() }),
    stream: ({ params }) => this.api.organisations(params),
  });
  protected readonly pages = computed(() => Math.ceil((this.list.value()?.total ?? 0) / (this.list.value()?.pageSize ?? 1)));
  protected typeLabel(t: string): string {
    return INSTITUTION_TYPE_LABELS[t as InstitutionType] ?? t;
  }
  protected join(...p: (string | null)[]): string {
    return p.filter((x) => !!x).join(', ');
  }
}

@Component({
  selector: 'app-organisation-detail',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, NgIcon, HlmBadgeImports, HlmButtonImports, HlmCardImports, HlmInputImports, HlmLabelImports, Paragraphs, VerifiedBadge],
  providers: [provideIcons({ lucideArrowLeft, lucideExternalLink, lucideMapPin, lucidePenLine })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a hlmBtn variant="ghost" size="sm" routerLink="/organisations" class="mb-4 -ml-2"><ng-icon name="lucideArrowLeft" /> Organisations</a>
    @if (org.error()) {
      <p class="text-destructive">{{ error(org.error()) }}</p>
    } @else if (org.hasValue()) {
      @let o = org.value();
      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section class="space-y-6">
          <header class="space-y-2">
            <p class="flex flex-wrap items-center gap-2 text-sm">
              <span hlmBadge variant="secondary">{{ typeLabel(o.type) }}</span>
              @if (o.city || o.region) { <span class="text-muted-foreground inline-flex items-center gap-1"><ng-icon name="lucideMapPin" size="14" /> {{ join(o.city, o.region) }}</span> }
            </p>
            <h1 class="text-3xl font-semibold tracking-tight">{{ o.name }}</h1>
            @if (o.website) { <a [href]="o.website" target="_blank" rel="noopener" class="text-primary inline-flex items-center gap-1 text-sm hover:underline">{{ o.website }} <ng-icon name="lucideExternalLink" size="13" /></a> }
          </header>
          @if (o.description) { <app-paragraphs [text]="o.description" /> }

          @if (editing()) {
            <form hlmCard size="sm" [formGroup]="form" (ngSubmit)="save()">
              <div hlmCardHeader><h2 hlmCardTitle>Edit organisation</h2></div>
              <div hlmCardContent class="grid gap-3 sm:grid-cols-2">
                <div class="flex flex-col gap-1.5 sm:col-span-2"><label hlmLabel for="name">Name</label><input hlmInput id="name" formControlName="name" /></div>
                <div class="flex flex-col gap-1.5"><label hlmLabel for="type">Type</label>
                  <select id="type" formControlName="type" [class]="selectClass">@for (t of types; track t[0]) { <option [value]="t[0]">{{ t[1] }}</option> }</select></div>
                <div class="flex flex-col gap-1.5"><label hlmLabel for="website">Website</label><input hlmInput id="website" formControlName="website" /></div>
                <div class="flex flex-col gap-1.5"><label hlmLabel for="city">City</label><input hlmInput id="city" formControlName="city" /></div>
                <div class="flex flex-col gap-1.5"><label hlmLabel for="region">State / region</label><input hlmInput id="region" formControlName="region" /></div>
                <div class="flex flex-col gap-1.5 sm:col-span-2"><label hlmLabel for="description">Description</label><textarea hlmInput id="description" formControlName="description" rows="5" class="h-auto py-2"></textarea></div>
                @if (saveError()) { <p class="text-destructive text-sm sm:col-span-2">{{ saveError() }}</p> }
              </div>
              <div hlmCardFooter class="gap-2"><button hlmBtn size="sm" type="submit">Save</button><button hlmBtn size="sm" variant="ghost" type="button" (click)="editing.set(false)">Cancel</button></div>
            </form>
          }

          <div hlmCard>
            <div hlmCardHeader><h2 hlmCardTitle>Researchers ({{ o.affiliations.length }})</h2></div>
            <div hlmCardContent>
              <ul class="space-y-2 text-sm">
                @for (a of o.affiliations; track a.profile.slug) {
                  <li class="flex flex-wrap items-center gap-2">
                    <a [routerLink]="['/ichthyologists', a.profile.slug]" class="text-primary hover:underline">{{ name(a.profile) }}</a>
                    <span class="text-muted-foreground">{{ a.role ?? a.profile.position }}</span>
                    <app-verified-badge [status]="a.profile.verificationStatus" />
                  </li>
                } @empty { <li class="text-muted-foreground">No public profiles list this organisation yet.</li> }
              </ul>
            </div>
          </div>
        </section>
        <aside class="space-y-4">
          @if (auth.isAdmin() && !editing()) {
            <button hlmBtn variant="outline" size="sm" (click)="editing.set(true)"><ng-icon name="lucidePenLine" /> Edit organisation</button>
          }
          <div hlmCard size="sm">
            <div hlmCardHeader><h2 hlmCardTitle>Conservation projects</h2></div>
            <div hlmCardContent>
              <ul class="space-y-2 text-sm">
                @for (p of o.projects; track p.slug) {
                  <li><a [routerLink]="['/conservation', p.slug]" class="text-primary hover:underline">{{ p.title }}</a><span class="text-muted-foreground block text-xs">{{ kinds[p.kind] }}</span></li>
                } @empty { <li class="text-muted-foreground">None listed.</li> }
              </ul>
            </div>
          </div>
          <div hlmCard size="sm">
            <div hlmCardHeader><h2 hlmCardTitle>Open opportunities</h2></div>
            <div hlmCardContent>
              <ul class="space-y-2 text-sm">
                @for (op of o.opportunities; track op.slug) {
                  <li><a [routerLink]="['/opportunities', op.slug]" class="text-primary hover:underline">{{ op.title }}</a>
                    <span class="text-muted-foreground block text-xs">{{ opType(op.section, op.type) }}@if (op.deadline) { · closes {{ op.deadline | date: 'mediumDate' }} }</span></li>
                } @empty { <li class="text-muted-foreground">None open.</li> }
              </ul>
            </div>
          </div>
        </aside>
      </div>
    } @else {
      <p class="text-muted-foreground">Loading…</p>
    }
  `,
})
export class OrganisationDetail {
  private readonly api = inject(ContentApi);
  protected readonly auth = inject(AuthService);
  protected readonly error = apiErrorMessage;
  protected readonly name = displayName;
  protected readonly kinds = PROJECT_KINDS;
  protected readonly opType = opportunityTypeLabel;
  protected readonly types = Object.entries(INSTITUTION_TYPE_LABELS);
  protected readonly selectClass = SELECT_CLASS;
  readonly id = input.required({ transform: numberAttribute });
  protected readonly org = rxResource({ params: () => this.id(), stream: ({ params }) => this.api.organisation(params) });

  protected readonly editing = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly form = inject(FormBuilder).nonNullable.group({ name: [''], type: ['other'], website: [''], city: [''], region: [''], description: [''] });

  constructor() {
    effect(() => {
      const o = this.org.value();
      if (o) this.form.patchValue({ name: o.name, type: o.type, website: o.website ?? '', city: o.city ?? '', region: o.region ?? '', description: o.description ?? '' });
    });
  }

  protected typeLabel(t: string): string {
    return INSTITUTION_TYPE_LABELS[t as InstitutionType] ?? t;
  }
  protected join(...p: (string | null)[]): string {
    return p.filter((x) => !!x).join(', ');
  }
  protected save(): void {
    const v = this.form.getRawValue();
    const blank = (s: string) => s.trim() || null;
    this.api
      .updateOrganisation(this.id(), { name: v.name.trim(), type: v.type, website: blank(v.website), city: blank(v.city), region: blank(v.region), description: blank(v.description) })
      .subscribe({
        next: () => {
          this.editing.set(false);
          this.org.reload();
        },
        error: (e) => this.saveError.set(apiErrorMessage(e)),
      });
  }
}
