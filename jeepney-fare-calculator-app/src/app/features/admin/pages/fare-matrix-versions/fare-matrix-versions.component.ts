import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { FareMatrixVersionListComponent } from '../../components/fare-matrix-version-list/fare-matrix-version-list.component';
import { FareMatrixVersionSummary, VehicleType, vehicleTypeOptions } from '../../models/fare-matrix.models';
import { FareMatrixService } from '../../services/fare-matrix.service';

/** One vehicle type's versions, as this page shows them. */
interface VersionGroup {
  vehicleType: VehicleType;
  label: string;
  versions: FareMatrixVersionSummary[];
  emptyMessage: string;
}

/**
 * Every Fare Matrix Version, one list per vehicle type, with each type's Active Fare Matrix
 * marked. Each version links to its rows, where it can be reactivated.
 */
@Component({
  selector: 'app-fare-matrix-versions',
  imports: [RouterLink, FareMatrixVersionListComponent],
  templateUrl: './fare-matrix-versions.component.html',
  styleUrl: './fare-matrix-versions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FareMatrixVersionsComponent {
  private readonly fareMatrices = inject(FareMatrixService);
  private readonly destroyRef = inject(DestroyRef);

  /** `null` until both vehicle types' lists have loaded. */
  protected readonly groups = signal<VersionGroup[] | null>(null);
  protected readonly loadFailed = signal(false);

  constructor() {
    forkJoin(vehicleTypeOptions.map((option) => this.fareMatrices.listVersions(option.value)))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lists) =>
          this.groups.set(
            vehicleTypeOptions.map((option, index) => ({
              vehicleType: option.value,
              label: option.label,
              versions: lists[index],
              emptyMessage: `No fare matrix has been uploaded for ${option.label} yet.`,
            })),
          ),
        error: () => this.loadFailed.set(true),
      });
  }
}
