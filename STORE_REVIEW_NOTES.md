# Store Review Notes

## Purpose

AI Water Meter estimates the local operational water, energy, and carbon impact of visible AI chat sessions.

## Permission Justification

- `storage`: saves local daily estimate totals and extension preferences.
- `https://chatgpt.com/*` and `https://chat.openai.com/*`: injects the local estimator UI on ChatGPT.
- `https://claude.ai/*`: injects the local estimator UI on Claude.
- `https://gemini.google.com/*`: injects the local estimator UI on Gemini.
- `https://www.perplexity.ai/*`: injects the local estimator UI on Perplexity.
- `https://poe.com/*`: injects the local estimator UI on Poe.

## Data Handling

The extension reads visible chat page text locally in the browser to estimate token volume. It stores only derived daily and monthly totals in extension storage. It does not store prompt text or response text.

## Remote Code

No remote code is loaded or executed. All logic is bundled into the extension package.

## Reviewer Test Steps

1. Load the unpacked `dist/` extension in Chrome or Edge.
2. Open a supported AI chat site.
3. Send or view a chat response.
4. Confirm the floating meter appears and shows estimated water, energy, carbon, turn count, daily totals, monthly totals, and the 3D water droplet.
5. Open the extension popup to confirm daily and monthly totals.
6. Open the options page to review methodology notes.

## Public Distribution

Unpacked `dist/` loading is only for local development and reviewer testing. Normal users should install the approved package from the Chrome Web Store or Microsoft Edge Add-ons. See `PUBLIC_RELEASE.md`.
