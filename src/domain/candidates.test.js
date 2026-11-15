import { describe, it, expect } from "vitest";
import { calculateDistance as calculateDistanceMeters } from "../lib/geo.js";
import {
  MIN_WALKING_DISTANCE_METERS,
  ROAD_EXCLUSION_METERS,
  MAX_ROUTING_BUDGET,
  MAX_RECOMMENDATIONS,
  MIN_DISTINCT_SPACING,
  generateCandidatePoints,
  filterOffRoad,
  filterFarEnough,
  budgetCandidates,
  applyWalkingGate,
  selectDistinctCandidates,
} from "./candidates.js";

// Test geography near Alexandria (31.2°N). 1° latitude ≈ 111 194.93 m.
const CENTER = { lat: 31.2001, lng: 29.9187 };
const PHARMACY_A = { id: "p1", name: "Pharmacy A", lat: 31.2001, lng: 29.9187 };
const PHARMACY_B = { id: "p2", name: "Pharmacy B", lat: 31.2001, lng: 29.9300 };

const point = (id, latOffsetMeters, lngOffsetMeters = 0, lng = CENTER.lng) => ({
  id,
  lat: CENTER.lat + latOffsetMeters / 111194.93,
  lng: lng + lngOffsetMeters / (111194.93 * Math.cos((CENTER.lat * Math.PI) / 180)),
});

const horizontalRoad = (id, lat, lngStart, lngEnd) => ({
  id,
  category: "road",
  geometryType: "LineString",
  name: null,
  coordinates: [
    [lngStart, lat],
    [lngEnd, lat],
  ],
});

describe("constants", () => {
  it("pins the agreed contract", () => {
    expect(MIN_WALKING_DISTANCE_METERS).toBe(100);
    expect(ROAD_EXCLUSION_METERS).toBe(15);
    expect(MAX_ROUTING_BUDGET).toBe(20);
    expect(MAX_RECOMMENDATIONS).toBe(3);
    expect(MIN_DISTINCT_SPACING).toBe(200);
  });
});

describe("generateCandidatePoints", () => {
  it("produces a deterministic 5x5 grid (25 points, radius-independent count)", () => {
    const points = generateCandidatePoints(CENTER, 1000);

    expect(points).toHaveLength(25);
    expect(points[0].id).toBe("grid--2--2");

    // Spacing = radius / 4 = 250 m between adjacent points
    const row22 = points.find((p) => p.id === "grid--2--2");
    const row21 = points.find((p) => p.id === "grid--2--1");
    expect(
      calculateDistanceMeters(row21, row22)
    ).toBeCloseTo(250, 0);
  });

  it("keeps every point inside (or on) the selected radius", () => {
    for (const radius of [200, 1000, 3000]) {
      const points = generateCandidatePoints(CENTER, radius);

      for (const p of points) {
        expect(calculateDistanceMeters(p, CENTER)).toBeLessThanOrEqual(radius + 1);
      }

      // Same count for every radius — the count is radius-independent
      expect(points).toHaveLength(25);
    }
  });

  it("is deterministic: same input, same output (stable ids and order)", () => {
    expect(generateCandidatePoints(CENTER, 1000))
      .toEqual(generateCandidatePoints(CENTER, 1000));
  });

  it("scales spacing with the radius (spacing = radius / 4)", () => {
    const small = generateCandidatePoints(CENTER, 400); // spacing 100 m
    const big = generateCandidatePoints(CENTER, 1600);   // spacing 400 m

    const smallCenter = small.find((p) => p.id === "grid-0-1");
    const smallWest = small.find((p) => p.id === "grid-0-0");
    const bigCenter = big.find((p) => p.id === "grid-0-1");
    const bigWest = big.find((p) => p.id === "grid-0-0");

    expect(calculateDistanceMeters(smallCenter, smallWest)).toBeCloseTo(100, 0);
    expect(calculateDistanceMeters(bigCenter, bigWest)).toBeCloseTo(400, 0);
  });

  it("returns nothing for invalid input", () => {
    expect(generateCandidatePoints(null, 1000)).toEqual([]);
    expect(generateCandidatePoints(CENTER, 0)).toEqual([]);
    expect(generateCandidatePoints(CENTER, -50)).toEqual([]);
  });
});

describe("filterOffRoad", () => {
  const road = horizontalRoad("way/1", CENTER.lat, 29.9, 29.93);

  it("rejects a candidate ON a road centerline", () => {
    const onRoad = point("on", 0); // lat = CENTER.lat = the road's latitude
    const offRoad = point("off", 30); // 30 m north of the road

    expect(filterOffRoad([onRoad, offRoad], [road])
      .map((p) => p.id)).toEqual(["off"]);
  });

  it("rejects near the road (within 15 m) but allows proximity beyond it", () => {
    const justInside = point("i", 14);
    const justOutside = point("o", 16);

    // Boundary is exclusive: exactly < 15 rejects, ≥ 15 keeps
    expect(filterOffRoad([justInside], [road])).toHaveLength(0);
    expect(filterOffRoad([justOutside], [road])).toHaveLength(1);
  });

  it("keeps everything when no road features exist", () => {
    const near = point("a", 5); // 5 m north of the road...

    expect(filterOffRoad([near], [])).toHaveLength(1);
    expect(filterOffRoad([near], undefined)).toHaveLength(1);
  });

  it("only treats category 'road' LineStrings as roads (buildings ignored)", () => {
    const onRoad = point("on", 0);
    const building = {
      id: "way/9",
      category: "building",
      geometryType: "Polygon",
      name: null,
      coordinates: [[[29.9, CENTER.lat], [29.93, CENTER.lat], [29.9, CENTER.lat]]],
    };

    expect(filterOffRoad([onRoad], [building])).toHaveLength(1);
  });

  it("rejects when ANY road is close (not just the closest feature)", () => {
    const road2 = horizontalRoad("way/2", CENTER.lat + 40 / 111194.93, 29.9, 29.93);
    const nearRoad2Only = point("r", 40); // 40 m north = on road2, 40 m from road1

    expect(filterOffRoad([nearRoad2Only], [road, road2])).toHaveLength(0);
  });
});

describe("filterFarEnough", () => {
  it("rejects a point straight-line < 100 m from ANY pharmacy (boundary inclusive)", () => {
    const justInside = point("in", 0, -99);   // 99 m west of A
    const justOutside = point("out", 0, -101); // 101 m west of A

    const survivors = filterFarEnough([justInside, justOutside], [PHARMACY_A]);

    expect(survivors.map((p) => p.id)).toEqual(["out"]);
    expect(survivors[0].straightSeparationMeters).toBeCloseTo(101, 0);
  });

  it("rejects based on the NEAREST pharmacy, even if far from the others", () => {
    const tooClose = point("c", 55, 0); // 55 m north of A, ~1.2 km from B

    expect(filterFarEnough([tooClose], [PHARMACY_A, PHARMACY_B])).toEqual([]);
  });

  it("annotates survivors with the minimum straight-line separation", () => {
    const result = filterFarEnough([point("x", 0, -300)], [PHARMACY_A, PHARMACY_B]);

    expect(result[0].straightSeparationMeters).toBeCloseTo(300, 0);
  });

  it("returns nothing when there are no pharmacies (nothing to measure against)", () => {
    expect(filterFarEnough([point("s", 0, 0)], [])).toEqual([]);
    expect(filterFarEnough([point("s", 0, 0)], null)).toEqual([]);
  });
});

describe("budgetCandidates", () => {
  it("sorts by straight-line margin descending and caps at the budget", () => {
    const near = { id: "near", lat: 0, lng: 0, straightSeparationMeters: 120 };
    const far = { id: "far", lat: 1, lng: 1, straightSeparationMeters: 900 };

    const result = budgetCandidates([near, far]);

    expect(result.map((c) => c.id)).toEqual(["far", "near"]);
  });

  it("caps larger lists at MAX_ROUTING_BUDGET, keeping the largest margins", () => {
    const many = Array.from({ length: 25 }, (_, i) => ({
      id: `c${i}`,
      lat: i,
      lng: 0,
      straightSeparationMeters: 100 + i * 10,
    }));

    const result = budgetCandidates(many);

    expect(result).toHaveLength(MAX_ROUTING_BUDGET);
    expect(result).toContainEqual(expect.objectContaining({ id: "c24" }));
    expect(result.find((c) => c.id === "c0")).toBeUndefined();
  });
});

describe("applyWalkingGate", () => {
  const candidate = (id, straight = 300) => ({
    id,
    lat: CENTER.lat,
    lng: CENTER.lng,
    straightSeparationMeters: straight,
  });

  it("validates from the NEAREST walking distance and records the nearest pharmacy", () => {
    const matrix = [[
      { distanceMeters: 180, durationSeconds: 144 }, // A
      { distanceMeters: 400, durationSeconds: 320 }, // B
    ]];

    const valid = applyWalkingGate([candidate("c1")], matrix, [PHARMACY_A, PHARMACY_B]);

    expect(valid).toHaveLength(1);
    expect(valid[0].walkingSeparationMeters).toBe(180);
    expect(valid[0].nearestPharmacyName).toBe("Pharmacy A");
  });

  it("the WALKING rule beats straight-line: 300 m straight but 90 m walking is INVALID", () => {
    const matrix = [
      [{ distanceMeters: 90, durationSeconds: 72 }],
    ];

    // Straight-line says compliant (300 m); walking is the measure — reject
    expect(
      applyWalkingGate([candidate("c", 300)], matrix, [PHARMACY_A])
    ).toEqual([]);
  });

  it("boundary: exactly 100 m walking is valid", () => {
    const matrix = [
      [{ distanceMeters: 100, durationSeconds: 80 }],
    ];

    expect(
      applyWalkingGate([candidate("c")], matrix, [PHARMACY_A])
    ).toHaveLength(1);
  });

  it("ANY missing route makes the candidate invalid (strict — never assumed valid)", () => {
    const oneNull = [[{ distanceMeters: 300, durationSeconds: 1 }, null]];
    const allNull = [[null, null]];

    expect(
      applyWalkingGate([candidate("a"), candidate("b")], [oneNull, allNull], [PHARMACY_A, PHARMACY_B])
    ).toEqual([]);
  });

  it("an empty or missing matrix (routing completely failed) validates nothing", () => {
    expect(
      applyWalkingGate([candidate("a")], [], [PHARMACY_A, PHARMACY_B])
    ).toEqual([]);
    expect(
      applyWalkingGate([candidate("a")], undefined, [PHARMACY_A])
    ).toEqual([]);
  });
});

describe("selectDistinctCandidates", () => {
  it("enforces mutual spacing in input order and stops at 3", () => {
    const a = point("a", 0, 0);            // 0 m
    const b = point("b", 150, 0);           // 150 m north of a — too close
    const c = point("c", 400, 0);           // 400 m north of a — ok
    const d = point("d", 650, 0);           // 250 m from c — ok

    const selected = selectDistinctCandidates([a, b, c, d]);

    // Scan order: a, skip b (150 m from a), c, d (250 m from c),
    // stop at 3
    expect(selected.map((p) => p.id)).toEqual(["a", "c", "d"]);
  });

  it("returns fewer when fewer candidates clear the spacing", () => {
    const a = point("a", 0, 0);
    const b = point("b", 100, 0);

    expect(selectDistinctCandidates([a, b])).toHaveLength(1);
    expect(selectDistinctCandidates([a, b])[0].id).toBe("a");
  });

  it("handles empty input", () => {
    expect(selectDistinctCandidates([])).toEqual([]);
    expect(selectDistinctCandidates(null)).toEqual([]);
  });
});

describe("full pipeline (composition)", () => {
  function runPipeline(center, radius, roads, pharmacies, matrix) {
    const points = generateCandidatePoints(center, radius);
    const offRoad = filterOffRoad(points, roads);
    const farEnough = filterFarEnough(offRoad, pharmacies);
    const budgeted = budgetCandidates(farEnough);
    const valid = applyWalkingGate(budgeted, matrix, pharmacies);

    return {
      stages: { points, offRoad, farEnough, budgeted, valid },
      result: selectDistinctCandidates(valid),
    };
  }

  it("finds up to 3 mutually distinct valid candidates end to end", () => {
    const radius = 300;
    const road = horizontalRoad("way/1", CENTER.lat, 29.9, 29.93); // cuts the middle row

    // The middle row (grid-0-*) sits on the road — those 5 are excluded,
    // the other 20 (all ≥ 100 m straight-line from the centered pharmacy)
    // survive into the routing budget.
    const matrix = Array.from({ length: 20 }, () => [
      { distanceMeters: 260, durationSeconds: 208 },
    ]);

    const { result } = runPipeline(CENTER, radius, [road], [PHARMACY_A], matrix);

    expect(result.length).toBeLessThanOrEqual(MAX_RECOMMENDATIONS);
    // With a 75 m grid and 200 m mutual spacing, at least one must survive
    expect(result.length).toBeGreaterThanOrEqual(1);
    for (const candidate of result) {
      expect(candidate.walkingSeparationMeters).toBe(260);
      expect(candidate.nearestPharmacyName).toBe("Pharmacy A");
    }
    // Mutual spacing is enforced in the output
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        expect(calculateDistanceMeters(result[i], result[j]))
          .toBeGreaterThanOrEqual(MIN_DISTINCT_SPACING);
      }
    }
  });

  it("is deterministic end to end", () => {
    const road = horizontalRoad("way/1", CENTER.lat, 29.9, 29.93);
    const run = () => {
      const budgeted = budgetCandidates(filterFarEnough(
        filterOffRoad(generateCandidatePoints(CENTER, 300), [road]),
        [PHARMACY_A]
      ));

      return selectDistinctCandidates(
        applyWalkingGate(
          budgeted,
          budgeted.map(() => [{ distanceMeters: 300, durationSeconds: 240 }]),
          [PHARMACY_A]
        )
      );
    };

    expect(run()).toEqual(run());
  });

  it("produces nothing when routing fails (no valid walking proof)", () => {
    const { result } = runPipeline(
      CENTER, 300, [], [PHARMACY_A], [] // empty matrix
    );

    expect(result).toEqual([]);
  });
});
