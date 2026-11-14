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

/**
 * Area-weighted centroid of a closed [lon, lat] ring, returned as
 * [lon, lat]. Planar approximation — accurate enough for building
 * footprints at city scale.
 *
 * @param {Array<[number, number]>} ring - closed polygon ring
 *   (the last point repeats the first, as in the OSM normalizer output)
 * @returns {[number, number] | null} [longitude, latitude], or null for
 *   degenerate rings (fewer than 3 points / zero area)
 */
export function polygonCentroid(ring) {
  if (!ring || ring.length < 3) {
    return null;
  }

  // Drop the closing duplicate — polygon area math needs an open
  // vertex sequence with the wrap-around edge applied.
  const points =
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring;

  if (points.length < 3) {
    return null;
  }

  // Translate the ring so it sits near the origin before the shoelace
  // math: building coordinates (~30° in absolute degrees) would
  // otherwise cancel catastrophically against areas of ~1e-6.
  const [originLon, originLat] = points[0];
  const shifted = points.map(
    ([lon, lat]) => [lon - originLon, lat - originLat]
  );

  let area = 0;
  let centroidLon = 0;
  let centroidLat = 0;

  for (let i = 0; i < shifted.length; i++) {
    const [x0, y0] = shifted[i];
    const [x1, y1] = shifted[(i + 1) % shifted.length];

    const cross = x0 * y1 - x1 * y0;

    area += cross;
    centroidLon += (x0 + x1) * cross;
    centroidLat += (y0 + y1) * cross;
  }

  area /= 2;

  // Zero-area ring (collinear points) — not a real building footprint.
  if (Math.abs(area) < 1e-12) {
    return null;
  }

  return [
    centroidLon / (6 * area) + originLon,
    centroidLat / (6 * area) + originLat,
  ];
}

/**
 * Midpoint of a [lon, lat] polyline, returned as [lon, lat].
 *
 * For an open line (a road) it returns the middle vertex; for a closed
 * ring it returns the ring's first vertex (a deterministic "anchor"
 * point — the recommender only needs one representative spot per line).
 *
 * @param {Array<[number, number]>} coordinates - [lon, lat] sequence
 * @returns {[number, number] | null} [longitude, latitude], or null
 *   when the line has fewer than 2 points
 */
export function lineMidpoint(coordinates) {
  if (!coordinates || coordinates.length < 2) {
    return null;
  }

  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];

  const isClosed = first[0] === last[0] && first[1] === last[1];

  if (isClosed) {
    return first;
  }

  const midIndex = Math.floor((coordinates.length - 1) / 2);

  return coordinates[midIndex];
}
