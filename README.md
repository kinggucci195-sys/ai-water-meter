# AI Water Meter

AI Water Meter is a Chrome/Edge Manifest V3 extension that estimates the operational water, energy, and carbon footprint of AI chat sessions on ChatGPT, Claude, Gemini, Perplexity, and Poe.

It does not claim exact provider telemetry. Providers do not expose exact per-prompt water consumption, so the extension estimates locally from visible prompt/response text, published assumptions, and clearly labeled uncertainty ranges.

## What It Shows

- Estimated direct cooling water.
- Optional indirect grid-electricity water.
- Estimated energy.
- Estimated location-based carbon.
- Session and daily totals.
- The active methodology and assumptions in the options page.

## Default Method

The default text-chat profile uses:

- `0.30 Wh` per 500 output tokens.
- `1.0 L/kWh` direct data-center cooling water intensity.
- `4.52 L/kWh` indirect U.S. grid-electricity water intensity.
- `350 gCO2e/kWh` U.S. location-based carbon intensity.
- Rough token estimate of one token per four visible characters.

Sources and context:

- Epoch AI estimate for ChatGPT energy use: https://epoch.ai/gradient-updates/how-much-energy-does-chatgpt-use
- Google Gemini inference impact paper/blog: https://arxiv.org/abs/2508.15734 and https://cloud.google.com/blog/products/infrastructure/measuring-the-environmental-impact-of-ai-inference
- Shaolei Ren et al. AI water paper: https://arxiv.org/abs/2304.03271
- LBNL U.S. data-center energy report: https://eta.lbl.gov/publications/2024-lbnl-data-center-energy-usage-report
- EPA eGRID summary data: https://www.epa.gov/egrid/summary-data

## Development

```bash
npm install
npm run ci
npm run smoke
```

Load `dist/` as an unpacked extension in Chrome or Edge after `npm run build`.

## Privacy

The extension processes visible page text locally in the browser. It does not send prompts, responses, or estimates to any server.

See [PRIVACY.md](./PRIVACY.md) for the store-facing data disclosure.

## Store Readiness

The build generates PNG icons, validates manifest references, checks for remote-code patterns, and creates a deterministic zip at `release/ai-water-meter-0.1.0.zip`.

## Project Docs

- [Architecture](./ARCHITECTURE.md)
- [Data and assumptions](./DATASET.md)
- [Branching and promotion](./BRANCHING.md)
- [Store review notes](./STORE_REVIEW_NOTES.md)
- [Roadmap](./ROADMAP.md)
