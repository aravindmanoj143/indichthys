import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideBadgeCheck, lucideCheck, lucideLoaderCircle, lucideLock, lucidePencil, lucideTrash2, lucideUndo2 } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { AuthService } from '../../../core/auth.service';
import { TaxonPicker } from '../../identification/components/taxon-picker';
import type { TaxonInput } from '../../identification/identification.api';
import { ObservationMap } from '../components/observation-map';
import { QualityBadge } from '../components/quality-badge';
import { HABITATS, type Identification, type IdentificationInput, ObservationsApi, UPLOADS, apiErrorMessage } from '../observations.api';

/** Half the diagonal of a 0.2° cell, roughly: the radius shown around an obscured location. */
const OBSCURED_RADIUS_M = 15000;

@Component({
  selector: 'app-observation-detail',
  imports: [DatePipe, DecimalPipe, RouterLink, NgIcon, HlmButtonImports, HlmCardImports, HlmInputImports, HlmLabelImports, ObservationMap, QualityBadge, TaxonPicker],
  providers: [provideIcons({ lucideArrowLeft, lucideCheck, lucideUndo2, lucideTrash2, lucidePencil, lucideLock, lucideBadgeCheck, lucideLoaderCircle })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a hlmBtn variant="ghost" size="sm" routerLink="/observations" class="mb-4 -ml-2"><ng-icon name="lucideArrowLeft" /> Observations</a>

    @if (obs.error()) {
      <p class="text-destructive text-sm" role="alert">{{ errorText(obs.error()) }}</p>
    } @else if (obs.value(); as o) {
      <header class="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1.5">
          <h1 class="text-2xl font-semibold tracking-tight">
            @if (o.taxonName) {
              @if (o.gbifKey && o.taxonRank === 'species') {
                <a [routerLink]="['/taxonomy/species', o.gbifKey]" class="hover:underline"><em>{{ o.taxonName }}</em></a>
              } @else { <em>{{ o.taxonName }}</em> }
            } @else { Unidentified fish }
          </h1>
          <div class="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <app-quality-badge [grade]="o.qualityGrade" />
            <span>
              Observed by
              @if (o.observer.profileSlug) { <a [routerLink]="['/ichthyologists', o.observer.profileSlug]" class="text-foreground hover:underline">{{ o.observer.name }}</a> }
              @else { <span class="text-foreground">{{ o.observer.name }}</span> }
            </span>
            <span>{{ o.observedAt ? (o.observedAt | date: 'd MMM y, HH:mm') : 'Date not recorded' }}</span>
          </div>
        </div>
        @if (o.isOwn || o.canDelete) {
          <div class="flex gap-2">
            @if (o.isOwn) { <a hlmBtn variant="outline" size="sm" [routerLink]="['/observations', o.id, 'edit']"><ng-icon name="lucidePencil" /> Edit</a> }
            @if (o.canDelete) { <button hlmBtn variant="outline" size="sm" (click)="remove(o.id)"><ng-icon name="lucideTrash2" /> Delete</button> }
          </div>
        }
      </header>

      <div class="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div class="space-y-6">
          @if (o.photos.length) {
            <figure class="space-y-2">
              <img [src]="uploads + '/' + (activePhoto() ?? o.photos[0]!.fileName)" alt="Observation photo"
                class="bg-muted max-h-[520px] w-full rounded-lg object-contain" />
              @if (o.photos.length > 1) {
                <div class="flex gap-2 overflow-x-auto">
                  @for (p of o.photos; track p.id) {
                    <button type="button" class="shrink-0 rounded-md ring-offset-2 focus-visible:ring-2" [class.ring-2]="(activePhoto() ?? o.photos[0]!.fileName) === p.fileName"
                      (click)="activePhoto.set(p.fileName)" [attr.aria-label]="'Show photo ' + ($index + 1)">
                      <img [src]="uploads + '/' + p.fileName" alt="" class="size-16 rounded-md object-cover" />
                    </button>
                  }
                </div>
              }
            </figure>
          } @else {
            <div class="bg-muted text-muted-foreground rounded-lg p-8 text-center text-sm">No photos. Observations without a photo stay casual.</div>
          }

          <section hlmCard>
            <div hlmCardHeader>
              <h2 hlmCardTitle>Identifications</h2>
              <p hlmCardDescription>
                @if (o.community; as c) {
                  Community taxon: <em>{{ c.taxonName }}</em> ({{ c.agreements }} of {{ c.total }} agree).
                  @if (o.qualityGrade !== 'research' && o.qualityGrade !== 'casual') { Research grade needs at least two agreeing species-level IDs and more than two thirds agreement. }
                } @else { No identifications yet. }
              </p>
            </div>
            <div hlmCardContent>
              <ol class="space-y-3">
                @for (i of o.identifications; track i.id) {
                  <li class="rounded-md border p-3 text-sm" [class.opacity-60]="!i.isCurrent">
                    <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <em class="font-medium" [class.line-through]="!i.isCurrent">{{ i.taxonName }}</em>
                      @if (i.taxonRank && i.taxonRank !== 'species') { <span class="text-muted-foreground text-xs">({{ i.taxonRank }})</span> }
                      <span class="text-muted-foreground">by</span>
                      @if (i.by.profileSlug) { <a [routerLink]="['/ichthyologists', i.by.profileSlug]" class="hover:underline">{{ i.by.name }}</a> } @else { <span>{{ i.by.name }}</span> }
                      @if (i.by.verified) { <ng-icon name="lucideBadgeCheck" class="text-primary" title="Verified ichthyologist" /> }
                      <span class="text-muted-foreground ml-auto text-xs">{{ i.createdAt | date: 'd MMM y' }}{{ i.isCurrent ? '' : ' · withdrawn' }}</span>
                    </div>
                    @if (i.comment) { <p class="text-muted-foreground mt-1 whitespace-pre-line">{{ i.comment }}</p> }
                    @if (auth.user() && i.isCurrent) {
                      <div class="mt-2 flex gap-2">
                        @if (i.isMine) {
                          <button hlmBtn variant="ghost" size="sm" (click)="withdraw(o.id, i.id)" [disabled]="busy()"><ng-icon name="lucideUndo2" /> Withdraw</button>
                        } @else if (!agreesWith(i)) {
                          <button hlmBtn variant="outline" size="sm" (click)="agree(o.id, i)" [disabled]="busy()"><ng-icon name="lucideCheck" /> Agree</button>
                        }
                      </div>
                    }
                  </li>
                }
              </ol>

              @if (auth.user()) {
                <div class="mt-5 space-y-3 border-t pt-4">
                  <h3 class="text-sm font-medium">Suggest an identification</h3>
                  <app-taxon-picker [(value)]="suggestion" />
                  @if (!suggestion()) {
                    <input hlmInput class="w-full" placeholder="Or type a genus or family, e.g. Garra" aria-label="Genus or family"
                      [value]="suggestText()" (input)="suggestText.set($any($event.target).value)" />
                  }
                  <textarea hlmInput class="h-auto w-full py-2" rows="2" placeholder="Why? (optional: key features you used)" aria-label="Comment"
                    [value]="comment()" (input)="comment.set($any($event.target).value)"></textarea>
                  <div class="flex items-center gap-3">
                    <button hlmBtn size="sm" (click)="suggest(o.id)" [disabled]="busy() || (!suggestion() && suggestText().trim().length < 2)">
                      @if (busy()) { <ng-icon name="lucideLoaderCircle" class="animate-spin" /> } Add identification
                    </button>
                    @if (actionError()) { <span class="text-destructive text-sm" role="alert">{{ actionError() }}</span> }
                  </div>
                </div>
              } @else {
                <p class="text-muted-foreground mt-4 text-sm">
                  <a routerLink="/account/login" [queryParams]="{ next: '/observations/' + o.id }" class="text-foreground underline">Sign in</a> to help identify this fish.
                </p>
              }
            </div>
          </section>
        </div>

        <aside class="space-y-4">
          @if (o.latitude != null && o.longitude != null) {
            <app-observation-map class="h-72" [zoom]="13"
              [marker]="obscuredForMe() ? null : { lat: o.latitude, lng: o.longitude }"
              [area]="obscuredForMe() ? { lat: o.latitude, lng: o.longitude, radiusM: obscuredRadius } : null" />
            @if (o.geoprivacy === 'obscured') {
              <p class="text-muted-foreground flex items-start gap-1.5 text-xs">
                <ng-icon name="lucideLock" class="mt-0.5 shrink-0" />
                @if (o.isOwn) { Location obscured: others see only a ~20 km area. You see the exact spot. }
                @else { Location obscured by the observer; the true spot is somewhere in this area. }
              </p>
            }
          } @else {
            <div class="bg-muted text-muted-foreground rounded-lg p-6 text-center text-sm">No location recorded.</div>
          }

          <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            @if (o.placeName) { <dt class="text-muted-foreground">Place</dt><dd>{{ o.placeName }}</dd> }
            @if (o.waterBody) { <dt class="text-muted-foreground">Water body</dt><dd>{{ o.waterBody }}</dd> }
            @if (o.habitat) { <dt class="text-muted-foreground">Habitat</dt><dd>{{ habitatLabel(o.habitat) }}</dd> }
            @if (o.latitude != null && !obscuredForMe()) {
              <dt class="text-muted-foreground">Coordinates</dt>
              <dd>{{ o.latitude | number: '1.5-5' }}, {{ o.longitude | number: '1.5-5' }}@if (o.accuracyM) { <span class="text-muted-foreground"> (±{{ o.accuracyM }} m)</span> }</dd>
            }
            @if (o.individuals) { <dt class="text-muted-foreground">Individuals</dt><dd>{{ o.individuals }}</dd> }
            @if (o.captive) { <dt class="text-muted-foreground">Origin</dt><dd>Captive / cultivated</dd> }
            <dt class="text-muted-foreground">Added</dt><dd>{{ o.createdAt | date: 'd MMM y' }}</dd>
          </dl>
          @if (o.notes) {
            <div class="space-y-1 text-sm"><h2 class="font-medium">Notes</h2><p class="text-muted-foreground whitespace-pre-line">{{ o.notes }}</p></div>
          }
        </aside>
      </div>
    } @else {
      <p class="text-muted-foreground flex items-center gap-2 text-sm"><ng-icon name="lucideLoaderCircle" class="animate-spin" /> Loading…</p>
    }
  `,
})
export class ObservationDetail {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(ObservationsApi);
  private readonly router = inject(Router);

  readonly id = input.required<string>();

  protected readonly uploads = UPLOADS;
  protected readonly obscuredRadius = OBSCURED_RADIUS_M;
  protected readonly obs = rxResource({ params: () => Number(this.id()), stream: ({ params: id }) => this.api.get(id) });
  protected readonly activePhoto = linkedSignal<number, string | null>({ source: () => Number(this.id()), computation: () => null });
  protected readonly obscuredForMe = computed(() => {
    const o = this.obs.value();
    return !!o && o.geoprivacy === 'obscured' && !o.isOwn;
  });

  protected readonly suggestion = signal<TaxonInput | null>(null);
  protected readonly suggestText = signal('');
  protected readonly comment = signal('');
  protected readonly busy = signal(false);
  protected readonly actionError = signal<string | null>(null);

  protected habitatLabel(h: string): string {
    return HABITATS.find(([v]) => v === h)?.[1] ?? h;
  }

  /** My current identification already names this taxon. */
  protected agreesWith(i: Identification): boolean {
    const mine = this.obs.value()?.identifications.find((x) => x.isMine && x.isCurrent);
    if (!mine) return false;
    return mine.gbifKey != null && i.gbifKey != null ? mine.gbifKey === i.gbifKey : mine.taxonName.toLowerCase() === i.taxonName.toLowerCase();
  }

  protected agree(id: number, i: Identification): void {
    this.run(this.api.identify(id, { taxonName: i.taxonName, gbifKey: i.gbifKey, taxonRank: i.taxonRank }));
  }

  protected suggest(id: number): void {
    const t = this.suggestion();
    const body: IdentificationInput = t
      ? { taxonName: t.scientificName, gbifKey: t.gbifKey ?? null, taxonRank: t.rank ?? 'species' }
      : { taxonName: this.suggestText().trim() };
    if (this.comment().trim()) body.comment = this.comment().trim();
    this.run(this.api.identify(id, body), () => {
      this.suggestion.set(null);
      this.suggestText.set('');
      this.comment.set('');
    });
  }

  protected withdraw(id: number, identId: number): void {
    this.run(this.api.withdraw(id, identId));
  }

  protected remove(id: number): void {
    if (!confirm('Delete this observation and its photos? This cannot be undone.')) return;
    this.api.remove(id).subscribe({ next: () => this.router.navigate(['/observations']), error: (e) => this.actionError.set(apiErrorMessage(e)) });
  }

  private run(req: ReturnType<ObservationsApi['withdraw']>, done?: () => void): void {
    this.busy.set(true);
    this.actionError.set(null);
    req.subscribe({
      next: () => {
        done?.();
        this.busy.set(false);
        this.obs.reload();
      },
      error: (e) => {
        this.actionError.set(apiErrorMessage(e));
        this.busy.set(false);
      },
    });
  }

  protected errorText(e: unknown): string {
    return apiErrorMessage(e);
  }
}
