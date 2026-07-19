import fs from 'fs';

const fp = 'src/data/epilepsy.json';
const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
let h = d.html;

// Step 1: Move Neonatal EEG Normal Waveforms section above EEG Tips
const neoEegText = 'Neonatal EEG Normal Waveforms';
const neoEegTextIdx = h.indexOf(neoEegText);
const beforeNeo = h.substring(Math.max(0, neoEegTextIdx - 200), neoEegTextIdx);
const neoStart = Math.max(0, neoEegTextIdx - 200) + beforeNeo.lastIndexOf('<p>');

const neoEndText = 'Remember to use your notch filter.';
const neoEndIdx = h.indexOf(neoEndText);
const neoEnd = neoEndIdx + neoEndText.length + 4; // </p>

const neoSection = h.substring(neoStart, neoEnd);
h = h.substring(0, neoStart) + h.substring(neoEnd);

const eegTips = '<h1 id="eeg-tips">';
const eegIdx = h.indexOf(eegTips);
h = h.substring(0, eegIdx) + neoSection + h.substring(eegIdx);
console.log('1. Moved Neonatal EEG section above EEG Tips');

// Step 2: Move img-50 through img-18 to end
function findImg(html, name) {
  const re = new RegExp(`<img[^>]*src="/images/epilepsy/${name}"[^>]*>`);
  const m = html.match(re);
  return m ? { tag: m[0], idx: html.indexOf(m[0]) } : null;
}

const img50 = findImg(h, 'img-50.png');
const img18 = findImg(h, 'img-18.png');
const range1 = h.substring(img50.idx, img18.idx + img18.tag.length);
const range1Imgs = range1.match(/<img[^>]*>/g) || [];
h = h.substring(0, img50.idx) + h.substring(img18.idx + img18.tag.length);
h = h.trimEnd() + '\n\n' + range1Imgs.map(t => '<p>' + t + '</p>').join('\n');
console.log('2. Moved', range1Imgs.length, 'images (img-50 through img-18) to end');

// Step 3: Move img-9 through img-41 to end
const img9 = findImg(h, 'img-9.png');
const img41 = findImg(h, 'img-41.png');
const range2 = h.substring(img9.idx, img41.idx + img41.tag.length);
const range2Imgs = range2.match(/<img[^>]*>/g) || [];
h = h.substring(0, img9.idx) + h.substring(img41.idx + img41.tag.length);
h = h.trimEnd() + '\n\n' + range2Imgs.map(t => '<p>' + t + '</p>').join('\n');
console.log('3. Moved', range2Imgs.length, 'images (img-9 through img-41) to end');

// Step 4: Move img-26 through img-31 to end
const img26 = findImg(h, 'img-26.png');
const img31 = findImg(h, 'img-31.png');
const range3 = h.substring(img26.idx, img31.idx + img31.tag.length);
const range3Imgs = range3.match(/<img[^>]*>/g) || [];
h = h.substring(0, img26.idx) + h.substring(img31.idx + img31.tag.length);
h = h.trimEnd() + '\n\n' + range3Imgs.map(t => '<p>' + t + '</p>').join('\n');
console.log('4. Moved', range3Imgs.length, 'images (img-26 through img-31) to end');

// Verify - list all images
const allImgs = [];
const imgRe = /<img[^>]*src="\/images\/epilepsy\/(img-\d+\.png)"[^>]*>/g;
let m;
while ((m = imgRe.exec(h)) !== null) allImgs.push(m[1]);
console.log('\nFinal image count:', allImgs.length);
console.log('Images:', allImgs.join(', '));

// Check for duplicates
const unique = [...new Set(allImgs)];
if (unique.length !== allImgs.length) {
  console.log('WARNING: DUPLICATES DETECTED!');
  const counts = {};
  allImgs.forEach(i => counts[i] = (counts[i]||0)+1);
  Object.entries(counts).filter(([,c]) => c > 1).forEach(([n,c]) => console.log('  ', n, 'x', c));
} else {
  console.log('No duplicates.');
}

d.html = h;
d.imageCount = allImgs.length;
d.tocCount = d.toc.length;

fs.writeFileSync(fp, JSON.stringify(d, null, 2));
console.log('Done. Images:', d.imageCount, 'TOC:', d.tocCount);
