/**
 * Category registry — the single source of truth for the OSM feature
 * categories the app recognizes. DATA ONLY: no logic, no React, no fetches.
 *
 * Consumers read only what they need:
 * - osmService query builder: `overpass` selectors
 * - osmNormalize classification: `areaTag`, `amenityValue`, `highwayValue`,
 *   areaAmenity` (matching MECHANISMS stay code; the set of categories
 *   and their tag mappings live here)
 * - OsmLayer: `icon`, `polygon`, `mapStyle`
 * - GeographicAnalysis stats: `showInStats`, `statsLabel`
 *
 * The mapping flags:
 * - `areaTag`:      OSM tag key whose presence makes a closed way this category
 *                   (checked in registry order — building beats landuse beats amenity)
 * - `amenityValue`: nodes tagged `amenity=<id>` belong to this category
 * - `highwayValue`: nodes tagged `highway=<value>` belong to this category
 * - `areaAmenity`:  amenity nodes that ALSO count as areas when a way is closed
 * - `polygon`:      polygon features of this category are rendered on the map
 * - `mapStyle`:    how this category is drawn on the map — `fill`/`stroke` for
 *                   polygons, `color` for point markers. Each feature type has
 *                   its own hue so unrelated types never look alike.
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
    mapStyle: {
      fill: "#f59e0b",
      fillOpacity: 0.28,
      stroke: "#b45309",
      strokeWeight: 1,
    },
  },

  {
    id: "landuse",
    areaTag: "landuse",
    polygon: true,
    overpass: ['way["landuse"]'],
    icon: null,
    showInStats: false,
    statsLabel: null,
    mapStyle: {
      fill: "#14b8a6",
      fillOpacity: 0.2,
      stroke: "#0f766e",
      strokeWeight: 1,
    },
  },

  {
    id: "amenity",
    areaTag: "amenity",
    polygon: true,
    overpass: ['way["amenity"]', 'node["amenity"]'],
    icon: null,
    showInStats: false,
    statsLabel: null,
    mapStyle: {
      fill: "#14b8a6",
      fillOpacity: 0.16,
      stroke: "#0f766e",
      strokeWeight: 1,
    },
  },

  {
    id: "road",
    overpass: ['way["highway"]'],
    icon: null,
    showInStats: true,
    statsLabel: "Roads",
    mapStyle: {
      stroke: "#475569",
      strokeWeight: 2.5,
      strokeOpacity: 0.85,
    },
  },

  {
    id: "school",
    amenityValue: true,
    areaAmenity: true,
    icon: "🏫",
    showInStats: true,
    statsLabel: "Schools",
    mapStyle: { color: "#2563eb" },
  },

  {
    id: "hospital",
    amenityValue: true,
    areaAmenity: true,
    icon: "🏥",
    showInStats: true,
    statsLabel: "Hospitals",
    mapStyle: { color: "#dc2626" },
  },

  {
    id: "atm",
    amenityValue: true,
    icon: "🏧",
    showInStats: true,
    statsLabel: "ATMs",
    mapStyle: { color: "#4f46e5" },
  },

  {
    id: "bus_stop",
    highwayValue: "bus_stop",
    overpass: ['node["highway"="bus_stop"]'],
    icon: "🚌",
    showInStats: true,
    statsLabel: "Bus Stops",
    mapStyle: { color: "#0d9488" },
  },

  {
    id: "pharmacy",
    amenityValue: true,
    icon: "💊",
    showInStats: false,
    statsLabel: null,
    mapStyle: { color: "#16a34a" },
  },

  {
    id: "clinic",
    amenityValue: true,
    icon: "✚",
    showInStats: false,
    statsLabel: null,
    mapStyle: { color: "#db2777" },
  },

  {
    id: "university",
    amenityValue: true,
    areaAmenity: true,
    icon: "🎓",
    showInStats: false,
    statsLabel: null,
    mapStyle: { color: "#7c3aed" },
  },

  {
    id: "kindergarten",
    amenityValue: true,
    icon: "🧸",
    showInStats: false,
    statsLabel: null,
    mapStyle: { color: "#ea580c" },
  },

  {
    id: "unknown",
    icon: null,
    showInStats: false,
    statsLabel: null,
    mapStyle: { color: "#64748b" },
  },
];

/**
 * Looks up a category entry by id (null when unknown).
 */
export function getCategory(id) {
  return CATEGORIES.find((category) => category.id === id) ?? null;
}
