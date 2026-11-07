import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import type * as Leaflet from 'leaflet';

import { environment } from '../../../../../environments/environment';
import { LatLng } from '../../models/fare.models';

/** Where the map starts before any place is set: Metro Manila. */
const startCenter: Leaflet.LatLngTuple = [14.5995, 120.9842];
const startZoom = 11;
/** How close the map zooms in on a single pin. */
const pinZoom = 15;

/** The Leaflet objects, once Leaflet has loaded. */
interface LoadedMap {
  leaflet: typeof Leaflet;
  map: Leaflet.Map;
  origin: Leaflet.Marker | null;
  destination: Leaflet.Marker | null;
  routeLine: Leaflet.Polyline | null;
}

/**
 * The compact map under the Origin and Destination fields: OpenStreetMap tiles,
 * a pin for each place that is set, and the route line once a fare is calculated.
 * Tapping the map or dragging a pin reports the new spot; the page decides what it
 * sets. It can be made bigger, which makes pins easier to drag.
 *
 * The map supports search, it doesn't lead: Leaflet loads only after the page has
 * rendered, and the search fields work even when the map tiles don't load.
 */
@Component({
  selector: 'app-trip-map',
  templateUrl: './trip-map.component.html',
  styleUrl: './trip-map.component.scss',
  // Leaflet builds the pins and route line outside Angular's templates, so they can only
  // be styled without view encapsulation. Every selector starts with `app-trip-map`.
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TripMapComponent {
  readonly origin = input<LatLng | null>(null);
  readonly destination = input<LatLng | null>(null);
  /** The road path the Estimated Distance was measured along, or empty when there is no fare. */
  readonly routeLine = input<LatLng[]>([]);
  /** Tells the commuter what tapping the map will do. */
  readonly hint = input('');

  /** The commuter tapped the map here. */
  readonly mapTap = output<LatLng>();
  readonly originDrag = output<LatLng>();
  readonly destinationDrag = output<LatLng>();

  protected readonly expanded = signal(false);
  protected readonly tilesFailed = signal(false);

  private readonly container = viewChild.required<ElementRef<HTMLElement>>('mapContainer');
  private readonly loaded = signal<LoadedMap | null>(null);

  /**
   * Where the pins are. These only change when a pin moves, not when its place name
   * comes back, so the map isn't framed again under the commuter's finger.
   */
  private readonly originSpot = computed(() => this.origin(), { equal: sameSpot });
  private readonly destinationSpot = computed(() => this.destination(), { equal: sameSpot });

  constructor() {
    const destroyRef = inject(DestroyRef);
    let destroyed = false;
    destroyRef.onDestroy(() => {
      destroyed = true;
      this.loaded()?.map.remove();
    });

    afterNextRender(async () => {
      const leaflet = await import('leaflet');
      if (!destroyed) {
        this.loaded.set(this.createMap(leaflet));
      }
    });

    effect(() => this.showPins(this.originSpot(), this.destinationSpot()));
    effect(() => this.showRouteLine(this.routeLine()));
  }

  protected toggleSize(): void {
    this.expanded.update((expanded) => !expanded);
    // Leaflet measures its container, so tell it once the new size has rendered.
    requestAnimationFrame(() => this.loaded()?.map.invalidateSize());
  }

  private createMap(leaflet: typeof Leaflet): LoadedMap {
    const map = leaflet.map(this.container().nativeElement, {
      center: startCenter,
      zoom: startZoom,
      // A scrolling page shouldn't zoom the map on the way past; +/- and pinch still do.
      scrollWheelZoom: false,
    });

    leaflet
      .tileLayer(environment.mapTilesUrl, {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      })
      // `load` fires once every tile in view has loaded, so the note doesn't flicker tile by tile.
      .on('tileerror', () => this.tilesFailed.set(true))
      .on('load', () => this.tilesFailed.set(false))
      .addTo(map);

    map.on('click', (event: Leaflet.LeafletMouseEvent) => this.mapTap.emit(toLatLng(event.latlng)));

    return { leaflet, map, origin: null, destination: null, routeLine: null };
  }

  /** Puts a pin on each place that is set, and frames them. */
  private showPins(origin: LatLng | null, destination: LatLng | null): void {
    const loaded = this.loaded();
    if (!loaded) {
      return;
    }
    loaded.origin = this.placePin(loaded, loaded.origin, origin, 'Origin', (spot) =>
      this.originDrag.emit(spot),
    );
    loaded.destination = this.placePin(
      loaded,
      loaded.destination,
      destination,
      'Destination',
      (spot) => this.destinationDrag.emit(spot),
    );

    const pins = [origin, destination].filter((pin): pin is LatLng => pin !== null);
    if (pins.length === 1) {
      loaded.map.setView(toTuple(pins[0]), Math.max(loaded.map.getZoom(), pinZoom));
    } else if (pins.length === 2) {
      loaded.map.fitBounds(loaded.leaflet.latLngBounds(pins.map(toTuple)), { padding: [32, 32] });
    }
  }

  /** Adds, moves or removes one pin, and returns the pin now on the map. */
  private placePin(
    loaded: LoadedMap,
    pin: Leaflet.Marker | null,
    spot: LatLng | null,
    name: 'Origin' | 'Destination',
    onDrag: (spot: LatLng) => void,
  ): Leaflet.Marker | null {
    if (!spot) {
      pin?.remove();
      return null;
    }
    if (pin) {
      pin.setLatLng(toTuple(spot));
      return pin;
    }

    const kind = name.toLowerCase();
    return loaded.leaflet
      .marker(toTuple(spot), {
        draggable: true,
        title: `${name} pin. Drag to move it.`,
        alt: `${name} pin`,
        // A 44px touch area around a dot that matches the journey block: hollow for Origin, filled for Destination.
        icon: loaded.leaflet.divIcon({
          className: `trip-pin trip-pin-${kind}`,
          html: '<span class="trip-pin-dot"></span>',
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        }),
      })
      .on('dragend', (event) => onDrag(toLatLng((event.target as Leaflet.Marker).getLatLng())))
      .addTo(loaded.map);
  }

  /** Draws the route line, or removes it when there is none, and frames it. */
  private showRouteLine(routeLine: LatLng[]): void {
    const loaded = this.loaded();
    if (!loaded) {
      return;
    }
    loaded.routeLine?.remove();
    loaded.routeLine = null;
    if (routeLine.length < 2) {
      return;
    }

    loaded.routeLine = loaded.leaflet
      .polyline(routeLine.map(toTuple), { className: 'trip-route-line', interactive: false })
      .addTo(loaded.map);
    loaded.map.fitBounds(loaded.routeLine.getBounds(), { padding: [32, 32] });
  }
}

function sameSpot(a: LatLng | null, b: LatLng | null): boolean {
  return a === b || (a !== null && b !== null && a.lat === b.lat && a.lng === b.lng);
}

function toTuple(point: LatLng): Leaflet.LatLngTuple {
  return [point.lat, point.lng];
}

function toLatLng(point: Leaflet.LatLng): LatLng {
  return { lat: point.lat, lng: point.lng };
}
