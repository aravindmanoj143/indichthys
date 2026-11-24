import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { MAIN_NAV } from '../core/navigation';

@Component({
  selector: 'app-coming-soon',
  imports: [RouterLink, HlmButtonImports, HlmCardImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div hlmCard class="mx-auto max-w-lg">
      <div hlmCardHeader>
        <h2 hlmCardTitle>{{ item()?.label ?? 'Section' }}: coming soon</h2>
        <p hlmCardDescription>{{ moduleNames() }}</p>
      </div>
      <div hlmCardFooter>
        <a hlmBtn routerLink="/taxonomy">Go to Taxonomy</a>
      </div>
    </div>
  `,
})
export class ComingSoon {
  /** Bound from the `:section` route param. */
  readonly section = input<string>('');
  protected readonly item = computed(() =>
    MAIN_NAV.find((n) => n.label.toLowerCase() === this.section().toLowerCase()),
  );
  protected readonly moduleNames = computed(() => this.item()?.modules.map((m) => m.label).join(' · '));
}
