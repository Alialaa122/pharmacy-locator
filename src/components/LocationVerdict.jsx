import { evaluateLocation } from "../domain/eligibility.js";
import { formatDistance } from "../lib/format.js";

/**
 * Verdict card for the selected location: applies the EDA eligibility
 * rule to the current pharmacy results and shows the resulting band.
 * Derived entirely from props — no state, no API calls, and it updates
 * automatically whenever a new search completes.
 */
function LocationVerdict({ pharmacies, hasSearched }) {
  if (!hasSearched) {
    return null;
  }

  const evaluation = evaluateLocation(pharmacies);
  const { band, nearestPharmacy, separationMeters, unverifiedReason } =
    evaluation;

  return (
    <div className="location-verdict">
      <h2>Location Verdict</h2>

      <span
        className="verdict-badge"
        style={{ backgroundColor: band.color }}
      >
        {band.label}
      </span>

      {unverifiedReason ? (
        <p className="verdict-reason">{unverifiedReason}</p>
      ) : (
        <>
          <p>
            <strong>Nearest competitor:</strong>{" "}
            {nearestPharmacy.name}
          </p>

          <p>
            <strong>Separation (walking):</strong>{" "}
            {formatDistance(separationMeters)}
          </p>

          <p>
            <strong>Straight-line:</strong>{" "}
            {formatDistance(nearestPharmacy.directDistanceMeters)}
          </p>

          <small>{band.description}</small>
        </>
      )}
    </div>
  );
}

export default LocationVerdict;
