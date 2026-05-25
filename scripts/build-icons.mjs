// Regenerates the PNG app icons from the line-art brain artwork.
// Requires sharp:  npm i sharp --no-save   (then)   node scripts/build-icons.mjs
//
// Outputs:
//   app/apple-icon.png        180x180  (iOS home-screen / apple-touch-icon)
//   public/icons/icon-192.png 192x192  (PWA manifest, "any maskable")
//   public/icons/icon-512.png 512x512  (PWA manifest, "any maskable")
//
// The SVG favicon (app/icon.svg) is a hand-authored, simplified variant and is
// not generated here. Keep this artwork in sync with it if the mark changes.

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

// Full-bleed square (iOS/Android apply their own corner mask). The brain sits
// well inside the maskable safe zone (10% margin), so corners can be cropped
// without clipping the mark.
// The right half is drawn once and mirrored for the left; the central fissure
// sits on the axis. A bumpy (gyri) outline reads as a brain; a bold "U" and "L"
// (for UofL) sit centered in the left and right hemispheres, mirrored about the
// fissure. Letters are vector strokes (not a font) so they rasterize crisply.
const half = `
  <g stroke="#ffffff" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M256 146
             C280 132 314 134 328 158
             C350 140 384 150 390 180
             C414 186 424 216 408 240
             C424 256 420 288 398 298
             C404 326 380 350 352 348
             C336 364 296 368 270 356
             C264 360 260 360 256 360"/>
  </g>
`;

const svg = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="256" y1="0" x2="256" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#c8102e"/>
      <stop offset="1" stop-color="#7a0a1e"/>
    </linearGradient>
    <radialGradient id="sheen" cx="256" cy="120" r="320" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="512" height="512" fill="url(#bg)"/>
  <rect width="512" height="512" fill="url(#sheen)"/>

  ${half}
  <g transform="matrix(-1,0,0,1,512,0)">${half}</g>

  <path d="M256 146 C248 192 264 226 256 258 C248 292 262 330 256 360"
        stroke="#ffffff" stroke-width="22" stroke-linecap="round" fill="none"/>

  <path d="M140 198 L140 268 Q140 300 172 300 Q204 300 204 268 L204 198"
        stroke="#ffffff" stroke-width="30" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M312 198 L312 300 L368 300"
        stroke="#ffffff" stroke-width="30" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>
`;

const buf = Buffer.from(svg);
const jobs = [
  ['app/apple-icon.png', 180],
  ['public/icons/icon-192.png', 192],
  ['public/icons/icon-512.png', 512],
];

await mkdir('public/icons', { recursive: true });
for (const [out, size] of jobs) {
  await sharp(buf, { density: 300 }).resize(size, size).png().toFile(out);
  console.log(`wrote ${out} (${size}x${size})`);
}
