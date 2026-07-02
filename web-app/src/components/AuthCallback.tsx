import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export function AuthCallback() {
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
