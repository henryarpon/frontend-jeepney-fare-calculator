/** Mirrors the back end's `VehicleType` enum, sent and received by name. */
export type VehicleType = 'TraditionalJeepney' | 'ModernJeepney';

/** The vehicle types in the order they are picked from, with their display names. */
export const vehicleTypeOptions: readonly { value: VehicleType; label: string }[] = [
  { value: 'TraditionalJeepney', label: 'Traditional Jeepney' },
  { value: 'ModernJeepney', label: 'Modern Jeepney' },
];

export function vehicleTypeLabel(vehicleType: VehicleType): string {
  return vehicleTypeOptions.find((option) => option.value === vehicleType)?.label ?? vehicleType;
}
