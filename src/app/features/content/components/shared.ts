import { ChangeDetectionStrategy, Component, computed, inject, input, model, signal } from '@angular/core';
import { rxResource, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideClock, lucidePlus, lucideSearch, lucideX } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { debounceTime, of } from 'rxjs';
import { AuthService } from '../../../core/auth.service';
import { RegistryApi } from '../../registry/registry.api';
import { ModerationStatus, daysUntil, paragraphs } from '../content.api';

export const SELECT_CLASS =
  'border-input dark:bg-input/30 h-9 rounded-md border bg-transparent px-2.5 text-sm shadow-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50';

/** "Closes in 5 days" / "Closed" / "No deadline". */
@Component({
  selector: 'app-deadline',
  imports: [NgIcon, HlmBadgeImports],
  providers: [provideIcons({ lucideClock })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let d = days();
    @if (d === null) {
      @if (showNone()) { <span class="text-muted-foreground text-xs">No deadline</span> }
    } @else if (d < 0) {
      <span hlmBadge variant="outline">Closed</span>
    } @else if (d <= 14) {
      <span hlmBadge class="bg-amber-500 text-black"><ng-icon name="lucideClock" /> {{ d === 0 ? 'Closes today' : 'Closes in ' + d + ' day' + (d === 1 ? '' : 's') }}</span>
    } @else {
      <span class="text-muted-foreground text-xs">Deadline {{ date() }}</span>
    }
  `,
})
export class Deadline {
  readonly deadline = input<string | null>(null);
  readonly showNone = input(false);
  protected readonly days = computed(() => daysUntil(this.deadline()));
  protected readonly date = computed(() => (this.deadline() ? new Date(this.deadline()!).toLocaleDateString(undefined, { dateStyle: 'medium' }) : ''));
}

/** Shown on an item its submitter (or an admin) is viewing before it's published. */
@Component({
  selector: 'app-moderation-notice',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (status() !== 'published') {
      <p class="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
        @switch (status()) {
          @case ('pending') { Waiting for review by an administrator. Only you and administrators can see it. }
          @case ('rejected') { Not published{{ note() ? ': ' + note() : '.' }} }
          @default { Archived. }
        }
      </p>
    }
  `,
})
export class ModerationNotice {
  readonly status = input.required<ModerationStatus>();
  readonly note = input<string | null>(null);
}

/** "Submit an X" button that sends signed-out people to sign in first. */
@Component({
  selector: 'app-submit-button',
  imports: [RouterLink, NgIcon, HlmButtonImports],
  providers: [provideIcons({ lucidePlus })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (auth.signedIn()) {
      <a hlmBtn [routerLink]="link()" [queryParams]="params()"><ng-icon name="lucidePlus" /> {{ label() }}</a>
    } @else {
      <a hlmBtn variant="outline" routerLink="/account/login" [queryParams]="{ next: link() }"><ng-icon name="lucidePlus" /> {{ label() }}</a>
    }
  `,
})
export class SubmitButton {
  protected readonly auth = inject(AuthService);
  readonly link = input.required<string>();
  readonly label = input.required<string>();
  readonly params = input<Record<string, string>>({});
}

/** Plain text rendered as paragraphs. */
@Component({
  selector: 'app-paragraphs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block space-y-3' },
  template: `@for (p of list(); track $index) { <p class="whitespace-pre-line">{{ p }}</p> }`,
})
export class Paragraphs {
  readonly text = input<string | null | undefined>('');
  protected readonly list = computed(() => paragraphs(this.text()));
}

/** Pick an existing institution (links the item to the organisation directory) or leave it free-text. */
@Component({
  selector: 'app-institution-picker',
  imports: [NgIcon, HlmButtonImports, HlmInputImports],
  providers: [provideIcons({ lucideSearch, lucideX })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (value(); as v) {
      <div class="border-input flex h-9 items-center gap-2 rounded-md border px-2.5 text-sm">
        {{ v.name }}
        <button hlmBtn type="button" variant="ghost" size="icon-xs" class="ml-auto" aria-label="Unlink institution" (click)="value.set(null)"><ng-icon name="lucideX" /></button>
      </div>
    } @else {
      <div class="relative">
        <ng-icon name="lucideSearch" class="text-muted-foreground absolute top-2.5 left-2.5" />
        <input hlmInput class="pl-8" [placeholder]="placeholder()" autocomplete="off" [attr.aria-label]="placeholder()"
          [value]="query()" (input)="query.set($any($event.target).value)" />
      </div>
      @if (query().trim().length >= 2 && (results.value()?.length ?? 0) > 0) {
        <ul class="mt-1 rounded-md border">
          @for (r of results.value(); track r.id) {
            <li><button type="button" class="hover:bg-muted w-full px-3 py-1.5 text-left text-sm" (click)="pick(r)">{{ r.name }} <span class="text-muted-foreground text-xs">{{ r.city }}</span></button></li>
          }
        </ul>
      }
    }
  `,
})
export class InstitutionPicker {
  private readonly api = inject(RegistryApi);
  readonly value = model<{ id: number; name: string } | null>(null);
  readonly placeholder = input('Link to an institution in the directory (optional)');
  protected readonly query = signal('');
  private readonly debounced = toSignal(toObservable(this.query).pipe(debounceTime(250)), { initialValue: '' });
  protected readonly results = rxResource({
    params: () => this.debounced().trim(),
    stream: ({ params }) => (params.length < 2 ? of([]) : this.api.institutions(params)),
  });
  protected pick(r: { id: number; name: string }): void {
    this.value.set({ id: r.id, name: r.name });
    this.query.set('');
  }
}

/** Navigate to a list's query params (shared by the list pages). */
export function queryNavigator(router: Router) {
  return (params: Record<string, string | number | null>, resetPage = true) =>
    router.navigate([], {
      queryParams: { ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, v === '' ? null : v])), ...(resetPage ? { page: null } : {}) },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
}
