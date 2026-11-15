import { describe, it, expect } from "vitest";
import {
  assemblePharmacyResults,
  pharmacyDisplayName,
} from "./pharmacyResults.js";

const source = { lat: 31.2001, lng: 29.9187 };

describe("pharmacyDisplayName", () => {
  it("uses the name when there is one", () => {
    expect(
      pharmacyDisplayName({ name: "Al-Dawaa", address: "12 Street" })
    ).toBe("Al-Dawaa");
  });

  it("falls back to the address when the place has no name", () => {
    expect(
      pharmacyDisplayName({ name: "", address: "12 Street" })
    ).toBe("12 Street");
  });

  it("falls back to a neutral label when neither is there", () => {
    expect(pharmacyDisplayName({ name: "  ", address: "" })).toBe(
      "Unnamed pharmacy"
    );
  });
});

describe("assemblePharmacyResults — display name", () => {
  it("never returns an empty name", () => {
    const [result] = assemblePharmacyResults(
      [{ id: "p1", name: "", address: "12 Street", lat: 31.201, lng: 29.919 }],
      source,
      []
    );

    expect(result.name).toBe("12 Street");
  });
});
