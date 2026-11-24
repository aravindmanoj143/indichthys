import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideExternalLink, lucidePenLine } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { apiErrorMessage } from '../../../core/api-error';
import { AuthService } from '../../../core/auth.service';
import { Paragraphs } from '../components/shared';
import { ContentApi, NEWS_CATEGORIES } from '../content.api';

@Component({
  selector: 'app-news-detail',
  imports: [DatePipe, RouterLink, NgIcon, HlmBadgeImports, HlmButtonImports, Paragraphs],
  providers: [provideIcons({ lucideArrowLeft, lucideExternalLink, lucidePenLine })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a hlmBtn variant="ghost" size="sm" routerLink="/news" class="mb-4 -ml-2"><ng-icon name="lucideArrowLeft" /> News</a>
    @if (post.error()) {
      <p class="text-destructive">{{ error(post.error()) }}</p>
    } @else if (post.hasValue()) {
      @let p = post.value();
      <article class="mx-auto max-w-3xl space-y-6">
        <header class="space-y-2">
          <p class="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
            <span hlmBadge variant="secondary">{{ categories[p.category] }}</span>
            @if (p.publishedAt) { {{ p.publishedAt | date: 'longDate' }} } @else { <span hlmBadge variant="outline">draft</span> }
            @if (p.author) { · {{ p.author.displayName }} }
          </p>
          <h1 class="text-3xl font-semibold tracking-tight">{{ p.title }}</h1>
          <p class="text-muted-foreground text-lg">{{ p.summary }}</p>
          @if (auth.isAdmin()) { <a hlmBtn size="sm" variant="outline" [routerLink]="['/admin/news', p.id]"><ng-icon name="lucidePenLine" /> Edit</a> }
        </header>
        <app-paragraphs [text]="p.body" class="text-base leading-relaxed" />
        @if (p.sourceUrl) {
          <p><a [href]="p.sourceUrl" target="_blank" rel="noopener" class="text-primary inline-flex items-center gap-1 hover:underline">Source <ng-icon name="lucideExternalLink" size="14" /></a></p>
        }
      </article>
    } @else {
      <p class="text-muted-foreground">Loading…</p>
    }
  `,
})
export class NewsDetail {
  private readonly api = inject(ContentApi);
  protected readonly auth = inject(AuthService);
  protected readonly error = apiErrorMessage;
  protected readonly categories = NEWS_CATEGORIES;
  readonly slug = input.required<string>();
  protected readonly post = rxResource({ params: () => this.slug(), stream: ({ params }) => this.api.newsPost(params) });
}
