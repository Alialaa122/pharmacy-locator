import { useState } from "react";
import {
  formatDistance,
  formatDuration,
} from "../lib/format.js";

/**
 * One pharmacy result.
 *
 * The collapsed card shows what matters at a glance (rank, name,
 * address, walking distance). The expanded details explain every
 * measurement, so a number is never shown without meaning.
 *
 * A missing measurement is shown as "Unavailable" — it is never
 * rendered as zero.
 *
 * @param {{
 *   pharmacy: {
 *     id: string, name: string, address: string, lat: number, lng: number,
 *     directDistanceMeters: number,
 *     walkingDistanceMeters: number | null,
 *     walkingDurationSeconds: number | null,
 *   },
 *   rank: number,
 *   isNearest: boolean,
 *   isSelected: boolean,
 *   onSelect: (pharmacy: object) => void,
 * }} props - rank is 1-based, matching the number on the map marker
 */
function PharmacyCard({
  pharmacy,
  rank,
  isNearest,
  isSelected,
  onSelect,
}) {
  const [expanded, setExpanded] = useState(false);

  const hasWalking = pharmacy.walkingDistanceMeters != null;

  return (
    <article
      className={`pharmacy-card${isSelected ? " is-selected" : ""}`}
      onClick={() => onSelect(pharmacy)}
    >
      <header className="pharmacy-card-head">
        <span className="pharmacy-rank">{rank}</span>

        <div className="pharmacy-card-title">
          <h3>{pharmacy.name}</h3>

          {isNearest && (
            <span className="pharmacy-badge" title="Closest pharmacy by walking distance">
              ● Nearest
            </span>
          )}
        </div>
      </header>

      {pharmacy.address && pharmacy.address !== pharmacy.name ? (
        <p className="pharmacy-address">{pharmacy.address}</p>
      ) : pharmacy.name === "Unnamed pharmacy" ? (
        <p className="pharmacy-address muted">No address provided</p>
      ) : null}

      <div className="pharmacy-summary">
        <span className="pharmacy-summary-item">
          <span className="pharmacy-summary-label">Walking</span>
          {hasWalking
            ? `${formatDistance(pharmacy.walkingDistanceMeters)} · ${formatDuration(
                pharmacy.walkingDurationSeconds
              )}`
            : "Unavailable"}
        </span>

        <button
          type="button"
          className="pharmacy-expand"
          aria-expanded={expanded}
          onClick={(event) => {
            event.stopPropagation();
            setExpanded((value) => !value);
          }}
        >
          {expanded ? "Less" : "Details"}
        </button>
      </div>

      {expanded && (
        <dl className="pharmacy-details">
          <div className="pharmacy-detail">
            <dt>Walking distance</dt>
            <dd>
              {hasWalking
                ? formatDistance(pharmacy.walkingDistanceMeters)
                : "Unavailable"}
              <span className="pharmacy-detail-note">
                The distance along the pedestrian route from your selected
                location.
              </span>
            </dd>
          </div>

          <div className="pharmacy-detail">
            <dt>Walking time</dt>
            <dd>
              {hasWalking
                ? formatDuration(pharmacy.walkingDurationSeconds)
                : "Unavailable"}
              <span className="pharmacy-detail-note">
                Estimated from the same walking route.
              </span>
            </dd>
          </div>

          <div className="pharmacy-detail">
            <dt>Straight-line distance</dt>
            <dd>
              {formatDistance(pharmacy.directDistanceMeters)}
              <span className="pharmacy-detail-note">
                Measured in a straight line — never shorter than the
                walking distance.
              </span>
            </dd>
          </div>

          <div className="pharmacy-detail">
            <dt>Coordinates</dt>
            <dd className="pharmacy-coordinates">
              {pharmacy.lat.toFixed(5)}, {pharmacy.lng.toFixed(5)}
            </dd>
          </div>
        </dl>
      )}
    </article>
  );
}

export default PharmacyCard;
