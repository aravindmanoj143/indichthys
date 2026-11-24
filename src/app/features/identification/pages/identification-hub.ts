import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBookOpen,
  lucideCamera,
  lucideGitFork,
  lucideImages,
  lucideMap,
  lucideSparkles,
  lucideUsers,
} from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { IdentificationApi, apiErrorMessage } from '../identification.api';

@Component({
  selector: 'app-identification-hub',
  imports: [RouterLink, NgIcon, HlmBadgeImports, HlmButtonImports, HlmCardImports],
  providers: [
    provideIcons({ lucideGitFork, lucideMap, lucideUsers, lucideSparkles, lucideImages, lucideBookOpen, lucideCamera }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-8">
      <header class="space-y-1">
        <p class="text-muted-foreground text-sm">Explore</p>
        <h1 class="text-3xl font-semibold tracking-tight">Fish Identification</h1>
        <p class="text-muted-foreground max-w-2xl">
          Identify a fish by browsing the keys and regional guides, or ask experts to identify it from your photos.
        </p>
      </header>

      <div class="grid gap-4 md:grid-cols-2">
        <a hlmCard routerLink="taxa" class="hover:ring-primary/40 transition-shadow">
          <div hlmCardHeader>
            <h2 hlmCardTitle class="flex items-center gap-2"><ng-icon name="lucideGitFork" /> Key identification</h2>
            <p hlmCardDescription>
              Browse the fishes in a taxon tree. Select one to see its key characters (its path through each
              dichotomous key) and its morphological, meristic and morphometric characters.
            </p>
          </div>
          @if (browse.hasValue()) {
            <div hlmCardContent>
              <p class="text-muted-foreground text-xs">
                {{ browse.value().taxa.length }} taxa · {{ browse.value().keys.length }} key{{ browse.value().keys.length === 1 ? '' : 's' }}
              </p>
            </div>
          } @else if (browse.error()) {
            <div hlmCardContent><p class="text-destructive text-sm">{{ error(browse.error()) }}</p></div>
          }
        </a>
        <div hlmCard>
          <div hlmCardHeader>
            <h2 hlmCardTitle class="flex items-center gap-2"><ng-icon name="lucideUsers" /> Expert identification</h2>
            <p hlmCardDescription>
              Submit photos and details. Experts and the community propose and verify identifications.
            </p>
          </div>
          <div hlmCardFooter class="gap-2">
            <a hlmBtn size="sm" routerLink="requests">Browse requests</a>
            <a hlmBtn variant="outline" size="sm" routerLink="requests/new"><ng-icon name="lucideCamera" /> New request</a>
          </div>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div hlmCard>
          <div hlmCardHeader>
            <h2 hlmCardTitle class="flex items-center gap-2"><ng-icon name="lucideMap" /> Regional guides</h2>
            <p hlmCardDescription>Field marks for the fishes of a region, with similar species.</p>
          </div>
          <div hlmCardContent>
            @if (guides.hasValue()) {
              <ul class="divide-border divide-y">
                @for (g of guides.value(); track g.id) {
                  <li class="py-2">
                    <a [routerLink]="['guides', g.slug]" class="text-primary font-medium hover:underline">{{ g.title }}</a>
                    @if (g.isDemo) { <span hlmBadge variant="outline" class="ml-2">demo</span> }
                    <p class="text-muted-foreground text-xs">{{ g.region }} · {{ g._count.entries }} species</p>
                  </li>
                } @empty {
                  <li class="text-muted-foreground py-2 text-sm">No guides yet.</li>
                }
              </ul>
            } @else if (guides.error()) {
              <p class="text-destructive text-sm">{{ error(guides.error()) }}</p>
            } @else {
              <p class="text-muted-foreground text-sm">Loading…</p>
            }
          </div>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        @for (f of aiFeatures; track f.title) {
          <div hlmCard class="border-dashed opacity-80">
            <div hlmCardHeader>
              <h2 hlmCardTitle class="flex items-center gap-2"><ng-icon [name]="f.icon" /> {{ f.title }}</h2>
              <p hlmCardDescription>{{ f.text }}</p>
              <div hlmCardAction><span hlmBadge variant="outline">planned</span></div>
            </div>
          </div>
        }
      </div>
    </section>
  `,
})
export class IdentificationHub {
  private readonly api = inject(IdentificationApi);
  protected readonly browse = rxResource({ stream: () => this.api.browse() });
  protected readonly guides = rxResource({ stream: () => this.api.guides() });
  protected readonly error = apiErrorMessage;

  protected readonly aiFeatures = [
    {
      icon: 'lucideSparkles',
      title: 'AI-based identification',
      text: 'Species suggestions from a photo. Suggestions will go through the same expert verification as people’s.',
    },
    {
      icon: 'lucideImages',
      title: 'Image-based species search',
      text: 'Find visually similar verified records from a photo.',
    },
  ];
}
