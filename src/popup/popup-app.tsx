import { useEffect, useState } from "react";
import { formatCarbon, formatMilliliters, formatWh } from "../estimator/format";
import { getDailyUsage, type DailyUsageRecord } from "../storage";

/**
 * Browser action popup summary for the user's local daily estimates.
 */
export function PopupApp() {
  const [usage, setUsage] = useState<DailyUsageRecord | undefined>();

  useEffect(() => {
    void getDailyUsage().then(setUsage);
  }, []);

  return (
    <main>
      <span>AI Water Meter</span>
      <h1>{usage ? formatMilliliters(usage.totalWaterMl) : "0 mL"}</h1>
      <dl>
        <div>
          <dt>Energy today</dt>
          <dd>{usage ? formatWh(usage.energyWh) : "0 Wh"}</dd>
        </div>
        <div>
          <dt>Carbon today</dt>
          <dd>{usage ? formatCarbon(usage.carbonGrams) : "0 g CO2e"}</dd>
        </div>
      </dl>
      <button type="button" onClick={() => chrome.runtime.openOptionsPage()}>
        Methodology
      </button>
    </main>
  );
}
