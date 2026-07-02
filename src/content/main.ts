import { subtractEstimate, type UsageEstimate } from "../estimator/estimate";
import { addToDailyUsage, getDailyUsage, resetDailyUsage } from "../storage";
import { createChatObserver } from "./chat-observer";
import { detectProfile } from "./page-detectors";
import { mountSidebar } from "./sidebar";

const profile = detectProfile(window.location);
const sidebar = mountSidebar(async () => {
  await resetDailyUsage();
  sidebar.setStatus("Today's total was reset.");
  const daily = await getDailyUsage();
  if (lastSnapshot) {
    sidebar.update(lastSnapshot, daily);
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
  let daily = await getDailyUsage();

  if (!hasBaseline) {
    hasBaseline = true;
    lastPersistedTotal = snapshot.totalEstimate;
    sidebar.update(snapshot, daily);
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
      daily = await addToDailyUsage(delta);
    }
  }

  sidebar.update(snapshot, daily);
}
