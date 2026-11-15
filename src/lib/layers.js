/**
 * Map layer registry — DATA ONLY: no logic, no React, no fetches.
 *
 * A layer group maps to one or more OSM category ids from
 * `lib/categories.js`. The "pharmacies" group is special: it holds the
 * Google Places search results, not OSM features.
 *
 * Layer visibility is a VIEW concern only: hiding a layer never stops
 * the data from being loaded, and the geographic analysis counts
 * everything that was loaded regardless of what is drawn.
 */

export const LAYER_GROUPS = [
  {
    id: "pharmacies",
    label: "Pharmacies",
    description: "Pharmacies returned by the current search",
    icon: "💊",
    categories: [],
    defaultVisible: true,
  },
  {
    id: "areas",
    label: "Areas",
    description: "Geographic polygons (land use and amenity areas)",
    icon: "🗺️",
    categories: ["landuse", "amenity"],
    defaultVisible: false,
  },
  {
    id: "transportation",
    label: "Transportation",
    description: "Roads and paths",
    icon: "🛣️",
    categories: ["road"],
    defaultVisible: false,
  },
  {
    id: "buildings",
    label: "Buildings",
    description: "Building footprints",
    icon: "🏢",
    categories: ["building"],
    defaultVisible: false,
  },
  {
    id: "facilities",
    label: "Facilities",
    description: "Schools, hospitals, clinics and universities",
    icon: "🏥",
    categories: [
      "school",
      "hospital",
      "clinic",
      "university",
      "kindergarten",
    ],
    defaultVisible: false,
  },
  {
    id: "poi",
    label: "Points of interest",
    description: "ATMs, bus stops and other points of interest",
    icon: "📍",
    categories: ["atm", "bus_stop", "pharmacy"],
    defaultVisible: false,
  },
];

/** Visibility of every layer group when the application starts. */
export const DEFAULT_LAYER_VISIBILITY = Object.fromEntries(
  LAYER_GROUPS.map((group) => [group.id, group.defaultVisible])
);

/**
 * The OSM categories that should be drawn, given the current layer
 * visibility.
 *
 * @param {Record<string, boolean>} visibility - group id -> visible
 * @returns {Set<string>} category ids to draw
 */
export function visibleCategories(visibility) {
  const categories = new Set();

  for (const group of LAYER_GROUPS) {
    if (!visibility?.[group.id]) {
      continue;
    }

    for (const category of group.categories) {
      categories.add(category);
    }
  }

  return categories;
}
