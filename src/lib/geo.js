function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Great-circle distance between two points, in METERS (haversine formula).
 * Pure math — knows nothing about Google, Valhalla, or OSM.
 *
 * @param {{ lat: number, lng: number }} point1
 * @param {{ lat: number, lng: number }} point2
 * @returns {number} distance in meters
 */
export function calculateDistance(point1, point2) {
  const R = 6371000; // Earth's radius in meters

  const lat1 = toRadians(point1.lat);
  const lat2 = toRadians(point2.lat);

  const deltaLat = toRadians(point2.lat - point1.lat);
  const deltaLng = toRadians(point2.lng - point1.lng);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) ** 2;

  const c = 2 * Math.atan2(
    Math.sqrt(a),
    Math.sqrt(1 - a)
  );

  return R * c;
}

/**
 * Converts an OSM/GeoJSON coordinate ring ([longitude, latitude] pairs)
 * into Google Maps positions ({ lat, lng } objects), flipping the axis order.
 *
 * @param {Array<[number, number]>} coordinates - [lon, lat] pairs
 * @returns {Array<{ lat: number, lng: number }>}
 */
export function convertCoordinates(coordinates) {
  return coordinates.map(([longitude, latitude]) => ({
    lat: latitude,
    lng: longitude,
  }));
}

/** Earth circumference per degree, in meters (2πR/360, R = 6 371 000). */
export const METERS_PER_DEGREE = (2 * Math.PI * 6371000) / 360;

/**
 * Shortest distance from a point to a [lon, lat] polyline, in METERS.
 *
 * Planar approximation: all coordinates are projected onto a flat
 * local plane anchored at the polyline's first vertex, with longitude
 * scaled by cos(origin latitude) so degrees become comparable in
 * both axes. Accurate at city scale (tens of km at most).
 *
 * @param {{ lat: number, lng: number }} point
 * @param {Array<[number, number]>} coordinates - [lon, lat] sequence
 * @returns {number | null} minimum distance in meters, or null for
 *   degenerate input (missing point / fewer than 2 vertices)
 */
export function distanceToPolylineMeters(point, coordinates) {
  if (!point || !coordinates || coordinates.length < 2) {
    return null;
  }

  const [originLon, originLat] = coordinates[0];
  const cosLat = Math.cos(toRadians(originLat));

  const project = ([lon, lat]) => [
    (lon - originLon) * cosLat * METERS_PER_DEGREE,
    (lat - originLat) * METERS_PER_DEGREE,
  ];

  const [px, py] = project([point.lng, point.lat]);

  let minMeters = Infinity;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const [ax, ay] = project(coordinates[i]);
    const [bx, by] = project(coordinates[i + 1]);

    const abx = bx - ax;
    const aby = by - ay;

    // Squared segment length (0 for a collapsed segment — the clamped
    // clamp below then yields the endpoint).
    const abLengthSq = abx * abx + aby * aby;

    const t =
      abLengthSq === 0
        ? 0
        : Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / abLengthSq));

    const dx = px - (ax + t * abx);
    const dy = py - (ay + t * aby);

    minMeters = Math.min(minMeters, Math.hypot(dx, dy));
  }

  return minMeters;
}
