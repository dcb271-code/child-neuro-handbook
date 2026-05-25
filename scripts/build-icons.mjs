// Regenerates the PNG app icons from the neuron mark.
// Requires sharp:  npm i sharp --no-save   (then)   node scripts/build-icons.mjs
//
// Outputs:
//   app/apple-icon.png        180x180  (iOS home-screen / apple-touch-icon)
//   public/icons/icon-192.png 192x192  (PWA manifest)
//   public/icons/icon-512.png 512x512  (PWA manifest)
//
// The SVG favicon (app/icon.svg) carries the identical mark by hand. Keep the
// two in sync if the artwork changes.

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

// Full-bleed (iOS/Android apply their own corner mask). The neuron sits inside
// the maskable safe zone (10% margin), so corners can be cropped without
// clipping the mark. Mark: a stylized neuron — soma with a tapering dendrite
// tree (left) and an axon arbor (right) — white on a near-black field with a
// subtle cardinal glow rising from the bottom.
const svg = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="fb" cx="50%" cy="118%" r="120%">
      <stop offset="0" stop-color="#3a0d14"/>
      <stop offset="0.45" stop-color="#161417"/>
      <stop offset="1" stop-color="#0b0b0d"/>
    </radialGradient>
    <radialGradient id="sh" cx="50%" cy="8%" r="70%">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.13"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="512" height="512" fill="url(#fb)"/>
  <rect width="512" height="512" fill="url(#sh)"/>

  <g stroke="#f6f1ea" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="16">
    <path d="M256 250 C250 198 246 168 240 122"/>
    <path d="M256 250 C214 218 188 198 150 166"/>
    <path d="M256 252 C202 246 158 248 104 242"/>
    <path d="M256 254 C214 288 190 312 158 348"/>
    <path d="M256 254 C252 300 250 332 248 374"/>
    <path d="M256 250 C300 226 326 206 352 178"/>
    <path d="M256 252 C322 252 384 252 428 252"/>
  </g>
  <g stroke="#f6f1ea" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="10">
    <path d="M240 122 C232 110 222 108 210 102"/>
    <path d="M240 122 C246 108 252 104 262 98"/>
    <path d="M150 166 C136 160 124 162 110 154"/>
    <path d="M150 166 C142 154 142 144 136 132"/>
    <path d="M104 242 C92 236 84 226 72 222"/>
    <path d="M104 242 C92 250 84 260 72 262"/>
    <path d="M158 348 C148 358 146 370 136 378"/>
    <path d="M158 348 C168 358 180 360 188 372"/>
    <path d="M248 374 C240 386 228 390 220 400"/>
    <path d="M248 374 C256 386 268 390 276 400"/>
    <path d="M352 178 C360 164 372 160 380 148"/>
    <path d="M352 178 C342 168 340 158 332 148"/>
    <path d="M428 252 C440 240 450 240 456 230"/>
    <path d="M428 252 C440 264 450 280 446 298"/>
  </g>
  <circle cx="256" cy="252" r="40" fill="#f6f1ea"/>
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
