import { ZipFile } from "yazl";
import { createWriteStream, mkdirSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const manifest = JSON.parse(await readFile("public/manifest.json", "utf8"));
const releaseDir = "release";
mkdirSync(releaseDir, { recursive: true });

const outputPath = join(releaseDir, `ai-water-meter-${manifest.version}.zip`);
const output = createWriteStream(outputPath);
const zip = new ZipFile();

zip.outputStream.pipe(output);
await addDirectory("dist");
zip.end();
await new Promise((resolve, reject) => {
  output.on("close", resolve);
  output.on("error", reject);
});

console.log(`Packaged ${outputPath}`);

async function addDirectory(directory) {
  const entries = await readdir(directory);
  entries.sort();

  for (const entry of entries) {
    const path = join(directory, entry);
    const entryStat = await stat(path);

    if (entryStat.isDirectory()) {
      await addDirectory(path);
      continue;
    }

    zip.addFile(path, relative("dist", path).replaceAll("\\", "/"), {
      mtime: new Date("2026-01-01T00:00:00.000Z"),
      mode: 0o100644
    });
  }
}
