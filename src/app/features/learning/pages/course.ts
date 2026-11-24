import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideArrowRight, lucideAward, lucideCircle, lucideCircleCheck, lucideClipboardCheck, lucideExternalLink } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { apiErrorMessage } from '../../../core/api-error';
import { AuthService } from '../../../core/auth.service';
import { FORMATS, LEVELS, LearningApi, SUBJECTS } from '../learning.api';

@Component({
  selector: 'app-course',
  imports: [RouterLink, NgIcon, HlmBadgeImports, HlmButtonImports, HlmCardImports],
  providers: [provideIcons({ lucideArrowLeft, lucideArrowRight, lucideCircle, lucideCircleCheck, lucideClipboardCheck, lucideAward, lucideExternalLink })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a hlmBtn variant="ghost" size="sm" routerLink="/learning" class="mb-4 -ml-2"><ng-icon name="lucideArrowLeft" /> Courses</a>
    @if (course.error()) {
      <p class="text-destructive">{{ error(course.error()) }}</p>
    } @else if (course.hasValue()) {
      @let c = course.value();
      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section class="space-y-6">
          <header class="space-y-2">
            <p class="flex flex-wrap gap-2 text-xs">
              <span hlmBadge variant="outline">{{ subjects[c.subject] }}</span>
              <span hlmBadge variant="outline">{{ levels[c.level] }}</span>
              <span hlmBadge variant="outline">{{ formats[c.format] }}</span>
            </p>
            <h1 class="text-3xl font-semibold tracking-tight">{{ c.title }}</h1>
            <p class="text-muted-foreground text-lg">{{ c.summary }}</p>
            @if (c.description) { <p>{{ c.description }}</p> }
          </header>

          @if (c.kind === 'indichthys') {
            <div hlmCard>
              <div hlmCardHeader>
                <h2 hlmCardTitle>Lessons</h2>
                <p hlmCardDescription>{{ doneCount() }} of {{ c.lessons.length }} completed</p>
              </div>
              <div hlmCardContent>
                <ol class="divide-border divide-y">
                  @for (l of c.lessons; track l.position) {
                    <li>
                      <a [routerLink]="['/learning', c.slug, 'lessons', l.position]" class="hover:bg-muted flex items-center gap-3 rounded-md px-2 py-3">
                        <ng-icon [name]="l.done ? 'lucideCircleCheck' : 'lucideCircle'" [class.text-emerald-600]="l.done" class="shrink-0" />
                        <span class="text-muted-foreground w-6 tabular-nums">{{ l.position }}.</span>
                        <span class="flex-1">{{ l.title }}</span>
                        <ng-icon name="lucideArrowRight" class="text-muted-foreground" />
                      </a>
                    </li>
                  }
                </ol>
              </div>
              <div hlmCardFooter class="flex-wrap gap-2">
                <a hlmBtn [routerLink]="['/learning', c.slug, 'lessons', nextLesson()]">{{ doneCount() ? 'Continue' : 'Start the course' }}</a>
                @if (c.questionCount) {
                  <a hlmBtn variant="outline" [routerLink]="['/learning', c.slug, 'quiz']"><ng-icon name="lucideClipboardCheck" /> Take the assessment</a>
                }
              </div>
            </div>
          }
        </section>

        <aside class="space-y-4">
          <div hlmCard size="sm">
            <div hlmCardContent>
              <dl class="grid grid-cols-[6rem_1fr] gap-y-2 text-sm">
                <dt class="text-muted-foreground">Provider</dt><dd>{{ c.provider }}</dd>
                @if (c.duration) { <dt class="text-muted-foreground">Duration</dt><dd>{{ c.duration }}</dd> }
                <dt class="text-muted-foreground">Cost</dt><dd>{{ c.cost ?? 'See provider' }}</dd>
                @if (c.kind === 'indichthys' && c.questionCount) {
                  <dt class="text-muted-foreground">Certificate</dt><dd>Score {{ pct(c.passMark) }} or more in the {{ c.questionCount }}-question assessment</dd>
                }
              </dl>
            </div>
            @if (c.url) {
              <div hlmCardFooter><a hlmBtn class="w-full" [href]="c.url" target="_blank" rel="noopener">Course website <ng-icon name="lucideExternalLink" /></a></div>
            }
          </div>
          @if (c.certificate) {
            <a hlmCard size="sm" [routerLink]="['/learning/certificates', c.certificate.code]" class="ring-emerald-500/50">
              <div hlmCardHeader>
                <h2 hlmCardTitle class="flex items-center gap-2"><ng-icon name="lucideAward" class="text-emerald-600" /> Certificate earned</h2>
                <p hlmCardDescription>Best score {{ pct(c.certificate.score) }} · {{ c.certificate.code }}</p>
              </div>
            </a>
          } @else if (c.kind === 'indichthys' && !auth.signedIn()) {
            <p class="text-muted-foreground text-sm"><a routerLink="/account/login" [queryParams]="{ next: '/learning/' + c.slug }" class="text-primary hover:underline">Sign in</a> to track progress and earn a certificate. Lessons are open to everyone.</p>
          }
        </aside>
      </div>
    } @else {
      <p class="text-muted-foreground">Loading…</p>
    }
  `,
})
export class CoursePage {
  private readonly api = inject(LearningApi);
  protected readonly auth = inject(AuthService);
  protected readonly error = apiErrorMessage;
  protected readonly subjects = SUBJECTS;
  protected readonly levels = LEVELS;
  protected readonly formats = FORMATS;
  readonly slug = input.required<string>();
  protected readonly course = rxResource({ params: () => this.slug(), stream: ({ params }) => this.api.course(params) });
  protected readonly doneCount = computed(() => this.course.value()?.lessons.filter((l) => l.done).length ?? 0);
  protected readonly nextLesson = computed(() => this.course.value()?.lessons.find((l) => !l.done)?.position ?? 1);
  protected pct(x: number): string {
    return `${Math.round(x * 100)}%`;
  }
}
