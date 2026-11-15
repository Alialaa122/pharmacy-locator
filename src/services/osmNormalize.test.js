import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { normalizeOsmElements } from "./osmNormalize.js";

// Characterization tests: these pin the CURRENT behavior of
// normalizeOsmElements before any refactoring (roadmap step 2).
// If a refactor changes these numbers, that is a behavior change
// and must be a conscious, documented decision.

const node = (id, lat, lon, tags) => ({ type: "node", id, lat, lon, tags });
const way = (id, nodes, tags, geometry) => ({
  type: "way",
  id,
  nodes,
  tags,
  geometry,
});
const ringPoints = [
  { lat: 31.2, lon: 29.91 },
  { lat: 31.21, lon: 29.91 },
  { lat: 31.21, lon: 29.92 },
  { lat: 31.2, lon: 29.92 },
  { lat: 31.2, lon: 29.91 }, // closed ring
];
const ringNodeIds = [1, 2, 3, 4, 1];

describe("normalizeOsmElements — fixture (real Overpass response)", () => {
  it("produces the pinned feature counts from osm-data.json", async () => {
    const data = JSON.parse(
      await readFile(new URL("./osm-data.json", import.meta.url), "utf8"),
    );

    const features = normalizeOsmElements(data.elements);

    expect(features).toHaveLength(497);

    const byCategory = {};
    const byGeometry = {};
    for (const feature of features) {
      byCategory[feature.category] = (byCategory[feature.category] ?? 0) + 1;
      byGeometry[feature.geometryType] =
        (byGeometry[feature.geometryType] ?? 0) + 1;
    }

    expect(byCategory).toEqual({
      school: 3,
      hospital: 2,
      university: 1,
      atm: 3,
      road: 239,
      landuse: 65,
      building: 184,
    });

    expect(byGeometry).toEqual({
      Point: 6,
      LineString: 239,
      Polygon: 252,
    });
  });
});

describe("normalizeOsmElements — node classification", () => {
  it("maps amenity nodes to Point features with [lon, lat] coordinates", () => {
    const [feature] = normalizeOsmElements([
      node(1, 31.2, 29.9, { amenity: "pharmacy", name: "Test Pharmacy" }),
    ]);

    expect(feature).toEqual({
      id: "node/1",
      osmType: "node",
      category: "pharmacy",
      geometryType: "Point",
      name: "Test Pharmacy",
      tags: { amenity: "pharmacy", name: "Test Pharmacy" },
      coordinates: [29.9, 31.2],
    });
  });

  it("recognizes bus stops via highway=bus_stop", () => {
    const [feature] = normalizeOsmElements([
      node(2, 31.22, 29.94, { highway: "bus_stop" }),
    ]);

    expect(feature.category).toBe("bus_stop");
    expect(feature.geometryType).toBe("Point");
  });

  it("drops nodes without a relevant category (returns no feature)", () => {
    const features = normalizeOsmElements([
      node(3, 31.2, 29.9, { name: "just a named node" }),
    ]);

    expect(features).toHaveLength(0);
  });
});

describe("normalizeOsmElements — way classification", () => {
  it("maps closed building ways to Polygon features with ring-nested [lon, lat]", () => {
    const [feature] = normalizeOsmElements([
      way(10, ringNodeIds, { building: "yes" }, ringPoints),
    ]);

    expect(feature.category).toBe("building");
    expect(feature.geometryType).toBe("Polygon");
    expect(feature.coordinates).toEqual([
      [
        [29.91, 31.2],
        [29.91, 31.21],
        [29.92, 31.21],
        [29.92, 31.2],
        [29.91, 31.2],
      ],
    ]);
  });

  it("maps open highway ways to LineString road features", () => {
    const geometry = [
      { lat: 31.2, lon: 29.92 },
      { lat: 31.21, lon: 29.93 },
    ];
    const [feature] = normalizeOsmElements([
      way(11, [5, 6], { highway: "residential" }, geometry),
    ]);

    expect(feature.category).toBe("road");
    expect(feature.geometryType).toBe("LineString");
    expect(feature.coordinates).toEqual([
      [29.92, 31.2],
      [29.93, 31.21],
    ]);
  });

  it("drops closed ways that are neither building/landuse/amenity", () => {
    // closed ring but no recognized area tag → not an area, not a road
    const features = normalizeOsmElements([
      way(12, ringNodeIds, { barrier: "fence" }, ringPoints),
    ]);

    expect(features).toHaveLength(0);
  });

  it("classifies an amenity footprint as that amenity, not as a generic area", () => {
    // A school drawn as a closed way is a school: it must be counted as
    // one, and it must belong to the facilities layer.
    const [feature] = normalizeOsmElements([
      way(14, ringNodeIds, { amenity: "school", name: "Test School" }, ringPoints),
    ]);

    expect(feature.category).toBe("school");
    expect(feature.geometryType).toBe("Polygon");
  });

  it("still prefers building over a specific amenity", () => {
    const [feature] = normalizeOsmElements([
      way(
        15,
        ringNodeIds,
        { amenity: "school", building: "yes" },
        ringPoints
      ),
    ]);

    expect(feature.category).toBe("building");
  });

  it("keeps land use areas in the land use category", () => {
    const [feature] = normalizeOsmElements([
      way(16, ringNodeIds, { landuse: "residential" }, ringPoints),
    ]);

    expect(feature.category).toBe("landuse");
  });

  it("resolves way coordinates from its own geometry array, ignoring node references", () => {
    // Overpass `out geom` embeds coordinates; nodesById is only used for
    // relation members, so dangling node refs on a way do not drop it.
    const [feature] = normalizeOsmElements([
      way(13, [999, 888], { highway: "residential" }, [
        { lat: 31.2, lon: 29.92 },
        { lat: 31.21, lon: 29.93 },
      ]),
    ]);

    expect(feature.id).toBe("way/13");
    expect(feature.category).toBe("road");
    expect(feature.geometryType).toBe("LineString");
  });

  it("drops ways with no usable geometry", () => {
    const features = normalizeOsmElements([
      { type: "way", id: 14, nodes: [5, 6], tags: { highway: "residential" } },
    ]);

    expect(features).toHaveLength(0);
  });
});

describe("normalizeOsmElements — multipolygon relations", () => {
  const relation = (members, tags) => ({
    type: "relation",
    id: 20,
    members,
    tags,
  });
  const outerMember = { type: "way", ref: 30, role: "outer" };

  it("maps a closed outer ring to a landuse Polygon feature", () => {
    const [feature] = normalizeOsmElements([
      relation([outerMember], { landuse: "grass", type: "multipolygon" }),
      way(30, ringNodeIds, {}, ringPoints),
      ...ringNodeIds.map((id, index) =>
        node(id, ringPoints[index].lat, ringPoints[index].lon, {}),
      ),
    ]);

    expect(feature.id).toBe("relation/20");
    expect(feature.category).toBe("landuse");
    expect(feature.geometryType).toBe("Polygon");
    expect(feature.coordinates).toEqual([
      [
        [29.91, 31.2],
        [29.91, 31.21],
        [29.92, 31.21],
        [29.92, 31.2],
        [29.91, 31.2],
      ],
    ]);
  });

  it("drops relations whose outer way ring is not closed", () => {
    const openRingPoints = ringPoints.slice(0, 4);
    const openRingNodeIds = [5, 6, 7, 8];
    const features = normalizeOsmElements([
      relation([outerMember], { landuse: "grass", type: "multipolygon" }),
      way(30, openRingNodeIds, {}, openRingPoints),
      openRingNodeIds.map((id, index) =>
        node(id, openRingPoints[index].lat, openRingPoints[index].lon, {}),
      ),
    ]);

    expect(features).toHaveLength(0);
  });

  it("drops non-multipolygon relations", () => {
    const features = normalizeOsmElements([
      relation([outerMember], { type: "boundary" }),
    ]);

    expect(features).toHaveLength(0);
  });
});
