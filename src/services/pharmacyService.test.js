import { describe, it, expect } from "vitest";
import { calculateDistance } from "./pharmacyService.js";

// Characterization test for the haversine implementation.
// Its main job right now is to ANCHOR THE UNIT (meters) before the
// refactoring renames distance fields (roadmap step 5).

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
