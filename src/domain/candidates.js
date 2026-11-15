/**
 * Geographic Candidate Finder — deterministic prototype logic.
 *
 * Finds up to MAX_RECOMMENDATIONS spots inside the user-selected radius
 * where a new pharmacy would satisfy the two agreed constraints:
 *
 *   1. WALKING ≥ MIN_WALKING_DISTANCE_METERS from every existing
 *      pharmacy (the authoritative rule — never substituted).
 *   2. NOT on a road (off-road check against OSM road centerlines;
 *      mere proximity is allowed).
 *
 * Pipeline (evaluated cheapest-first; the walking rule ALWAYS has the
 * final say):
 *
 *   generateCandidatePoints (pure) — deterministic grid inside the circle
 *   filterOffRoad         (pure)   — road exclusion, secondary hard filter
 *   filterFarEnough       (pure)   — straight-line REJECTION-ONLY
 *                                   prefilter (walking ≥ straight-line
 *                                   guarantees it can never wrongly
 *                                   reject; it never ACCEPTS anyone)
 *   [Valhalla matrix — caller's job, budget-capped]
 *   applyWalkingGate      (pure)   — the real rule: EVERY candidate ↔
 *                                    pharmacy pair must resolve as
 *                                    walking ≥ 100 m; any missing route
 *                                    ⇒ the candidate is INVALID.
 *   selectDistinctCandidates (pure) — greedy mutual-spacing, top 3
 *
 * PURE module: no React, no network, no SDK. All inputs are plain data.
 */

import {
  calculateDistance,
  distanceToPolylineMeters,
  METERS_PER_DEGREE,
} from "../lib/geo.js";

/** Walking-distance minimum to every pharmacy (the EDA rule, meters). */
export const MIN_WALKING_DISTANCE_METERS = 100;

/** Candidates closer than a road centerline than this are on the road. */
export const ROAD_EXCLUSION_METERS = 15;

/** Max candidates that may be certified by the routing matrix. */
export const MAX_ROUTING_BUDGET = 20;

/** How many candidates the finder returns. */
export const MAX_RECOMMENDATIONS = 3;

/** Recommended candidates must be at least this far apart from each other. */
export const MIN_DISTINCT_SPACING = 200;

/**
 * Deterministic square grid inside the selected circle.
 *
 * Spaced so the count stays ~constant (≈50 points) regardless of
 * radius: spacing = radius / 4. Points are generated in row-major
 * order (north → south, west → east) with stable ids, so results and
 * the map are deterministic.
 *
 * @param {{ lat: number, lng: number }} center
 * @param {number} radiusMeters
 * @returns {Array<{ id: string, lat: number, lng: number }>}
 */
export function generateCandidatePoints(center, radiusMeters) {
  if (!center || !(radiusMeters > 0)) {
    return [];
  }

  const spacingMeters = radiusMeters / 4;
  const latStep = spacingMeters / METERS_PER_DEGREE;
  const lngStep =
    spacingMeters / (METERS_PER_DEGREE * Math.cos((center.lat * Math.PI) / 180));

  const rows = [-2, -1, 0, 1, 2];
  const cols = [-2, -1, 0, 1, 2];

  const points = [];

  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < cols.length; c++) {
      const lat = center.lat + rows[r] * latStep;
      const lng = center.lng + cols[c] * lngStep;

      if (calculateDistance({ lat, lng }, center) <= radiusMeters) {
        points.push({ id: `grid-${rows[r]}-${cols[c]}`, lat, lng });
      }
    }
  }

  return points;
}

/**
 * Rejects candidates that sit on a road: a candidate fails when any
 * road's centerline is closer than ROAD_EXCLUSION_METERS. Being NEXT
 * to a road is fine — only ON (within tolerance) a road rejects.
 *
 * @param {Array<{ id: string, lat: number, lng: number }>} points
 * @param {Array<object>} roadFeatures - normalized OSM features (see
 *   services/osmNormalize.js); only `category === "road"` LineStrings
 *   are used, all others are ignored
 * @returns {Array<object>} points that pass the check
 */
export function filterOffRoad(points, roadFeatures, roadExclusionMeters = ROAD_EXCLUSION_METERS) {
  const roads = (
    roadFeatures ?? []
  ).filter(
    (feature) => feature.category === "road" && feature.geometryType === "LineString"
  );

  if (roads.length === 0) {
    return [...(points ?? [])];
  }

  return (points ?? []).filter((point) => {
    for (const road of roads) {
      const distance = distanceToPolylineMeters(point, road.coordinates);

      if (distance !== null && distance < roadExclusionMeters) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Straight-line prefilter against the pharmacy rule. A candidate is
 * REJECTED when its straight-line distance to ANY pharmacy is below
 * MIN_WALKING_DISTANCE_METERS.
 *
 * This is rejection-only: walking distance is always ≥ straight-line,
 * so anything kept here can still be rejected (or accepted) by the
 * walking gate — nothing kept here has passed the rule yet.
 *
 * @param {Array<{ id: string, lat: number, lng: number }>} points
 * @param {Array<{ lat: number, lng: number }>} pharmacies
 * @param {number} [minMeters]
 * @returns {Array<object>} survivors, each annotated with
 *   `straightSeparationMeters: number` for routing-budget ordering
 */
export function filterFarEnough(points, pharmacies, minMeters = MIN_WALKING_DISTANCE_METERS) {
  if (!pharmacies || pharmacies.length === 0) {
    return [];
  }

  const survivors = [];

  for (const point of points ?? []) {
    const minMetersToPoint = pharmacies.reduce(
      (min, pharmacy) => Math.min(min, calculateDistance(point, pharmacy)),
      Infinity
    );

    if (minMetersToPoint >= minMeters) {
      survivors.push({ ...point, straightSeparationMeters: minMetersToPoint });
    }
  }

  return survivors;
}

/**
 * Caps the survivors by straight-line margin (most separated first)
 * down to MAX_ROUTING_BUDGET, so the Valhalla matrix stays within a
 * request budget. The margin here is bookkeeping — no "better/worse"
 * claim is made about the resulting candidates.
 *
 * @param {Array<object>} survivors - output of filterFarEnough
 * @param {number} [budget]
 * @returns {Array<object>} at most `budget` survivors, margin-descending
 */
export function budgetCandidates(survivors, budget = MAX_ROUTING_BUDGET) {
  return (survivors ?? [])
    .slice()
    .sort((a, b) => b.straightSeparationMeters - a.straightSeparationMeters)
    .slice(0, budget);
}

/**
 * THE WALKING RULE. A candidate is valid only when its matrix row
 * resolves a walking route to EVERY pharmacy AND that minimum walking
 * distance is ≥ MIN_WALKING_DISTANCE_METERS.
 *
 * Agreed strictness: any missing route (null) makes the candidate
 * invalid — an uncalculated distance is never assumed valid, whether
 * from a single null cell or a fully failed matrix (a caller with no
 * routing passes an empty/undefined matrix, and nothing survives).
 *
 * @param {Array<object>} candidates - output of budgetCandidates
 * @param {Array<Array<{ distanceMeters: number, durationSeconds: number } | null>>}
 *   matrix - `matrix[s][t]` index-matched to candidates and pharmacies
 * @param {Array<{ id: string, name?: string, lat: number, lng: number }>}
 *   pharmacies - same ordering as the matrix's second dimension
 * @param {number} [minMeters]
 * @returns {Array<object>} valid candidates, each with
 *   `walkingSeparationMeters` and `nearestPharmacyName`
 */
export function applyWalkingGate(candidates, matrix, pharmacies, minMeters = MIN_WALKING_DISTANCE_METERS) {
  const valid = [];

  for (const [index, candidate] of (candidates ?? []).entries()) {
    const row = matrix?.[index] ?? [];

    let nearestMeters = Infinity;
    let nearestIndex = null;
    let allResolved = (pharmacies ?? []).length > 0;

    for (let t = 0; t < (pharmacies ?? []).length; t++) {
      const route = row[t];

      if (!route) {
        allResolved = false;
        break;
      }

      if (route.distanceMeters < nearestMeters) {
        nearestMeters = route.distanceMeters;
        nearestIndex = t;
      }
    }

    if (allResolved && nearestMeters >= minMeters) {
      valid.push({
        ...candidate,
        walkingSeparationMeters: nearestMeters,
        nearestPharmacyName:
          pharmacies[nearestIndex]?.name ?? "Pharmacy",
      });
    }
  }

  return valid;
}

/**
 * Greedy mutual-spacing selection: scanning in input order, a valid
 * candidate is picked only when it is at least MIN_DISTINCT_SPACING
 * from every already-picked candidate. Stop at MAX_RECOMMENDATIONS.
 *
 * The input order (grid scan order) breaks ties — the selection is
 * fully deterministic. Returns fewer than 3 when fewer valid
 * candidates exist; never pads.
 *
 * @param {Array<object>} valid - output of applyWalkingGate
 * @param {number} [maxResults]
 * @param {number} [minSpacingMeters]
 * @returns {Array<object>} up to `maxResults` mutually distinct candidates
 */
export function selectDistinctCandidates(
  valid,
  maxResults = MAX_RECOMMENDATIONS,
  minSpacingMeters = MIN_DISTINCT_SPACING
) {
  const selected = [];

  for (const candidate of valid ?? []) {
    if (selected.length >= maxResults) {
      break;
    }

    const distinct = selected.every(
      (picked) =>
        calculateDistance(picked, candidate) >= minSpacingMeters
    );

    if (distinct) {
      selected.push(candidate);
    }
  }

  return selected;
}
