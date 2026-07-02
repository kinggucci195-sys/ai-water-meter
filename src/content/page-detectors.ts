export type ChatPageProfile = {
  provider: string;
  assistantSelectors: string[];
  userSelectors: string[];
};

const profiles: Array<ChatPageProfile & { hostIncludes: string[] }> = [
  {
    provider: "ChatGPT",
    hostIncludes: ["chatgpt.com", "chat.openai.com"],
    assistantSelectors: ['[data-message-author-role="assistant"]'],
    userSelectors: ['[data-message-author-role="user"]']
  },
  {
    provider: "Claude",
    hostIncludes: ["claude.ai"],
    assistantSelectors: [
      '[data-testid*="assistant"]',
      ".font-claude-message",
      '[data-is-streaming="true"]'
    ],
    userSelectors: ['[data-testid*="user"]']
  },
  {
    provider: "Gemini",
    hostIncludes: ["gemini.google.com"],
    assistantSelectors: ["message-content", ".model-response-text", ".response-container"],
    userSelectors: [".query-text", ".user-query-container"]
  },
  {
    provider: "Perplexity",
    hostIncludes: ["perplexity.ai"],
    assistantSelectors: ["main article", '[data-testid*="answer"]'],
    userSelectors: ['[data-testid*="query"]']
  },
  {
    provider: "Poe",
    hostIncludes: ["poe.com"],
    assistantSelectors: ['[class*="Message_bot"]', '[data-complete="true"]'],
    userSelectors: ['[class*="Message_human"]']
  }
];

export function detectProfile(location: Location): ChatPageProfile {
  const host = location.hostname.toLowerCase();
  const profile = profiles.find((candidate) =>
    candidate.hostIncludes.some((fragment) => host.includes(fragment))
  );

  return (
    profile ?? {
      provider: "AI chat",
      assistantSelectors: [
        '[data-role="assistant"]',
        '[data-author="assistant"]',
        '[aria-label*="assistant" i]',
        "article"
      ],
      userSelectors: ['[data-role="user"]', '[data-author="user"]', '[aria-label*="user" i]']
    }
  );
}
