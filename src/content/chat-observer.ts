import { estimateUsage, sumEstimates, type UsageEstimate } from "../estimator/estimate";
import type { ChatPageProfile } from "./page-detectors";

export type SessionSnapshot = {
  promptCount: number;
  provider: string;
  responseCharCount: number;
  turnCount: number;
  lastEstimate?: UsageEstimate;
  totalEstimate: UsageEstimate;
  isStreaming: boolean;
  latencyMs?: number;
  throughputTps?: number;
};

export type SnapshotListener = (snapshot: SessionSnapshot) => void | Promise<void>;

export function createChatObserver(
  profile: ChatPageProfile,
  listener: SnapshotListener
): MutationObserver {
  const initialChat = collectChat(profile);
  let lastPromptCount = initialChat.promptCount;
  let lastResponseCharCount = initialChat.responseCharCount;
  let lastFingerprint = "";
  let throttleTimer: number | undefined;
  let debounceTimer: number | undefined;
  let startTime = 0;
  let firstChunkTime = 0;

  const emit = (streaming: boolean) => {
    const chat = collectChat(profile);
    const fingerprint = [
      chat.promptCount,
      chat.responseCharCount,
      ...chat.turns.map((turn) => `${turn.promptText.length}:${turn.responseText.length}`)
    ].join("|");

    if (fingerprint === lastFingerprint && !streaming) {
      return;
    }

    lastFingerprint = fingerprint;
    const estimates = chat.turns.map((turn) => estimateUsage(turn));

    const now = Date.now();
    const latency = firstChunkTime > 0 ? firstChunkTime - startTime : undefined;
    const lastEst = estimates.at(-1);

    // Calculate running throughput (tokens/sec) based on elapsed generation time
    const activeTimeSec = startTime > 0 ? (now - startTime) / 1000 : 0;
    const outputTokens = lastEst ? lastEst.outputTokens : 0;
    const throughput = activeTimeSec > 0.2 ? outputTokens / activeTimeSec : undefined;

    listener({
      promptCount: chat.promptCount,
      provider: profile.provider,
      responseCharCount: chat.responseCharCount,
      turnCount: chat.turns.length,
      lastEstimate: lastEst,
      totalEstimate: sumEstimates(estimates),
      isStreaming: streaming,
      latencyMs: latency,
      throughputTps: throughput ? Math.round(throughput * 10) / 10 : undefined
    });
  };

  const handleMutation = () => {
    const chat = collectChat(profile);

    if (chat.promptCount > lastPromptCount) {
      startTime = Date.now();
      firstChunkTime = 0;
      lastPromptCount = chat.promptCount;
    }

    if (chat.responseCharCount > lastResponseCharCount) {
      if (firstChunkTime === 0) {
        firstChunkTime = Date.now();
      }
      lastResponseCharCount = chat.responseCharCount;
    }

    if (!throttleTimer) {
      throttleTimer = window.setInterval(() => {
        emit(true);
      }, 150);
    }

    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      window.clearInterval(throttleTimer);
      throttleTimer = undefined;
      emit(false);

      // Reset timers for the next chat turn
      startTime = 0;
      firstChunkTime = 0;
      const endChat = collectChat(profile);
      lastPromptCount = endChat.promptCount;
      lastResponseCharCount = endChat.responseCharCount;
    }, 1000);
  };

  const observer = new MutationObserver(handleMutation);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });

  emit(false);
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
