import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, numberAttribute, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideLoaderCircle, lucidePlus, lucideTrash2 } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { apiErrorMessage } from '../../../core/api-error';
import { SELECT_CLASS } from '../components/shared';
import { ContentApi, NEWS_CATEGORIES, NewsCategory, NewsInput } from '../content.api';

/** Admin: all posts (incl. drafts). */
@Component({
  selector: 'app-news-admin',
  imports: [DatePipe, RouterLink, NgIcon, HlmBadgeImports, HlmButtonImports, HlmTableImports],
  providers: [provideIcons({ lucidePlus })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-6 flex items-end justify-between gap-4">
      <div class="space-y-1">
        <p class="text-muted-foreground text-sm">Administration</p>
        <h1 class="text-2xl font-semibold tracking-tight">News posts</h1>
      </div>
      <a hlmBtn routerLink="new"><ng-icon name="lucidePlus" /> New post</a>
    </header>
    @if (posts.error()) {
      <p class="text-destructive">{{ error(posts.error()) }}</p>
    } @else if (posts.hasValue()) {
      <div hlmTableContainer class="rounded-md border">
        <table hlmTable>
          <thead hlmTHead><tr hlmTr><th hlmTh>Title</th><th hlmTh>Category</th><th hlmTh>Status</th><th hlmTh>Published</th></tr></thead>
          <tbody hlmTBody>
            @for (p of posts.value(); track p.id) {
              <tr hlmTr>
                <td hlmTd><a [routerLink]="[p.id]" class="text-primary hover:underline">{{ p.title }}</a></td>
                <td hlmTd>{{ categories[p.category] }}</td>
                <td hlmTd><span hlmBadge [variant]="p.status === 'published' ? 'default' : 'outline'">{{ p.status }}</span></td>
                <td hlmTd>{{ p.publishedAt | date: 'mediumDate' }}</td>
              </tr>
            } @empty {
              <tr hlmTr><td hlmTd colspan="4" class="text-muted-foreground py-6 text-center">No posts yet.</td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class NewsAdmin {
  private readonly api = inject(ContentApi);
  protected readonly error = apiErrorMessage;
  protected readonly categories = NEWS_CATEGORIES;
  protected readonly posts = rxResource({ stream: () => this.api.allNews() });
}

/** Admin: create or edit a post. Route param `id` is "new" or a number. */
@Component({
  selector: 'app-news-editor',
  imports: [ReactiveFormsModule, RouterLink, NgIcon, HlmButtonImports, HlmCardImports, HlmInputImports, HlmLabelImports],
  providers: [provideIcons({ lucideArrowLeft, lucideLoaderCircle, lucideTrash2 })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a hlmBtn variant="ghost" size="sm" routerLink="/admin/news" class="mb-4 -ml-2"><ng-icon name="lucideArrowLeft" /> News posts</a>
    <form hlmCard class="mx-auto max-w-3xl" [formGroup]="form" (ngSubmit)="save()">
      <div hlmCardHeader><h1 hlmCardTitle class="text-xl">{{ postId() ? 'Edit post' : 'New post' }}</h1></div>
      <div hlmCardContent class="space-y-4">
        <div class="flex flex-col gap-1.5">
          <label hlmLabel for="title">Title *</label>
          <input hlmInput id="title" formControlName="title" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label hlmLabel for="summary">Summary * <span class="text-muted-foreground font-normal">(shown in lists)</span></label>
          <textarea hlmInput id="summary" formControlName="summary" rows="2" class="h-auto py-2"></textarea>
        </div>
        <div class="flex flex-col gap-1.5">
          <label hlmLabel for="body">Article * <span class="text-muted-foreground font-normal">(leave a blank line between paragraphs)</span></label>
          <textarea hlmInput id="body" formControlName="body" rows="14" class="h-auto py-2"></textarea>
        </div>
        <div class="grid gap-4 sm:grid-cols-3">
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="category">Category</label>
            <select id="category" formControlName="category" [class]="selectClass">
              @for (c of categories; track c[0]) { <option [value]="c[0]">{{ c[1] }}</option> }
            </select>
          </div>
          <div class="flex flex-col gap-1.5 sm:col-span-2">
            <label hlmLabel for="sourceUrl">Source link</label>
            <input hlmInput id="sourceUrl" formControlName="sourceUrl" placeholder="https://" />
          </div>
        </div>
        @if (message()) { <p class="text-sm" [class.text-destructive]="isError()" role="status">{{ message() }}</p> }
      </div>
      <div hlmCardFooter class="flex-wrap gap-2">
        <button hlmBtn type="button" [disabled]="busy()" (click)="save('published')">
          @if (busy()) { <ng-icon name="lucideLoaderCircle" class="animate-spin" /> } Publish
        </button>
        <button hlmBtn type="button" variant="outline" [disabled]="busy()" (click)="save('draft')">Save as draft</button>
        @if (postId()) {
          <button hlmBtn type="button" variant="ghost" class="ml-auto text-destructive" [disabled]="busy()" (click)="remove()"><ng-icon name="lucideTrash2" /> Delete</button>
        }
      </div>
    </form>
  `,
})
export class NewsEditor {
  private readonly api = inject(ContentApi);
  private readonly router = inject(Router);
  protected readonly selectClass = SELECT_CLASS;
  protected readonly categories = Object.entries(NEWS_CATEGORIES);

  readonly id = input<string>();
  protected readonly postId = () => (this.id() && this.id() !== 'new' ? numberAttribute(this.id()) : null);

  private readonly full = rxResource({
    params: () => this.postId() ?? undefined,
    stream: ({ params: id }) => this.api.newsById(id),
  });

  protected readonly form = inject(FormBuilder).nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(5)]],
    summary: ['', [Validators.required, Validators.minLength(10)]],
    body: ['', [Validators.required, Validators.minLength(20)]],
    category: ['news' as NewsCategory],
    sourceUrl: [''],
  });
  protected readonly busy = signal(false);
  protected readonly message = signal<string | null>(null);
  protected readonly isError = signal(false);

  constructor() {
    effect(() => {
      const p = this.full.value();
      if (p) this.form.patchValue({ title: p.title, summary: p.summary, body: p.body, category: p.category, sourceUrl: p.sourceUrl ?? '' });
    });
  }

  protected save(status: 'draft' | 'published' = 'published'): void {
    if (this.form.invalid) {
      this.isError.set(true);
      this.message.set('Title (5+), summary (10+) and article (20+ characters) are required.');
      return;
    }
    const v = this.form.getRawValue();
    const body: NewsInput = { ...v, sourceUrl: v.sourceUrl.trim() || null, status };
    const id = this.postId();
    this.busy.set(true);
    (id ? this.api.updateNews(id, body) : this.api.createNews(body)).subscribe({
      next: (post) => {
        this.busy.set(false);
        if (status === 'published') this.router.navigate(['/news', post.slug]);
        else {
          this.isError.set(false);
          this.message.set('Draft saved.');
          if (!id) this.router.navigate(['/admin/news', post.id], { replaceUrl: true });
        }
      },
      error: (e) => {
        this.busy.set(false);
        this.isError.set(true);
        this.message.set(apiErrorMessage(e));
      },
    });
  }

  protected remove(): void {
    const id = this.postId();
    if (!id || !confirm('Delete this post permanently?')) return;
    this.api.deleteNews(id).subscribe(() => this.router.navigate(['/admin/news']));
  }
}
