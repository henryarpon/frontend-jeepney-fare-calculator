import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CurrentLocationProblem, LatLng } from '../models/fare.models';

/** Gives up on finding the location after this long, so the commuter isn't left waiting. */
const locateTimeoutMs = 15_000;

/** Accepts a location found in the last minute, so a second tap answers at once. */
const maxLocationAgeMs = 60_000;

/** Finds where the commuter is, through the browser's location service. */
@Injectable({ providedIn: 'root' })
export class CurrentLocationService {
  /**
   * Emits the commuter's location once, then completes. Fails with a
   * {@link CurrentLocationProblem} when the location is blocked or can't be found.
   * The browser asks the commuter for permission the first time.
   */
  locate(): Observable<LatLng> {
    return new Observable<LatLng>((subscriber) => {
      const geolocation = typeof navigator === 'undefined' ? undefined : navigator.geolocation;
      if (!geolocation) {
        subscriber.error('unavailable' satisfies CurrentLocationProblem);
        return;
      }

      geolocation.getCurrentPosition(
        (position) => {
          subscriber.next({ lat: position.coords.latitude, lng: position.coords.longitude });
          subscriber.complete();
        },
        (error) => {
          const problem: CurrentLocationProblem =
            error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable';
          subscriber.error(problem);
        },
        { enableHighAccuracy: true, timeout: locateTimeoutMs, maximumAge: maxLocationAgeMs },
      );
    });
  }
}
