# How To Use AI Water Meter

## Browser Extension In Development

1. Install dependencies:

```bash
npm install
npm run build
```

2. Load the extension:

- Chrome or Edge: open `chrome://extensions` or `edge://extensions`.
- Turn on Developer mode.
- Click `Load unpacked`.
- Select the repo `dist/` folder.

3. Open a supported AI chat page:

- ChatGPT
- Claude
- Gemini
- Perplexity
- Poe

The sidebar appears on the page. Existing visible chat is treated as baseline. New prompts and streamed output update the session estimate, daily total, and monthly total.

## Hosted Login And Leaderboard App

The extension opens the Vercel-hosted app by default:

```text
https://web-app-woad-rho.vercel.app
```

For Google/GitHub login to complete, Supabase Auth must allow this redirect URL:

```text
https://web-app-woad-rho.vercel.app/auth/callback
```

The app was deployed with the Supabase project URL and publishable key, so the setup warning should not appear on Vercel. If OAuth providers are not enabled in Supabase yet, the app disables those provider buttons instead of sending users to a raw Supabase JSON error.

## Google Auth Setup

The screenshot error `Unsupported provider: provider is not enabled` means the Supabase Google provider is still off. The app now checks Supabase Auth settings first and disables Google sign-in until Supabase reports it enabled.

In Google Auth Platform / Google Cloud:

```text
Application type: Web application
Authorized JavaScript origins:
https://web-app-woad-rho.vercel.app
http://127.0.0.1:5174

Authorized redirect URIs:
https://ffgynwxpjkrkwvkrucoz.supabase.co/auth/v1/callback
```

In Supabase:

```text
Authentication -> Sign In / Providers -> Google
Enable Google
Paste the Google Client ID
Paste the Google Client Secret
Save
```

In Supabase URL Configuration, keep these allowed redirect URLs:

```text
https://web-app-woad-rho.vercel.app/auth/callback
http://127.0.0.1:5174/auth/callback
```

## Local Login And Leaderboard Development

Start the local app with:

```bash
cd web-app
npm install
npm run dev
```

To make the unpacked extension point back at local development, set `appBaseUrl` in extension sync storage to `http://127.0.0.1:5174`, or temporarily change `DEFAULT_APP_BASE_URL` in `src/background/service-worker.ts`.

Without local Supabase env vars, the app shows setup instructions and demo leaderboard rows. To enable Google/GitHub login locally, create `web-app/.env.local`:

```bash
VITE_SUPABASE_URL=https://ffgynwxpjkrkwvkrucoz.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_APP_ORIGIN=http://127.0.0.1:5174
```

In Supabase Auth, enable Google and GitHub providers and add this redirect URL:

```text
http://127.0.0.1:5174/auth/callback
```

The Vercel preview needs:

```text
https://web-app-woad-rho.vercel.app/auth/callback
```

Custom production domain later needs:

```text
https://app.aiwatermeter.com/auth/callback
```

## VS Code Extension In Development

Name: `AI Water Meter`

Extension ID after Marketplace publish: `ai-water-meter.ai-water-meter-vscode`

Local VSIX package:

```text
vscode-extension/ai-water-meter-vscode-0.1.0.vsix
```

```bash
cd vscode-extension
npm install
npm run compile
code --extensionDevelopmentPath="$PWD" "$PWD"
```

Use commands:

- `AI Water Meter: Estimate Selection`
- `AI Water Meter: Estimate Clipboard`
- `AI Water Meter: Reset Today`
- `AI Water Meter: Open Methodology`

This MVP is explicit/manual by design. It does not scrape Codex, Claude Code, terminal history, `.env`, or agent config.

## VS Code Marketplace Later

From `vscode-extension/`:

```bash
npm ci
npm run compile
npx vsce package
npx vsce login ai-water-meter
npx vsce publish
```

Users will install from VS Code by searching `AI Water Meter`, or by CLI:

```bash
code --install-extension ai-water-meter.ai-water-meter-vscode
```

## Security Scan With Strix

Strix needs Docker and an LLM key:

```bash
export STRIX_LLM="openai/gpt-5.4"
export LLM_API_KEY="your-api-key"
strix -n --target ./ --scan-mode quick
```

On this machine, Docker is installed, but `uv`, Python 3.12, and Strix LLM env vars were not available during setup. The GitHub Actions workflow skips Strix until `STRIX_LLM` and `LLM_API_KEY` secrets are configured.
