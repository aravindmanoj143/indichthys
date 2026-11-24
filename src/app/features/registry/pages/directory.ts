import { ChangeDetectionStrategy, Component, computed, inject, input, numberAttribute } from '@angular/core';
import { rxResource, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronLeft, lucideChevronRight, lucideHandshake, lucideSearch, lucideUserPlus, lucideX } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { debounceTime } from 'rxjs';
import { apiErrorMessage } from '../../../core/api-error';
import { AuthService } from '../../../core/auth.service';
import { VerifiedBadge } from '../components/verified-badge';
import { initials } from '../display-name';
import { RegistryApi } from '../registry.api';

const SELECT_CLASS = 'border-input dark:bg-input/30 h-9 rounded-md border bg-transparent px-2.5 text-sm shadow-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50';

/** Researcher directory. All filters live in the URL so searches can be shared. */
@Component({
  selector: 'app-directory',
  imports: [RouterLink, NgIcon, HlmBadgeImports, HlmButtonImports, HlmCardImports, HlmInputImports, HlmLabelImports, VerifiedBadge],
  providers: [provideIcons({ lucideSearch, lucideX, lucideChevronLeft, lucideChevronRight, lucideHandshake, lucideUserPlus })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      <header class="flex flex-wrap items-end justify-between gap-4">
        <div class="space-y-1">
          <p class="text-muted-foreground text-sm">People</p>
          <h1 class="text-3xl font-semibold tracking-tight">Ichthyologists</h1>
          <p class="text-muted-foreground max-w-2xl">Find researchers by expertise, region, institution or research interest, and contact them to collaborate.</p>
        </div>
        @if (auth.user()?.profile) {
          <a hlmBtn variant="outline" routerLink="/account/profile">Edit my profile</a>
        } @else {
          <a hlmBtn [routerLink]="auth.signedIn() ? '/account/profile' : '/account/register'"><ng-icon name="lucideUserPlus" /> Add your profile</a>
        }
      </header>

      <div class="flex flex-wrap items-end gap-3">
        <div class="relative min-w-64 flex-1">
          <ng-icon name="lucideSearch" class="text-muted-foreground absolute top-2.5 left-2.5" />
          <input hlmInput type="search" class="pl-8" placeholder="Name, institution, interest, expertise…" aria-label="Search ichthyologists"
            [value]="q() ?? ''" (input)="set({ q: $any($event.target).value })" />
        </div>
        <div class="flex flex-col gap-1">
          <label hlmLabel for="expertise">Expertise</label>
          <select id="expertise" [class]="selectClass" (change)="set({ expertise: $any($event.target).value })">
            <option value="" [selected]="!expertise()">Any</option>
            @for (g of expertiseGroups(); track g.label) {
              <optgroup [label]="g.label">
                @for (e of g.items; track e.slug) {
                  <option [value]="e.slug" [selected]="expertise() === e.slug">{{ e.name }}</option>
                }
              </optgroup>
            }
          </select>
        </div>
        <div class="flex flex-col gap-1">
          <label hlmLabel for="region">State / region</label>
          <select id="region" [class]="selectClass" (change)="set({ region: $any($event.target).value })">
            <option value="" [selected]="!region()">Any</option>
            @for (r of regions(); track r) { <option [value]="r" [selected]="region() === r">{{ r }}</option> }
          </select>
        </div>
        <label class="flex h-9 items-center gap-2 text-sm">
          <input type="checkbox" class="accent-primary size-4" [checked]="verified() === 'true'" (change)="set({ verified: $any($event.target).checked ? 'true' : '' })" />
          Verified experts
        </label>
        <label class="flex h-9 items-center gap-2 text-sm">
          <input type="checkbox" class="accent-primary size-4" [checked]="collaboration() === 'true'" (change)="set({ collaboration: $any($event.target).checked ? 'true' : '' })" />
          Open to collaboration
        </label>
        @if (q() || expertise() || region() || verified() || collaboration()) {
          <button hlmBtn variant="ghost" size="sm" (click)="clear()"><ng-icon name="lucideX" /> Clear</button>
        }
      </div>

      @if (list.error()) {
        <p class="text-destructive text-sm">{{ error(list.error()) }}</p>
      } @else if (list.hasValue()) {
        <p class="text-muted-foreground text-xs">{{ list.value().total }} researcher{{ list.value().total === 1 ? '' : 's' }}</p>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" [class.opacity-60]="list.isLoading()">
          @for (p of list.value().items; track p.slug) {
            <a hlmCard [routerLink]="[p.slug]" class="hover:ring-primary/40 transition-shadow">
              <div hlmCardHeader>
                <div class="flex items-start gap-3">
                  <span class="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-full font-semibold">{{ initials(p.fullName) }}</span>
                  <div class="min-w-0">
                    <h2 hlmCardTitle class="truncate">{{ p.fullName }}</h2>
                    <p hlmCardDescription class="line-clamp-2">{{ p.position }}{{ p.position && p.institution ? ', ' : '' }}{{ p.institution }}</p>
                  </div>
                </div>
              </div>
              <div hlmCardContent class="space-y-2">
                <div class="flex flex-wrap gap-1.5">
                  <app-verified-badge [status]="p.verificationStatus" />
                  @if (p.acceptingCollaboration) { <span hlmBadge variant="outline"><ng-icon name="lucideHandshake" /> Open to collaboration</span> }
                  @if (p.isDemo) { <span hlmBadge variant="outline">demo</span> }
                </div>
                @if (p.expertise.length) {
                  <p class="text-muted-foreground text-xs">{{ names(p.expertise) }}</p>
                }
                @if (p.region) { <p class="text-muted-foreground text-xs">{{ p.region }}</p> }
              </div>
            </a>
          } @empty {
            <p class="text-muted-foreground sm:col-span-2 lg:col-span-3">No researchers match. Try fewer filters.</p>
          }
        </div>
        @if (pages() > 1) {
          <div class="flex items-center justify-end gap-2">
            <span class="text-muted-foreground text-xs">Page {{ pageIndex() + 1 }} of {{ pages() }}</span>
            <button hlmBtn variant="outline" size="sm" [disabled]="pageIndex() === 0" (click)="set({ page: pageIndex() - 1 }, false)"><ng-icon name="lucideChevronLeft" /></button>
            <button hlmBtn variant="outline" size="sm" [disabled]="pageIndex() + 1 >= pages()" (click)="set({ page: pageIndex() + 1 }, false)"><ng-icon name="lucideChevronRight" /></button>
          </div>
        }
      } @else {
        <p class="text-muted-foreground">Loading…</p>
      }
    </section>
  `,
})
export class Directory {
  private readonly api = inject(RegistryApi);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly error = apiErrorMessage;
  protected readonly selectClass = SELECT_CLASS;

  // Query params
  readonly q = input<string>();
  readonly expertise = input<string>();
  readonly region = input<string>();
  readonly verified = input<string>();
  readonly collaboration = input<string>();
  readonly page = input(0, { transform: (v: unknown) => (v == null || v === '' ? 0 : numberAttribute(v)) });

  protected readonly pageIndex = computed(() => this.page());
  private readonly query = computed(() => ({
    q: this.q() || undefined,
    expertise: this.expertise() || undefined,
    region: this.region() || undefined,
    verified: this.verified() === 'true',
    collaboration: this.collaboration() === 'true',
    page: this.page(),
  }));
  private readonly debouncedQuery = toSignal(toObservable(this.query).pipe(debounceTime(250)), { initialValue: this.query() });

  protected readonly list = rxResource({ params: () => this.debouncedQuery(), stream: ({ params }) => this.api.directory(params) });
  private readonly vocab = rxResource({ stream: () => this.api.expertise() });

  protected readonly regions = computed(() => this.list.value()?.regions ?? []);
  protected readonly pages = computed(() => Math.ceil((this.list.value()?.total ?? 0) / (this.list.value()?.pageSize ?? 1)));
  protected readonly expertiseGroups = computed(() => {
    const all = this.vocab.value() ?? [];
    return [
      { label: 'Disciplines', items: all.filter((e) => e.category === 'discipline') },
      { label: 'Fish groups', items: all.filter((e) => e.category === 'taxon') },
      { label: 'Regions', items: all.filter((e) => e.category === 'region') },
    ];
  });

  protected set(params: Record<string, string | number>, resetPage = true): void {
    const cleaned = Object.fromEntries(Object.entries(params).map(([k, v]) => [k, v === '' ? null : v]));
    this.router.navigate([], {
      queryParams: { ...cleaned, ...(resetPage ? { page: null } : {}) },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected clear(): void {
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }

  protected readonly initials = initials;

  protected names(list: { name: string }[]): string {
    return list.map((e) => e.name.replace(/\s*\(.*\)$/, '')).join(' · ');
  }
}
