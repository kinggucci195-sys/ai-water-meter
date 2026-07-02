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
    const canvas = host?.shadowRoot?.querySelector(".droplet-scene canvas");
    return Boolean(canvas);
  });
  await page.waitForTimeout(500);

  const result = await page.locator("#ai-water-meter-root").evaluate(
    (element, viewport) => {
      const shadow = element.shadowRoot;
      const canvas = shadow?.querySelector(".droplet-scene canvas");
      if (!(canvas instanceof HTMLCanvasElement)) {
        return { ok: false, reason: "Droplet canvas did not mount." };
      }

      const rect = canvas.getBoundingClientRect();
      const insideViewport =
        rect.left >= 0 &&
        rect.top >= 0 &&
        rect.right <= viewport.width &&
        rect.bottom <= viewport.height;
      if (!insideViewport) {
        return { ok: false, reason: "Droplet canvas is outside the viewport." };
      }

      const samplePoints = [
        [0.5, 0.5],
        [0.45, 0.45],
        [0.55, 0.45],
        [0.5, 0.35],
        [0.5, 0.65]
      ];

      const probe = document.createElement("canvas");
      probe.width = canvas.width;
      probe.height = canvas.height;
      const probeContext = probe.getContext("2d");
      if (!probeContext) {
        return { ok: false, reason: "Could not create a probe canvas." };
      }

      probeContext.drawImage(canvas, 0, 0);
      const probeNonBlank = samplePoints.some(([xRatio, yRatio]) => {
        const x = Math.floor(probe.width * xRatio);
        const y = Math.floor(probe.height * yRatio);
        const pixel = probeContext.getImageData(x, y, 1, 1).data;
        return pixel[3] > 0 && (pixel[0] > 0 || pixel[1] > 0 || pixel[2] > 0);
      });

      if (probeNonBlank) {
        return { ok: true };
      }

      const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
      if (!gl) {
        return { ok: false, reason: "Droplet canvas does not have a WebGL context." };
      }

      const pixel = new Uint8Array(4);
      const nonBlank = samplePoints.some(([xRatio, yRatio]) => {
        const x = Math.floor(canvas.width * xRatio);
        const y = Math.floor(canvas.height * yRatio);
        gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        return pixel[3] > 0 && (pixel[0] > 0 || pixel[1] > 0 || pixel[2] > 0);
      });

      return nonBlank
        ? { ok: true }
        : { ok: false, reason: "Droplet WebGL canvas rendered blank pixels." };
    },
    { width, height }
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
