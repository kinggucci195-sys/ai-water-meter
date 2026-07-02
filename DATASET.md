# Data And Assumptions

AI Water Meter does not use a private dataset or provider telemetry feed. The product is a local estimator: it reads visible chat text, estimates token volume, applies published coefficients, and stores only derived aggregates.

## Runtime Data

At runtime, the extension uses only:

- Visible chat text on the current supported AI chat page.
- Publicly documented estimation coefficients.
- Local extension storage for derived daily and monthly totals.

It does not send prompts, responses, estimates, browsing history, account identifiers, or page URLs to a server.

## Default Coefficients

| Field                          |                          Default |
| ------------------------------ | -------------------------------: |
| Energy per 500 output tokens   |                        `0.30 Wh` |
| Input token weight             |                           `0.25` |
| Direct cooling water intensity |                      `1.0 L/kWh` |
| Indirect grid water intensity  |                     `4.52 L/kWh` |
| Carbon intensity               |                  `350 gCO2e/kWh` |
| Token approximation            | 1 token per 4 visible characters |

The default sits near the publicly reported range for typical text prompts, but it is intentionally presented with uncertainty ranges because provider, model, hardware, region, batching, and cooling conditions vary.

## Coefficient Provenance

| Coefficient                    |       Default | Primary basis                                                                                        | Scope date               | Caveat                                                                                        |
| ------------------------------ | ------------: | ---------------------------------------------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------- |
| Energy per 500 output tokens   |     `0.30 Wh` | Epoch AI GPT-4o estimate; Google/OpenAI/Microsoft text-query disclosures cluster near `0.24-0.34 Wh` | 2025-2026 public sources | The extension cannot know the exact model, cache hit, batch size, or hardware.                |
| Input token weight             |        `0.25` | Conservative product assumption                                                                      | Internal v0.1            | Prompt/context tokens are not free, but visible outputs usually dominate short chat cost.     |
| Direct cooling water intensity |   `1.0 L/kWh` | AI water-consumption literature and public WUE-style accounting                                      | Research baseline        | Actual on-site water can be much lower or higher by region, cooling type, and weather.        |
| Indirect grid water intensity  |  `4.52 L/kWh` | U.S. electricity-generation water-consumption factors used as an optional upstream boundary          | U.S. grid baseline       | Not all footprint studies include upstream electricity water.                                 |
| Carbon intensity               |   `350 g/kWh` | Location-based grid-carbon approximation from public grid summaries                                  | U.S. baseline            | Provider-specific renewable procurement and regional grid mix are not known to the extension. |
| Token approximation            | 4 chars/token | Common transparent approximation for English text                                                    | Internal v0.1            | Real tokenizers vary by language, model family, code, whitespace, and symbols.                |

## Current Research Anchors

| Source                         | Query definition                      | Energy                                       | Water                           | Carbon            | Notes                                                                                      |
| ------------------------------ | ------------------------------------- | -------------------------------------------- | ------------------------------- | ----------------- | ------------------------------------------------------------------------------------------ |
| Google Gemini Apps             | Median text prompt, May 2025          | `0.24 Wh`                                    | `0.26 mL`                       | `0.03 gCO2e`      | First-party production estimate; energy measured, water/carbon derived from fleet factors. |
| OpenAI public disclosure       | Average ChatGPT query                 | `0.34 Wh`                                    | `0.000085 gal`, about `0.32 mL` | Not disclosed     | Public executive disclosure; no detailed public methodology.                               |
| Microsoft / Joule 2026         | Typical production LLM query          | `0.16-0.60 Wh`                               | `0-0.067 mL`                    | Not per query     | Peer-reviewed/system-model estimate for inference efficiency and test-time scaling.        |
| Microsoft frontier-scale range | Models above 200B parameters          | Median `0.34 Wh`, IQR `0.18-0.67 Wh`         | Not primary focus               | Not primary focus | Useful independent bound for large production models.                                      |
| Reasoning/test-time scaling    | Longer reasoning query                | Around `4.32 Wh` median in reported scenario | Not primary focus               | Not primary focus | Agentic and reasoning-heavy tasks can cost far more than short text prompts.               |
| Mistral Large 2 / Le Chat      | 400-token response lifecycle estimate | Not disclosed                                | `45 mL`                         | `1.14 gCO2e`      | Broader lifecycle boundary than operational-only estimates.                                |
| Epoch AI                       | Typical GPT-4o style query            | About `0.3 Wh`                               | Not estimated                   | Not estimated     | Independent energy estimate, close to the first-party text-query range.                    |

## What Is Measured vs Estimated

Only AI providers can directly measure production inference details such as accelerator energy, host overhead, model routing, cache hits, batch size, data-center PUE/WUE, and local cooling behavior. Even then, water and carbon are partly accounting choices because upstream electricity generation, market-based electricity claims, and hardware lifecycle boundaries can be included or excluded.

The extension estimates:

- Token volume from visible characters.
- Energy from weighted token volume.
- Direct water from energy and cooling-water intensity.
- Indirect grid water from energy and electricity-generation water intensity.
- Carbon from energy and a location-based carbon factor.

## Interpretation

The number shown by the extension means:

> Approximately how much operational water, energy, and carbon this visible AI chat may represent under the selected assumptions.

It does not mean:

> The exact provider-measured value for this prompt.

## Source Links

- Google Gemini inference impact: https://cloud.google.com/blog/products/infrastructure/measuring-the-environmental-impact-of-ai-inference
- Google technical paper: https://arxiv.org/abs/2508.15734
- OpenAI public disclosure: https://blog.samaltman.com/the-gentle-singularity
- Microsoft/Joule AI inference energy paper: https://www.microsoft.com/en-us/research/publication/energy-use-of-ai-inference-efficiency-pathways-and-test-time-scaling/
- Mistral lifecycle assessment: https://mistral.ai/news/our-contribution-to-a-global-environmental-standard-for-ai/
- Epoch AI ChatGPT energy estimate: https://epoch.ai/gradient-updates/how-much-energy-does-chatgpt-use
- AI water consumption research: https://arxiv.org/abs/2304.03271
- Hugging Face AI Energy Score methodology: https://huggingface.github.io/AIEnergyScore/
