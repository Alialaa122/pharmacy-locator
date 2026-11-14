import { useState, useRef } from "react";
import {
  buildCandidateSites,
  prefilterCandidates,
  rankCandidates,
} from "../domain/candidates.js";
import { getWalkingMatrix } from "../services/routingService.js";

/**
 * Orchestrates the candidate recommendation pipeline for the current
 * search results:
 *
 *   features + pharmacies  →  recommend()  →  recommendation (top 3)
 *
 * The routing call (Valhalla) is the ONLY thing that happens here; all
 * rule logic lives in `domain/candidates.js`.
 *
 * A recommendation is tied to the search result set it was computed
 * for: the stored result is matched by reference against the current
 * pharmacies array, so a new search (or "Clear Search", both of which
 * produce a new array reference) automatically invalidates it — no
 * effect, no stale state.
 *
 * @param {Array<object>} features - normalized OSM features for the
 *   selected location/radius (from useGeographicFeatures)
 * @param {Array<object>} pharmacies - current pharmacy search results
 * @returns {{
 *   recommendation: Array | null,   // null = not computed / invalidated;
 *                                    // [] = ran, none eligible
 *   isLoading: boolean,
 *   error: string,
 *   recommend: () => void,
 *   clear: () => void,
 * }}
 */
export function useCandidateRecommendation(features, pharmacies) {
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

  async function recommend() {
    const requestId = ++requestIdRef.current;

    setIsLoading(true);
    setError("");

    try {
      const candidates = prefilterCandidates(
        buildCandidateSites(features),
        pharmacies
      );

      if (candidates.length === 0) {
        storeResult([]);
        return;
      }

      let matrix;

      try {
        matrix = await getWalkingMatrix(candidates, pharmacies);
      } catch {
        // Agreed (ARCHITECTURE.md §9): routing failure degrades
        // gracefully — rank by straight-line separation, flagged
        // walkingVerified: false.
        matrix = candidates.map(() => []);
      }

      if (requestId !== requestIdRef.current) {
        return; // superseded by a newer action
      }

      storeResult(rankCandidates(candidates, matrix, pharmacies));
    } catch {
      if (requestId === requestIdRef.current) {
        setError("Recommendation failed. Please try again.");
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

  return { recommendation, isLoading, error, recommend, clear };
}
