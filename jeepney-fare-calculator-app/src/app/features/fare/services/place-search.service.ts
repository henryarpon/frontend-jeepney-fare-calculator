import { HttpClient } from '@angular/common/http';
import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, concat, map, Observable, of, Subject, switchMap, timer } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { minQueryLength, Place, PlaceSearch, PlaceSearchStatus } from '../models/fare.models';

/** How long typing must pause before a search is sent. */
const searchPauseMs = 300;

/** A rough box around the Philippines (min lng, min lat, max lng, max lat), so suggestions stay in the country. */
const philippinesBbox = '116.9,4.5,126.7,21.2';

/** Finds places in the Philippines through Photon, straight from the browser. */
@Injectable({ providedIn: 'root' })
export class PlaceSearchService {
  private readonly http = inject(HttpClient);

  /** Up to 5 places in the Philippines that match the text. */
  search(text: string): Observable<Place[]> {
    return this.http
      .get<PhotonResponse>(`${environment.photonBaseUrl}/api/`, {
        params: { q: text, limit: 5, lang: 'en', bbox: philippinesBbox },
      })
      .pipe(map((response) => response.features.filter(isInThePhilippines).map(toPlace)));
  }

  /**
   * Starts the suggestions for one search field. Searches wait for at least
   * 3 characters and a 300 ms pause. Each new query at once cancels the pause
   * and any search still running for an older one, and clears the older
   * suggestions straight away (status `searching` during the pause, or `idle`
   * when the text is too short to search). It stops when `destroyRef` is destroyed.
   */
  createSearch(destroyRef: DestroyRef): PlaceSearch {
    const suggestions = signal<Place[]>([]);
    const status = signal<PlaceSearchStatus>('idle');
    const queries = new Subject<string>();

    queries
      .pipe(
        map((text) => text.trim()),
        switchMap((text) =>
          text.length < minQueryLength
            ? of({ status: 'idle' as const, places: [] })
            : concat(
                // Drop the older query's suggestions at once, so none can be picked for text that changed.
                of({ status: 'searching' as const, places: [] }),
                timer(searchPauseMs).pipe(
                  switchMap(() =>
                    this.search(text).pipe(
                      map((places) => ({ status: 'done' as const, places })),
                      catchError(() => of({ status: 'failed' as const, places: [] })),
                    ),
                  ),
                ),
              ),
        ),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe((result) => {
        status.set(result.status);
        suggestions.set(result.places);
      });

    return {
      suggestions: suggestions.asReadonly(),
      status: status.asReadonly(),
      query: (text) => queries.next(text),
    };
  }
}

/** The parts of a Photon GeoJSON response this app reads. */
interface PhotonResponse {
  features: PhotonFeature[];
}

interface PhotonFeature {
  /** [longitude, latitude] */
  geometry: { coordinates: [number, number] };
  properties: {
    osm_type?: string;
    osm_id?: number;
    countrycode?: string;
    name?: string;
    housenumber?: string;
    street?: string;
    district?: string;
    city?: string;
    county?: string;
    state?: string;
  };
}

function isInThePhilippines(feature: PhotonFeature): boolean {
  return feature.properties.countrycode === 'PH';
}

function toPlace(feature: PhotonFeature): Place {
  const props = feature.properties;
  const [lng, lat] = feature.geometry.coordinates;
  const street = props.street && props.housenumber ? `${props.housenumber} ${props.street}` : props.street;

  // e.g. "Quiapo Church, Manila, Metro Manila". Parts that repeat are left out.
  const parts = [props.name, street, props.district, props.city ?? props.county, props.state].filter(
    (part, index, all): part is string => !!part && all.indexOf(part) === index,
  );

  return {
    id: `${props.osm_type ?? ''}${props.osm_id ?? `${lat},${lng}`}`,
    label: parts.length > 0 ? parts.join(', ') : `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    lat,
    lng,
  };
}
