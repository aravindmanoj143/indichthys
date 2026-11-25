import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideCrosshair, lucideImagePlus, lucideLoaderCircle, lucideX } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { AuthService } from '../../../core/auth.service';
import { SELECT_CLASS } from '../../content/components/shared';
import { TaxonPicker } from '../../identification/components/taxon-picker';
import type { TaxonInput } from '../../identification/identification.api';
import { ObservationMap } from '../components/observation-map';
import { HABITATS, type ObservationInput, ObservationsApi, apiErrorMessage } from '../observations.api';

const MAX_PHOTOS = 6;
const MAX_BYTES = 10 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface PickedPhoto {
  file: File;
  preview: string;
}

/** "2026-11-25T08:30" in local time, for <input type="datetime-local">. */
function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Number inputs hand reactive forms a number (or null), other inputs a string: accept both. */
const num = (v: unknown) => {
  const t = String(v ?? '').trim();
  return t === '' || !Number.isFinite(Number(t)) ? null : Number(t);
};
const txt = (v: unknown) => String(v ?? '').trim() || null;

/** Add a new observation, or edit one (route param `id`). */
@Component({
  selector: 'app-observation-form',
  imports: [ReactiveFormsModule, RouterLink, NgIcon, HlmButtonImports, HlmCardImports, HlmInputImports, HlmLabelImports, TaxonPicker, ObservationMap],
  providers: [provideIcons({ lucideArrowLeft, lucideImagePlus, lucideX, lucideLoaderCircle, lucideCrosshair })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a hlmBtn variant="ghost" size="sm" [routerLink]="id() ? ['/observations', id()] : '/observations'" class="mb-4 -ml-2">
      <ng-icon name="lucideArrowLeft" /> {{ id() ? 'Observation' : 'Observations' }}
    </a>
    <form [formGroup]="form" (ngSubmit)="submit()" class="mx-auto max-w-3xl space-y-6">
      <header class="space-y-1">
        <h1 class="text-2xl font-semibold tracking-tight">{{ id() ? 'Edit observation' : 'Add an observation' }}</h1>
        @if (!id()) {
          <p class="text-muted-foreground">
            A photo, the date and the place are all it takes. If you don't know the species, leave it blank: the community can help identify it.
          </p>
        }
      </header>

      @if (!id()) {
        <div hlmCard>
          <div hlmCardHeader>
            <h2 hlmCardTitle>Photos</h2>
            <p hlmCardDescription>Up to {{ maxPhotos }} images (JPEG, PNG, WebP; 10 MB each). The date and GPS position are read from the first photo when available.</p>
          </div>
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
            @if (exifNote()) { <p class="text-muted-foreground mt-2 text-sm">{{ exifNote() }}</p> }
          </div>
        </div>

        <div hlmCard>
          <div hlmCardHeader>
            <h2 hlmCardTitle>What did you see?</h2>
            <p hlmCardDescription>Your identification is the first vote; others can agree or suggest another name.</p>
          </div>
          <div hlmCardContent class="space-y-3">
            <app-taxon-picker [(value)]="taxon" />
            @if (!taxon()) {
              <div class="flex flex-col gap-1.5">
                <label hlmLabel for="taxonText">Or type a name (e.g. a genus or family)</label>
                <input hlmInput id="taxonText" formControlName="taxonText" placeholder="e.g. Garra, Channidae" />
              </div>
            }
          </div>
        </div>
      }

      <div hlmCard>
        <div hlmCardHeader>
          <h2 hlmCardTitle>When and where</h2>
          <p hlmCardDescription>Click the map to place the observation, or use your current location.</p>
        </div>
        <div hlmCardContent class="space-y-4">
          <div class="flex flex-col gap-1.5 sm:w-1/2">
            <label hlmLabel for="observedAt">Date and time</label>
            <input hlmInput id="observedAt" type="datetime-local" formControlName="observedAt" [max]="now" />
          </div>
          <app-observation-map class="h-72" [pickable]="true" [marker]="position()" [zoom]="position() ? 12 : 5" (pick)="setPosition($event.lat, $event.lng, null)" />
          <div class="grid gap-4 sm:grid-cols-3">
            <div class="flex flex-col gap-1.5">
              <label hlmLabel for="latitude">Latitude</label>
              <input hlmInput id="latitude" type="number" step="any" min="-90" max="90" formControlName="latitude" placeholder="10.12345" />
            </div>
            <div class="flex flex-col gap-1.5">
              <label hlmLabel for="longitude">Longitude</label>
              <input hlmInput id="longitude" type="number" step="any" min="-180" max="180" formControlName="longitude" placeholder="76.12345" />
            </div>
            <div class="flex flex-col gap-1.5">
              <label hlmLabel for="accuracyM">Accuracy (m)</label>
              <input hlmInput id="accuracyM" type="number" min="0" formControlName="accuracyM" placeholder="e.g. 20" />
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <button hlmBtn type="button" variant="outline" size="sm" (click)="locate()" [disabled]="locating()">
              <ng-icon [name]="locating() ? 'lucideLoaderCircle' : 'lucideCrosshair'" [class.animate-spin]="locating()" /> Use my location
            </button>
            @if (position()) { <button hlmBtn type="button" variant="ghost" size="sm" (click)="clearPosition()">Clear location</button> }
            @if (locateError()) { <span class="text-destructive text-sm">{{ locateError() }}</span> }
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-1.5">
              <label hlmLabel for="placeName">Place</label>
              <input hlmInput id="placeName" formControlName="placeName" placeholder="Village / town, district, state" />
            </div>
            <div class="flex flex-col gap-1.5">
              <label hlmLabel for="waterBody">Water body</label>
              <input hlmInput id="waterBody" formControlName="waterBody" placeholder="e.g. Chalakudy River" />
            </div>
            <div class="flex flex-col gap-1.5">
              <label hlmLabel for="habitat">Habitat</label>
              <select id="habitat" [class]="selectClass" formControlName="habitat">
                <option value="">Not recorded</option>
                @for (h of habitats; track h[0]) { <option [value]="h[0]">{{ h[1] }}</option> }
              </select>
            </div>
            <div class="flex flex-col gap-1.5">
              <label hlmLabel for="geoprivacy">Location privacy</label>
              <select id="geoprivacy" [class]="selectClass" formControlName="geoprivacy">
                <option value="open">Open: show exact location</option>
                <option value="obscured">Obscured: show only a ~20 km area</option>
              </select>
            </div>
          </div>
          <p class="text-muted-foreground text-xs">
            Obscure the location of rare, threatened or trade-sensitive fishes (e.g. endemic barbs and loaches collected for the aquarium trade).
            Only you see the exact position.
          </p>
        </div>
      </div>

      <div hlmCard>
        <div hlmCardHeader><h2 hlmCardTitle>Details</h2></div>
        <div hlmCardContent class="grid gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="individuals">Number of individuals</label>
            <input hlmInput id="individuals" type="number" min="1" formControlName="individuals" />
          </div>
          <label class="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" class="accent-primary size-4" formControlName="captive" />
            Captive or cultivated (aquarium, farm, market)
          </label>
          <div class="flex flex-col gap-1.5 sm:col-span-2">
            <label hlmLabel for="notes">Notes</label>
            <textarea hlmInput id="notes" formControlName="notes" rows="4" class="h-auto py-2"
              placeholder="Behaviour, size, how it was caught or seen, water conditions…"></textarea>
          </div>
        </div>
      </div>

      @if (!id() && !auth.user()) {
        <div hlmCard>
          <div hlmCardHeader>
            <h2 hlmCardTitle>Your details</h2>
            <p hlmCardDescription>
              Optional. Your name is shown with the observation (otherwise "Guest"); your email stays private.
              @if (auth.signInEnabled) {
                <a routerLink="/account/login" [queryParams]="{ next: '/observations/new' }" class="text-foreground underline">Sign in</a>
                instead to edit it later and follow identifications.
              }
            </p>
          </div>
          <div hlmCardContent class="grid gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-1.5">
              <label hlmLabel for="guestName">Your name (optional)</label>
              <input hlmInput id="guestName" formControlName="guestName" autocomplete="name" />
            </div>
            <div class="flex flex-col gap-1.5">
              <label hlmLabel for="guestEmail">Email (optional, private)</label>
              <input hlmInput id="guestEmail" type="email" formControlName="guestEmail" autocomplete="email" />
            </div>
          </div>
        </div>
      }

      @if (submitError()) { <p class="text-destructive text-sm" role="alert">{{ submitError() }}</p> }
      <div class="flex justify-end gap-2">
        <a hlmBtn variant="ghost" [routerLink]="id() ? ['/observations', id()] : '/observations'">Cancel</a>
        <button hlmBtn type="submit" [disabled]="submitting()">
          @if (submitting()) { <ng-icon name="lucideLoaderCircle" class="animate-spin" /> }
          {{ id() ? 'Save changes' : 'Share observation' }}
        </button>
      </div>
    </form>
  `,
})
export class ObservationForm {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(ObservationsApi);
  private readonly router = inject(Router);
  private readonly map = viewChild(ObservationMap);

  /** Set when editing (route param). */
  readonly id = input<string>();

  protected readonly maxPhotos = MAX_PHOTOS;
  protected readonly selectClass = SELECT_CLASS;
  protected readonly habitats = HABITATS;
  protected readonly now = toLocalInput(new Date());

  protected readonly form = inject(FormBuilder).nonNullable.group({
    taxonText: [''],
    observedAt: [''],
    latitude: [''],
    longitude: [''],
    accuracyM: [''],
    placeName: [''],
    waterBody: [''],
    habitat: [''],
    geoprivacy: ['open' as 'open' | 'obscured'],
    individuals: [''],
    captive: [false],
    notes: [''],
    guestName: [''],
    guestEmail: [''],
  });
  private readonly values = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  protected readonly position = computed(() => {
    const lat = num(this.values().latitude);
    const lng = num(this.values().longitude);
    return lat != null && lng != null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
  });

  protected readonly taxon = signal<TaxonInput | null>(null);
  protected readonly photos = signal<PickedPhoto[]>([]);
  protected readonly photoError = signal<string | null>(null);
  protected readonly exifNote = signal<string | null>(null);
  protected readonly locating = signal(false);
  protected readonly locateError = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.photos().forEach((p) => URL.revokeObjectURL(p.preview)));
    // Editing: load the observation (the owner gets the exact position).
    effect(() => {
      const id = Number(this.id());
      if (!id) return;
      this.api.get(id).subscribe({
        next: (o) => {
          this.form.patchValue({
            observedAt: o.observedAt ? toLocalInput(new Date(o.observedAt)) : '',
            latitude: o.latitude?.toString() ?? '',
            longitude: o.longitude?.toString() ?? '',
            accuracyM: o.accuracyM?.toString() ?? '',
            placeName: o.placeName ?? '',
            waterBody: o.waterBody ?? '',
            habitat: o.habitat ?? '',
            geoprivacy: o.geoprivacy,
            individuals: o.individuals?.toString() ?? '',
            captive: o.captive,
            notes: o.notes ?? '',
          });
          if (o.latitude != null && o.longitude != null) this.map()?.focus(o.latitude, o.longitude, 12);
        },
        error: (e) => this.submitError.set(apiErrorMessage(e)),
      });
    });
  }

  protected setPosition(lat: number, lng: number, accuracy: number | null): void {
    this.form.patchValue({ latitude: String(lat), longitude: String(lng), accuracyM: accuracy == null ? this.form.value.accuracyM : String(Math.round(accuracy)) });
  }

  protected clearPosition(): void {
    this.form.patchValue({ latitude: '', longitude: '', accuracyM: '' });
  }

  protected locate(): void {
    if (!('geolocation' in navigator)) {
      this.locateError.set('Your browser cannot share its location.');
      return;
    }
    this.locating.set(true);
    this.locateError.set(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Math.round(pos.coords.latitude * 1e5) / 1e5;
        const lng = Math.round(pos.coords.longitude * 1e5) / 1e5;
        this.setPosition(lat, lng, pos.coords.accuracy);
        this.map()?.focus(lat, lng, 14);
        this.locating.set(false);
      },
      (err) => {
        this.locateError.set(err.code === err.PERMISSION_DENIED ? 'Location permission was denied.' : 'Could not get your location.');
        this.locating.set(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
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
    const wasEmpty = this.photos().length === 0;
    this.photos.update((p) => [...p, ...accepted]);
    if (wasEmpty && accepted[0]) void this.readExif(accepted[0].file);
  }

  protected removePhoto(i: number): void {
    URL.revokeObjectURL(this.photos()[i]!.preview);
    this.photos.update((p) => p.filter((_, j) => j !== i));
  }

  /** Fill empty date/location fields from the photo's EXIF data. */
  private async readExif(file: File): Promise<void> {
    try {
      const exifr = (await import('exifr')).default;
      const filled: string[] = [];
      const meta = (await exifr.parse(file, ['DateTimeOriginal'])) as { DateTimeOriginal?: Date } | undefined;
      if (meta?.DateTimeOriginal instanceof Date && !this.form.value.observedAt) {
        this.form.patchValue({ observedAt: toLocalInput(meta.DateTimeOriginal) });
        filled.push('date');
      }
      const gps = await exifr.gps(file).catch(() => null);
      if (gps && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude) && !this.position()) {
        const lat = Math.round(gps.latitude * 1e5) / 1e5;
        const lng = Math.round(gps.longitude * 1e5) / 1e5;
        this.setPosition(lat, lng, null);
        this.map()?.focus(lat, lng, 12);
        filled.push('location');
      }
      this.exifNote.set(filled.length ? `Filled the ${filled.join(' and ')} from the photo. Check them below.` : null);
    } catch {
      /* No readable EXIF: nothing to fill. */
    }
  }

  private input(): ObservationInput {
    const v = this.form.getRawValue();
    return {
      observedAt: v.observedAt ? new Date(v.observedAt).toISOString() : null,
      latitude: num(v.latitude),
      longitude: num(v.longitude),
      accuracyM: num(v.accuracyM),
      placeName: txt(v.placeName),
      waterBody: txt(v.waterBody),
      habitat: v.habitat || null,
      individuals: num(v.individuals),
      captive: v.captive,
      geoprivacy: v.geoprivacy,
      notes: txt(v.notes),
    };
  }

  protected submit(): void {
    const body = this.input();
    if ((body.latitude == null) !== (body.longitude == null)) {
      this.submitError.set('Give both latitude and longitude, or neither.');
      return;
    }
    this.submitting.set(true);
    this.submitError.set(null);
    const fail = (e: unknown) => {
      this.submitError.set(apiErrorMessage(e));
      this.submitting.set(false);
    };
    const id = Number(this.id());
    if (id) {
      this.api.update(id, body).subscribe({ next: () => this.router.navigate(['/observations', id]), error: fail });
      return;
    }
    const guest = !this.auth.user();
    const guestName = this.form.value.guestName?.trim() ?? '';
    const guestEmail = this.form.value.guestEmail?.trim() ?? '';
    if (guest && guestEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
      this.submitError.set('That email address looks incomplete.');
      this.submitting.set(false);
      return;
    }
    const data = new FormData();
    // Fields first, then files: the server reads the multipart stream in order.
    for (const [k, v] of Object.entries(body)) if (v !== null && v !== '') data.append(k, String(v));
    if (guest) {
      if (guestName) data.append('guestName', guestName);
      if (guestEmail) data.append('guestEmail', guestEmail);
    }
    const t = this.taxon();
    const name = t?.scientificName ?? this.form.value.taxonText?.trim();
    if (name) {
      data.append('taxonName', name);
      if (t?.gbifKey) data.append('gbifKey', String(t.gbifKey));
      if (t?.rank) data.append('taxonRank', t.rank);
    }
    for (const p of this.photos()) data.append('photos', p.file, p.file.name);
    this.api.create(data).subscribe({ next: ({ id: newId }) => this.router.navigate(['/observations', newId]), error: fail });
  }
}
