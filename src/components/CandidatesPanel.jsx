import { formatDistance } from "../lib/format.js";

/**
 * Display-only geographic candidate finder panel: the trigger button
 * and up to 3 verified valid candidates. No commercial ranking — the
 * candidates are all equally "valid" (both constraints pass); they are
 * just mutually distinct spots.
 *
 * @param {{
 *   canRecommend: boolean,      // a search result set exists to find against
 *   recommendation: Array | null, // null = not run; [] = ran, none valid
 *   isLoading: boolean,
 *   error: string,
 *   selectedCandidateIndex: number | null,
 *   onFind: () => void,
 *   onClear: () => void,
 *   onSelectCandidate: (index: number) => void,
 * }} props
 */
function CandidatesPanel({
  canRecommend,
  recommendation,
  isLoading,
  error,
  selectedCandidateIndex,
  onFind,
  onClear,
  onSelectCandidate,
}) {
  const hasRun = recommendation !== null;

  return (
    <div className="candidates-panel">
      <h2>Location Finder</h2>

      <button
        className="recommend-button"
        onClick={onFind}
        disabled={!canRecommend || isLoading}
      >
        {isLoading ? "Checking locations..." : "Search for locations"}
      </button>

      <p className="candidates-note">
        Finds up to 3 valid spots inside your selected radius — at
        least 100 m walking distance from every found pharmacy and not
        on a road — each at least 200 m from the others.
      </p>

      {error && <p className="error-message">{error}</p>}

      {hasRun && recommendation.length === 0 && (
        <p className="candidates-empty">
          No valid spots found in this radius — all checked locations
          were either on a road or too close (straight-line) to an
          existing pharmacy.
        </p>
      )}

      {recommendation?.map((candidate, index) => (
        <div
          className={
            index === selectedCandidateIndex
              ? "candidate-card candidate-selected"
              : "candidate-card"
          }
          key={candidate.id}
          onClick={() => onSelectCandidate(index)}
        >
          <div className="candidate-header">
            <span className="candidate-rank">{index + 1}</span>
            <h3>Candidate spot</h3>
          </div>

          <p className="candidate-kind">
            Verified: 100+ m walking distance from all pharmacies
          </p>

          <p>
            <strong>Nearest competitor (walking):</strong>{" "}
            {formatDistance(candidate.walkingSeparationMeters)}
          </p>

          <p>
            <strong>Closest pharmacy:</strong>{" "}
            {candidate.nearestPharmacyName}
          </p>
        </div>
      ))}

      {hasRun && recommendation.length > 0 && (
        <button className="clear-recommendation" onClick={onClear}>
          Clear results
        </button>
      )}
    </div>
  );
}

export default CandidatesPanel;
