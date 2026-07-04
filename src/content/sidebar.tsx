import { useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { formatCarbon, formatMilliliters, formatWh } from "../estimator/format";
import type { DailyUsageRecord, MonthlyUsageRecord } from "../storage";
import type { SessionSnapshot } from "./chat-observer";
import { DropletScene } from "./droplet-scene";
import type { MascotState } from "./mascot-state";

export type SidebarApi = {
  update(
    snapshot: SessionSnapshot,
    daily?: DailyUsageRecord,
    monthly?: MonthlyUsageRecord,
    reaction?: SidebarReaction,
    userEmail?: string
  ): void;
  setStatus(message: string): void;
  setUserEmail(email?: string): void;
};

export type SidebarReaction = {
  deltaWaterMl?: number;
  state: MascotState;
};

type SidebarProps = {
  daily?: DailyUsageRecord;
  monthly?: MonthlyUsageRecord;
  onReset: () => void;
  onLeaderboard: () => void;
  onSignIn: () => void;
  onSignOut?: () => void;
  reaction: SidebarReaction;
  snapshot?: SessionSnapshot;
  status: string;
  userEmail?: string;
};

/**
 * Floating estimate meter rendered inside a Shadow DOM so host chat pages cannot
 * accidentally inherit or break its styling.
 */
function SidebarApp({
  daily,
  onLeaderboard,
  onSignIn,
  reaction,
  snapshot,
  status,
  userEmail
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const total = snapshot?.totalEstimate;
  const reactionCopy = getReactionCopy(reaction, snapshot);

  return (
    <>
      <style>{styles}</style>
      <section className="meter" aria-live="polite">
        <header>
          <div>
            <span className="eyebrow">AI Water Meter</span>
            <strong>Pip on {snapshot?.provider ?? "AI chat"}</strong>
          </div>
          <button
            type="button"
            className="icon"
            title={collapsed ? "Expand" : "Collapse"}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? "+" : "-"}
          </button>
        </header>
        {!collapsed && (
          <div className="body">
            <div className="primary" data-slot="footprint-summary">
              <DropletScene state={reaction.state} />
              <div>
                <span>{snapshot?.isStreaming ? "Streaming Estimate" : "Live Water Estimate"}</span>
                <strong>{total ? formatMilliliters(total.totalWaterMl) : "Scanning..."}</strong>
                <small>
                  {total
                    ? `${formatMilliliters(total.lowTotalWaterMl)}-${formatMilliliters(
                        total.highTotalWaterMl
                      )} · Confidence: ${getConfidenceLabel(total)}`
                    : "Visible chat only"}
                </small>
              </div>
            </div>
            <p className={`reaction reaction-${reaction.state}`}>{reactionCopy}</p>
             <dl className="quick-stats">
              <div>
                <dt>Water</dt>
                <dd>{total ? formatMilliliters(total.totalWaterMl) : "-"}</dd>
              </div>
              <div>
                <dt>Energy</dt>
                <dd>{total ? formatWh(total.energyWh) : "-"}</dd>
              </div>
              {snapshot?.latencyMs !== undefined && (
                <div style={{ gridColumn: "span 2" }}>
                  <dt>Latency</dt>
                  <dd style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {snapshot.latencyMs} ms
                  </dd>
                </div>
              )}
              {snapshot?.throughputTps !== undefined && (
                <div>
                  <dt>Speed</dt>
                  <dd>{snapshot.throughputTps} tok/s</dd>
                </div>
              )}
              {snapshot?.isStreaming && total && total.energyWh > 0 && (
                <div>
                  <dt>Burn Rate</dt>
                  <dd>{getBurnRate(total, snapshot)} mL/s</dd>
                </div>
              )}
            </dl>
            <button
              type="button"
              className="link-button"
              onClick={() => setDetailsOpen((value) => !value)}
            >
              {detailsOpen ? "Hide details" : "Show details"}
            </button>
            {detailsOpen && (
              <>
                <h4
                  style={{
                    fontSize: "0.75rem",
                    margin: "8px 0 4px",
                    color: "oklch(0.48 0.05 238)",
                    fontWeight: "bold"
                  }}
                >
                  Breakdown
                </h4>
                <dl className="detail-stats">
                  <div>
                    <dt>Prompt tokens</dt>
                    <dd>{total ? total.inputTokens.toLocaleString() : "-"}</dd>
                  </div>
                  <div>
                    <dt>Response tokens</dt>
                    <dd>{total ? total.outputTokens.toLocaleString() : "-"}</dd>
                  </div>
                  <div>
                    <dt>Compute</dt>
                    <dd>{total ? `${total.weightedTokens.toLocaleString()} WT` : "-"}</dd>
                  </div>
                  <div>
                    <dt>Electricity</dt>
                    <dd>{total ? formatWh(total.energyWh) : "-"}</dd>
                  </div>
                  <div>
                    <dt>Cooling water</dt>
                    <dd>
                      {total
                        ? formatMilliliters(total.directWaterMl + total.indirectGridWaterMl)
                        : "-"}
                    </dd>
                  </div>
                  <div>
                    <dt>CO2e</dt>
                    <dd>{total ? formatCarbon(total.carbonGrams) : "-"}</dd>
                  </div>
                  <div>
                    <dt>Turns</dt>
                    <dd>{snapshot?.turnCount ?? "-"}</dd>
                  </div>
                  <div>
                    <dt>Today total</dt>
                    <dd>{daily ? formatMilliliters(daily.totalWaterMl) : "-"}</dd>
                  </div>
                </dl>
                {total && total.energyWh > 0 && (
                  <div
                    className="comparisons"
                    style={{
                      marginTop: "8px",
                      padding: "8px",
                      borderRadius: "0.375rem",
                      background: "oklch(0.96 0.03 195 / 0.4)",
                      border: "1px solid oklch(0.34 0.03 248 / 0.08)",
                      fontSize: "0.75rem",
                      color: "oklch(0.34 0.07 205)",
                      lineHeight: "1.4"
                    }}
                  >
                    <div style={{ fontWeight: "bold", marginBottom: "4px" }}>Equivalents:</div>
                    <div>
                      ⚡ Charging phone: <strong>{Math.round(total.energyWh * 360)} seconds</strong>
                      .
                    </div>
                    <div style={{ marginTop: "2px" }}>
                      🔥 Boiling water: <strong>{(total.energyWh * 10.75).toFixed(1)} mL</strong>.
                    </div>
                  </div>
                )}
              </>
            )}
            <div className="actions">
              {userEmail ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      window.open("https://web-app-woad-rho.vercel.app/account", "_blank")
                    }
                  >
                    Account
                  </button>
                  <button type="button" onClick={onLeaderboard}>
                    Leaderboard
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={onSignIn}>
                    Sign in
                  </button>
                  <button type="button" onClick={onLeaderboard}>
                    Leaderboard
                  </button>
                </>
              )}
            </div>
            <p>{status}</p>
            <p className="disclosure">
              Visible text only. Processed locally. Not provider telemetry.
            </p>
          </div>
        )}
      </section>
    </>
  );
}

export function mountSidebar(
  onReset: () => void,
  onSignIn: () => void,
  onLeaderboard: () => void,
  onSignOut?: () => void
): SidebarApi {
  const host = document.createElement("div");
  host.id = "ai-water-meter-root";
  const shadow = host.attachShadow({ mode: "open" });
  const rootTarget = document.createElement("div");
  shadow.append(rootTarget);
  document.documentElement.append(host);

  const root: Root = createRoot(rootTarget);
  let currentSnapshot: SessionSnapshot | undefined;
  let currentDaily: DailyUsageRecord | undefined;
  let currentMonthly: MonthlyUsageRecord | undefined;
  let currentReaction: SidebarReaction = { state: "idle" };
  let currentStatus = "Estimates stay local in your browser.";
  let currentUserEmail: string | undefined;

  const render = () => {
    root.render(
      <SidebarApp
        daily={currentDaily}
        monthly={currentMonthly}
        onLeaderboard={onLeaderboard}
        onReset={onReset}
        onSignIn={onSignIn}
        onSignOut={onSignOut}
        reaction={currentReaction}
        snapshot={currentSnapshot}
        status={currentStatus}
        userEmail={currentUserEmail}
      />
    );
  };

  render();

  return {
    update(snapshot, daily, monthly, reaction, userEmail) {
      currentSnapshot = snapshot;
      currentDaily = daily;
      currentMonthly = monthly;
      currentReaction = reaction ?? currentReaction;
      if (userEmail !== undefined) {
        currentUserEmail = userEmail;
      }
      render();
    },
    setStatus(message) {
      currentStatus = message;
      render();
    },
    setUserEmail(email) {
      currentUserEmail = email;
      render();
    }
  };
}

function getReactionCopy(reaction: SidebarReaction, snapshot?: SessionSnapshot): string {
  const provider = snapshot?.provider ?? "AI";

  if (reaction.state === "updated" && reaction.deltaWaterMl && reaction.deltaWaterMl > 0) {
    const ml = reaction.deltaWaterMl;
    if (ml > 5) return `+${formatMilliliters(ml)}. ${provider} is gulping today.`;
    if (ml > 2) return `+${formatMilliliters(ml)}. That prompt was thirsty.`;
    return `+${formatMilliliters(ml)} — sip, not a gulp.`;
  }

  if (reaction.state === "new_prompt") {
    const quips = [
      `New prompt incoming. ${provider} is warming up the GPUs.`,
      "Another one? Your keyboard is on fire.",
      `Pip sees you typing. ${provider}'s cooling system braces itself.`
    ];
    return quips[Math.floor(Math.random() * quips.length)];
  }

  if (reaction.state === "streaming_output") {
    const quips = [
      `${provider} is pouring tokens... and water.`,
      "Tokens streaming. The meter is ticking.",
      `${provider}'s data center just turned on another fan.`,
      "Every character costs a drop. Literally."
    ];
    return quips[Math.floor(Math.random() * quips.length)];
  }

  if (reaction.state === "long_or_heavy") {
    const quips = [
      `${provider} just wrote half a thesis. That wasn't cheap.`,
      "That response could fill a swimming pool... of tokens.",
      `Long answer. ${provider} is thirsty today.`
    ];
    return quips[Math.floor(Math.random() * quips.length)];
  }

  if (reaction.state === "uncertain") {
    return `Wide estimate — ${provider} doesn't share its homework.`;
  }

  if (reaction.state === "reset") {
    return "Slate wiped. Pip starts counting from zero.";
  }

  if (reaction.state === "error") {
    return "Something broke. Even Pip needs a coffee break.";
  }

  if (reaction.state === "baseline") {
    return `Existing chat scanned. Pip is locked in on ${provider}.`;
  }

  return snapshot ? `Pip is watching ${provider}. Every token counts.` : "Waking up the meter...";
}

function getConfidenceLabel(estimate: { totalWaterMl: number; highTotalWaterMl: number }): string {
  if (estimate.totalWaterMl <= 0) return "—";
  const ratio = estimate.highTotalWaterMl / estimate.totalWaterMl;
  if (ratio < 1.5) return "High";
  if (ratio < 2.5) return "Medium";
  return "Low";
}

function getBurnRate(estimate: { totalWaterMl: number }, snapshot: SessionSnapshot): string {
  if (!snapshot.throughputTps || snapshot.throughputTps <= 0) return "—";
  // Approximate mL per token * tokens per second
  const mlPerToken = estimate.totalWaterMl / Math.max(1, snapshot.lastEstimate?.outputTokens ?? 1);
  const rate = mlPerToken * snapshot.throughputTps;
  return rate > 0 ? rate.toFixed(2) : "—";
}

const styles = `
  :host, * { box-sizing: border-box; }
  .meter {
    width: 260px;
    overflow: hidden;
    border: 1px solid oklch(0.88 0.03 235 / 0.18);
    border-radius: 0.5rem;
    background: oklch(0.22 0.03 248 / 0.96);
    color: oklch(0.96 0.01 230);
    box-shadow: 0 14px 45px oklch(0.08 0.04 248 / 0.35);
    backdrop-filter: blur(12px);
    font-family: Urbanist, Inter, ui-sans-serif, system-ui, sans-serif;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.75rem 0.75rem 0.625rem;
    border-bottom: 1px solid oklch(0.88 0.03 235 / 0.14);
  }
  .eyebrow {
    display: block;
    margin-bottom: 0.125rem;
    color: oklch(0.78 0.03 235);
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0;
    text-transform: uppercase;
  }
  strong { font-size: 0.9375rem; line-height: 1.2; }
  .icon, .reset {
    border: 1px solid oklch(0.88 0.03 235 / 0.2);
    background: oklch(0.28 0.03 248);
    color: oklch(0.96 0.01 230);
    cursor: pointer;
    font: inherit;
  }
  .icon {
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 0.375rem;
    font-size: 1.125rem;
    line-height: 1;
  }
  .body { padding: 0.75rem; }
  .primary {
    display: grid;
    grid-template-columns: 4.5rem 1fr;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 0.5rem;
    background: oklch(0.34 0.06 190);
  }
  @keyframes mascot-wobble {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-4px) rotate(2deg); }
  }
  .droplet-scene {
    width: 4.5rem;
    height: 4.5rem;
    border-radius: 50%;
    background: linear-gradient(135deg, oklch(0.96 0.03 195), oklch(0.88 0.07 205));
    border: 2px solid oklch(1 0 0 / 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .droplet-scene img {
    animation: mascot-wobble 3s ease-in-out infinite;
  }
  .primary span, .primary small {
    display: block;
    color: oklch(0.78 0.03 235);
    font-size: 0.75rem;
  }
  .primary strong {
    display: block;
    margin: 0.1875rem 0;
    color: oklch(0.82 0.11 185);
    font-size: 1.625rem;
  }
  dl {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    margin: 0.625rem 0;
  }
  dl div {
    min-width: 0;
    padding: 0.5625rem;
    border: 1px solid oklch(0.88 0.03 235 / 0.14);
    border-radius: 0.5rem;
  }
  dt {
    color: oklch(0.78 0.03 235);
    font-size: 0.6875rem;
  }
  dd {
    margin: 0.125rem 0 0;
    overflow-wrap: anywhere;
    font-size: 0.8125rem;
    font-weight: 700;
  }
  p {
    margin: 0 0 0.625rem;
    color: oklch(0.78 0.03 235);
    font-size: 0.75rem;
    line-height: 1.35;
  }
  .reaction {
    margin: 0.5rem 0 0;
    padding: 0.5rem 0.625rem;
    border-radius: 0.5rem;
    background: oklch(0.28 0.04 205);
    color: oklch(0.85 0.06 195);
    font-weight: 700;
  }
  .reaction-long_or_heavy,
  .reaction-uncertain {
    background: oklch(0.31 0.05 76);
    color: oklch(0.86 0.08 86);
  }
  .reaction-error {
    background: oklch(0.3 0.05 25);
    color: oklch(0.86 0.08 25);
  }
  .quick-stats {
    margin-bottom: 0.5rem;
  }
  .detail-stats {
    margin-top: 0.5rem;
  }
  .link-button {
    width: 100%;
    min-height: 1.875rem;
    border: 0;
    border-radius: 0.4375rem;
    background: transparent;
    color: oklch(0.78 0.08 195);
    cursor: pointer;
    font: inherit;
    font-size: 0.75rem;
    font-weight: 800;
  }
  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    margin: 0.625rem 0;
  }
  .actions button {
    min-height: 2rem;
    border: 1px solid oklch(0.88 0.03 235 / 0.2);
    border-radius: 0.4375rem;
    background: oklch(0.28 0.03 248);
    color: oklch(0.96 0.01 230);
    cursor: pointer;
    font: inherit;
    font-size: 0.75rem;
    font-weight: 800;
  }
  .actions button:hover {
    background: oklch(0.35 0.04 248);
  }
  .disclosure {
    margin: 0.5rem 0 0;
    padding: 0.5rem 0.625rem;
    border: 1px solid oklch(0.88 0.03 235 / 0.14);
    border-radius: 0.5rem;
    background: oklch(0.26 0.03 248 / 0.78);
  }
  .reset {
    width: 100%;
    min-height: 2.125rem;
    border-radius: 0.4375rem;
    font-weight: 700;
  }
`;
