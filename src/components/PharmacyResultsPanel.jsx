import PharmacyCard from "./PharmacyCard.jsx";
import LocationVerdict from "./LocationVerdict.jsx";
import { formatDistance, formatRadius } from "../lib/format.js";

/**
 * The pharmacy results panel: the verdict for the selected location,
 * a summary of the search, and one card per pharmacy (sorted by
 * walking distance, nearest first).
 *
 * Display only — the list is built by domain/pharmacyResults.js.
 *
 * @param {{
 *   pharmacies: Array<object>,
 *   selectedPharmacyId: string | null,
 *   onSelectPharmacy: (pharmacy: object) => void,
 *   searchRadius: number,
 *   hasSearched: boolean,
 *   onClearSearch: () => void,
 * }} props
 */
function PharmacyResultsPanel({
  pharmacies,
  selectedPharmacyId,
  onSelectPharmacy,
  searchRadius,
  hasSearched,
  onClearSearch,
}) {
  const nearestPharmacy = pharmacies[0];

  return (
    <div className="pharmacy-list">
      <LocationVerdict pharmacies={pharmacies} hasSearched={hasSearched} />

      <div className="panel-heading">
        <h2>Nearby Pharmacies</h2>

        {hasSearched && (
          <button
            type="button"
            className="btn btn-ghost clear-search-button"
            onClick={onClearSearch}
          >
            Clear
          </button>
        )}
      </div>

      {!hasSearched ? (
        <p className="panel-empty">
          Click the map to pick a location, then search for pharmacies.
        </p>
      ) : pharmacies.length === 0 ? (
        <p className="panel-empty">
          No pharmacies were found within {formatRadius(searchRadius)} of
          the selected location.
        </p>
      ) : (
        <>
          <div className="search-summary">
            <p>
              <strong>{pharmacies.length}</strong>{" "}
              {pharmacies.length === 1 ? "pharmacy" : "pharmacies"} within{" "}
              {formatRadius(searchRadius)}
            </p>

            <p>
              Nearest by walking:{" "}
              <strong>
                {nearestPharmacy?.walkingDistanceMeters != null
                  ? formatDistance(nearestPharmacy.walkingDistanceMeters)
                  : "Unavailable"}
              </strong>
            </p>
          </div>

          <p className="panel-note">
            Sorted by walking distance. A missing measurement is shown as
            &ldquo;Unavailable&rdquo;, never as zero.
          </p>

          {pharmacies.map((pharmacy, index) => (
            <PharmacyCard
              key={pharmacy.id}
              pharmacy={pharmacy}
              rank={index + 1}
              isNearest={index === 0}
              isSelected={pharmacy.id === selectedPharmacyId}
              onSelect={onSelectPharmacy}
            />
          ))}
        </>
      )}
    </div>
  );
}

export default PharmacyResultsPanel;
