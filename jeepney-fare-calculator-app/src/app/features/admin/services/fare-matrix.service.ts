import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  FareMatrixFileError,
  FareMatrixPreview,
  FareMatrixVersionSummary,
  VehicleType,
} from '../models/fare-matrix.models';

/** Talks to the back end about Fare Matrix Versions: preview, upload and list. */
@Injectable({ providedIn: 'root' })
export class FareMatrixService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/admin/fare-matrices`;

  /** Reads the CSV on the server and returns its rows. Nothing is saved. */
  preview(vehicleType: VehicleType, file: File): Observable<FareMatrixPreview> {
    return this.http.post<FareMatrixPreview>(`${this.baseUrl}/preview`, uploadForm(vehicleType, file));
  }

  /** Saves the CSV as a new version, which becomes the vehicle type's Active Fare Matrix. */
  upload(vehicleType: VehicleType, file: File, note: string): Observable<FareMatrixVersionSummary> {
    const form = uploadForm(vehicleType, file);
    if (note.trim()) {
      form.append('note', note.trim());
    }
    return this.http.post<FareMatrixVersionSummary>(this.baseUrl, form);
  }

  /** The vehicle type's versions, newest first. */
  listVersions(vehicleType: VehicleType): Observable<FareMatrixVersionSummary[]> {
    return this.http.get<FareMatrixVersionSummary[]>(this.baseUrl, { params: { vehicleType } });
  }
}

/**
 * The file's errors when a preview or upload was rejected because the file is invalid
 * (400 with `rowErrors`), or `null` for any other failure.
 */
export function fareMatrixFileErrors(error: unknown): FareMatrixFileError[] | null {
  if (!(error instanceof HttpErrorResponse) || error.status !== 400) {
    return null;
  }
  const body = error.error as { rowErrors?: unknown } | null;
  return Array.isArray(body?.rowErrors) ? (body.rowErrors as FareMatrixFileError[]) : null;
}

function uploadForm(vehicleType: VehicleType, file: File): FormData {
  const form = new FormData();
  form.append('vehicleType', vehicleType);
  form.append('file', file);
  return form;
}
