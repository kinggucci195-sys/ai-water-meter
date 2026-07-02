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

## Local Login And Leaderboard App

The extension now opens the local app by default:

```text
http://127.0.0.1:5174
```

Start it with:

```bash
cd web-app
npm install
npm run dev
```

Then click `Sign in` or `Leaderboard` in the extension.

Without Supabase env vars, the app shows setup instructions and demo leaderboard rows. To enable Google/GitHub login, create `web-app/.env.local`:

```bash
VITE_SUPABASE_URL=https://ffgynwxpjkrkwvkrucoz.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_APP_ORIGIN=http://127.0.0.1:5174
```

In Supabase Auth, enable Google and GitHub providers and add this redirect URL:

```text
http://127.0.0.1:5174/auth/callback
```

Production later needs:

```text
https://app.aiwatermeter.com/auth/callback
```

## VS Code Extension In Development

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
