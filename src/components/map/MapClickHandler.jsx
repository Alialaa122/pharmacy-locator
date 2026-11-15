import { useEffect } from "react";
import { useMap } from "@vis.gl/react-google-maps";

/**
 * Translates map clicks into a selected location. Owns the Google Maps
 * listener lifecycle; the parent only receives plain coordinates.
 *
 * @param {{ onLocationSelect: (location: { lat: number, lng: number }) => void }} props
 */
function MapClickHandler({ onLocationSelect }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const listener = map.addListener("click", (event) => {
      const location = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng(),
      };

      onLocationSelect(location);
    });

    return () => listener.remove();
  }, [map, onLocationSelect]);

  return null;
}

export default MapClickHandler;
