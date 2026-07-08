import { copyFile } from "node:fs/promises";
import { build } from "esbuild";

await build({
  entryPoints: ["src/content/main.ts"],
  outfile: "dist/assets/content.js",
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "chrome120",
  minify: true,
  sourcemap: false,
  legalComments: "none",
  logLevel: "info"
});

await build({
  entryPoints: ["src/content/auth-bridge.ts"],
  outfile: "dist/assets/auth-bridge.js",
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "chrome120",
  minify: true,
  sourcemap: false,
  legalComments: "none",
  logLevel: "info"
});

await copyFile("src/content/content.css", "dist/assets/content.css");

