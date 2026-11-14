import { useState, useEffect } from "react";
import { getGeographicFeatures } from "../services/geographicService.js";

/**
 * Loads OpenStreetMap features (via Overpass) for the selected location
 * and radius, and owns the corresponding request state.
 *
 * Does nothing until a location is selected; refetches when the location
 * or radius changes.
 *
 * @param {{ lat: number, lng: number } | null} selectedLocation
 * @param {number} searchRadius - meters
 * @returns {{ features: Array, isLoading: boolean, error: string }}
 */
export function useGeographicFeatures(selectedLocation, searchRadius) {
  const [features, setFeatures] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedLocation) return;

    async function loadGeographicFeatures() {
      setIsLoading(true);
      setError("");

      try {
        const loadedFeatures = await getGeographicFeatures(
          selectedLocation.lat,
          selectedLocation.lng,
          searchRadius
        );

        setFeatures(loadedFeatures);
      } catch {
        setError("Failed to load geographic data.");
      } finally {
        setIsLoading(false);
      }
    }

    loadGeographicFeatures();
  }, [selectedLocation, searchRadius]);

  return { features, isLoading, error };
}
