import { describe, it, expect } from "vitest";
import { CATEGORIES, getCategory } from "./categories.js";

// Sanity checks for the registry — the single source of truth that the
// query builder, normalizer, map layer, and stats panel all depend on.

describe("categories registry", () => {
  it("has unique ids", () => {
    const ids = CATEGORIES.map((category) => category.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("stats categories match the six the panel has always shown, in order", () => {
    const statsIds = CATEGORIES
      .filter((category) => category.showInStats)
      .map((category) => category.id);

    expect(statsIds).toEqual([
      "building",
      "road",
      "school",
      "hospital",
      "atm",
      "bus_stop",
    ]);
  });

  it("every showInStats entry has a statsLabel", () => {
    for (const category of CATEGORIES) {
      if (category.showInStats) {
        expect(category.statsLabel, category.id).toBeTruthy();
      }
    }
  });

  it("overpass selectors are well-formed", () => {
    for (const category of CATEGORIES) {
      for (const selector of category.overpass ?? []) {
        expect(selector, category.id).toMatch(/^(way|node|relation)\[".+"]$/);
      }
    }
  });

  it("the icon set matches what the map has always shown", () => {
    const icons = Object.fromEntries(
      CATEGORIES.filter((category) => category.icon).map((category) => [
        category.id,
        category.icon,
      ]),
    );

    expect(icons).toEqual({
      school: "🏫",
      hospital: "🏥",
      atm: "🏧",
      bus_stop: "🚌",
      pharmacy: "💊",
    });
  });

  it("getCategory returns null for unknown ids", () => {
    expect(getCategory("nonexistent")).toBe(null);
    expect(getCategory("school").id).toBe("school");
  });
});
