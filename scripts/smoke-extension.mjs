/* global HTMLCanvasElement, document */
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
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--use-gl=swiftshader"
  ]
});

try {
  const page = await context.newPage();
  
  page.on("console", (msg) => {
    console.log(`[PAGE LOG] [${msg.type()}] ${msg.text()}`);
  });
  page.on("pageerror", (err) => {
    console.error(`[PAGE ERROR] ${err.stack || err.message}`);
  });

  await page.route("https://chatgpt.com/*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: `<!doctype html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
          </head>
          <body>
            <main>
              <article data-message-author-role="user">Explain water usage for AI prompts.</article>
              <article data-message-author-role="assistant">${"A".repeat(2200)}</article>
            </main>
          </body>
        </html>`
    });
  });

  await verifyExtensionAtViewport(page, 1366, 900);
  await verifyExtensionAtViewport(page, 390, 844);

  console.log("Extension smoke test passed.");
} finally {
  await context.close();
  await rm(userDataDir, { recursive: true, force: true });
}

async function verifyExtensionAtViewport(page, width, height) {
  await page.setViewportSize({ width, height });
  await page.goto("https://chatgpt.com/");
  await page.waitForSelector("#ai-water-meter-root", { timeout: 10000 });
  await page.waitForFunction(() => {
    const host = document.querySelector("#ai-water-meter-root");
    const img = host?.shadowRoot?.querySelector(".droplet-scene img");
    return Boolean(img);
  });
  await page.waitForTimeout(500);

  const result = await page.locator("#ai-water-meter-root").evaluate(
    (element) => {
      const shadow = element.shadowRoot;
      const img = shadow?.querySelector(".droplet-scene img");
      if (!(img instanceof HTMLImageElement)) {
        return { ok: false, reason: "Droplet image did not mount." };
      }

      const hasSrc = Boolean(img.src);
      if (!hasSrc) {
        return { ok: false, reason: "Droplet image does not have a src attribute." };
      }

      return { ok: true };
    }
  );

  if (!result.ok) {
    throw new Error(`${result.reason} Viewport: ${width}x${height}`);
  }
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
