import type { LeaderboardEntry } from "../types";
import { formatMilliliters } from "../utils/formatters";

interface LeaderboardProps {
  email?: string;
  entries: LeaderboardEntry[];
  period: "daily" | "weekly" | "monthly" | "all_time";
  setPeriod: (period: "daily" | "weekly" | "monthly" | "all_time") => void;
  error?: string | null;
}

export function Leaderboard({ email, entries, period, setPeriod, error }: LeaderboardProps) {
  return (
    <section className="panel">
      <div className="section-heading" style={{ marginBottom: "var(--space-sm)" }}>
        <div>
          <h2>Global Leaderboard</h2>
          <p>Ranked by AI water savings and conversation efficiency.</p>
        </div>
        <a
          className="text-link"
          href={email ? "/account" : "/auth/extension/start"}
          style={{ minHeight: "36px", padding: "0 16px" }}
        >
          {email ? "Account" : "Sign in"}
        </a>
      </div>

      <div className="leaderboard-tabs">
        {(["daily", "weekly", "monthly", "all_time"] as const).map((p) => {
          const isActive = period === p;
          const label = p === "all_time" ? "All Time" : p.charAt(0).toUpperCase() + p.slice(1);
          return (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={isActive ? "leaderboard-tab-btn active" : "leaderboard-tab-btn"}
            >
              {label}
            </button>
          );
        })}
      </div>

      {error && (
        <div
          style={{
            padding: "12px",
            background: "rgba(224, 49, 49, 0.15)",
            border: "1px solid #ff8787",
            borderRadius: "6px",
            color: "#ffe3e3",
            fontSize: "0.85rem",
            marginBottom: "var(--space-sm)"
          }}
        >
          <strong>Database Query Failed:</strong> {error}
        </div>
      )}

      <div
        className="leaderboard"
        style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}
      >
        {entries.length > 0 ? (
          entries.map((entry, idx) => {
            let rankColor = "rgba(255,255,255,0.08)";
            let rankTextColor = "rgba(255,255,255,0.7)";
            let borderGlow = "1px solid var(--color-border-light)";

            if (entry.rank === 1) {
              rankColor = "linear-gradient(135deg, #ffe066, #f59f00)";
              rankTextColor = "#030611";
              borderGlow = "1.5px solid #ffe066";
            } else if (entry.rank === 2) {
              rankColor = "linear-gradient(135deg, #e9ecef, #adb5bd)";
              rankTextColor = "#030611";
              borderGlow = "1.5px solid #e9ecef";
            } else if (entry.rank === 3) {
              rankColor = "linear-gradient(135deg, #ffd8a8, #d9480f)";
              rankTextColor = "#030611";
              borderGlow = "1.5px solid #ffd8a8";
            }

            return (
              <article
                key={`${entry.rank}-${entry.display_name}`}
                style={{
                  border: borderGlow,
                  animation: `slideInRow 0.35s ease-out both`,
                  animationDelay: `${0.05 * Math.min(idx, 10)}s`
                }}
                className="leaderboard-row"
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: rankColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "900",
                    fontFamily: "var(--font-display)",
                    fontSize: "0.9rem",
                    color: rankTextColor,
                    boxShadow: entry.rank <= 3 ? "0 0 12px rgba(255,255,255,0.15)" : "none"
                  }}
                >
                  #{entry.rank}
                </div>

                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: "1.05rem" }}>{entry.display_name}</h3>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: "0.75rem",
                      color: "var(--color-text-muted)"
                    }}
                  >
                    Badge:{" "}
                    <span style={{ color: "var(--color-cyan)", fontWeight: "bold" }}>
                      {entry.badge}
                    </span>{" "}
                    · Confidence: {entry.confidence}
                  </p>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span
                    style={{
                      display: "block",
                      fontSize: "0.95rem",
                      fontWeight: "bold",
                      color: "var(--color-blue)"
                    }}
                  >
                    {formatMilliliters(entry.water_saved_ml_estimate)}
                  </span>
                  <small style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)" }}>
                    saved
                  </small>
                </div>

                <div style={{ textAlign: "right", minWidth: "64px" }}>
                  <span
                    style={{
                      fontSize: "1.125rem",
                      fontWeight: "900",
                      color: "var(--color-cyan)",
                      fontFamily: "var(--font-display)"
                    }}
                  >
                    {entry.score}
                  </span>
                  <small
                    style={{
                      display: "block",
                      fontSize: "0.6875rem",
                      color: "var(--color-text-muted)"
                    }}
                  >
                    points
                  </small>
                </div>
              </article>
            );
          })
        ) : (
          <p style={{ textAlign: "center", color: "var(--color-text-muted)", padding: "32px 0" }}>
            No rankings submitted yet. Enable leaderboard opt-in to appear here!
          </p>
        )}
      </div>
    </section>
  );
}
