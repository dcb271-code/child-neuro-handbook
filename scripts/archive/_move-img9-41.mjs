import fs from 'fs';

const fp = 'src/data/epilepsy.json';
const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
let h = d.html;

const re9 = /<img[^>]*src="\/images\/epilepsy\/img-9\.png"[^>]*>/;
const re41 = /<img[^>]*src="\/images\/epilepsy\/img-41\.png"[^>]*>/;

const match9 = h.match(re9);
const match41 = h.match(re41);

if (!match9) { console.log('img-9 NOT FOUND'); process.exit(1); }
if (!match41) { console.log('img-41 NOT FOUND'); process.exit(1); }

const idx9 = h.indexOf(match9[0]);
const idx41 = h.indexOf(match41[0]);
const rangeEnd = idx41 + match41[0].length;

console.log('img-9 at:', idx9);
console.log('img-41 at:', idx41);

// List images in range
const imgRe = /<img[^>]*src="\/images\/epilepsy\/(img-\d+\.png)"[^>]*>/g;
let m;
const imgs = [];
while ((m = imgRe.exec(h)) !== null) {
  if (m.index >= idx9 && m.index <= idx41 + match41[0].length) {
    imgs.push({ name: m[1], pos: m.index, tag: m[0] });
  }
}
console.log('\nImages in range:', imgs.map(i => i.name).join(', '));

// Check for non-image content in range
const range = h.substring(idx9, rangeEnd);
const nonImgContent = range.replace(/<img[^>]*>/g, '').trim();
if (nonImgContent.length > 0) {
  console.log('\nNon-image content in range (' + nonImgContent.length + ' chars):');
  console.log(nonImgContent.substring(0, 300));
}

// Remove range from current position
h = h.substring(0, idx9) + h.substring(rangeEnd);

// Append images to end
const wrappedImgs = imgs.map(i => '<p>' + i.tag + '</p>').join('\n');
h = h.trimEnd() + '\n\n' + wrappedImgs;

console.log('\nMoved', imgs.length, 'images to end');

d.html = h;
d.imageCount = (h.match(/<img /g) || []).length;

fs.writeFileSync(fp, JSON.stringify(d, null, 2));
console.log('Done. Images:', d.imageCount);
