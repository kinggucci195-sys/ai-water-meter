# 💧 AI Water Meter

[![Manifest V3](https://img.shields.io/badge/Extension-Manifest%20V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![CI Status](https://img.shields.io/badge/Build-Passing-success.svg)](#)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](#)
[![Security](https://img.shields.io/badge/Security-Local%20Only-orange.svg)](#)

AI Water Meter is a premium Chrome and Edge browser extension that dynamically estimates the operational **water**, **energy**, and **carbon footprint** of your AI chat sessions in real-time as you browse.

It injects a lightweight, beautifully styled sidebar on popular AI platforms (ChatGPT, Claude, Gemini, Perplexity, and Poe) featuring a cute 2D mascot that wiggles, waves, and changes expressions based on your usage intensity!

---

## ✨ Features

- **Real-Time Sidebar**: Slide-out panel matching the look and feel of ChatGPT and Claude.
- **Cute 2D Mascot**: A wiggling water droplet avatar that reacts to prompt updates, heavy responses, and errors.
- **Detailed Token Breakdown**: Tracks input/output tokens, compute complexity (Weighted Tokens), direct cooling water, indirect grid water, energy, and carbon emissions.
- **Relatable Comparisons**: Translates abstract data into everyday analogies (e.g. _"Equivalent to charging your phone for 42 seconds"_ or _"Equivalent to boiling 15 mL of water"_).
- **Gamified Leaderboards**: Compete with other green AI users on **Daily**, **Weekly**, **Monthly**, or **All-Time** water savings.
- **Dynamic Leaderboards**: Compete with other green AI users on **Daily**, **Weekly**, **Monthly**, or **All-Time** water savings:
  👉 **[https://web-app-woad-rho.vercel.app](https://web-app-woad-rho.vercel.app)**
- **Local-First Privacy**: Estimates are computed entirely in your browser. No prompt text or raw chat telemetry ever leaves your device.

---

## 🚀 Dynamic GitHub Profile README Badge (Trendy Virality)

You can proudly showcase your live sustainability metrics, leaderboard rank, and active daily streak directly on your GitHub Profile README.

1. Sign in to your account at **[https://web-app-woad-rho.vercel.app](https://web-app-woad-rho.vercel.app)**.
2. Go to your **Account Dashboard**.
3. Under the **GitHub Profile Readme Badge** panel, copy your custom Markdown code.
4. Paste it into your profile `README.md` file. It will update automatically in real-time as you sync.

---

## 🔌 Developer Integration (Claude Code & IDEs)

Beyond the browser, you can extend tracking to your CLI and coding workflow:

### 1. Claude Code CLI

To track tokens from the **Claude Code CLI** terminal tool:

- Set up a local proxy pointing to a water-meter port.
- Claude Code local logs are stored in `~/.claude/logs/`. You can query token metrics directly from the log file to sync them with your dashboard.

### 2. VS Code Extension (Automatic Token Tracking)

- Open the companion [VS Code extension](./vscode-extension/README.md).
- **Manual Mode**: Highlight any code block or copied text, open the Command Palette, and select `AI Water Meter: Estimate Selected Text` to compute footprints.
- **Automatic Mode**: The extension runs a background change listener that automatically detects code insertions (like GitHub Copilot suggestions or copy-pasted blocks) exceeding **15 characters** and syncs their footprint to your dashboard in real-time.

---

## 🚀 Setup & Installation

### Chrome / Edge Extension

1. Clone this repository:
   ```bash
   git clone https://github.com/kinggucci195-sys/ai-water-meter.git
   cd ai-water-meter
   ```
2. Install dependencies and compile the extension:
   ```bash
   npm install
   npm run build
   ```
3. Open your browser and navigate to `chrome://extensions/` (or `edge://extensions/`).
4. Toggle **Developer Mode** in the top right to **ON**.
5. Click **Load unpacked** in the top left and select the `dist/` directory inside this project.

### Web Dashboard & Leaderboard

To run the leaderboard and account portal locally:

1. Navigate to the web app directory:
   ```bash
   cd web-app
   npm install
   npm run dev
   ```
2. Open [http://localhost:5173](http://localhost:5173).
3. Connect your own Supabase database by creating a `web-app/.env.local` file with:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

---

## 🔒 Security Hardening

To guarantee maximum user safety, this project enforces the following security boundaries:

- **Zero Raw Data Transmission**: Prompt strings are parsed locally for token counts and discarded instantly.
- **Isolated Token Storage**: Supabase access tokens are stored in private `chrome.storage.local` memory, completely sandboxed from host webpage access.
- **Strict Content Security Policy (CSP)**: Excludes third-party script injection or unverified endpoints.
- **No Broad Permissions**: Scoped strictly to the `storage` permission to prevent unauthorized tab snooping.

---

## 📊 Methodology & Data Sources

We base our operational calculations on published empirical research:

- **Energy Footprints**: [Epoch AI's ChatGPT Energy Analysis](https://epoch.ai/gradient-updates/how-much-energy-does-chatgpt-use)
- **Inference Carbon Intensity**: [Google Gemini Inference Impact paper](https://arxiv.org/abs/2508.15734)
- **Data Center Water Usage**: [Shaolei Ren's AI Water Consumption Study](https://arxiv.org/abs/2304.03271)
- See [DATASET.md](./DATASET.md) for full calculation formulas and constants.

---

## 📄 License

This project is licensed under the MIT License.
