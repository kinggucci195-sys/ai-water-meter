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

const PIP_QUIPS = [
  "Every token costs a drop.",
  "That last prompt? Thirsty.",
  "AI doesn't sweat. Data centers do.",
  "Your keyboard is a faucet.",
  "Pip sees everything. Every. Token.",
  "That regex cost more water than you think.",
  "Pip is judging your prompt efficiency.",
  "Data centers are drinking so you can chat."
];

function getNovelEquivalent(tokens: number): string {
  const novels = tokens / 70_000; // Average novel ≈ 70k tokens
  if (novels >= 1) return `${novels.toFixed(1)} novels`;
  const pages = Math.round(novels * 250);
  return `${pages} pages`;
}

function getTeaspoonEquivalent(ml: number): string {
  const tsp = ml / 5; // 1 teaspoon ≈ 5 mL
  if (tsp < 1) return `${(tsp * 100).toFixed(0)}% of a teaspoon`;
  if (tsp < 10) return `${tsp.toFixed(1)} teaspoons`;
  const cups = tsp / 48; // 1 cup ≈ 48 teaspoons
  if (cups < 4) return `${cups.toFixed(1)} cups`;
  const liters = ml / 1000;
  return `${liters.toFixed(2)} liters`;
}

/**
 * Browser action popup summary for the user's local daily estimates.
 */
export function PopupApp() {
  const [usage, setUsage] = useState<PopupUsage | undefined>();
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [pipQuip] = useState(() => PIP_QUIPS[Math.floor(Math.random() * PIP_QUIPS.length)]);

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

  const daily = usage?.daily;
  const monthly = usage?.monthly;
  const phoneChargeSecs = daily ? Math.round(daily.energyWh * 360) : 0;
  const totalTokens = daily ? daily.inputTokens + daily.outputTokens : 0;
  const monthlyTokens = monthly ? monthly.inputTokens + monthly.outputTokens : 0;

  return (
    <main>
      <header className="popup-hero">
        <div>
          <span>AI Water Meter</span>
          <h1>{daily ? formatMilliliters(daily.totalWaterMl) : "0 mL"}</h1>
        </div>
        <DropletScene state={daily ? "updated" : "streaming_output"} />
      </header>

      {/* Pip sarcastic quip */}
      <p style={{ fontStyle: "italic", fontSize: "11px", color: "oklch(0.72 0.08 205)", margin: "0 0 6px", textAlign: "center" }}>
        💧 Pip says: "{pipQuip}"
      </p>

      <dl className="summary">
        <div>
          <dt>This month</dt>
          <dd>{monthly ? formatMilliliters(monthly.totalWaterMl) : "0 mL"}</dd>
        </div>
        <div>
          <dt>Energy today</dt>
          <dd>{daily ? formatWh(daily.energyWh) : "0 Wh"}</dd>
        </div>
        <div>
          <dt>Carbon today</dt>
          <dd>{daily ? formatCarbon(daily.carbonGrams) : "0 g CO2e"}</dd>
        </div>
        <div>
          <dt>Active days</dt>
          <dd>{monthly ? monthly.days : 0}</dd>
        </div>
      </dl>

      <button
        type="button"
        className="secondary"
        onClick={() => setShowBreakdown((v) => !v)}
        style={{ marginBottom: "8px" }}
      >
        {showBreakdown ? "Hide breakdown" : "Show breakdown"}
      </button>

      {showBreakdown && daily && (
        <div style={{ marginBottom: "10px" }}>
          <dl className="summary">
            <div>
              <dt>Prompt tokens</dt>
              <dd>{daily.inputTokens.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Response tokens</dt>
              <dd>{daily.outputTokens.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Compute</dt>
              <dd>{daily.weightedTokens.toLocaleString()} WT</dd>
            </div>
            <div>
              <dt>Cooling water</dt>
              <dd>{formatMilliliters(daily.directWaterMl + daily.indirectGridWaterMl)}</dd>
            </div>
          </dl>

          {/* Expanded equivalencies */}
          {daily.energyWh > 0 && (
            <div
              style={{
                padding: "8px",
                borderRadius: "8px",
                background: "oklch(0.94 0.04 190)",
                fontSize: "11px",
                lineHeight: "1.45",
                color: "oklch(0.34 0.06 238)"
              }}
            >
              <div style={{ fontWeight: "bold", marginBottom: "3px" }}>Real-world Equivalents:</div>
              <div>
                ⚡ Phone charging: <strong>{phoneChargeSecs} seconds</strong>
              </div>
              <div>
                💧 That's <strong>{getTeaspoonEquivalent(daily.totalWaterMl)}</strong> of cooling water
              </div>
              <div>
                📖 You generated <strong>{getNovelEquivalent(totalTokens)}</strong> worth of text
              </div>
            </div>
          )}

          {/* Monthly milestone counter */}
          {monthlyTokens > 0 && (
            <div
              style={{
                marginTop: "8px",
                padding: "8px",
                borderRadius: "8px",
                background: "oklch(0.30 0.06 248)",
                border: "1px solid oklch(0.44 0.06 248)",
                fontSize: "11px",
                lineHeight: "1.45",
                color: "oklch(0.90 0.03 205)"
              }}
            >
              <div style={{ fontWeight: "bold", marginBottom: "3px" }}>📊 Monthly Milestone:</div>
              <div>
                You've processed <strong style={{ color: "oklch(0.82 0.11 185)" }}>
                  {monthlyTokens.toLocaleString()} tokens
                </strong> this month
              </div>
              <div>
                That's <strong style={{ color: "oklch(0.82 0.11 185)" }}>
                  {getNovelEquivalent(monthlyTokens)}
                </strong> of text through AI inference
              </div>
              <div>
                Using <strong style={{ color: "oklch(0.82 0.11 185)" }}>
                  {getTeaspoonEquivalent(monthly!.totalWaterMl)}
                </strong> of cooling water
              </div>
            </div>
          )}
        </div>
      )}

      <div className="actions">
        {userEmail ? (
          <>
            <button
              type="button"
              onClick={() => sendPopupRequest({ path: "/account", type: "app:open" })}
            >
              Account
            </button>
            <button
              type="button"
              onClick={() => sendPopupRequest({ path: "/leaderboard", type: "app:open" })}
            >
              Leaderboard
            </button>
          </>
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
    </main>
  );
}

function sendPopupRequest(message: StorageRequest): void {
  void chrome.runtime.sendMessage(message);
}

