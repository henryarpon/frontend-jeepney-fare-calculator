import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AdminSessionService } from '../../../../core/auth/admin-session.service';

@Component({
  selector: 'app-sign-in',
  imports: [ReactiveFormsModule],
  templateUrl: './sign-in.component.html',
  styleUrl: './sign-in.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInComponent {
  private readonly session = inject(AdminSessionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly form = new FormGroup({
    username: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly submitLabel = computed(() => (this.submitting() ? 'Signing in…' : 'Sign in'));

  protected signIn(): void {
    if (this.submitting()) {
      return;
    }
    if (this.form.invalid) {
      this.errorMessage.set('Enter your username and password.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.session
      .signIn(this.form.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (result === 'signed-in') {
            // If the admin area turns us away again, the guard sends us back here, so re-enable the form.
            void this.router.navigateByUrl('/admin').finally(() => this.submitting.set(false));
            return;
          }
          this.submitting.set(false);
          this.errorMessage.set('Wrong username or password.');
        },
        error: () => {
          this.submitting.set(false);
          this.errorMessage.set("Couldn't sign in right now. Please try again.");
        },
      });
  }
}
