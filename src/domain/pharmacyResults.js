import { calculateDistance } from "../lib/geo.js";

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
