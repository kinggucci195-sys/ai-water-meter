import { subtractEstimate, type UsageEstimate } from "../estimator/estimate";
import type { StorageRequest, StorageResponse } from "../storage-messages";
import { getDailyUsage, getMonthlyUsage } from "../storage";
import { createChatObserver } from "./chat-observer";
import { detectProfile } from "./page-detectors";
import { mountSidebar } from "./sidebar";

const profile = detectProfile(window.location);
const sidebar = mountSidebar(async () => {
  const response = await sendStorageRequest({ type: "usage:reset-today" });
  sidebar.setStatus("Today's total was reset.");
  if (lastSnapshot) {
    sidebar.update(lastSnapshot, response.daily, response.monthly);
  }
});

let lastSnapshot: Parameters<typeof sidebar.update>[0] | undefined;
let lastPersistedTotal: UsageEstimate | undefined;
let hasBaseline = false;
let persistenceQueue = Promise.resolve();

createChatObserver(profile, (snapshot) => {
  persistenceQueue = persistenceQueue
    .then(() => persistSnapshot(snapshot))
    .catch((error: unknown) => {
      sidebar.setStatus(
        error instanceof Error ? error.message : "Unable to update usage estimate."
      );
    });
});

async function persistSnapshot(snapshot: Parameters<typeof sidebar.update>[0]): Promise<void> {
  lastSnapshot = snapshot;
  let [daily, monthly] = await Promise.all([getDailyUsage(), getMonthlyUsage()]);

  if (!hasBaseline) {
    hasBaseline = true;
    lastPersistedTotal = snapshot.totalEstimate;
    sidebar.update(snapshot, daily, monthly);
    sidebar.setStatus("Existing visible chat is treated as baseline.");
    return;
  }

  if (snapshot.totalEstimate.outputTokens > 0) {
    const totalMovedBackward =
      lastPersistedTotal &&
      snapshot.totalEstimate.weightedTokens < lastPersistedTotal.weightedTokens;
    const previous = totalMovedBackward ? undefined : lastPersistedTotal;
    const delta = previous
      ? subtractEstimate(snapshot.totalEstimate, previous)
      : snapshot.totalEstimate;

    lastPersistedTotal = snapshot.totalEstimate;

    if (delta.weightedTokens > 0) {
      const response = await sendStorageRequest({ estimate: delta, type: "usage:add-delta" });
      daily = response.daily;
      monthly = response.monthly;
    }
  }

  sidebar.update(snapshot, daily, monthly);
}

async function sendStorageRequest(
  message: StorageRequest
): Promise<Extract<StorageResponse, { ok: true }>> {
  const response = (await chrome.runtime.sendMessage(message)) as StorageResponse | undefined;
  if (!response?.ok) {
    throw new Error(response?.error ?? "Unable to update local usage totals.");
  }

  return response;
}
