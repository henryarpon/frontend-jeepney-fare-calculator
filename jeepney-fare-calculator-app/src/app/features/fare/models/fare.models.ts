import { FareMatrixRow } from '../../../shared/models/fare-matrix-row.models';
import { VehicleType } from '../../../shared/models/vehicle-type.models';

/** Mirrors the back end's `PassengerType` enum, sent and received by name. */
export type PassengerType = 'Regular' | 'Student' | 'SeniorCitizen' | 'Pwd';

/**
 * The passenger types in breakdown order, with their display names. Each keeps one
 * fixed colour mark (`mark`), used in its stepper and in its breakdown row.
 */
export const passengerTypeOptions: readonly { value: PassengerType; label: string; mark: string }[] = [
  { value: 'Regular', label: 'Regular', mark: 'regular' },
  { value: 'Student', label: 'Student', mark: 'student' },
  { value: 'SeniorCitizen', label: 'Senior Citizen', mark: 'senior-citizen' },
  { value: 'Pwd', label: 'PWD', mark: 'pwd' },
];

export function passengerTypeOption(passengerType: PassengerType): (typeof passengerTypeOptions)[number] {
  return passengerTypeOptions.find((option) => option.value === passengerType) ?? passengerTypeOptions[0];
}

/** How many passengers of each passenger type are in the Party. */
export type PartyCounts = Record<PassengerType, number>;

/** Each passenger type allows 0 to 30, and the Party must have 1 to 30 in total. */
export const maxPerPassengerType = 30;
export const minPartySize = 1;
export const maxPartySize = 30;

/** A new Party: one Regular passenger. */
export const initialParty: PartyCounts = { Regular: 1, Student: 0, SeniorCitizen: 0, Pwd: 0 };

export function partySize(party: PartyCounts): number {
  return passengerTypeOptions.reduce((total, option) => total + party[option.value], 0);
}

/** A point picked from place search: its name and where it is. */
export interface Place {
  /** Unique per place, for tracking lists. */
  id: string;
  /** A readable name such as "Quiapo Church, Manila". It can be long. */
  label: string;
  lat: number;
  lng: number;
}

/** Place suggestions start after this many characters, so short queries don't flood Photon. */
export const minQueryLength = 3;

/**
 * Where a place search is: `idle` (nothing typed, or too little), `searching`,
 * `done` (suggestions are in, possibly none) or `failed` (Photon couldn't be reached).
 */
export type PlaceSearchStatus = 'idle' | 'searching' | 'done' | 'failed';

/** The live suggestions for one search field (Origin or Destination). */
export interface PlaceSearch {
  readonly suggestions: () => Place[];
  readonly status: () => PlaceSearchStatus;
  /** Call on every keystroke; a search is sent after a pause in typing. */
  query(text: string): void;
}

/** Body of `POST /api/fares/calculate` (mirrors `CalculateFareRequest`). */
export interface CalculateFareRequest {
  vehicleType: VehicleType;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  party: { passengerType: PassengerType; count: number }[];
}

/** One passenger type's share of the Total Fare (mirrors `FareLineDto`). */
export interface FareLine {
  passengerType: PassengerType;
  regularFare: number;
  discount: number;
  farePerPassenger: number;
  count: number;
  subtotal: number;
}

export type { FareMatrixRow } from '../../../shared/models/fare-matrix-row.models';

/**
 * Why a calculation gave no fare. The app never makes up a fare instead.
 * - `not-priced`: 422, the trip can't be priced. `detail` is the back end's message for the
 *   commuter, saying why and what to try next (`null` if it sent none).
 * - `invalid-request`: 400, with the back end's error messages.
 * - `distance-unavailable`: 503, the routing provider is down or out of quota.
 * - `offline`: the back end couldn't be reached at all, e.g. no mobile data.
 * - `unexpected`: anything else.
 */
export type FareProblem =
  | { kind: 'not-priced'; detail: string | null }
  | { kind: 'invalid-request'; errors: string[] }
  | { kind: 'distance-unavailable' }
  | { kind: 'offline' }
  | { kind: 'unexpected' };

/** Body of a successful `POST /api/fares/calculate` (mirrors `FareBreakdownDto`). */
export interface FareBreakdown {
  /** The Estimated Distance in km, to 1 decimal place. */
  estimatedDistanceKm: number;
  /** The Charged Distance in whole km. */
  chargedDistanceKm: number;
  /** One line per passenger type with at least one passenger, Regular first. */
  lines: FareLine[];
  totalFare: number;
  fareMatrixVersion: {
    id: number;
    /** ISO 8601 date and time in UTC. */
    uploadedAt: string;
    note: string | null;
  };
  /** The charged row with the row before and after it, where the matrix has them. */
  matrixExcerpt: FareMatrixRow[];
}
