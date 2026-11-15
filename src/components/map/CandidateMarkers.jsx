import { AdvancedMarker } from "@vis.gl/react-google-maps";

/**
 * Numbered map markers for the valid candidate spots, plus the
 * rejected ones (only when the user asks to see them).
 *
 * Plain data in ({ recommendation, rejected, showRejected, onSelect })
 * — owns all @vis.gl usage. Clicking a marker selects that spot (App
 * opens its window).
 *
 * @param {{
 *   recommendation: Array | null,
 *   rejected?: Array | null,
 *   showRejected?: boolean,
 *   selectedCandidateIndex: number | null,
 *   onSelectCandidate: (index: number) => void,
 * }} props
 */
function CandidateMarkers({
  recommendation,
  rejected,
  showRejected = false,
  selectedCandidateIndex,
  onSelectCandidate,
}) {
  const valid = recommendation ?? [];
  const rejectedPoints = showRejected ? (rejected ?? []) : [];

  if (valid.length === 0 && rejectedPoints.length === 0) {
    return null;
  }

  return (
    <>
      {rejectedPoints.map((candidate) => (
        <AdvancedMarker
          key={`rejected-${candidate.id}`}
          position={{ lat: candidate.lat, lng: candidate.lng }}
          title={candidate.rejection?.detail ?? "Rejected"}
        >
          <div className="rejected-marker" />
        </AdvancedMarker>
      ))}

      {valid.map((candidate, index) => (
        <AdvancedMarker
          key={candidate.id}
          position={{ lat: candidate.lat, lng: candidate.lng }}
          title={`Candidate ${index + 1}`}
          onClick={() => onSelectCandidate(index)}
        >
          <div
            className={
              index === selectedCandidateIndex
                ? "candidate-marker candidate-selected"
                : "candidate-marker"
            }
          >
            {index + 1}
          </div>
        </AdvancedMarker>
      ))}
    </>
  );
}

export default CandidateMarkers;
