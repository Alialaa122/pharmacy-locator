import { describe, it, expect } from "vitest";
import { CITIES, DEFAULT_CITY } from "./cities.js";

describe("cities registry", () => {
  it("contains the three agreed cities with unique ids", () => {
    expect(CITIES.map((city) => city.id)).toEqual([
      "alexandria",
      "cairo",
      "matrouh",
    ]);
  });

  it("starts in Alexandria, the app's original default", () => {
    expect(DEFAULT_CITY.id).toBe("alexandria");
  });

  it("every city has a usable center and zoom", () => {
    for (const city of CITIES) {
      expect(Number.isFinite(city.center.lat), city.id).toBe(true);
      expect(Number.isFinite(city.center.lng), city.id).toBe(true);
      expect(city.zoom, city.id).toBeGreaterThan(0);
    }
  });
});
