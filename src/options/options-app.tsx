/**
 * Methodology and disclosure page for store reviewers and users.
 */
export function OptionsApp() {
  return (
    <main>
      <h1>AI Water Meter Methodology</h1>
      <p>
        Estimates are calculated locally from visible chat text. AI providers do not expose exact
        per-prompt water telemetry to browser extensions, so this product shows source-backed
        estimates and ranges instead of claiming direct measurement.
      </p>
      <p>
        The default profile uses 0.30 Wh per 500 output tokens, 1.0 L/kWh direct cooling water, 4.52
        L/kWh indirect grid water, and 350 gCO2e/kWh location-based carbon. Daily and monthly totals
        store only aggregate estimates in your browser.
      </p>
      <p>
        Treat results as an operational awareness estimate, not exact provider telemetry. Model,
        hardware, data-center location, weather, batching, cached context, and response length can
        change real usage.
      </p>
      <h2>Current research anchors</h2>
      <ul>
        <li>
          Google reported a median Gemini Apps text prompt at 0.24 Wh, 0.26 mL water, and 0.03 gCO2e
          in May 2025.
        </li>
        <li>
          OpenAI's public ChatGPT figure is roughly 0.34 Wh and 0.32 mL water for an average query,
          without a detailed public methodology.
        </li>
        <li>
          Microsoft/Joule estimates typical production LLM queries around 0.16-0.60 Wh, while
          reasoning-heavy or agentic tasks can be several Wh.
        </li>
      </ul>
      <h2>Sources</h2>
      <ul>
        <li>
          <a href="https://epoch.ai/gradient-updates/how-much-energy-does-chatgpt-use">
            Epoch AI energy estimate
          </a>
        </li>
        <li>
          <a href="https://cloud.google.com/blog/products/infrastructure/measuring-the-environmental-impact-of-ai-inference">
            Google Gemini inference impact
          </a>
        </li>
        <li>
          <a href="https://arxiv.org/abs/2304.03271">AI water consumption paper</a>
        </li>
        <li>
          <a href="https://www.microsoft.com/en-us/research/publication/energy-use-of-ai-inference-efficiency-pathways-and-test-time-scaling/">
            Microsoft/Joule AI inference energy paper
          </a>
        </li>
        <li>
          <a href="https://mistral.ai/news/our-contribution-to-a-global-environmental-standard-for-ai/">
            Mistral AI lifecycle assessment
          </a>
        </li>
      </ul>
    </main>
  );
}
