import fs from 'fs';

const fp = 'src/data/epilepsy.json';
const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
let h = d.html;

// === 1. Fix TOC ===
const toc = d.toc;
const neonatalEegIdx = toc.findIndex(t => t.id === 'neonatal-eeg-waveforms');
const eegBasicsIdx = toc.findIndex(t => t.id === 'eeg-reading-basics');
const eegTipsIdx = toc.findIndex(t => t.id === 'eeg-tips');

console.log('TOC indices — Neonatal EEG:', neonatalEegIdx, 'EEG Reading Basics:', eegBasicsIdx, 'EEG Tips:', eegTipsIdx);

// Neonatal EEG block: from neonatalEegIdx to eegBasicsIdx (exclusive)
const neonatalTocBlock = toc.slice(neonatalEegIdx, eegBasicsIdx)
  .filter(t => t.id !== 'eeg-xltek-tips'); // Remove XLTEK

// EEG Basics block: from eegBasicsIdx to eegTipsIdx (exclusive)
const eegBasicsTocBlock = toc.slice(eegBasicsIdx, eegTipsIdx);

console.log('Neonatal TOC block (filtered):', neonatalTocBlock.map(t => t.text));
console.log('EEG Basics TOC block:', eegBasicsTocBlock.map(t => t.text));

d.toc = [
  ...toc.slice(0, neonatalEegIdx),
  ...eegBasicsTocBlock,
  ...neonatalTocBlock,
  ...toc.slice(eegTipsIdx)
];

// === 2. Fix HTML ===
// Strategy: use heading IDs as anchors to find sections in the HTML string

// Find the Neonatal EEG section start
const neonatalH1Start = h.indexOf('id="neonatal-eeg-waveforms"');
// Walk back to find the opening <h1
const neonatalSectionStart = h.lastIndexOf('<h1', neonatalH1Start);
console.log('\nNeonatal section starts at:', neonatalSectionStart);
console.log('  Preview:', h.substring(neonatalSectionStart, neonatalSectionStart + 80));

// Find the EEG Reading Basics section start — this is where neonatal ends
const eegBasicsH1Start = h.indexOf('id="eeg-reading-basics"');
const eegBasicsSectionStart = h.lastIndexOf('<h1', eegBasicsH1Start);
console.log('EEG Basics section starts at:', eegBasicsSectionStart);
console.log('  Preview:', h.substring(eegBasicsSectionStart, eegBasicsSectionStart + 80));

// Find EEG Tips section start — this is where EEG Basics ends
const eegTipsH1Start = h.indexOf('id="eeg-tips"');
const eegTipsSectionStart = h.lastIndexOf('<h1', eegTipsH1Start);
console.log('EEG Tips section starts at:', eegTipsSectionStart);
console.log('  Preview:', h.substring(eegTipsSectionStart, eegTipsSectionStart + 80));

// Extract the three sections
const neonatalHtml = h.substring(neonatalSectionStart, eegBasicsSectionStart);
const eegBasicsHtml = h.substring(eegBasicsSectionStart, eegTipsSectionStart);

console.log('\nNeonatal HTML length:', neonatalHtml.length);
console.log('EEG Basics HTML length:', eegBasicsHtml.length);

// Now remove XLTEK from neonatalHtml
// Find h3 with id="eeg-xltek-tips" and everything until next h1/h2/h3 or end
let cleanNeonatalHtml = neonatalHtml;
const xltekH3Start = cleanNeonatalHtml.indexOf('id="eeg-xltek-tips"');
if (xltekH3Start >= 0) {
  const xltekSectionStart = cleanNeonatalHtml.lastIndexOf('<h3', xltekH3Start);
  // Find the next heading (h1, h2, or h3) or end of section
  const afterXltek = cleanNeonatalHtml.substring(xltekSectionStart + 10); // skip past <h3
  const nextH1 = afterXltek.search(/<h[123][\s>]/);
  let xltekSectionEnd;
  if (nextH1 >= 0) {
    xltekSectionEnd = xltekSectionStart + 10 + nextH1;
  } else {
    xltekSectionEnd = cleanNeonatalHtml.length;
  }

  console.log('\nXLTEK section:', xltekSectionStart, 'to', xltekSectionEnd);
  console.log('  Start:', cleanNeonatalHtml.substring(xltekSectionStart, xltekSectionStart + 80));
  console.log('  Removing:', cleanNeonatalHtml.substring(xltekSectionStart, xltekSectionEnd).substring(0, 200));

  cleanNeonatalHtml = cleanNeonatalHtml.substring(0, xltekSectionStart) + cleanNeonatalHtml.substring(xltekSectionEnd);
}

// Rebuild HTML: replace the region [neonatalSectionStart, eegTipsSectionStart)
// with: eegBasicsHtml + cleanNeonatalHtml
const before = h.substring(0, neonatalSectionStart);
const after = h.substring(eegTipsSectionStart);
h = before + eegBasicsHtml + cleanNeonatalHtml + after;

d.html = h;
d.imageCount = (h.match(/<img /g) || []).length;

fs.writeFileSync(fp, JSON.stringify(d, null, 2));
console.log('\nDone! Images:', d.imageCount);
console.log('TOC entries:', d.toc.length);
