import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArchive, lucideCheck, lucideExternalLink, lucideX } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { apiErrorMessage } from '../../../core/api-error';
import { ContentApi, EVENT_KINDS, MySubmissions, PROJECT_KINDS, opportunityTypeLabel } from '../content.api';

interface QueueItem {
  type: 'event' | 'opportunity' | 'project';
  id: number;
  slug: string;
  title: string;
  kindLabel: string;
  summary: string;
  link: string[];
  submittedBy: { displayName: string; email: string } | null;
  createdAt: string;
  moderationNote: string | null;
}

@Component({
  selector: 'app-moderation',
  imports: [DatePipe, RouterLink, NgIcon, HlmBadgeImports, HlmButtonImports, HlmCardImports, HlmInputImports, HlmTabsImports],
  providers: [provideIcons({ lucideCheck, lucideX, lucideArchive, lucideExternalLink })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-6 space-y-1">
      <p class="text-muted-foreground text-sm">Administration</p>
      <h1 class="text-2xl font-semibold tracking-tight">Moderation</h1>
      <p class="text-muted-foreground max-w-2xl">Events, opportunities and conservation projects submitted by members. Check links and details before publishing.</p>
    </header>
    <hlm-tabs [tab]="status()" (tabActivated)="status.set($any($event))" class="mb-4">
      <hlm-tabs-list aria-label="Status">
        <button hlmTabsTrigger="pending">Pending</button>
        <button hlmTabsTrigger="rejected">Rejected</button>
        <button hlmTabsTrigger="archived">Archived</button>
      </hlm-tabs-list>
    </hlm-tabs>
    @if (queue.error()) {
      <p class="text-destructive">{{ error(queue.error()) }}</p>
    } @else if (queue.hasValue()) {
      <div class="space-y-3">
        @for (i of items(); track i.type + i.id) {
          <article hlmCard size="sm">
            <div hlmCardHeader>
              <p class="flex flex-wrap items-center gap-2 text-xs"><span hlmBadge variant="secondary">{{ i.kindLabel }}</span>
                <span class="text-muted-foreground">by {{ i.submittedBy?.displayName ?? 'unknown' }} ({{ i.submittedBy?.email }}) · {{ i.createdAt | date: 'medium' }}</span></p>
              <h2 hlmCardTitle>{{ i.title }}</h2>
              <p hlmCardDescription class="line-clamp-3">{{ i.summary }}</p>
              @if (i.moderationNote) { <p class="text-muted-foreground text-xs">Note: {{ i.moderationNote }}</p> }
              <div hlmCardAction><a hlmBtn variant="link" size="sm" [routerLink]="i.link" target="_blank">Preview <ng-icon name="lucideExternalLink" /></a></div>
            </div>
            <div hlmCardFooter class="flex-wrap gap-2">
              <input hlmInput class="min-w-48 flex-1" placeholder="Note to the submitter (optional)" [attr.aria-label]="'Note for ' + i.title" #note />
              <button hlmBtn size="sm" [disabled]="busy()" (click)="decide(i, 'publish', note.value)"><ng-icon name="lucideCheck" /> Publish</button>
              @if (status() === 'pending') {
                <button hlmBtn size="sm" variant="outline" [disabled]="busy()" (click)="decide(i, 'reject', note.value)"><ng-icon name="lucideX" /> Reject</button>
              }
              @if (status() !== 'archived') {
                <button hlmBtn size="sm" variant="ghost" [disabled]="busy()" (click)="decide(i, 'archive', note.value)"><ng-icon name="lucideArchive" /> Archive</button>
              }
            </div>
          </article>
        } @empty {
          <p class="text-muted-foreground">Nothing here.</p>
        }
      </div>
      @if (actionError()) { <p class="text-destructive mt-3 text-sm">{{ actionError() }}</p> }
    } @else {
      <p class="text-muted-foreground">Loading…</p>
    }
  `,
})
export class Moderation {
  private readonly api = inject(ContentApi);
  protected readonly error = apiErrorMessage;
  protected readonly status = signal<'pending' | 'rejected' | 'archived'>('pending');
  protected readonly busy = signal(false);
  protected readonly actionError = signal<string | null>(null);
  protected readonly queue = rxResource({ params: () => this.status(), stream: ({ params }) => this.api.moderation(params) });

  protected readonly items = computed<QueueItem[]>(() => {
    const q = this.queue.value();
    if (!q) return [];
    return [
      ...q.events.map((e) => ({ type: 'event' as const, id: e.id, slug: e.slug, title: e.title, kindLabel: `Event · ${EVENT_KINDS[e.kind]}`, summary: e.description ?? '', link: ['/events', e.slug], submittedBy: e.submittedBy, createdAt: e.createdAt, moderationNote: e.moderationNote })),
      ...q.opportunities.map((o) => ({ type: 'opportunity' as const, id: o.id, slug: o.slug, title: o.title, kindLabel: opportunityTypeLabel(o.section, o.type), summary: `${o.organisation}. ${o.description ?? ''}`, link: ['/opportunities', o.slug], submittedBy: o.submittedBy, createdAt: o.createdAt, moderationNote: o.moderationNote })),
      ...q.projects.map((p) => ({ type: 'project' as const, id: p.id, slug: p.slug, title: p.title, kindLabel: PROJECT_KINDS[p.kind], summary: p.summary, link: ['/conservation', p.slug], submittedBy: p.submittedBy, createdAt: p.createdAt, moderationNote: p.moderationNote })),
    ].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  });

  protected decide(i: QueueItem, decision: 'publish' | 'reject' | 'archive', note: string): void {
    this.busy.set(true);
    this.actionError.set(null);
    this.api.moderate(i.type, i.id, decision, note.trim() || undefined).subscribe({
      next: () => {
        this.busy.set(false);
        this.queue.reload();
      },
      error: (e) => {
        this.busy.set(false);
        this.actionError.set(apiErrorMessage(e));
      },
    });
  }
}

@Component({
  selector: 'app-my-submissions',
  imports: [DatePipe, RouterLink, HlmBadgeImports, HlmCardImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-6 space-y-1">
      <p class="text-muted-foreground text-sm">Account</p>
      <h1 class="text-2xl font-semibold tracking-tight">My submissions</h1>
      <p class="text-muted-foreground">Events, opportunities and projects you've posted, and their review status.</p>
    </header>
    @if (subs.error()) {
      <p class="text-destructive">{{ error(subs.error()) }}</p>
    } @else if (subs.hasValue()) {
      <div class="space-y-2">
        @for (r of rows(); track r.link.join('/')) {
          <div hlmCard size="sm">
            <div hlmCardHeader>
              <h2 hlmCardTitle><a [routerLink]="r.link" class="hover:underline">{{ r.title }}</a></h2>
              <p hlmCardDescription>{{ r.kind }} · {{ r.createdAt | date: 'mediumDate' }}{{ r.note ? ' · ' + r.note : '' }}</p>
              <div hlmCardAction><span hlmBadge [variant]="r.status === 'published' ? 'default' : r.status === 'rejected' ? 'destructive' : 'outline'">{{ r.status }}</span></div>
            </div>
          </div>
        } @empty {
          <p class="text-muted-foreground">You haven't submitted anything yet.</p>
        }
      </div>
    }
  `,
})
export class MySubmissionsPage {
  private readonly api = inject(ContentApi);
  protected readonly error = apiErrorMessage;
  protected readonly subs = rxResource({ stream: () => this.api.mySubmissions() });
  protected readonly rows = computed(() => {
    const s: MySubmissions | undefined = this.subs.value();
    if (!s) return [];
    return [
      ...s.events.map((e) => ({ ...e, kind: 'Event', note: e.moderationNote, link: ['/events', e.slug] })),
      ...s.opportunities.map((o) => ({ ...o, kind: o.section === 'funding' ? 'Funding' : 'Job', note: o.moderationNote, link: ['/opportunities', o.slug] })),
      ...s.projects.map((p) => ({ ...p, kind: 'Conservation project', note: p.moderationNote, link: ['/conservation', p.slug] })),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });
}
