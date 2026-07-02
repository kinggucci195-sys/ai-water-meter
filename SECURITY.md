# Security

## Current Checks

- `npm run ci`
- `npm run smoke`
- `npm audit --omit=optional`
- `npm audit --omit=optional` in `web-app/`
- `npm audit --omit=optional` in `vscode-extension/`

## Strix

Strix is configured in `.github/workflows/strix.yml`.

It is skipped until these repository secrets exist:

- `STRIX_LLM`
- `LLM_API_KEY`

Local run:

```bash
export STRIX_LLM="openai/gpt-5.4"
export LLM_API_KEY="your-api-key"
strix -n --target ./ --scan-mode quick
```

Only run Strix against systems and code you own or have permission to test.

## Sensitive Data Rules

AI Water Meter must not upload:

- Raw prompts.
- Raw responses.
- Full URLs.
- Browser history.
- Terminal history.
- `.env`, `~/.codex`, `~/.claude`, shell profiles, or API keys.

Sync and leaderboard data must stay aggregate-only and opt-in.
