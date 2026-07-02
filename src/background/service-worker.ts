import { isStorageRequest, type StorageRequest, type StorageResponse } from "../storage-messages";
import { addToDailyUsage, getDailyUsage, getMonthlyUsage, resetDailyUsage } from "../storage";

const DEFAULT_APP_BASE_URL = "http://127.0.0.1:5174";
const APP_BASE_URL_KEY = "appBaseUrl";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    [APP_BASE_URL_KEY]: DEFAULT_APP_BASE_URL,
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

  if (message.type === "app:open") {
    const appBaseUrl = await getAppBaseUrl();
    await chrome.tabs.create({ url: `${appBaseUrl}${message.path}` });
    return { ok: true };
  }

  await resetDailyUsage();
  const [daily, monthly] = await Promise.all([getDailyUsage(), getMonthlyUsage()]);
  return { daily, monthly, ok: true };
}

async function getAppBaseUrl(): Promise<string> {
  const stored = await chrome.storage.sync.get(APP_BASE_URL_KEY);
  const value = stored[APP_BASE_URL_KEY];
  return typeof value === "string" && value.startsWith("http")
    ? value.replace(/\/$/, "")
    : DEFAULT_APP_BASE_URL;
}
