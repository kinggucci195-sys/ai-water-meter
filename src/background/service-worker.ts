import { isStorageRequest, type StorageRequest, type StorageResponse } from "../storage-messages";
import { addToDailyUsage, getDailyUsage, getMonthlyUsage, resetDailyUsage } from "../storage";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    methodology: "modern-text-2026",
    privacyMode: "local-only"
  });
});

let usageWriteQueue = Promise.resolve();

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isStorageRequest(message)) {
    return false;
  }

  const operation = usageWriteQueue.then(() => handleStorageRequest(message));
  usageWriteQueue = operation.then(
    () => undefined,
    () => undefined
  );

  operation.then(sendResponse, (error: unknown) => {
    sendResponse({
      error: error instanceof Error ? error.message : "Unable to update usage totals.",
      ok: false
    });
  });

  return true;
});

async function handleStorageRequest(message: StorageRequest): Promise<StorageResponse> {
  if (message.type === "usage:add-delta") {
    const daily = await addToDailyUsage(message.estimate);
    const monthly = await getMonthlyUsage();
    return { daily, monthly, ok: true };
  }

  await resetDailyUsage();
  const [daily, monthly] = await Promise.all([getDailyUsage(), getMonthlyUsage()]);
  return { daily, monthly, ok: true };
}
