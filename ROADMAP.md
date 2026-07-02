# Roadmap

## Now

- Keep the extension local-first.
- Keep store permissions narrow.
- Keep estimates transparent and uncertainty-labeled.
- Validate CI, package integrity, and browser smoke behavior on every PR.
- Show daily and monthly local aggregates.
- Verify the Three.js water mascot with browser smoke pixel checks.
- Add sign-in and leaderboard entry points without uploading data yet.

## Next

- Build the hosted app routes for extension OAuth and leaderboard opt-in.
- Add provider-specific selector tests with saved DOM fixtures.
- Add user-selectable estimator profiles: median text, long-context, reasoning-heavy, image/video.
- Add a real options UI for coefficient overrides.
- Expand browser smoke coverage beyond one mocked ChatGPT page.
- Add UI tests for sidebar collapse, reset, popup, and options behavior.
- Add store listing screenshots and promotional assets.
- Add a release workflow that creates signed release artifacts from `production`.
- Add public-store upload workflows after the first Chrome Web Store and Edge Add-ons listings exist.
- Package the VS Code companion MVP and test it locally in Extension Development Host.

## Later

- Consider migrating to WXT if the extension expands to Firefox/Safari or needs better dev-mode ergonomics.
- Consider a full-stack companion dashboard only if users need cross-device sync, team reporting, or fleet policy management.
- If a backend is added, use explicit opt-in sync and avoid uploading raw prompts/responses by default.
- Add Google sign-in for sync through a web auth bridge with no Gmail scopes.
- Add aggregate-only, opt-in global leaderboard with abuse controls.
- Add opt-in MCP companion for Codex/Claude Code-style workflows.
