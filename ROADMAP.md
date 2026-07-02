# Roadmap

## Now

- Keep the extension local-first.
- Keep store permissions narrow.
- Keep estimates transparent and uncertainty-labeled.
- Validate CI, package integrity, and browser smoke behavior on every PR.
- Show daily and monthly local aggregates.
- Verify the Three.js water droplet with browser smoke pixel checks.

## Next

- Add provider-specific selector tests with saved DOM fixtures.
- Add user-selectable estimator profiles: median text, long-context, reasoning-heavy, image/video.
- Add a real options UI for coefficient overrides.
- Expand browser smoke coverage beyond one mocked ChatGPT page.
- Add UI tests for sidebar collapse, reset, popup, and options behavior.
- Add store listing screenshots and promotional assets.
- Add a release workflow that creates signed release artifacts from `production`.
- Add public-store upload workflows after the first Chrome Web Store and Edge Add-ons listings exist.

## Later

- Consider migrating to WXT if the extension expands to Firefox/Safari or needs better dev-mode ergonomics.
- Consider a full-stack companion dashboard only if users need cross-device sync, team reporting, or fleet policy management.
- If a backend is added, use explicit opt-in sync and avoid uploading raw prompts/responses by default.
- Add Google sign-in for sync through a web auth bridge with no Gmail scopes.
