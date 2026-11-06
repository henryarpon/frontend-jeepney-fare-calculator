import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, EMPTY, map, switchMap } from 'rxjs';

import { FareMatrixRowsTableComponent } from '../../components/fare-matrix-rows-table/fare-matrix-rows-table.component';
import { FareMatrixVersionDetails, vehicleTypeLabel } from '../../models/fare-matrix.models';
import { FareMatrixService } from '../../services/fare-matrix.service';

/**
 * One Fare Matrix Version: its details and rows. An older version can be reactivated,
 * e.g. to undo a bad upload, after the Administrator confirms.
 */
@Component({
  selector: 'app-fare-matrix-version',
  imports: [DatePipe, RouterLink, FareMatrixRowsTableComponent],
  templateUrl: './fare-matrix-version.component.html',
  styleUrl: './fare-matrix-version.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FareMatrixVersionComponent {
  private readonly fareMatrices = inject(FareMatrixService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly reactivateButton = viewChild<ElementRef<HTMLButtonElement>>('reactivateButton');
  private readonly confirmButton = viewChild<ElementRef<HTMLButtonElement>>('confirmButton');

  /** `null` until it has loaded. */
  protected readonly version = signal<FareMatrixVersionDetails | null>(null);
  protected readonly loadError = signal<string | null>(null);
  /** Where reactivation is: not started, waiting for the Administrator to confirm, or sent. */
  protected readonly reactivation = signal<'idle' | 'confirming' | 'activating'>('idle');
  protected readonly reactivatedMessage = signal<string | null>(null);
  protected readonly reactivateError = signal<string | null>(null);

  protected readonly vehicleTypeName = computed(() => {
    const version = this.version();
    return version ? vehicleTypeLabel(version.vehicleType) : '';
  });
  protected readonly rowsCaption = computed(() => `${this.version()?.rows.length ?? 0} rows`);
  protected readonly confirmQuestion = computed(
    () =>
      `Make this the Active Fare Matrix for ${this.vehicleTypeName()}? ` +
      `It will price every ${this.vehicleTypeName()} trip from now on.`,
  );
  protected readonly activating = computed(() => this.reactivation() === 'activating');
  protected readonly confirmLabel = computed(() => (this.activating() ? 'Reactivating…' : 'Yes, reactivate'));

  constructor() {
    // The router reuses this page when only the id changes, so each id starts afresh,
    // and a failed load is caught per id so the next id can still load.
    this.route.paramMap
      .pipe(
        map((params) => Number(params.get('id'))),
        switchMap((id) => {
          this.resetFor(id);
          return this.fareMatrices.getVersion(id).pipe(
            catchError((error: unknown) => {
              this.loadError.set(
                error instanceof HttpErrorResponse && error.status === 404
                  ? "This fare matrix version doesn't exist."
                  : "Couldn't load this fare matrix version. Reload the page to try again.",
              );
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((version) => this.version.set(version));
  }

  protected askToReactivate(): void {
    this.reactivateError.set(null);
    this.reactivation.set('confirming');
    this.focusAfterRender(this.confirmButton);
  }

  protected cancelReactivation(): void {
    this.reactivation.set('idle');
    this.focusAfterRender(this.reactivateButton);
  }

  protected confirmReactivation(): void {
    const version = this.version();
    if (!version || this.reactivation() !== 'confirming') {
      return;
    }
    this.reactivation.set('activating');
    this.reactivateError.set(null);

    this.fareMatrices
      .activate(version.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (activated) => {
          this.reactivation.set('idle');
          this.version.set({ ...version, isActive: activated.isActive });
          this.reactivatedMessage.set(`This is now the Active Fare Matrix for ${this.vehicleTypeName()}.`);
        },
        error: () => {
          this.reactivation.set('confirming');
          this.reactivateError.set("Couldn't reactivate this version. Please try again.");
        },
      });
  }

  /** Forgets everything shown for the previous version before `id` loads. */
  private resetFor(id: number): void {
    if (this.version()?.id === id) {
      return;
    }
    this.version.set(null);
    this.loadError.set(null);
    this.reactivation.set('idle');
    this.reactivatedMessage.set(null);
    this.reactivateError.set(null);
  }

  /** Moves the focus to the button that replaced the one just pressed, so keyboard users aren't lost. */
  private focusAfterRender(button: () => ElementRef<HTMLButtonElement> | undefined): void {
    afterNextRender(() => button()?.nativeElement.focus(), { injector: this.injector });
  }
}
