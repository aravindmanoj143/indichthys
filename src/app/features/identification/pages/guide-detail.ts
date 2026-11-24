import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { DemoBanner, TaxonName } from '../components/shared';
import { IdentificationApi, apiErrorMessage } from '../identification.api';

@Component({
  selector: 'app-guide-detail',
  imports: [RouterLink, NgIcon, HlmButtonImports, HlmCardImports, DemoBanner, TaxonName],
  providers: [provideIcons({ lucideArrowLeft })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a hlmBtn variant="ghost" size="sm" routerLink="/identification" class="mb-4 -ml-2">
      <ng-icon name="lucideArrowLeft" /> Identification
    </a>
    @if (guide.error()) {
      <p class="text-destructive">{{ error(guide.error()) }}</p>
    } @else if (guide.hasValue()) {
      @let g = guide.value();
      <section class="space-y-6">
        <header class="space-y-1">
          <p class="text-muted-foreground text-sm">{{ g.region }}</p>
          <h1 class="text-2xl font-semibold tracking-tight">{{ g.title }}</h1>
          <p class="text-muted-foreground max-w-2xl">{{ g.description }}</p>
          @if (g.authors) { <p class="text-muted-foreground text-xs">{{ g.authors }}</p> }
        </header>
        @if (g.isDemo) { <app-demo-banner /> }
        <div class="grid gap-4 md:grid-cols-2">
          @for (e of g.entries; track e.id) {
            <article hlmCard>
              <div hlmCardHeader>
                <h2 hlmCardTitle><app-taxon-name [taxon]="e.taxon" /></h2>
                <p hlmCardDescription>{{ e.taxon.family }}</p>
              </div>
              <div hlmCardContent class="space-y-3 text-sm">
                @if (e.fieldMarks) {
                  <div>
                    <p class="text-muted-foreground text-xs uppercase">Field marks</p>
                    <p>{{ e.fieldMarks }}</p>
                  </div>
                }
                @if (e.similar) {
                  <div>
                    <p class="text-muted-foreground text-xs uppercase">Similar species</p>
                    <p>{{ e.similar }}</p>
                  </div>
                }
              </div>
            </article>
          }
        </div>
      </section>
    } @else {
      <p class="text-muted-foreground">Loading guide…</p>
    }
  `,
})
export class GuideDetail {
  private readonly api = inject(IdentificationApi);
  protected readonly error = apiErrorMessage;
  readonly slug = input.required<string>();
  protected readonly guide = rxResource({ params: () => this.slug(), stream: ({ params }) => this.api.guide(params) });
}
