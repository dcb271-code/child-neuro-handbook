/**
 * fix-minor-issues.mjs
 * Fixes minor content issues found in the audit:
 *  1. Neuro-Ophthalmology: deduplicate "Vision Loss" h2 headings
 *  2. Epilepsy: fix/remove broken PDF links (Acthar, Vigabatrin)
 *  3. Psychiatry: give bare URLs descriptive display text
 *
 * Run: node scripts/fix-minor-issues.mjs
 */

import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src', 'data');

function loadJson(name) {
  const p = path.join(DATA_DIR, name);
  return { path: p, data: JSON.parse(fs.readFileSync(p, 'utf-8')) };
}

function saveJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
}

let totalFixes = 0;

// ── 1. Neuro-Ophthalmology: disambiguate duplicate "Vision Loss" headings ────

console.log('\n── neuro-ophthalmology.json ──');
const no = loadJson('neuro-ophthalmology.json');
const $no = cheerio.load(no.data.html, { decodeEntities: false });

// The second "Vision Loss" h2 is actually about acute vs progressive vision loss
// Rename it to be more specific
const visionLoss2 = $no('h2#vision-loss-2');
if (visionLoss2.length) {
  visionLoss2.text('Vision Loss — Acute vs Progressive');
  totalFixes++;
  console.log('  ✓ Renamed second "Vision Loss" → "Vision Loss — Acute vs Progressive"');

  // Update TOC
  no.data.toc = no.data.toc.map(t => {
    if (t.id === 'vision-loss-2') {
      return { ...t, text: 'Vision Loss — Acute vs Progressive' };
    }
    return t;
  });
} else {
  console.log('  ✗ Second "Vision Loss" heading not found');
}

no.data.html = $no('body').html() || no.data.html;
saveJson(no.path, no.data);

// ── 2. Epilepsy: fix broken external PDF links ──────────────────────────────

console.log('\n── epilepsy.json ──');
const epi = loadJson('epilepsy.json');

// Acthar referral form — acthar.com/pdf/Referral_RxForm_ALL.pdf returns 404
// Replace link with plain text note
const actharOld = '<a href="http://www.acthar.com/pdf/Referral_RxForm_ALL.pdf">ACTHAR.com website</a>';
const actharNew = 'ACTHAR.com website (contact pharmacy for current form)';
if (epi.data.html.includes(actharOld)) {
  epi.data.html = epi.data.html.replace(actharOld, actharNew);
  totalFixes++;
  console.log('  ✓ Acthar referral form link → plain text note');
} else {
  console.log('  ✗ Acthar referral form link not found');
}

// Vigabatrin REMS links — vigabatrinrems.com domain is gone
const vigPatientOld = '<a href="https://www.vigabatrinrems.com/Resources/Documents/Patient%20Guide.pdf">here</a>';
const vigPatientNew = 'the REMS program website (contact pharmacy for current materials)';
if (epi.data.html.includes(vigPatientOld)) {
  epi.data.html = epi.data.html.replace(vigPatientOld, vigPatientNew);
  totalFixes++;
  console.log('  ✓ Vigabatrin patient guide link → plain text note');
} else {
  console.log('  ✗ Vigabatrin patient guide link not found');
}

const vigPhysOld = '<a href="https://www.vigabatrinrems.com/Resources/Documents/Physician%20Agreement%20Form.pdf">Parent/Physician agreement form</a>';
const vigPhysNew = 'Parent/Physician agreement form (contact REMS program for current form)';
if (epi.data.html.includes(vigPhysOld)) {
  epi.data.html = epi.data.html.replace(vigPhysOld, vigPhysNew);
  totalFixes++;
  console.log('  ✓ Vigabatrin physician agreement link → plain text note');
} else {
  console.log('  ✗ Vigabatrin physician agreement link not found');
}

saveJson(epi.path, epi.data);

// ── 3. Psychiatry: give bare URLs descriptive display text ───────────────────

console.log('\n── psychiatry.json ──');
const psy = loadJson('psychiatry.json');

// ADHD Medications PDF link
const adhdOld = '<a href="https://chadd.org/wp-content/uploads/2018/05/Medication-Chart-October-2017.pdf">https://chadd.org/wp-content/uploads/2018/05/Medication-Chart-October-2017.pdf</a>';
const adhdNew = '<a href="https://chadd.org/wp-content/uploads/2018/05/Medication-Chart-October-2017.pdf">CHADD ADHD Medication Chart (PDF)</a>';
if (psy.data.html.includes(adhdOld)) {
  psy.data.html = psy.data.html.replace(adhdOld, adhdNew);
  totalFixes++;
  console.log('  ✓ ADHD medication PDF: bare URL → "CHADD ADHD Medication Chart (PDF)"');
} else {
  console.log('  ✗ ADHD medication bare URL not found');
}

// DSM-V bare URL (proxy link — won't work outside university network anyway)
const dsmOld = '<a href="https://dsm-psychiatryonline-org.proxy.hsl.ucdenver.edu/doi/full/10.1176/appi.books.9780890425596.dsm09">https://dsm-psychiatryonline-org.proxy.hsl.ucdenver.edu/doi/full/10.1176/appi.books.9780890425596.dsm09</a>';
const dsmNew = '<a href="https://dsm-psychiatryonline-org.proxy.hsl.ucdenver.edu/doi/full/10.1176/appi.books.9780890425596.dsm09">DSM-5 Full Diagnostic Criteria — Somatic Symptom &amp; Related Disorders</a>';
if (psy.data.html.includes(dsmOld)) {
  psy.data.html = psy.data.html.replace(dsmOld, dsmNew);
  totalFixes++;
  console.log('  ✓ DSM-V bare URL → descriptive link text');
} else {
  console.log('  ✗ DSM-V bare URL not found');
}

saveJson(psy.path, psy.data);

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n── Summary: ${totalFixes} total fixes ──\n`);
