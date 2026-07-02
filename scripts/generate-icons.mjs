import { createWriteStream, mkdirSync } from "node:fs";
import { PNG } from "pngjs";

const sizes = [16, 32, 48, 128];
mkdirSync("public/icons", { recursive: true });

for (const size of sizes) {
  const png = new PNG({ width: size, height: size });
  const center = (size - 1) / 2;
  const radius = size * 0.43;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (size * y + x) << 2;
      const distance = Math.hypot(x - center, y - center);
      const inside = distance <= radius;
      const shade = Math.max(0, 1 - distance / radius);

      png.data[index] = inside ? Math.round(8 + shade * 28) : 0;
      png.data[index + 1] = inside ? Math.round(94 + shade * 120) : 0;
      png.data[index + 2] = inside ? Math.round(88 + shade * 125) : 0;
      png.data[index + 3] = inside ? 255 : 0;
    }
  }

  drawDrop(png, size);
  await writePng(png, `public/icons/icon-${size}.png`);
}

function drawDrop(png, size) {
  const center = (size - 1) / 2;
  const top = size * 0.2;
  const bottom = size * 0.75;
  const maxWidth = size * 0.22;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const vertical = (y - top) / (bottom - top);
      if (vertical < 0 || vertical > 1) {
        continue;
      }

      const taper = vertical < 0.35 ? vertical / 0.35 : Math.sin((1 - vertical) * Math.PI * 0.72);
      const width = Math.max(1.2, maxWidth * taper);
      if (Math.abs(x - center) > width || y > bottom) {
        continue;
      }

      const index = (size * y + x) << 2;
      png.data[index] = 240;
      png.data[index + 1] = 255;
      png.data[index + 2] = 252;
      png.data[index + 3] = 245;
    }
  }
}

function writePng(png, path) {
  return new Promise((resolve, reject) => {
    const stream = png.pack().pipe(createWriteStream(path));
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}
