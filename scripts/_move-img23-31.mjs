import fs from 'fs';

const fp = 'src/data/epilepsy.json';
const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
let h = d.html;

const re23 = /<img[^>]*src="\/images\/epilepsy\/img-23\.png"[^>]*>/;
const re31 = /<img[^>]*src="\/images\/epilepsy\/img-31\.png"[^>]*>/;

const match23 = h.match(re23);
const match31 = h.match(re31);

if (!match23) { console.log('img-23 NOT FOUND'); process.exit(1); }
if (!match31) { console.log('img-31 NOT FOUND'); process.exit(1); }

const idx23 = h.indexOf(match23[0]);
const idx31 = h.indexOf(match31[0]);
const rangeEnd = idx31 + match31[0].length;

// List images in range
const imgRe = /<img[^>]*src="\/images\/epilepsy\/(img-\d+\.png)"[^>]*>/g;
let m;
const imgs = [];
while ((m = imgRe.exec(h)) !== null) {
  if (m.index >= idx23 && m.index <= rangeEnd) {
    imgs.push({ name: m[1], tag: m[0] });
  }
}
console.log('Images in range:', imgs.map(i => i.name).join(', '));

// Check for non-image content
const range = h.substring(idx23, rangeEnd);
const nonImg = range.replace(/<img[^>]*>/g, '').trim();
if (nonImg.length > 0) {
  console.log('Non-image content (' + nonImg.length + ' chars):', nonImg.substring(0, 200));
}

// Remove range
h = h.substring(0, idx23) + h.substring(rangeEnd);

// Append to end
const wrapped = imgs.map(i => '<p>' + i.tag + '</p>').join('\n');
h = h.trimEnd() + '\n\n' + wrapped;

console.log('Moved', imgs.length, 'images to end');

d.html = h;
d.imageCount = (h.match(/<img /g) || []).length;
fs.writeFileSync(fp, JSON.stringify(d, null, 2));
console.log('Done. Images:', d.imageCount);
