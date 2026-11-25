import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, numberAttribute, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { VerifiedBadge } from '../../registry/components/verified-badge';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideBadgeCheck, lucideLoaderCircle, lucideThumbsDown, lucideThumbsUp } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { RequestStatusBadge, TaxonName } from '../components/shared';
import { TaxonPicker } from '../components/taxon-picker';
import { Confidence, IdentificationApi, Proposal, TaxonInput, apiErrorMessage, photoUrl } from '../identification.api';

@Component({
  selector: 'app-request-detail',
  imports: [
    DatePipe,
    RouterLink,
    NgIcon,
    HlmBadgeImports,
    HlmButtonImports,
    HlmCardImports,
    HlmInputImports,
    HlmLabelImports,
    RequestStatusBadge,
    TaxonName,
    TaxonPicker,
    VerifiedBadge,
  ],
  providers: [provideIcons({ lucideArrowLeft, lucideThumbsUp, lucideThumbsDown, lucideBadgeCheck, lucideLoaderCircle })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a hlmBtn variant="ghost" size="sm" routerLink="/identification/requests" class="mb-4 -ml-2">
      <ng-icon name="lucideArrowLeft" /> Requests
    </a>

    @if (req.error()) {
      <p class="text-destructive">{{ error(req.error()) }}</p>
    } @else if (req.hasValue()) {
      @let r = req.value();
      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <!-- Observation -->
        <section class="space-y-4">
          <header class="space-y-2">
            <div class="flex items-center gap-2">
              <app-request-status [status]="r.status" />
              <span class="text-muted-foreground text-sm">#{{ r.id }} · submitted by {{ r.submitterName }} · {{ r.createdAt | date: 'mediumDate' }}</span>
            </div>
            <h1 class="text-2xl font-semibold tracking-tight">{{ r.title }}</h1>
            @if (r.verifiedTaxon) {
              <p class="flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                <ng-icon name="lucideBadgeCheck" /> Verified as <app-taxon-name [taxon]="r.verifiedTaxon" />
              </p>
            }
          </header>

          @if (r.photos.length) {
            <img [src]="photo(r.photos[selectedPhoto()]?.fileName ?? r.photos[0].fileName)" [alt]="r.title" class="max-h-[32rem] w-full rounded-lg bg-black/5 object-contain" />
            @if (r.photos.length > 1) {
              <div class="flex gap-2 overflow-x-auto">
                @for (p of r.photos; track p.id; let i = $index) {
                  <button type="button" (click)="selectedPhoto.set(i)" [attr.aria-label]="'Photo ' + (i + 1)"
                    class="shrink-0 rounded-md ring-offset-2" [class.ring-2]="i === selectedPhoto()" [class.ring-primary]="i === selectedPhoto()">
                    <img [src]="photo(p.fileName)" alt="" class="size-16 rounded-md object-cover" />
                  </button>
                }
              </div>
            }
          } @else {
            <p class="text-muted-foreground text-sm">No photos were attached.</p>
          }

          <div hlmCard>
            <div hlmCardContent>
              <dl class="grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
                <dt class="text-muted-foreground">Locality</dt><dd>{{ r.locality }}{{ r.region ? ', ' + r.region : '' }} ({{ r.country }})</dd>
                @if (r.observedOn) { <dt class="text-muted-foreground">Observed</dt><dd>{{ r.observedOn | date: 'mediumDate' }}</dd> }
                @if (r.latitude != null && r.longitude != null) {
                  <dt class="text-muted-foreground">Coordinates</dt>
                  <dd>
                    <a class="text-primary hover:underline" target="_blank" rel="noopener"
                       [href]="'https://www.openstreetmap.org/?mlat=' + r.latitude + '&mlon=' + r.longitude + '#map=13/' + r.latitude + '/' + r.longitude">
                      {{ r.latitude }}, {{ r.longitude }}
                    </a>
                  </dd>
                }
                @if (r.habitat) { <dt class="text-muted-foreground">Habitat</dt><dd>{{ r.habitat }}</dd> }
                @if (r.characterNotes) { <dt class="text-muted-foreground">Counts</dt><dd class="whitespace-pre-line">{{ r.characterNotes }}</dd> }
                @if (r.notes) { <dt class="text-muted-foreground">Notes</dt><dd class="whitespace-pre-line">{{ r.notes }}</dd> }
              </dl>
            </div>
          </div>
        </section>

        <!-- Identifications -->
        <aside class="space-y-4">
          @if (auth.user(); as u) {
            <p class="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
              Signed in as {{ u.profile?.fullName ?? u.displayName }}
              @if (auth.isVerifiedExpert()) { <app-verified-badge status="verified" /> }
            </p>
          } @else if (auth.signInEnabled) {
            <div hlmCard size="sm">
              <div hlmCardHeader>
                <h2 hlmCardTitle>Help identify this fish</h2>
                <p hlmCardDescription>Sign in to suggest or review identifications. Ichthyologists can get their profile verified so their identifications count as expert ones.</p>
              </div>
              <div hlmCardFooter class="gap-2">
                <a hlmBtn size="sm" routerLink="/account/login" [queryParams]="{ next: here() }">Sign in</a>
                <a hlmBtn size="sm" variant="outline" routerLink="/account/register" [queryParams]="{ next: here() }">Create account</a>
              </div>
            </div>
          }

          <h2 class="font-semibold">Identifications ({{ r.proposals.length }})</h2>
          @for (p of r.proposals; track p.id) {
            <div hlmCard size="sm" [class.ring-emerald-500]="p.tally.verified">
              <div hlmCardHeader>
                <h3 hlmCardTitle><app-taxon-name [taxon]="p.taxon" /></h3>
                <p hlmCardDescription>
                  @if (p.profileSlug) {
                    <a [routerLink]="['/ichthyologists', p.profileSlug]" class="hover:underline">{{ p.proposedBy }}</a>
                  } @else { {{ p.proposedBy }} }
                  @if (p.isExpert) { <span hlmBadge variant="secondary" class="ml-1">verified expert</span> }
                  · {{ p.confidence }} · {{ p.createdAt | date: 'mediumDate' }}
                </p>
                @if (p.tally.verified) { <div hlmCardAction><span hlmBadge>verified</span></div> }
              </div>
              <div hlmCardContent class="space-y-3 text-sm">
                @if (p.reasoning) { <p class="whitespace-pre-line">{{ p.reasoning }}</p> }
                @if (p.reviews.length) {
                  <ul class="space-y-1">
                    @for (rv of p.reviews; track rv.id) {
                      <li class="text-muted-foreground">
                        <ng-icon [name]="rv.decision === 'agree' ? 'lucideThumbsUp' : 'lucideThumbsDown'" [class.text-emerald-600]="rv.decision === 'agree'" [class.text-destructive]="rv.decision !== 'agree'" />
                        @if (rv.profileSlug) {
                          <a [routerLink]="['/ichthyologists', rv.profileSlug]" class="hover:underline">{{ rv.reviewer }}</a>
                        } @else { {{ rv.reviewer }} }
                        @if (rv.isExpert) { <span class="text-xs">(verified expert)</span> }
                        @if (rv.comment) { <span>: {{ rv.comment }}</span> }
                      </li>
                    }
                  </ul>
                }
                <p class="text-muted-foreground text-xs">
                  {{ p.tally.agree }} agree ({{ p.tally.expertAgree }} expert) · {{ p.tally.disagree }} disagree
                </p>
                @if (r.status !== 'closed' && auth.signedIn()) {
                  @if (p.isMine) {
                    <p class="text-muted-foreground text-xs">This is your identification.</p>
                  } @else {
                    <div class="flex gap-2">
                      <input hlmInput class="h-8 flex-1" placeholder="Comment (optional)" [attr.aria-label]="'Comment on ' + p.taxon.scientificName" #comment />
                      <button hlmBtn size="sm" [variant]="p.myReview === 'agree' ? 'default' : 'outline'" [disabled]="busy()" (click)="review(p, 'agree', comment.value); comment.value = ''" title="Agree" [attr.aria-pressed]="p.myReview === 'agree'">
                        <ng-icon name="lucideThumbsUp" />
                      </button>
                      <button hlmBtn size="sm" [variant]="p.myReview === 'disagree' ? 'default' : 'outline'" [disabled]="busy()" (click)="review(p, 'disagree', comment.value); comment.value = ''" title="Disagree" [attr.aria-pressed]="p.myReview === 'disagree'">
                        <ng-icon name="lucideThumbsDown" />
                      </button>
                    </div>
                    @if (p.myReview) { <p class="text-muted-foreground text-xs">You {{ p.myReview }}. Voting again replaces your review.</p> }
                  }
                }
              </div>
            </div>
          } @empty {
            <p class="text-muted-foreground text-sm">No identifications yet. Be the first.</p>
          }

          @if (r.status !== 'closed' && auth.signedIn()) {
            <div hlmCard size="sm">
              <div hlmCardHeader><h3 hlmCardTitle>Suggest an identification</h3></div>
              <div hlmCardContent class="space-y-3">
                <app-taxon-picker [(value)]="proposedTaxon" />
                <div class="flex flex-col gap-1.5">
                  <label hlmLabel for="confidence">Confidence</label>
                  <select id="confidence" class="border-input h-9 rounded-md border bg-transparent px-2.5 text-sm" [value]="confidence()" (change)="confidence.set($any($event.target).value)">
                    <option value="certain">Certain</option>
                    <option value="likely">Likely</option>
                    <option value="possible">Possible</option>
                  </select>
                </div>
                <textarea hlmInput rows="3" class="h-auto py-2" placeholder="Which characters support this?" aria-label="Reasoning"
                  [value]="reasoning()" (input)="reasoning.set($any($event.target).value)"></textarea>
                <button hlmBtn class="w-full" [disabled]="!proposedTaxon() || busy()" (click)="propose()">
                  @if (busy()) { <ng-icon name="lucideLoaderCircle" class="animate-spin" /> }
                  Submit identification
                </button>
              </div>
            </div>
          }
          @if (actionError()) { <p class="text-destructive text-sm" role="alert">{{ actionError() }}</p> }
          <p class="text-muted-foreground text-xs">
            An identification is verified when at least 2 people agree (the proposer counts), at least one of them a verified expert, and experts agreeing outnumber experts disagreeing.
          </p>
        </aside>
      </div>
    } @else {
      <p class="text-muted-foreground">Loading…</p>
    }
  `,
})
export class RequestDetail {
  private readonly api = inject(IdentificationApi);
  protected readonly error = apiErrorMessage;
  protected readonly photo = photoUrl;

  readonly id = input.required({ transform: numberAttribute });
  protected readonly req = rxResource({ params: () => this.id(), stream: ({ params }) => this.api.request(params) });

  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly here = () => this.router.url;

  protected readonly selectedPhoto = signal(0);
  protected readonly proposedTaxon = signal<TaxonInput | null>(null);
  protected readonly confidence = signal<Confidence>('likely');
  protected readonly reasoning = signal('');
  protected readonly busy = signal(false);
  protected readonly actionError = signal<string | null>(null);

  private done = {
    next: () => {
      this.busy.set(false);
      this.actionError.set(null);
      this.req.reload();
    },
    error: (e: unknown) => {
      this.busy.set(false);
      this.actionError.set(apiErrorMessage(e));
    },
  };

  protected propose(): void {
    const taxon = this.proposedTaxon();
    if (!taxon) return;
    this.busy.set(true);
    this.api
      .propose(this.id(), {
        taxon,
        confidence: this.confidence(),
        reasoning: this.reasoning().trim() || undefined,
      })
      .subscribe({
        ...this.done,
        next: () => {
          this.proposedTaxon.set(null);
          this.reasoning.set('');
          this.done.next();
        },
      });
  }

  protected review(p: Proposal, decision: 'agree' | 'disagree', comment: string): void {
    this.busy.set(true);
    this.api
      .review(p.id, { decision, comment: comment.trim() || undefined })
      .subscribe(this.done);
  }
}
