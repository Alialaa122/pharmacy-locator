import { InfoWindow } from "@vis.gl/react-google-maps";
import { formatDistance } from "../../lib/format.js";

/**
 * Info window for a selected candidate spot.
 *
 * @param {{
 *   candidate: {
 *     lat: number,
 *     lng: number,
 *     walkingSeparationMeters: number,
 *     nearestPharmacyName: string,
 *   },
 *   rank: number,
 *   onClose: () => void,
 * }} props - rank is 1-based
 */
function CandidateInfoWindow({ candidate, rank, onClose }) {
  return (
    <InfoWindow
      position={{ lat: candidate.lat, lng: candidate.lng }}
      onCloseClick={onClose}
    >
      <div className="candidate-window">
        <h3>
          {rank}. Candidate spot
        </h3>
        <p>
          Walking distance to nearest competitor:{" "}
          {formatDistance(candidate.walkingSeparationMeters)}
        </p>
        <p>Nearest competitor: {candidate.nearestPharmacyName}</p>
        <small>
          {candidate.lat.toFixed(5)}, {candidate.lng.toFixed(5)}
        </small>
      </div>
    </InfoWindow>
  );
}

export default CandidateInfoWindow;
