import { describe, it, expect } from "vitest";
import {
  REJECTION_REASONS,
  partitionOffRoad,
  partitionFarEnough,
  partitionWalkingGate,
  summarizeRun,
} from "./candidates.js";

// Test geography near Alexandria (31.2°N). 1° latitude ≈ 111 194.93 m.
const CENTER = { lat: 31.2001, lng: 29.9187 };
const PHARMACY_A = {
  id: "p1",
  name: "Pharmacy A",
  lat: 31.2001,
  lng: 29.9187,
};
const PHARMACY_B = {
  id: "p2",
  name: "Pharmacy B",
  lat: 31.2001,
  lng: 29.9300,
};

const point = (id, latOffsetMeters, lngOffsetMeters = 0, lng = CENTER.lng) => ({
  id,
  lat: CENTER.lat + latOffsetMeters / 111194.93,
  lng:
    lng + lngOffsetMeters / (111194.93 * Math.cos((CENTER.lat * Math.PI) / 180)),
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

describe("partitionOffRoad", () => {
  it("keeps the points that are clear of a road", () => {
    const { kept, rejected } = partitionOffRoad(
      [point("a", 0), point("b", 100)],
      [horizontalRoad("r1", CENTER.lat, CENTER.lng, CENTER.lng + 0.01)]
    );

    expect(kept.map((p) => p.id)).toEqual(["b"]);
    expect(rejected.map((p) => p.id)).toEqual(["a"]);
  });

  it("explains why a point was rejected", () => {
    const { rejected } = partitionOffRoad(
      [point("a", 0)],
      [horizontalRoad("r1", CENTER.lat, CENTER.lng, CENTER.lng + 0.01)]
    );

    expect(rejected[0].rejection.reason).toBe(REJECTION_REASONS.ON_ROAD);
    expect(rejected[0].rejection.detail).toMatch(/road centerline/);
  });

  it("keeps every point when there are no roads", () => {
    const { kept, rejected } = partitionOffRoad([point("a", 0)], []);

    expect(kept).toHaveLength(1);
    expect(rejected).toHaveLength(0);
  });

  it("keeps a point that is only near a road", () => {
    const { kept } = partitionOffRoad(
      [point("a", 20)],
      [horizontalRoad("r1", CENTER.lat, CENTER.lng, CENTER.lng + 0.01)]
    );

    expect(kept).toHaveLength(1);
  });
});

describe("partitionFarEnough", () => {
  it("rejects a point that is too close and names the pharmacy", () => {
    const { kept, rejected } = partitionFarEnough(
      [point("a", 0), point("b", 300)],
      [PHARMACY_A]
    );

    expect(kept.map((p) => p.id)).toEqual(["b"]);
    expect(rejected[0].rejection.reason).toBe(REJECTION_REASONS.TOO_CLOSE);
    expect(rejected[0].rejection.detail).toContain("Pharmacy A");
  });

  it("rejects nothing when there are no pharmacies", () => {
    const { kept, rejected } = partitionFarEnough([point("a", 0)], []);

    expect(kept).toHaveLength(0);
    expect(rejected).toHaveLength(0);
  });
});

describe("partitionWalkingGate", () => {
  const candidates = [point("a", 300), point("b", 400)];

  it("accepts a candidate whose routes all clear the minimum", () => {
    const { valid, rejected } = partitionWalkingGate(
      candidates,
      [
        [{ distanceMeters: 150, durationSeconds: 180 }],
        [{ distanceMeters: 200, durationSeconds: 240 }],
      ],
      [PHARMACY_A]
    );

    expect(valid).toHaveLength(2);
    expect(valid[0].walkingSeparationMeters).toBe(150);
    expect(valid[0].nearestPharmacyName).toBe("Pharmacy A");
    expect(rejected).toHaveLength(0);
  });

  it("rejects a candidate that is under the minimum and reports the distance", () => {
    const { valid, rejected } = partitionWalkingGate(
      candidates,
      [[{ distanceMeters: 80, durationSeconds: 100 }]],
      [PHARMACY_A]
    );

    expect(valid).toHaveLength(0);
    expect(rejected[0].rejection.reason).toBe(REJECTION_REASONS.WALKING_GATE);
    expect(rejected[0].rejection.detail).toContain("Pharmacy A");
    expect(rejected[0].walkingSeparationMeters).toBe(80);
  });

  it("rejects a candidate with a missing route instead of assuming it", () => {
    const { valid, rejected } = partitionWalkingGate(
      candidates,
      [[null]],
      [PHARMACY_A]
    );

    expect(valid).toHaveLength(0);
    expect(rejected[0].rejection.reason).toBe(REJECTION_REASONS.NO_ROUTE);
  });
});

describe("summarizeRun", () => {
  it("counts the run without calling unchecked points rejected", () => {
    const summary = summarizeRun({
      generated: 25,
      rejected: [
        { rejection: { reason: REJECTION_REASONS.ON_ROAD } },
        { rejection: { reason: REJECTION_REASONS.ON_ROAD } },
        { rejection: { reason: REJECTION_REASONS.TOO_CLOSE } },
      ],
      notEvaluated: 4,
      valid: 2,
      selected: 2,
    });

    expect(summary.generated).toBe(25);
    expect(summary.rejected).toBe(3);
    expect(summary.notEvaluated).toBe(4);
    expect(summary.evaluated).toBe(18);
    expect(summary.valid).toBe(2);
    expect(summary.selected).toBe(2);
    expect(summary.rejectedByReason).toEqual({
      [REJECTION_REASONS.ON_ROAD]: 2,
      [REJECTION_REASONS.TOO_CLOSE]: 1,
    });
  });

  it("handles a run without rejections", () => {
    const summary = summarizeRun({
      generated: 25,
      rejected: [],
      notEvaluated: 0,
      valid: 3,
      selected: 3,
    });

    expect(summary.rejected).toBe(0);
    expect(summary.evaluated).toBe(25);
    expect(summary.rejectedByReason).toEqual({});
  });
});
