import { describe, it, expect } from "vitest";
import { assemblePharmacyResults } from "./pharmacyResults.js";

// These tests define the contract of the assembler:
// plain data in, meters/seconds fields out, nulls-last sorting.

const source = { lat: 31.2001, lng: 29.9187 };
const pharmacy = (id, lat, lng) => ({
  id,
  name: `Pharmacy ${id}`,
  address: "Test address",
  lat,
  lng,
});

describe("assemblePharmacyResults", () => {
  it("returns an empty list for zero pharmacies (consistent output)", () => {
    expect(assemblePharmacyResults([], source, [])).toEqual([]);
  });

  it("produces a full result for a single pharmacy (consistent output)", () => {
    const [result] = assemblePharmacyResults(
      [pharmacy("p1", 31.2050, 29.9250)],
      source,
      [{ distanceMeters: 900, durationSeconds: 660 }],
    );

    expect(result.id).toBe("p1");
    expect(result.directDistanceMeters).toBeCloseTo(809.87, 1);
    expect(result.walkingDistanceMeters).toBe(900);
    expect(result.walkingDurationSeconds).toBe(660);
  });

  it("sorts multiple pharmacies by walking distance ascending", () => {
    const results = assemblePharmacyResults(
      [
        pharmacy("far", 31.2050, 29.9250),
        pharmacy("near", 31.2010, 29.9190),
      ],
      source,
      [
        { distanceMeters: 1500, durationSeconds: 1100 },
        { distanceMeters: 200, durationSeconds: 150 },
      ],
    );

    expect(results.map((r) => r.id)).toEqual(["near", "far"]);
  });

  it("sorts pharmacies without walking routes last", () => {
    const results = assemblePharmacyResults(
      [
        pharmacy("no-route", 31.2050, 29.9250),
        pharmacy("with-route", 31.2010, 29.9190),
      ],
      source,
      [null, { distanceMeters: 200, durationSeconds: 150 }],
    );

    expect(results[0].id).toBe("with-route");
    expect(results[1].id).toBe("no-route");
    expect(results[1].walkingDistanceMeters).toBe(null);
    expect(results[1].directDistanceMeters).toBeGreaterThan(0);
  });

  it("keeps direct distances but nulls walking data when no routes were resolved", () => {
    const results = assemblePharmacyResults(
      [pharmacy("p1", 31.2050, 29.9250)],
      source,
      [],
    );

    expect(results[0].walkingDistanceMeters).toBe(null);
    expect(results[0].walkingDurationSeconds).toBe(null);
    expect(results[0].directDistanceMeters).toBeCloseTo(809.87, 1);
  });

  it("does not leak provider fields into the assembled results", () => {
    const [result] = assemblePharmacyResults(
      [pharmacy("p1", 31.2050, 29.9250)],
      source,
      [],
    );

    expect(Object.keys(result).sort()).toEqual([
      "address",
      "directDistanceMeters",
      "id",
      "lat",
      "lng",
      "name",
      "walkingDistanceMeters",
      "walkingDurationSeconds",
    ]);
  });
});
