import { CATEGORIES } from "../lib/categories.js";
import { normalizeOsmElements } from "./osmNormalize.js";

// Personal Overpass mirror instance — NOT the public overpass-api.de.
const OVERPASS_URL =
  "https://overpass.nextgis.com/my-tCOjTwtH9vNzoB45YiiXwypiUnJOOBnE/api/interpreter";

/**
 * Fetches raw OSM elements from Overpass for the given query.
 * Throws on HTTP errors (the hook maps this to a UI error state).
 */
export async function fetchOsmData(query) {
  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json"
    },
    body: new URLSearchParams({
      data: query,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Overpass Error: ${response.status} - ${errorText}`
    );
  }

  const data = await response.json();

  return data.elements;
}

/**
 * Builds the Overpass QL query from the category registry's selectors.
 * The result is a union — clause order is semantically irrelevant.
 */
function buildOverpassQuery(latitude, longitude, radius) {
  const around = `(around:${radius},${latitude},${longitude})`;

  const clauses = CATEGORIES
    .flatMap((category) => category.overpass ?? [])
    .map((selector) => `    ${selector}${around};`)
    .join("\n");

  return `
    [out:json][timeout:25];

    (
${clauses}
    );

    out geom;
  `;
}

/**
 * Loads and normalizes the OSM features (buildings, roads, amenities,
 * transit stops) around a point. The only OSM function UI code calls.
 *
 * @returns {Promise<Array>} normalized features (see osmNormalize.js)
 */
export async function getGeographicFeatures(
  latitude,
  longitude,
  radius
) {
  const query = buildOverpassQuery(
    latitude,
    longitude,
    radius
  );

  const elements = await fetchOsmData(query);

  const features = normalizeOsmElements(elements);

  return features;
}
