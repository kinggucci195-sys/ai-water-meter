export interface LeaderboardEntry {
  badge: string;
  confidence: "low" | "medium" | "high";
  display_name: string;
  rank: number;
  score: number;
  water_saved_ml_estimate: number;
}

export interface DailyUsageData {
  usage_date: string;
  input_tokens_est: number;
  output_tokens_est: number;
  energy_wh: number;
  water_ml_mid: number;
  carbon_g: number;
  site: string;
}
