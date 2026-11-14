/**
 * Display formatting — the only place that converts raw app units
 * (meters / seconds) into user-facing strings. Components must not
 * do their own unit arithmetic (no `* 1000`, no `/ 60` inline).
 *
 * Callers are responsible for null checks; these functions assume numbers.
 */

/**
 * Formats a distance in meters, e.g. 810 -> "810 m", 12345 -> "12,345 m".
 */
export function formatDistance(meters) {
  return `${Math.round(meters).toLocaleString("en-US")} m`;
}

/**
 * Formats a walking duration in seconds to whole minutes, rounded up,
 * e.g. 150 -> "3 min".
 */
export function formatDuration(seconds) {
  return `${Math.ceil(seconds / 60)} min`;
}

/**
 * Formats the search radius, e.g. 500 -> "500 m", 2000 -> "2 km".
 */
export function formatRadius(meters) {
  return meters >= 1000 ? `${meters / 1000} km` : `${meters} m`;
}
