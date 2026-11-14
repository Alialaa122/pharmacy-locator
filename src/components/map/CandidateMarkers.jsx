import { AdvancedMarker } from "@vis.gl/react-google-maps";

/**
 * Numbered map markers for the recommended candidate spots.
 * Plain data in (`recommendation` array) — owns all @vis.gl usage.
 *
 * @param {{ recommendation: Array | null }} props - each entry has
 *   `lat`, `lng`, `label`, `band`
 */
function CandidateMarkers({ recommendation }) {
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
        >
          <div
            className="candidate-marker"
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
