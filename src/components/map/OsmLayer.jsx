import { Polygon, Polyline, AdvancedMarker } from "@vis.gl/react-google-maps";
import { convertCoordinates } from "../../lib/geo.js";
import { getCategory } from "../../lib/categories.js";

/**
 * Renders OpenStreetMap features on the map. Rendering dispatches by
 * geometryType: Polygon → <Polygon>, road → <Polyline>, Point → marker.
 * (Preserved from the original App.jsx, including the single-ring-only
 * polygon filter — MultiPolygon relations are intentionally not drawn.)
 *
 * Only the categories in `visibleCategories` are drawn — the features
 * themselves are always loaded, so a hidden layer never triggers a new
 * request and the analysis can keep counting it.
 *
 * @param {{
 *   features: Array,
 *   visibleCategories?: Set<string> | Array<string>,
 * }} props - normalized OSM features
 */
function OsmLayer({ features, visibleCategories }) {
  const isVisible = (category) => {
    if (!visibleCategories) {
      return true;
    }

    return visibleCategories.has
      ? visibleCategories.has(category)
      : visibleCategories.includes(category);
  };

  const polygonFeatures = features.filter(
    (feature) =>
      feature.geometryType === "Polygon" &&
      getCategory(feature.category)?.polygon &&
      isVisible(feature.category)
  );
  const roadFeatures = features.filter(
    (feature) => feature.category === "road" && isVisible(feature.category)
  );
  const pointFeatures = features.filter(
    (feature) =>
      feature.geometryType === "Point" && isVisible(feature.category)
  );

  return (
    <>
      {polygonFeatures.map((feature) => (
        <Polygon
          key={feature.id}
          paths={convertCoordinates(feature.coordinates[0])}
          options={{
            fillColor: "#3b82f6",
            fillOpacity: 0.2,
            strokeColor: "#2563eb",
            strokeOpacity: 0.8,
            strokeWeight: 1,
          }}
        />
      ))}
      {roadFeatures.map((feature) => (
        <Polyline
          key={feature.id}
          path={convertCoordinates(feature.coordinates)}
          options={{
            strokeColor: "#f97316",
            strokeOpacity: 0.8,
            strokeWeight: 2,
          }}
        />
      ))}
      {pointFeatures.map((feature) => (
        <AdvancedMarker
          key={feature.id}
          position={{
            lat: feature.coordinates[1],
            lng: feature.coordinates[0],
          }}
          title={feature.name || feature.category}
        >
          <div className="geographic-marker">
            {getCategory(feature.category)?.icon || "📍"}
          </div>
        </AdvancedMarker>
      ))}
    </>
  );
}

export default OsmLayer;
