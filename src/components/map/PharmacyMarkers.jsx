import { AdvancedMarker } from "@vis.gl/react-google-maps";

/**
 * Markers for the pharmacies returned by the current search.
 *
 * Plain data in ({ pharmacies, selectedPharmacyId, onSelectPharmacy })
 * — owns all @vis.gl usage.
 *
 * The marker carries the pharmacy's rank in the sorted result list
 * (sorted by walking distance), so a marker and its result card can be
 * matched at a glance.
 *
 * @param {{
 *   pharmacies: Array<{ id: string, name: string, lat: number, lng: number }>,
 *   selectedPharmacyId: string | null,
 *   onSelectPharmacy: (pharmacy: object) => void,
 *   visible?: boolean,
 * }} props
 */
function PharmacyMarkers({
  pharmacies,
  selectedPharmacyId,
  onSelectPharmacy,
  visible = true,
}) {
  if (!visible) {
    return null;
  }

  return (
    <>
      {pharmacies.map((pharmacy, index) => (
        <AdvancedMarker
          key={pharmacy.id}
          position={{ lat: pharmacy.lat, lng: pharmacy.lng }}
          title={pharmacy.name}
          onClick={() => onSelectPharmacy(pharmacy)}
        >
          <div
            className={`pharmacy-marker${
              pharmacy.id === selectedPharmacyId ? " is-selected" : ""
            }`}
          >
            <span className="pharmacy-marker-rank">{index + 1}</span>
          </div>
        </AdvancedMarker>
      ))}
    </>
  );
}

export default PharmacyMarkers;
