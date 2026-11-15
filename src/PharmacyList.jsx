
import { formatDistance, formatDuration, formatRadius } from "./lib/format.js";
import LocationVerdict from "./components/LocationVerdict.jsx";

function PharmacyList({
  pharmacies,
  onSelectPharmacy,
  searchRadius,
  hasSearched,
  onClearSearch
}) {
  const nearestPharmacy = pharmacies[0];

  return (
    <div className="pharmacy-list">
      <LocationVerdict pharmacies={pharmacies} hasSearched={hasSearched} />

      <h2>Nearby Pharmacies</h2>

    {hasSearched && (
    <button className="btn btn-ghost clear-search-button" onClick={onClearSearch}>
        Clear Search
    </button>
    )}
      <div className="search-summary">
        <p>{pharmacies.length} pharmacies found</p>

        <p>
          Search radius: {formatRadius(searchRadius)}
        </p>

        {nearestPharmacy && (
          <p>
            Nearest pharmacy (walking):{" "}
            {nearestPharmacy.walkingDistanceMeters != null
              ? formatDistance(nearestPharmacy.walkingDistanceMeters)
              : "Unavailable"}
          </p>
        )}
      </div>
    {!hasSearched ? (
    <p>Search for pharmacies to see results.</p>
    ) : pharmacies.length === 0 ? (
    <p>No pharmacies found in this area.</p>
    ) :(
      pharmacies.map((pharmacy) => (
        <div
          key={pharmacy.id}
          className="pharmacy-card"
          onClick={() => onSelectPharmacy(pharmacy)}
        >
          <h3>{pharmacy.name}</h3>

          <p>{pharmacy.address}</p>

          <div className="pharmacy-distances">
            <p>
              <strong>Walking distance:</strong>{" "}
              {pharmacy.walkingDistanceMeters != null
                ? formatDistance(pharmacy.walkingDistanceMeters)
                : "Unavailable"}
            </p>

            <p>
              <strong>Walking duration:</strong>{" "}
              {pharmacy.walkingDurationSeconds != null
                ? formatDuration(pharmacy.walkingDurationSeconds)
                : "Unavailable"}
            </p>

            <p>
              <strong>Direct distance:</strong>{" "}
              {formatDistance(pharmacy.directDistanceMeters)}
            </p>
          </div>
        </div>
      ))
    )}
    </div>
  );
}

export default PharmacyList;
