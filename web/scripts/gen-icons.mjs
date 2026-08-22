// Generates PWA icons (192/512 + maskable + apple-touch) from the brand SVG.
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

const svg = fs.readFileSync(path.join(__dirname, '..', 'public', 'favicon.svg'), 'utf8');

// Maskable: add safe-zone padding by drawing the gradient square smaller.
const maskableSvg = svg.replace(
  '<rect width="64" height="64" rx="16" fill="url(#g)"/>',
  '<rect width="64" height="64" fill="#0a0b0f"/><rect x="10" y="10" width="44" height="44" rx="14" fill="url(#g)"/>',
);

const jobs = [
  ['icon-192.png', 192, svg],
  ['icon-512.png', 512, svg],
  ['maskable-512.png', 512, maskableSvg],
  ['apple-touch-icon.png', 180, svg],
];

for (const [name, size, source] of jobs) {
  await sharp(Buffer.from(source)).resize(size, size).png().toFile(path.join(outDir, name));
  console.log(`generated ${name}`);
}
