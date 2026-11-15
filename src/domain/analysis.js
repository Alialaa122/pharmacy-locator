/**
 * Geographic analysis — pure statistics over the loaded OSM features.
 *
 * The statistics are DERIVED from the features, never stored: the
 * panel shows the same numbers whether or not the matching layer is
 * drawn on the map.
 *
 * Every group mirrors a layer group (see lib/layers.js) so the panel
 * and the map speak the same vocabulary, and every number comes from
 * the data that was actually loaded — nothing is estimated.
 */

import { LAYER_GROUPS } from "../lib/layers.js";
import { getCategory } from "../lib/categories.js";

/** How many breakdown rows a group shows before the rest is folded into "Other". */
export const MAX_BREAKDOWN_ITEMS = 7;

/**
 * Turns a raw OSM value into a readable label: "residential" →
 * "Residential", "yes" → "Unspecified".
 */
export function formatTagValue(value) {
  if (!value || value === "yes") {
    return "Unspecified";
  }

  return value
    .replace(/_/g, " ")
    .replace(/^./, (character) => character.toUpperCase());
}

/**
 * The breakdown row of a feature, per group. Groups that are broken
 * down by their OSM tag use the tag value; the others use the
 * category's own label.
 */
const ITEM_BUILDERS = {
  buildings: (feature) => {
    const value = feature.tags?.building ?? "yes";

    return { key: `building:${value}`, label: formatTagValue(value) };
  },

  areas: (feature) => {
    if (feature.category !== "landuse") {
      return {
        key: `area:${feature.category}`,
        label:
          getCategory(feature.category)?.statsLabel ??
          formatTagValue(feature.category),
      };
    }

    const value = feature.tags?.landuse ?? "unspecified";

    return { key: `landuse:${value}`, label: formatTagValue(value) };
  },

  transportation: (feature) => {
    const value = feature.tags?.highway ?? "unknown";

    return { key: `highway:${value}`, label: formatTagValue(value) };
  },
};

function categoryItem(feature) {
  return {
    key: `category:${feature.category}`,
    label:
      getCategory(feature.category)?.statsLabel ??
      formatTagValue(feature.category),
  };
}

/**
 * Counts the features of one layer group and breaks them down.
 *
 * @param {object} group - a layer group from lib/layers.js
 * @param {Array} features - normalized OSM features
 * @returns {{ id: string, label: string, total: number, items: Array, other: number }}
 */
function analyseGroup(group, features) {
  const build = ITEM_BUILDERS[group.id] ?? categoryItem;
  const counters = new Map();

  for (const feature of features) {
    if (!group.categories.includes(feature.category)) {
      continue;
    }

    const { key, label } = build(feature);

    const existing = counters.get(key);

    counters.set(key, {
      key,
      label,
      count: (existing?.count ?? 0) + 1,
    });
  }

  const sorted = [...counters.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label)
  );

  return {
    id: group.id,
    label: group.label,
    total: sorted.reduce((sum, item) => sum + item.count, 0),
    items: sorted.slice(0, MAX_BREAKDOWN_ITEMS),
    other: sorted
      .slice(MAX_BREAKDOWN_ITEMS)
      .reduce((sum, item) => sum + item.count, 0),
  };
}

/**
 * Computes the statistics of the selected area.
 *
 * @param {Array} features - normalized OSM features
 * @returns {{
 *   total: number,
 *   groups: Array<{
 *     id: string, label: string, total: number,
 *     items: Array<{ key: string, label: string, count: number }>,
 *     other: number,
 *   }>,
 * }} - the groups with their breakdowns, in layer-group order
 */
export function computeAnalysisStats(features) {
  const list = features ?? [];

  const groups = LAYER_GROUPS.filter(
    (group) => group.id !== "pharmacies"
  ).map((group) => analyseGroup(group, list));

  return {
    total: groups.reduce((sum, group) => sum + group.total, 0),
    groups,
  };
}
