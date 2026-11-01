// Regenerates the PNG app icons from app/icon.svg (the cardinal mark).
// Requires sharp:  npm i sharp --no-save   (then)   node scripts/build-icons.mjs
//
// Outputs:
//   app/apple-icon.png                 180x180  (iOS home-screen / apple-touch-icon)
//   public/icons/icon-192.png          192x192  (PWA manifest, purpose "any")
//   public/icons/icon-512.png          512x512  (PWA manifest, purpose "any")
//   public/icons/icon-maskable-192.png 192x192  (PWA manifest, purpose "maskable")
//   public/icons/icon-maskable-512.png 512x512  (PWA manifest, purpose "maskable")
//
// app/icon.svg is the single source: the favicon, the header mark, and every
// PNG come from it. Edit the SVG, then rerun this script.

import sharp from 'sharp';
import { mkdir, readFile } from 'node:fs/promises';

const source = await readFile('app/icon.svg', 'utf8');
const svg = source.replace(/^<!--[\s\S]*?-->\s*/, '');

// Android masks home-screen icons to a circle of 80% diameter. The hammer's
// bell sits in the corner, outside that circle, so the maskable variant draws
// the same artwork at 70% around the centre on a full navy field. The coat
// runs well past the bottom edge in the source, so it still bleeds off here.
const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const field = svg.match(/<rect width="512" height="512" fill="([^"]+)"/)[1];
const maskable = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="${field}"/>
  <g transform="translate(256 256) scale(0.7) translate(-256 -256)">${inner}</g>
</svg>`;

const jobs = [
  [svg, 'app/apple-icon.png', 180],
  [svg, 'public/icons/icon-192.png', 192],
  [svg, 'public/icons/icon-512.png', 512],
  [maskable, 'public/icons/icon-maskable-192.png', 192],
  [maskable, 'public/icons/icon-maskable-512.png', 512],
];

await mkdir('public/icons', { recursive: true });
for (const [art, out, size] of jobs) {
  await sharp(Buffer.from(art), { density: 300 }).resize(size, size).png().toFile(out);
  console.log(`wrote ${out} (${size}x${size})`);
}
