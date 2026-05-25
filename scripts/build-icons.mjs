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
// sits on the axis. A bumpy (gyri) outline + curls contained within each
// hemisphere read clearly as a brain rather than a globe.
const half = `
  <g stroke="#f1f5f9" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M256 146
             C280 132 314 134 328 158
             C350 140 384 150 390 180
             C414 186 424 216 408 240
             C424 256 420 288 398 298
             C404 326 380 350 352 348
             C336 364 296 368 270 356
             C264 360 260 360 256 360"/>
    <path d="M292 190 C326 198 330 226 304 240"/>
    <path d="M300 268 C338 276 340 308 308 316"/>
    <path d="M300 330 C326 332 340 320 342 302"/>
  </g>
`;

const svg = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="256" y1="0" x2="256" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#214a73"/>
      <stop offset="1" stop-color="#0f2238"/>
    </linearGradient>
    <radialGradient id="sheen" cx="256" cy="120" r="320" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="512" height="512" fill="url(#bg)"/>
  <rect width="512" height="512" fill="url(#sheen)"/>

  ${half}
  <g transform="matrix(-1,0,0,1,512,0)">${half}</g>

  <path d="M256 146 C248 192 264 226 256 258 C248 292 262 330 256 360"
        stroke="#f1f5f9" stroke-width="20" stroke-linecap="round" fill="none"/>

  <circle cx="304" cy="240" r="30" fill="#38bdf8" fill-opacity="0.22"/>
  <circle cx="304" cy="240" r="16" fill="#38bdf8"/>
  <circle cx="304" cy="240" r="16" fill="none" stroke="#0f2238" stroke-width="6"/>
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
