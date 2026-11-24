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
import { safeNext } from './login';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, NgIcon, HlmButtonImports, HlmCardImports, HlmInputImports, HlmLabelImports],
  providers: [provideIcons({ lucideLoaderCircle })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form hlmCard class="mx-auto max-w-sm" [formGroup]="form" (ngSubmit)="submit()">
      <div hlmCardHeader>
        <h1 hlmCardTitle class="text-xl">Create an account</h1>
        <p hlmCardDescription>Anyone can join. Ichthyologists can then create a profile and ask to be verified as an expert.</p>
      </div>
      <div hlmCardContent class="space-y-4">
        <div class="flex flex-col gap-1.5">
          <label hlmLabel for="displayName">Your name</label>
          <input hlmInput id="displayName" formControlName="displayName" autocomplete="name" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label hlmLabel for="email">Email</label>
          <input hlmInput id="email" type="email" formControlName="email" autocomplete="email" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label hlmLabel for="password">Password</label>
          <input hlmInput id="password" type="password" formControlName="password" autocomplete="new-password" />
          <p class="text-muted-foreground text-xs">At least 10 characters.</p>
        </div>
        @if (error()) { <p class="text-destructive text-sm" role="alert">{{ error() }}</p> }
      </div>
      <div hlmCardFooter class="flex-col gap-3">
        <button hlmBtn class="w-full" type="submit" [disabled]="busy()">
          @if (busy()) { <ng-icon name="lucideLoaderCircle" class="animate-spin" /> } Create account
        </button>
        <p class="text-muted-foreground text-sm">
          Have an account? <a routerLink="/account/login" [queryParams]="{ next: next() }" class="text-primary hover:underline">Sign in</a>
        </p>
      </div>
    </form>
  `,
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly next = input<string>();

  protected readonly form = inject(FormBuilder).nonNullable.group({
    displayName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(10)]],
  });
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected submit(): void {
    if (this.form.invalid) {
      this.error.set('Fill in your name, a valid email and a password of at least 10 characters.');
      return;
    }
    const { displayName, email, password } = this.form.getRawValue();
    this.busy.set(true);
    this.error.set(null);
    this.auth.register(displayName, email, password).subscribe({
      next: () => this.router.navigateByUrl(this.next() ? safeNext(this.next()) : '/account/profile'),
      error: (e) => {
        this.error.set(apiErrorMessage(e));
        this.busy.set(false);
      },
    });
  }
}
