import { describe, it, expect } from "vitest";
import {
  calculateDistance,
  polygonCentroid,
  lineMidpoint,
  distanceToPolylineMeters,
} from "./geo.js";

// Characterization test for the haversine implementation.
// Its main job is to ANCHOR THE UNIT (meters).

describe("calculateDistance", () => {
  it("returns 0 for identical points", () => {
    const point = { lat: 31.2001, lng: 29.9187 };

    expect(calculateDistance(point, point)).toBe(0);
  });

  it("returns meters for a known Alexandria pair (~810 m, not km)", () => {
    const a = { lat: 31.2001, lng: 29.9187 };
    const b = { lat: 31.2050, lng: 29.9250 };

    const meters = calculateDistance(a, b);

    expect(meters).toBeCloseTo(809.87, 1);
    // unit anchor: a value in kilometers would be ~0.81 here
    expect(meters).toBeGreaterThan(500);
    expect(meters).toBeLessThan(1200);
  });

  it("matches the meridian arc length: 1 degree of latitude ≈ 111 195 m", () => {
    const meters = calculateDistance(
      { lat: 0, lng: 0 },
      { lat: 1, lng: 0 },
    );

    // π * R / 180 with R = 6 371 000 → 111 194.93 m
    expect(meters).toBeCloseTo(111194.93, 0);
  });
});

describe("polygonCentroid", () => {
  // A 100 m x 100 m building near Alexandria (1° latitude ≈ 111 195 m,
  // 1° longitude at 31.2°N ≈ 95 000 m).
  const building = [
    [29.9187, 31.2001],
    [29.9187, 31.2010],
    [29.9198, 31.2010],
    [29.9198, 31.2001],
    [29.9187, 31.2001], // closed ring, as the normalizer emits
  ];

  it("returns the geometric center of a simple rectangle", () => {
    const [lon, lat] = polygonCentroid(building);

    expect(lon).toBeCloseTo(29.91925, 8);
    expect(lat).toBeCloseTo(31.20055, 8);
  });

  it("accepts an open ring (no closing duplicate)", () => {
    const [lon, lat] = polygonCentroid(building.slice(0, -1));

    expect(lon).toBeCloseTo(29.91925, 8);
    expect(lat).toBeCloseTo(31.20055, 8);
  });

  it("returns null for degenerate rings", () => {
    // Too few points
    expect(polygonCentroid([[0, 0], [1, 1]])).toBeNull();
    // Collinear points → zero area
    expect(
      polygonCentroid([[0, 0], [1, 1], [2, 2], [0, 0]])
    ).toBeNull();
    // Null/empty input
    expect(polygonCentroid(null)).toBeNull();
    expect(polygonCentroid([])).toBeNull();
  });

  it("handles irregular (non-convex) rings", () => {
    // L-shaped polygon; centroid must lie inside the bounding box
    const lShape = [
      [0, 0],
      [0, 2],
      [1, 2],
      [1, 1],
      [2, 1],
      [2, 0],
      [0, 0],
    ];

    const centroid = polygonCentroid(lShape);

    expect(centroid).not.toBeNull();
    expect(centroid[0]).toBeGreaterThan(0);
    expect(centroid[1]).toBeGreaterThan(0);
  });
});

describe("lineMidpoint", () => {
  it("returns the middle vertex of an open line", () => {
    // 5 points → middle index 2
    const line = [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
    ];

    expect(lineMidpoint(line)).toEqual([2, 0]);
  });

  it("returns the first vertex for a closed ring (deterministic anchor)", () => {
    const ring = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ];

    expect(lineMidpoint(ring)).toEqual([0, 0]);
  });

  it("returns null for too-short lines", () => {
    expect(lineMidpoint([[0, 0]])).toBeNull();
    expect(lineMidpoint(null)).toBeNull();
    expect(lineMidpoint([])).toBeNull();
  });
});

describe("distanceToPolylineMeters", () => {
  it("returns meters for a point offset PERPENDICULAR to a straight line", () => {
    // Lat-axis: 1° = 111 194.93 m, so 100 m north = 100/111194.93°.
    // Test in latitude so the cos(lat) longitude scaling is not involved.
    const meters = distanceToPolylineMeters(
      { lat: 31.2 + 100 / 111194.93, lng: 29.905 },
      [[29.9, 31.2], [29.91, 31.2]]
    );

    expect(meters).toBeCloseTo(100, 0);
  });

  it("scales longitude by cos(lat): 100 m east of a N-S line at 31.2°N", () => {
    // North-south line at lng 29.9 (lat 31.2 → 31.3); the perpendicular
    // offset is in the LONGITUDE direction, so the cos(lat) scaling is
    // what makes the result come out in meters.
    // 1° longitude at 31.2°N = 111194.93 * cos(31.2°) m
    const metersPerDegreeLon = 111194.93 * Math.cos((31.2 * Math.PI) / 180);

    const meters = distanceToPolylineMeters(
      { lat: 31.25, lng: 29.9 + 100 / metersPerDegreeLon },
      [[29.9, 31.2], [29.9, 31.3]]
    );

    expect(meters).toBeCloseTo(100, 0);
  });

  it("returns 0 for a point on the line", () => {
    expect(
      distanceToPolylineMeters(
        { lat: 31.2, lng: 29.905 },
        [[29.9, 31.2], [29.91, 31.2]]
      )
    ).toBeCloseTo(0, 5);
  });

  it("uses the NEAREST segment of a multi-segment polyline", () => {
    // At lat 0, both axes are 111194.93 m/°. The vertical second
    // segment (x = 1, y 0..1) is 0.5° east of the point.
    const meters = distanceToPolylineMeters(
      { lat: 0.5, lng: 1.5 },
      [[0, 0], [1, 0], [1, 1]]
    );

    expect(meters).toBeCloseTo(0.5 * 111194.93, 0);
  });

  it("clamps the projection to the segment endpoints (nearest = endpoint)", () => {
    // Point 0.5° west of the first vertex, level with the line → the
    // endpoint is the nearest point, distance 0.5° of longitude at
    // lat 0.
    const before = distanceToPolylineMeters(
      { lat: 0, lng: -0.5 },
      [[0, 0], [1, 0]]
    );

    expect(before).toBeCloseTo(0.5 * 111194.93, 0);

    const after = distanceToPolylineMeters(
      { lat: 0, lng: 1.5 },
      [[0, 0], [1, 0]]
    );

    expect(after).toBeCloseTo(0.5 * 111194.93, 0);
  });

  it("returns null for degenerate input", () => {
    expect(
      distanceToPolylineMeters(null, [[0, 0], [1, 0]])
    ).toBeNull();
    expect(
      distanceToPolylineMeters({ lat: 0, lng: 0 }, [[0, 0]])
    ).toBeNull();
    expect(distanceToPolylineMeters({ lat: 0, lng: 0 }, null)).toBeNull();
    expect(distanceToPolylineMeters({ lat: 0, lng: 0 }, [])).toBeNull();
  });

  it("tolerates collapsed (zero-length) segments", () => {
    const meters = distanceToPolylineMeters(
      { lat: 0, lng: 0 },
      [[0, 0], [0, 0], [0.1, 0]]
    );

    expect(meters).toBeCloseTo(0, 5);
  });
});
