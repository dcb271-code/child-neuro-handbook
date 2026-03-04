import fs from 'fs';

const fp = 'src/data/epilepsy.json';
const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
let h = d.html;

// Find img-9 and img-10
const re9 = /<img[^>]*src="\/images\/epilepsy\/img-9\.png"[^>]*>/;
const re10 = /<img[^>]*src="\/images\/epilepsy\/img-10\.png"[^>]*>/;

const match9 = h.match(re9);
const match10 = h.match(re10);

if (!match9) { console.log('img-9 NOT FOUND'); process.exit(1); }
if (!match10) { console.log('img-10 NOT FOUND'); process.exit(1); }

const img9Tag = match9[0];

// Remove img-9 from current position
h = h.replace(img9Tag, '');

// Insert img-9 right before img-10
const idx10 = h.indexOf(match10[0]);
h = h.substring(0, idx10) + img9Tag + h.substring(idx10);

console.log('Moved img-9 to right above img-10');

// Verify order
const newIdx9 = h.indexOf(img9Tag);
const newIdx10 = h.indexOf(match10[0]);
console.log('New img-9 position:', newIdx9);
console.log('New img-10 position:', newIdx10);
console.log('img-9 is now', newIdx9 < newIdx10 ? 'BEFORE' : 'AFTER', 'img-10');

d.html = h;
d.imageCount = (h.match(/<img /g) || []).length;

fs.writeFileSync(fp, JSON.stringify(d, null, 2));
console.log('Done. Images:', d.imageCount);
