import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { VehicleType, vehicleTypeOptions } from '../../../../shared/models/vehicle-type.models';

/** A segmented control to pick Traditional Jeepney or Modern Jeepney. Built on radio buttons. */
@Component({
  selector: 'app-vehicle-type-selector',
  templateUrl: './vehicle-type-selector.component.html',
  styleUrl: './vehicle-type-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleTypeSelectorComponent {
  readonly value = input.required<VehicleType>();
  readonly valueChange = output<VehicleType>();

  protected readonly options = vehicleTypeOptions;
}
