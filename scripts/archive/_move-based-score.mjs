import fs from 'fs';

const fp = 'src/data/epilepsy.json';
const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
let h = d.html;

// Find img-9 position
const re9 = /<img[^>]*src="\/images\/epilepsy\/img-9\.png"[^>]*>/;
const match9 = h.match(re9);
if (!match9) { console.log('img-9 NOT FOUND'); process.exit(1); }
const idx9 = h.indexOf(match9[0]);

// Find the start of the BASED Score section
const basedIdx = h.indexOf('2021 BASED Score');
const beforeBased = h.substring(0, basedIdx);
const sectionStart = beforeBased.lastIndexOf('<div class="table-wrap">');

// Find the end - after "A diagnosis of IS qualifies for Early Intervention.</p>"
const endMarker = 'A diagnosis of IS qualifies for Early Intervention.';
const endMarkerIdx = h.indexOf(endMarker);
const sectionEnd = endMarkerIdx + endMarker.length + 4; // +4 for </p>

// Extract the section
const section = h.substring(sectionStart, sectionEnd);
console.log('Section length:', section.length);
console.log('Section starts with:', section.substring(0, 80));
console.log('Section ends with:', section.substring(section.length - 80));

// Remove section from current position
h = h.substring(0, sectionStart) + h.substring(sectionEnd);

// Find img-9 in the updated HTML (position may have shifted since section was after img-9)
const newIdx9 = h.indexOf(match9[0]);
console.log('\nimg-9 new position:', newIdx9);

// Insert section right before img-9
h = h.substring(0, newIdx9) + section + h.substring(newIdx9);

// Verify order
const finalBasedIdx = h.indexOf('2021 BASED Score');
const finalImg9Idx = h.indexOf(match9[0]);
console.log('\nFinal BASED Score position:', finalBasedIdx);
console.log('Final img-9 position:', finalImg9Idx);
console.log('BASED is now', finalBasedIdx < finalImg9Idx ? 'BEFORE' : 'AFTER', 'img-9');

d.html = h;
d.imageCount = (h.match(/<img /g) || []).length;

fs.writeFileSync(fp, JSON.stringify(d, null, 2));
console.log('\nDone. Images:', d.imageCount);
