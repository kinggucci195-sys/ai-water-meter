import { useEffect, useMemo, useState } from "react";
import { supabase, apiGatewayUrl } from "../supabase";
import type { DailyUsageData } from "../types";
import {
  formatMilliliters,
  formatWh,
  formatCarbon,
  formatTokens,
  toLocalYMD
} from "../utils/formatters";
import { generateDemoUsage } from "../utils/demoData";
import { LeaderboardSettings } from "./LeaderboardSettings";
import { ObservabilityDashboard } from "./ObservabilityDashboard";

interface AccountDashboardProps {
  email?: string;
}

export function AccountDashboard({ email }: AccountDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [isMockMode, setIsMockMode] = useState(false);
  const [usageData, setUsageData] = useState<DailyUsageData[]>([]);
  const [optedInName, setOptedInName] = useState("");

  useEffect(() => {
    let channel: ReturnType<NonNullable<typeof supabase>["channel"]> | null = null;

    async function loadUsage() {
      if (!supabase) {
        setUsageData(generateDemoUsage());
        setIsDemo(true);
        setIsMockMode(true);
        setLoading(false);
        return;
      }

      const client = supabase;

      try {
        const {
          data: { session }
        } = await client.auth.getSession();
        const userId = session?.user?.id;

        if (!userId) {
          setUsageData(generateDemoUsage());
          setIsDemo(true);
          setIsMockMode(true);
          setLoading(false);
          return;
        }

        // Fetch leaderboard profile status
        const { data: profileData } = await client
          .from("leaderboard_profiles")
          .select("visible, display_name")
          .eq("user_id", userId)
          .maybeSingle();

        if (profileData) {
          setOptedInName(profileData.display_name || "");
        } else {
          setOptedInName(email ? email.split("@")[0] : "AI Explorer");
        }

        const fetchLatestData = async () => {
          const { data, error } = await client
            .from("usage_daily")
            .select(
              "usage_date,input_tokens_est,output_tokens_est,energy_wh,water_ml_mid,carbon_g,site"
            )
            .eq("user_id", userId)
            .order("usage_date", { ascending: false });

          if (!error && data) {
            if (data.length === 0) {
              setUsageData(generateDemoUsage());
              setIsDemo(true);
              setIsMockMode(false);
            } else {
              setUsageData(data as DailyUsageData[]);
              setIsDemo(false);
              setIsMockMode(false);
            }
          }
        };

        const { data, error } = await client
          .from("usage_daily")
          .select(
            "usage_date,input_tokens_est,output_tokens_est,energy_wh,water_ml_mid,carbon_g,site"
          )
          .eq("user_id", userId)
          .order("usage_date", { ascending: false });

        if (error || !data || data.length === 0) {
          setUsageData(generateDemoUsage());
          setIsDemo(true);
          setIsMockMode(false);
        } else {
          setUsageData(data as DailyUsageData[]);
          setIsDemo(false);
          setIsMockMode(false);
        }

        // Subscribe to realtime database inserts/updates for the user's usage logs
        channel = client
          .channel(`usage_daily_changes_${userId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "usage_daily",
              filter: `user_id=eq.${userId}`
            },
            () => {
              void fetchLatestData();
            }
          )
          .subscribe((status) => {
            if (status === "SUBSCRIBED") {
              void fetchLatestData();
            }
          });

        setLoading(false);
      } catch {
        setUsageData(generateDemoUsage());
        setIsDemo(true);
        setIsMockMode(true);
        setLoading(false);
      }
    }

    void loadUsage();

    return () => {
      if (channel && supabase) {
        void supabase.removeChannel(channel);
      }
    };
  }, [email]);

  const handleSaveLeaderboardName = async () => {
    if (!supabase || isMockMode) return;
    const nameToSave = optedInName.trim();
    if (!nameToSave) {
      alert("Please enter a valid display name.");
      return;
    }
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;

      const { error } = await supabase.from("leaderboard_profiles").upsert({
        user_id: userId,
        display_name: nameToSave,
        visible: true
      });

      if (!error) {
        alert("Leaderboard display name saved!");
      } else {
        alert(`Failed to save: ${error.message}`);
      }
    } catch (err) {
      if (err instanceof Error) {
        alert(`Error saving name: ${err.message}`);
      } else {
        alert("Error saving name.");
      }
    }
  };

  const stats = useMemo(() => {
    if (usageData.length === 0) {
      return {
        totalTokens: 0,
        totalWater: 0,
        totalCarbon: 0,
        totalEnergy: 0,
        peakTokens: 0,
        longestStreak: 0,
        currentStreak: 0,
        costEstimate: 0,
        promptEfficiency: 0
      };
    }

    const totalInput = usageData.reduce((acc, c) => acc + c.input_tokens_est, 0);
    const totalOutput = usageData.reduce((acc, c) => acc + c.output_tokens_est, 0);
    const totalTokens = totalInput + totalOutput;
    const totalWater = usageData.reduce((acc, c) => acc + c.water_ml_mid, 0);
    const totalCarbon = usageData.reduce((acc, c) => acc + c.carbon_g, 0);
    const totalEnergy = usageData.reduce((acc, c) => acc + c.energy_wh, 0);
    const peakTokens = Math.max(
      ...usageData.map((d) => d.input_tokens_est + d.output_tokens_est),
      0
    );

    const costEstimate = (totalInput / 1000) * 0.002 + (totalOutput / 1000) * 0.015;
    const promptEfficiency = totalInput > 0 ? (totalOutput / totalInput) * 100 : 0;

    const dates = Array.from(new Set(usageData.map((d) => d.usage_date))).sort();
    let longestStreak = 0;
    let currentStreak = 0;
    let tempStreak = 0;
    const todayStr = toLocalYMD(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = toLocalYMD(yesterday);

    let lastDate: Date | null = null;

    for (const dateStr of dates) {
      const currDate = new Date(dateStr);
      if (lastDate) {
        const diffTime = Math.abs(currDate.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          if (tempStreak > longestStreak) {
            longestStreak = tempStreak;
          }
          tempStreak = 1;
        }
      } else {
        tempStreak = 1;
      }
      lastDate = currDate;
    }
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }

    const hasToday = dates.includes(todayStr);
    const hasYesterday = dates.includes(yesterdayStr);
    if (hasToday || hasYesterday) {
      let streakCount = 0;
      const checkDate = hasToday ? new Date() : yesterday;
      while (true) {
        const checkStr = toLocalYMD(checkDate);
        if (dates.includes(checkStr)) {
          streakCount++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
      currentStreak = streakCount;
    }

    return {
      totalTokens,
      totalWater,
      totalCarbon,
      totalEnergy,
      peakTokens,
      longestStreak: longestStreak || (usageData.length > 0 ? 1 : 0),
      currentStreak,
      costEstimate,
      promptEfficiency
    };
  }, [usageData]);

  const heatmapCells = useMemo(() => {
    const cells: {
      date: string;
      water: number;
      record?: (typeof usageData)[0];
      isToday: boolean;
    }[] = [];
    const today = new Date();
    const todayStr = toLocalYMD(today);
    for (let i = 167; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = toLocalYMD(date);
      const record = usageData.find((d) => d.usage_date === dateStr);
      cells.push({
        date: dateStr,
        water: record ? record.water_ml_mid : 0,
        record,
        isToday: dateStr === todayStr
      });
    }
    return cells;
  }, [usageData]);

  const heatmapMonths = useMemo(() => {
    const months: { label: string; column: number }[] = [];
    const today = new Date();
    let lastMonth = -1;
    for (let i = 167; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const month = date.getMonth();
      if (month !== lastMonth) {
        const colIndex = Math.floor((167 - i) / 7);
        months.push({
          label: date.toLocaleDateString("en", { month: "short" }),
          column: colIndex
        });
        lastMonth = month;
      }
    }
    return months;
  }, []);

  const weeklyReports = useMemo(() => {
    const groups: {
      [key: string]: { water: number; energy: number; tokens: number; days: number };
    } = {};

    usageData.forEach((d) => {
      const date = new Date(d.usage_date);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date.setDate(diff));
      const mondayStr = toLocalYMD(monday);

      if (!groups[mondayStr]) {
        groups[mondayStr] = { water: 0, energy: 0, tokens: 0, days: 0 };
      }
      groups[mondayStr].water += d.water_ml_mid;
      groups[mondayStr].energy += d.energy_wh;
      groups[mondayStr].tokens += d.input_tokens_est + d.output_tokens_est;
      groups[mondayStr].days += 1;
    });

    return Object.entries(groups)
      .map(([weekStart, data]) => ({
        weekStart,
        ...data
      }))
      .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
      .slice(0, 5);
  }, [usageData]);

  if (loading) {
    return (
      <div
        style={{ textAlign: "center", padding: "var(--space-lg) 0", color: "var(--color-cyan)" }}
      >
        <div
          className="spinner"
          style={{
            margin: "var(--space-md) auto",
            width: "2.5rem",
            height: "2.5rem",
            border: "4px solid rgba(255,255,255,0.1)",
            borderRadius: "50%",
            borderTopColor: "var(--color-cyan)",
            animation: "spin 1s linear infinite"
          }}
        ></div>
        <p>Loading your footprint analytics...</p>
      </div>
    );
  }

  const initials = email ? email.substring(0, 2).toUpperCase() : "ME";
  const displayName = email ? email.split("@")[0] : "AI Explorer";

  return (
    <section className="panel" style={{ marginTop: "var(--space-md)" }}>
      {isDemo && (
        <div
          style={{
            padding: "var(--space-xs) var(--space-sm)",
            background: "rgba(245, 159, 0, 0.08)",
            border: "1px solid rgba(245, 159, 0, 0.2)",
            borderRadius: "8px",
            color: "#ffe066",
            fontSize: "var(--fs-caption)",
            marginBottom: "var(--space-md)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "var(--space-xs)"
          }}
        >
          <span>
            Showing Demo Data. Once you connect your browser extension and start chatting, your
            actual footprints will sync here!
          </span>
          <button
            type="button"
            style={{
              border: "none",
              color: "#030611",
              background: "var(--color-cyan)",
              padding: "var(--space-xxs) var(--space-xs)",
              borderRadius: "4px",
              fontSize: "var(--fs-caption)",
              cursor: "pointer",
              minHeight: "auto"
            }}
            onClick={() => window.location.reload()}
          >
            Refresh
          </button>
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-sm)",
          marginBottom: "var(--space-md)",
          flexWrap: "wrap"
        }}
      >
        <div
          style={{
            width: "var(--space-xl)",
            height: "var(--space-xl)",
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--color-blue), var(--color-cyan))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#030611",
            fontSize: "var(--fs-h3)",
            fontWeight: "900",
            fontFamily: "var(--font-display)",
            boxShadow: "0 0 20px var(--color-cyan-glow)"
          }}
        >
          {initials}
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: "var(--fs-h2)" }}>{displayName}</h2>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: "var(--fs-caption)",
              color: "var(--color-text-secondary)"
            }}
          >
            {email} ·{" "}
            {isMockMode ? (
              <span style={{ color: "oklch(0.65 0.2 45)", fontWeight: "bold" }}>
                Mock Mode (Not Synced)
              </span>
            ) : (
              <span style={{ color: "var(--color-cyan)", fontWeight: "bold" }}>Synced Account</span>
            )}
          </p>
        </div>
        <div
          style={{ ...(isMockMode ? {} : { display: "flex", gap: "10px", alignItems: "center" }) }}
        >
          {!isMockMode && (
            <button
              type="button"
              style={{
                background:
                  "linear-gradient(135deg, rgba(0, 242, 254, 0.15), rgba(140, 219, 253, 0.2))",
                border: "1px solid var(--color-cyan)",
                borderRadius: "6px",
                color: "var(--color-cyan)",
                fontSize: "0.8rem",
                padding: "6px 12px",
                cursor: "pointer",
                minHeight: "auto",
                fontWeight: "bold",
                boxShadow: "0 0 10px rgba(0, 242, 254, 0.1)"
              }}
              onClick={async () => {
                if (!supabase) {
                  alert("Supabase config is missing.");
                  return;
                }
                const {
                  data: { session }
                } = await supabase.auth.getSession();
                if (session) {
                  const token = session.access_token;
                  const userId = session.user.id;
                  const redirectUrl = `vscode://ai-water-meter.ai-water-meter-vscode/auth?token=${encodeURIComponent(token)}&userId=${encodeURIComponent(userId)}`;
                  window.location.href = redirectUrl;
                } else {
                  alert("Please sign in to the web app first.");
                }
              }}
            >
              🔌 Link to VS Code
            </button>
          )}
          <a
            className="text-link"
            href="/"
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid var(--color-border-light)",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "0.8rem",
              padding: "6px 12px",
              minHeight: "auto",
              textDecoration: "none",
              display: "inline-block"
            }}
          >
            Leaderboard
          </a>
          <button
            type="button"
            style={{
              background: "none",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "6px",
              color: "var(--color-text-secondary)",
              fontSize: "0.8rem",
              padding: "6px 12px",
              cursor: "pointer",
              minHeight: "auto"
            }}
            onClick={() => {
              localStorage.removeItem("sb-mock-email");
              if (supabase) {
                void supabase.auth.signOut().then(() => {
                  window.location.href = "/";
                });
              } else {
                window.location.href = "/";
              }
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="bento-card">
          <span className="stats-label">Lifetime Tokens</span>
          <strong className="stats-value">{formatTokens(stats.totalTokens)}</strong>
          <span className="stats-subtext">Total inference count</span>
        </div>
        <div className="bento-card">
          <span className="stats-label">Peak Daily Volume</span>
          <strong className="stats-value">{formatTokens(stats.peakTokens)}</strong>
          <span className="stats-subtext">Single day record</span>
        </div>
        <div className="bento-card">
          <span className="stats-label">Current Streak</span>
          <strong className="stats-value">
            {stats.currentStreak} {stats.currentStreak === 1 ? "day" : "days"}
          </strong>
          <span className="stats-subtext">Consecutive active days</span>
        </div>
        <div className="bento-card">
          <span className="stats-label">Longest Streak</span>
          <strong className="stats-value">
            {stats.longestStreak} {stats.longestStreak === 1 ? "day" : "days"}
          </strong>
          <span className="stats-subtext">All-time record</span>
        </div>
      </div>

      {/* GitHub Profile Readme Badge Copier */}
      <div
        className="bento-card"
        style={{
          marginBottom: "var(--space-md)",
          border: "1px solid rgba(0, 240, 255, 0.12)",
          padding: "var(--space-sm)"
        }}
      >
        <h3 style={{ margin: "0 0 8px 0", fontSize: "1.05rem", color: "var(--color-cyan)" }}>
          ⚡ GitHub Profile Readme Badge
        </h3>
        <p
          style={{
            margin: "0 0 16px 0",
            fontSize: "0.8rem",
            color: "var(--color-text-secondary)",
            lineHeight: "1.4"
          }}
        >
          Showcase your live stats and water savings streak directly on your GitHub Profile README.
          The badge updates automatically in real-time.
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            flexWrap: "wrap",
            marginBottom: "12px"
          }}
        >
          {/* Badge Preview */}
          <div style={{ flexShrink: 0 }}>
            <span
              style={{
                display: "block",
                fontSize: "0.72rem",
                fontFamily: "var(--font-mono)",
                color: "var(--color-text-secondary)",
                textTransform: "uppercase",
                marginBottom: "6px"
              }}
            >
              Badge Live Preview:
            </span>
            <img
              src={`${apiGatewayUrl}/api/badge/${encodeURIComponent(optedInName.trim() || displayName)}`}
              alt="AI Water Meter Badge Preview"
              style={{
                display: "block",
                maxWidth: "100%",
                height: "auto",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: "6px"
              }}
              onError={(e) => {
                // Fallback to local rendering block if API gateway is offline during dev
                e.currentTarget.style.display = "none";
              }}
            />
          </div>

          {/* Copy-paste input container */}
          <div style={{ flex: 1, minWidth: "240px" }}>
            <span
              style={{
                display: "block",
                fontSize: "0.72rem",
                fontFamily: "var(--font-mono)",
                color: "var(--color-text-secondary)",
                textTransform: "uppercase",
                marginBottom: "6px"
              }}
            >
              Readme Markdown Code:
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                readOnly
                value={`[![AI Water Meter Badge](${apiGatewayUrl}/api/badge/${encodeURIComponent(optedInName.trim() || displayName)})](https://web-app-woad-rho.vercel.app/)`}
                style={{
                  flex: 1,
                  background: "rgba(0,0,0,0.2)",
                  border: "1px solid var(--color-border-light)",
                  borderRadius: "4px",
                  padding: "8px 12px",
                  color: "#fff",
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-mono)",
                  outline: "none"
                }}
                onClick={(e) => e.currentTarget.select()}
              />
              <button
                type="button"
                style={{
                  background: "var(--color-cyan)",
                  border: "none",
                  borderRadius: "4px",
                  color: "#030611",
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                  padding: "0 16px",
                  cursor: "pointer",
                  minHeight: "auto"
                }}
                onClick={(e) => {
                  const val = `[![AI Water Meter Badge](${apiGatewayUrl}/api/badge/${encodeURIComponent(optedInName.trim() || displayName)})](https://web-app-woad-rho.vercel.app/)`;
                  void navigator.clipboard.writeText(val).then(() => {
                    const btn = e.currentTarget;
                    btn.textContent = "✓ Copied";
                    btn.style.background = "var(--color-teal)";
                    setTimeout(() => {
                      btn.textContent = "Copy";
                      btn.style.background = "var(--color-cyan)";
                    }, 2000);
                  });
                }}
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dopamine Milestones Banner */}
      <div
        className="bento-card"
        style={{
          marginBottom: "var(--space-md)",
          border: "1px solid rgba(0, 242, 254, 0.15)"
        }}
      >
        <h3 style={{ margin: "0 0 10px 0", fontSize: "1.1rem", color: "var(--color-cyan)" }}>
          🏆 Sustainability Milestones
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "var(--space-sm)"
          }}
        >
          <div>
            <span
              style={{
                display: "block",
                fontSize: "0.75rem",
                color: "var(--color-text-secondary)"
              }}
            >
              Text Generated Equivalent
            </span>
            <strong style={{ fontSize: "1.25rem", color: "#fff", fontFamily: "var(--font-mono)" }}>
              {stats.totalTokens >= 70000
                ? `${(stats.totalTokens / 70000).toFixed(1)} novels`
                : `${Math.round((stats.totalTokens / 70000) * 250)} pages`}
            </strong>
            <span
              style={{
                display: "block",
                fontSize: "0.7rem",
                color: "var(--color-text-muted)",
                marginTop: "2px"
              }}
            >
              Based on standard 70k-token novels
            </span>
          </div>
          <div>
            <span
              style={{
                display: "block",
                fontSize: "0.75rem",
                color: "var(--color-text-secondary)"
              }}
            >
              Direct Cooling Saved
            </span>
            <strong style={{ fontSize: "1.25rem", color: "#fff", fontFamily: "var(--font-mono)" }}>
              {stats.totalWater >= 240
                ? `${(stats.totalWater / 240).toFixed(1)} cups`
                : `${(stats.totalWater / 5).toFixed(1)} teaspoons`}
            </strong>
            <span
              style={{
                display: "block",
                fontSize: "0.7rem",
                color: "var(--color-text-muted)",
                marginTop: "2px"
              }}
            >
              Datacenter cooling volumes
            </span>
          </div>
          <div>
            <span
              style={{
                display: "block",
                fontSize: "0.75rem",
                color: "var(--color-text-secondary)"
              }}
            >
              Phone Charge Equivalent
            </span>
            <strong style={{ fontSize: "1.25rem", color: "#fff", fontFamily: "var(--font-mono)" }}>
              {Math.round(stats.totalEnergy * 0.1)} hours
            </strong>
            <span
              style={{
                display: "block",
                fontSize: "0.7rem",
                color: "var(--color-text-muted)",
                marginTop: "2px"
              }}
            >
              Running on smartphone battery cycles
            </span>
          </div>
        </div>
      </div>

      <div
        className="bento-card"
        style={{ marginBottom: "var(--space-md)", padding: "var(--space-sm)" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "var(--space-sm)",
            flexWrap: "wrap",
            gap: "8px"
          }}
        >
          <h3 style={{ margin: 0 }}>Water Footprint Grid</h3>
          <div
            style={{
              display: "flex",
              gap: "6px",
              alignItems: "center",
              fontSize: "0.75rem",
              color: "var(--color-text-secondary)"
            }}
          >
            <span>Less</span>
            <div
              style={{
                width: "12px",
                height: "12px",
                background: "#0e1327",
                borderRadius: "2.5px"
              }}
            ></div>
            <div
              style={{
                width: "12px",
                height: "12px",
                background: "#09345a",
                borderRadius: "2.5px"
              }}
            ></div>
            <div
              style={{
                width: "12px",
                height: "12px",
                background: "#005fa3",
                borderRadius: "2.5px"
              }}
            ></div>
            <div
              style={{
                width: "12px",
                height: "12px",
                background: "#00a2ff",
                borderRadius: "2.5px"
              }}
            ></div>
            <div
              style={{
                width: "12px",
                height: "12px",
                background: "#00ffea",
                borderRadius: "2.5px"
              }}
            ></div>
            <span>More</span>
          </div>
        </div>

        <div
          style={{
            overflowX: "auto",
            paddingBottom: "8px",
            WebkitOverflowScrolling: "touch"
          }}
        >
          <div
            style={{
              display: "inline-grid",
              gridTemplateAreas: '"days squares" "empty months"',
              gap: "4px"
            }}
          >
            {/* Day-of-week labels */}
            <div
              style={{
                gridArea: "days",
                display: "grid",
                gridTemplateRows: "repeat(7, 14px)",
                gap: "3px",
                alignItems: "center",
                paddingRight: "6px"
              }}
            >
              <span
                style={{ gridRow: 1, fontSize: "0.625rem", color: "var(--color-text-muted)" }}
              ></span>
              <span style={{ gridRow: 2, fontSize: "0.625rem", color: "var(--color-text-muted)" }}>
                Mon
              </span>
              <span
                style={{ gridRow: 3, fontSize: "0.625rem", color: "var(--color-text-muted)" }}
              ></span>
              <span style={{ gridRow: 4, fontSize: "0.625rem", color: "var(--color-text-muted)" }}>
                Wed
              </span>
              <span
                style={{ gridRow: 5, fontSize: "0.625rem", color: "var(--color-text-muted)" }}
              ></span>
              <span style={{ gridRow: 6, fontSize: "0.625rem", color: "var(--color-text-muted)" }}>
                Fri
              </span>
              <span
                style={{ gridRow: 7, fontSize: "0.625rem", color: "var(--color-text-muted)" }}
              ></span>
            </div>

            {/* Main heatmap grid */}
            <div
              style={{
                gridArea: "squares",
                display: "grid",
                gridTemplateRows: "repeat(7, 14px)",
                gridAutoFlow: "column",
                gridAutoColumns: "14px",
                gap: "3px",
                justifyContent: "start",
                width: "max-content"
              }}
            >
              {heatmapCells.map((cell, idx) => {
                let color = "#0e1327";
                if (cell.water > 0 && cell.water <= 50) color = "#09345a";
                else if (cell.water > 50 && cell.water <= 200) color = "#005fa3";
                else if (cell.water > 200 && cell.water <= 500) color = "#00a2ff";
                else if (cell.water > 500) color = "#00ffea";

                return (
                  <div
                    key={idx}
                    title={`${cell.date}: ${formatMilliliters(cell.water)}`}
                    style={{
                      width: "14px",
                      height: "14px",
                      borderRadius: "3px",
                      background: color,
                      position: "relative" as const,
                      zIndex: cell.isToday ? 1 : 0,
                      boxShadow: cell.isToday
                        ? "0 0 0 2px #ffffff, 0 0 10px var(--color-cyan)"
                        : "none",
                      transition: "transform 0.15s ease, box-shadow 0.15s ease",
                      cursor: "pointer"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "scale(1.25)";
                      e.currentTarget.style.zIndex = "2";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                      e.currentTarget.style.zIndex = cell.isToday ? "1" : "0";
                    }}
                  />
                );
              })}
            </div>

            {/* Empty corner cell */}
            <div style={{ gridArea: "empty" }}></div>

            {/* Month labels row */}
            <div
              style={{
                gridArea: "months",
                position: "relative",
                height: "18px",
                width: `${Math.ceil(168 / 7) * 17}px`
              }}
            >
              {heatmapMonths.map((m, i) => (
                <span
                  key={i}
                  style={{
                    position: "absolute",
                    left: `${m.column * 17}px`,
                    fontSize: "0.625rem",
                    color: "var(--color-text-muted)",
                    whiteSpace: "nowrap"
                  }}
                >
                  {m.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <LeaderboardSettings
        email={email}
        optedInName={optedInName}
        setOptedInName={setOptedInName}
        isMockMode={isMockMode}
        handleSaveLeaderboardName={handleSaveLeaderboardName}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "var(--space-md)",
          marginBottom: "var(--space-md)"
        }}
      >
        <div className="bento-card">
          <h3>Cost & Token Analytics</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "14px",
              marginBottom: "16px"
            }}
          >
            <div>
              <span
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  color: "var(--color-text-secondary)"
                }}
              >
                Estimated AI Cost
              </span>
              <strong style={{ fontSize: "1.5rem", color: "var(--color-blue)" }}>
                ${stats.costEstimate.toFixed(4)}
              </strong>
            </div>
            <div>
              <span
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  color: "var(--color-text-secondary)"
                }}
              >
                Prompt Efficiency
              </span>
              <strong style={{ fontSize: "1.5rem", color: "var(--color-cyan)" }}>
                {stats.promptEfficiency.toFixed(1)}%
              </strong>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.75rem",
                  marginBottom: "6px"
                }}
              >
                <span>Cost Analysis (Conciseness)</span>
                <span style={{ color: "var(--color-cyan)", fontWeight: "bold" }}>
                  {stats.promptEfficiency > 100 ? "Highly concise answers" : "Verbose answers"}
                </span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: "6px",
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: "3px",
                  overflow: "hidden"
                }}
              >
                <div
                  style={{
                    width: `${Math.min(stats.promptEfficiency, 100)}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, var(--color-blue), var(--color-cyan))",
                    borderRadius: "3px"
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bento-card">
          <h3>Resource Footprint</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <span
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  color: "var(--color-text-secondary)",
                  marginBottom: "4px"
                }}
              >
                Water Footprint
              </span>
              <strong style={{ fontSize: "1.25rem", color: "#fff" }}>
                {formatMilliliters(stats.totalWater)}
              </strong>
              <small
                style={{
                  display: "block",
                  fontSize: "0.6875rem",
                  color: "var(--color-text-muted)",
                  marginTop: "2px"
                }}
              >
                boil ~{(stats.totalEnergy * 10.75).toFixed(0)} mL equivalent
              </small>
            </div>
            <div>
              <span
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  color: "var(--color-text-secondary)",
                  marginBottom: "4px"
                }}
              >
                Energy Footprint
              </span>
              <strong style={{ fontSize: "1.25rem", color: "#fff" }}>
                {formatWh(stats.totalEnergy)}
              </strong>
              <small
                style={{
                  display: "block",
                  fontSize: "0.6875rem",
                  color: "var(--color-text-muted)",
                  marginTop: "2px"
                }}
              >
                charge phone {Math.round(stats.totalEnergy * 360).toLocaleString()}s
              </small>
            </div>
            <div>
              <span
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  color: "var(--color-text-secondary)",
                  marginBottom: "4px"
                }}
              >
                Carbon Emissions
              </span>
              <strong style={{ fontSize: "1.25rem", color: "#fff" }}>
                {formatCarbon(stats.totalCarbon)}
              </strong>
              <small
                style={{
                  display: "block",
                  fontSize: "0.6875rem",
                  color: "var(--color-text-muted)",
                  marginTop: "2px"
                }}
              >
                location-based CO2e
              </small>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "var(--space-md)"
        }}
      >
        <div className="bento-card">
          <h3>Weekly Footprint Summaries</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
            {weeklyReports.map((week) => (
              <div
                key={week.weekStart}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: "6px",
                  border: "1px solid var(--color-border-light)"
                }}
              >
                <span style={{ fontSize: "0.75rem", fontWeight: "bold" }}>
                  Week of {week.weekStart}
                </span>
                <span style={{ fontSize: "0.75rem", color: "#8cdbfd", fontWeight: "bold" }}>
                  {formatMilliliters(week.water)} used ({week.days} active days)
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bento-card">
          <h3>History Logs</h3>
          <div style={{ overflowX: "auto" }}>
            <table className="history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Site</th>
                  <th>Tokens</th>
                  <th>Water</th>
                </tr>
              </thead>
              <tbody>
                {usageData.slice(0, 5).map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ color: "var(--color-text-secondary)" }}>{row.usage_date}</td>
                    <td>{row.site}</td>
                    <td>{(row.input_tokens_est + row.output_tokens_est).toLocaleString()}</td>
                    <td style={{ color: "var(--color-cyan)", fontWeight: "bold" }}>
                      {formatMilliliters(row.water_ml_mid)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ObservabilityDashboard />
    </section>
  );
}
