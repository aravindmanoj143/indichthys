import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBadgeCheck, lucideClock } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { VerificationStatus } from '../registry.api';

/** "Verified expert" badge; pending/rejected are only shown when `showAll` (owner/admin views). */
@Component({
  selector: 'app-verified-badge',
  imports: [NgIcon, HlmBadgeImports],
  providers: [provideIcons({ lucideBadgeCheck, lucideClock })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (status()) {
      @case ('verified') {
        <span hlmBadge class="bg-emerald-600 text-white" title="Verified by Indichthys administrators">
          <ng-icon name="lucideBadgeCheck" /> Verified expert
        </span>
      }
      @case ('pending') {
        @if (showAll()) { <span hlmBadge variant="secondary"><ng-icon name="lucideClock" /> Verification pending</span> }
      }
      @case ('rejected') {
        @if (showAll()) { <span hlmBadge variant="destructive">Verification declined</span> }
      }
    }
  `,
})
export class VerifiedBadge {
  readonly status = input.required<VerificationStatus | string>();
  readonly showAll = input(false);
}
