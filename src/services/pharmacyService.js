
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

export function calculateDistance(point1, point2) {
  const R = 6371000; // Earth's radius in meters

  const lat1 = toRadians(point1.lat);
  const lat2 = toRadians(point2.lat);

  const deltaLat = toRadians(point2.lat - point1.lat);
  const deltaLng = toRadians(point2.lng - point1.lng);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) ** 2;

  const c = 2 * Math.atan2(
    Math.sqrt(a),
    Math.sqrt(1 - a)
  );

  return R * c;
}

console.log(
  calculateDistance(
    { lat: 31.2001, lng: 29.9187 },
    { lat: 31.2050, lng: 29.9250 }
  )
);

export function generateGridCenters(bbox, stepKm = 5) {
  const [west, south, east, north] = bbox;

  const centers = [];
  const latStep = stepKm / 111.32;

  for (
    let lat = south + latStep / 2;
    lat < north;
    lat += latStep
  ) {
    const lonStep =
      stepKm / (111.32 * Math.cos((lat * Math.PI) / 180));

    for (
      let lon = west + lonStep / 2;
      lon < east;
      lon += lonStep
    ) {
      centers.push({ lat, lng: lon });
    }
  }

  return centers;
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


const ALEXANDRIA_BBOX = [
  29.70, // west
  31.05, // south
  30.10, // east
  31.35, // north
];

export async function searchGooglePharmacies(placesLibrary,selectedLocation,searchRadius) {
    const centers = selectedLocation
    ? [selectedLocation]
    : generateGridCenters(ALEXANDRIA_BBOX).filter(
        (_, index) => index % 4 === 0
    );

  const uniquePlaces = new Map();

  for (let i = 0; i < centers.length; i++) {
    const center = centers[i];

    try {
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
          radius: searchRadius,
        },
      };

      const { places } =
        await placesLibrary.Place.searchNearby(request);

      for (const place of places) {
        uniquePlaces.set(place.id, place);
      }

      console.log(
        `Completed center ${i + 1}/${centers.length}: ${uniquePlaces.size}`
      );

    } catch (error) {
      console.error("Search failed:", center, error);
    }

    if (i < centers.length - 1) {
      await delay(500);
    }
  }

  return [...uniquePlaces.values()];
}