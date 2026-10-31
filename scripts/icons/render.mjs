// Render the icon PNGs and /favicon.ico from the outlined SVGs in docs/assets/images.
// Run through scripts/icons/build.sh, not directly.
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const IMAGES = join(ROOT, 'docs', 'assets', 'images');

const jobs = [
  ['favicon.svg', 'favicon-16.png', 16],
  ['favicon.svg', 'favicon-32.png', 32],
  ['favicon.svg', 'favicon-192.png', 192],
  ['favicon.svg', 'favicon-512.png', 512],
  ['apple-touch-icon.svg', 'apple-touch-icon.png', 180],
  ['icon-maskable.svg', 'icon-maskable-512.png', 512],
];

for (const [svg, png, size] of jobs) {
  // The SVGs are small viewBoxes; rasterise at a density that lands on the target size, not above.
  await sharp(readFileSync(join(IMAGES, svg)), { density: Math.max(72, (72 * size) / 32) })
    .resize(size, size)
    .png({ palette: true, compressionLevel: 9 })
    .toFile(join(IMAGES, png));
}

await sharp(readFileSync(join(IMAGES, 'og-image.svg')))
  .png({ palette: true, compressionLevel: 9 })
  .toFile(join(IMAGES, 'og-image.png'));

// ICO holding the 16 and 32 PNGs as-is: the form every current browser and feed reader accepts.
const sizes = [16, 32];
const pngs = sizes.map((n) => readFileSync(join(IMAGES, `favicon-${n}.png`)));
const header = Buffer.alloc(6 + 16 * pngs.length);
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(pngs.length, 4);
let offset = header.length;
pngs.forEach((png, i) => {
  const entry = 6 + 16 * i;
  header.writeUInt8(sizes[i], entry);
  header.writeUInt8(sizes[i], entry + 1);
  header.writeUInt16LE(1, entry + 4); // colour planes
  header.writeUInt16LE(32, entry + 6); // bits per pixel
  header.writeUInt32LE(png.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += png.length;
});
writeFileSync(join(ROOT, 'docs', 'favicon.ico'), Buffer.concat([header, ...pngs]));

console.log(`✓ ${jobs.length} PNGs, og-image and favicon.ico`);
