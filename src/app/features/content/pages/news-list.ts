import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, numberAttribute } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronLeft, lucideChevronRight, lucidePenLine } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { apiErrorMessage } from '../../../core/api-error';
import { AuthService } from '../../../core/auth.service';
import { queryNavigator } from '../components/shared';
import { ContentApi, NEWS_CATEGORIES, NewsCategory } from '../content.api';

@Component({
  selector: 'app-news-list',
  imports: [DatePipe, RouterLink, NgIcon, HlmBadgeImports, HlmButtonImports, HlmCardImports],
  providers: [provideIcons({ lucideChevronLeft, lucideChevronRight, lucidePenLine })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      <header class="flex flex-wrap items-end justify-between gap-4">
        <div class="space-y-1">
          <p class="text-muted-foreground text-sm">Discover</p>
          <h1 class="text-3xl font-semibold tracking-tight">News</h1>
          <p class="text-muted-foreground max-w-2xl">New species, taxonomic updates, research and conservation news.</p>
        </div>
        @if (auth.isAdmin()) { <a hlmBtn routerLink="/admin/news"><ng-icon name="lucidePenLine" /> Manage news</a> }
      </header>

      <nav class="flex flex-wrap gap-2" aria-label="Categories">
        <button hlmBtn size="sm" [variant]="!category() ? 'default' : 'outline'" (click)="go({ category: '' })">All</button>
        @for (c of categories; track c[0]) {
          <button hlmBtn size="sm" [variant]="category() === c[0] ? 'default' : 'outline'" (click)="go({ category: c[0] })">{{ c[1] }}</button>
        }
      </nav>

      @if (list.error()) {
        <p class="text-destructive">{{ error(list.error()) }}</p>
      } @else if (list.hasValue()) {
        <div class="space-y-4" [class.opacity-60]="list.isLoading()">
          @for (n of list.value().items; track n.id) {
            <article hlmCard>
              <div hlmCardHeader>
                <p class="text-muted-foreground flex items-center gap-2 text-xs">
                  <span hlmBadge variant="secondary">{{ label(n.category) }}</span> {{ n.publishedAt | date: 'mediumDate' }}
                </p>
                <h2 hlmCardTitle class="text-lg"><a [routerLink]="[n.slug]" class="hover:underline">{{ n.title }}</a></h2>
                <p hlmCardDescription>{{ n.summary }}</p>
              </div>
            </article>
          } @empty {
            <p class="text-muted-foreground">No news yet.</p>
          }
        </div>
        @if (pages() > 1) {
          <div class="flex items-center justify-end gap-2">
            <span class="text-muted-foreground text-xs">Page {{ page() + 1 }} of {{ pages() }}</span>
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
export class NewsList {
  private readonly api = inject(ContentApi);
  protected readonly auth = inject(AuthService);
  protected readonly error = apiErrorMessage;
  protected readonly go = queryNavigator(inject(Router));
  protected readonly categories = Object.entries(NEWS_CATEGORIES);

  readonly category = input<string>();
  readonly page = input(0, { transform: (v: unknown) => (v ? numberAttribute(v) : 0) });

  protected readonly list = rxResource({
    params: () => ({ category: this.category(), page: this.page() }),
    stream: ({ params }) => this.api.news(params),
  });
  protected readonly pages = computed(() => Math.ceil((this.list.value()?.total ?? 0) / (this.list.value()?.pageSize ?? 1)));
  protected label(c: NewsCategory): string {
    return NEWS_CATEGORIES[c] ?? c;
  }
}
