import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { appOrigin, hasSupabaseConfig, supabase } from "./supabase";
import { WaterMascot3D } from "./WaterMascot3D";
import "./style.css";

type LeaderboardEntry = {
  badge: string;
  confidence: "low" | "medium" | "high";
  display_name: string;
  rank: number;
  score: number;
  water_saved_ml_estimate: number;
};

const demoEntries: LeaderboardEntry[] = [
  {
    badge: "7-day tracker",
    confidence: "medium",
    display_name: "RiverMinder",
    rank: 1,
    score: 1280,
    water_saved_ml_estimate: 240
  },
  {
    badge: "Concise prompts",
    confidence: "medium",
    display_name: "AquaPilot",
    rank: 2,
    score: 1195,
    water_saved_ml_estimate: 215
  },
  {
    badge: "Local-first",
    confidence: "high",
    display_name: "PipFriend",
    rank: 3,
    score: 1110,
    water_saved_ml_estimate: 188
  }
];

function App() {
  const path = window.location.pathname;
  const [entries, setEntries] = useState<LeaderboardEntry[]>(demoEntries);
  const [email, setEmail] = useState<string | undefined>();
  const isAuthPage = path.startsWith("/auth");
  const title = isAuthPage ? "Connect AI Water Meter" : "Global Water Awareness";

  useEffect(() => {
    if (!supabase) {
      return undefined;
    }

    const client = supabase;
    void client.auth.getUser().then(({ data }) => setEmail(data.user?.email));
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
      return <AuthStart email={email} />;
    }

    return <Leaderboard entries={entries} email={email} />;
  }, [email, entries, path]);

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
        <WaterMascot3D />
      </section>
      {!hasSupabaseConfig && <SetupNotice />}
      {routeView}
    </main>
  );
}

function AuthStart({ email }: { email?: string }) {
  return (
    <section className="panel">
      <h2>Sign in for sync and leaderboard</h2>
      <p>
        Use Google or GitHub to create an account. Sync and leaderboard are separate opt-ins; the
        extension should upload only daily aggregate estimates after you allow it.
      </p>
      {email ? <p className="success">Signed in as {email}</p> : null}
      <div className="button-row">
        <button type="button" onClick={() => signIn("google")} disabled={!supabase}>
          Continue with Google
        </button>
        <button type="button" onClick={() => signIn("github")} disabled={!supabase}>
          Continue with GitHub
        </button>
      </div>
      <p className="fineprint">
        This development page uses Supabase OAuth with PKCE. The extension-device code exchange is
        the next backend step.
      </p>
    </section>
  );
}

function AuthCallback() {
  const [status, setStatus] = useState(
    supabase ? "Completing sign-in..." : "Supabase env vars are not configured."
  );

  useEffect(() => {
    if (!supabase) {
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
      <a className="text-link" href="/leaderboard">
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
        {entries.map((entry) => (
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
        ))}
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
    return;
  }

  await supabase.auth.signInWithOAuth({
    options: {
      redirectTo: `${appOrigin()}/auth/callback`
    },
    provider
  });
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
