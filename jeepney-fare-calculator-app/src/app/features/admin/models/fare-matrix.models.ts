import { FareMatrixRow } from '../../../shared/models/fare-matrix-row.models';
import { VehicleType } from '../../../shared/models/vehicle-type.models';

// The commuter page uses vehicle types and fare matrix rows too, so they live in `shared`.
export { vehicleTypeLabel, vehicleTypeOptions } from '../../../shared/models/vehicle-type.models';
export type { VehicleType } from '../../../shared/models/vehicle-type.models';
export type { FareMatrixRow } from '../../../shared/models/fare-matrix-row.models';

/** Body of `POST /api/admin/fare-matrices/preview` (mirrors `FareMatrixPreview`). */
export interface FareMatrixPreview {
  vehicleType: VehicleType;
  rows: FareMatrixRow[];
}

/**
 * One reason the back end rejected a fare matrix file (mirrors `FareMatrixFileError`).
 * A rejection is a 400 ProblemDetails that lists every one under `rowErrors`.
 */
export interface FareMatrixFileError {
  /** The row of the file, counting the header as row 1; `null` when it is about the whole file. */
  row: number | null;
  /** The column, e.g. `RegularFare`; `null` when it is about the whole row or file. */
  column: string | null;
  message: string;
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

/** Body of `GET /api/admin/fare-matrices/{id}`: one Fare Matrix Version with its rows (mirrors `FareMatrixVersionDetails`). */
export interface FareMatrixVersionDetails {
  id: number;
  vehicleType: VehicleType;
  /** ISO 8601 date and time in UTC. */
  uploadedAt: string;
  note: string | null;
  isActive: boolean;
  rows: FareMatrixRow[];
}
