import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { AdminSessionService } from './admin-session.service';

/**
 * Lets only a signed-in Administrator into the admin area. Anyone else, or anyone we
 * can't check because the API failed, is sent to the sign-in page.
 */
export const adminAuthGuard: CanActivateFn = () => {
  const session = inject(AdminSessionService);
  const signInPage = inject(Router).createUrlTree(['/admin/sign-in']);

  return session.currentAdministrator().pipe(
    map((administrator) => (administrator ? true : signInPage)),
    catchError(() => of(signInPage)),
  );
};
