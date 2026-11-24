import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArchive, lucideMail, lucideMailOpen, lucideReply } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { apiErrorMessage } from '../../../core/api-error';
import { CONTACT_KIND_LABELS, ContactMessage, RegistryApi } from '../registry.api';

type Box = 'inbox' | 'archived';

@Component({
  selector: 'app-inbox',
  imports: [DatePipe, RouterLink, NgIcon, HlmBadgeImports, HlmButtonImports, HlmCardImports, HlmTabsImports],
  providers: [provideIcons({ lucideMail, lucideMailOpen, lucideArchive, lucideReply })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-6 space-y-1">
      <p class="text-muted-foreground text-sm">Account</p>
      <h1 class="text-2xl font-semibold tracking-tight">Inbox</h1>
      <p class="text-muted-foreground">Contact and collaboration requests sent through your public profile.</p>
    </header>

    <hlm-tabs [tab]="box()" (tabActivated)="box.set($any($event))" class="mb-4">
      <hlm-tabs-list aria-label="Mailbox">
        <button hlmTabsTrigger="inbox">Inbox @if (messages.value()?.unread) { ({{ messages.value()!.unread }} new) }</button>
        <button hlmTabsTrigger="archived">Archived</button>
      </hlm-tabs-list>
    </hlm-tabs>

    @if (messages.error()) {
      <p class="text-destructive">{{ error(messages.error()) }}</p>
    } @else if (messages.hasValue()) {
      <div class="space-y-3">
        @for (m of messages.value().items; track m.id) {
          <article hlmCard size="sm" [class.ring-primary/40]="m.status === 'new'">
            <div hlmCardHeader>
              <h2 hlmCardTitle class="flex items-center gap-2">
                <ng-icon [name]="m.status === 'new' ? 'lucideMail' : 'lucideMailOpen'" />
                {{ m.subject }}
                @if (m.status === 'new') { <span hlmBadge>new</span> }
              </h2>
              <p hlmCardDescription>
                {{ kindLabels[m.kind] }} · from {{ m.senderName }} &lt;{{ m.senderEmail }}&gt; · {{ m.createdAt | date: 'medium' }}
              </p>
            </div>
            <div hlmCardContent><p class="text-sm whitespace-pre-line">{{ m.message }}</p></div>
            <div hlmCardFooter class="gap-2">
              <a hlmBtn size="sm" [href]="replyLink(m)" (click)="mark(m, 'read')"><ng-icon name="lucideReply" /> Reply by email</a>
              @if (m.status === 'new') {
                <button hlmBtn size="sm" variant="outline" (click)="mark(m, 'read')">Mark as read</button>
              }
              @if (m.status !== 'archived') {
                <button hlmBtn size="sm" variant="ghost" (click)="mark(m, 'archived')"><ng-icon name="lucideArchive" /> Archive</button>
              } @else {
                <button hlmBtn size="sm" variant="ghost" (click)="mark(m, 'read')">Move to inbox</button>
              }
            </div>
          </article>
        } @empty {
          <p class="text-muted-foreground">
            No messages. @if (box() === 'inbox') { Make sure your <a routerLink="/account/profile" class="text-primary hover:underline">profile</a> is public so people can find you. }
          </p>
        }
      </div>
      @if (actionError()) { <p class="text-destructive mt-3 text-sm">{{ actionError() }}</p> }
    } @else {
      <p class="text-muted-foreground">Loading…</p>
    }
  `,
})
export class Inbox {
  private readonly api = inject(RegistryApi);
  protected readonly error = apiErrorMessage;
  protected readonly kindLabels = CONTACT_KIND_LABELS;
  protected readonly box = signal<Box>('inbox');
  protected readonly actionError = signal<string | null>(null);

  protected readonly messages = rxResource({
    params: () => this.box(),
    stream: ({ params }) => this.api.inbox(params === 'archived' ? 'archived' : undefined),
  });

  protected replyLink(m: ContactMessage): string {
    return `mailto:${encodeURIComponent(m.senderEmail)}?subject=${encodeURIComponent('Re: ' + m.subject)}`;
  }

  protected mark(m: ContactMessage, status: 'read' | 'archived'): void {
    if (m.status === status) return;
    this.api.setMessageStatus(m.id, status).subscribe({
      next: () => this.messages.reload(),
      error: (e) => this.actionError.set(apiErrorMessage(e)),
    });
  }
}
