import { AdvancedMarker } from "@vis.gl/react-google-maps";

/**
 * Markers for the pharmacies returned by the current search.
 *
 * Plain data in ({ pharmacies, selectedPharmacyId, onSelectPharmacy })
 * — owns all @vis.gl usage.
 *
 * @param {{
 *   pharmacies: Array<{ id: string, name: string, lat: number, lng: number }>,
 *   selectedPharmacyId: string | null,
 *   onSelectPharmacy: (pharmacy: object) => void,
 * }} props
 */
function PharmacyMarkers({
  pharmacies,
  selectedPharmacyId,
  onSelectPharmacy,
}) {
  return (
    <>
      {pharmacies.map((pharmacy) => (
        <AdvancedMarker
          key={pharmacy.id}
          position={{ lat: pharmacy.lat, lng: pharmacy.lng }}
          title={pharmacy.name}
          onClick={() => onSelectPharmacy(pharmacy)}
          className={pharmacy.id === selectedPharmacyId ? "is-selected" : undefined}
        />
      ))}
    </>
  );
}

export default PharmacyMarkers;
