import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  defaultAuthProviderAvailability,
  providerAvailabilityFromSettings,
  type AuthProviderAvailability,
  type SupabaseAuthSettings
} from "./auth-config";
import { hasSupabaseConfig, supabase, supabaseAnonKey, supabaseUrl } from "./supabase";
import { WaterMascot3D } from "./WaterMascot3D";
import { SetupNotice } from "./components/SetupNotice";
import { AuthStart } from "./components/AuthStart";
import { AuthCallback } from "./components/AuthCallback";
import { Leaderboard } from "./components/Leaderboard";
import { AccountDashboard } from "./components/AccountDashboard";
import type { LeaderboardEntry } from "./types";
import "./style.css";

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

/**
 * Compute the period_start date string that matches what the DB trigger writes.
 * - daily:    today's date (YYYY-MM-DD)
 * - weekly:   Monday of the current ISO week (date_trunc('week', ...) in Postgres = Monday)
 * - monthly:  1st of the current month
 * - all_time: fixed epoch '2000-01-01'
 */
function getPeriodStart(period: "daily" | "weekly" | "monthly" | "all_time"): string {
  const now = new Date();
  if (period === "all_time") return "2000-01-01";
  if (period === "monthly") {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}-01`;
  }
  if (period === "weekly") {
    // ISO week starts on Monday. JS getDay(): 0=Sun, 1=Mon ... 6=Sat
    const day = now.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1; // Sun→6, Mon→0, Tue→1 ...
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    return monday.toISOString().slice(0, 10);
  }
  // daily
  return now.toISOString().slice(0, 10);
}

async function loadLeaderboard(
  period: "daily" | "weekly" | "monthly" | "all_time",
  setEntries: (entries: LeaderboardEntry[]) => void,
  setError?: (err: string | null) => void
) {
  if (!supabase) {
    return;
  }

  const periodStart = getPeriodStart(period);

  const { data, error } = await supabase
    .from("leaderboard_entries")
    .select("rank,badge,confidence,display_name,score,water_saved_ml_estimate")
    .eq("period", period)
    .eq("period_start", periodStart)
    .order("rank", { ascending: true })
    .limit(25);

  if (error) {
    console.error("loadLeaderboard error:", error);
    if (setError) setError(error.message);
  } else {
    if (setError) setError(null);
  }

  setEntries((data ?? []) as LeaderboardEntry[]);
}

function App() {
  const path = window.location.pathname;
  const [authProviders, setAuthProviders] = useState<AuthProviderAvailability>(
    defaultAuthProviderAvailability
  );
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
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

    // Check real session first
    void client.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        localStorage.removeItem("sb-mock-email");
        setEmail(session.user.email);
      } else {
        const mock = localStorage.getItem("sb-mock-email");
        if (mock) {
          setEmail(mock);
        } else {
          setEmail(undefined);
        }
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription }
    } = client.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        localStorage.removeItem("sb-mock-email");
        setEmail(session.user.email);
      } else {
        const mock = localStorage.getItem("sb-mock-email");
        setEmail(mock || undefined);
      }
    });

    const channel = client
      .channel(`leaderboard_entries_${period}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leaderboard_entries_raw"
        },
        () => void loadLeaderboard(period, setEntries, setError)
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void loadLeaderboard(period, setEntries, setError);
        }
      });

    return () => {
      subscription.unsubscribe();
      void client.removeChannel(channel);
    };
  }, [period]);

  useEffect(() => {
    void loadLeaderboard(period, setEntries, setError);
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

    return (
      <Leaderboard
        entries={entries}
        email={email}
        period={period}
        setPeriod={setPeriod}
        error={error}
      />
    );
  }, [authProviders, email, entries, path, period, error]);

  const isAccountPage = path === "/account" || (path.startsWith("/auth/extension/start") && email);

  return (
    <main>
      {!isAccountPage && (
        <section className="hero">
          <div>
            <span>AI Water Meter</span>
            <h1>{title}</h1>
            <p>
              Every AI prompt leaves a footprint. We estimate the hidden water, electricity, and CO₂
              behind every conversation — in real time. Watch it stream.
            </p>
          </div>
          <WaterMascot3D />
        </section>
      )}
      {!hasSupabaseConfig && <SetupNotice />}
      {routeView}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
