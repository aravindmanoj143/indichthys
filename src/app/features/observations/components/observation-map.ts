import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, effect, inject, input, output } from '@angular/core';
import * as L from 'leaflet';
import { type MapPoint, QUALITY_COLOURS } from '../observations.api';

const INDIA: L.LatLngTuple = [21, 79];

/**
 * Leaflet map with OpenStreetMap / satellite base layers.
 * - `points`: observations as coloured dots (click → `pointClick`).
 * - `pickable`: clicking the map emits `pick` with the position; `marker` shows the chosen spot.
 * - `area`: a circle, e.g. the uncertainty of an obscured location.
 */
@Component({
  selector: 'app-observation-map',
  host: { class: 'block overflow-hidden rounded-lg border isolate', '[class.cursor-crosshair]': 'pickable()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
export class ObservationMap {
  readonly points = input<MapPoint[]>([]);
  /** Zoom to the points the first time they arrive. */
  readonly fitPoints = input(false);
  readonly marker = input<{ lat: number; lng: number } | null>(null);
  readonly area = input<{ lat: number; lng: number; radiusM: number } | null>(null);
  readonly pickable = input(false);
  readonly zoom = input(5);

  readonly pick = output<{ lat: number; lng: number }>();
  readonly pointClick = output<number>();
  /** west,south,east,north after each pan/zoom. */
  readonly boundsChange = output<string>();

  private readonly el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private map?: L.Map;
  private readonly pointLayer = L.layerGroup();
  private readonly markerLayer = L.layerGroup();
  private fitted = false;

  constructor() {
    afterNextRender(() => {
      const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      });
      const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics',
      });
      const m = (this.map = L.map(this.el, { center: INDIA, zoom: this.zoom(), layers: [osm, this.pointLayer, this.markerLayer], worldCopyJump: true }));
      L.control.layers({ Map: osm, Satellite: satellite }, undefined, { position: 'topright' }).addTo(m);
      L.control.scale({ imperial: false }).addTo(m);
      m.on('click', (e: L.LeafletMouseEvent) => {
        if (this.pickable()) this.pick.emit({ lat: round(e.latlng.lat), lng: round(e.latlng.lng) });
      });
      const emitBounds = () => {
        const b = m.getBounds();
        this.boundsChange.emit([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map((v) => v.toFixed(4)).join(','));
      };
      m.on('moveend', emitBounds);
      emitBounds();
      this.drawPoints();
      this.drawMarker(true);
    });

    effect(() => {
      this.points();
      this.drawPoints();
    });
    effect(() => {
      this.marker();
      this.area();
      this.drawMarker(false);
    });
    inject(DestroyRef).onDestroy(() => this.map?.remove());
  }

  /** Fly to a position (e.g. after "use my location"). */
  focus(lat: number, lng: number, zoom = 13): void {
    this.map?.setView([lat, lng], zoom);
  }

  private drawPoints(): void {
    if (!this.map) return;
    this.pointLayer.clearLayers();
    const pts = this.points();
    for (const p of pts) {
      L.circleMarker([p.lat, p.lng], {
        radius: 6,
        weight: 1.5,
        color: '#ffffff',
        fillColor: QUALITY_COLOURS[p.quality],
        fillOpacity: 0.9,
      })
        .bindTooltip(p.taxonName ?? 'Unidentified fish')
        .on('click', () => this.pointClick.emit(p.id))
        .addTo(this.pointLayer);
    }
    if (this.fitPoints() && !this.fitted && pts.length) {
      this.fitted = true;
      this.map.fitBounds(L.latLngBounds(pts.map((p) => [p.lat, p.lng] as L.LatLngTuple)), { padding: [30, 30], maxZoom: 10 });
    }
  }

  private drawMarker(initial: boolean): void {
    if (!this.map) return;
    this.markerLayer.clearLayers();
    const a = this.area();
    if (a) {
      L.circle([a.lat, a.lng], { radius: a.radiusM, color: '#0ea5e9', weight: 1.5, fillOpacity: 0.12 }).addTo(this.markerLayer);
    }
    const m = this.marker();
    if (m) {
      L.circleMarker([m.lat, m.lng], { radius: 8, weight: 2, color: '#ffffff', fillColor: '#0ea5e9', fillOpacity: 1 }).addTo(this.markerLayer);
    }
    const target = m ?? a;
    if (initial && target) this.map.setView([target.lat, target.lng], a && !m ? 10 : this.zoom());
    // Typed or loaded coordinates outside the view: bring them into view.
    else if (m && !this.map.getBounds().contains([m.lat, m.lng])) this.map.setView([m.lat, m.lng], Math.max(this.map.getZoom(), 11));
  }
}

const round = (v: number) => Math.round(v * 1e5) / 1e5;
