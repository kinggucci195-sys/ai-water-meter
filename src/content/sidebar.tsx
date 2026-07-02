import { useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { formatCarbon, formatMilliliters, formatWh } from "../estimator/format";
import type { DailyUsageRecord, MonthlyUsageRecord } from "../storage";
import type { SessionSnapshot } from "./chat-observer";
import { DropletScene } from "./droplet-scene";

export type SidebarApi = {
  update(snapshot: SessionSnapshot, daily?: DailyUsageRecord, monthly?: MonthlyUsageRecord): void;
  setStatus(message: string): void;
};

type SidebarProps = {
  daily?: DailyUsageRecord;
  monthly?: MonthlyUsageRecord;
  onReset: () => void;
  snapshot?: SessionSnapshot;
  status: string;
};

/**
 * Floating estimate meter rendered inside a Shadow DOM so host chat pages cannot
 * accidentally inherit or break its styling.
 */
function SidebarApp({ daily, monthly, onReset, snapshot, status }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const total = snapshot?.totalEstimate;

  return (
    <>
      <style>{styles}</style>
      <section className="meter" aria-live="polite">
        <header>
          <div>
            <span className="eyebrow">AI Water Meter</span>
            <strong>{snapshot?.provider ?? "AI chat"}</strong>
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
              <DropletScene />
              <div>
                <span>Estimated footprint range</span>
                <strong>{total ? formatMilliliters(total.totalWaterMl) : "Scanning..."}</strong>
                <small>
                  {total
                    ? `${formatMilliliters(total.lowTotalWaterMl)}-${formatMilliliters(
                        total.highTotalWaterMl
                      )} from visible text`
                    : "Visible chat only"}
                </small>
              </div>
            </div>
            <p className="disclosure">
              Not provider telemetry. Local estimate from published factors.
            </p>
            <dl>
              <div>
                <dt>Direct water</dt>
                <dd>{total ? formatMilliliters(total.directWaterMl) : "-"}</dd>
              </div>
              <div>
                <dt>Grid water</dt>
                <dd>{total ? formatMilliliters(total.indirectGridWaterMl) : "-"}</dd>
              </div>
              <div>
                <dt>Energy</dt>
                <dd>{total ? formatWh(total.energyWh) : "-"}</dd>
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
                <dt>Today</dt>
                <dd>{daily ? formatMilliliters(daily.totalWaterMl) : "-"}</dd>
              </div>
              <div>
                <dt>This month</dt>
                <dd>{monthly ? formatMilliliters(monthly.totalWaterMl) : "-"}</dd>
              </div>
            </dl>
            <p>{status}</p>
            <button type="button" className="reset" onClick={onReset}>
              Reset today
            </button>
          </div>
        )}
      </section>
    </>
  );
}

export function mountSidebar(onReset: () => void): SidebarApi {
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
  let currentStatus = "Estimates stay local in your browser.";

  const render = () => {
    root.render(
      <SidebarApp
        daily={currentDaily}
        monthly={currentMonthly}
        onReset={onReset}
        snapshot={currentSnapshot}
        status={currentStatus}
      />
    );
  };

  render();

  return {
    update(snapshot, daily, monthly) {
      currentSnapshot = snapshot;
      currentDaily = daily;
      currentMonthly = monthly;
      render();
    },
    setStatus(message) {
      currentStatus = message;
      render();
    }
  };
}

const styles = `
  :host, * { box-sizing: border-box; }
  .meter {
    width: 260px;
    overflow: hidden;
    border: 1px solid oklch(0.34 0.03 248 / 0.2);
    border-radius: 0.5rem;
    background: oklch(0.99 0.01 230 / 0.96);
    color: oklch(0.22 0.04 248);
    box-shadow: 0 14px 45px oklch(0.18 0.04 248 / 0.18);
    backdrop-filter: blur(12px);
    font-family: Urbanist, Inter, ui-sans-serif, system-ui, sans-serif;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.75rem 0.75rem 0.625rem;
    border-bottom: 1px solid oklch(0.34 0.03 248 / 0.12);
  }
  .eyebrow {
    display: block;
    margin-bottom: 0.125rem;
    color: oklch(0.48 0.05 238);
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0;
    text-transform: uppercase;
  }
  strong { font-size: 0.9375rem; line-height: 1.2; }
  .icon, .reset {
    border: 1px solid oklch(0.34 0.03 248 / 0.2);
    background: oklch(1 0 0);
    color: oklch(0.22 0.04 248);
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
    background: oklch(0.94 0.04 190);
  }
  .droplet-scene {
    width: 4.5rem;
    height: 4.5rem;
    border-radius: 50%;
    background:
      radial-gradient(circle at 35% 30%, oklch(1 0 0 / 0.82), transparent 24%),
      linear-gradient(145deg, oklch(0.87 0.05 205), oklch(0.74 0.09 185));
    overflow: hidden;
  }
  .droplet-scene[data-fallback="true"]::before {
    content: "";
    display: block;
    width: 2rem;
    height: 2.75rem;
    margin: 0.875rem auto;
    border-radius: 50% 50% 55% 55%;
    background: oklch(0.95 0.05 195 / 0.95);
    transform: rotate(10deg);
  }
  .droplet-scene canvas {
    width: 4.5rem;
    height: 4.5rem;
    display: block;
  }
  .primary span, .primary small {
    display: block;
    color: oklch(0.48 0.05 238);
    font-size: 0.75rem;
  }
  .primary strong {
    display: block;
    margin: 0.1875rem 0;
    color: oklch(0.48 0.11 185);
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
    border: 1px solid oklch(0.34 0.03 248 / 0.12);
    border-radius: 0.5rem;
  }
  dt {
    color: oklch(0.55 0.03 240);
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
    color: oklch(0.49 0.04 240);
    font-size: 0.75rem;
    line-height: 1.35;
  }
  .disclosure {
    margin: 0.5rem 0 0;
    padding: 0.5rem 0.625rem;
    border: 1px solid oklch(0.34 0.03 248 / 0.12);
    border-radius: 0.5rem;
    background: oklch(0.98 0.01 230 / 0.78);
  }
  .reset {
    width: 100%;
    min-height: 2.125rem;
    border-radius: 0.4375rem;
    font-weight: 700;
  }
  @media (prefers-color-scheme: dark) {
    .meter {
      border-color: oklch(0.88 0.03 235 / 0.18);
      background: oklch(0.22 0.03 248 / 0.96);
      color: oklch(0.96 0.01 230);
    }
    header { border-color: oklch(0.88 0.03 235 / 0.14); }
    .eyebrow, .primary span, .primary small, dt, p { color: oklch(0.78 0.03 235); }
    .primary { background: oklch(0.34 0.06 190); }
    .primary strong { color: oklch(0.82 0.11 185); }
    .disclosure { background: oklch(0.26 0.03 248 / 0.78); }
    dl div { border-color: oklch(0.88 0.03 235 / 0.14); }
    .icon, .reset {
      border-color: oklch(0.88 0.03 235 / 0.2);
      background: oklch(0.28 0.03 248);
      color: oklch(0.96 0.01 230);
    }
  }
`;
