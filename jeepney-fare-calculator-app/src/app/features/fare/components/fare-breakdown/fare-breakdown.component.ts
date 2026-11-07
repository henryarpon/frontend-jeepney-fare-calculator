import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { VehicleType, vehicleTypeLabel } from '../../../../shared/models/vehicle-type.models';
import { FareBreakdown, FareLine, FareMatrixRow, passengerTypeOption } from '../../models/fare.models';

/** A breakdown line as the template shows it. */
interface LineView extends FareLine {
  label: string;
  mark: string;
}

/** A matrix excerpt row as the template shows it. */
interface ExcerptRowView extends FareMatrixRow {
  charged: boolean;
}

/**
 * What a trip should cost the Party, Total Fare first, then how it was reached:
 * the distances, each passenger type's share, the fare matrix rows around the
 * charged one, and which Fare Matrix Version was used.
 */
@Component({
  selector: 'app-fare-breakdown',
  imports: [CurrencyPipe, DatePipe, DecimalPipe],
  templateUrl: './fare-breakdown.component.html',
  styleUrl: './fare-breakdown.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FareBreakdownComponent {
  readonly breakdown = input.required<FareBreakdown>();
  /** The vehicle type the fare was calculated for. */
  readonly vehicleType = input.required<VehicleType>();
  /** True once the Party or Vehicle Type changed after this fare was calculated. */
  readonly outOfDate = input(false);

  protected readonly passengerCount = computed(() =>
    this.breakdown().lines.reduce((total, line) => total + line.count, 0),
  );

  protected readonly lines = computed<LineView[]>(() =>
    this.breakdown().lines.map((line) => {
      const option = passengerTypeOption(line.passengerType);
      return { ...line, label: option.label, mark: option.mark };
    }),
  );

  protected readonly excerpt = computed<ExcerptRowView[]>(() => {
    const chargedKm = this.breakdown().chargedDistanceKm;
    return this.breakdown().matrixExcerpt.map((row) => ({ ...row, charged: row.distanceKm === chargedKm }));
  });

  protected readonly vehicleTypeName = computed(() => vehicleTypeLabel(this.vehicleType()));
}
