/**
 * Methodology and disclosure page for store reviewers and users.
 */
export function OptionsApp() {
  return (
    <main>
      <h1>AI Water Meter Methodology</h1>
      <p>
        Estimates are calculated locally from visible chat text. The default profile uses 0.30 Wh
        per 500 output tokens, 1.0 L/kWh direct cooling water, 4.52 L/kWh indirect grid water, and
        350 gCO2e/kWh location-based carbon.
      </p>
      <p>
        Treat results as an approximate operational estimate, not exact provider telemetry. Model,
        hardware, data-center location, weather, batching, and prompt length can change real usage.
      </p>
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
      </ul>
    </main>
  );
}
