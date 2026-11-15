import { useState, useRef } from "react";
import {
  generateCandidatePoints,
  filterOffRoad,
  filterFarEnough,
  budgetCandidates,
  applyWalkingGate,
  selectDistinctCandidates,
} from "../domain/candidates.js";
import { getWalkingMatrix } from "../services/routingService.js";

/**
 * Orchestrates the geographic candidate finder for the current search:
 *
 *   location + radius + features + pharmacies → find() → top 3 valid
 *
 * The Valhalla matrix call is the ONLY network step here; all rule
 * logic lives in `domain/candidates.js`.
 *
 * A recommendation is tied to the search result set it was computed
 * for: the stored result is matched by reference against the current
 * pharmacies array, so a new search (or "Clear Search", both of which
 * produce a new array reference) automatically invalidates it — no
 * effect, no stale state.
 *
 * Routing failure (Valhalla unreachable) is surfaced as its OWN
 * error state — the walking rule is the authoritative rule and
 * candidates can never be certified without it. Individual missing
 * routes (null cells) are NOT this error: they strictly invalidate
 * the affected candidate inside domain/candidates.js.
 *
 * @param {{ lat: number, lng: number } | null} selectedLocation
 * @param {number} searchRadius - meters
 * @param {Array<object>} features - normalized OSM features (road
 *   sources for the exclusion check)
 * @param {Array<object>} pharmacies - current pharmacy search results
 * @returns {{
 *   recommendation: Array | null,   // null = not computed / invalidated;
 *                                    // [] = ran, none valid
 *   isLoading: boolean,
 *   error: string,
 *   find: () => void,
 *   clear: () => void,
 * }}
 */
export function useCandidateRecommendation(
  selectedLocation,
  searchRadius,
  features,
  pharmacies
) {
  // { forPharmacies, candidates } — the stored answer is only "live"
  // while forPharmacies IS the current pharmacy array.
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const requestIdRef = useRef(0);

  const recommendation =
    result && result.forPharmacies === pharmacies ? result.candidates : null;

  function storeResult(candidates, targetPharmacies = pharmacies) {
    setResult({ forPharmacies: targetPharmacies, candidates });
    setIsLoading(false);
  }

  async function find() {
    const requestId = ++requestIdRef.current;

    setIsLoading(true);
    setError("");

    try {
      const points = generateCandidatePoints(selectedLocation, searchRadius);
      const offRoad = filterOffRoad(points, features);
      const survivable = filterFarEnough(offRoad, pharmacies);
      const budgeted = budgetCandidates(survivable);

      // Zero survivable candidates — the straight-line rule and the
      // road check already rejected everything. No routing needed;
      // walking could only reject more (walking ≥ straight-line).
      if (budgeted.length === 0) {
        storeResult([]);
        return;
      }

      let matrix;

      try {
        matrix = await getWalkingMatrix(budgeted, pharmacies);
      } catch {
        // The walking rule is authoritative: without routes nothing
        // can be certified. A distinct error — not an empty result —
        // because "no valid spots" and "could not be measured" are
        // different situations.
        if (requestId === requestIdRef.current) {
          setError(
            "Walking distances are unavailable, so candidates could not be verified. Please try again."
          );
          setIsLoading(false);
        }

        return;
      }

      if (requestId !== requestIdRef.current) {
        return; // superseded by a newer action
      }

      storeResult(
        selectDistinctCandidates(applyWalkingGate(budgeted, matrix, pharmacies))
      );
    } catch {
      if (requestId === requestIdRef.current) {
        setError("Candidate search failed. Please try again.");
        setIsLoading(false);
      }
    }
  }

  function clear() {
    requestIdRef.current += 1;
    setResult(null);
    setError("");
    setIsLoading(false);
  }

  return { recommendation, isLoading, error, find, clear };
}
