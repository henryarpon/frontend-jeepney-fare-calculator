import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { CalculateFareRequest, FareBreakdown } from '../models/fare.models';

/** Asks the back end what a trip should cost. Nothing is stored. */
@Injectable({ providedIn: 'root' })
export class FareService {
  private readonly http = inject(HttpClient);

  calculate(request: CalculateFareRequest): Observable<FareBreakdown> {
    return this.http.post<FareBreakdown>(`${environment.apiBaseUrl}/fares/calculate`, request);
  }
}
