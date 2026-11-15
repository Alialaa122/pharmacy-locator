import { useState, useRef } from "react";
import {
  generateCandidatePoints,
  partitionOffRoad,
  partitionFarEnough,
  budgetCandidates,
  partitionWalkingGate,
  selectDistinctCandidates,
  summarizeRun,
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
 *   summary: object | null,         // counts of the last run
 *   rejected: Array | null,         // the rejected candidates + reasons
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
  // { forPharmacies, candidates, summary, rejected } — the stored
  // answer is only "live" while forPharmacies IS the current pharmacy
  // array.
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const requestIdRef = useRef(0);

  const isCurrent = result && result.forPharmacies === pharmacies;

  const recommendation = isCurrent ? result.candidates : null;
  const summary = isCurrent ? result.summary : null;
  const rejected = isCurrent ? result.rejected : null;

  function storeResult(candidates, run, targetPharmacies = pharmacies) {
    setResult({
      forPharmacies: targetPharmacies,
      candidates,
      summary: run?.summary ?? null,
      rejected: run?.rejected ?? null,
    });
    setIsLoading(false);
  }

  async function find() {
    const requestId = ++requestIdRef.current;

    setIsLoading(true);
    setError("");

    try {
      const points = generateCandidatePoints(selectedLocation, searchRadius);
      const { kept: offRoad, rejected: roadRejections } = partitionOffRoad(
        points,
        features
      );
      const { kept: survivable, rejected: distanceRejections } =
        partitionFarEnough(offRoad, pharmacies);
      const budgeted = budgetCandidates(survivable);
      const notEvaluated = survivable.length - budgeted.length;

      const rejectedSoFar = [...roadRejections, ...distanceRejections];

      // Zero survivable candidates — the straight-line rule and the
      // road check already rejected everything. No routing needed;
      // walking could only reject more (walking ≥ straight-line).
      if (budgeted.length === 0) {
        storeResult([], {
          rejected: rejectedSoFar,
          summary: summarizeRun({
            generated: points.length,
            rejected: rejectedSoFar,
            notEvaluated,
            valid: 0,
            selected: 0,
          }),
        });

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

      const { valid, rejected: gateRejections } = partitionWalkingGate(
        budgeted,
        matrix,
        pharmacies
      );

      const allRejected = [...rejectedSoFar, ...gateRejections];
      const selected = selectDistinctCandidates(valid);

      storeResult(selected, {
        rejected: allRejected,
        summary: summarizeRun({
          generated: points.length,
          rejected: allRejected,
          notEvaluated,
          valid: valid.length,
          selected: selected.length,
        }),
      });
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

  return {
    recommendation,
    summary,
    rejected,
    isLoading,
    error,
    find,
    clear,
  };
}
