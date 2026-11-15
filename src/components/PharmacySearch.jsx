import { useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { searchPharmacies } from "../services/placesService.js";
import { getWalkingRoutes } from "../services/routingService.js";
import { assemblePharmacyResults } from "../domain/pharmacyResults.js";

function PharmacySearch({
  setPharmacies,
  selectedLocation,
  searchRadius,
  setHasSearched,
}) {
  const placesLibrary = useMapsLibrary("places");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [walkingError, setWalkingError] = useState(false);

  async function handleSearch() {
    setIsLoading(true);
    setError("");
    setWalkingError(false);

    try {
      const pharmacies = await searchPharmacies(
        placesLibrary,
        selectedLocation,
        searchRadius
      );

      // Agreed: routing failures degrade gracefully — results keep their
      // direct distances and the UI shows a warning (see ARCHITECTURE.md §6).
      let walkingRoutes = [];
      let walkingUnavailable = false;

      if (pharmacies.length > 0) {
        try {
          walkingRoutes = await getWalkingRoutes(
            selectedLocation,
            pharmacies
          );
        } catch (routingError) {
          console.error(routingError);
          walkingUnavailable = true;
        }
      }

      const results = assemblePharmacyResults(
        pharmacies,
        selectedLocation,
        walkingRoutes
      );

      setPharmacies(results);
      setHasSearched(true);
      setWalkingError(walkingUnavailable);
    } catch (searchError) {
      console.error(searchError);
      setError("Failed to search for pharmacies.");
      setPharmacies([]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <button
        className="search-button"
        onClick={handleSearch}
        disabled={!placesLibrary || isLoading || !selectedLocation}
      >
        {isLoading ? "Searching..." : "Search Pharmacies"}
      </button>

      {error && <p className="error-message">{error}</p>}

      {walkingError && (
        <p className="error-message">
          Walking distances are unavailable right now — showing direct
          distances only.
        </p>
      )}
    </>
  );
}

export default PharmacySearch;
