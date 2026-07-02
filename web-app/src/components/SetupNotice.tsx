export function SetupNotice() {
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

export function GitHubSetupNotice() {
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

export function GoogleSetupNotice() {
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
