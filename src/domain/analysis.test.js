import { describe, it, expect } from "vitest";
import {
  computeAnalysisStats,
  formatTagValue,
  MAX_BREAKDOWN_ITEMS,
} from "./analysis.js";

function feature(category, tags = {}, geometryType = "Polygon") {
  return { id: `${category}-1`, category, tags, geometryType };
}

describe("formatTagValue", () => {
  it("turns OSM values into readable labels", () => {
    expect(formatTagValue("residential")).toBe("Residential");
    expect(formatTagValue("secondary_link")).toBe("Secondary link");
    expect(formatTagValue("yes")).toBe("Unspecified");
    expect(formatTagValue(undefined)).toBe("Unspecified");
  });
});

describe("computeAnalysisStats", () => {
  it("returns no groups for no features", () => {
    const stats = computeAnalysisStats([]);

    expect(stats.total).toBe(0);
    expect(stats.groups.every((group) => group.total === 0)).toBe(true);
  });

  it("counts buildings and breaks them down by type", () => {
    const stats = computeAnalysisStats([
      feature("building", { building: "yes" }),
      feature("building", { building: "yes" }),
      feature("building", { building: "apartments" }),
    ]);

    const buildings = stats.groups.find(
      (group) => group.id === "buildings"
    );

    expect(buildings.total).toBe(3);
    expect(buildings.items).toEqual([
      { key: "building:yes", label: "Unspecified", count: 2 },
      { key: "building:apartments", label: "Apartments", count: 1 },
    ]);
  });

  it("counts roads by class", () => {
    const stats = computeAnalysisStats([
      feature("road", { highway: "residential" }, "LineString"),
      feature("road", { highway: "residential" }, "LineString"),
      feature("road", { highway: "footway" }, "LineString"),
    ]);

    const roads = stats.groups.find(
      (group) => group.id === "transportation"
    );

    expect(roads.total).toBe(3);
    expect(roads.items[0]).toEqual({
      key: "highway:residential",
      label: "Residential",
      count: 2,
    });
  });

  it("counts facilities per category with their own labels", () => {
    const stats = computeAnalysisStats([
      feature("school", { amenity: "school" }, "Point"),
      feature("school", { amenity: "school" }, "Point"),
      feature("hospital", { amenity: "hospital" }, "Point"),
      feature("clinic", { amenity: "clinic" }, "Point"),
    ]);

    const facilities = stats.groups.find(
      (group) => group.id === "facilities"
    );

    expect(facilities.total).toBe(4);
    // Sorted by count (schools 2), then by label for equal counts.
    expect(facilities.items.map((item) => item.label)).toEqual([
      "Schools",
      "Clinics",
      "Hospitals",
    ]);
  });

  it("keeps the areas group apart from land use and other areas", () => {
    const stats = computeAnalysisStats([
      feature("landuse", { landuse: "residential" }),
      feature("landuse", { landuse: "commercial" }),
      feature("amenity", { amenity: "parking" }),
    ]);

    const areas = stats.groups.find((group) => group.id === "areas");

    expect(areas.total).toBe(3);
    expect(areas.items.map((item) => item.label)).toEqual([
      "Amenity areas",
      "Commercial",
      "Residential",
    ]);
  });

  it("folds the tail of a long breakdown into 'other'", () => {
    const features = [];

    for (let index = 0; index < MAX_BREAKDOWN_ITEMS + 3; index++) {
      features.push(
        feature("road", { highway: `road_${index}` }, "LineString")
      );
    }

    const stats = computeAnalysisStats(features);
    const roads = stats.groups.find(
      (group) => group.id === "transportation"
    );

    expect(roads.items).toHaveLength(MAX_BREAKDOWN_ITEMS);
    expect(roads.other).toBe(3);
    expect(roads.total).toBe(MAX_BREAKDOWN_ITEMS + 3);
  });

  it("does not count a feature outside the group", () => {
    const stats = computeAnalysisStats([
      feature("school", { amenity: "school" }, "Point"),
    ]);

    const roads = stats.groups.find(
      (group) => group.id === "transportation"
    );

    expect(roads.total).toBe(0);
  });

  it("never includes the pharmacy search results as OSM features", () => {
    const stats = computeAnalysisStats([]);

    expect(stats.groups.some((group) => group.id === "pharmacies")).toBe(
      false
    );
  });
});
