import { AdvancedMarker } from "@vis.gl/react-google-maps";

/**
 * The marker for the location the user selected (the search centre).
 *
 * @param {{ position: { lat: number, lng: number } }} props
 */
function LocationMarker({ position }) {
  return (
    <AdvancedMarker position={position}>
      <div className="selected-location-marker">📍</div>
    </AdvancedMarker>
  );
}

export default LocationMarker;
