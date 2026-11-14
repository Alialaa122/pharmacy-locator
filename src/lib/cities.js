/**
 * Cities available in the location selector. Selecting a city only moves
 * the map (map.setCenter); it never sets a search location or triggers a
 * search (see docs/ARCHITECTURE.md §5).
 */
export const CITIES = [
  {
    id: "alexandria",
    name: "Alexandria",
    center: { lat: 31.2001, lng: 29.9187 },
    zoom: 14,
  },
  {
    id: "cairo",
    name: "Cairo",
    center: { lat: 30.0444, lng: 31.2357 },
    zoom: 14,
  },
  {
    id: "matrouh",
    name: "Matrouh",
    center: { lat: 31.3543, lng: 27.2373 },
    zoom: 14,
  },
];

// The app starts here; also the source of the map's default view.
export const DEFAULT_CITY = CITIES[0];
