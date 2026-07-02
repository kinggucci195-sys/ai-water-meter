import { DEFAULT_PROFILE } from "../src/estimator/factors";
import {
  estimateTokens,
  estimateUsage,
  subtractEstimate,
  sumEstimates
} from "../src/estimator/estimate";
import { monthKey, todayKey } from "../src/storage";

describe("estimateTokens", () => {
  it("uses a transparent four-character token approximation", () => {
    expect(estimateTokens("12345678")).toBe(2);
    expect(estimateTokens("")).toBe(0);
  });
});

describe("estimateUsage", () => {
  it("converts weighted tokens into energy, water, and carbon estimates", () => {
    const responseText = "a".repeat(2000);
    const estimate = estimateUsage({ responseText, profile: DEFAULT_PROFILE });

    expect(estimate.outputTokens).toBe(500);
    expect(estimate.energyWh).toBeCloseTo(0.3);
    expect(estimate.directWaterMl).toBeCloseTo(0.3);
    expect(estimate.indirectGridWaterMl).toBeCloseTo(1.356);
    expect(estimate.totalWaterMl).toBeCloseTo(1.656);
    expect(estimate.carbonGrams).toBeCloseTo(0.105);
  });

  it("weights input tokens lower than output tokens", () => {
    const estimate = estimateUsage({
      promptText: "a".repeat(2000),
      responseText: "a".repeat(2000)
    });

    expect(estimate.inputTokens).toBe(500);
    expect(estimate.outputTokens).toBe(500);
    expect(estimate.weightedTokens).toBe(625);
  });
});

describe("sumEstimates", () => {
  it("adds estimates without re-estimating text", () => {
    const first = estimateUsage({ responseText: "a".repeat(2000) });
    const second = estimateUsage({ responseText: "b".repeat(1000) });
    const sum = sumEstimates([first, second]);

    expect(sum.outputTokens).toBe(750);
    expect(sum.totalWaterMl).toBeCloseTo(first.totalWaterMl + second.totalWaterMl);
  });
});

describe("subtractEstimate", () => {
  it("returns only the newly observed usage delta", () => {
    const first = estimateUsage({ responseText: "a".repeat(1000) });
    const current = estimateUsage({ responseText: "a".repeat(2000) });
    const delta = subtractEstimate(current, first);

    expect(delta.outputTokens).toBe(250);
    expect(delta.totalWaterMl).toBeCloseTo(current.totalWaterMl - first.totalWaterMl);
  });
});

describe("todayKey", () => {
  it("uses local date components instead of UTC serialization", () => {
    expect(todayKey(new Date(2026, 6, 2, 1, 30))).toBe("2026-07-02");
  });
});

describe("monthKey", () => {
  it("uses local month components", () => {
    expect(monthKey(new Date(2026, 6, 2, 1, 30))).toBe("2026-07");
  });
});
