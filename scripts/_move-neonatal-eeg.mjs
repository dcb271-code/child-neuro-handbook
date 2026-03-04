import fs from 'fs';

const fp = 'src/data/epilepsy.json';
const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
let h = d.html;

// Find the start - walk back from "Neonatal EEG Normal Waveforms" to find its heading tag
const startText = 'Neonatal EEG Normal Waveforms';
const startTextIdx = h.indexOf(startText);
const before = h.substring(Math.max(0, startTextIdx - 200), startTextIdx);
// Find the last opening tag before the text (should be <p><strong> or <h1> etc)
const lastTagIdx = before.lastIndexOf('<p>');
const lastH1Idx = before.lastIndexOf('<h1');
const lastH2Idx = before.lastIndexOf('<h2');
const sectionStart = Math.max(0, startTextIdx - 200) + Math.max(lastTagIdx, lastH1Idx, lastH2Idx);
console.log('Section start at:', sectionStart);
console.log('Start:', h.substring(sectionStart, sectionStart + 80));

// Find the end - after "Remember to use your notch filter.</p>"
const endText = 'Remember to use your notch filter.';
const endIdx = h.indexOf(endText);
const sectionEnd = endIdx + endText.length + 4; // +4 for </p>
console.log('Section end at:', sectionEnd);
console.log('After section:', h.substring(sectionEnd, sectionEnd + 80));

// Extract the section
const section = h.substring(sectionStart, sectionEnd);
console.log('\nSection length:', section.length);

// Remove from current position
h = h.substring(0, sectionStart) + h.substring(sectionEnd);

// Find EEG Tips in updated HTML
const eegTips = '<h1 id="eeg-tips">';
const eegIdx = h.indexOf(eegTips);
console.log('EEG Tips now at:', eegIdx);

// Insert section right before EEG Tips
h = h.substring(0, eegIdx) + section + h.substring(eegIdx);

// Verify
const newSectionIdx = h.indexOf(startText);
const newEegIdx = h.indexOf(eegTips);
console.log('\nNeonatal EEG now at:', newSectionIdx);
console.log('EEG Tips now at:', newEegIdx);
console.log('Section is', newSectionIdx < newEegIdx ? 'BEFORE' : 'AFTER', 'EEG Tips');

d.html = h;
d.imageCount = (h.match(/<img /g) || []).length;

fs.writeFileSync(fp, JSON.stringify(d, null, 2));
console.log('Done. Images:', d.imageCount);
