import { describe, it, expect } from "vitest";
import {
  ELIGIBILITY_BANDS,
  UNVERIFIED_BAND,
  classifySeparation,
  findNearestPharmacy,
  evaluateLocation,
} from "./eligibility.js";

describe("ELIGIBILITY_BANDS", () => {
  it("matches the agreed EDA-based thresholds (100/150/250)", () => {
    expect(ELIGIBILITY_BANDS.map((band) => band.maxMeters)).toEqual([
      100, 150, 250, null,
    ]);
    expect(ELIGIBILITY_BANDS.map((band) => band.id)).toEqual([
      "not-eligible",
      "potential",
      "strong",
      "very-strong",
    ]);
  });
});

describe("classifySeparation", () => {
  it("classifies the EDA 100 m gate as Not eligible, boundary inclusive", () => {
    expect(classifySeparation(99.9).id).toBe("not-eligible");
    expect(classifySeparation(100).id).toBe("not-eligible");
  });

  it("classifies the advisory bands with inclusive upper bounds", () => {
    expect(classifySeparation(100.1).id).toBe("potential");
    expect(classifySeparation(150).id).toBe("potential");
    expect(classifySeparation(150.1).id).toBe("strong");
    expect(classifySeparation(250).id).toBe("strong");
    expect(classifySeparation(250.1).id).toBe("very-strong");
    expect(classifySeparation(100000).id).toBe("very-strong");
  });

  it("returns null for unusable distances instead of guessing", () => {
    expect(classifySeparation(null)).toBeNull();
    expect(classifySeparation(undefined)).toBeNull();
    expect(classifySeparation(NaN)).toBeNull();
  });
});

describe("findNearestPharmacy", () => {
  const pharmacy = (id, walking) => ({
    id,
    walkingDistanceMeters: walking,
  });

  it("picks the smallest walking distance", () => {
    const pharmacies = [
      pharmacy("P1", 300),
      pharmacy("P2", 120),
      pharmacy("P3", 450),
    ];

    expect(findNearestPharmacy(pharmacies).id).toBe("P2");
  });

  it("excludes pharmacies without a walking distance", () => {
    const pharmacies = [
      pharmacy("P1", null),
      pharmacy("P2", 500),
      pharmacy("P3", null),
    ];

    expect(findNearestPharmacy(pharmacies).id).toBe("P2");
  });

  it("returns null when no pharmacy has a walking distance", () => {
    expect(findNearestPharmacy([pharmacy("P1", null)])).toBeNull();
    expect(findNearestPharmacy([])).toBeNull();
  });

  it("treats a missing list as no pharmacies", () => {
    expect(findNearestPharmacy(undefined)).toBeNull();
  });
});

describe("evaluateLocation", () => {
  it("returns Unverified when no pharmacies were found", () => {
    const evaluation = evaluateLocation([]);

    expect(evaluation.band.id).toBe("unverified");
    expect(evaluation.band).toBe(UNVERIFIED_BAND);
    expect(evaluation.nearestPharmacy).toBeNull();
    expect(evaluation.separationMeters).toBeNull();
    expect(evaluation.unverifiedReason).toBeTruthy();
  });

  it("returns Unverified when all walking distances are missing", () => {
    const evaluation = evaluateLocation([
      { id: "P1", walkingDistanceMeters: null },
    ]);

    expect(evaluation.band.id).toBe("unverified");
    expect(evaluation.nearestPharmacy).toBeNull();
    expect(evaluation.unverifiedReason).toBeTruthy();
  });

  it("certifies the band from the nearest walking distance", () => {
    const nearest = {
      id: "P2",
      name: "Pharmacy Two",
      directDistanceMeters: 80,
      walkingDistanceMeters: 180,
    };
    const evaluation = evaluateLocation([
      { id: "P1", name: "Pharmacy One", walkingDistanceMeters: 400 },
      nearest,
    ]);

    expect(evaluation.band.id).toBe("strong");
    expect(evaluation.nearestPharmacy).toBe(nearest);
    expect(evaluation.separationMeters).toBe(180);
    expect(evaluation.unverifiedReason).toBeNull();
  });

  it("flags a Not eligible verdict inside the 100 m gate", () => {
    const evaluation = evaluateLocation([
      { id: "P1", walkingDistanceMeters: 90 },
    ]);

    expect(evaluation.band.id).toBe("not-eligible");
  });
});
