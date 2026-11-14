/**
 * Deterministic candidate recommendation (step 11 — logic only).
 *
 * Proposes up to MAX_RECOMMENDATIONS spots where a new pharmacy would
 * COMPLY with the EDA 100 m rule measured against every existing
 * pharmacy. Pipeline:
 *
 *   buildCandidateSites → prefilterCandidates → [Valhalla matrix —
 *   caller's job]        → rankCandidates
 *
 * The rule is re-derived from `domain/eligibility.js` primitives
 * (`classifySeparation` for bands) against the FULL pharmacy list —
 * this module deliberately never reads the verdict state, which
 * certifies only the single clicked location.
 *
 * Geometric fact the prefilter relies on: walking ≥ straight-line, so
 * a candidate ≥ MIN_SEPARATION_METERS straight-line from EVERY pharmacy
 * automatically passes the EDA rule on the walking measure.
 *
 * PURE module: no React, no network, no SDK. All inputs are plain data.
 */

import {
  calculateDistance,
  polygonCentroid,
  lineMidpoint,
} from "../lib/geo.js";
import { classifySeparation } from "./eligibility.js";

/** Minimum straight-line separation (m) to every pharmacy — the EDA gate. */
export const MIN_SEPARATION_METERS = 100;

/** Max number of candidates certified by a single routing call. */
export const MAX_CERTIFY = 10;

/** How many candidates the recommender returns. */
export const MAX_RECOMMENDATIONS = 3;

/** Sites closer than this are duplicates; a building wins the tie. */
const DUPLICATE_DISTANCE_METERS = 10;

/**
 * Builds candidate sites from normalized OSM features:
 * building polygons → centroid, road lines → midpoint.
 *
 * @param {Array<object>} features - normalized features (see
 *   services/osmNormalize.js):
 *   { id, category, geometryType, name, coordinates }
 * @returns {Array<{ id: string, kind: "building"|"road",
 *   label: string, lat: number, lng: number }>}
 *   Sites closer than DUPLICATE_DISTANCE_METERS are deduplicated; a
 *   building beats a road on overlap.
 */
export function buildCandidateSites(features) {
  const rawSites = [];

  for (const feature of features ?? []) {
    let position = null;

    if (
      feature.category === "building" &&
      feature.geometryType === "Polygon"
    ) {
      const ring = feature.coordinates?.[0];
      position = polygonCentroid(ring);
    } else if (
      feature.category === "road" &&
      feature.geometryType === "LineString"
    ) {
      position = lineMidpoint(feature.coordinates);
    }

    if (!position) {
      continue;
    }

    rawSites.push({
      id: feature.id,
      kind: feature.category === "building" ? "building" : "road",
      label: feature.name ?? (
        feature.category === "building" ? "Building" : "Road"
      ),
      lat: position[1],
      lng: position[0],
    });
  }

  return deduplicateSites(rawSites);
}

function deduplicateSites(sites) {
  const result = [];

  for (const site of sites) {
    const existing = result.find(
      (candidate) =>
        calculateDistance(candidate, site) < DUPLICATE_DISTANCE_METERS
    );

    if (!existing) {
      result.push(site);
    } else if (site.kind === "building" && existing.kind === "road") {
      // A building footprint is a better "where to open" answer than
      // the middle of a street, so it replaces the road site in place
      // (keeps the site's position in the list stable).
      Object.assign(existing, site);
    }
    // road overlapping a building, or same-kind overlap: first one
    // wins — deterministic.
  }

  return result;
}

/**
 * Applies the EDA hard gate: a site survives only if its STRAIGHT-LINE
 * distance to EVERY pharmacy is ≥ MIN_SEPARATION_METERS. Survivors are
 * sorted by that margin DESCENDING (most separated first) and capped
 * at MAX_CERTIFY — the routing budget.
 *
 * @param {Array<object>} sites - output of buildCandidateSites
 * @param {Array<{ lat: number, lng: number }>} pharmacies
 * @returns {Array<object>} gated sites, each annotated with
 *   `straightSeparationMeters` (min over all pharmacies); capped at
 *   MAX_CERTIFY
 */
export function prefilterCandidates(sites, pharmacies) {
  if (!sites || !pharmacies || pharmacies.length === 0) {
    return [];
  }

  const gated = [];

  for (const site of sites) {
    const minMeters = pharmacies.reduce(
      (min, pharmacy) => Math.min(min, calculateDistance(site, pharmacy)),
      Infinity
    );

    if (minMeters >= MIN_SEPARATION_METERS) {
      gated.push({ ...site, straightSeparationMeters: minMeters });
    }
  }

  return gated
    .sort(
      (a, b) => b.straightSeparationMeters - a.straightSeparationMeters
    )
    .slice(0, MAX_CERTIFY);
}

/**
 * Ranks prefiltered candidates with walking distances and certifies
 * the EDA band per candidate (reuses `classifySeparation`).
 *
 * Candidates without any walking route degrade gracefully: they keep
 * their straight-line separation, get `walkingVerified: false` and no
 * band, and are sorted after every walking-verified candidate.
 *
 * @param {Array<object>} candidates - output of prefilterCandidates
 * @param {Array<Array<{ distanceMeters: number, durationSeconds: number } | null>>}
 *   matrix - `matrix[s][t]` for candidate index s vs pharmacy index t
 *   (see services/routingService.getWalkingMatrix)
 * @param {Array<{ id: string, name?: string }>} pharmacies - same
 *   ordering as the matrix's second dimension
 * @returns {Array<object>} up to MAX_RECOMMENDATIONS candidates, each
 *   with `band` (eligibility band object or null), `separationMeters`,
 *   `separationBasis: "walking"|"straight"`, `nearestCompetition:
 *   { name: string } | null`, `walkingVerified: boolean`
 */
export function rankCandidates(candidates, matrix, pharmacies) {
  if (!candidates || candidates.length === 0) {
    return [];
  }

  const ranked = candidates.map((candidate, index) => {
    const row = matrix?.[index] ?? [];

    let nearestIndex = null;
    let nearestMeters = Infinity;

    for (let t = 0; t < row.length; t++) {
      const route = row[t];

      if (route && route.distanceMeters < nearestMeters) {
        nearestMeters = route.distanceMeters;
        nearestIndex = t;
      }
    }

    const walkingVerified = nearestIndex !== null;

    return {
      ...candidate,
      walkingVerified,
      separationMeters: walkingVerified
        ? nearestMeters
        : candidate.straightSeparationMeters,
      separationBasis: walkingVerified ? "walking" : "straight",
      band: walkingVerified
        ? (classifySeparation(nearestMeters) ?? null)
        : null,
      nearestCompetition:
        walkingVerified && pharmacies?.[nearestIndex]
          ? { name: pharmacies[nearestIndex].name ?? "Pharmacy" }
          : null,
    };
  });

  return ranked
    .sort((a, b) => {
      // Walking-verified always outranks degraded; within each group
      // the larger separation is the better spot.
      if (a.walkingVerified !== b.walkingVerified) {
        return a.walkingVerified ? -1 : 1;
      }
      return b.separationMeters - a.separationMeters;
    })
    .slice(0, MAX_RECOMMENDATIONS);
}

/**
 * Orchestrates the full pipeline. The Valhalla matrix is a CALLER
 * dependency: the caller must have routed the prefiltered candidates
 * against the pharmacies (same ordering) before calling this — kept
 * out of the pure pipeline so the domain layer stays free of network
 * knowledge.
 *
 * @param {Array<object>} features - normalized OSM features
 * @param {Array<{ lat, lng, id, name }> } pharmacies - search results
 * @param {Array<Array<{ distanceMeters, durationSeconds } | null>>} matrix
 *   Valhalla matrix over the PREFILTERED candidates (in the exact
 *   order `prefilterCandidates(features, pharmacies)` returns them)
 *   and the pharmacy list.
 * @returns {Array<object>} same shape as `rankCandidates` output
 */
export function recommendLocations(features, pharmacies, matrix) {
  const sites = buildCandidateSites(features);
  const prefiltered = prefilterCandidates(sites, pharmacies);

  return rankCandidates(prefiltered, matrix, pharmacies);
}
