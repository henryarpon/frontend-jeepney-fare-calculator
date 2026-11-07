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
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { map, Subscription } from 'rxjs';

import { VehicleType } from '../../../../shared/models/vehicle-type.models';
import { FareBreakdownComponent } from '../../components/fare-breakdown/fare-breakdown.component';
import { FareProblemComponent } from '../../components/fare-problem/fare-problem.component';
import { PartySteppersComponent } from '../../components/party-steppers/party-steppers.component';
import { PlaceFieldComponent } from '../../components/place-field/place-field.component';
import { VehicleTypeSelectorComponent } from '../../components/vehicle-type-selector/vehicle-type-selector.component';
import {
  CalculateFareRequest,
  FareBreakdown,
  FareProblem,
  initialParty,
  PartyCounts,
  passengerTypeOptions,
  Place,
} from '../../models/fare.models';
import { fareProblem, FareService } from '../../services/fare.service';
import { PlaceSearchService } from '../../services/place-search.service';

/** The last calculated fare, with the Vehicle Type and Party it was calculated for. */
interface FareResult {
  breakdown: FareBreakdown;
  vehicleType: VehicleType;
  party: PartyCounts;
}

/**
 * The commuter screen: pick a Vehicle Type, an Origin and a Destination, and the
 * Party, then Calculate to see what the trip should cost. Nothing is priced until
 * the commuter taps Calculate, so every API call is deliberate.
 */
@Component({
  selector: 'app-fare-calculator',
  imports: [
    FareBreakdownComponent,
    FareProblemComponent,
    PartySteppersComponent, PlaceFieldComponent,
    VehicleTypeSelectorComponent,
  ],
  templateUrl: './fare-calculator.component.html',
  styleUrl: './fare-calculator.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FareCalculatorComponent {
  private readonly fareService = inject(FareService);
  private readonly placeSearch = inject(PlaceSearchService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  protected readonly originSearch = this.placeSearch.createSearch(this.destroyRef);
  protected readonly destinationSearch = this.placeSearch.createSearch(this.destroyRef);

  /** The trip as the commuter has set it up. The child components report changes into it. */
  protected readonly form = new FormGroup({
    vehicleType: new FormControl<VehicleType>('TraditionalJeepney', { nonNullable: true }),
    origin: new FormControl<Place | null>(null),
    destination: new FormControl<Place | null>(null),
    party: new FormControl<PartyCounts>(initialParty, { nonNullable: true }),
  });

  /** The form's value as a signal, so the state below follows it. */
  private readonly trip = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });

  protected readonly vehicleType = computed(() => this.trip().vehicleType);
  protected readonly origin = computed(() => this.trip().origin);
  protected readonly destination = computed(() => this.trip().destination);
  protected readonly party = computed(() => this.trip().party);

  protected readonly result = signal<FareResult | null>(null);
  protected readonly calculating = signal(false);
  /** Why the last calculation gave no fare, while the trip is still the one it was for. */
  protected readonly failure = signal<FareProblem | null>(null);

  /** The request waiting for an answer, so a change of place can cancel it. */
  private pending: Subscription | null = null;

  private readonly resultPanel = viewChild<ElementRef<HTMLElement>>('resultPanel');

  protected readonly canCalculate = computed(
    () => this.origin() !== null && this.destination() !== null && !this.calculating(),
  );

  /** Why Calculate can't be tapped yet, or `null` when it can. */
  protected readonly calculateHint = computed(() =>
    this.origin() === null || this.destination() === null
      ? 'Choose an Origin and a Destination to calculate the fare.'
      : null,
  );

  /**
   * True once the Party or Vehicle Type differs from what the result was calculated for.
   * The fare is only priced again when the commuter taps Calculate.
   */
  protected readonly outOfDate = computed(() => {
    const result = this.result();
    if (!result) {
      return false;
    }
    const party = this.party();
    return (
      result.vehicleType !== this.vehicleType() ||
      passengerTypeOptions.some((option) => result.party[option.value] !== party[option.value])
    );
  });

  /**
   * A fare shown for another Vehicle Type stays (marked out of date), but a message about
   * why it couldn't be priced no longer applies.
   */
  protected setVehicleType(vehicleType: VehicleType): void {
    this.form.controls.vehicleType.setValue(vehicleType);
    this.failure.set(null);
  }

  /**
   * A fare shown for another Party stays (marked out of date), but a message about
   * why it couldn't be priced no longer applies.
   */
  protected setParty(party: PartyCounts): void {
    this.form.controls.party.setValue(party);
    this.failure.set(null);
  }

  /** A different Origin is a different trip, so any fare shown no longer applies. */
  protected setOrigin(place: Place | null): void {
    this.form.controls.origin.setValue(place);
    this.forgetFare();
  }

  /** A different Destination is a different trip, so any fare shown no longer applies. */
  protected setDestination(place: Place | null): void {
    this.form.controls.destination.setValue(place);
    this.forgetFare();
  }

  protected calculate(): void {
    const request = this.buildRequest();
    if (!request || this.calculating()) {
      return;
    }
    const party = this.party();
    this.calculating.set(true);
    this.failure.set(null);

    this.pending = this.fareService
      .calculate(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (breakdown) => {
          this.calculating.set(false);
          this.result.set({ breakdown, vehicleType: request.vehicleType, party });
          this.showResult();
        },
        // No fare is shown rather than a stale one: the app never makes up a fare.
        error: (error: unknown) => {
          this.calculating.set(false);
          this.result.set(null);
          this.failure.set(fareProblem(error));
        },
      });
  }

  private forgetFare(): void {
    this.pending?.unsubscribe();
    this.pending = null;
    this.calculating.set(false);
    this.failure.set(null);
    this.result.set(null);
  }

  /** Brings the result into view, Total Fare first, once it has rendered. */
  private showResult(): void {
    afterNextRender(
      () => {
        const panel = this.resultPanel()?.nativeElement;
        // jsdom (in tests) has no scrolling.
        if (typeof panel?.scrollIntoView !== 'function') {
          return;
        }
        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
        panel.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
        panel.focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
  }

  /** The request for the trip as it stands, or `null` while a place is missing. */
  private buildRequest(): CalculateFareRequest | null {
    const origin = this.origin();
    const destination = this.destination();
    if (!origin || !destination) {
      return null;
    }
    const party = this.party();
    return {
      vehicleType: this.vehicleType(),
      origin: { lat: origin.lat, lng: origin.lng },
      destination: { lat: destination.lat, lng: destination.lng },
      party: passengerTypeOptions
        .filter((option) => party[option.value] > 0)
        .map((option) => ({ passengerType: option.value, count: party[option.value] })),
    };
  }
}
