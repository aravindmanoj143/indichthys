import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideImagePlus, lucideLoaderCircle, lucideX } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { IdentificationApi, apiErrorMessage } from '../identification.api';

const MAX_PHOTOS = 6;
const MAX_BYTES = 10 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface PickedPhoto {
  file: File;
  preview: string;
}

@Component({
  selector: 'app-request-new',
  imports: [ReactiveFormsModule, RouterLink, NgIcon, HlmButtonImports, HlmCardImports, HlmInputImports, HlmLabelImports],
  providers: [provideIcons({ lucideArrowLeft, lucideImagePlus, lucideX, lucideLoaderCircle })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a hlmBtn variant="ghost" size="sm" routerLink="/identification/requests" class="mb-4 -ml-2">
      <ng-icon name="lucideArrowLeft" /> Requests
    </a>
    <form [formGroup]="form" (ngSubmit)="submit()" class="mx-auto max-w-3xl space-y-6">
      <header class="space-y-1">
        <h1 class="text-2xl font-semibold tracking-tight">Request an identification</h1>
        <p class="text-muted-foreground">
          Clear photos of the whole fish from the side, plus close-ups of the head, mouth and fins, help most.
        </p>
      </header>

      <div hlmCard>
        <div hlmCardHeader><h2 hlmCardTitle>Photos</h2><p hlmCardDescription>Up to {{ maxPhotos }} JPEG, PNG or WebP images, 10 MB each.</p></div>
        <div hlmCardContent>
          <div class="grid grid-cols-3 gap-3 sm:grid-cols-6">
            @for (p of photos(); track p.preview; let i = $index) {
              <div class="relative">
                <img [src]="p.preview" [alt]="p.file.name" class="aspect-square w-full rounded-md object-cover" />
                <button type="button" hlmBtn size="icon-xs" variant="secondary" class="absolute top-1 right-1" [attr.aria-label]="'Remove ' + p.file.name" (click)="removePhoto(i)">
                  <ng-icon name="lucideX" />
                </button>
              </div>
            }
            @if (photos().length < maxPhotos) {
              <label class="text-muted-foreground hover:bg-muted flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs">
                <ng-icon name="lucideImagePlus" size="22" /> Add
                <input type="file" class="sr-only" accept="image/jpeg,image/png,image/webp" multiple (change)="addPhotos($event)" />
              </label>
            }
          </div>
          @if (photoError()) { <p class="text-destructive mt-2 text-sm">{{ photoError() }}</p> }
        </div>
      </div>

      <div hlmCard>
        <div hlmCardHeader><h2 hlmCardTitle>Observation</h2></div>
        <div hlmCardContent class="grid gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1.5 sm:col-span-2">
            <label hlmLabel for="title">Short title *</label>
            <input hlmInput id="title" formControlName="title" placeholder="e.g. Small loach from a hill stream" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="locality">Locality *</label>
            <input hlmInput id="locality" formControlName="locality" placeholder="Stream / village, district" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="region">State / region</label>
            <input hlmInput id="region" formControlName="region" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="observedOn">Date observed</label>
            <input hlmInput id="observedOn" type="date" formControlName="observedOn" [max]="today" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="habitat">Habitat</label>
            <input hlmInput id="habitat" formControlName="habitat" placeholder="e.g. rocky riffle, clear water" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="latitude">Latitude</label>
            <input hlmInput id="latitude" type="number" step="any" formControlName="latitude" placeholder="10.123" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="longitude">Longitude</label>
            <input hlmInput id="longitude" type="number" step="any" formControlName="longitude" placeholder="76.456" />
          </div>
          <div class="flex flex-col gap-1.5 sm:col-span-2">
            <label hlmLabel for="characterNotes">Counts and measurements</label>
            <textarea hlmInput id="characterNotes" formControlName="characterNotes" rows="3" class="h-auto py-2"
              placeholder="e.g. SL 64 mm; lateral line 34 scales; 3 pairs of barbels"></textarea>
          </div>
          <div class="flex flex-col gap-1.5 sm:col-span-2">
            <label hlmLabel for="notes">Other notes</label>
            <textarea hlmInput id="notes" formControlName="notes" rows="3" class="h-auto py-2"></textarea>
          </div>
        </div>
      </div>

      <div hlmCard>
        <div hlmCardHeader>
          <h2 hlmCardTitle>Your details</h2>
          <p hlmCardDescription>Your email is kept private and only used to tell you about identifications.</p>
        </div>
        <div hlmCardContent class="grid gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="submitterName">Name *</label>
            <input hlmInput id="submitterName" formControlName="submitterName" autocomplete="name" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="submitterEmail">Email *</label>
            <input hlmInput id="submitterEmail" type="email" formControlName="submitterEmail" autocomplete="email" />
          </div>
        </div>
      </div>

      @if (submitError()) { <p class="text-destructive text-sm" role="alert">{{ submitError() }}</p> }
      <div class="flex justify-end gap-2">
        <a hlmBtn variant="ghost" routerLink="/identification/requests">Cancel</a>
        <button hlmBtn type="submit" [disabled]="submitting()">
          @if (submitting()) { <ng-icon name="lucideLoaderCircle" class="animate-spin" /> }
          Submit request
        </button>
      </div>
    </form>
  `,
})
export class RequestNew {
  private readonly api = inject(IdentificationApi);
  private readonly router = inject(Router);
  protected readonly maxPhotos = MAX_PHOTOS;
  protected readonly today = new Date().toISOString().slice(0, 10);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
    locality: ['', [Validators.required, Validators.minLength(2)]],
    region: [''],
    observedOn: [''],
    habitat: [''],
    latitude: [''],
    longitude: [''],
    characterNotes: [''],
    notes: [''],
    submitterName: ['', Validators.required],
    submitterEmail: ['', [Validators.required, Validators.email]],
  });

  protected readonly photos = signal<PickedPhoto[]>([]);
  protected readonly photoError = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  constructor() {
    // Prefill from the signed-in account; the request is then linked to it.
    const user = inject(AuthService).user();
    if (user) this.form.patchValue({ submitterName: user.profile?.fullName ?? user.displayName, submitterEmail: user.email });
    inject(DestroyRef).onDestroy(() => this.photos().forEach((p) => URL.revokeObjectURL(p.preview)));
  }

  protected addPhotos(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    this.photoError.set(null);
    const accepted: PickedPhoto[] = [];
    for (const file of files) {
      if (!TYPES.includes(file.type)) this.photoError.set(`${file.name}: only JPEG, PNG or WebP.`);
      else if (file.size > MAX_BYTES) this.photoError.set(`${file.name} is larger than 10 MB.`);
      else accepted.push({ file, preview: URL.createObjectURL(file) });
    }
    const room = MAX_PHOTOS - this.photos().length;
    if (accepted.length > room) {
      accepted.splice(room).forEach((p) => URL.revokeObjectURL(p.preview));
      this.photoError.set(`Only ${MAX_PHOTOS} photos allowed.`);
    }
    this.photos.update((p) => [...p, ...accepted]);
  }

  protected removePhoto(i: number): void {
    URL.revokeObjectURL(this.photos()[i]!.preview);
    this.photos.update((p) => p.filter((_, j) => j !== i));
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.submitError.set('Please fill in the required fields (title, locality, name and a valid email).');
      return;
    }
    const data = new FormData();
    // Fields first, then files: the server reads the multipart stream in order.
    for (const [k, v] of Object.entries(this.form.getRawValue())) if (String(v).trim()) data.append(k, String(v).trim());
    for (const p of this.photos()) data.append('photos', p.file, p.file.name);

    this.submitting.set(true);
    this.submitError.set(null);
    this.api.createRequest(data).subscribe({
      next: ({ id }) => this.router.navigate(['/identification/requests', id]),
      error: (e) => {
        this.submitError.set(apiErrorMessage(e));
        this.submitting.set(false);
      },
    });
  }
}
