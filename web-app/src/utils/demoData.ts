import type { DailyUsageData } from "../types";
import { toLocalYMD } from "./formatters";

export function generateDemoUsage(): DailyUsageData[] {
  const data: DailyUsageData[] = [];
  const today = new Date();
  // Generate last 168 days (24 weeks) of activity with some realistic gaps
  for (let i = 167; i >= 0; i--) {
    if (Math.random() < 0.25) continue; // 25% gaps

    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = toLocalYMD(date);

    const promptCount = Math.floor(Math.random() * 8) + 1;
    const inputTokens = promptCount * (Math.floor(Math.random() * 400) + 100);
    const outputTokens = promptCount * (Math.floor(Math.random() * 800) + 200);
    const weightedTokens = outputTokens + inputTokens * 0.5;
    const energyWh = (weightedTokens / 500) * 0.3;
    const waterMl = energyWh * 5.52;
    const carbonG = (energyWh / 1000) * 350;

    data.push({
      usage_date: dateStr,
      input_tokens_est: inputTokens,
      output_tokens_est: outputTokens,
      energy_wh: Number(energyWh.toFixed(2)),
      water_ml_mid: Math.round(waterMl),
      carbon_g: Number(carbonG.toFixed(2)),
      site: Math.random() > 0.5 ? "ChatGPT" : "Claude"
    });
  }
  return data;
}
