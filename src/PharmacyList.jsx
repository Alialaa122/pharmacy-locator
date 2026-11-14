
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
    name: pharmacy.name,
    direct: pharmacy.directDistanceMeters,
    walking: pharmacy.walkingDistanceMeters,
    duration: pharmacy.walkingDurationSeconds,
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
            {nearestPharmacy.walkingDistanceMeters != null
              ? `${Math.round(nearestPharmacy.walkingDistanceMeters)} m`
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
                ? `${Math.round(pharmacy.walkingDistanceMeters)} m`
                : "Unavailable"}
            </p>

            <p>
              <strong>Walking duration:</strong>{" "}
              {pharmacy.walkingDurationSeconds != null
                ? `${Math.ceil(pharmacy.walkingDurationSeconds / 60)} min`
                : "Unavailable"}
            </p>

            <p>
              <strong>Direct distance:</strong>{" "}
              {Math.round(pharmacy.directDistanceMeters)} m
            </p>
          </div>
        </div>
      ))
    )}
    </div>
  );
}

export default PharmacyList;
