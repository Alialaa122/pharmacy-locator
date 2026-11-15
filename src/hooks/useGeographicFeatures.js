import { useState, useEffect } from "react";
import { getGeographicFeatures } from "../services/osmService.js";
import {
  getCachedFeatures,
  setCachedFeatures,
} from "../lib/geographicCache.js";

/**
 * Loads OpenStreetMap features (via Overpass) for the selected location
 * and radius, and owns the corresponding request state.
 *
 * Does nothing until a location is selected; refetches when the location
 * or radius changes. An area that was already loaded during this session
 * is served from the cache instead of a new request — the data does not
 * change while the session runs.
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

    // Already loaded during this session - no request, no flicker.
    const cached = getCachedFeatures(selectedLocation, searchRadius);

    if (cached) {
      setFeatures(cached);
      setError("");
      setIsLoading(false);

      return;
    }

    let cancelled = false;

    async function loadGeographicFeatures() {
      setIsLoading(true);
      setError("");
      // Drop the previous area's geometry while the new one loads.
      setFeatures([]);

      try {
        const loadedFeatures = await getGeographicFeatures(
          selectedLocation.lat,
          selectedLocation.lng,
          searchRadius
        );

        if (cancelled) return;

        setCachedFeatures(
          selectedLocation,
          searchRadius,
          loadedFeatures
        );
        setFeatures(loadedFeatures);
      } catch {
        if (!cancelled) {
          setError("Failed to load geographic data.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadGeographicFeatures();

    return () => {
      cancelled = true;
    };
  }, [selectedLocation, searchRadius]);

  return { features, isLoading, error };
}
