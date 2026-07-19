import fs from 'fs';

const fp = 'src/data/neurogenetics-and-neurometabolics.json';
const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
let h = d.html;

const re = /<p><img[^>]+><\/p>/g;
const imgs = [];
let m;
while ((m = re.exec(h)) !== null) {
  imgs.push(m[0]);
}

console.log('Found', imgs.length, 'images');

// Remove images 1, 2, 3 (keep 4th in place)
const img1 = imgs[0];
const img2 = imgs[1];
const img3 = imgs[2];

h = h.replace(img1, '');
h = h.replace(img2, '');
h = h.replace(img3, '');

// Append to very end
h = h.trimEnd() + '\n\n' + img1 + '\n' + img2 + '\n' + img3;

d.html = h;
d.imageCount = (h.match(/<img /g) || []).length;
fs.writeFileSync(fp, JSON.stringify(d, null, 2));
console.log('Done. Images:', d.imageCount);
