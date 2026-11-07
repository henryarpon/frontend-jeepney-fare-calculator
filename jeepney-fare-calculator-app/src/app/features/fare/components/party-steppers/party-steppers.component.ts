import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import {
  maxPartySize,
  maxPerPassengerType,
  minPartySize,
  PartyCounts,
  partySize,
  PassengerType,
  passengerTypeOptions,
} from '../../models/fare.models';

/** One stepper as the template shows it. */
interface Stepper {
  passengerType: PassengerType;
  label: string;
  mark: string;
  count: number;
  canRemove: boolean;
  canAdd: boolean;
}

/**
 * A − / + stepper per passenger type. Each type allows 0 to 30 and the Party
 * 1 to 30 in total; a button that would break a limit is disabled.
 */
@Component({
  selector: 'app-party-steppers',
  templateUrl: './party-steppers.component.html',
  styleUrl: './party-steppers.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartySteppersComponent {
  readonly party = input.required<PartyCounts>();
  readonly partyChange = output<PartyCounts>();

  protected readonly total = computed(() => partySize(this.party()));

  protected readonly steppers = computed<Stepper[]>(() => {
    const party = this.party();
    const total = this.total();
    return passengerTypeOptions.map((option) => ({
      passengerType: option.value,
      label: option.label,
      mark: option.mark,
      count: party[option.value],
      canRemove: party[option.value] > 0 && total > minPartySize,
      canAdd: party[option.value] < maxPerPassengerType && total < maxPartySize,
    }));
  });

  protected readonly atMaximum = computed(() => this.total() >= maxPartySize);
  protected readonly maxPartySize = maxPartySize;

  protected change(passengerType: PassengerType, by: 1 | -1): void {
    const party = this.party();
    this.partyChange.emit({ ...party, [passengerType]: party[passengerType] + by });
  }
}
