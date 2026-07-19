/**
 * One-time script to restructure neuro-on-call section:
 * 1. Remove neonatal seizures figure from Seizure & Status Epilepticus
 * 2. Remove Diastat/Diazepam h3 heading from Seizure Medications
 * 3. Move img-7641 (KY SE Pathway) to Seizure & Status Epilepticus
 * 4. Move img-7642 (Febrile Seizures) to new Febrile Seizure section
 * 5. Move img-7643 (Rescue Meds) to Seizure Medications & Dosing
 * 6. Move img-7644 (Migraine Cocktail) to Migraine section
 * 7. Move img-7645 (Stroke Protocol) to Stroke section
 * 8. Delete remaining images (image.png, image-1-.png, image-2-.png)
 * 9. Remove Clinical Reference Images section entirely
 * 10. Update TOC (replace Clinical Reference Images with Febrile Seizure)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'src', 'data', 'neuro-on-call.json');

const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
let html = data.html;

// ── Helper: build a figure element ──
function makeFigure(src, alt, caption) {
  let fig = `<figure style="margin:1.25rem 0;">
  <img src="${src}" alt="${alt}" style="max-width:100%;border-radius:10px;border:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,0.08);display:block;margin:0 auto;">`;
  if (caption) {
    fig += `\n  <figcaption style="text-align:center;font-size:0.75rem;color:#64748b;margin-top:0.5rem;font-style:italic;">${caption}</figcaption>`;
  }
  fig += '\n</figure>';
  return fig;
}

// ── Helper: build a section header div ──
function makeSectionHeader(id, title, subtitle, icon, accentColor) {
  return `<section aria-label="${title}">
<div style="display:flex;align-items:flex-start;gap:0.875rem;background:${accentColor}10;border-left:4px solid ${accentColor};border-radius:0 10px 10px 0;padding:1rem 1.25rem 1rem 1.25rem;margin:2.5rem 0 1.25rem;">
  <span style="font-size:1.75rem;line-height:1;flex-shrink:0;margin-top:0.1rem;" aria-hidden="true">${icon}</span>
  <div style="flex:1;min-width:0;">
    <h2 id="${id}" style="margin:0 0 0.25rem;padding:0;font-size:1.1rem;font-weight:700;color:${accentColor};border:none;background:none;">${title}</h2>
    <p style="margin:0;font-size:0.75rem;color:${accentColor};opacity:0.85;">${subtitle}</p>
  </div>
</div>`;
}

// ── 1. Remove neonatal seizures figure ──
const neonatalFigure = `<figure style="margin:1.25rem 0;">
  <img src="/images/neuro-on-call/neonatal-seizures.png" alt="Neonatal Seizures Reference" style="max-width:100%;border-radius:10px;border:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,0.08);display:block;margin:0 auto;">
  <figcaption style="text-align:center;font-size:0.75rem;color:#64748b;margin-top:0.5rem;font-style:italic;">Neonatal Seizures Reference</figcaption>
</figure>`;
if (html.includes(neonatalFigure)) {
  html = html.replace(neonatalFigure, '');
  console.log('✓ Removed neonatal seizures figure');
} else {
  console.log('✗ Neonatal seizures figure not found (trying flexible match)');
  // Flexible match
  const neoRegex = /<figure[^>]*>[\s\S]*?neonatal-seizures\.png[\s\S]*?<\/figure>/;
  if (neoRegex.test(html)) {
    html = html.replace(neoRegex, '');
    console.log('  ✓ Removed via flexible match');
  }
}

// ── 2. Remove Diastat/Diazepam h3 heading ──
const diastatDiv = '<div class="doc-content" style="margin-top:1rem;"><h3><strong>Diastat/Diazepam Dosing (Weight Based)</strong></h3></div>';
if (html.includes(diastatDiv)) {
  html = html.replace(diastatDiv, '');
  console.log('✓ Removed Diastat/Diazepam heading');
} else {
  console.log('✗ Diastat heading not found');
}

// ── 3. Remove entire Clinical Reference Images section ──
const clinRefStart = html.indexOf('<section aria-label="Clinical Reference Images">');
if (clinRefStart >= 0) {
  const clinRefEnd = html.indexOf('</section>', clinRefStart) + '</section>'.length;
  html = html.substring(0, clinRefStart) + html.substring(clinRefEnd);
  console.log('✓ Removed Clinical Reference Images section');
} else {
  console.log('✗ Clinical Reference Images section not found');
}

// ── 4. Insert img-7641 at end of Seizure & Status Epilepticus section ──
const seEndTag = '</section>';
const seSection = html.indexOf('<section aria-label="Seizure &amp; Status Epilepticus">');
if (seSection < 0) {
  // Try without amp
  console.log('Looking for SE section with different encoding...');
}
const seEnd = html.indexOf(seEndTag, seSection);
const kyFigure = makeFigure(
  '/images/neuro-on-call/img-7641.jpeg',
  'Kentucky Pediatric Status Epilepticus Management Pathway',
  'Kentucky Pediatric Status Epilepticus Management Pathway'
);
html = html.substring(0, seEnd) + kyFigure + '\n' + html.substring(seEnd);
console.log('✓ Inserted KY SE Pathway into Seizure & Status Epilepticus');

// ── 5. Insert img-7643 (Rescue Meds) at end of Seizure Medications section ──
// Need to re-find section positions after modifications
const seizMedSection = html.indexOf('aria-label="Seizure Medications');
const seizMedEnd = html.indexOf(seEndTag, seizMedSection);
const rescueFigure = makeFigure(
  '/images/neuro-on-call/img-7643.jpeg',
  'Rescue Medications for Home — Diastat & Valtoco Dosing',
  'Rescue Medications for Home — Diastat & Valtoco Dosing'
);
html = html.substring(0, seizMedEnd) + rescueFigure + '\n' + html.substring(seizMedEnd);
console.log('✓ Inserted Rescue Meds into Seizure Medications & Dosing');

// ── 6. Insert img-7645 (Stroke Protocol) at end of Stroke section ──
const strokeSection = html.indexOf('aria-label="Stroke">');
const strokeEnd = html.indexOf(seEndTag, strokeSection);
const strokeFigure = makeFigure(
  '/images/neuro-on-call/img-7645.jpeg',
  'Brain Attack Pathway (BAT) — Inpatient Stroke Protocol',
  'Brain Attack Pathway (BAT) — Inpatient Stroke Protocol (Note: Steps 1a–1b appear at bottom of image, Steps 2–5 at top)'
);
html = html.substring(0, strokeEnd) + strokeFigure + '\n' + html.substring(strokeEnd);
console.log('✓ Inserted Stroke Protocol into Stroke section');

// ── 7. Insert img-7644 (Migraine Cocktail) at end of Migraine section ──
const migraineSection = html.indexOf('aria-label="Migraine Pathway');
const migraineEnd = html.indexOf(seEndTag, migraineSection);
const migraineFigure = makeFigure(
  '/images/neuro-on-call/img-7644.jpeg',
  'Migraine Cocktail Dosing & Management Flowchart',
  'Migraine Cocktail Dosing & Management Flowchart'
);
html = html.substring(0, migraineEnd) + migraineFigure + '\n' + html.substring(migraineEnd);
console.log('✓ Inserted Migraine Cocktail into Migraine section');

// ── 8. Create new Febrile Seizure section before LVO section ──
const lvoSection = html.indexOf('<section aria-label="Pediatric LVO');
const febrileSection = makeSectionHeader(
  'febrile-seizures',
  'Febrile Seizure On-Call References',
  'Quick reference guides for febrile seizure evaluation and management',
  '🌡️',
  '#ea580c'
) + makeFigure(
  '/images/neuro-on-call/img-7642-1-.png',
  'Febrile Seizures — Simple vs Complex Classification & Algorithm',
  'Febrile Seizures — Simple vs Complex Classification & Complex Febrile Seizure Algorithm'
) + '\n</section>\n\n';

html = html.substring(0, lvoSection) + febrileSection + html.substring(lvoSection);
console.log('✓ Created Febrile Seizure On-Call References section');

// ── 9. Update TOC ──
data.toc = data.toc.filter(t => t.id !== 'clinical-reference-images');
// Add febrile seizure entry before LVO
const lvoTocIdx = data.toc.findIndex(t => t.id === 'lvo-escalation');
data.toc.splice(lvoTocIdx, 0, {
  level: 2,
  text: 'Febrile Seizure On-Call References',
  id: 'febrile-seizures'
});
console.log('✓ Updated TOC');

// ── 10. Update image count ──
// Count images in final HTML
const imgCount = (html.match(/<img /g) || []).length;
data.imageCount = imgCount;
console.log(`✓ Updated imageCount to ${imgCount}`);

// ── Write back ──
data.html = html;
fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
console.log('\n✓ Saved neuro-on-call.json');

// ── Verify ──
console.log('\nFinal sections:');
const sectionRegex = /aria-label="([^"]+)"/g;
let match;
while ((match = sectionRegex.exec(html)) !== null) {
  console.log('  • ' + match[1]);
}
console.log('\nTOC entries:');
data.toc.forEach(t => console.log('  • ' + t.text + ' (#' + t.id + ')'));
