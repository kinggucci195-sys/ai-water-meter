# Account Sync Plan

AI Water Meter should support Google sign-in, not Gmail access. The first public account system should use only `openid`, `email`, and `profile` scopes so users can sync preferences and aggregate usage without granting mailbox access.

## Target Architecture

1. The popup shows a user-initiated "Sign in with Google" action.
2. The extension opens `https://app.aiwatermeter.com/auth/extension/start` with `chrome.identity.launchWebAuthFlow`.
3. The web app starts Google OAuth through Supabase or a Next.js auth route using PKCE, state, and nonce.
4. Google redirects back through the web app.
5. The web app redirects to `https://<extension-id>.chromiumapp.org/callback?code=...`.
6. The extension exchanges the one-time code at `POST https://api.aiwatermeter.com/extension/session/exchange`.
7. The API returns a short-lived app token and a rotating opaque refresh token.

## Data To Sync

Allowed sync data:

- User preferences.
- Estimator profile selection.
- Daily and monthly aggregate totals.
- Provider labels such as `chatgpt`, `claude`, or `gemini`.
- Extension install/device record.

Data that must not sync by default:

- Raw prompts.
- Raw responses.
- Full URLs.
- Browsing history.
- Gmail messages, metadata, labels, contacts, attachments, or headers.
- Google OAuth tokens.
- Third-party API keys.
- Screenshots or DOM captures.

## Required Production Inputs

- Stable Chrome Web Store extension ID.
- Production domains such as `app.aiwatermeter.com` and `api.aiwatermeter.com`.
- Google Cloud project and OAuth consent screen.
- Privacy policy URL and terms URL.
- OAuth client for the web flow.
- Supabase or equivalent backend project.
- Server-side token exchange and revocation endpoints.

## Security Controls

- Keep auth tokens out of content scripts.
- Store short-lived tokens in memory or `chrome.storage.session` where possible.
- Store only rotating opaque refresh tokens in `chrome.storage.local`.
- Use server-side schema validation, rate limits, idempotency keys, and per-user row-level security.
- Logout must clear local extension auth state and revoke the server-side device session.

## Gmail Scope Decision

Do not request Gmail scopes for the base product. Gmail scopes are sensitive or restricted, increase review burden, and are unnecessary for an AI footprint estimator. If a later feature genuinely needs Gmail, ship it behind a separate consent flow and budget for Google verification.
