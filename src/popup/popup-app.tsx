import { useEffect, useState } from "react";
import { DropletScene } from "../content/droplet-scene";
import { formatCarbon, formatMilliliters, formatWh } from "../estimator/format";
import type { StorageRequest } from "../storage-messages";
import {
  getDailyUsage,
  getMonthlyUsage,
  type DailyUsageRecord,
  type MonthlyUsageRecord
} from "../storage";

type PopupUsage = {
  daily?: DailyUsageRecord;
  monthly: MonthlyUsageRecord;
};

/**
 * Browser action popup summary for the user's local daily estimates.
 */
export function PopupApp() {
  const [usage, setUsage] = useState<PopupUsage | undefined>();
  const [userEmail, setUserEmail] = useState<string | undefined>();

  useEffect(() => {
    void Promise.all([getDailyUsage(), getMonthlyUsage()]).then(([daily, monthly]) => {
      setUsage({ daily, monthly });
    });

    chrome.storage.local.get("userEmail", (data) => {
      setUserEmail((data as { userEmail?: string }).userEmail);
    });

    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === "local" && changes.userEmail) {
        setUserEmail(changes.userEmail.newValue as string | undefined);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  const handleSignOut = async () => {
    await chrome.storage.local.remove(["userEmail", "supabaseToken", "supabaseUserId"]);
  };

  return (
    <main>
      <header className="popup-hero">
        <div>
          <span>AI Water Meter</span>
          <h1>{usage?.daily ? formatMilliliters(usage.daily.totalWaterMl) : "0 mL"}</h1>
        </div>
        <DropletScene state={usage?.daily ? "updated" : "streaming_output"} />
      </header>
      <p>Today, estimated locally from visible chat text. Not provider telemetry.</p>
      <dl className="summary">
        <div>
          <dt>This month</dt>
          <dd>{usage ? formatMilliliters(usage.monthly.totalWaterMl) : "0 mL"}</dd>
        </div>
        <div>
          <dt>Energy today</dt>
          <dd>{usage?.daily ? formatWh(usage.daily.energyWh) : "0 Wh"}</dd>
        </div>
        <div>
          <dt>Carbon today</dt>
          <dd>{usage?.daily ? formatCarbon(usage.daily.carbonGrams) : "0 g CO2e"}</dd>
        </div>
        <div>
          <dt>Active days</dt>
          <dd>{usage ? usage.monthly.days : 0}</dd>
        </div>
      </dl>
      <div className="actions">
        {userEmail ? (
          <div
            className="user-account-info"
            style={{
              gridColumn: "span 2",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              width: "100%"
            }}
          >
            <span
              className="account-label"
              style={{
                fontSize: "11px",
                color: "oklch(0.48 0.05 238)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}
            >
              Signed in as <strong>{userEmail}</strong>
            </span>
            <div
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", width: "100%" }}
            >
              <button type="button" onClick={handleSignOut}>
                Sign out
              </button>
              <button
                type="button"
                onClick={() => sendPopupRequest({ path: "/leaderboard", type: "app:open" })}
              >
                Leaderboard
              </button>
            </div>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => sendPopupRequest({ path: "/auth/extension/start", type: "app:open" })}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => sendPopupRequest({ path: "/leaderboard", type: "app:open" })}
            >
              Leaderboard
            </button>
          </>
        )}
      </div>
      <button type="button" className="secondary" onClick={() => chrome.runtime.openOptionsPage()}>
        Methodology
      </button>
    </main>
  );
}

function sendPopupRequest(message: StorageRequest): void {
  void chrome.runtime.sendMessage(message);
}
