import type { UsageEstimate } from "./estimator/estimate";
import type { DailyUsageRecord, MonthlyUsageRecord } from "./storage";

export type StorageRequest =
  | {
      estimate: UsageEstimate;
      type: "usage:add-delta";
    }
  | {
      type: "usage:reset-today";
    }
  | {
      path: "/auth/extension/start" | "/leaderboard" | "/account";
      type: "app:open";
    };

export type StorageResponse =
  | {
      daily?: DailyUsageRecord;
      monthly?: MonthlyUsageRecord;
      ok: true;
      syncSkipped?: boolean;
      reason?: string;
    }
  | {
      error: string;
      ok: false;
    };

export function isStorageRequest(message: unknown): message is StorageRequest {
  if (!message || typeof message !== "object") {
    return false;
  }

  const candidate = message as { type?: unknown };
  return (
    candidate.type === "usage:add-delta" ||
    candidate.type === "usage:reset-today" ||
    candidate.type === "app:open"
  );
}
