import { describe, it, expect } from "vitest";
import {
  LAYER_GROUPS,
  DEFAULT_LAYER_VISIBILITY,
  visibleCategories,
} from "./layers.js";

describe("layer registry", () => {
  it("has a unique id per group", () => {
    const ids = LAYER_GROUPS.map((group) => group.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("starts with only the pharmacies layer visible", () => {
    expect(DEFAULT_LAYER_VISIBILITY.pharmacies).toBe(true);
    expect(DEFAULT_LAYER_VISIBILITY.buildings).toBe(false);
    expect(DEFAULT_LAYER_VISIBILITY.transportation).toBe(false);
    expect(DEFAULT_LAYER_VISIBILITY.areas).toBe(false);
    expect(DEFAULT_LAYER_VISIBILITY.facilities).toBe(false);
    expect(DEFAULT_LAYER_VISIBILITY.poi).toBe(false);
  });
});

describe("visibleCategories", () => {
  it("returns no OSM categories when only pharmacies are visible", () => {
    const categories = visibleCategories(DEFAULT_LAYER_VISIBILITY);

    expect(categories.size).toBe(0);
  });

  it("returns only the categories of the enabled groups", () => {
    const categories = visibleCategories({
      ...DEFAULT_LAYER_VISIBILITY,
      transportation: true,
    });

    expect(categories.has("road")).toBe(true);
    expect(categories.has("building")).toBe(false);
  });

  it("never mixes categories between unrelated groups", () => {
    const withBuildings = visibleCategories({
      ...DEFAULT_LAYER_VISIBILITY,
      buildings: true,
    });

    expect(withBuildings.has("building")).toBe(true);
    expect(withBuildings.has("road")).toBe(false);
    expect(withBuildings.has("school")).toBe(false);
  });

  it("ignores unknown groups and treats a missing map as nothing visible", () => {
    expect(visibleCategories({}).size).toBe(0);
    expect(visibleCategories(undefined).size).toBe(0);
    expect(visibleCategories({ nope: true }).size).toBe(0);
  });
});
