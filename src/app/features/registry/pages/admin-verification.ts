import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBadgeCheck, lucideExternalLink, lucideX } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { apiErrorMessage } from '../../../core/api-error';
import { VerifiedBadge } from '../components/verified-badge';
import { displayName } from '../display-name';
import { RegistryApi, VerificationCandidate, VerificationStatus } from '../registry.api';

@Component({
  selector: 'app-admin-verification',
  imports: [DatePipe, RouterLink, NgIcon, HlmButtonImports, HlmCardImports, HlmInputImports, HlmTabsImports, VerifiedBadge],
  providers: [provideIcons({ lucideBadgeCheck, lucideX, lucideExternalLink })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-6 space-y-1">
      <p class="text-muted-foreground text-sm">Administration</p>
      <h1 class="text-2xl font-semibold tracking-tight">Expert verification</h1>
      <p class="text-muted-foreground max-w-2xl">
        Check each person's evidence (ORCID, publications, institution) before verifying. Verified experts' identifications count towards verifying fish records.
      </p>
    </header>

    <hlm-tabs [tab]="status()" (tabActivated)="status.set($any($event))" class="mb-4">
      <hlm-tabs-list aria-label="Verification status">
        <button hlmTabsTrigger="pending">Pending</button>
        <button hlmTabsTrigger="verified">Verified</button>
        <button hlmTabsTrigger="rejected">Declined</button>
      </hlm-tabs-list>
    </hlm-tabs>

    @if (queue.error()) {
      <p class="text-destructive">{{ error(queue.error()) }}</p>
    } @else if (queue.hasValue()) {
      <div class="space-y-4">
        @for (c of queue.value(); track c.id) {
          <article hlmCard>
            <div hlmCardHeader>
              <h2 hlmCardTitle class="flex flex-wrap items-center gap-2">
                {{ name(c) }}
                <app-verified-badge [status]="c.verificationStatus" [showAll]="true" />
              </h2>
              <p hlmCardDescription>
                {{ c.position }}{{ c.position && c.affiliations.length ? ', ' : '' }}{{ institutions(c) }} · account {{ c.user?.email ?? '(none)' }}
              </p>
              <div hlmCardAction>
                <a hlmBtn variant="link" size="sm" [routerLink]="['/ichthyologists', c.slug]" target="_blank">Profile <ng-icon name="lucideExternalLink" /></a>
              </div>
            </div>
            <div hlmCardContent class="grid gap-4 text-sm md:grid-cols-2">
              <div>
                <p class="text-muted-foreground mb-1 text-xs uppercase">Evidence</p>
                <p class="whitespace-pre-line">{{ c.verificationEvidence || '—' }}</p>
                <p class="mt-3">
                  @if (c.orcid) { <a class="text-primary hover:underline" [href]="'https://orcid.org/' + c.orcid" target="_blank" rel="noopener">ORCID {{ c.orcid }}</a> }
                  @if (c.website) { · <a class="text-primary hover:underline" [href]="c.website" target="_blank" rel="noopener">website</a> }
                </p>
              </div>
              <div>
                <p class="text-muted-foreground mb-1 text-xs uppercase">Publications</p>
                <ul class="space-y-1">
                  @for (a of c.authorships; track $index) {
                    <li>
                      {{ a.publication.title }} ({{ a.publication.year }})
                      @if (a.publication.doi) { <a class="text-primary hover:underline" [href]="'https://doi.org/' + a.publication.doi" target="_blank" rel="noopener">doi</a> }
                    </li>
                  } @empty { <li class="text-muted-foreground">None listed.</li> }
                </ul>
                @if (c.verification.length) {
                  <p class="text-muted-foreground mt-3 mb-1 text-xs uppercase">History</p>
                  <ul class="text-muted-foreground space-y-0.5 text-xs">
                    @for (v of c.verification; track $index) { <li>{{ v.createdAt | date: 'mediumDate' }}: {{ v.action }}{{ v.note ? ' (' + v.note + ')' : '' }}</li> }
                  </ul>
                }
              </div>
            </div>
            <div hlmCardFooter class="flex-wrap gap-2">
              <input hlmInput class="min-w-48 flex-1" placeholder="Note (optional, kept in the history)" [attr.aria-label]="'Note for ' + c.fullName" #note />
              @if (c.verificationStatus !== 'verified') {
                <button hlmBtn size="sm" [disabled]="busy()" (click)="decide(c, 'verify', note.value)"><ng-icon name="lucideBadgeCheck" /> Verify</button>
              }
              @if (c.verificationStatus === 'pending') {
                <button hlmBtn size="sm" variant="outline" [disabled]="busy()" (click)="decide(c, 'reject', note.value)"><ng-icon name="lucideX" /> Decline</button>
              }
              @if (c.verificationStatus === 'verified') {
                <button hlmBtn size="sm" variant="destructive" [disabled]="busy()" (click)="decide(c, 'revoke', note.value)">Revoke</button>
              }
            </div>
          </article>
        } @empty {
          <p class="text-muted-foreground">Nothing here.</p>
        }
      </div>
      @if (actionError()) { <p class="text-destructive mt-3 text-sm">{{ actionError() }}</p> }
    } @else {
      <p class="text-muted-foreground">Loading…</p>
    }
  `,
})
export class AdminVerification {
  private readonly api = inject(RegistryApi);
  protected readonly error = apiErrorMessage;
  protected readonly name = displayName;
  protected readonly status = signal<VerificationStatus>('pending');
  protected readonly busy = signal(false);
  protected readonly actionError = signal<string | null>(null);

  protected readonly queue = rxResource({ params: () => this.status(), stream: ({ params }) => this.api.verificationQueue(params) });

  protected institutions(c: VerificationCandidate): string {
    return c.affiliations.map((a) => a.institution.name).join(', ');
  }

  protected decide(c: VerificationCandidate, decision: 'verify' | 'reject' | 'revoke', note: string): void {
    this.busy.set(true);
    this.actionError.set(null);
    this.api.decide(c.id, decision, note.trim() || undefined).subscribe({
      next: () => {
        this.busy.set(false);
        this.queue.reload();
      },
      error: (e) => {
        this.busy.set(false);
        this.actionError.set(apiErrorMessage(e));
      },
    });
  }
}
