import { useEffect, useState } from "react";
import { formatCarbon, formatMilliliters, formatWh } from "../estimator/format";
import {
  getDailyUsage,
  getMonthlyUsage,
  type DailyUsageRecord,
  type MonthlyUsageRecord
} from "../storage";

type PopupUsage = {
  daily?: DailyUsageRecord;
  monthly: MonthlyUsageRecord;
};

/**
 * Browser action popup summary for the user's local daily estimates.
 */
export function PopupApp() {
  const [usage, setUsage] = useState<PopupUsage | undefined>();

  useEffect(() => {
    void Promise.all([getDailyUsage(), getMonthlyUsage()]).then(([daily, monthly]) => {
      setUsage({ daily, monthly });
    });
  }, []);

  return (
    <main>
      <span>AI Water Meter</span>
      <h1>{usage?.daily ? formatMilliliters(usage.daily.totalWaterMl) : "0 mL"}</h1>
      <p>Today, estimated locally from visible chat text. Not provider telemetry.</p>
      <dl className="summary">
        <div>
          <dt>This month</dt>
          <dd>{usage ? formatMilliliters(usage.monthly.totalWaterMl) : "0 mL"}</dd>
        </div>
        <div>
          <dt>Energy today</dt>
          <dd>{usage?.daily ? formatWh(usage.daily.energyWh) : "0 Wh"}</dd>
        </div>
        <div>
          <dt>Carbon today</dt>
          <dd>{usage?.daily ? formatCarbon(usage.daily.carbonGrams) : "0 g CO2e"}</dd>
        </div>
        <div>
          <dt>Active days</dt>
          <dd>{usage ? usage.monthly.days : 0}</dd>
        </div>
      </dl>
      <button type="button" onClick={() => chrome.runtime.openOptionsPage()}>
        Methodology
      </button>
    </main>
  );
}
