import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLoaderCircle } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { apiErrorMessage } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';

/** Only same-site paths may be used as a post-login destination. */
export const safeNext = (next: string | undefined) => (next && next.startsWith('/') && !next.startsWith('//') ? next : '/');

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, NgIcon, HlmButtonImports, HlmCardImports, HlmInputImports, HlmLabelImports],
  providers: [provideIcons({ lucideLoaderCircle })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form hlmCard class="mx-auto max-w-sm" [formGroup]="form" (ngSubmit)="submit()">
      <div hlmCardHeader>
        <h1 hlmCardTitle class="text-xl">Sign in</h1>
        <p hlmCardDescription>To propose and review identifications, manage your ichthyologist profile and read messages.</p>
      </div>
      <div hlmCardContent class="space-y-4">
        <div class="flex flex-col gap-1.5">
          <label hlmLabel for="email">Email</label>
          <input hlmInput id="email" type="email" formControlName="email" autocomplete="email" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label hlmLabel for="password">Password</label>
          <input hlmInput id="password" type="password" formControlName="password" autocomplete="current-password" />
        </div>
        @if (error()) { <p class="text-destructive text-sm" role="alert">{{ error() }}</p> }
      </div>
      <div hlmCardFooter class="flex-col gap-3">
        <button hlmBtn class="w-full" type="submit" [disabled]="busy()">
          @if (busy()) { <ng-icon name="lucideLoaderCircle" class="animate-spin" /> } Sign in
        </button>
        <p class="text-muted-foreground text-sm">
          New here? <a routerLink="/account/register" [queryParams]="{ next: next() }" class="text-primary hover:underline">Create an account</a>
        </p>
      </div>
    </form>
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly next = input<string>();

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected submit(): void {
    if (this.form.invalid) {
      this.error.set('Enter your email and password.');
      return;
    }
    const { email, password } = this.form.getRawValue();
    this.busy.set(true);
    this.error.set(null);
    this.auth.login(email, password).subscribe({
      next: () => this.router.navigateByUrl(safeNext(this.next())),
      error: (e) => {
        this.error.set(apiErrorMessage(e));
        this.busy.set(false);
      },
    });
  }
}
