/** One row of a fare matrix (mirrors `FareMatrixRowDto`). */
export interface FareMatrixRow {
  distanceKm: number;
  regularFare: number;
  discountedFare: number;
}
