import { describe, it, expect } from "vitest";
import {
  calculateDistance,
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
