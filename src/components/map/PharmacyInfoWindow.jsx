import { InfoWindow } from "@vis.gl/react-google-maps";
import { formatDistance } from "../../lib/format.js";

/**
 * Info window for a selected pharmacy.
 *
 * @param {{
 *   pharmacy: { name: string, address: string, lat: number, lng: number, directDistanceMeters: number },
 *   onClose: () => void,
 * }} props
 */
function PharmacyInfoWindow({ pharmacy, onClose }) {
  return (
    <InfoWindow
      position={{ lat: pharmacy.lat, lng: pharmacy.lng }}
      onCloseClick={onClose}
    >
      <div className="pharmacy-window">
        <h3>{pharmacy.name}</h3>
        <p>{pharmacy.address}</p>
        <p>
          Direct distance: {formatDistance(pharmacy.directDistanceMeters)}
        </p>
        <small>
          Measured in a straight line, not walking or driving distance.
        </small>
      </div>
    </InfoWindow>
  );
}

export default PharmacyInfoWindow;
