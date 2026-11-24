import { ChangeDetectionStrategy, Component, computed, inject, input, numberAttribute, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideArrowRight, lucideCircleCheck, lucideClipboardCheck } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { apiErrorMessage } from '../../../core/api-error';
import { AuthService } from '../../../core/auth.service';
import { LearningApi, lessonBlocks } from '../learning.api';

@Component({
  selector: 'app-lesson',
  imports: [RouterLink, NgIcon, HlmButtonImports],
  providers: [provideIcons({ lucideArrowLeft, lucideArrowRight, lucideCircleCheck, lucideClipboardCheck })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a hlmBtn variant="ghost" size="sm" [routerLink]="['/learning', slug()]" class="mb-4 -ml-2"><ng-icon name="lucideArrowLeft" /> Course overview</a>
    @if (lesson.error()) {
      <p class="text-destructive">{{ error(lesson.error()) }}</p>
    } @else if (lesson.hasValue()) {
      @let l = lesson.value();
      <article class="mx-auto max-w-2xl space-y-6">
        <header class="space-y-1">
          <p class="text-muted-foreground text-sm">{{ l.courseTitle }} · Lesson {{ l.position }} of {{ l.total }}</p>
          <div class="bg-muted h-1.5 overflow-hidden rounded-full" role="progressbar" [attr.aria-valuenow]="l.position" aria-valuemin="1" [attr.aria-valuemax]="l.total">
            <div class="bg-primary h-full" [style.width.%]="(l.position / l.total) * 100"></div>
          </div>
          <h1 class="pt-3 text-2xl font-semibold tracking-tight">{{ l.title }}</h1>
        </header>
        <div class="space-y-4 text-base leading-relaxed">
          @for (b of blocks(); track $index) {
            @if (b.type === 'p') { <p>{{ b.text }}</p> }
            @else { <ul class="list-disc space-y-1.5 pl-6">@for (item of b.items; track $index) { <li>{{ item }}</li> }</ul> }
          }
        </div>
        <footer class="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          @if (l.position > 1) {
            <a hlmBtn variant="ghost" [routerLink]="['/learning', slug(), 'lessons', l.position - 1]"><ng-icon name="lucideArrowLeft" /> Previous</a>
          } @else { <span></span> }
          <button hlmBtn (click)="next(l.position, l.total)" [disabled]="busy()">
            @if (l.position < l.total) { Mark complete &amp; continue <ng-icon name="lucideArrowRight" /> }
            @else { Mark complete &amp; take the assessment <ng-icon name="lucideClipboardCheck" /> }
          </button>
        </footer>
        @if (!auth.signedIn()) { <p class="text-muted-foreground text-xs">Sign in to save your progress.</p> }
      </article>
    } @else {
      <p class="text-muted-foreground">Loading…</p>
    }
  `,
})
export class LessonPageComponent {
  private readonly api = inject(LearningApi);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly error = apiErrorMessage;
  readonly slug = input.required<string>();
  readonly position = input.required({ transform: numberAttribute });
  protected readonly lesson = rxResource({
    params: () => ({ slug: this.slug(), position: this.position() }),
    stream: ({ params }) => this.api.lesson(params.slug, params.position),
  });
  protected readonly blocks = computed(() => lessonBlocks(this.lesson.value()?.body ?? ''));
  protected readonly busy = signal(false);

  protected next(position: number, total: number): void {
    const go = () =>
      this.router.navigate(position < total ? ['/learning', this.slug(), 'lessons', position + 1] : ['/learning', this.slug(), 'quiz']);
    if (!this.auth.signedIn()) return void go();
    this.busy.set(true);
    this.api.completeLesson(this.slug(), position).subscribe({
      next: () => {
        this.busy.set(false);
        go();
      },
      error: () => {
        this.busy.set(false);
        go();
      },
    });
  }
}
