import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowRight, lucideExternalLink, lucideSearch, lucideX } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { queryNavigator } from '../content/components/shared';
import { RESEARCH_TOOLS, ResearchTool, TASKS, Task } from './research-tools.data';

/** Research tools directory. Filters (`?task=`, `?q=`) live in the URL. */
@Component({
  selector: 'app-research-tools',
  imports: [RouterLink, NgIcon, HlmBadgeImports, HlmButtonImports, HlmCardImports, HlmInputImports],
  providers: [provideIcons({ lucideExternalLink, lucideArrowRight, lucideSearch, lucideX })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      <header class="space-y-1">
        <p class="text-muted-foreground text-sm">Research</p>
        <h1 class="text-3xl font-semibold tracking-tight">Research tools</h1>
        <p class="text-muted-foreground max-w-3xl">
          Software and databases for measuring, counting, annotating, analysing and identifying fishes, plus the tools built into Indichthys.
        </p>
      </header>

      <div class="relative max-w-md">
        <ng-icon name="lucideSearch" class="text-muted-foreground absolute top-2.5 left-2.5" />
        <input hlmInput type="search" class="pl-8" placeholder="Search tools…" aria-label="Search tools" [value]="q() ?? ''" (input)="go({ q: $any($event.target).value }, false)" />
      </div>
      <nav class="flex flex-wrap gap-2" aria-label="Filter by task">
        <button hlmBtn size="sm" [variant]="!task() ? 'default' : 'outline'" (click)="go({ task: '' }, false)">All ({{ all.length }})</button>
        @for (t of tasks; track t[0]) {
          <button hlmBtn size="sm" [variant]="task() === t[0] ? 'default' : 'outline'" (click)="go({ task: t[0] }, false)">{{ t[1] }}</button>
        }
      </nav>

      @for (group of groups(); track group.title) {
        <section class="space-y-3">
          <h2 class="text-lg font-semibold">{{ group.title }}</h2>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            @for (tool of group.tools; track tool.name) {
              <article hlmCard size="sm">
                <div hlmCardHeader>
                  <h3 hlmCardTitle>{{ tool.name }}</h3>
                  <p hlmCardDescription>{{ tool.description }}</p>
                </div>
                <div hlmCardContent class="flex flex-wrap gap-1.5">
                  @for (t of tool.tasks; track t) {
                    <button type="button" hlmBadge variant="secondary" (click)="go({ task: t }, false)" [title]="'Show tools for ' + taskLabel(t)">{{ taskLabel(t) }}</button>
                  }
                </div>
                <div hlmCardFooter class="mt-auto items-center justify-between gap-2">
                  <span class="text-muted-foreground text-xs">{{ tool.access }}</span>
                  @if (tool.internal) {
                    <a hlmBtn size="sm" [routerLink]="tool.link">Open <ng-icon name="lucideArrowRight" /></a>
                  } @else {
                    <a hlmBtn size="sm" variant="outline" [href]="tool.link" target="_blank" rel="noopener" [attr.aria-label]="'Visit ' + tool.name + ' (opens in a new tab)'">
                      Visit <ng-icon name="lucideExternalLink" />
                    </a>
                  }
                </div>
              </article>
            }
          </div>
        </section>
      } @empty {
        <p class="text-muted-foreground">No tools match.
          <button hlmBtn variant="link" size="sm" (click)="go({ q: '', task: '' }, false)"><ng-icon name="lucideX" /> Clear filters</button></p>
      }

      <p class="text-muted-foreground text-xs">External tools are run by their own developers; Indichthys is not affiliated with them. Know a tool that belongs here? Tell an administrator.</p>
    </section>
  `,
})
export class ResearchTools {
  protected readonly go = queryNavigator(inject(Router));
  protected readonly all = RESEARCH_TOOLS;
  protected readonly tasks = Object.entries(TASKS) as [Task, string][];

  readonly task = input<string>();
  readonly q = input<string>();

  private readonly filtered = computed(() => {
    const task = this.task() as Task | undefined;
    const q = (this.q() ?? '').trim().toLowerCase();
    return RESEARCH_TOOLS.filter(
      (t) =>
        (!task || t.tasks.includes(task)) &&
        (!q || `${t.name} ${t.description} ${t.access}`.toLowerCase().includes(q)),
    );
  });

  /** Indichthys tools first, then everything else. */
  protected readonly groups = computed(() =>
    [
      { title: 'Built into Indichthys', tools: this.filtered().filter((t: ResearchTool) => t.internal) },
      { title: 'Software & databases', tools: this.filtered().filter((t: ResearchTool) => !t.internal) },
    ].filter((g) => g.tools.length),
  );

  protected taskLabel(t: Task): string {
    return TASKS[t];
  }
}
