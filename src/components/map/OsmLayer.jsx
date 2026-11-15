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
 * Each category is drawn in its own colour (see `mapStyle` in the
 * category registry) so unrelated feature types never look alike.
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
      {polygonFeatures.map((feature) => {
        const style = getCategory(feature.category)?.mapStyle ?? {};

        return (
          <Polygon
            key={feature.id}
            paths={convertCoordinates(feature.coordinates[0])}
            options={{
              fillColor: style.fill ?? "#64748b",
              fillOpacity: style.fillOpacity ?? 0.2,
              strokeColor: style.stroke ?? "#475569",
              strokeOpacity: 0.85,
              strokeWeight: style.strokeWeight ?? 1,
            }}
          />
        );
      })}

      {roadFeatures.map((feature) => {
        const style = getCategory(feature.category)?.mapStyle ?? {};

        return (
          <Polyline
            key={feature.id}
            path={convertCoordinates(feature.coordinates)}
            options={{
              strokeColor: style.stroke ?? "#475569",
              strokeOpacity: style.strokeOpacity ?? 0.85,
              strokeWeight: style.strokeWeight ?? 2,
            }}
          />
        );
      })}

      {pointFeatures.map((feature) => {
        const category = getCategory(feature.category);

        return (
          <AdvancedMarker
            key={feature.id}
            position={{
              lat: feature.coordinates[1],
              lng: feature.coordinates[0],
            }}
            title={feature.name || feature.category}
          >
            <div
              className="geographic-marker"
              style={{
                backgroundColor: category?.mapStyle?.color ?? "#64748b",
              }}
            >
              {category?.icon || "📍"}
            </div>
          </AdvancedMarker>
        );
      })}
    </>
  );
}

export default OsmLayer;
