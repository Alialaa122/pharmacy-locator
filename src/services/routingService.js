const VALHALLA_URL =
  "https://valhalla1.openstreetmap.de/sources_to_targets";

/**
 * Walking distance/time from one source to many targets, via the
 * Valhalla matrix API. This is the ONLY module that knows about
 * Valhalla (its URL, request shape, and index-based response matching).
 *
 * @param {{ lat: number, lng: number }} source
 * @param {Array<{ lat: number, lng: number }>} targets - plain coordinates
 * @returns {Promise<Array<{ distanceMeters: number, durationSeconds: number } | null>>}
 *   Results are index-matched to the targets array; null = no route.
 */
export async function getWalkingRoutes(source, targets) {
  const response = await fetch(VALHALLA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sources: [
        {
          lat: source.lat,
          lon: source.lng,
        },
      ],
      targets: targets.map((target) => ({
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

  const routes = data.sources_to_targets[0];

  return routes.map((route) =>
    route
      ? {
          // Valhalla returns distance in kilometers (units: "kilometers");
          // the app convention is meters, so convert at the boundary.
          distanceMeters: route.distance * 1000,
          durationSeconds: route.time,
        }
      : null,
  );
}
