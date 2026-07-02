import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  defaultAuthProviderAvailability,
  providerAvailabilityFromSettings,
  providerButtonLabel,
  type AuthProviderAvailability,
  type SupabaseAuthSettings
} from "./auth-config";
import { appOrigin, hasSupabaseConfig, supabase, supabaseAnonKey, supabaseUrl } from "./supabase";
import { WaterMascot2D } from "./WaterMascot2D";
import "./style.css";

type LeaderboardEntry = {
  badge: string;
  confidence: "low" | "medium" | "high";
  display_name: string;
  rank: number;
  score: number;
  water_saved_ml_estimate: number;
};

type DailyUsageData = {
  usage_date: string;
  input_tokens_est: number;
  output_tokens_est: number;
  energy_wh: number;
  water_ml_mid: number;
  carbon_g: number;
  site: string;
};

const demoEntries: LeaderboardEntry[] = [];

// Local formatters to ensure zero monorepo path complications
function formatMilliliters(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)} L`;
  }
  return `${value.toFixed(0)} mL`;
}

function formatWh(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} kWh`;
  }
  return `${value.toFixed(1)} Wh`;
}

function formatCarbon(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} kg CO2e`;
  }
  return `${value.toFixed(1)} g CO2e`;
}

function formatTokens(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

function generateDemoUsage(): DailyUsageData[] {
  const data: DailyUsageData[] = [];
  const today = new Date();
  // Generate last 168 days (24 weeks) of activity with some realistic gaps
  for (let i = 167; i >= 0; i--) {
    if (Math.random() < 0.25) continue; // 25% gaps

    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    const promptCount = Math.floor(Math.random() * 8) + 1;
    const inputTokens = promptCount * (Math.floor(Math.random() * 400) + 100);
    const outputTokens = promptCount * (Math.floor(Math.random() * 800) + 200);
    const weightedTokens = outputTokens + inputTokens * 0.5;
    const energyWh = (weightedTokens / 500) * 0.3;
    const waterMl = energyWh * 5.52;
    const carbonG = (energyWh / 1000) * 350;

    data.push({
      usage_date: dateStr,
      input_tokens_est: inputTokens,
      output_tokens_est: outputTokens,
      energy_wh: Number(energyWh.toFixed(2)),
      water_ml_mid: Math.round(waterMl),
      carbon_g: Number(carbonG.toFixed(2)),
      site: Math.random() > 0.5 ? "ChatGPT" : "Claude"
    });
  }
  return data;
}

function App() {
  const path = window.location.pathname;
  const [authProviders, setAuthProviders] = useState<AuthProviderAvailability>(
    defaultAuthProviderAvailability
  );
  const [entries, setEntries] = useState<LeaderboardEntry[]>(demoEntries);
  const [email, setEmail] = useState<string | undefined>(() => {
    return localStorage.getItem("sb-mock-email") || undefined;
  });
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "all_time">("daily");
  const isAuthPage = path.startsWith("/auth");
  const title = isAuthPage ? "Connect AI Water Meter" : "Global Water Awareness";

  useEffect(() => {
    void loadAuthProviders().then(setAuthProviders);

    if (!supabase) {
      return undefined;
    }

    const client = supabase;
    const mockEmail = localStorage.getItem("sb-mock-email");
    if (!mockEmail) {
      void client.auth.getUser().then(({ data }) => setEmail(data.user?.email));
    }
    const channel = client
      .channel("leaderboard_entries")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leaderboard_entries" },
        () => void loadLeaderboard(period, setEntries)
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [period]);

  useEffect(() => {
    void loadLeaderboard(period, setEntries);
  }, [period]);

  const routeView = useMemo(() => {
    if (path === "/auth/callback") {
      return <AuthCallback />;
    }

    if (path.startsWith("/auth/extension/start")) {
      if (email) {
        return <AccountDashboard email={email} />;
      }
      return <AuthStart authProviders={authProviders} email={email} />;
    }

    if (path === "/account") {
      return <AccountDashboard email={email} />;
    }

    return <Leaderboard entries={entries} email={email} period={period} setPeriod={setPeriod} />;
  }, [authProviders, email, entries, path, period]);

  const isAccountPage = path === "/account" || (path.startsWith("/auth/extension/start") && email);

  return (
    <main>
      {!isAccountPage && (
        <section className="hero">
          <div>
            <span>AI Water Meter</span>
            <h1>{title}</h1>
            <p>
              Source-backed estimates, aggregate-only sync, and opt-in rankings. No prompt text
              leaves your device.
            </p>
          </div>
          <WaterMascot2D />
        </section>
      )}
      {!hasSupabaseConfig && <SetupNotice />}
      {routeView}
    </main>
  );
}

function AuthStart({
  authProviders,
  email
}: {
  authProviders: AuthProviderAvailability;
  email?: string;
}) {
  return (
    <section className="panel">
      {email ? (
        <>
          <h2>Connected to AI Water Meter</h2>
          <p>
            Your account is linked. Your daily aggregates and leaderboard rankings will be securely
            synced from the extension.
          </p>
          <p className="success" style={{ marginTop: "24px" }}>
            Signed in as <strong>{email}</strong>
          </p>
          <div className="button-row">
            <a className="text-link" href="/account">
              Go to Account Dashboard
            </a>
          </div>
        </>
      ) : (
        <>
          <h2>Sign in for sync and leaderboard</h2>
          <p>
            Use Google or GitHub to create an account. Sync and leaderboard are separate opt-ins;
            the extension should upload only daily aggregate estimates after you allow it.
          </p>
          <div className="button-row">
            <button type="button" onClick={() => signIn("google")} disabled={!authProviders.google}>
              {providerButtonLabel("google", authProviders.google)}
            </button>
            <button type="button" onClick={() => signIn("github")} disabled={!authProviders.github}>
              {providerButtonLabel("github", authProviders.github)}
            </button>
          </div>
          {(!supabase || !authProviders.google) && <GoogleSetupNotice />}
          {(!supabase || !authProviders.github) && <GitHubSetupNotice />}
        </>
      )}
      <p className="fineprint">
        This development page uses Supabase OAuth with PKCE. The extension-device code exchange is
        the next backend step.
      </p>
    </section>
  );
}

function GitHubSetupNotice() {
  return (
    <div className="provider-notice">
      <strong>GitHub sign-in is not enabled in Supabase yet.</strong>
      <p>
        Create a GitHub OAuth App with homepage URL `https://web-app-woad-rho.vercel.app` and
        authorization callback URL `https://ffgynwxpjkrkwvkrucoz.supabase.co/auth/v1/callback`.
        Leave device flow unchecked. Then paste the Client ID and Client Secret into Supabase
        Authentication / Sign In / Providers / GitHub.
      </p>
    </div>
  );
}

function GoogleSetupNotice() {
  return (
    <div className="provider-notice">
      <strong>Google sign-in is not enabled in Supabase yet.</strong>
      <p>
        Supabase currently reports Google as disabled. In Google, create a Web application OAuth
        client with `https://web-app-woad-rho.vercel.app` as the authorized JavaScript origin and
        `https://ffgynwxpjkrkwvkrucoz.supabase.co/auth/v1/callback` as the authorized redirect URI.
        Then paste that Client ID and Client Secret into Supabase Authentication / Sign In /
        Providers / Google.
      </p>
    </div>
  );
}

function AuthCallback() {
  const [status, setStatus] = useState("Completing sign-in...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mock") === "true") {
      const mockEmail = params.get("email") || "mock-developer@example.com";
      localStorage.setItem("sb-mock-email", mockEmail);
      Promise.resolve().then(() => {
        setStatus(`Signed in as ${mockEmail} (Mock Mode). You can return to the app.`);
      });
      return;
    }

    if (!supabase) {
      Promise.resolve().then(() => {
        setStatus("Supabase env vars are not configured.");
      });
      return;
    }

    void supabase.auth.getSession().then(({ data, error }) => {
      setStatus(
        error
          ? error.message
          : data.session
            ? "Signed in. You can return to the app."
            : "No session found."
      );
    });
  }, []);

  return (
    <section className="panel">
      <h2>Auth callback</h2>
      <p>{status}</p>
      <a className="text-link" href="/">
        Open leaderboard
      </a>
    </section>
  );
}

function Leaderboard({
  email,
  entries,
  period,
  setPeriod
}: {
  email?: string;
  entries: LeaderboardEntry[];
  period: "daily" | "weekly" | "monthly" | "all_time";
  setPeriod: (period: "daily" | "weekly" | "monthly" | "all_time") => void;
}) {
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
            No {period === "all_time" ? "all-time" : period} rankings submitted yet. Enable
            leaderboard opt-in to appear here!
          </p>
        )}
      </div>
    </section>
  );
}

function AccountDashboard({ email }: { email?: string }) {
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [usageData, setUsageData] = useState<DailyUsageData[]>([]);

  useEffect(() => {
    async function loadUsage() {
      if (!supabase) {
        setUsageData(generateDemoUsage());
        setIsDemo(true);
        setLoading(false);
        return;
      }

      try {
        const {
          data: { session }
        } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        if (!userId) {
          setUsageData(generateDemoUsage());
          setIsDemo(true);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("usage_daily")
          .select(
            "usage_date,input_tokens_est,output_tokens_est,energy_wh,water_ml_mid,carbon_g,site"
          )
          .eq("user_id", userId)
          .order("usage_date", { ascending: false });

        if (error || !data || data.length === 0) {
          setUsageData(generateDemoUsage());
          setIsDemo(true);
        } else {
          setUsageData(data as DailyUsageData[]);
          setIsDemo(false);
        }
      } catch {
        setUsageData(generateDemoUsage());
        setIsDemo(true);
      } finally {
        setLoading(false);
      }
    }

    void loadUsage();
  }, [email]);

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
    const todayStr = new Date().toISOString().split("T")[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

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
        const checkStr = checkDate.toISOString().split("T")[0];
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
    const todayStr = today.toISOString().split("T")[0];
    for (let i = 167; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
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
      const mondayStr = monday.toISOString().split("T")[0];

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
      <div style={{ textAlign: "center", padding: "48px 0", color: "#8cdbfd" }}>
        <div
          className="spinner"
          style={{
            margin: "24px auto",
            width: "40px",
            height: "40px",
            border: "4px solid rgba(255,255,255,0.1)",
            borderRadius: "50%",
            borderTopColor: "#8cdbfd",
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
    <section className="panel" style={{ marginTop: "24px" }}>
      {isDemo && (
        <div
          style={{
            padding: "10px 14px",
            background: "oklch(0.3 0.05 25 / 0.5)",
            border: "1px solid oklch(0.7 0.1 25 / 0.3)",
            borderRadius: "8px",
            color: "oklch(0.75 0.1 25)",
            fontSize: "0.8125rem",
            marginBottom: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <span>
            Showing Demo Data. Once you connect your browser extension and start chatting, your
            actual footprints will sync here!
          </span>
          <button
            type="button"
            className="text-link-btn"
            style={{
              border: "none",
              color: "#fff",
              background: "oklch(0.55 0.11 185)",
              padding: "4px 10px",
              borderRadius: "4px",
              fontSize: "0.75rem",
              cursor: "pointer"
            }}
            onClick={() => window.location.reload()}
          >
            Refresh
          </button>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "28px" }}>
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #0e3054, #8cdbfd)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            fontSize: "1.75rem",
            fontWeight: "bold",
            boxShadow: "0 0 20px rgba(140, 219, 253, 0.2)"
          }}
        >
          {initials}
        </div>
        <div>
          <h2 style={{ margin: 0, color: "#fff", fontSize: "1.625rem" }}>{displayName}</h2>
          <p style={{ margin: "4px 0 0", color: "oklch(0.55 0.03 240)", fontSize: "0.875rem" }}>
            {email} · <span style={{ color: "#8cdbfd", fontWeight: "bold" }}>Synced Account</span>
          </p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: "10px" }}>
          <a
            className="text-link"
            href="/"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "0.8125rem",
              padding: "6px 12px",
              minHeight: "auto"
            }}
          >
            Leaderboard
          </a>
          <button
            type="button"
            style={{
              background: "none",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "6px",
              color: "rgba(255,255,255,0.6)",
              fontSize: "0.8125rem",
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "14px",
          marginBottom: "28px"
        }}
      >
        <div className="stats-card">
          <span className="stats-label">Lifetime Tokens</span>
          <strong className="stats-value">{formatTokens(stats.totalTokens)}</strong>
          <span className="stats-subtext">Total inference count</span>
        </div>
        <div className="stats-card">
          <span className="stats-label">Peak Daily Volume</span>
          <strong className="stats-value">{formatTokens(stats.peakTokens)}</strong>
          <span className="stats-subtext">Single day record</span>
        </div>
        <div className="stats-card">
          <span className="stats-label">Current Streak</span>
          <strong className="stats-value">
            {stats.currentStreak} {stats.currentStreak === 1 ? "day" : "days"}
          </strong>
          <span className="stats-subtext">Consecutive active days</span>
        </div>
        <div className="stats-card">
          <span className="stats-label">Longest Streak</span>
          <strong className="stats-value">
            {stats.longestStreak} {stats.longestStreak === 1 ? "day" : "days"}
          </strong>
          <span className="stats-subtext">All-time record</span>
        </div>
      </div>

      <div
        style={{
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "28px"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "14px"
          }}
        >
          <h3 style={{ margin: 0, fontSize: "1rem", color: "#fff" }}>Water Footprint Grid</h3>
          <div
            style={{
              display: "flex",
              gap: "5px",
              alignItems: "center",
              fontSize: "0.6875rem",
              color: "rgba(255,255,255,0.4)"
            }}
          >
            <span>Less</span>
            <div
              style={{ width: "14px", height: "14px", background: "#161B22", borderRadius: "3px" }}
            ></div>
            <div
              style={{ width: "14px", height: "14px", background: "#0E4377", borderRadius: "3px" }}
            ></div>
            <div
              style={{ width: "14px", height: "14px", background: "#1A6FC4", borderRadius: "3px" }}
            ></div>
            <div
              style={{ width: "14px", height: "14px", background: "#2D8CFF", borderRadius: "3px" }}
            ></div>
            <div
              style={{ width: "14px", height: "14px", background: "#79C0FF", borderRadius: "3px" }}
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
                paddingRight: "4px"
              }}
            >
              <span
                style={{ gridRow: 1, fontSize: "0.5625rem", color: "rgba(255,255,255,0.35)" }}
              ></span>
              <span style={{ gridRow: 2, fontSize: "0.5625rem", color: "rgba(255,255,255,0.35)" }}>
                Mon
              </span>
              <span
                style={{ gridRow: 3, fontSize: "0.5625rem", color: "rgba(255,255,255,0.35)" }}
              ></span>
              <span style={{ gridRow: 4, fontSize: "0.5625rem", color: "rgba(255,255,255,0.35)" }}>
                Wed
              </span>
              <span
                style={{ gridRow: 5, fontSize: "0.5625rem", color: "rgba(255,255,255,0.35)" }}
              ></span>
              <span style={{ gridRow: 6, fontSize: "0.5625rem", color: "rgba(255,255,255,0.35)" }}>
                Fri
              </span>
              <span
                style={{ gridRow: 7, fontSize: "0.5625rem", color: "rgba(255,255,255,0.35)" }}
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
                let color = "#161B22";
                if (cell.water > 0 && cell.water <= 50) color = "#0E4377";
                else if (cell.water > 50 && cell.water <= 200) color = "#1A6FC4";
                else if (cell.water > 200 && cell.water <= 500) color = "#2D8CFF";
                else if (cell.water > 500) color = "#79C0FF";

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
                        ? "0 0 0 2px rgba(255,255,255,0.7), 0 0 8px rgba(45,140,255,0.5)"
                        : "none",
                      transition: "transform 0.15s ease, box-shadow 0.15s ease",
                      cursor: "pointer"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "scale(1.3)";
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
                    color: "rgba(255,255,255,0.4)",
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "20px",
          marginBottom: "28px"
        }}
      >
        <div
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            borderRadius: "12px",
            padding: "20px"
          }}
        >
          <h3 style={{ margin: "0 0 14px", fontSize: "1rem", color: "#fff" }}>
            Cost & Token Analytics
          </h3>
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
                style={{ display: "block", fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}
              >
                Estimated AI Cost
              </span>
              <strong style={{ fontSize: "1.5rem", color: "#4ea1f1" }}>
                ${stats.costEstimate.toFixed(4)}
              </strong>
            </div>
            <div>
              <span
                style={{ display: "block", fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}
              >
                Prompt Efficiency
              </span>
              <strong style={{ fontSize: "1.5rem", color: "#8cdbfd" }}>
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
                  marginBottom: "4px"
                }}
              >
                <span>Cost Analysis (Conciseness)</span>
                <span>
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
                    background: "linear-gradient(90deg, #0e3054, #8cdbfd)",
                    borderRadius: "3px"
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            borderRadius: "12px",
            padding: "20px"
          }}
        >
          <h3 style={{ margin: "0 0 14px", fontSize: "1rem", color: "#fff" }}>
            Resource footprint
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <span
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  color: "rgba(255,255,255,0.4)",
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
                  color: "rgba(255,255,255,0.3)",
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
                  color: "rgba(255,255,255,0.4)",
                  marginBottom: "4px"
                }}
              >
                Energy footprint
              </span>
              <strong style={{ fontSize: "1.25rem", color: "#fff" }}>
                {formatWh(stats.totalEnergy)}
              </strong>
              <small
                style={{
                  display: "block",
                  fontSize: "0.6875rem",
                  color: "rgba(255,255,255,0.3)",
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
                  color: "rgba(255,255,255,0.4)",
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
                  color: "rgba(255,255,255,0.3)",
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
          gap: "20px"
        }}
      >
        <div
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            borderRadius: "12px",
            padding: "20px"
          }}
        >
          <h3 style={{ margin: "0 0 14px", fontSize: "1rem", color: "#fff" }}>
            Weekly footprint summaries
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {weeklyReports.map((week) => (
              <div
                key={week.weekStart}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 10px",
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: "6px"
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

        <div
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            borderRadius: "12px",
            padding: "20px"
          }}
        >
          <h3 style={{ margin: "0 0 14px", fontSize: "1rem", color: "#fff" }}>History logs</h3>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.75rem",
                textAlign: "left"
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.4)"
                  }}
                >
                  <th style={{ padding: "6px 4px" }}>Date</th>
                  <th style={{ padding: "6px 4px" }}>Site</th>
                  <th style={{ padding: "6px 4px" }}>Tokens</th>
                  <th style={{ padding: "6px 4px" }}>Water</th>
                </tr>
              </thead>
              <tbody>
                {usageData.slice(0, 5).map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "8px 4px", color: "rgba(255,255,255,0.7)" }}>
                      {row.usage_date}
                    </td>
                    <td style={{ padding: "8px 4px", color: "#fff" }}>{row.site}</td>
                    <td style={{ padding: "8px 4px" }}>
                      {(row.input_tokens_est + row.output_tokens_est).toLocaleString()}
                    </td>
                    <td style={{ padding: "8px 4px", color: "#4ea1f1", fontWeight: "bold" }}>
                      {formatMilliliters(row.water_ml_mid)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function SetupNotice() {
  return (
    <section className="setup">
      <strong>Local setup needed</strong>
      <p>
        Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `web-app/.env.local`, then enable
        Google and GitHub providers in Supabase. Until then, auth buttons stay disabled and the
        leaderboard uses demo rows.
      </p>
    </section>
  );
}

async function signIn(provider: "github" | "google") {
  if (!supabase) {
    const mockEmail = `mock-${provider}-user@example.com`;
    window.location.href = `/auth/callback?mock=true&email=${encodeURIComponent(mockEmail)}`;
    return;
  }

  await supabase.auth.signInWithOAuth({
    options: {
      redirectTo: `${appOrigin()}/auth/callback`
    },
    provider
  });
}

async function loadAuthProviders(): Promise<AuthProviderAvailability> {
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      github: true,
      google: true
    };
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: {
        apikey: supabaseAnonKey
      }
    });

    if (!response.ok) {
      return defaultAuthProviderAvailability;
    }

    return providerAvailabilityFromSettings((await response.json()) as SupabaseAuthSettings);
  } catch {
    return defaultAuthProviderAvailability;
  }
}

async function loadLeaderboard(
  period: "daily" | "weekly" | "monthly" | "all_time",
  setEntries: (entries: LeaderboardEntry[]) => void
) {
  if (!supabase) {
    return;
  }

  const { data } = await supabase
    .from("leaderboard_entries")
    .select("rank,badge,confidence,display_name,score,water_saved_ml_estimate")
    .eq("period", period)
    .order("rank", { ascending: true })
    .limit(25);

  setEntries((data ?? []) as LeaderboardEntry[]);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
