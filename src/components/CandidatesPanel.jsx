import { formatDistance } from "../lib/format.js";
import { REJECTION_REASONS } from "../domain/candidates.js";

const REJECTION_LABELS = {
  [REJECTION_REASONS.ON_ROAD]: "On a road",
  [REJECTION_REASONS.TOO_CLOSE]: "Too close to a pharmacy",
  [REJECTION_REASONS.WALKING_GATE]: "Under 100 m by walking",
  [REJECTION_REASONS.NO_ROUTE]: "No walking route",
};

const REJECTION_ORDER = [
  REJECTION_REASONS.ON_ROAD,
  REJECTION_REASONS.TOO_CLOSE,
  REJECTION_REASONS.WALKING_GATE,
  REJECTION_REASONS.NO_ROUTE,
];

/**
 * Display-only candidate finder panel: the trigger button, the result
 * of every check, the recommended spots and — on request — the spots
 * that were rejected and why.
 *
 * No commercial ranking: the candidates are all equally "valid" (both
 * constraints pass); they are just mutually distinct spots.
 *
 * @param {{
 *   canRecommend: boolean,       // a search result set exists to find against
 *   recommendation: Array | null, // null = not run; [] = ran, none valid
 *   summary: object | null,       // counts of the last run
 *   rejected: Array | null,       // the rejected candidates + reasons
 *   showRejected: boolean,
 *   onToggleShowRejected: () => void,
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
  summary,
  rejected,
  showRejected,
  onToggleShowRejected,
  isLoading,
  error,
  selectedCandidateIndex,
  onFind,
  onClear,
  onSelectCandidate,
}) {
  const hasRun = recommendation !== null;

  const rejectedByReason = REJECTION_ORDER.map((reason) => ({
    reason,
    label: REJECTION_LABELS[reason],
    count: summary?.rejectedByReason?.[reason] ?? 0,
  })).filter((entry) => entry.count > 0);

  return (
    <div className="candidates-panel">
      <h2>Candidate locations</h2>

      <button
        className="recommend-button"
        onClick={onFind}
        disabled={!canRecommend || isLoading}
      >
        {isLoading ? "Checking locations..." : "Find valid locations"}
      </button>

      <p className="candidates-note">
        Checks points inside your selected radius against two rules: at
        least 100 m walking distance from every found pharmacy, and not
        on a road. Up to three valid spots are returned, each at least
        200 m from the others. The 100 m rule is a prototype assumption
        and still needs regulatory verification.
      </p>

      {error && <p className="error-message">{error}</p>}

      {summary && (
        <div className="candidate-summary">
          <div className="candidate-summary-stat">
            <span className="candidate-summary-value">
              {summary.generated}
            </span>
            <span className="candidate-summary-label">Generated</span>
          </div>
          <div className="candidate-summary-stat">
            <span className="candidate-summary-value">{summary.valid}</span>
            <span className="candidate-summary-label">Valid</span>
          </div>
          <div className="candidate-summary-stat">
            <span className="candidate-summary-value">
              {summary.rejected}
            </span>
            <span className="candidate-summary-label">Rejected</span>
          </div>
          <div className="candidate-summary-stat">
            <span className="candidate-summary-value">
              {summary.notEvaluated}
            </span>
            <span className="candidate-summary-label">Not checked</span>
          </div>
        </div>
      )}

      {summary && (
        <ul className="constraint-list">
          <li className="constraint-item">
            <span className="constraint-mark is-pass">✓</span>
            <span className="constraint-text">
              <strong>100 m walking distance</strong> from every pharmacy
              {summary.rejectedByReason?.[REJECTION_REASONS.WALKING_GATE] >
                0 && (
                <span className="constraint-detail">
                  {" "}
                  — {summary.rejectedByReason[REJECTION_REASONS.WALKING_GATE]}{" "}
                  failed this rule
                </span>
              )}
            </span>
          </li>

          <li className="constraint-item">
            <span className="constraint-mark is-pass">✓</span>
            <span className="constraint-text">
              <strong>Not on a road</strong> (15 m tolerance)
              {summary.rejectedByReason?.[REJECTION_REASONS.ON_ROAD] > 0 && (
                <span className="constraint-detail">
                  {" "}
                  — {summary.rejectedByReason[REJECTION_REASONS.ON_ROAD]}{" "}
                  were on a road
                </span>
              )}
            </span>
          </li>
        </ul>
      )}

      {hasRun && recommendation.length === 0 && (
        <p className="candidates-empty">
          No valid spots in this radius — every checked point was either
          on a road or too close to an existing pharmacy.
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
            Passes both rules — a valid location, not a ranked one.
          </p>

          <p>
            <strong>Nearest competitor (walking):</strong>{" "}
            {formatDistance(candidate.walkingSeparationMeters)}
          </p>

          <p>
            <strong>Closest pharmacy:</strong> {candidate.nearestPharmacyName}
          </p>
        </div>
      ))}

      {rejectedByReason.length > 0 && (
        <div className="rejected-section">
          <div className="rejected-header">
            <h3>Rejected spots</h3>

            <label className="rejected-toggle">
              <input
                type="checkbox"
                checked={showRejected}
                onChange={onToggleShowRejected}
              />
              Show on map
            </label>
          </div>

          <ul className="rejected-list">
            {rejectedByReason.map((entry) => (
              <li className="rejected-item" key={entry.reason}>
                <span className="rejected-count">{entry.count}</span>
                <span className="rejected-label">{entry.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasRun && (
        <button className="clear-recommendation" onClick={onClear}>
          Clear results
        </button>
      )}
    </div>
  );
}

export default CandidatesPanel;
