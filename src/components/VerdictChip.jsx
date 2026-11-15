import { evaluateLocation } from "../domain/eligibility.js";
import { formatDistance } from "../lib/format.js";

/**
 * Compact verdict for the selected location, shown over the map so the
 * answer stays visible whatever panel is open.
 *
 * Derived entirely from the result list — no state, no API calls.
 *
 * @param {{
 *   pharmacies: Array<object>,
 *   hasSearched: boolean,
 * }} props
 */
function VerdictChip({ pharmacies, hasSearched }) {
  if (!hasSearched) {
    return null;
  }

  const { band, separationMeters, unverifiedReason } =
    evaluateLocation(pharmacies);

  return (
    <div className="verdict-chip">
      <span
        className="verdict-chip-badge"
        style={{ backgroundColor: band.color }}
      >
        {band.label}
      </span>

      <span className="verdict-chip-text">
        {unverifiedReason
          ? "The rule could not be evaluated"
          : `Nearest competitor ${formatDistance(separationMeters)} by walking`}
      </span>
    </div>
  );
}

export default VerdictChip;
