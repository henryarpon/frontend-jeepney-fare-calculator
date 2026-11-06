import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AdministratorLoginRequest,
  SignedInAdministrator,
  SignInResult,
} from './models/admin-session.models';

/** Talks to the back end about the Administrator's session (a server-side session cookie). */
@Injectable({ providedIn: 'root' })
export class AdminSessionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/admin`;

  /** Signs in. Wrong credentials come back as a result; any other failure is rethrown. */
  signIn(credentials: AdministratorLoginRequest): Observable<SignInResult> {
    return this.http.post<void>(`${this.baseUrl}/login`, credentials).pipe(
      map((): SignInResult => 'signed-in'),
      catchError((error: unknown) =>
        isUnauthorized(error) ? of<SignInResult>('wrong-credentials') : throwError(() => error),
      ),
    );
  }

  /** Ends the session on the server. */
  signOut(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/logout`, null);
  }

  /** The signed-in Administrator, or `null` when there is no session. Other errors are rethrown. */
  currentAdministrator(): Observable<SignedInAdministrator | null> {
    return this.http
      .get<SignedInAdministrator>(`${this.baseUrl}/me`)
      .pipe(catchError((error: unknown) => (isUnauthorized(error) ? of(null) : throwError(() => error))));
  }
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 401;
}
