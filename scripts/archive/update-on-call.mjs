/**
 * update-on-call.mjs
 *
 * Three changes to neuro-on-call.json:
 *  1. Delete all body text from the "Headache & Migraine" section — keep only
 *     the pathway image, rename the topic to "Migraine Pathway — Quick Reference"
 *  2. Insert a new "Pediatric LVO Escalation Pathway" section (after Stroke)
 *     with identical content and formatting to the Stroke section, including
 *     tappable phone numbers
 *  3. Update TOC + update both search.json copies
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA   = join(__dirname, '../src/data');
const PUBLIC = join(__dirname, '../public');

// ─────────────────────────────────────────────────────────────────────────────
// NEW SECTION HTML SNIPPETS
// ─────────────────────────────────────────────────────────────────────────────

/** LVO section — same On-Call section wrapper style as other topics */
const LVO_SECTION_HTML = `
<section aria-label="Pediatric LVO Escalation Pathway">
<div style="display:flex;align-items:flex-start;gap:0.875rem;background:#fef2f2;border-left:4px solid #dc2626;border-radius:0 10px 10px 0;padding:1rem 1.25rem 1rem 1.25rem;margin:2.5rem 0 1.25rem;">
  <span style="font-size:1.75rem;line-height:1;flex-shrink:0;margin-top:0.1rem;" aria-hidden="true">🚨</span>
  <div style="flex:1;min-width:0;">
    <h2 id="lvo-escalation" style="margin:0 0 0.25rem;padding:0;font-size:1.1rem;font-weight:700;color:#dc2626;border:none;background:none;">Pediatric LVO Escalation Pathway</h2>
    <p style="margin:0;font-size:0.75rem;color:#dc2626;opacity:0.85;">Emergency escalation for suspected pediatric large vessel occlusion requiring endovascular intervention</p>
  </div>
</div>
<div class="doc-content" style="margin-top:1rem;">

<h3>Step 1 — Call Anesthesia</h3>
<ul>
<li><strong>Age &lt;12 years:</strong> Call <strong>Peds anesthesia</strong> — ask if they have availability / can go to NCMC</li>
<li><strong>Age &gt;12 years:</strong> Call <strong>adult anesthesia at NCMC</strong> — ask if they would take the patient</li>
</ul>
<ul>
<li>If <strong>yes</strong> → Call endovascular neurosurgery</li>
<li>If <strong>no</strong> → Proceed to Step 2</li>
</ul>

<h3>Step 2 — Outside Hospitals Transfer Center — Call Multiple</h3>
<p>Call multiple simultaneously if needed.</p>
<div class="table-wrap"><table><tbody>
<tr><th>Hospital</th><th>Transfer Center</th></tr>
<tr><td>Cincinnati Children's Hospital</td><td><a href="tel:+15136369937"><strong>(513) 636-9937</strong></a></td></tr>
<tr><td>University of Kentucky Children's Hospital</td><td><a href="tel:+18592575522"><strong>(859) 257-5522</strong></a></td></tr>
<tr><td>Riley Children's Hospital</td><td><a href="tel:+13179633333"><strong>(317) 963-3333</strong></a></td></tr>
<tr><td>Vanderbilt Children's Hospital</td><td><a href="tel:+16159364444"><strong>(615) 936-4444</strong></a></td></tr>
<tr><td>Nationwide Children's Hospital</td><td><a href="tel:+16147222000"><strong>(614) 722-2000</strong></a></td></tr>
</tbody></table></div>

</div>
</section>`;

/** Replacement for the Headache & Migraine section — image-only */
const MIGRAINE_IMAGE_SECTION_HTML = `<section aria-label="Migraine Pathway — Quick Reference">
<div style="display:flex;align-items:flex-start;gap:0.875rem;background:#f0fdfa;border-left:4px solid #0d9488;border-radius:0 10px 10px 0;padding:1rem 1.25rem 1rem 1.25rem;margin:2.5rem 0 1.25rem;">
  <span style="font-size:1.75rem;line-height:1;flex-shrink:0;margin-top:0.1rem;" aria-hidden="true">🤕</span>
  <div style="flex:1;min-width:0;">
    <h2 id="migraine-pathway-quick-reference" style="margin:0 0 0.25rem;padding:0;font-size:1.1rem;font-weight:700;color:#0d9488;border:none;background:none;">Migraine Pathway — Quick Reference</h2>
    <p style="margin:0;font-size:0.75rem;color:#0d9488;opacity:0.85;">Inpatient migraine management pathway diagram (v.1.0 2020)</p>
  </div>
</div>
<div style="margin-top:1rem;">
  <figure style="margin:0;">
    <img src="/images/neuro-on-call/migraine-pathway.png" alt="Migraine Inpatient Management Pathway 2020" style="max-width:100%;border-radius:10px;border:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,0.08);display:block;margin:0 auto;" />
    <figcaption style="text-align:center;font-size:0.75rem;color:#94a3b8;margin-top:0.5rem;">Migraine Management Pathway: Inpatient v.1.0 (2020)</figcaption>
  </figure>
</div>
</section>`;

// ─────────────────────────────────────────────────────────────────────────────
// LOAD + MODIFY neuro-on-call.json
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── neuro-on-call.json ───────────────────────');
const onCall = JSON.parse(readFileSync(join(DATA, 'neuro-on-call.json'), 'utf8'));

// ── 1. Update TOC ────────────────────────────────────────────────────────────
// a) Replace headache-migraine with migraine-pathway-quick-reference
const hmIdx = onCall.toc.findIndex(t => t.id === 'headache-migraine');
if (hmIdx < 0) throw new Error('headache-migraine not found in TOC');
onCall.toc[hmIdx] = {
  level: 2,
  text: 'Migraine Pathway — Quick Reference',
  id: 'migraine-pathway-quick-reference',
};

// b) Insert LVO entry after "stroke"
const strokeIdx = onCall.toc.findIndex(t => t.id === 'stroke');
if (strokeIdx < 0) throw new Error('stroke not found in TOC');
if (!onCall.toc.find(t => t.id === 'lvo-escalation')) {
  onCall.toc.splice(strokeIdx + 1, 0, {
    level: 2,
    text: 'Pediatric LVO Escalation Pathway',
    id: 'lvo-escalation',
  });
}

console.log('✓ TOC updated:', onCall.toc.length, 'entries');
console.log('  IDs:', onCall.toc.map(t => t.id).join(', '));

// ── 2. Update HTML ────────────────────────────────────────────────────────────
let html = onCall.html;

// Find the full <section aria-label="Headache & Migraine">...</section> block
const HA_OPEN  = '<section aria-label="Headache & Migraine">';
const HA_CLOSE = '</section>';

const haStart = html.indexOf(HA_OPEN);
if (haStart < 0) throw new Error('Headache & Migraine section not found');

// Find the matching </section> — it's the first one after haStart
const haEnd = html.indexOf(HA_CLOSE, haStart) + HA_CLOSE.length;

// Build replacement: LVO section + migraine image section
const replacement = LVO_SECTION_HTML + '\n' + MIGRAINE_IMAGE_SECTION_HTML;

// Replace the whole headache section with LVO + migraine image
html = html.slice(0, haStart) + replacement + html.slice(haEnd);

onCall.html = html;
// Update imageCount: was 11, add 1 for migraine-pathway.png (already counted via docx-img)
// Actually migraine-pathway.png is the same as docx-img-1771995355864-dj96.png,
// so imageCount stays the same (11)

writeFileSync(join(DATA, 'neuro-on-call.json'), JSON.stringify(onCall, null, 2));
console.log('✓ HTML updated');
console.log('  Migraine text section removed, image-only section inserted');
console.log('  LVO section inserted after Stroke');

// ── 3. Update search.json ────────────────────────────────────────────────────
console.log('\n── search.json ──────────────────────────────');
const searchPath = join(DATA, 'search.json');
let searchData = JSON.parse(readFileSync(searchPath, 'utf8'));
const before = searchData.length;

// Remove old headache-migraine chunk and any old lvo-escalation chunk
searchData = searchData.filter(c => {
  if (c.section === 'neuro-on-call' && c.id === 'headache-migraine') return false;
  if (c.section === 'neuro-on-call' && c.id === 'lvo-escalation') return false;
  return true;
});

// Update headache chunk text if it exists under old id
// (it was removed above; we'll add the new one)

// Add new chunks
searchData.push(
  {
    section: 'neuro-on-call',
    sectionName: 'Neuro On-Call Quick References',
    heading: 'Migraine Pathway — Quick Reference',
    id: 'migraine-pathway-quick-reference',
    text: 'Migraine Inpatient Management Pathway v.1.0 (2020). Visual quick reference diagram for inpatient acute status migrainosus management.',
  },
  {
    section: 'neuro-on-call',
    sectionName: 'Neuro On-Call Quick References',
    heading: 'Pediatric LVO Escalation Pathway',
    id: 'lvo-escalation',
    text: 'Emergency escalation for suspected pediatric large vessel occlusion requiring endovascular intervention. Step 1: Call anesthesia — Age <12 Peds anesthesia, Age >12 adult anesthesia at NCMC. Step 2: Outside hospitals transfer center — Cincinnati Children\'s (513) 636-9937, University of Kentucky (859) 257-5522, Riley (317) 963-3333, Vanderbilt (615) 936-4444, Nationwide (614) 722-2000.',
  }
);

const after = searchData.length;
writeFileSync(searchPath, JSON.stringify(searchData));
writeFileSync(join(PUBLIC, 'search.json'), JSON.stringify(searchData));
console.log(`✓ search.json: ${before} → ${after} chunks`);

console.log('\n✅  All updates complete.');
console.log('Files edited:');
console.log('  src/data/neuro-on-call.json');
console.log('  src/data/search.json');
console.log('  public/search.json');
console.log('  public/images/neuro-on-call/migraine-pathway.png  (already written)');
