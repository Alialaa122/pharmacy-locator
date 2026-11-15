import { calculateDistance } from "../lib/geo.js";

/**
 * The display name of a pharmacy.
 *
 * Some places come back from the Places API without a display name.
 * The address is real source data, so it is used as the fallback — the
 * name is never left empty and never invented. "Unnamed pharmacy" is
 * the last resort, when the place has neither.
 *
 * @param {{ name?: string, address?: string }} pharmacy
 * @returns {string}
 */
export function pharmacyDisplayName(pharmacy) {
  const name = pharmacy?.name?.trim();
  const address = pharmacy?.address?.trim();

  if (name) {
    return name;
  }

  if (address) {
    return address;
  }

  return "Unnamed pharmacy";
}

/**
 * Combines plain pharmacies, direct distances, and walking routes into
 * the final result list shown to the user. Pure function — no network,
 * no React, no SDK objects.
 *
 * @param {Array<{ id: string, name: string, address: string, lat: number, lng: number }>} pharmacies
 * @param {{ lat: number, lng: number }} source - the selected map location
 * @param {Array<{ distanceMeters: number, durationSeconds: number } | null>} walkingRoutes
 *   index-matched to pharmacies; may be empty or contain nulls
 * @returns {Array<{
 *   id: string, name: string, address: string, lat: number, lng: number,
 *   directDistanceMeters: number,
 *   walkingDistanceMeters: number | null,
 *   walkingDurationSeconds: number | null,
 * }>} sorted by walking distance ascending, entries without a route last
 */
export function assemblePharmacyResults(pharmacies, source, walkingRoutes) {
  const results = pharmacies.map((pharmacy, index) => {
    const route = walkingRoutes?.[index] ?? null;

    return {
      ...pharmacy,
      name: pharmacyDisplayName(pharmacy),
      directDistanceMeters: calculateDistance(source, pharmacy),
      walkingDistanceMeters: route ? route.distanceMeters : null,
      walkingDurationSeconds: route ? route.durationSeconds : null,
    };
  });

  results.sort((a, b) => {
    if (a.walkingDistanceMeters === null) return 1;
    if (b.walkingDistanceMeters === null) return -1;

    return a.walkingDistanceMeters - b.walkingDistanceMeters;
  });

  return results;
}
