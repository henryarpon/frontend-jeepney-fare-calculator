/** Mirrors the back end's `VehicleType` enum, sent and received by name. */
export type VehicleType = 'TraditionalJeepney' | 'ModernJeepney';

/** The vehicle types in the order the Administrator picks from, with their display names. */
export const vehicleTypeOptions: readonly { value: VehicleType; label: string }[] = [
  { value: 'TraditionalJeepney', label: 'Traditional Jeepney' },
  { value: 'ModernJeepney', label: 'Modern Jeepney' },
];

export function vehicleTypeLabel(vehicleType: VehicleType): string {
  return vehicleTypeOptions.find((option) => option.value === vehicleType)?.label ?? vehicleType;
}

/** One row of a fare matrix (mirrors `FareMatrixRowDto`). */
export interface FareMatrixRow {
  distanceKm: number;
  regularFare: number;
  discountedFare: number;
}

/** Body of `POST /api/admin/fare-matrices/preview` (mirrors `FareMatrixPreview`). */
export interface FareMatrixPreview {
  vehicleType: VehicleType;
  rows: FareMatrixRow[];
}

/**
 * One Fare Matrix Version without its rows (mirrors `FareMatrixVersionSummary`): an item of
 * `GET /api/admin/fare-matrices`, and the body of a successful upload.
 */
export interface FareMatrixVersionSummary {
  id: number;
  vehicleType: VehicleType;
  /** ISO 8601 date and time in UTC. */
  uploadedAt: string;
  note: string | null;
  isActive: boolean;
  rowCount: number;
}
