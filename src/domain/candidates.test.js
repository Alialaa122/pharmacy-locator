import { describe, it, expect } from "vitest";
import {
  MIN_SEPARATION_METERS,
  MAX_CERTIFY,
  MAX_RECOMMENDATIONS,
  buildCandidateSites,
  prefilterCandidates,
  rankCandidates,
  recommendLocations,
} from "./candidates.js";

// All test geography sits near Alexandria (31.2°N, 29.9°E).
// At that latitude 1° latitude ≈ 111 195 m; 1° longitude ≈ 95 000 m.
// 1e-5 degrees latitude ≈ 1.11 m.

const PHARMACY_A = { id: "p1", name: "Pharmacy A", lat: 31.2001, lng: 29.9187 };
const PHARMACY_B = { id: "p2", name: "Pharmacy B", lat: 31.2001, lng: 29.9300 };

// 1e-4° ≈ 11 m — a small ~11 m x 11 m building footprint.
const buildingFeature = (id, lon, lat, name = null) => ({
  id,
  category: "building",
  geometryType: "Polygon",
  name,
  // Polygon features wrap the ring: coordinates = [ring]
  coordinates: [
    [
      [lon, lat],
      [lon, lat + 1e-4],
      [lon + 1e-4, lat + 1e-4],
      [lon + 1e-4, lat],
      [lon, lat],
    ],
  ],
});

const roadFeature = (id, lon, lat, name = null) => ({
  id,
  category: "road",
  geometryType: "LineString",
  name,
  coordinates: [
    [lon, lat],
    [lon + 5e-4, lat],
    [lon + 1e-3, lat],
  ],
});

describe("constants", () => {
  it("pins the agreed contract", () => {
    expect(MIN_SEPARATION_METERS).toBe(100);
    expect(MAX_CERTIFY).toBe(10);
    expect(MAX_RECOMMENDATIONS).toBe(3);
  });
});

describe("buildCandidateSites", () => {
  it("builds a building site from a polygon centroid", () => {
    const sites = buildCandidateSites([
      buildingFeature("way/1", 29.9187, 31.2001, "Al-Noor Block"),
    ]);

    expect(sites).toHaveLength(1);
    expect(sites[0].id).toBe("way/1");
    expect(sites[0].kind).toBe("building");
    expect(sites[0].label).toBe("Al-Noor Block");
    // Rectangular footprint: the centroid is its geometric center
    expect(sites[0].lng).toBeCloseTo(29.91875, 8);
    expect(sites[0].lat).toBeCloseTo(31.20015, 8);
  });

  it("builds a road site from a line midpoint", () => {
    const sites = buildCandidateSites([
      roadFeature("way/2", 29.9187, 31.2050, "Corniche Road"),
    ]);

    expect(sites).toHaveLength(1);
    expect(sites[0].kind).toBe("road");
    expect(sites[0].label).toBe("Corniche Road");
    // Middle vertex of 3-point line = index 1
    expect(sites[0].lng).toBeCloseTo(29.9192, 6);
    expect(sites[0].lat).toBeCloseTo(31.205, 6);
  });

  it("falls back to generic labels when OSM name is missing", () => {
    const sites = buildCandidateSites([
      buildingFeature("way/3", 29.92, 31.205),
      roadFeature("way/4", 29.92, 31.206),
    ]);

    expect(sites.map((site) => site.label)).toEqual([
      "Building",
      "Road",
    ]);
  });

  it("ignores features it cannot place (other categories, degenerate geometry)", () => {
    const sites = buildCandidateSites([
      // school node — not a candidate source
      { id: "node/1", category: "school", geometryType: "Point", name: "S", coordinates: [29.9, 31.2] },
      // degenerate building polygon (zero area)
      {
        id: "way/5",
        category: "building",
        geometryType: "Polygon",
        name: null,
        coordinates: [[[29.9, 31.2], [29.9001, 31.2001], [29.9002, 31.2002], [29.9, 31.2]]],
      },
      // road with a single point
      { id: "way/6", category: "road", geometryType: "LineString", name: null, coordinates: [[29.9, 31.2]] },
    ]);

    expect(sites).toEqual([]);
  });

  it("handles null/undefined feature lists", () => {
    expect(buildCandidateSites(null)).toEqual([]);
    expect(buildCandidateSites(undefined)).toEqual([]);
  });

  it("deduplicates overlapping sites, with the building winning", () => {
    // Road midpoint is at [29.9305, 31.2100]; the building centroid is
    // placed ~7 m from it — within the 10 m dedupe radius.
    const sites = buildCandidateSites([
      roadFeature("way/7", 29.9300, 31.2100),
      buildingFeature("way/8", 29.9305005, 31.2100005, "Tall Building"),
    ]);

    expect(sites).toHaveLength(1);
    expect(sites[0].id).toBe("way/8");
    expect(sites[0].kind).toBe("building");
    expect(sites[0].label).toBe("Tall Building");
  });
});

describe("prefilterCandidates", () => {
  const site = (id, lat, lng) => ({ id, kind: "building", label: id, lat, lng });

  it("keeps a site only at least 100 m straight-line from EVERY pharmacy (boundary inclusive)", () => {
    // 1e-5° latitude ≈ 1.11 m; 1° longitude at 31.2°N ≈ 95 280 m
    const justInside = site(
      "s99",
      31.2001,
      29.9187 - 99 / 95280 // 99 m west of A
    );
    const justOutside = site(
      "s101",
      31.2001,
      29.9187 - 101 / 95280 // 101 m west of A
    );

    const survivors = prefilterCandidates([justInside, justOutside], [PHARMACY_A]);

    expect(survivors.map((s) => s.id)).toEqual(["s101"]);
    expect(survivors[0].straightSeparationMeters).toBeCloseTo(101, 0);
  });

  it("rejects a site inside 100 m of ANY pharmacy, even if far from the others", () => {
    const tooClose = site("s3", 31.2001 + 55 / 111195, 29.9187); // ~55 m north of A
    const farEnough = site("s2", 31.2001 + 150 / 111195, 29.9187); // ~150 m north of A
    const results = prefilterCandidates(
      [tooClose, farEnough],
      [PHARMACY_A, PHARMACY_B]
    );

    expect(results.map((s) => s.id)).toEqual(["s2"]);
  });

  it("sorts survivors by margin descending and caps at MAX_CERTIFY", () => {
    const far = site("far", 31.2050, 29.9250);   // ≈ 550 m from both
    const near = site("near", 31.2001 + 150 / 111195, 29.9187); // ≈ 150 m from A

    const results = prefilterCandidates([near, far], [PHARMACY_A, PHARMACY_B]);

    expect(results[0].id).toBe("far");
    expect(results[1].id).toBe("near");
  });

  it("caps the list at MAX_CERTIFY", () => {
    // 12 well-separated sites — only the 10 largest margins survive
    const sites = Array.from({ length: 12 }, (_, i) => ({
      id: `s${i}`,
      kind: "building",
      label: `S${i}`,
      lat: 31.22 + i * (50 / 111195), // stack north, each 50 m apart
      lng: 29.95,
    }));

    const results = prefilterCandidates(sites, [PHARMACY_A]);

    expect(results).toHaveLength(MAX_CERTIFY);
    // The farthest site must be in (it has the best margin)
    expect(results.map((s) => s.id)).toContain("s11");
    // The nearest to the pharmacy must be cut (worst margin)
    expect(results.map((s) => s.id)).not.toContain("s0");
  });

  it("returns nothing when there are no pharmacies (the gate is vacuous)", () => {
    expect(prefilterCandidates([site("s", 31.2, 29.9)], [])).toEqual([]);
    expect(prefilterCandidates([site("s", 31.2, 29.9)], null)).toEqual([]);
    expect(prefilterCandidates(null, [PHARMACY_A])).toEqual([]);
  });
});

describe("rankCandidates", () => {
  const candidate = (id, straight) => ({
    id,
    kind: "building",
    label: id,
    lat: 31.2,
    lng: 29.9,
    straightSeparationMeters: straight,
  });

  it("certifies the EDA band from the NEAREST walking distance", () => {
    const candidates = [candidate("c1", 300)];
    const matrix = [[
      { distanceMeters: 180, durationSeconds: 144 },
      { distanceMeters: 400, durationSeconds: 320 },
    ]];

    const ranked = rankCandidates(candidates, matrix, [PHARMACY_A, PHARMACY_B]);

    expect(ranked).toHaveLength(1);
    expect(ranked[0].band.id).toBe("strong"); // 180 m walking
    expect(ranked[0].separationMeters).toBe(180);
    expect(ranked[0].separationBasis).toBe("walking");
    expect(ranked[0].nearestCompetition).toEqual({ name: "Pharmacy A" });
    expect(ranked[0].walkingVerified).toBe(true);
  });

  it("ranks walking-verified candidates ahead of degraded ones, by separation", () => {
    const candidates = [
      candidate("certified-small", 200),
      candidate("unverified-huge", 5000),
      candidate("certified-big", 400),
    ];
    const matrix = [
      [{ distanceMeters: 120, durationSeconds: 96 }, null],                // certified @120
      [null, null],                                                        // fully degraded
      [{ distanceMeters: 300, durationSeconds: 240 }, null],               // certified @300
    ];

    const ranked = rankCandidates(candidates, matrix, [PHARMACY_A]);

    expect(ranked.map((c) => c.id)).toEqual([
      "certified-big",
      "certified-small",
      "unverified-huge",
    ]);
    expect(ranked[2].walkingVerified).toBe(false);
    expect(ranked[2].separationMeters).toBe(5000); // keeps straight-line
    expect(ranked[2].separationBasis).toBe("straight");
    expect(ranked[2].band).toBeNull();
    expect(ranked[2].nearestCompetition).toBeNull();
  });

  it("returns the top 3 when more candidates exist", () => {
    const candidates = [200, 500, 900, 1200].map(
      (meters, i) => candidate(`c${i}`, meters)
    );
    const matrix = candidates.map((c) => [
      [{ distanceMeters: c.straightSeparationMeters, durationSeconds: 1 }, null],
    ]);

    const ranked = rankCandidates(candidates, matrix, [PHARMACY_A]);

    expect(ranked).toHaveLength(MAX_RECOMMENDATIONS);
    expect(ranked.map((c) => c.id)).toEqual(["c3", "c2", "c1"]);
  });

  it("handles empty or missing inputs without throwing", () => {
    expect(rankCandidates([], [[{ distanceMeters: 100, durationSeconds: 1 }]], [PHARMACY_A])).toEqual([]);
    expect(rankCandidates(null, null, null)).toEqual([]);
    expect(rankCandidates([candidate("c", 100)], undefined, [PHARMACY_A])).toHaveLength(1);
    expect(rankCandidates([candidate("c", 100)], undefined, [PHARMACY_A])[0].walkingVerified).toBe(false);
  });
});

describe("recommendLocations (pipeline)", () => {
  it("flows sites → prefilter → rank end to end", () => {
    // Two buildings, both far from the single pharmacy; one road nearby
    const features = [
      buildingFeature("way/1", 29.9187, 31.2100, "North Block"),   // ~1.10 km from A
      buildingFeature("way/2", 29.9350, 31.2001, "East Block"),    // ~1.56 km from A
      roadFeature("way/3", 29.9190, 31.2002),                       // ~35 m from A → gated
    ];
    const pharmacies = [PHARMACY_A];
    // Row order must match the prefilter's margin-descending order:
    // way/2 (≈1.56 km straight) comes before way/1 (≈1.10 km).
    const matrix = [
      [{ distanceMeters: 1650, durationSeconds: 1320 }], // way/2 walking
      [{ distanceMeters: 950, durationSeconds: 760 }],   // way/1 walking
    ];

    const recommendations = recommendLocations(features, pharmacies, matrix);
    const prefiltered = prefilterCandidates(
      buildCandidateSites(features),
      pharmacies
    );

    expect(prefiltered.map((s) => s.id)).toEqual(["way/2", "way/1"]);
    expect(recommendations).toHaveLength(2);
    expect(recommendations[0].id).toBe("way/2"); // 1650 m walking > 950 m
    expect(recommendations[0].label).toBe("East Block");
    expect(recommendations[0].band.id).toBe("very-strong");
    expect(recommendations[0].nearestCompetition).toEqual({ name: "Pharmacy A" });
  });

  it("recommends nothing when no site clears the hard gate", () => {
    const features = [
      buildingFeature("way/9", 29.91871, 31.20011), // ~11 m from pharmacy
    ];

    expect(recommendLocations(features, [PHARMACY_A], [
      [{ distanceMeters: 120, durationSeconds: 96 }],
    ])).toEqual([]);
  });

  it("recommends nothing when no pharmacies were found", () => {
    const features = [buildingFeature("way/1", 29.9187, 31.2100)];

    expect(recommendLocations(features, [], [])).toEqual([]);
  });

  it("recommends nothing when there is no building or road data", () => {
    const features = [
      { id: "node/1", category: "school", geometryType: "Point", name: "S", coordinates: [29.9, 31.2] },
    ];

    expect(recommendLocations(features, [PHARMACY_A], [])).toEqual([]);
  });
});
