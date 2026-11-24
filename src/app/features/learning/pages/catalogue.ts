import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideAward, lucideClock, lucideExternalLink, lucideGraduationCap, lucideSearch, lucideX } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { apiErrorMessage } from '../../../core/api-error';
import { AuthService } from '../../../core/auth.service';
import { queryNavigator } from '../../content/components/shared';
import { CourseSummary, FORMATS, LEVELS, LearningApi, SUBJECTS } from '../learning.api';

@Component({
  selector: 'app-learning-catalogue',
  imports: [DatePipe, RouterLink, NgIcon, HlmBadgeImports, HlmButtonImports, HlmCardImports, HlmInputImports],
  providers: [provideIcons({ lucideSearch, lucideX, lucideClock, lucideAward, lucideExternalLink, lucideGraduationCap })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      <header class="flex flex-wrap items-end justify-between gap-4">
        <div class="space-y-1">
          <p class="text-muted-foreground text-sm">Learning</p>
          <h1 class="text-3xl font-semibold tracking-tight">Courses</h1>
          <p class="text-muted-foreground max-w-3xl">
            Free Indichthys courses with lessons, a short assessment and a certificate, plus courses run by other institutions.
          </p>
        </div>
        <a hlmBtn variant="outline" routerLink="/workshops"><ng-icon name="lucideGraduationCap" /> Workshops &amp; field training</a>
      </header>

      @if (mine.value()?.length) {
        <div hlmCard size="sm">
          <div hlmCardHeader><h2 hlmCardTitle class="flex items-center gap-2"><ng-icon name="lucideAward" /> My certificates</h2></div>
          <div hlmCardContent class="flex flex-wrap gap-2">
            @for (c of mine.value(); track c.code) {
              <a hlmBtn size="sm" variant="outline" [routerLink]="['/learning/certificates', c.code]">{{ c.course.title }} · {{ c.issuedAt | date: 'mediumDate' }}</a>
            }
          </div>
        </div>
      }

      <div class="flex flex-wrap items-center gap-3">
        <div class="relative min-w-64 flex-1">
          <ng-icon name="lucideSearch" class="text-muted-foreground absolute top-2.5 left-2.5" />
          <input hlmInput type="search" class="pl-8" placeholder="Search courses…" aria-label="Search courses" [value]="q() ?? ''" (change)="go({ q: $any($event.target).value }, false)" />
        </div>
        <div class="flex gap-2">
          <button hlmBtn size="sm" [variant]="!kind() ? 'default' : 'outline'" (click)="go({ kind: '' }, false)">All</button>
          <button hlmBtn size="sm" [variant]="kind() === 'indichthys' ? 'default' : 'outline'" (click)="go({ kind: 'indichthys' }, false)">Indichthys courses</button>
          <button hlmBtn size="sm" [variant]="kind() === 'external' ? 'default' : 'outline'" (click)="go({ kind: 'external' }, false)">Other providers</button>
        </div>
      </div>
      <nav class="flex flex-wrap gap-2" aria-label="Subjects">
        <button hlmBtn size="sm" [variant]="!subject() ? 'default' : 'outline'" (click)="go({ subject: '' }, false)">All subjects</button>
        @for (s of subjects; track s[0]) {
          <button hlmBtn size="sm" [variant]="subject() === s[0] ? 'default' : 'outline'" (click)="go({ subject: s[0] }, false)">{{ s[1] }}</button>
        }
      </nav>

      @if (list.error()) {
        <p class="text-destructive">{{ error(list.error()) }}</p>
      } @else if (list.hasValue()) {
        <div class="grid gap-4 md:grid-cols-2" [class.opacity-60]="list.isLoading()">
          @for (c of list.value(); track c.id) {
            <article hlmCard size="sm">
              <div hlmCardHeader>
                <p class="flex flex-wrap items-center gap-2 text-xs">
                  <span hlmBadge [variant]="c.kind === 'indichthys' ? 'default' : 'secondary'">{{ c.kind === 'indichthys' ? 'Indichthys course' : c.provider }}</span>
                  <span hlmBadge variant="outline">{{ subjectLabel(c) }}</span>
                  <span class="text-muted-foreground">{{ levels[c.level] }} · {{ formats[c.format] }}</span>
                </p>
                <h2 hlmCardTitle><a [routerLink]="['/learning', c.slug]" class="hover:underline">{{ c.title }}</a></h2>
                <p hlmCardDescription>{{ c.summary }}</p>
              </div>
              <div hlmCardFooter class="mt-auto flex-wrap items-center justify-between gap-2 text-xs">
                <span class="text-muted-foreground inline-flex items-center gap-1">
                  @if (c.duration) { <ng-icon name="lucideClock" size="13" /> {{ c.duration }} }
                  @if (c.cost) { · {{ c.cost }} }
                </span>
                @if (c.kind === 'indichthys') {
                  @if (c.certificate) {
                    <span hlmBadge class="bg-emerald-600 text-white"><ng-icon name="lucideAward" /> Certified</span>
                  } @else if (c.lessonsDone) {
                    <span class="text-muted-foreground">{{ c.lessonsDone }}/{{ c.lessonCount }} lessons done</span>
                  } @else {
                    <span class="text-muted-foreground">{{ c.lessonCount }} lessons · quiz</span>
                  }
                } @else {
                  <span class="text-muted-foreground inline-flex items-center gap-1">External <ng-icon name="lucideExternalLink" size="12" /></span>
                }
              </div>
            </article>
          } @empty {
            <p class="text-muted-foreground md:col-span-2">No courses match.
              <button hlmBtn variant="link" size="sm" (click)="clear()"><ng-icon name="lucideX" /> Clear filters</button></p>
          }
        </div>
      } @else {
        <p class="text-muted-foreground">Loading…</p>
      }
    </section>
  `,
})
export class LearningCatalogue {
  private readonly api = inject(LearningApi);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly error = apiErrorMessage;
  protected readonly go = queryNavigator(this.router);
  protected readonly subjects = Object.entries(SUBJECTS);
  protected readonly levels = LEVELS;
  protected readonly formats = FORMATS;

  readonly q = input<string>();
  readonly kind = input<string>();
  readonly subject = input<string>();

  protected readonly list = rxResource({
    params: () => ({ q: this.q(), kind: this.kind(), subject: this.subject() }),
    stream: ({ params }) => this.api.courses(params),
  });
  protected readonly mine = rxResource({
    params: () => (this.auth.signedIn() ? true : undefined),
    stream: () => this.api.myCertificates(),
  });

  protected subjectLabel(c: CourseSummary): string {
    return SUBJECTS[c.subject] ?? c.subject;
  }
  protected clear(): void {
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }
}
