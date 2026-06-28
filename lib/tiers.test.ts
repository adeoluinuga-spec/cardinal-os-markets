import { describe, it, expect } from "vitest";
import {
  hasFeature,
  isAtLimit,
  normalizeTier,
  minimumTierForFeature,
  getTierLimits,
} from "./tiers";

describe("normalizeTier", () => {
  it("passes through known tiers", () => {
    expect(normalizeTier("professional")).toBe("professional");
    expect(normalizeTier("trial")).toBe("trial");
  });
  it("falls back to starter for unknown/missing values", () => {
    expect(normalizeTier(null)).toBe("starter");
    expect(normalizeTier(undefined)).toBe("starter");
    expect(normalizeTier("enterprise")).toBe("starter");
  });
});

describe("hasFeature", () => {
  it("gates features by tier", () => {
    expect(hasFeature("starter", "tasks")).toBe(false);
    expect(hasFeature("growth", "tasks")).toBe(true);
    expect(hasFeature("professional", "association_dashboard")).toBe(true);
    expect(hasFeature("growth", "association_dashboard")).toBe(false);
  });
});

describe("isAtLimit", () => {
  it("treats -1 as unlimited", () => {
    expect(isAtLimit("professional", "max_staff", 9999)).toBe(false);
  });
  it("blocks at or above the cap", () => {
    expect(isAtLimit("starter", "max_staff", 5)).toBe(true);
    expect(isAtLimit("starter", "max_staff", 4)).toBe(false);
  });
});

describe("minimumTierForFeature", () => {
  it("returns the lowest paid tier unlocking a feature", () => {
    expect(minimumTierForFeature("tasks")).toBe("growth");
    expect(minimumTierForFeature("autopilot_promise")).toBe("professional");
  });
});

describe("getTierLimits", () => {
  it("returns starter limits for an unknown tier", () => {
    // @ts-expect-error testing the runtime fallback path
    expect(getTierLimits("bogus")).toBe(getTierLimits("starter"));
  });
});
