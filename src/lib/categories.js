/**
 * Category registry — the single source of truth for the OSM feature
 * categories the app recognizes. DATA ONLY: no logic, no React, no fetches.
 *
 * Consumers read only what they need:
 * - osmService query builder: `overpass` selectors
 * - osmNormalize classification: `areaTag`, `amenityValue`, `highwayValue`,
 *   `areaAmenity` (matching MECHANISMS stay code; the set of categories
 *   and their tag mappings live here)
 * - OsmLayer: `icon`, `polygon`
 * - GeographicAnalysis stats: `showInStats`, `statsLabel`
 *
 * The mapping flags:
 * - `areaTag`:      OSM tag key whose presence makes a closed way this category
 *                   (checked in registry order — building beats landuse beats amenity)
 * - `amenityValue`: nodes tagged `amenity=<id>` belong to this category
 * - `highwayValue`: nodes tagged `highway=<value>` belong to this category
 * - `areaAmenity`:  amenity nodes that ALSO count as areas when a way is closed
 * - `polygon`:      polygon features of this category are rendered on the map
 *
 * Registry order drives: area-tag precedence, Overpass clause order
 * (semantically irrelevant — it's a union), and the stats panel row order.
 */
export const CATEGORIES = [
  {
    id: "building",
    areaTag: "building",
    polygon: true,
    overpass: ['way["building"]'],
    icon: null,
    showInStats: true,
    statsLabel: "Buildings",
  },

  {
    id: "landuse",
    areaTag: "landuse",
    polygon: true,
    overpass: ['way["landuse"]'],
    icon: null,
    showInStats: false,
    statsLabel: null,
  },

  {
    id: "amenity",
    areaTag: "amenity",
    polygon: true,
    overpass: ['way["amenity"]', 'node["amenity"]'],
    icon: null,
    showInStats: false,
    statsLabel: null,
  },

  {
    id: "road",
    overpass: ['way["highway"]'],
    icon: null,
    showInStats: true,
    statsLabel: "Roads",
  },

  {
    id: "school",
    amenityValue: true,
    areaAmenity: true,
    icon: "🏫",
    showInStats: true,
    statsLabel: "Schools",
  },

  {
    id: "hospital",
    amenityValue: true,
    areaAmenity: true,
    icon: "🏥",
    showInStats: true,
    statsLabel: "Hospitals",
  },

  {
    id: "atm",
    amenityValue: true,
    icon: "🏧",
    showInStats: true,
    statsLabel: "ATMs",
  },

  {
    id: "bus_stop",
    highwayValue: "bus_stop",
    overpass: ['node["highway"="bus_stop"]'],
    icon: "🚌",
    showInStats: true,
    statsLabel: "Bus Stops",
  },

  {
    id: "pharmacy",
    amenityValue: true,
    icon: "💊",
    showInStats: false,
    statsLabel: null,
  },

  {
    id: "clinic",
    amenityValue: true,
    icon: null,
    showInStats: false,
    statsLabel: null,
  },

  {
    id: "university",
    amenityValue: true,
    areaAmenity: true,
    icon: null,
    showInStats: false,
    statsLabel: null,
  },

  {
    id: "kindergarten",
    amenityValue: true,
    icon: null,
    showInStats: false,
    statsLabel: null,
  },

  {
    id: "unknown",
    icon: null,
    showInStats: false,
    statsLabel: null,
  },
];

/**
 * Looks up a category entry by id (null when unknown).
 */
export function getCategory(id) {
  return CATEGORIES.find((category) => category.id === id) ?? null;
}
