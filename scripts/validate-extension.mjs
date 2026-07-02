import { existsSync, readFileSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const distDir = "dist";
const manifestPath = join(distDir, "manifest.json");
const errors = [];

if (!existsSync(manifestPath)) {
  errors.push("dist/manifest.json is missing. Run npm run build first.");
} else {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  checkManifest(manifest);
  await checkNoRemoteCodePatterns(distDir);
  checkStaticContentScripts(manifest);
}

function checkStaticContentScripts(manifest) {
  for (const script of manifest.content_scripts ?? []) {
    for (const file of script.js ?? []) {
      const content = readFileSync(join(distDir, file), "utf8");
      if (/^\s*import\s/m.test(content) || /^\s*export\s/m.test(content)) {
        errors.push(`Static content script must be bundled without ESM import/export: ${file}`);
      }
    }
  }
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log("Extension package validation passed.");

function checkManifest(manifest) {
  if (manifest.manifest_version !== 3) {
    errors.push("manifest_version must be 3.");
  }

  const requiredPaths = [
    manifest.background?.service_worker,
    manifest.action?.default_popup,
    manifest.options_page,
    ...Object.values(manifest.icons ?? {}),
    ...Object.values(manifest.action?.default_icon ?? {})
  ].filter(Boolean);

  for (const script of manifest.content_scripts ?? []) {
    requiredPaths.push(...(script.js ?? []), ...(script.css ?? []));
  }

  for (const path of requiredPaths) {
    if (!existsSync(join(distDir, path))) {
      errors.push(`Manifest references missing file: ${path}`);
    }
  }

  if (manifest.host_permissions?.includes("<all_urls>")) {
    errors.push("Do not request <all_urls> as a default host permission.");
  }

  if (manifest.optional_host_permissions?.length) {
    errors.push("Optional host permissions must be backed by an explicit opt-in flow.");
  }
}

async function checkNoRemoteCodePatterns(directory) {
  for (const entry of await readdir(directory)) {
    const path = join(directory, entry);
    const entryStat = await stat(path);

    if (entryStat.isDirectory()) {
      await checkNoRemoteCodePatterns(path);
      continue;
    }

    if (path.endsWith(".map")) {
      errors.push(`Source map should not be packaged: ${path}`);
      continue;
    }

    if (!/\.(js|html|json|css)$/.test(path)) {
      continue;
    }

    const content = await readFile(path, "utf8");
    if (/https:\/\/[^"'\s]+\.js\b/.test(content) || /eval\s*\(/.test(content)) {
      errors.push(`Remote-code-like pattern found in ${path}`);
    }
  }
}
