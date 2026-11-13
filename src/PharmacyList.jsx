
function PharmacyList({
  pharmacies,
  onSelectPharmacy,
  searchRadius,
  hasSearched,
  onClearSearch
}) {
  const nearestPharmacy = pharmacies[0];
console.table(
  pharmacies.map((pharmacy) => ({
    name: pharmacy.displayName?.text,
    distance: pharmacy.distance,
    walkingDistance: pharmacy.walkingDistance,
    walkingDuration: pharmacy.walkingDuration,
  }))
);
  return (
    <div className="pharmacy-list">
      <h2>Nearby Pharmacies</h2>

    {hasSearched && (
    <button onClick={onClearSearch}>
        Clear Search
    </button>
    )}
      <div className="search-summary">
        <p>{pharmacies.length} pharmacies found</p>

        <p>
          Search radius:{" "}
          {searchRadius >= 1000
            ? `${searchRadius / 1000} km`
            : `${searchRadius} m`}
        </p>

        {nearestPharmacy && (
          <p>
            Nearest pharmacy (walking):{" "}
            {nearestPharmacy.walkingDistance != null
              ? `${Math.round(nearestPharmacy.walkingDistance * 1000)} m`
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
          <h3>{pharmacy.displayName?.text}</h3>

          <p>{pharmacy.formattedAddress}</p>

          <div className="pharmacy-distances">
            <p>
              <strong>Walking distance:</strong>{" "}
              {pharmacy.walkingDistance != null
                ? `${Math.round(pharmacy.walkingDistance * 1000)} m`
                : "Unavailable"}
            </p>

            <p>
              <strong>Walking duration:</strong>{" "}
              {pharmacy.walkingDuration != null
                ? `${Math.ceil(pharmacy.walkingDuration / 60)} min`
                : "Unavailable"}
            </p>

            <p>
              <strong>Direct distance:</strong>{" "}
              {Math.round(pharmacy.distance)} m
            </p>
          </div>
        </div>
      ))
    )}
    </div>
  );
}

export default PharmacyList;
