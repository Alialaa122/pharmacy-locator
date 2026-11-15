import { Circle } from "@vis.gl/react-google-maps";

/**
 * The search radius circle drawn around the selected location.
 *
 * @param {{
 *   center: { lat: number, lng: number },
 *   radius: number,
 * }} props - radius in meters
 */
function SearchCircle({ center, radius }) {
  return (
    <Circle
      center={center}
      radius={radius}
      options={{
        fillColor: "#3b82f6",
        fillOpacity: 0.12,
        strokeColor: "#3b82f6",
        strokeOpacity: 0.85,
        strokeWeight: 2,
      }}
    />
  );
}

export default SearchCircle;
