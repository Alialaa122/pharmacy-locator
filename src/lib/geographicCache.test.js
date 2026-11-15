import { describe, it, expect, beforeEach } from "vitest";
import {
  getCachedFeatures,
  setCachedFeatures,
  clearFeatureCache,
} from "./geographicCache.js";

const center = { lat: 31.2001, lng: 29.9187 };

describe("geographic feature cache", () => {
  beforeEach(() => {
    clearFeatureCache();
  });

  it("returns null for an area that was never loaded", () => {
    expect(getCachedFeatures(center, 1000)).toBe(null);
  });

  it("returns the features of a loaded area", () => {
    const features = [{ id: "way/1", category: "building" }];

    setCachedFeatures(center, 1000, features);

    expect(getCachedFeatures(center, 1000)).toBe(features);
  });

  it("treats a different radius as a different area", () => {
    setCachedFeatures(center, 1000, [{ id: "way/1" }]);

    expect(getCachedFeatures(center, 2000)).toBe(null);
  });

  it("treats a nearby centre as a different area", () => {
    setCachedFeatures(center, 1000, [{ id: "way/1" }]);

    expect(
      getCachedFeatures({ lat: 31.2101, lng: 29.9187 }, 1000)
    ).toBe(null);
  });

  it("matches centres that differ only below the rounding grid", () => {
    setCachedFeatures(center, 1000, [{ id: "way/1" }]);

    expect(
      getCachedFeatures(
        { lat: 31.20010004, lng: 29.91870003 },
        1000
      )?.length
    ).toBe(1);
  });

  it("evicts the oldest entry when the cache is full", () => {
    for (let index = 0; index < 13; index++) {
      setCachedFeatures({ lat: 31 + index / 1000, lng: 29.9 }, 1000, [
        { id: `way/${index}` },
      ]);
    }

    expect(getCachedFeatures({ lat: 31, lng: 29.9 }, 1000)).toBe(null);
    expect(
      getCachedFeatures({ lat: 31.012, lng: 29.9 }, 1000)?.length
    ).toBe(1);
  });
});
