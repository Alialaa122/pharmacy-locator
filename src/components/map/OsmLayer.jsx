import { Polygon, Polyline, AdvancedMarker } from "@vis.gl/react-google-maps";
import { convertCoordinates } from "../../lib/geo.js";

// Step 7 (category registry) will replace this hard-coded map with
// the registry's icon field.
const CATEGORY_ICONS = {
  hospital: "🏥",
  school: "🏫",
  atm: "🏧",
  bus_stop: "🚌",
  pharmacy: "💊",
};

/**
 * Renders OpenStreetMap features on the map. Rendering dispatches by
 * geometryType: Polygon → <Polygon>, road → <Polyline>, Point → marker.
 * (Preserved from the original App.jsx, including the single-ring-only
 * polygon filter — MultiPolygon relations are intentionally not drawn.)
 *
 * @param {{ features: Array }} props - normalized OSM features
 */
function OsmLayer({ features }) {
  const polygonFeatures = features.filter(
    (feature) =>
      feature.geometryType === "Polygon" &&
      ["building", "landuse", "amenity"].includes(feature.category)
  );
  const roadFeatures = features.filter(
    (feature) => feature.category === "road"
  );
  const pointFeatures = features.filter(
    (feature) => feature.geometryType === "Point"
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
            {CATEGORY_ICONS[feature.category] || "📍"}
          </div>
        </AdvancedMarker>
      ))}
    </>
  );
}

export default OsmLayer;
