/**
 * Session-scoped cache for the OSM features of an area.
 *
 * The Overpass data for a given centre and radius does not change
 * while the session runs, so re-visiting the same area should not
 * cost another request. This is the one stateful module in `lib/` —
 * it holds no React and makes no network calls of its own.
 *
 * The cache is keyed by the rounded centre and the exact radius. A
 * cached area is only reused for the SAME radius: reusing a larger
 * area for a smaller radius would leak features outside the requested
 * circle into the statistics.
 */

const CACHE_LIMIT = 12;

/** key -> { radius, features } */
const entries = new Map();

function cacheKey(lat, lng, radius) {
  return `${lat.toFixed(5)},${lng.toFixed(5)},${radius}`;
}

/**
 * Returns the cached features for an exact centre/radius match.
 *
 * @param {{ lat: number, lng: number }} center
 * @param {number} radius - meters
 * @returns {Array | null} the cached features, or null when absent
 */
export function getCachedFeatures(center, radius) {
  const entry = entries.get(cacheKey(center.lat, center.lng, radius));

  return entry ? entry.features : null;
}

/**
 * Stores the features of an area, evicting the oldest entry when the
 * cache is full.
 *
 * @param {{ lat: number, lng: number }} center
 * @param {number} radius - meters
 * @param {Array} features
 */
export function setCachedFeatures(center, radius, features) {
  const key = cacheKey(center.lat, center.lng, radius);

  entries.delete(key);
  entries.set(key, { radius, features });

  while (entries.size > CACHE_LIMIT) {
    const oldest = entries.keys().next().value;

    entries.delete(oldest);
  }
}

/** Empties the cache (used by tests). */
export function clearFeatureCache() {
  entries.clear();
}
