import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { GbifThreatStatus, IUCN } from '../gbif/gbif.models';

const IUCN_CLASSES: Record<string, string> = {
  EX: 'bg-black text-white',
  EW: 'bg-neutral-700 text-white',
  CR: 'bg-red-600 text-white',
  EN: 'bg-orange-500 text-white',
  VU: 'bg-amber-400 text-black',
  NT: 'bg-lime-300 text-black',
  LC: 'bg-emerald-600 text-white',
  DD: 'bg-slate-400 text-white',
  NE: 'bg-slate-200 text-slate-700',
};

/** IUCN Red List badge from a GBIF threat status (e.g. "ENDANGERED"). */
@Component({
  selector: 'app-iucn-badge',
  imports: [HlmBadgeImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (info(); as i) {
      <span hlmBadge [class]="cls()" [attr.title]="'IUCN: ' + i.label">
        {{ i.code }}
        @if (showLabel()) {
          <span class="font-normal">· {{ i.label }}</span>
        }
      </span>
    } @else {
      <span class="text-muted-foreground text-xs">—</span>
    }
  `,
})
export class IucnBadge {
  readonly status = input<GbifThreatStatus | null | undefined>(null);
  readonly showLabel = input(false);
  protected readonly info = computed(() => IUCN.find((i) => i.status === this.status()) ?? null);
  protected readonly cls = computed(() => IUCN_CLASSES[this.info()?.code ?? 'NE']);
}

/** Native / introduced badge from a GBIF distribution's establishmentMeans. */
@Component({
  selector: 'app-establishment-badge',
  imports: [HlmBadgeImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span hlmBadge [variant]="variant()" class="capitalize">{{ label() }}</span>`,
})
export class EstablishmentBadge {
  readonly means = input.required<string>();
  protected readonly label = computed(() => this.means().toLowerCase().replaceAll('_', ' '));
  protected readonly variant = computed(() =>
    this.means() === 'NATIVE' ? 'secondary' : this.means() === 'INTRODUCED' ? 'destructive' : 'outline',
  );
}
