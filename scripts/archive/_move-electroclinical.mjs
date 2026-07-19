import fs from 'fs';

const fp = 'src/data/epilepsy.json';
const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
let h = d.html;

// Find VPA end
const vpaEnd = h.indexOf('L-carnitine is the primary treatment adjunct');
const afterVpa = h.substring(vpaEnd);
const closeMatch = afterVpa.match(/L-carnitine is the primary treatment adjunct[^<]*<\/[^>]+>/);
const sectionEndApprox = vpaEnd + (closeMatch ? closeMatch[0].length : 50);

// Show what comes after the VPA section
console.log('After VPA section:');
console.log(h.substring(sectionEndApprox, sectionEndApprox + 500));

// List all remaining images and their positions
const imgRe = /<img[^>]*src="\/images\/epilepsy\/(img-\d+\.png)"[^>]*>/g;
let m;
const images = [];
while ((m = imgRe.exec(h)) !== null) {
  images.push({ name: m[1], pos: m.index });
}
console.log('\nAll images in order:');
images.forEach(i => console.log(' ', i.name, 'at', i.pos));
