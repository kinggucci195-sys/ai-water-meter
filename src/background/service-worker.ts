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
      const syncStatus = await syncUsageToSupabase(daily);
      return { daily, monthly, ok: true, ...syncStatus };
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      return { ok: false, error: errMsg || "Supabase cloud sync failed." };
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

// Alarm-based Keepalive: MV3 service workers shut down when idle.
// Setting up a periodic alarm keeps the background thread registered.
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("keepalive", { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "keepalive") {
    // Touch storage briefly to trigger background event loop activation
    void chrome.storage.local.get(["supabaseUserId"]);
  }
});

/**
 * Decode a JWT payload and check if it has expired.
 * Uses a 60-second safety buffer to refresh before actual expiry.
 */
function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    // Base64url decode the payload
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(payload);
    const parsed = JSON.parse(decoded) as { exp?: number };
    if (!parsed.exp) return true;
    // Expired if current time is within 60 seconds of expiry
    return Date.now() >= (parsed.exp - 60) * 1000;
  } catch {
    return true; // If we can't decode, treat as expired
  }
}

/**
 * Returns a valid (non-expired) Supabase access token.
 * If the current token is expired and a refresh token is available,
 * calls Supabase's POST /auth/v1/token?grant_type=refresh_token
 * to obtain a fresh access token and persists both tokens to storage.
 */
async function getValidToken(
  accessToken: string | undefined,
  refreshToken: string | undefined,
  supabaseUrl: string,
  anonKey: string
): Promise<string | null> {
  // If access token is still valid, use it directly
  if (accessToken && !isTokenExpired(accessToken)) {
    return accessToken;
  }

  // Access token missing or expired — try refreshing
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey
      },
      body: JSON.stringify({ refresh_token: refreshToken })
    });

    if (!response.ok) {
      console.error("[AI Water Meter] Token refresh failed:", response.status);
      return null;
    }

    const data = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
    };

    if (!data.access_token) {
      return null;
    }

    // Persist the new tokens so future syncs don't need to refresh again
    const updates: Record<string, string> = { supabaseToken: data.access_token };
    if (data.refresh_token) {
      updates.supabaseRefreshToken = data.refresh_token;
    }
    await chrome.storage.local.set(updates);

    return data.access_token;
  } catch (err) {
    console.error("[AI Water Meter] Token refresh error:", err);
    return null;
  }
}

async function syncUsageToSupabase(
  daily: DailyUsageRecord
): Promise<{ syncSkipped: boolean; reason?: string }> {
  const keys = await chrome.storage.local.get([
    "supabaseToken",
    "supabaseRefreshToken",
    "supabaseUserId",
    "deviceId"
  ]);

  if (!keys.supabaseUserId) {
    return { syncSkipped: true, reason: "not_signed_in" };
  }

  if (!keys.supabaseToken && !keys.supabaseRefreshToken) {
    return { syncSkipped: true, reason: "not_signed_in" };
  }

  const userId = keys.supabaseUserId as string;
  const anonKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmZ3lud3hwamtya3d2a3J1Y296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5ODc4ODQsImV4cCI6MjA5ODU2Mzg4NH0.iijDhvQMy4AdlBVu3KvOmXAHb6MaSUK09568It-tUWk";
  const supabaseUrl = "https://ffgynwxpjkrkwvkrucoz.supabase.co";

  // Get a valid (non-expired) access token, refreshing if needed
  const token = await getValidToken(
    keys.supabaseToken as string | undefined,
    keys.supabaseRefreshToken as string | undefined,
    supabaseUrl,
    anonKey
  );

  if (!token) {
    return { syncSkipped: true, reason: "token_refresh_failed" };
  }

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
  const usageResponse = await fetch(
    `${supabaseUrl}/rest/v1/usage_daily?on_conflict=user_id,device_id,usage_date,idempotency_key`,
    {
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
    }
  );

  if (!usageResponse.ok) {
    const txt = await usageResponse.text();
    throw new Error(`Daily usage sync failed: ${txt}`);
  }

  return { syncSkipped: false };
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
