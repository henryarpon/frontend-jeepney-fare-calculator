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
import { Subscription } from 'rxjs';

import { VehicleType } from '../../../../shared/models/vehicle-type.models';
import { FareBreakdownComponent } from '../../components/fare-breakdown/fare-breakdown.component';
import { PartySteppersComponent } from '../../components/party-steppers/party-steppers.component';
import { PlaceFieldComponent } from '../../components/place-field/place-field.component';
import { VehicleTypeSelectorComponent } from '../../components/vehicle-type-selector/vehicle-type-selector.component';
import {
  CalculateFareRequest,
  FareBreakdown,
  initialParty,
  PartyCounts,
  passengerTypeOptions,
  Place,
} from '../../models/fare.models';
import { FareService } from '../../services/fare.service';
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
  imports: [FareBreakdownComponent, PartySteppersComponent, PlaceFieldComponent, VehicleTypeSelectorComponent],
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

  protected readonly vehicleType = signal<VehicleType>('TraditionalJeepney');
  protected readonly origin = signal<Place | null>(null);
  protected readonly destination = signal<Place | null>(null);
  protected readonly party = signal<PartyCounts>(initialParty);

  protected readonly result = signal<FareResult | null>(null);
  protected readonly calculating = signal(false);
  protected readonly failed = signal(false);

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

  /** A different Origin is a different trip, so any fare shown no longer applies. */
  protected setOrigin(place: Place | null): void {
    this.origin.set(place);
    this.forgetFare();
  }

  /** A different Destination is a different trip, so any fare shown no longer applies. */
  protected setDestination(place: Place | null): void {
    this.destination.set(place);
    this.forgetFare();
  }

  protected calculate(): void {
    const request = this.buildRequest();
    if (!request || this.calculating()) {
      return;
    }
    const party = this.party();
    this.calculating.set(true);
    this.failed.set(false);

    this.pending = this.fareService
      .calculate(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (breakdown) => {
          this.calculating.set(false);
          this.result.set({ breakdown, vehicleType: request.vehicleType, party });
          this.showResult();
        },
        // The specific reasons a trip can't be priced are a later ticket (#8).
        error: () => {
          this.calculating.set(false);
          this.result.set(null);
          this.failed.set(true);
        },
      });
  }

  private forgetFare(): void {
    this.pending?.unsubscribe();
    this.pending = null;
    this.calculating.set(false);
    this.failed.set(false);
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
