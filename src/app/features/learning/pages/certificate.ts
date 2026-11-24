import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideAward, lucideBadgeCheck, lucidePrinter } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { apiErrorMessage } from '../../../core/api-error';
import { LearningApi } from '../learning.api';

/** Public, printable certificate; the URL doubles as verification. */
@Component({
  selector: 'app-certificate',
  imports: [DatePipe, RouterLink, NgIcon, HlmButtonImports],
  providers: [provideIcons({ lucideAward, lucidePrinter, lucideBadgeCheck })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (cert.error()) {
      <div class="mx-auto max-w-lg text-center">
        <h1 class="text-xl font-semibold">Certificate not found</h1>
        <p class="text-muted-foreground mt-2">{{ error(cert.error()) }} Check the code and try again.</p>
      </div>
    } @else if (cert.hasValue()) {
      @let c = cert.value();
      <div class="mx-auto max-w-3xl space-y-4">
        <p class="flex items-center justify-center gap-2 text-sm text-emerald-700 print:hidden dark:text-emerald-400">
          <ng-icon name="lucideBadgeCheck" /> Verified: this certificate was issued by Indichthys.
        </p>
        <article class="bg-card border-primary/30 rounded-xl border-4 border-double p-10 text-center shadow-sm print:shadow-none">
          <ng-icon name="lucideAward" size="48" class="text-primary" />
          <p class="text-muted-foreground mt-4 text-sm tracking-widest uppercase">Certificate of completion</p>
          <p class="text-muted-foreground mt-6">This certifies that</p>
          <p class="mt-2 text-3xl font-semibold">{{ c.recipientName }}</p>
          <p class="text-muted-foreground mt-6">has successfully completed the course</p>
          <p class="mt-2 text-xl font-medium">
            <a [routerLink]="['/learning', c.course.slug]" class="hover:underline">{{ c.course.title }}</a>
          </p>
          <p class="text-muted-foreground mt-2">with an assessment score of {{ (c.score * 100).toFixed(0) }}%</p>
          <div class="text-muted-foreground mt-10 flex flex-wrap justify-between gap-4 text-sm">
            <span>Issued {{ c.issuedAt | date: 'longDate' }}</span>
            <span>{{ c.course.provider === 'Indichthys' ? 'Indichthys' : 'Indichthys · ' + c.course.provider }}</span>
            <span class="font-mono">{{ c.code }}</span>
          </div>
        </article>
        <p class="text-muted-foreground text-center text-xs print:hidden">Anyone can verify this certificate at this page's address.</p>
        <div class="flex justify-center print:hidden"><button hlmBtn variant="outline" (click)="print()"><ng-icon name="lucidePrinter" /> Print or save as PDF</button></div>
      </div>
    } @else {
      <p class="text-muted-foreground">Loading…</p>
    }
  `,
})
export class CertificatePage {
  private readonly api = inject(LearningApi);
  protected readonly error = apiErrorMessage;
  readonly code = input.required<string>();
  protected readonly cert = rxResource({ params: () => this.code(), stream: ({ params }) => this.api.certificate(params) });
  protected print(): void {
    window.print();
  }
}
