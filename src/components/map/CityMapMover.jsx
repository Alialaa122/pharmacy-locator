import { useEffect } from "react";
import { useMap } from "@vis.gl/react-google-maps";

/**
 * Invisible map component: moves the map to the selected city's center
 * with map.setCenter (agreed Option A; controlled map props rejected).
 * Selecting a city must never set a search location or trigger a search.
 */
function CityMapMover({ selectedCity }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !selectedCity) return;

    map.setCenter(selectedCity.center);
  }, [map, selectedCity]);

  return null;
}

export default CityMapMover;
