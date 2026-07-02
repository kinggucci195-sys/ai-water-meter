import type { LeaderboardEntry } from "../types";
import { formatMilliliters } from "../utils/formatters";

interface LeaderboardProps {
  email?: string;
  entries: LeaderboardEntry[];
  period: "daily" | "weekly" | "monthly" | "all_time";
  setPeriod: (period: "daily" | "weekly" | "monthly" | "all_time") => void;
}

export function Leaderboard({ email, entries, period, setPeriod }: LeaderboardProps) {
  return (
    <section className="panel">
      <div className="section-heading" style={{ marginBottom: "20px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.5rem", color: "#fff", fontWeight: "bold" }}>
            Global Leaderboard
          </h2>
          <p style={{ margin: "4px 0 0", color: "oklch(0.75 0.02 240)", fontSize: "0.875rem" }}>
            Ranked by AI water savings and conversation efficiency.
          </p>
        </div>
        <a
          className="text-link"
          href={email ? "/account" : "/auth/extension/start"}
          style={{
            background: "oklch(0.55 0.11 185)",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            padding: "8px 16px",
            fontSize: "0.875rem",
            fontWeight: "bold",
            textDecoration: "none",
            boxShadow: "0 0 15px oklch(0.55 0.11 185 / 0.3)"
          }}
        >
          {email ? "Account" : "Sign in"}
        </a>
      </div>

      <div
        className="leaderboard-tabs"
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "20px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          paddingBottom: "10px"
        }}
      >
        {(["daily", "weekly", "monthly", "all_time"] as const).map((p) => {
          const isActive = period === p;
          const label = p === "all_time" ? "All Time" : p.charAt(0).toUpperCase() + p.slice(1);
          return (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              style={{
                background: isActive ? "linear-gradient(135deg, #0e3054, #1c5d9b)" : "transparent",
                border: isActive ? "1px solid #8cdbfd" : "1px solid transparent",
                borderRadius: "6px",
                color: isActive ? "#ffffff" : "rgba(255, 255, 255, 0.6)",
                cursor: "pointer",
                fontSize: "0.8125rem",
                fontWeight: "bold",
                padding: "8px 16px",
                transition: "all 0.2s ease"
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div
        className="leaderboard"
        style={{ display: "flex", flexDirection: "column", gap: "12px" }}
      >
        {entries.length > 0 ? (
          entries.map((entry, idx) => {
            let rankColor = "rgba(255,255,255,0.1)";
            let rankTextColor = "rgba(255,255,255,0.6)";
            let borderGlow = "1px solid rgba(255,255,255,0.06)";

            if (entry.rank === 1) {
              rankColor = "linear-gradient(135deg, #ffc837, #ff8008)";
              rankTextColor = "#fff";
              borderGlow = "1.5px solid #ffc837";
            } else if (entry.rank === 2) {
              rankColor = "linear-gradient(135deg, #b3cdd1, #9fa4a6)";
              rankTextColor = "#fff";
              borderGlow = "1.5px solid #b3cdd1";
            } else if (entry.rank === 3) {
              rankColor = "linear-gradient(135deg, #b87333, #ab7a4e)";
              rankTextColor = "#fff";
              borderGlow = "1.5px solid #b87333";
            }

            return (
              <article
                key={entry.rank}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "16px 20px",
                  background: "rgba(255,255,255,0.02)",
                  border: borderGlow,
                  borderRadius: "10px",
                  gap: "18px",
                  transition: "transform 0.2s ease, background 0.2s ease",
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
                    fontWeight: "bold",
                    fontSize: "0.9375rem",
                    color: rankTextColor,
                    boxShadow: entry.rank <= 3 ? "0 0 10px rgba(255,255,255,0.1)" : "none"
                  }}
                >
                  #{entry.rank}
                </div>

                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: "1rem", color: "#fff" }}>
                    {entry.display_name}
                  </h3>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: "0.75rem",
                      color: "rgba(255,255,255,0.4)"
                    }}
                  >
                    Badge:{" "}
                    <span style={{ color: "#8cdbfd", fontWeight: "bold" }}>{entry.badge}</span> ·
                    Confidence: {entry.confidence}
                  </p>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span
                    style={{
                      display: "block",
                      fontSize: "0.9375rem",
                      fontWeight: "bold",
                      color: "#4ea1f1"
                    }}
                  >
                    {formatMilliliters(entry.water_saved_ml_estimate)}
                  </span>
                  <small style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.3)" }}>
                    saved
                  </small>
                </div>

                <div style={{ textAlign: "right", minWidth: "64px" }}>
                  <span style={{ fontSize: "1.125rem", fontWeight: "bold", color: "#8cdbfd" }}>
                    {entry.score}
                  </span>
                  <small
                    style={{
                      display: "block",
                      fontSize: "0.6875rem",
                      color: "rgba(255,255,255,0.3)"
                    }}
                  >
                    points
                  </small>
                </div>
              </article>
            );
          })
        ) : (
          <p style={{ textAlign: "center", color: "oklch(0.55 0.03 240)", padding: "32px 0" }}>
            No rankings submitted yet. Enable leaderboard opt-in to appear here!
          </p>
        )}
      </div>
    </section>
  );
}
