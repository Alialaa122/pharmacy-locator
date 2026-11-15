const VALHALLA_URL =
  "https://valhalla1.openstreetmap.de/sources_to_targets";

// The Valhalla service caps a matrix call at 100 CELLS, i.e.
// sources.length x targets.length <= 100 (probed live: 1x100/10x10/
// 20x5 → 200; 1x101/10x11/10x20 → 400 "Exceeded max locations").
// We chunk the TARGETS to stay under the cap and merge the rows back
// into one matrix.
const VALHALLA_MAX_CELLS = 100;

/**
 * Walking distance/time matrix from many sources to many targets, via
 * the Valhalla matrix API. This is the ONLY module that knows about
 * Valhalla (its URL, request shape, response limit, and index-based
 * response matching).
 *
 * @param {Array<{ lat: number, lng: number }>} sources - plain coordinates
 * @param {Array<{ lat: number, lng: number }>} targets - plain coordinates
 * @returns {Promise<Array<Array<{ distanceMeters: number, durationSeconds: number } | null>>>}
 *   `matrix[s][t]` is index-matched to sources and targets; null = no route.
 */
export async function getWalkingMatrix(sources, targets) {
  // With 10 sources (the recommender's MAX_CERTIFY budget) each chunk
  // carries ≤ 10 targets — at most 2 requests for the full pharmacy
  // list. With 1 source (the pharmacy search pipeline) it's one
  // request up to 100 targets.
  const maxTargetsPerRequest = Math.max(
    1,
    Math.floor(VALHALLA_MAX_CELLS / sources.length)
  );

  const matrix = sources.map(() => new Array(targets.length).fill(null));

  for (let offset = 0; offset < targets.length; offset += maxTargetsPerRequest) {
    const chunk = targets.slice(offset, offset + maxTargetsPerRequest);

    const response = await fetch(VALHALLA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sources: sources.map((source) => ({
          lat: source.lat,
          lon: source.lng, // Valhalla's API field name is "lon"
        })),
        targets: chunk.map((target) => ({
          lat: target.lat,
          lon: target.lng,
        })),
        costing: "pedestrian",
        units: "kilometers",
      }),
    });

    if (!response.ok) {
      throw new Error("Valhalla Matrix request failed");
    }

    const data = await response.json();

    data.sources_to_targets.forEach((routes, s) => {
      routes.forEach((route, c) => {
        if (route) {
          matrix[s][offset + c] = {
            // Valhalla returns distance in kilometers (units:
            // "kilometers"); the app convention is meters, so convert
            // at the boundary.
            distanceMeters: route.distance * 1000,
            durationSeconds: route.time,
          };
        }
      });
    });
  }

  return matrix;
}

/**
 * Walking distance/time from ONE source to many targets. Thin wrapper
 * around getWalkingMatrix — the pharmacy search pipeline (step 10 and
 * earlier) consumes this one-source shape.
 *
 * @param {{ lat: number, lng: number }} source
 * @param {Array<{ lat: number, lng: number }>} targets
 * @returns {Promise<Array<{ distanceMeters: number, durationSeconds: number } | null>>}
 *   Results are index-matched to the targets array; null = no route.
 */
export async function getWalkingRoutes(source, targets) {
  const [routes] = await getWalkingMatrix([source], targets);
  return routes;
}
