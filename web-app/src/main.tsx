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

const demoEntries: LeaderboardEntry[] = [];

function App() {
  const path = window.location.pathname;
  const [authProviders, setAuthProviders] = useState<AuthProviderAvailability>(
    defaultAuthProviderAvailability
  );
  const [entries, setEntries] = useState<LeaderboardEntry[]>(demoEntries);
  const [email, setEmail] = useState<string | undefined>(() => {
    return localStorage.getItem("sb-mock-email") || undefined;
  });
  const isAuthPage = path.startsWith("/auth");
  const title = isAuthPage ? "Connect AI Water Meter" : "Global Water Awareness";

  useEffect(() => {
    // Always fetch auth providers config (will mock if no supabase is configured)
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
        () => void loadLeaderboard(setEntries)
      )
      .subscribe();

    void loadLeaderboard(setEntries);

    return () => {
      void client.removeChannel(channel);
    };
  }, []);

  const routeView = useMemo(() => {
    if (path === "/auth/callback") {
      return <AuthCallback />;
    }

    if (path.startsWith("/auth/extension/start")) {
      return <AuthStart authProviders={authProviders} email={email} />;
    }

    return <Leaderboard entries={entries} email={email} />;
  }, [authProviders, email, entries, path]);

  return (
    <main>
      <section className="hero">
        <div>
          <span>AI Water Meter</span>
          <h1>{title}</h1>
          <p>
            Source-backed estimates, aggregate-only sync, and opt-in rankings. No prompt text leaves
            your device.
          </p>
        </div>
        <WaterMascot2D />
      </section>
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
            Signed in as <strong>{email}</strong>{" "}
            <button
              type="button"
              className="text-link-btn"
              style={{
                background: "none",
                border: "none",
                color: "#4da6ff",
                cursor: "pointer",
                textDecoration: "underline",
                padding: 0,
                fontSize: "inherit",
                marginLeft: "8px"
              }}
              onClick={() => {
                localStorage.removeItem("sb-mock-email");
                if (supabase) {
                  void supabase.auth.signOut().then(() => {
                    window.location.reload();
                  });
                } else {
                  window.location.reload();
                }
              }}
            >
              (Sign out)
            </button>
          </p>
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

function Leaderboard({ email, entries }: { email?: string; entries: LeaderboardEntry[] }) {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>Leaderboard</h2>
          <p>Ranked by awareness/reduction score, not who used the most water.</p>
        </div>
        <a className="text-link" href="/auth/extension/start">
          {email ? "Account" : "Sign in"}
        </a>
      </div>
      <div className="leaderboard">
        {entries.length > 0 ? (
          entries.map((entry) => (
            <article key={entry.rank}>
              <strong>#{entry.rank}</strong>
              <div>
                <h3>{entry.display_name}</h3>
                <p>
                  {entry.badge} / confidence {entry.confidence}
                </p>
              </div>
              <span>{entry.score}</span>
            </article>
          ))
        ) : (
          <p style={{ textAlign: "center", color: "oklch(0.55 0.03 240)", padding: "20px 0" }}>
            No rankings submitted yet. Enable leaderboard opt-in to appear here!
          </p>
        )}
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
    // Enable Mock Auth redirect
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
    // Enable mock auth providers locally so they can be clicked
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

async function loadLeaderboard(setEntries: (entries: LeaderboardEntry[]) => void) {
  if (!supabase) {
    return;
  }

  const { data } = await supabase
    .from("leaderboard_entries")
    .select("rank,badge,confidence,display_name,score,water_saved_ml_estimate")
    .order("rank", { ascending: true })
    .limit(25);

  if (data?.length) {
    setEntries(data as LeaderboardEntry[]);
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
