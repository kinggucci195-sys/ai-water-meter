import { providerButtonLabel, type AuthProviderAvailability } from "../auth-config";
import { appOrigin, supabase } from "../supabase";
import { GoogleSetupNotice, GitHubSetupNotice } from "./SetupNotice";

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

interface AuthStartProps {
  authProviders: AuthProviderAvailability;
  email?: string;
}

export function AuthStart({ authProviders, email }: AuthStartProps) {
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
