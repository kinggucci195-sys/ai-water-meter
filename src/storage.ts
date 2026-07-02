import type { UsageEstimate } from "./estimator/estimate";

export type DailyUsageRecord = UsageEstimate & {
  date: string;
  updatedAt: string;
};

export type MonthlyUsageRecord = UsageEstimate & {
  days: number;
  month: string;
  updatedAt?: string;
};

const DAILY_PREFIX = "daily:";

export async function addToDailyUsage(
  estimate: UsageEstimate,
  date = todayKey()
): Promise<DailyUsageRecord> {
  const key = `${DAILY_PREFIX}${date}`;
  const existing = await chrome.storage.local.get(key);
  const previous = existing[key] as DailyUsageRecord | undefined;
  const next: DailyUsageRecord = {
    date,
    updatedAt: new Date().toISOString(),
    inputTokens: (previous?.inputTokens ?? 0) + estimate.inputTokens,
    outputTokens: (previous?.outputTokens ?? 0) + estimate.outputTokens,
    weightedTokens: (previous?.weightedTokens ?? 0) + estimate.weightedTokens,
    energyWh: (previous?.energyWh ?? 0) + estimate.energyWh,
    directWaterMl: (previous?.directWaterMl ?? 0) + estimate.directWaterMl,
    indirectGridWaterMl: (previous?.indirectGridWaterMl ?? 0) + estimate.indirectGridWaterMl,
    totalWaterMl: (previous?.totalWaterMl ?? 0) + estimate.totalWaterMl,
    carbonGrams: (previous?.carbonGrams ?? 0) + estimate.carbonGrams,
    lowTotalWaterMl: (previous?.lowTotalWaterMl ?? 0) + estimate.lowTotalWaterMl,
    highTotalWaterMl: (previous?.highTotalWaterMl ?? 0) + estimate.highTotalWaterMl,
    profileId: estimate.profileId
  };

  await chrome.storage.local.set({ [key]: next });
  return next;
}

export async function getDailyUsage(date = todayKey()): Promise<DailyUsageRecord | undefined> {
  const key = `${DAILY_PREFIX}${date}`;
  const result = await chrome.storage.local.get(key);
  return result[key] as DailyUsageRecord | undefined;
}

export async function getMonthlyUsage(month = monthKey()): Promise<MonthlyUsageRecord> {
  const allRecords = await chrome.storage.local.get(null);
  const monthPrefix = `${DAILY_PREFIX}${month}-`;
  const records = Object.entries(allRecords)
    .filter(([key]) => key.startsWith(monthPrefix))
    .map(([, value]) => value as DailyUsageRecord);

  return records.reduce<MonthlyUsageRecord>(
    (total, record) => ({
      days: total.days + 1,
      month,
      updatedAt: mostRecentDate(total.updatedAt, record.updatedAt),
      inputTokens: total.inputTokens + record.inputTokens,
      outputTokens: total.outputTokens + record.outputTokens,
      weightedTokens: total.weightedTokens + record.weightedTokens,
      energyWh: total.energyWh + record.energyWh,
      directWaterMl: total.directWaterMl + record.directWaterMl,
      indirectGridWaterMl: total.indirectGridWaterMl + record.indirectGridWaterMl,
      totalWaterMl: total.totalWaterMl + record.totalWaterMl,
      carbonGrams: total.carbonGrams + record.carbonGrams,
      lowTotalWaterMl: total.lowTotalWaterMl + record.lowTotalWaterMl,
      highTotalWaterMl: total.highTotalWaterMl + record.highTotalWaterMl,
      profileId: record.profileId
    }),
    {
      days: 0,
      month,
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

export async function resetDailyUsage(date = todayKey()): Promise<void> {
  await chrome.storage.local.remove(`${DAILY_PREFIX}${date}`);
}

export function todayKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function monthKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function mostRecentDate(left?: string, right?: string): string | undefined {
  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  return left > right ? left : right;
}
