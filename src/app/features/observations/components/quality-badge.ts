import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { type QualityGrade, QUALITY_COLOURS, QUALITY_LABELS } from '../observations.api';

@Component({
  selector: 'app-quality-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium" [title]="hint()">
      <span class="inline-block size-2 rounded-full" [style.background]="colour()"></span>{{ label() }}
    </span>
  `,
})
export class QualityBadge {
  readonly grade = input.required<QualityGrade>();
  protected readonly label = computed(() => QUALITY_LABELS[this.grade()]);
  protected readonly colour = computed(() => QUALITY_COLOURS[this.grade()]);
  protected readonly hint = computed(
    () =>
      ({
        research: 'At least two people agree on the species, and they are more than two thirds of identifications.',
        'needs-id': 'Has a photo, date and location; waiting for the community to agree on a species.',
        casual: 'Missing a photo, date or location, or the fish was captive / cultivated.',
      })[this.grade()],
  );
}
