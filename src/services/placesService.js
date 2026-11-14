/**
 * Searches nearby pharmacies with the Google Places SDK and maps the
 * results into plain app data. This is the ONLY module that touches the
 * Places SDK response shape (`place.location.lat()`, `displayName.text`).
 * Nothing Google-specific may appear downstream of this function.
 *
 * @param {object} placesLibrary - the Places library from `useMapsLibrary("places")`
 * @param {{ lat: number, lng: number }} center - required search center
 * @param {number} radius - search radius in meters
 * @returns {Promise<Array<{ id: string, name: string, address: string, lat: number, lng: number }>>}
 */
export async function searchPharmacies(placesLibrary, center, radius) {
  const request = {
    fields: [
      "displayName",
      "location",
      "formattedAddress",
    ],
    includedPrimaryTypes: ["pharmacy"],
    maxResultCount: 20,
    rankPreference:
      placesLibrary.SearchNearbyRankPreference.DISTANCE,
    locationRestriction: {
      center,
      radius,
    },
  };

  const { places } =
    await placesLibrary.Place.searchNearby(request);

  return places.map((place) => ({
    id: place.id,
    name: place.displayName?.text ?? "",
    address: place.formattedAddress ?? "",
    lat: place.location.lat(),
    lng: place.location.lng(),
  }));
}
