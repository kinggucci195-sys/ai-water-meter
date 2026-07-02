# Architecture

AI Water Meter is a local-first Manifest V3 browser extension.

## Runtime Pieces

- `src/content/main.ts`: content-script controller that runs on supported AI chat pages.
- `src/content/page-detectors.ts`: provider detection and DOM selectors for ChatGPT, Claude, Gemini, Perplexity, and Poe.
- `src/content/chat-observer.ts`: debounced `MutationObserver` that reads visible chat text and emits session snapshots.
- `src/content/sidebar.tsx`: React 19 Shadow DOM sidebar UI.
- `src/content/droplet-scene.tsx`: Three.js local mascot scene with prompt/output reaction states.
- `src/popup/`: React popup for daily totals.
- `src/options/`: React methodology page.
- `src/background/service-worker.ts`: MV3 service worker for install defaults and serialized usage writes.
- `src/estimator/`: pure estimator math and formatting.
- `src/storage.ts`: local daily and monthly aggregate storage via `chrome.storage.local`.
- `src/storage-messages.ts`: typed content-script to service-worker message contract for aggregate writes.

## Data Flow

```text
Supported AI chat page
  -> content script observes visible user/assistant message blocks
  -> local token approximation estimates visible text volume
  -> estimator converts tokens into energy, water, and carbon ranges
  -> sidebar renders current session estimates and mascot reaction state
  -> content script sends usage deltas to the service worker
  -> service worker serializes aggregate writes to local storage
  -> popup reads daily and monthly totals from local extension storage
```

Sign-in and leaderboard buttons currently open allowlisted hosted app routes through the service worker:

- `https://app.aiwatermeter.com/auth/extension/start`
- `https://app.aiwatermeter.com/leaderboard`

They do not upload data until the backend, OAuth flow, privacy policy, and explicit user opt-in are implemented.

## Data Boundaries

The extension reads visible chat text in the browser so it can estimate token volume. It does not persist prompt text or response text. It stores only derived aggregate values such as estimated tokens, watt-hours, water milliliters, and grams CO2e.

No remote analytics, remote model calls, CDN scripts, or remotely hosted executable code are used.

## Estimator Methodology

The current default is a transparent public-assumption model, not provider telemetry:

- `0.30 Wh` per 500 output tokens.
- Input tokens weighted at `0.25` of output tokens.
- `1.0 L/kWh` direct data-center cooling water intensity.
- `4.52 L/kWh` indirect grid-electricity water intensity.
- `350 gCO2e/kWh` U.S. location-based carbon intensity.
- Approximate tokenization: one token per four visible characters.

Sources are listed in `README.md`; the methodology is exposed in the options page.

## Accuracy Safeguards

- Existing visible chat history is treated as baseline on page load.
- Daily totals only add newly observed deltas after baseline.
- Snapshot persistence is serialized to avoid duplicate deltas during streamed responses.
- Aggregate writes are routed through the service worker to reduce cross-tab read-modify-write races.
- Results are shown as estimates with uncertainty ranges.

## Build Shape

Vite builds extension pages and the background worker. A dedicated esbuild step rewrites the static content script as a single import-free IIFE because Manifest V3 static content scripts cannot rely on ESM imports.

The package validator checks:

- Manifest references resolve.
- Required icons exist.
- Source maps are not packaged.
- Static content scripts do not contain top-level `import` or `export`.
- Broad optional host permissions are not present.
- Remote-code-like patterns are not present.
