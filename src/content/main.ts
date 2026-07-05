import { subtractEstimate, type UsageEstimate } from "../estimator/estimate";
import { formatMilliliters } from "../estimator/format";
import type { StorageRequest, StorageResponse } from "../storage-messages";
import { getDailyUsage, getMonthlyUsage } from "../storage";
import { createChatObserver } from "./chat-observer";
import { HEAVY_OUTPUT_TOKEN_THRESHOLD, type MascotState } from "./mascot-state";
import { detectProfile } from "./page-detectors";
import { mountSidebar, type SidebarReaction } from "./sidebar";

const host = window.location.hostname;
const isWebApp =
  host === "web-app-woad-rho.vercel.app" || host === "localhost" || host === "127.0.0.1";

if (isWebApp) {
  let syncSessionInterval: any = null;
  let syncSignOutInterval: any = null;

  // Sync Web App Session -> Extension Storage (whenever Web App is open and logged in)
  const syncSessionFromWebApp = () => {
    if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.id) {
      if (syncSessionInterval) clearInterval(syncSessionInterval);
      return;
    }

    try {
      let email: string | null = null;
      let supabaseToken = "";
      let supabaseUserId = "";

      const tokenStr = localStorage.getItem("sb-ffgynwxpjkrkwvkrucoz-auth-token");
      if (tokenStr) {
        try {
          const parsed = JSON.parse(tokenStr);
          email = parsed?.user?.email || null;
          supabaseToken = parsed?.access_token || "";
          supabaseUserId = parsed?.user?.id || "";
          // Clear mock email to avoid conflict
          localStorage.removeItem("sb-mock-email");
        } catch {
          // Ignore parsing errors
        }
      }

      if (!email) {
        const mockEmail = localStorage.getItem("sb-mock-email");
        if (mockEmail) {
          email = mockEmail;
        }
      }

      if (email) {
        chrome.storage.local.get(["userEmail", "supabaseToken", "supabaseUserId"], (data) => {
          // Double check context validity before writing
          if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.id) {
            if (syncSessionInterval) clearInterval(syncSessionInterval);
            return;
          }
          const storedEmail = (data as { userEmail?: string }).userEmail;
          const storedToken = (data as { supabaseToken?: string }).supabaseToken;
          const storedUserId = (data as { supabaseUserId?: string }).supabaseUserId;

          if (
            storedEmail !== email ||
            storedToken !== supabaseToken ||
            storedUserId !== supabaseUserId
          ) {
            void chrome.storage.local.set({
              userEmail: email,
              supabaseToken,
              supabaseUserId
            });
          }
        });
      }
    } catch (err) {
      if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.id) {
        if (syncSessionInterval) clearInterval(syncSessionInterval);
      }
    }
  };

  // Run session sync immediately and keep in sync every second
  syncSessionFromWebApp();
  syncSessionInterval = setInterval(syncSessionFromWebApp, 1000);

  // Close callback redirection tabs specifically
  if (window.location.pathname.startsWith("/auth/callback")) {
    const checkSession = setInterval(async () => {
      if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.id) {
        clearInterval(checkSession);
        return;
      }
      try {
        const mockEmail = localStorage.getItem("sb-mock-email");
        const tokenStr = localStorage.getItem("sb-ffgynwxpjkrkwvkrucoz-auth-token");
        if (mockEmail || tokenStr) {
          clearInterval(checkSession);
          setTimeout(() => {
            chrome.runtime.sendMessage({ type: "tab:close" });
          }, 300);
        }
      } catch (err) {
        if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.id) {
          clearInterval(checkSession);
        }
      }
    }, 500);
  }

  // 1. Web App -> Extension Sign-Out Sync
  const syncSignOutFromWebApp = () => {
    if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.id) {
      if (syncSignOutInterval) clearInterval(syncSignOutInterval);
      return;
    }
    try {
      const token = localStorage.getItem("sb-ffgynwxpjkrkwvkrucoz-auth-token");
      const mockEmail = localStorage.getItem("sb-mock-email");
      chrome.storage.local.get("userEmail", (data) => {
        if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.id) {
          if (syncSignOutInterval) clearInterval(syncSignOutInterval);
          return;
        }
        const localEmail = (data as { userEmail?: string }).userEmail;
        if (!token && !mockEmail && localEmail) {
          void chrome.storage.local.remove(["userEmail", "supabaseToken", "supabaseUserId"]);
        }
      });
    } catch (err) {
      if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.id) {
        if (syncSignOutInterval) clearInterval(syncSignOutInterval);
      }
    }
  };
  syncSignOutInterval = setInterval(syncSignOutFromWebApp, 1000);

  // 2. Extension -> Web App Sign-Out Sync
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.id) {
      return;
    }
    if (areaName === "local" && changes.userEmail && !changes.userEmail.newValue) {
      localStorage.removeItem("sb-ffgynwxpjkrkwvkrucoz-auth-token");
      localStorage.removeItem("sb-mock-email");
      window.location.reload();
    }
  });
} else {
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
    },
    async () => {
      await chrome.storage.local.remove(["userEmail", "supabaseToken", "supabaseUserId"]);
      sidebar.setStatus("Signed out successfully.");
    }
  );

  chrome.storage.local.get("userEmail", (data) => {
    const email = (data as { userEmail?: string }).userEmail;
    if (email) {
      sidebar.setUserEmail(email);
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.userEmail) {
      sidebar.setUserEmail(changes.userEmail.newValue as string | undefined);
    }
  });

  let lastSnapshot: Parameters<typeof sidebar.update>[0] | undefined;
  let lastPersistedTotal: UsageEstimate | undefined;
  let hasBaseline = false;
  let persistenceQueue = Promise.resolve();

  // URL polling to reset baseline on SPA navigations (when user switches chats)
  let currentPath = window.location.pathname;
  const pathInterval = window.setInterval(() => {
    if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.id) {
      window.clearInterval(pathInterval);
      return;
    }
    if (window.location.pathname !== currentPath) {
      const oldPath = currentPath;
      const newPath = window.location.pathname;
      currentPath = newPath;

      const isFromNewChat =
        oldPath === "/" ||
        oldPath === "/chat" ||
        oldPath === "/chat/" ||
        oldPath === "/new" ||
        oldPath === "/app" ||
        oldPath === "/app/";
      const isToExistingChat =
        newPath.includes("/c/") || newPath.includes("/chat/") || newPath.includes("/app/");
      const isTransitionFromNewToCreated = isFromNewChat && isToExistingChat;

      if (!isTransitionFromNewToCreated) {
        hasBaseline = false;
        lastPersistedTotal = undefined;
        lastSnapshot = undefined;
        sidebar.setStatus("Switched chat session. Resetting local baseline.");
      }
    }
  }, 1000);

  function isExistingChatRoute(url: { pathname: string }): boolean {
    const path = url.pathname;
    // ChatGPT: /c/uuid
    if (path.includes("/c/")) return true;
    // Claude: /chat/uuid (ignoring /chat/ or /new)
    if (path.includes("/chat/") && !path.endsWith("/chat") && !path.endsWith("/chat/")) return true;
    // Gemini: /app/uuid
    if (path.includes("/app/") && path.split("/app/")[1]?.length > 5) return true;
    return false;
  }

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
      const isExistingRoute = isExistingChatRoute(window.location);
      const hasMessages = snapshot.turnCount > 0;

      if (isExistingRoute && !hasMessages) {
        // Delay baseline until historical messages are loaded from the database/API
        sidebar.update(snapshot, daily, monthly, { state: "baseline" });
        sidebar.setStatus("Waiting for chat history to load...");
        return;
      }

      hasBaseline = true;
      lastPersistedTotal = snapshot.totalEstimate;
      sidebar.update(snapshot, daily, monthly, { state: "baseline" });
      sidebar.setStatus("Existing visible chat is treated as baseline.");
      return;
    }

    if (snapshot.isStreaming) {
      sidebar.update(snapshot, daily, monthly, reaction);
      sidebar.setStatus("Streaming real-time telemetry...");
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
        try {
          const response = await sendStorageRequest({ estimate: delta, type: "usage:add-delta" });
          daily = response.daily;
          monthly = response.monthly ?? monthly;
          reaction = {
            deltaWaterMl: delta.totalWaterMl,
            state: delta.outputTokens >= HEAVY_OUTPUT_TOKEN_THRESHOLD ? "long_or_heavy" : "updated"
          };
          if (response.syncSkipped) {
            sidebar.setStatus("Estimates saved locally. Sign in to sync with leaderboard.");
          } else {
            sidebar.setStatus(
              `Added ${formatMilliliters(delta.totalWaterMl)} to today's cloud telemetry.`
            );
          }
        } catch (error: unknown) {
          sidebar.update(snapshot, daily, monthly, { state: "error" });
          sidebar.setStatus(
            error instanceof Error ? error.message : "Unable to sync cloud telemetry."
          );
        }
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
    // 1. Check if the extension context is invalidated
    const isContextValid = typeof chrome !== "undefined" && !!chrome.runtime && !!chrome.runtime.id;
    if (!isContextValid) {
      sidebar.setStatus("Extension updated. Please refresh the page to sync.");
      throw new Error("Extension updated. Please refresh the page to sync.");
    }

    try {
      const response = (await chrome.runtime.sendMessage(message)) as StorageResponse | undefined;
      if (!response?.ok) {
        throw new Error(response?.error ?? "Unable to update local usage totals.");
      }
      return response;
    } catch (err: unknown) {
      const isConnectionError =
        err instanceof Error &&
        (err.message.includes("Extension context invalidated") ||
          err.message.includes("Could not establish connection"));
      
      if (isConnectionError) {
        sidebar.setStatus("Extension updated. Please refresh the page to sync.");
        throw new Error("Extension updated. Please refresh the page to sync.");
      }
      throw err;
    }
  }
}
