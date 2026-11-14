import { useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import {
  searchGooglePharmacies,
  calculateDistance,
} from "../services/pharmacyService.js";
import { getWalkingRoutes } from "../services/routingService.js";

function PharmacySearch({
  setPharmacies,
  selectedLocation,
  searchRadius,
  setHasSearched,
}) {
  const placesLibrary = useMapsLibrary("places");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch() {
    setIsLoading(true);
    setError("");

    try {
      const places = await searchGooglePharmacies(
        placesLibrary,
        selectedLocation,
        searchRadius
      );

      let pharmaciesWithDistance = await Promise.all(
        places.map(async (pharmacy) => {
          const distance = calculateDistance(
            selectedLocation,
            {
              lat: pharmacy.location.lat(),
              lng: pharmacy.location.lng(),
            }
          );

          return {
            ...pharmacy,
            distance,
            walkingDistance: null,
            walkingDuration: null,
            location: pharmacy.location,
            displayName: pharmacy.displayName,
            formattedAddress: pharmacy.formattedAddress,
          };
        })
      );

      if (places.length >= 2) {
        const targets = places.map((pharmacy) => ({
          lat: pharmacy.location.lat(),
          lng: pharmacy.location.lng(),
        }));

        const walkingRoutes = await getWalkingRoutes(
          selectedLocation,
          targets
        );

        console.log("Walking routes:", walkingRoutes);

        pharmaciesWithDistance = places.map((pharmacy, index) => {
          const lat = pharmacy.location.lat();
          const lng = pharmacy.location.lng();
          const route = walkingRoutes[index];

          return {
            ...pharmacy,
            distance: calculateDistance(selectedLocation, {
              lat,
              lng,
            }),
            walkingDistance: route ? route.distanceMeters : null,
            walkingDuration: route ? route.durationSeconds : null,
            coordinates: { lat, lng },
          };
        });

        pharmaciesWithDistance.sort((a, b) => {
          if (a.walkingDistance === null) return 1;
          if (b.walkingDistance === null) return -1;

          return a.walkingDistance - b.walkingDistance;
        });

        setPharmacies(pharmaciesWithDistance);
        console.table(
          pharmaciesWithDistance.map((pharmacy) => ({
            id: pharmacy.id,
            coordinates: pharmacy.coordinates,
            walkingDistance: pharmacy.walkingDistance,
            walkingDuration: pharmacy.walkingDuration,
          }))
        );
      }
      setHasSearched(true);

    } catch (error) {
      console.error(error);
      setError("Failed to search for pharmacies.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={handleSearch}
        disabled={!placesLibrary || isLoading}
      >
        {isLoading ? "Searching..." : "Search Pharmacies"}
      </button>

      {error && <p className="error-message">{error}</p>}
    </>
  );
}

export default PharmacySearch;
