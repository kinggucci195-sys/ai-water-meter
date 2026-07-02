# Data And Assumptions

AI Water Meter does not use a private dataset or provider telemetry feed.

## What The Extension Uses At Runtime

At runtime, it uses only:

- Visible chat text on the current supported AI chat page.
- Publicly documented estimation coefficients.
- Local browser extension storage for derived daily totals.

It does not send prompts, responses, estimates, browsing history, or identifiers to a server.

## Default Coefficients

| Field                          |                          Default |
| ------------------------------ | -------------------------------: |
| Energy per 500 output tokens   |                        `0.30 Wh` |
| Input token weight             |                           `0.25` |
| Direct cooling water intensity |                      `1.0 L/kWh` |
| Indirect grid water intensity  |                     `4.52 L/kWh` |
| Carbon intensity               |                  `350 gCO2e/kWh` |
| Token approximation            | 1 token per 4 visible characters |

## Source Basis

The coefficients are based on public research and disclosures, including:

- Epoch AI estimates for ChatGPT-like text inference energy.
- Google Gemini inference impact reporting.
- Li/Ren AI water-consumption research.
- LBNL U.S. data-center energy reporting.
- EPA eGRID summary factors.

## What This Means

The number shown by the extension is a local estimate. It should be interpreted as “approximately how much operational water/energy/carbon this visible AI chat may represent under the selected assumptions,” not “the exact provider-measured value for this prompt.”

Exact usage varies by model, prompt length, response length, context window, hardware, batching, data-center location, weather, PUE/WUE, and carbon accounting method.
