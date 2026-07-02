export type MascotState =
  | "idle"
  | "baseline"
  | "new_prompt"
  | "streaming_output"
  | "updated"
  | "long_or_heavy"
  | "uncertain"
  | "reset"
  | "error";

export const HEAVY_OUTPUT_TOKEN_THRESHOLD = 1200;
