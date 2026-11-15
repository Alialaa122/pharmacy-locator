import { AdvancedMarker } from "@vis.gl/react-google-maps";

/**
 * Numbered map markers for the valid candidate spots.
 * Plain data in ({ recommendation, onSelect }) — owns all @vis.gl
 * usage. Clicking a marker selects that spot (App opens its window).
 *
 * @param {{
 *   recommendation: Array | null,
 *   selectedCandidateIndex: number | null,
 *   onSelectCandidate: (index: number) => void,
 * }} props
 */
function CandidateMarkers({
  recommendation,
  selectedCandidateIndex,
  onSelectCandidate,
}) {
  if (!recommendation || recommendation.length === 0) {
    return null;
  }

  return (
    <>
      {recommendation.map((candidate, index) => (
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
