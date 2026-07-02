import { chromium } from "playwright";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const extensionPath = resolve("dist");
const userDataDir = await mkdtemp(join(tmpdir(), "ai-water-meter-"));
const executablePath = findSystemBrowser();

const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  executablePath,
  args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`]
});

try {
  const page = await context.newPage();

  await page.route("https://chatgpt.com/*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: `<!doctype html>
        <html>
          <body>
            <main>
              <article data-message-author-role="user">Explain water usage for AI prompts.</article>
              <article data-message-author-role="assistant">${"A".repeat(2200)}</article>
            </main>
          </body>
        </html>`
    });
  });

  await page.goto("https://chatgpt.com/");
  await page.waitForSelector("#ai-water-meter-root", { timeout: 10000 });
  const hasShadowRoot = await page
    .locator("#ai-water-meter-root")
    .evaluate((element) => Boolean(element.shadowRoot));
  if (!hasShadowRoot) {
    throw new Error("AI Water Meter shadow root did not mount.");
  }

  console.log("Extension smoke test passed.");
} finally {
  await context.close();
  await rm(userDataDir, { recursive: true, force: true });
}

function findSystemBrowser() {
  const candidates = [
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
  ];

  return candidates.find((candidate) => existsSync(candidate));
}
