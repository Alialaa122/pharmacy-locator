import { formatDistance } from "../lib/format.js";

/**
 * Display-only candidate recommendation panel: the trigger button and
 * the top-3 results. Plain data in, callbacks out — no pipeline logic.
 *
 * @param {{
 *   canRecommend: boolean,      // a search result set exists to recommend against
 *   recommendation: Array | null, // null = not run; [] = ran, none eligible
 *   isLoading: boolean,
 *   error: string,
 *   selectedCandidateIndex: number | null,
 *   onRecommend: () => void,
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
  onRecommend,
  onClear,
  onSelectCandidate,
}) {
  const hasRun = recommendation !== null;

  return (
    <div className="candidates-panel">
      <h2>Recommended Spots</h2>

      <button
        className="recommend-button"
        onClick={onRecommend}
        disabled={!canRecommend || isLoading}
      >
        {isLoading ? "Analyzing..." : "Recommend locations"}
      </button>

      <p className="candidates-note">
        Spots at least 100 m (straight-line) from every found pharmacy,
        ranked by walking separation. Click a spot to see its details.
      </p>

      {error && <p className="error-message">{error}</p>}

      {hasRun && recommendation.length === 0 && (
        <p className="candidates-empty">
          No compliant spots in this radius — every building and street
          here is within 100 m of an existing pharmacy.
        </p>
      )}

      {recommendation?.map((candidate, index) => (
        <div
          className={
            index === selectedCandidateIndex
              ? "candidate-card candidate-selected"
              : "candidate-card"
          }
          key={`${candidate.id}-${index}`}
          onClick={() => onSelectCandidate(index)}
          style={{
            borderLeftColor: candidate.band?.color ?? "#e5e7eb",
          }}
        >
          <div className="candidate-header">
            <span
              className="candidate-rank"
              style={{
                backgroundColor: candidate.band?.color ?? "#6b7280",
              }}
            >
              {index + 1}
            </span>
            <h3>{candidate.label}</h3>
          </div>

          <p className="candidate-kind">
            {candidate.kind === "building" ? "Building" : "Road"}
            {candidate.walkingVerified
              ? candidate.band
                ? ` · ${candidate.band.label}`
                : ""
              : " · walking unverified"}
          </p>

          <p>
            <strong>
              {candidate.separationBasis === "walking"
                ? "Separation (walking)"
                : "Separation (straight-line)"}:
            </strong>{" "}
            {formatDistance(candidate.separationMeters)}
          </p>

          {candidate.walkingVerified && candidate.nearestCompetition && (
            <p>
              <strong>Nearest competitor:</strong>{" "}
              {candidate.nearestCompetition.name}
            </p>
          )}
        </div>
      ))}

      {hasRun && recommendation.length > 0 && (
        <button className="clear-recommendation" onClick={onClear}>
          Clear recommendation
        </button>
      )}
    </div>
  );
}

export default CandidatesPanel;
