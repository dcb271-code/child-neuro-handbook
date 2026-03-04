import fs from 'fs';

const fp = 'src/data/epilepsy.json';
const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
let h = d.html;

const re50 = /<img[^>]*src="\/images\/epilepsy\/img-50\.png"[^>]*>/;
const re18 = /<img[^>]*src="\/images\/epilepsy\/img-18\.png"[^>]*>/;

const match50 = h.match(re50);
const match18 = h.match(re18);

const idx50 = h.indexOf(match50[0]);
const idx18 = h.indexOf(match18[0]);
const rangeEnd = idx18 + match18[0].length;

// Check what's between img-23 and img-18
console.log('Between img-23 and img-18:', h.substring(h.indexOf('img-23.png') + 80, idx18));

// Extract the range
const range = h.substring(idx50, rangeEnd);
console.log('\nRange length:', range.length);

// Remove from current position
h = h.substring(0, idx50) + h.substring(rangeEnd);

// Append to end, wrapping each img in <p> if not already
// The images are bare img tags, wrap them
const imgTags = range.match(/<img[^>]*>/g);
const wrappedImgs = imgTags.map(t => '<p>' + t + '</p>').join('\n');

h = h.trimEnd() + '\n\n' + wrappedImgs;

console.log('Moved', imgTags.length, 'images to end');

d.html = h;
d.imageCount = (h.match(/<img /g) || []).length;

fs.writeFileSync(fp, JSON.stringify(d, null, 2));
console.log('Done. Images:', d.imageCount);
