import { describe, it, expect } from "vitest";
import { formatDistance, formatDuration, formatRadius } from "./format.js";

describe("formatDistance", () => {
  it("rounds to whole meters", () => {
    expect(formatDistance(809.87)).toBe("810 m");
  });

  it("uses thousands separators", () => {
    expect(formatDistance(12345.6)).toBe("12,346 m");
  });

  it("handles zero", () => {
    expect(formatDistance(0)).toBe("0 m");
  });
});

describe("formatDuration", () => {
  it("rounds up to whole minutes", () => {
    expect(formatDuration(150)).toBe("3 min");
  });

  it("handles exact minutes", () => {
    expect(formatDuration(120)).toBe("2 min");
  });

  it("rounds sub-minute durations up to 1 min", () => {
    expect(formatDuration(30)).toBe("1 min");
  });
});

describe("formatRadius", () => {
  it("shows meters below 1000", () => {
    expect(formatRadius(500)).toBe("500 m");
  });

  it("shows kilometers from 1000 up", () => {
    expect(formatRadius(1000)).toBe("1 km");
    expect(formatRadius(3000)).toBe("3 km");
  });
});
