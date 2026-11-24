import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideCamera, lucideChevronLeft, lucideChevronRight, lucideFish } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { RequestStatusBadge, TaxonName } from '../components/shared';
import { IdentificationApi, RequestStatus, apiErrorMessage, photoUrl } from '../identification.api';

const PAGE_SIZE = 12;

@Component({
  selector: 'app-request-list',
  imports: [DatePipe, RouterLink, NgIcon, HlmButtonImports, HlmCardImports, HlmTabsImports, RequestStatusBadge, TaxonName],
  providers: [provideIcons({ lucideArrowLeft, lucideCamera, lucideChevronLeft, lucideChevronRight, lucideFish })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a hlmBtn variant="ghost" size="sm" routerLink="/identification" class="mb-4 -ml-2">
      <ng-icon name="lucideArrowLeft" /> Identification
    </a>
    <header class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div class="space-y-1">
        <h1 class="text-2xl font-semibold tracking-tight">Expert identification requests</h1>
        <p class="text-muted-foreground">Help identify these fishes, or ask for help with your own.</p>
      </div>
      <a hlmBtn routerLink="new"><ng-icon name="lucideCamera" /> New request</a>
    </header>

    <hlm-tabs [tab]="status() ?? 'all'" (tabActivated)="status.set($event === 'all' ? null : $any($event))">
      <hlm-tabs-list aria-label="Filter by status">
        <button hlmTabsTrigger="all">All</button>
        <button hlmTabsTrigger="open">Needs ID</button>
        <button hlmTabsTrigger="proposed">Proposed</button>
        <button hlmTabsTrigger="verified">Verified</button>
      </hlm-tabs-list>
    </hlm-tabs>

    <div class="mt-4">
      @if (list.error()) {
        <p class="text-destructive">{{ error(list.error()) }}</p>
      } @else if (list.hasValue()) {
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" [class.opacity-60]="list.isLoading()">
          @for (r of list.value().items; track r.id) {
            <a hlmCard [routerLink]="[r.id]" class="hover:ring-primary/40 pt-0 transition-shadow">
              @if (r.photos[0]; as p) {
                <img [src]="photo(p.fileName)" alt="" class="aspect-[4/3] w-full object-cover" loading="lazy" />
              } @else {
                <div class="bg-muted text-muted-foreground flex aspect-[4/3] items-center justify-center">
                  <ng-icon name="lucideFish" size="40" />
                </div>
              }
              <div hlmCardHeader>
                <h2 hlmCardTitle class="line-clamp-1">{{ r.title }}</h2>
                <p hlmCardDescription>{{ r.locality }} · {{ (r.observedOn ?? r.createdAt) | date: 'mediumDate' }}</p>
                <div hlmCardAction><app-request-status [status]="r.status" /></div>
              </div>
              <div hlmCardContent class="text-sm">
                @if (r.verifiedTaxon) {
                  <app-taxon-name [taxon]="r.verifiedTaxon" [showAuthor]="false" />
                } @else {
                  <span class="text-muted-foreground">{{ r._count.proposals }} proposal{{ r._count.proposals === 1 ? '' : 's' }}</span>
                }
              </div>
            </a>
          } @empty {
            <p class="text-muted-foreground sm:col-span-2 lg:col-span-3">No requests here yet.</p>
          }
        </div>
        @if (list.value().total > pageSize) {
          <div class="mt-4 flex items-center justify-end gap-2">
            <span class="text-muted-foreground text-xs">Page {{ page() + 1 }} of {{ pages() }}</span>
            <button hlmBtn variant="outline" size="sm" [disabled]="page() === 0" (click)="page.set(page() - 1)"><ng-icon name="lucideChevronLeft" /></button>
            <button hlmBtn variant="outline" size="sm" [disabled]="page() + 1 >= pages()" (click)="page.set(page() + 1)"><ng-icon name="lucideChevronRight" /></button>
          </div>
        }
      } @else {
        <p class="text-muted-foreground">Loading…</p>
      }
    </div>
  `,
})
export class RequestList {
  private readonly api = inject(IdentificationApi);
  protected readonly error = apiErrorMessage;
  protected readonly photo = photoUrl;
  protected readonly pageSize = PAGE_SIZE;

  protected readonly status = signal<RequestStatus | null>(null);
  protected readonly page = linkedSignal({ source: this.status, computation: () => 0 });

  protected readonly list = rxResource({
    params: () => ({ status: this.status(), page: this.page() }),
    stream: ({ params }) => this.api.requests(params.status, params.page, PAGE_SIZE),
  });
  protected readonly pages = computed(() => Math.ceil((this.list.value()?.total ?? 0) / PAGE_SIZE));
}
