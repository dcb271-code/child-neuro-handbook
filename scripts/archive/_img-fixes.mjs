import fs from 'fs';

const fp = 'src/data/epilepsy.json';
const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
let h = d.html;

// 1. Remove img-13
const re13 = /<img[^>]*src="\/images\/epilepsy\/img-13\.png"[^>]*>/;
const match13 = h.match(re13);
if (match13) {
  h = h.replace(match13[0], '');
  console.log('Removed img-13.png');
} else {
  console.log('img-13 NOT FOUND');
}

// 2. Move img-24 to end
const re24 = /<img[^>]*src="\/images\/epilepsy\/img-24\.png"[^>]*>/;
const match24 = h.match(re24);
if (match24) {
  h = h.replace(match24[0], '');
  h = h.trimEnd() + '\n\n<p>' + match24[0] + '</p>';
  console.log('Moved img-24.png to end');
} else {
  console.log('img-24 NOT FOUND');
}

d.html = h;
d.imageCount = (h.match(/<img /g) || []).length;
d.tocCount = d.toc.length;

fs.writeFileSync(fp, JSON.stringify(d, null, 2));
console.log('Done. Images:', d.imageCount, 'TOC:', d.tocCount);
