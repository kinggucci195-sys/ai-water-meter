# AI Water Meter For VS Code

This is the VS Code companion scaffold for AI Water Meter. It keeps the same local-first stance as the browser extension.

## MVP Behavior

- Shows today's estimated water total in the VS Code status bar.
- Estimates selected text with `AI Water Meter: Estimate Selection`.
- Estimates clipboard text with `AI Water Meter: Estimate Clipboard`.
- Resets the local day with `AI Water Meter: Reset Today`.
- Stores only derived aggregate totals in VS Code global state.

## What It Does Not Do Yet

- It does not scrape Copilot, Codex, Claude Code, or terminal history automatically.
- It does not upload prompt text, output text, file content, or terminal output.
- It does not claim exact provider telemetry.
- It does not join the global leaderboard until the opt-in backend exists.

## Planned Phases

1. Package and publish the local MVP to the VS Code Marketplace.
2. Add an opt-in terminal AI command meter for known commands only.
3. Add a richer webview dashboard with strict CSP and local bundled assets.
4. Add an MCP companion so agents can explicitly report usage instead of being scraped.
5. Add optional account sync using VS Code SecretStorage and aggregate-only uploads.

## Development

```bash
cd vscode-extension
npm install
npm run compile
```

The package imports estimator logic from the root `src/estimator` folder so browser and VS Code calculations stay aligned.
