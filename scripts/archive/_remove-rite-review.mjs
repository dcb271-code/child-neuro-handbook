import fs from 'fs';

const fp = 'src/data/epilepsy.json';
const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
let h = d.html;

// Section to remove: from <h1 id="rite-review"> through "EEG is improved</li></ul></li>"
const riteH1 = '<h1 id="rite-review">Rite Review</h1>';
const riteIdx = h.indexOf(riteH1);
if (riteIdx === -1) { console.log('Rite Review NOT FOUND'); process.exit(1); }

const endStr = 'EEG is improved</li></ul></li>';
const endIdx = h.indexOf(endStr);
if (endIdx === -1) { console.log('End marker NOT FOUND'); process.exit(1); }
const sectionEnd = endIdx + endStr.length;

// The removed section contains the <ul> that wraps SUDEP and remaining items
// After removal, the next content starts with <li>SUDEP...
// We need to add <ul> back so the remaining <li> items have a parent
const afterRemoval = h.substring(sectionEnd);
console.log('After removal starts with:', afterRemoval.substring(0, 100));

// Remove the section and add <ul> for remaining list items
h = h.substring(0, riteIdx) + '<ul>' + h.substring(sectionEnd);

console.log('Removed Rite Review section (Hypothalamus through Clinical Epilepsy - Adults)');

// Remove "rite-review" from TOC
d.toc = d.toc.filter(t => t.id !== 'rite-review');
d.tocCount = d.toc.length;

d.html = h;
d.imageCount = (h.match(/<img /g) || []).length;

fs.writeFileSync(fp, JSON.stringify(d, null, 2));
console.log('Done. Images:', d.imageCount, 'TOC:', d.tocCount);
