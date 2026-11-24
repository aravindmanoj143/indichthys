import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronRight } from '@ng-icons/lucide';
import { TaxonRef } from '../identification.api';
import { TaxonTreeNode, countTaxa } from '../taxon-tree.utils';

/** One node of a client-side taxon tree. Selectable nodes carry a taxon. */
@Component({
  selector: 'app-taxon-tree-item',
  imports: [NgIcon],
  providers: [provideIcons({ lucideChevronRight })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'none' },
  template: `
    @let n = node();
    <div class="flex items-center gap-1" [style.padding-left.rem]="depth() * 0.75">
      @if (n.children.length) {
        <button
          type="button"
          class="text-muted-foreground hover:text-foreground rounded p-0.5"
          [attr.aria-label]="(open() ? 'Collapse ' : 'Expand ') + n.name"
          [attr.aria-expanded]="open()"
          (click)="open.set(!open())"
        >
          <ng-icon name="lucideChevronRight" class="transition-transform" [class.rotate-90]="open()" />
        </button>
      } @else {
        <span class="w-5 shrink-0"></span>
      }

      @if (n.taxon) {
        <button
          type="button"
          role="treeitem"
          [attr.aria-selected]="selected()"
          (click)="pick.emit(n.taxon)"
          class="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1 text-left text-sm"
          [class]="selected() ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'"
        >
          <span class="w-12 shrink-0 text-[10px] uppercase opacity-60">{{ n.rank }}</span>
          <span class="truncate" [class.italic]="italic()">{{ n.name }}</span>
        </button>
      } @else {
        <span class="flex min-w-0 flex-1 items-center gap-2 px-2 py-1 text-sm">
          <span class="text-muted-foreground w-12 shrink-0 text-[10px] uppercase">{{ n.rank }}</span>
          <span class="truncate font-medium" [class.italic]="italic()">{{ n.name }}</span>
          <span class="text-muted-foreground ml-auto text-xs tabular-nums">{{ count() }}</span>
        </span>
      }
    </div>
    @if (open()) {
      @for (c of n.children; track c.key) {
        <app-taxon-tree-item [node]="c" [depth]="depth() + 1" [selectedId]="selectedId()" (pick)="pick.emit($event)" />
      }
    }
  `,
})
export class TaxonTreeItem {
  readonly node = input.required<TaxonTreeNode>();
  readonly depth = input(0);
  readonly selectedId = input<number | null>(null);
  readonly pick = output<TaxonRef>();

  protected readonly open = signal(true);
  protected readonly selected = computed(() => !!this.node().taxon && this.node().taxon!.id === this.selectedId());
  protected readonly italic = computed(() => ['genus', 'species', 'subspecies'].includes(this.node().rank));
  protected readonly count = computed(() => countTaxa(this.node()));
}

@Component({
  selector: 'app-taxon-tree',
  imports: [TaxonTreeItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div role="tree" [attr.aria-label]="label()">
      @for (n of nodes(); track n.key) {
        <app-taxon-tree-item [node]="n" [selectedId]="selectedId()" (pick)="pick.emit($event)" />
      } @empty {
        <p class="text-muted-foreground text-sm">No taxa.</p>
      }
    </div>
  `,
})
export class TaxonTree {
  readonly nodes = input.required<TaxonTreeNode[]>();
  readonly selectedId = input<number | null>(null);
  readonly label = input('Taxa');
  readonly pick = output<TaxonRef>();
}
