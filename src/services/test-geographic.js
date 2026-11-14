
import { getGeographicFeatures } from "./osmService.js";
const features = await getGeographicFeatures(
  31.2001,
  29.9187,
  500
);

console.log("Normalized features:", features.length);

console.log(
  "Features by category:",
  features.reduce((result, feature) => {
    result[feature.category] =
      (result[feature.category] || 0) + 1;

    return result;
  }, {})
);