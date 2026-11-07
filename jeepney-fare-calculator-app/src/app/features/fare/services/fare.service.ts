import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { CalculateFareRequest, FareBreakdown, FareProblem } from '../models/fare.models';

/** Asks the back end what a trip should cost. Nothing is stored. */
@Injectable({ providedIn: 'root' })
export class FareService {
  private readonly http = inject(HttpClient);

  /** Fails with an `HttpErrorResponse`; read it with {@link fareProblem}. */
  calculate(request: CalculateFareRequest): Observable<FareBreakdown> {
    return this.http.post<FareBreakdown>(`${environment.apiBaseUrl}/fares/calculate`, request);
  }
}

/** Why a failed calculation gave no fare, read from the back end's ProblemDetails. */
export function fareProblem(error: unknown): FareProblem {
  if (!(error instanceof HttpErrorResponse)) {
    return { kind: 'unexpected' };
  }

  // The body is ProblemDetails, but it could be anything (e.g. a proxy's error page).
  const body = (typeof error.error === 'object' ? error.error : null) as {
    detail?: unknown;
    errors?: unknown;
  } | null;

  switch (error.status) {
    case 0:
      return { kind: 'offline' };
    case 400:
      return { kind: 'invalid-request', errors: validationMessages(body?.errors) };
    case 422:
      return { kind: 'not-priced', detail: typeof body?.detail === 'string' ? body.detail : null };
    case 503:
      return { kind: 'distance-unavailable' };
    default:
      return { kind: 'unexpected' };
  }
}

/** Every message in a 400's `errors` (`{ "$.party": ["..."] }`), in order. */
function validationMessages(errors: unknown): string[] {
  if (typeof errors !== 'object' || errors === null) {
    return [];
  }
  return Object.values(errors)
    .flat()
    .filter((message): message is string => typeof message === 'string');
}
