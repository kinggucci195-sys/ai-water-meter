import { estimateUsage, sumEstimates, type UsageEstimate } from "../estimator/estimate";
import type { ChatPageProfile } from "./page-detectors";

export type SessionSnapshot = {
  promptCount: number;
  provider: string;
  responseCharCount: number;
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
    const chat = collectChat(profile);
    const fingerprint = [
      chat.promptCount,
      chat.responseCharCount,
      ...chat.turns.map((turn) => `${turn.promptText.length}:${turn.responseText.length}`)
    ].join("|");
    if (fingerprint === lastFingerprint) {
      return;
    }

    lastFingerprint = fingerprint;
    const estimates = chat.turns.map((turn) => estimateUsage(turn));
    listener({
      promptCount: chat.promptCount,
      provider: profile.provider,
      responseCharCount: chat.responseCharCount,
      turnCount: chat.turns.length,
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

function collectChat(profile: ChatPageProfile): {
  promptCount: number;
  responseCharCount: number;
  turns: Array<{ promptText: string; responseText: string }>;
} {
  const assistantBlocks = getTextBlocks(profile.assistantSelectors);
  const userBlocks = getTextBlocks(profile.userSelectors);

  if (!assistantBlocks.length) {
    const turns = inferGenericTurns();
    return {
      promptCount: 0,
      responseCharCount: turns.reduce((sum, turn) => sum + turn.responseText.length, 0),
      turns
    };
  }

  const turns = assistantBlocks.map((responseText, index) => ({
    promptText: userBlocks[index] ?? userBlocks.at(-1) ?? "",
    responseText
  }));

  return {
    promptCount: userBlocks.length,
    responseCharCount: assistantBlocks.reduce((sum, text) => sum + text.length, 0),
    turns
  };
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
