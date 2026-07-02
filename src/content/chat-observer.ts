import { estimateUsage, sumEstimates, type UsageEstimate } from "../estimator/estimate";
import type { ChatPageProfile } from "./page-detectors";

export type SessionSnapshot = {
  provider: string;
  turnCount: number;
  lastEstimate?: UsageEstimate;
  totalEstimate: UsageEstimate;
};

export type SnapshotListener = (snapshot: SessionSnapshot) => void | Promise<void>;

export function createChatObserver(
  profile: ChatPageProfile,
  listener: SnapshotListener
): MutationObserver {
  let lastFingerprint = "";
  let timer: number | undefined;

  const emit = () => {
    const turns = collectTurns(profile);
    const fingerprint = turns
      .map((turn) => `${turn.promptText.length}:${turn.responseText.length}`)
      .join("|");
    if (fingerprint === lastFingerprint) {
      return;
    }

    lastFingerprint = fingerprint;
    const estimates = turns.map((turn) => estimateUsage(turn));
    listener({
      provider: profile.provider,
      turnCount: turns.length,
      lastEstimate: estimates.at(-1),
      totalEstimate: sumEstimates(estimates)
    });
  };

  const schedule = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(emit, 700);
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  schedule();
  return observer;
}

function collectTurns(
  profile: ChatPageProfile
): Array<{ promptText: string; responseText: string }> {
  const assistantBlocks = getTextBlocks(profile.assistantSelectors);
  const userBlocks = getTextBlocks(profile.userSelectors);

  if (!assistantBlocks.length) {
    return inferGenericTurns();
  }

  return assistantBlocks.map((responseText, index) => ({
    promptText: userBlocks[index] ?? userBlocks.at(-1) ?? "",
    responseText
  }));
}

function getTextBlocks(selectors: string[]): string[] {
  const seen = new Set<string>();
  const blocks: string[] = [];

  for (const selector of selectors) {
    for (const element of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
      const text = cleanText(element.innerText || element.textContent || "");
      if (text.length >= 8 && !seen.has(text)) {
        seen.add(text);
        blocks.push(text);
      }
    }
  }

  return blocks.slice(-30);
}

function inferGenericTurns(): Array<{ promptText: string; responseText: string }> {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>("main article, main section, [role='article']")
  )
    .map((element) => cleanText(element.innerText || element.textContent || ""))
    .filter((text) => text.length >= 40)
    .slice(-30);

  return candidates.map((responseText) => ({ promptText: "", responseText }));
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
