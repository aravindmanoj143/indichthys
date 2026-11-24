import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucideBuilding2,
  lucideExternalLink,
  lucideHandshake,
  lucideLoaderCircle,
  lucideMail,
  lucideMapPin,
} from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { apiErrorMessage } from '../../../core/api-error';
import { AuthService } from '../../../core/auth.service';
import { VerifiedBadge } from '../components/verified-badge';
import { displayName, initials } from '../display-name';
import { CONTACT_KIND_LABELS, ContactKind, ExpertiseArea, Profile, RegistryApi } from '../registry.api';

const CATEGORY_LABELS: Record<string, string> = { discipline: 'Disciplines', taxon: 'Fish groups', region: 'Regions' };

@Component({
  selector: 'app-profile-page',
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
  providers: [provideIcons({ lucideArrowLeft, lucideMapPin, lucideBuilding2, lucideExternalLink, lucideMail, lucideHandshake, lucideLoaderCircle })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a hlmBtn variant="ghost" size="sm" routerLink="/ichthyologists" class="mb-4 -ml-2"><ng-icon name="lucideArrowLeft" /> Ichthyologists</a>

    @if (profile.error()) {
      <p class="text-destructive">{{ error(profile.error()) }}</p>
    } @else if (profile.hasValue()) {
      @let p = profile.value();
      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section class="space-y-6">
          <header class="flex items-start gap-4">
            <span class="bg-primary/10 text-primary flex size-16 shrink-0 items-center justify-center rounded-full text-xl font-semibold">{{ initials() }}</span>
            <div class="space-y-1">
              <h1 class="text-2xl font-semibold tracking-tight">{{ name(p) }}</h1>
              @if (p.position || currentInstitution()) {
                <p class="text-muted-foreground">{{ p.position }}{{ p.position && currentInstitution() ? ', ' : '' }}{{ currentInstitution() }}</p>
              }
              <div class="flex flex-wrap items-center gap-2 pt-1">
                <app-verified-badge [status]="p.verificationStatus" [showAll]="!!p.isOwn" />
                @if (p.acceptingCollaboration) { <span hlmBadge variant="outline"><ng-icon name="lucideHandshake" /> Open to collaboration</span> }
                @if (p.acceptingStudents) { <span hlmBadge variant="outline">Taking students</span> }
                @if (p.isDemo) { <span hlmBadge variant="outline">demo</span> }
                @if (p.region || p.city) {
                  <span class="text-muted-foreground inline-flex items-center gap-1 text-sm"><ng-icon name="lucideMapPin" /> {{ join(p.city, p.region) }}</span>
                }
              </div>
            </div>
          </header>

          @if (p.bio) {
            <div hlmCard><div hlmCardContent><p class="whitespace-pre-line">{{ p.bio }}</p></div></div>
          }

          @if (p.expertise.length || p.interests.length) {
            <div hlmCard>
              <div hlmCardHeader><h2 hlmCardTitle>Expertise &amp; research interests</h2></div>
              <div hlmCardContent class="space-y-3">
                @for (g of expertiseGroups(); track g.label) {
                  <div>
                    <p class="text-muted-foreground mb-1 text-xs uppercase">{{ g.label }}</p>
                    <div class="flex flex-wrap gap-1.5">
                      @for (e of g.items; track e.slug) {
                        <a hlmBadge variant="secondary" routerLink="/ichthyologists" [queryParams]="{ expertise: e.slug }">{{ e.name }}</a>
                      }
                    </div>
                  </div>
                }
                @if (p.interests.length) {
                  <div>
                    <p class="text-muted-foreground mb-1 text-xs uppercase">Research interests</p>
                    <div class="flex flex-wrap gap-1.5">
                      @for (i of p.interests; track i) { <span hlmBadge variant="outline">{{ i }}</span> }
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          @if (p.affiliations.length) {
            <div hlmCard>
              <div hlmCardHeader><h2 hlmCardTitle>Institutional affiliations</h2></div>
              <div hlmCardContent>
                <ul class="space-y-3">
                  @for (a of p.affiliations; track a.id) {
                    <li class="flex gap-3">
                      <ng-icon name="lucideBuilding2" class="text-muted-foreground mt-1 shrink-0" />
                      <div>
                        <p class="font-medium">
                          @if (a.institution.website) {
                            <a [href]="a.institution.website" target="_blank" rel="noopener" class="hover:underline">{{ a.institution.name }}</a>
                          } @else { {{ a.institution.name }} }
                        </p>
                        <p class="text-muted-foreground text-sm">
                          {{ join(a.role, a.department) }}
                          @if (a.startYear || a.isCurrent) { · {{ a.startYear ?? '' }}–{{ a.isCurrent ? 'present' : (a.endYear ?? '') }} }
                        </p>
                      </div>
                    </li>
                  }
                </ul>
              </div>
            </div>
          }

          <div hlmCard>
            <div hlmCardHeader><h2 hlmCardTitle>Publications ({{ p.publications.length }})</h2></div>
            <div hlmCardContent>
              <ol class="space-y-3 text-sm">
                @for (pub of p.publications; track pub.id) {
                  <li>
                    {{ pub.authors }} @if (pub.year) {({{ pub.year }})}. <span class="font-medium">{{ pub.title }}</span>.
                    @if (pub.journal) { <em>{{ pub.journal }}</em>@if (pub.volume) { {{ pub.volume }}}@if (pub.pages) {: {{ pub.pages }}}. }
                    @if (pub.doi) {
                      <a class="text-primary hover:underline" [href]="'https://doi.org/' + pub.doi" target="_blank" rel="noopener">doi:{{ pub.doi }}</a>
                    } @else if (pub.url) {
                      <a class="text-primary hover:underline" [href]="pub.url" target="_blank" rel="noopener">link</a>
                    }
                  </li>
                } @empty {
                  <li class="text-muted-foreground">No publications listed.</li>
                }
              </ol>
            </div>
          </div>
        </section>

        <aside class="space-y-4">
          <div hlmCard size="sm">
            <div hlmCardHeader><h2 hlmCardTitle>Contributions on Indichthys</h2></div>
            <div hlmCardContent>
              <dl class="grid grid-cols-3 gap-2 text-center">
                <div><dt class="text-muted-foreground text-xs">Identifications</dt><dd class="text-xl font-semibold tabular-nums">{{ p.contributions.proposals }}</dd></div>
                <div><dt class="text-muted-foreground text-xs">Verified</dt><dd class="text-xl font-semibold tabular-nums">{{ p.contributions.verifiedIdentifications }}</dd></div>
                <div><dt class="text-muted-foreground text-xs">Reviews</dt><dd class="text-xl font-semibold tabular-nums">{{ p.contributions.reviews }}</dd></div>
              </dl>
            </div>
          </div>

          @if (links().length) {
            <div hlmCard size="sm">
              <div hlmCardHeader><h2 hlmCardTitle>Links</h2></div>
              <div hlmCardContent>
                <ul class="space-y-1 text-sm">
                  @for (l of links(); track l.label) {
                    <li><a [href]="l.url" target="_blank" rel="noopener" class="text-primary inline-flex items-center gap-1 hover:underline">{{ l.label }} <ng-icon name="lucideExternalLink" size="12" /></a></li>
                  }
                </ul>
              </div>
            </div>
          }

          @if (p.isOwn) {
            <div hlmCard size="sm">
              <div hlmCardHeader>
                <h2 hlmCardTitle>This is your profile</h2>
                <p hlmCardDescription>Messages people send you arrive in your inbox.</p>
              </div>
              <div hlmCardFooter class="gap-2">
                <a hlmBtn size="sm" routerLink="/account/profile">Edit profile</a>
                <a hlmBtn size="sm" variant="outline" routerLink="/account/inbox">Inbox</a>
              </div>
            </div>
          } @else if (!p.canReceiveMessages) {
            <div hlmCard size="sm">
              <div hlmCardHeader>
                <h2 hlmCardTitle class="flex items-center gap-2"><ng-icon name="lucideMail" /> Contact</h2>
                <p hlmCardDescription>This profile isn't linked to an Indichthys account yet, so it can't receive messages.</p>
              </div>
            </div>
          } @else {
            <form hlmCard size="sm" [formGroup]="form" (ngSubmit)="send()">
              <div hlmCardHeader>
                <h2 hlmCardTitle class="flex items-center gap-2"><ng-icon name="lucideMail" /> Contact</h2>
                <p hlmCardDescription>Your message goes to their Indichthys inbox. They see your email so they can reply.</p>
              </div>
              @if (sent()) {
                <div hlmCardContent><p class="text-sm text-emerald-700 dark:text-emerald-400" role="status">Message sent.</p></div>
              } @else {
                <div hlmCardContent class="space-y-3">
                  <div class="flex flex-col gap-1.5">
                    <label hlmLabel for="kind">About</label>
                    <select id="kind" formControlName="kind" class="border-input h-9 rounded-md border bg-transparent px-2.5 text-sm">
                      @for (k of kinds(); track k) { <option [value]="k">{{ kindLabels[k] }}</option> }
                    </select>
                  </div>
                  <input hlmInput formControlName="senderName" placeholder="Your name" aria-label="Your name" autocomplete="name" />
                  <input hlmInput type="email" formControlName="senderEmail" placeholder="Your email" aria-label="Your email" autocomplete="email" />
                  <input hlmInput formControlName="subject" placeholder="Subject" aria-label="Subject" />
                  <textarea hlmInput formControlName="message" rows="5" class="h-auto py-2" placeholder="Message" aria-label="Message"></textarea>
                  @if (sendError()) { <p class="text-destructive text-sm" role="alert">{{ sendError() }}</p> }
                </div>
                <div hlmCardFooter>
                  <button hlmBtn class="w-full" type="submit" [disabled]="sending()">
                    @if (sending()) { <ng-icon name="lucideLoaderCircle" class="animate-spin" /> } Send message
                  </button>
                </div>
              }
            </form>
          }
        </aside>
      </div>
    } @else {
      <p class="text-muted-foreground">Loading profile…</p>
    }
  `,
})
export class ProfilePage {
  private readonly api = inject(RegistryApi);
  private readonly auth = inject(AuthService);
  protected readonly error = apiErrorMessage;
  protected readonly kindLabels = CONTACT_KIND_LABELS;

  readonly slug = input.required<string>();
  protected readonly profile = rxResource({ params: () => this.slug(), stream: ({ params }) => this.api.profile(params) });

  private readonly p = computed<Profile | undefined>(() => this.profile.value());
  protected readonly currentInstitution = computed(() => this.p()?.affiliations.find((a) => a.isCurrent)?.institution.name ?? null);
  protected readonly initials = computed(() => initials(this.p()?.fullName ?? ''));
  protected readonly name = displayName;
  protected readonly expertiseGroups = computed(() => {
    const all = this.p()?.expertise ?? [];
    return ['discipline', 'taxon', 'region']
      .map((c) => ({ label: CATEGORY_LABELS[c]!, items: all.filter((e: ExpertiseArea) => e.category === c) }))
      .filter((g) => g.items.length);
  });
  protected readonly links = computed(() => {
    const p = this.p();
    if (!p) return [];
    return [
      p.orcid ? { label: `ORCID ${p.orcid}`, url: `https://orcid.org/${p.orcid}` } : null,
      p.website ? { label: 'Website', url: p.website } : null,
      p.googleScholar ? { label: 'Google Scholar', url: p.googleScholar } : null,
      p.researchGate ? { label: 'ResearchGate', url: p.researchGate } : null,
    ].filter((l): l is { label: string; url: string } => !!l);
  });
  protected readonly kinds = computed<ContactKind[]>(() => {
    const p = this.p();
    return ['contact', 'identification', ...(p?.acceptingCollaboration ? ['collaboration' as const] : []), ...(p?.acceptingStudents ? ['student' as const] : [])];
  });

  protected readonly form = inject(FormBuilder).nonNullable.group({
    kind: ['contact' as ContactKind],
    senderName: ['', [Validators.required, Validators.minLength(2)]],
    senderEmail: ['', [Validators.required, Validators.email]],
    subject: ['', [Validators.required, Validators.minLength(3)]],
    message: ['', [Validators.required, Validators.minLength(10)]],
  });
  protected readonly sending = signal(false);
  protected readonly sent = signal(false);
  protected readonly sendError = signal<string | null>(null);

  constructor() {
    // Prefill from the signed-in account.
    effect(() => {
      const u = this.auth.user();
      if (u && !this.form.controls.senderName.value) {
        this.form.patchValue({ senderName: u.profile?.fullName ?? u.displayName, senderEmail: u.email });
      }
    });
  }

  protected join(...parts: (string | null | undefined)[]): string {
    return parts.filter((x) => !!x).join(', ');
  }

  protected send(): void {
    if (this.form.invalid) {
      this.sendError.set('Fill in your name, a valid email, a subject and a message (10+ characters).');
      return;
    }
    this.sending.set(true);
    this.sendError.set(null);
    this.api.contact(this.slug(), this.form.getRawValue()).subscribe({
      next: () => {
        this.sent.set(true);
        this.sending.set(false);
      },
      error: (e) => {
        this.sendError.set(apiErrorMessage(e));
        this.sending.set(false);
      },
    });
  }
}
