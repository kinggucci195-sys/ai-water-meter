export type FactorProfile = {
  id: string;
  label: string;
  energyWhPer500OutputTokens: number;
  inputTokenWeight: number;
  directWaterLitersPerKwh: number;
  indirectGridWaterLitersPerKwh: number;
  carbonGramsPerKwh: number;
  uncertaintyLowMultiplier: number;
  uncertaintyHighMultiplier: number;
};

export const DEFAULT_PROFILE: FactorProfile = {
  id: "modern-text-2026",
  label: "Modern text AI, median estimate",
  energyWhPer500OutputTokens: 0.3,
  inputTokenWeight: 0.25,
  directWaterLitersPerKwh: 1,
  indirectGridWaterLitersPerKwh: 4.52,
  carbonGramsPerKwh: 350,
  uncertaintyLowMultiplier: 0.33,
  uncertaintyHighMultiplier: 3
};

export const CONSERVATIVE_HIGH_PROFILE: FactorProfile = {
  ...DEFAULT_PROFILE,
  id: "long-context-high",
  label: "Long-context or reasoning, high estimate",
  energyWhPer500OutputTokens: 2.5,
  uncertaintyLowMultiplier: 0.4,
  uncertaintyHighMultiplier: 4
};
