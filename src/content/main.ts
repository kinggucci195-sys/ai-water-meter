import { subtractEstimate, type UsageEstimate } from "../estimator/estimate";
import type { StorageRequest, StorageResponse } from "../storage-messages";
import { getDailyUsage, getMonthlyUsage } from "../storage";
import { createChatObserver } from "./chat-observer";
import { HEAVY_OUTPUT_TOKEN_THRESHOLD, type MascotState } from "./mascot-state";
import { detectProfile } from "./page-detectors";
import { mountSidebar, type SidebarReaction } from "./sidebar";

const profile = detectProfile(window.location);
const sidebar = mountSidebar(
  async () => {
    const response = await sendStorageRequest({ type: "usage:reset-today" });
    sidebar.setStatus("Today reset. Estimates still stay local.");
    if (lastSnapshot && response.monthly) {
      sidebar.update(lastSnapshot, response.daily, response.monthly, { state: "reset" });
    }
  },
  async () => {
    await sendStorageRequest({ path: "/auth/extension/start", type: "app:open" });
  },
  async () => {
    await sendStorageRequest({ path: "/leaderboard", type: "app:open" });
  }
);

let lastSnapshot: Parameters<typeof sidebar.update>[0] | undefined;
let lastPersistedTotal: UsageEstimate | undefined;
let hasBaseline = false;
let persistenceQueue = Promise.resolve();

createChatObserver(profile, (snapshot) => {
  persistenceQueue = persistenceQueue
    .then(() => persistSnapshot(snapshot))
    .catch((error: unknown) => {
      sidebar.update(lastSnapshot ?? snapshot, undefined, undefined, { state: "error" });
      sidebar.setStatus(
        error instanceof Error ? error.message : "Unable to update usage estimate."
      );
    });
});

async function persistSnapshot(snapshot: Parameters<typeof sidebar.update>[0]): Promise<void> {
  const previousSnapshot = lastSnapshot;
  lastSnapshot = snapshot;
  let [daily, monthly] = await Promise.all([getDailyUsage(), getMonthlyUsage()]);
  let reaction: SidebarReaction = {
    state: inferReactionState(snapshot, previousSnapshot)
  };

  if (!hasBaseline) {
    hasBaseline = true;
    lastPersistedTotal = snapshot.totalEstimate;
    sidebar.update(snapshot, daily, monthly, { state: "baseline" });
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
      monthly = response.monthly ?? monthly;
      reaction = {
        deltaWaterMl: delta.totalWaterMl,
        state: delta.outputTokens >= HEAVY_OUTPUT_TOKEN_THRESHOLD ? "long_or_heavy" : "updated"
      };
    }
  }

  sidebar.update(snapshot, daily, monthly, reaction);
}

function inferReactionState(
  snapshot: Parameters<typeof sidebar.update>[0],
  previous?: Parameters<typeof sidebar.update>[0]
): MascotState {
  if (!previous) {
    return "idle";
  }

  if (snapshot.promptCount > previous.promptCount && snapshot.turnCount === previous.turnCount) {
    return "new_prompt";
  }

  if (snapshot.responseCharCount > previous.responseCharCount) {
    return "streaming_output";
  }

  const rangeRatio =
    snapshot.totalEstimate.totalWaterMl > 0
      ? snapshot.totalEstimate.highTotalWaterMl / snapshot.totalEstimate.totalWaterMl
      : 1;
  if (rangeRatio >= 2.8) {
    return "uncertain";
  }

  return "idle";
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
