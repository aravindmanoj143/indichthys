import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { IdentificationApi, KeyPathStep, ProfileCharacter, apiErrorMessage } from '../identification.api';
import { TaxonName } from './shared';

const KIND_LABELS: Record<string, string> = {
  categorical: 'Morphology',
  meristic: 'Meristics',
  morphometric: 'Morphometrics',
};

/** The statements followed through a dichotomous key to reach an end point. */
@Component({
  selector: 'app-key-path',
  imports: [HlmBadgeImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="mb-2 flex flex-wrap items-center gap-2">
      <p class="text-sm font-medium">{{ title() }}</p>
      <span hlmBadge variant="outline">end point {{ endPoint() }}</span>
      @if (isDemo()) { <span hlmBadge variant="outline">demo</span> }
    </div>
    <ol class="border-border space-y-2 border-l pl-4 text-sm">
      @for (s of path(); track s.couplet + s.label; let last = $last) {
        <li class="flex gap-3" [class.font-medium]="last">
          <span class="text-muted-foreground w-8 shrink-0 text-right tabular-nums">{{ s.couplet }}{{ s.label }}</span>
          <span>{{ s.text }}</span>
        </li>
      } @empty {
        <li class="text-destructive">This end point can't be reached from couplet 1. The key needs fixing.</li>
      }
    </ol>
  `,
})
export class KeyPath {
  readonly title = input.required<string>();
  readonly endPoint = input.required<string>();
  readonly path = input.required<KeyPathStep[]>();
  readonly isDemo = input(false);
}

/** A taxon's key characters (its path through each key) and its scored character profile. */
@Component({
  selector: 'app-taxon-profile',
  imports: [HlmTableImports, TaxonName, KeyPath],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (profile.error()) {
      <p class="text-destructive text-sm">{{ error(profile.error()) }}</p>
    } @else if (profile.hasValue()) {
      @let p = profile.value();
      <div class="space-y-6" [class.opacity-60]="profile.isLoading()">
        <header>
          <h2 class="text-xl font-semibold"><app-taxon-name [taxon]="p.taxon" /></h2>
          <p class="text-muted-foreground text-sm">{{ p.taxon.order }} › {{ p.taxon.family }}</p>
        </header>

        <section>
          <h3 class="text-muted-foreground mb-3 text-xs font-medium uppercase">Key characters</h3>
          <div class="space-y-5">
            @for (k of p.keys; track k.slug + k.endPoint) {
              <app-key-path [title]="k.title" [endPoint]="k.endPoint" [path]="k.path" [isDemo]="k.isDemo" />
            } @empty {
              <p class="text-muted-foreground text-sm">Not an end point in any published key.</p>
            }
          </div>
        </section>

        <section>
          <h3 class="text-muted-foreground mb-3 text-xs font-medium uppercase">Character profile</h3>
          <div class="space-y-4">
            @for (group of groups(); track group.kind) {
              <div>
                <h4 class="mb-2 text-sm font-medium">{{ group.label }}</h4>
                <div hlmTableContainer class="rounded-md border">
                  <table hlmTable>
                    <tbody hlmTBody>
                      @for (c of group.characters; track c.id) {
                        <tr hlmTr>
                          <td hlmTd class="text-muted-foreground w-48 align-top whitespace-normal" [title]="c.description ?? ''">{{ c.name }}</td>
                          <td hlmTd class="whitespace-normal">
                            @if (c.range; as r) {
                              <span class="tabular-nums">{{ r.min === r.max ? r.min : r.min + '–' + r.max }}</span>
                              @if (c.unit && c.unit !== 'count') { <span class="text-muted-foreground"> {{ c.unit }}</span> }
                              @if (r.source) { <span class="text-muted-foreground block text-xs">{{ r.source }}</span> }
                            } @else {
                              {{ stateLabels(c) }}
                            }
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            } @empty {
              <p class="text-muted-foreground text-sm">No characters have been scored for this taxon yet.</p>
            }
          </div>
        </section>
      </div>
    } @else {
      <p class="text-muted-foreground text-sm">Loading characters…</p>
    }
  `,
})
export class TaxonProfilePanel {
  private readonly api = inject(IdentificationApi);
  protected readonly error = apiErrorMessage;

  readonly taxonId = input.required<number>();

  protected readonly profile = rxResource({
    params: () => this.taxonId(),
    stream: ({ params }) => this.api.profile(params),
  });

  protected readonly groups = computed(() => {
    const chars = this.profile.value()?.characters ?? [];
    return ['categorical', 'meristic', 'morphometric']
      .map((kind) => ({ kind, label: KIND_LABELS[kind]!, characters: chars.filter((c) => c.kind === kind) }))
      .filter((g) => g.characters.length);
  });

  protected stateLabels(c: ProfileCharacter): string {
    return c.states.map((s) => s.label).join(' / ');
  }
}
