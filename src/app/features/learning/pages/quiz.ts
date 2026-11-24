import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideAward, lucideCheck, lucideLoaderCircle, lucideRotateCcw, lucideX } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { apiErrorMessage } from '../../../core/api-error';
import { AuthService } from '../../../core/auth.service';
import { LearningApi, QuizResult } from '../learning.api';

@Component({
  selector: 'app-quiz',
  imports: [RouterLink, NgIcon, HlmButtonImports, HlmCardImports],
  providers: [provideIcons({ lucideArrowLeft, lucideCheck, lucideX, lucideAward, lucideRotateCcw, lucideLoaderCircle })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a hlmBtn variant="ghost" size="sm" [routerLink]="['/learning', slug()]" class="mb-4 -ml-2"><ng-icon name="lucideArrowLeft" /> Course overview</a>
    @if (quiz.error()) {
      <p class="text-destructive">{{ error(quiz.error()) }}</p>
    } @else if (quiz.hasValue()) {
      @let q = quiz.value();
      <section class="mx-auto max-w-2xl space-y-6">
        <header class="space-y-1">
          <p class="text-muted-foreground text-sm">Assessment</p>
          <h1 class="text-2xl font-semibold tracking-tight">{{ q.title }}</h1>
          <p class="text-muted-foreground">{{ q.questions.length }} questions · score {{ pct(q.passMark) }} or more for a certificate. You can retake it.</p>
        </header>

        @if (result(); as r) {
          <div hlmCard [class.ring-emerald-500]="r.passed">
            <div hlmCardHeader>
              <h2 hlmCardTitle class="flex items-center gap-2 text-xl">
                @if (r.passed) { <ng-icon name="lucideAward" class="text-emerald-600" /> Passed: {{ pct(r.score) }} }
                @else { Score {{ pct(r.score) }}: not yet }
              </h2>
              <p hlmCardDescription>{{ r.passed ? 'Well done. Your certificate is ready.' : 'Review the lessons and try again; the explanations below show what to revisit.' }}</p>
            </div>
            <div hlmCardFooter class="gap-2">
              @if (r.certificate) { <a hlmBtn [routerLink]="['/learning/certificates', r.certificate.code]"><ng-icon name="lucideAward" /> View certificate</a> }
              <button hlmBtn variant="outline" (click)="retake()"><ng-icon name="lucideRotateCcw" /> Retake</button>
            </div>
          </div>
        }

        <ol class="space-y-5">
          @for (question of q.questions; track question.id; let i = $index) {
            <li hlmCard size="sm">
              <div hlmCardHeader><h2 hlmCardTitle class="font-medium">{{ i + 1 }}. {{ question.prompt }}</h2></div>
              <div hlmCardContent>
                <fieldset class="space-y-2" [disabled]="!!result()">
                  <legend class="sr-only">{{ question.prompt }}</legend>
                  @for (o of shuffled()[question.id] ?? question.options; track o.id) {
                    <label class="hover:bg-muted flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm"
                      [class.border-emerald-500]="outcome(question.id)?.correctOptionId === o.id"
                      [class.border-destructive]="!!result() && answers()[question.id] === o.id && outcome(question.id)?.correctOptionId !== o.id">
                      <input type="radio" class="accent-primary mt-0.5" [name]="'q' + question.id" [checked]="answers()[question.id] === o.id" (change)="choose(question.id, o.id)" />
                      <span class="flex-1">{{ o.label }}</span>
                      @if (outcome(question.id)?.correctOptionId === o.id) { <ng-icon name="lucideCheck" class="text-emerald-600" /> }
                    </label>
                  }
                </fieldset>
                @if (outcome(question.id); as res) {
                  <p class="mt-2 text-sm" [class.text-emerald-700]="res.correct" [class.text-destructive]="!res.correct">
                    {{ res.correct ? 'Correct.' : 'Not quite.' }} <span class="text-muted-foreground">{{ res.explanation }}</span>
                  </p>
                }
              </div>
            </li>
          }
        </ol>

        @if (!result()) {
          @if (auth.signedIn()) {
            <div class="flex items-center justify-end gap-3">
              <span class="text-muted-foreground text-sm">{{ answeredCount() }}/{{ q.questions.length }} answered</span>
              <button hlmBtn [disabled]="answeredCount() < q.questions.length || busy()" (click)="submit()">
                @if (busy()) { <ng-icon name="lucideLoaderCircle" class="animate-spin" /> } Submit answers
              </button>
            </div>
          } @else {
            <p class="text-right text-sm"><a hlmBtn routerLink="/account/login" [queryParams]="{ next: '/learning/' + slug() + '/quiz' }">Sign in to submit and get a certificate</a></p>
          }
        }
        @if (submitError()) { <p class="text-destructive text-sm">{{ submitError() }}</p> }
      </section>
    } @else {
      <p class="text-muted-foreground">Loading…</p>
    }
  `,
})
export class QuizPage {
  private readonly api = inject(LearningApi);
  protected readonly auth = inject(AuthService);
  protected readonly error = apiErrorMessage;
  readonly slug = input.required<string>();
  protected readonly quiz = rxResource({ params: () => this.slug(), stream: ({ params }) => this.api.quiz(params) });

  protected readonly answers = signal<Record<number, number>>({});
  protected readonly result = signal<QuizResult | null>(null);
  protected readonly busy = signal(false);
  protected readonly submitError = signal<string | null>(null);
  private readonly seed = signal(Math.random());

  /** Options are shown in a random order (the correct one is listed first in the data). */
  protected readonly shuffled = computed(() => {
    this.seed();
    const out: Record<number, { id: number; label: string }[]> = {};
    for (const q of this.quiz.value()?.questions ?? []) {
      const opts = [...q.options];
      for (let i = opts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [opts[i], opts[j]] = [opts[j]!, opts[i]!];
      }
      out[q.id] = opts;
    }
    return out;
  });
  protected readonly answeredCount = computed(() => Object.keys(this.answers()).length);

  protected choose(questionId: number, optionId: number): void {
    this.answers.update((a) => ({ ...a, [questionId]: optionId }));
  }
  protected outcome(questionId: number) {
    return this.result()?.results.find((r) => r.questionId === questionId) ?? null;
  }
  protected submit(): void {
    this.busy.set(true);
    this.submitError.set(null);
    this.api.submitQuiz(this.slug(), this.answers()).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.result.set(r);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (e) => {
        this.busy.set(false);
        this.submitError.set(apiErrorMessage(e));
      },
    });
  }
  protected retake(): void {
    this.answers.set({});
    this.result.set(null);
    this.seed.set(Math.random());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  protected pct(x: number): string {
    return `${Math.round(x * 100)}%`;
  }
}
