import { DEFAULT_PROFILE, type FactorProfile } from "./factors";

export type EstimateInput = {
  promptText?: string;
  responseText: string;
  profile?: FactorProfile;
};

export type UsageEstimate = {
  inputTokens: number;
  outputTokens: number;
  weightedTokens: number;
  energyWh: number;
  directWaterMl: number;
  indirectGridWaterMl: number;
  totalWaterMl: number;
  carbonGrams: number;
  lowTotalWaterMl: number;
  highTotalWaterMl: number;
  profileId: string;
};

export function estimateTokens(text: string): number {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return 0;
  }

  return Math.max(1, Math.ceil(normalized.length / 4));
}

export function estimateUsage(input: EstimateInput): UsageEstimate {
  const profile = input.profile ?? DEFAULT_PROFILE;
  const inputTokens = estimateTokens(input.promptText ?? "");
  const outputTokens = estimateTokens(input.responseText);
  const weightedTokens = outputTokens + inputTokens * profile.inputTokenWeight;
  const energyWh = (weightedTokens / 500) * profile.energyWhPer500OutputTokens;
  const energyKwh = energyWh / 1000;
  const directWaterMl = energyKwh * profile.directWaterLitersPerKwh * 1000;
  const indirectGridWaterMl = energyKwh * profile.indirectGridWaterLitersPerKwh * 1000;
  const totalWaterMl = directWaterMl + indirectGridWaterMl;
  const carbonGrams = energyKwh * profile.carbonGramsPerKwh;

  return {
    inputTokens,
    outputTokens,
    weightedTokens,
    energyWh,
    directWaterMl,
    indirectGridWaterMl,
    totalWaterMl,
    carbonGrams,
    lowTotalWaterMl: totalWaterMl * profile.uncertaintyLowMultiplier,
    highTotalWaterMl: totalWaterMl * profile.uncertaintyHighMultiplier,
    profileId: profile.id
  };
}

export function sumEstimates(estimates: UsageEstimate[]): UsageEstimate {
  return estimates.reduce<UsageEstimate>(
    (sum, estimate) => ({
      inputTokens: sum.inputTokens + estimate.inputTokens,
      outputTokens: sum.outputTokens + estimate.outputTokens,
      weightedTokens: sum.weightedTokens + estimate.weightedTokens,
      energyWh: sum.energyWh + estimate.energyWh,
      directWaterMl: sum.directWaterMl + estimate.directWaterMl,
      indirectGridWaterMl: sum.indirectGridWaterMl + estimate.indirectGridWaterMl,
      totalWaterMl: sum.totalWaterMl + estimate.totalWaterMl,
      carbonGrams: sum.carbonGrams + estimate.carbonGrams,
      lowTotalWaterMl: sum.lowTotalWaterMl + estimate.lowTotalWaterMl,
      highTotalWaterMl: sum.highTotalWaterMl + estimate.highTotalWaterMl,
      profileId: estimate.profileId
    }),
    {
      inputTokens: 0,
      outputTokens: 0,
      weightedTokens: 0,
      energyWh: 0,
      directWaterMl: 0,
      indirectGridWaterMl: 0,
      totalWaterMl: 0,
      carbonGrams: 0,
      lowTotalWaterMl: 0,
      highTotalWaterMl: 0,
      profileId: "mixed"
    }
  );
}

export function subtractEstimate(current: UsageEstimate, previous: UsageEstimate): UsageEstimate {
  return {
    inputTokens: Math.max(0, current.inputTokens - previous.inputTokens),
    outputTokens: Math.max(0, current.outputTokens - previous.outputTokens),
    weightedTokens: Math.max(0, current.weightedTokens - previous.weightedTokens),
    energyWh: Math.max(0, current.energyWh - previous.energyWh),
    directWaterMl: Math.max(0, current.directWaterMl - previous.directWaterMl),
    indirectGridWaterMl: Math.max(0, current.indirectGridWaterMl - previous.indirectGridWaterMl),
    totalWaterMl: Math.max(0, current.totalWaterMl - previous.totalWaterMl),
    carbonGrams: Math.max(0, current.carbonGrams - previous.carbonGrams),
    lowTotalWaterMl: Math.max(0, current.lowTotalWaterMl - previous.lowTotalWaterMl),
    highTotalWaterMl: Math.max(0, current.highTotalWaterMl - previous.highTotalWaterMl),
    profileId: current.profileId
  };
}
