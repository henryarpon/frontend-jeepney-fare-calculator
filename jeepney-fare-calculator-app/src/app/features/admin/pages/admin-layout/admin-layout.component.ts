import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterOutlet } from '@angular/router';

import { AdminSessionService } from '../../../../core/auth/admin-session.service';

/** The frame around every signed-in admin page: a header with the sign-out action. */
@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayoutComponent {
  private readonly session = inject(AdminSessionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly signingOut = signal(false);

  protected signOut(): void {
    if (this.signingOut()) {
      return;
    }
    this.signingOut.set(true);

    // Leave the admin area even if the request fails, so the Administrator is never stuck here.
    const goToSignIn = (): void => void this.router.navigateByUrl('/admin/sign-in');
    this.session
      .signOut()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: goToSignIn, error: goToSignIn });
  }
}
