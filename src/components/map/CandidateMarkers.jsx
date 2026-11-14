import { AdvancedMarker } from "@vis.gl/react-google-maps";

/**
 * Numbered map markers for the recommended candidate spots.
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
          key={`${candidate.id}-${index}`}
          position={{ lat: candidate.lat, lng: candidate.lng }}
          title={`${index + 1}. ${candidate.label}`}
          onClick={() => onSelectCandidate(index)}
        >
          <div
            className={
              index === selectedCandidateIndex
                ? "candidate-marker candidate-selected"
                : "candidate-marker"
            }
            style={{
              backgroundColor: candidate.band?.color ?? "#6b7280",
            }}
          >
            {index + 1}
          </div>
        </AdvancedMarker>
      ))}
    </>
  );
}

export default CandidateMarkers;
