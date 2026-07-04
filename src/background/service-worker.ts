import { isStorageRequest, type StorageRequest, type StorageResponse } from "../storage-messages";
import {
  addToDailyUsage,
  getDailyUsage,
  getMonthlyUsage,
  resetDailyUsage,
  type DailyUsageRecord
} from "../storage";

const DEFAULT_APP_BASE_URL = "https://web-app-woad-rho.vercel.app";
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
    try {
      await syncUsageToSupabase(daily);
      return { daily, monthly, ok: true };
    } catch (error: any) {
      return { ok: false, error: error?.message || "Supabase cloud sync failed." };
    }
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

// Listener for custom extension control actions, such as closing authentication tabs
chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  const req = message as { type?: string } | null;
  if (req && req.type === "tab:close" && sender.tab?.id !== undefined) {
    chrome.tabs.remove(sender.tab.id);
    sendResponse({ ok: true });
    return true;
  }
  return false;
});

// Synchronizes the locally recorded daily usage aggregate back to Supabase usage_daily table
async function syncUsageToSupabase(daily: DailyUsageRecord): Promise<void> {
  const keys = await chrome.storage.local.get(["supabaseToken", "supabaseUserId", "deviceId"]);

  if (!keys.supabaseToken || !keys.supabaseUserId) {
    return; // User not signed in
  }

  const token = keys.supabaseToken as string;
  const userId = keys.supabaseUserId as string;
  const anonKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmZ3lud3hwamtya3d2a3J1Y296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5ODc4ODQsImV4cCI6MjA5ODU2Mzg4NH0.iijDhvQMy4AdlBVu3KvOmXAHb6MaSUK09568It-tUWk";
  const supabaseUrl = "https://ffgynwxpjkrkwvkrucoz.supabase.co";

  // Ensure this extension installation has a unique device ID
  let deviceId = keys.deviceId as string | undefined;
  if (!deviceId) {
    deviceId = generateUUID();
    await chrome.storage.local.set({ deviceId });
  }

  // 1. Register device with Supabase if it isn't registered yet
  const deviceResponse = await fetch(`${supabaseUrl}/rest/v1/devices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      Prefer: "resolution=ignore-duplicates"
    },
    body: JSON.stringify({
      id: deviceId,
      user_id: userId,
      client_kind: "chrome_extension",
      client_version: "0.1.0"
    })
  });

  if (!deviceResponse.ok) {
    const txt = await deviceResponse.text();
    throw new Error(`Device registration failed: ${txt}`);
  }

  // 2. Upsert daily usage records
  const idempotencyKey = `${deviceId}:${daily.date}`;
  const usageResponse = await fetch(`${supabaseUrl}/rest/v1/usage_daily`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      Prefer: "resolution=merge-duplicates"
    },
    body: JSON.stringify({
      user_id: userId,
      device_id: deviceId,
      usage_date: daily.date,
      method_id: daily.profileId || "modern-text-2026",
      sequence: 1,
      prompt_count: 0,
      input_tokens_est: daily.inputTokens,
      output_tokens_est: daily.outputTokens,
      energy_wh: daily.energyWh,
      water_ml_low: daily.lowTotalWaterMl,
      water_ml_mid: daily.totalWaterMl,
      water_ml_high: daily.highTotalWaterMl,
      carbon_g: daily.carbonGrams,
      confidence: "medium",
      idempotency_key: idempotencyKey
    })
  });

  if (!usageResponse.ok) {
    const txt = await usageResponse.text();
    throw new Error(`Daily usage sync failed: ${txt}`);
  }
}

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
