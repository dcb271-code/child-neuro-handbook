/**
 * update-content.mjs
 * Applies two manual content updates:
 *   1. Stroke section — append "Pediatric LVO Escalation Pathway"
 *   2. Headaches section — insert clean "Inpatient Migraine Management" protocol
 *                        + clean up sparse placeholder content in Emergency Headache Treatment
 * Then rebuilds search.json for both sections.
 *
 * Run: node scripts/update-content.mjs
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const ROOT       = path.resolve(__dirname, '..');
const DATA_DIR   = path.join(ROOT, 'src', 'data');
const PUBLIC_DIR = path.join(ROOT, 'public');

// ─────────────────────────────────────────────────────────────────────────────
// STROKE  — Pediatric LVO Escalation Pathway
// ─────────────────────────────────────────────────────────────────────────────

const LVO_TOC = [
  { level: 1, text: 'Pediatric LVO Escalation Pathway', id: 'pediatric-lvo-escalation-pathway' },
  { level: 2, text: 'Step 1 — Call Anesthesia',                  id: 'lvo-step-1-anesthesia' },
  { level: 2, text: 'Step 2 — Outside Hospitals Transfer Center', id: 'lvo-step-2-transfer'  },
];

const LVO_HTML = `
<h1 id="pediatric-lvo-escalation-pathway">Pediatric LVO Escalation Pathway</h1>
<p>Emergency escalation protocol for suspected pediatric large vessel occlusion requiring endovascular intervention. <strong>On-call emergency reference — act quickly and call multiple hospitals simultaneously if needed.</strong></p>

<h2 id="lvo-step-1-anesthesia">Step 1 — Call Anesthesia</h2>
<ul>
<li><strong>Age &lt;12 years:</strong> Call <strong>Peds anesthesia</strong> — ask if they have availability/can go to NCMC</li>
<li><strong>Age &gt;12 years:</strong> Call <strong>adult anesthesia at NCMC</strong> — ask if they would take patient</li>
</ul>
<ul>
<li>If <strong>yes →</strong> Call endovascular neurosurgery</li>
<li>If <strong>no →</strong> Proceed to Step 2 (outside hospitals)</li>
</ul>

<h2 id="lvo-step-2-transfer">Step 2 — Outside Hospitals Transfer Center — Call Multiple</h2>
<div class="table-wrap"><table><tbody>
<tr><th>Hospital</th><th>Transfer Center</th></tr>
<tr><td>Cincinnati Children's Hospital</td><td><a href="tel:+15136369937"><strong>(513) 636-9937</strong></a></td></tr>
<tr><td>University of Kentucky Children's Hospital</td><td><a href="tel:+18592575522"><strong>(859) 257-5522</strong></a></td></tr>
<tr><td>Riley Children's Hospital</td><td><a href="tel:+13179633333"><strong>(317) 963-3333</strong></a></td></tr>
<tr><td>Vanderbilt Children's Hospital</td><td><a href="tel:+16159364444"><strong>(615) 936-4444</strong></a></td></tr>
<tr><td>Nationwide Children's Hospital <em>(Outside Network)</em></td><td><a href="tel:+16147222000"><strong>(614) 722-2000</strong></a></td></tr>
</tbody></table></div>
`.trim();

const LVO_CHUNKS = [
  {
    heading: 'Pediatric LVO Escalation Pathway',
    id: 'pediatric-lvo-escalation-pathway',
    text: 'Emergency escalation protocol for pediatric large vessel occlusion. Step 1: Call anesthesia — age <12 call Peds anesthesia, age >12 call adult anesthesia at NCMC. If yes, call endovascular neurosurgery. If no, proceed to outside hospitals.',
  },
  {
    heading: 'Step 2 — Outside Hospitals Transfer Center',
    id: 'lvo-step-2-transfer',
    text: "Cincinnati Children's (513) 636-9937 · UK Children's (859) 257-5522 · Riley Children's (317) 963-3333 · Vanderbilt Children's (615) 936-4444 · Nationwide Children's (614) 722-2000",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HEADACHES — Inpatient Migraine Management — Status Migrainosus
// ─────────────────────────────────────────────────────────────────────────────

const MIGRAINE_TOC = [
  { level: 1, text: 'Inpatient Migraine Management',             id: 'inpatient-migraine-management'  },
  { level: 2, text: 'Inclusion & Exclusion',                     id: 'migraine-inclusion-exclusion'   },
  { level: 2, text: 'Baseline Checks',                           id: 'migraine-baseline-checks'       },
  { level: 2, text: 'ED Environment & Fluids',                   id: 'migraine-ed-environment'        },
  { level: 2, text: 'Stepwise Acute Treatment (ED)',             id: 'migraine-stepwise-treatment'    },
  { level: 3, text: 'Step 1 — First Cocktail',                  id: 'migraine-step-1'                },
  { level: 3, text: 'Step 2 — Add VPA If Needed',               id: 'migraine-step-2'                },
  { level: 3, text: 'Step 3 — Persistent Pain',                 id: 'migraine-step-3'                },
  { level: 2, text: 'Inpatient (Neurology)',                     id: 'migraine-inpatient'             },
  { level: 3, text: 'Step 4 — General Inpatient',               id: 'migraine-step-4'                },
  { level: 3, text: 'Step 5 — Magnesium / VPA',                 id: 'migraine-step-5'                },
  { level: 3, text: 'Step 6 — DHE Protocol',                    id: 'migraine-step-6'                },
  { level: 2, text: 'Discharge',                                 id: 'migraine-discharge'             },
];

const MIGRAINE_HTML = `
<h1 id="inpatient-migraine-management">Inpatient Migraine Management — Status Migrainosus</h1>
<p><em>Acute Status Migrainosus (pediatric). Not for chronic daily HA/chronic migraine — individualize those; goal is not necessarily 0/10. Call Neuro for complex cases.</em></p>

<h2 id="migraine-inclusion-exclusion">Inclusion &amp; Exclusion</h2>
<ul>
<li><strong>Include:</strong> Migraine per ICHD-3 criteria</li>
<li><strong>Exclude / call Neuro stat:</strong> New migraine with brainstem aura, hemiplegic migraine, or retinal migraine; secondary HA (IIH, other systemic cause)</li>
</ul>

<h2 id="migraine-baseline-checks">Baseline Checks</h2>
<ul>
<li>Full medication history including recent HA meds; assess for medication overuse</li>
<li>Screen for pregnancy, liver/renal disease, CV disease, uncontrolled HTN</li>
<li><strong>Avoid triptans/DHE in:</strong> CV disease/CVA/PVD, brainstem/hemiplegic/retinal migraine, recent triptan/DHE per standard intervals</li>
</ul>

<h2 id="migraine-ed-environment">ED Environment &amp; Fluids</h2>
<ul>
<li>Quiet dark room; no screens; normal sleep/meals; encourage ambulation</li>
<li><strong>NS bolus</strong> 20 mL/kg IV (max 1 L) unless contraindicated</li>
</ul>

<h2 id="migraine-stepwise-treatment">Stepwise Acute Treatment (ED)</h2>

<h3 id="migraine-step-1">Step 1 — First Cocktail</h3>
<ul>
<li><strong>Diphenhydramine</strong> 1 mg/kg IV (max 25 mg) — give 15–30 min <em>before</em> antidopaminergic</li>
<li><strong>Prochlorperazine</strong> 0.15 mg/kg IV (max 10 mg) — or <strong>Metoclopramide</strong> 0.15 mg/kg IV (max 10 mg) if unavailable</li>
<li><strong>Ketorolac</strong> 0.5 mg/kg IV (max 30 mg) if no NSAID in past 6h</li>
<li>Start ½ maintenance IVF</li>
<li>Reassess at 30–60 min</li>
</ul>

<h3 id="migraine-step-2">Step 2 — Add VPA If Needed</h3>
<ul>
<li>If HA resolved: consider discharge</li>
<li>If persists and urine HCG negative (if indicated): <strong>Valproate</strong> 20 mg/kg IV over 5 min (max 1,000 mg)</li>
<li>May repeat migraine cocktail up to 3 total doses in 24h</li>
<li>Reassess 30–60 min later</li>
</ul>

<h3 id="migraine-step-3">Step 3 — Persistent Pain</h3>
<ul>
<li>If improved: discharge with <strong>VPA 10 mg/kg/day PO divided BID (max 500 mg/day)</strong> × 1–2 weeks + Neuro f/u 2–4 weeks</li>
<li>If still refractory: <strong>admit; call Neuro</strong></li>
</ul>

<h2 id="migraine-inpatient">Inpatient (Neurology)</h2>

<h3 id="migraine-step-4">Step 4 — General Inpatient</h3>
<ul>
<li>Admit to Neuro; quiet/dark room, restricted screens, normal sleep/eating, ambulation</li>
<li>Continue ½ maintenance IVF</li>
<li>May repeat migraine cocktail q6h (total ≤ 3 doses since ED)</li>
</ul>

<h3 id="migraine-step-5">Step 5 — Magnesium / VPA</h3>
<ul>
<li><strong>MgSO₄</strong> 30 mg/kg IV over 30 min (max 2 g) if Mg ≤ 2.3; check Mg and BP before/during/after; repeat once after 2h if still needed and level ≤ 2.3</li>
<li>Consider repeat <strong>Valproate</strong> 20 mg/kg IV (max 1,000 mg)</li>
</ul>

<h3 id="migraine-step-6">Step 6 — DHE Protocol</h3>
<p><strong>Contraindications — avoid with:</strong> recent triptan (≤ 24h), MAOIs/ARVs/macrolides, CV disease, non-migraine HA. Pre-treat with antiemetic ± diphenhydramine.</p>
<ul>
<li>IV DHE: start low (<strong>0.1–0.25 mg</strong>), titrate q8h up to <strong>1 mg/dose</strong> per institutional max</li>
<li>Monitor BP q15 min before and 15 min after each dose; watch for chest pain, N/V, cold/ischemic extremities, paresthesias</li>
<li>Response often after ~5th dose; transient early worsening is <em>not</em> a reason to stop</li>
<li>Aim for 1–2 doses beyond 0/10 if tolerated</li>
</ul>
<p><strong>Other options:</strong> Consider triptan if not yet used and no contraindications. Steroids: <strong>dexamethasone</strong> 0.25–0.5 mg/kg or <strong>methylprednisolone</strong> 1 mg/kg (counsel re AVN risk). Avoid opioids/barbiturates. Consider early Behavioral Health referral and acupuncture.</p>

<h2 id="migraine-discharge">Discharge</h2>
<ul>
<li>Goal for status migrainosus: near/at 0/10 pain</li>
<li>Provide preventive and abortive home regimen</li>
<li>If effective IV VPA: discharge with <strong>VPA 10 mg/kg/day PO BID (max 500 mg/day)</strong> × 2 weeks</li>
<li>Clear return precautions and scheduled Neuro HA clinic follow-up</li>
</ul>
`.trim();

const MIGRAINE_CHUNKS = [
  {
    heading: 'Inpatient Migraine Management — Status Migrainosus',
    id: 'inpatient-migraine-management',
    text: 'Acute Status Migrainosus pediatric protocol. Not for chronic daily HA. Inclusion: Migraine per ICHD-3. Exclude: brainstem aura, hemiplegic, retinal migraine, secondary HA.',
  },
  {
    heading: 'Baseline Checks',
    id: 'migraine-baseline-checks',
    text: 'Full med history, recent HA meds, medication overuse. Screen pregnancy, liver/renal, CV disease, HTN. Avoid triptans/DHE in CV/CVA/PVD, brainstem/hemiplegic/retinal migraine.',
  },
  {
    heading: 'Step 1 — First Cocktail',
    id: 'migraine-step-1',
    text: 'Diphenhydramine 1 mg/kg IV max 25 mg (15-30 min before antidopaminergic). Prochlorperazine 0.15 mg/kg IV max 10 mg OR Metoclopramide 0.15 mg/kg IV max 10 mg. Ketorolac 0.5 mg/kg IV max 30 mg if no NSAID in past 6h. Start half mIVF. Reassess 30-60 min.',
  },
  {
    heading: 'Step 2 — Add VPA If Needed',
    id: 'migraine-step-2',
    text: 'If persists: Valproate 20 mg/kg IV over 5 min max 1000 mg. May repeat cocktail up to 3 doses in 24h. Reassess 30-60 min.',
  },
  {
    heading: 'Step 3 — Persistent Pain',
    id: 'migraine-step-3',
    text: 'If improved: discharge VPA 10 mg/kg/day PO divided BID max 500 mg/day x 1-2 weeks + Neuro f/u. If refractory: admit, call Neuro.',
  },
  {
    heading: 'Step 5 — Magnesium / VPA',
    id: 'migraine-step-5',
    text: 'MgSO4 30 mg/kg IV over 30 min max 2g if Mg ≤2.3. Check Mg and BP before/during/after. Repeat once after 2h if needed. Consider repeat Valproate 20 mg/kg IV max 1000 mg.',
  },
  {
    heading: 'Step 6 — DHE Protocol',
    id: 'migraine-step-6',
    text: 'IV DHE start 0.1-0.25 mg, titrate q8h to 1 mg/dose. Monitor BP q15 min. Response often after ~5th dose. Contraindicated: recent triptan ≤24h, MAOIs/ARVs/macrolides, CV disease. Other options: triptan, dexamethasone 0.25-0.5 mg/kg, methylprednisolone 1 mg/kg.',
  },
  {
    heading: 'Discharge — Status Migrainosus',
    id: 'migraine-discharge',
    text: 'Goal near/at 0/10 pain. If effective IV VPA: discharge VPA 10 mg/kg/day PO BID max 500 mg/day x 2 weeks. Clear return precautions. Scheduled Neuro HA clinic follow-up.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf-8'));
}

function writeJson(name, data) {
  fs.writeFileSync(path.join(DATA_DIR, name), JSON.stringify(data, null, 2));
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. UPDATE STROKE
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n── Stroke: adding Pediatric LVO Escalation Pathway ──');

const stroke = readJson('stroke.json');

// Remove any pre-existing LVO entries (idempotent)
stroke.toc = stroke.toc.filter(t => !t.id.startsWith('lvo-') && t.id !== 'pediatric-lvo-escalation-pathway');
stroke.toc.push(...LVO_TOC);

// Append HTML (strip any previous LVO block first)
const LVO_ANCHOR = '<h1 id="pediatric-lvo-escalation-pathway">';
if (stroke.html.includes(LVO_ANCHOR)) {
  stroke.html = stroke.html.slice(0, stroke.html.indexOf(LVO_ANCHOR)).trimEnd();
}
stroke.html = stroke.html.trimEnd() + '\n\n' + LVO_HTML;

stroke.chunkCount = 11 + LVO_CHUNKS.length; // original 11 + 2 new
writeJson('stroke.json', stroke);
console.log(`  ✓ stroke.json updated — ${stroke.toc.length} TOC entries`);

// ─────────────────────────────────────────────────────────────────────────────
// 2. UPDATE HEADACHES
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n── Headaches: inserting Inpatient Migraine Management ──');

const headaches = readJson('headaches.json');

// Remove any pre-existing migraine-inpatient entries (idempotent)
headaches.toc = headaches.toc.filter(t => !t.id.startsWith('migraine-') && t.id !== 'inpatient-migraine-management');

// Insert the new TOC entries just before the "emergency-headache-treatment" entry
const ehIdx = headaches.toc.findIndex(t => t.id === 'emergency-headache-treatment');
if (ehIdx !== -1) {
  headaches.toc.splice(ehIdx, 0, ...MIGRAINE_TOC);
} else {
  headaches.toc.push(...MIGRAINE_TOC);
}

// Insert the migraine HTML block just before the Emergency Headache Treatment h1
const EH_ANCHOR = '<h1 id="emergency-headache-treatment">';
const MIGRAINE_ANCHOR = '<h1 id="inpatient-migraine-management">';

// Remove any previous insertion (idempotent)
if (headaches.html.includes(MIGRAINE_ANCHOR)) {
  headaches.html = headaches.html.slice(0, headaches.html.indexOf(MIGRAINE_ANCHOR)).trimEnd()
    + headaches.html.slice(headaches.html.indexOf(EH_ANCHOR));
}

// Also clean up the sparse placeholder content within Emergency Headache Treatment:
// Replace the empty "Status Migrainosus/Migraine Clinical Pathways" and "Headache Clinical Pathway"
// placeholder paragraphs (which were the unrendered image-based content) with a clean reference note.
const SPARSE_START = '<p><strong>Status Migrainosus/Migraine Clinical Pathways for Emergency/UC and inpatient</strong></p>';
const KETAMINE_START = '<p><strong>INTRANASAL KETAMINE FOR STATUS MIGRAINOSUS</strong></p>';

if (headaches.html.includes(SPARSE_START) && headaches.html.includes(KETAMINE_START)) {
  const before = headaches.html.slice(0, headaches.html.indexOf(SPARSE_START));
  const after  = headaches.html.slice(headaches.html.indexOf(KETAMINE_START));
  const SEE_NOTE = '<p><em>See <strong>Inpatient Migraine Management — Status Migrainosus</strong> above for the full stepwise protocol.</em></p>\n';
  headaches.html = before + SEE_NOTE + after;
  console.log('  ✓ Cleaned up sparse Emergency Headache Treatment placeholder content');
}

// Now insert the migraine HTML block
if (headaches.html.includes(EH_ANCHOR)) {
  headaches.html = headaches.html.replace(EH_ANCHOR, MIGRAINE_HTML + '\n\n' + EH_ANCHOR);
} else {
  headaches.html = headaches.html.trimEnd() + '\n\n' + MIGRAINE_HTML;
}

headaches.chunkCount = 13 + MIGRAINE_CHUNKS.length;
writeJson('headaches.json', headaches);
console.log(`  ✓ headaches.json updated — ${headaches.toc.length} TOC entries`);

// ─────────────────────────────────────────────────────────────────────────────
// 3. UPDATE SEARCH.JSON
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n── Updating search.json ──');

const searchPath   = path.join(DATA_DIR, 'search.json');
const allChunks    = JSON.parse(fs.readFileSync(searchPath, 'utf-8'));

// Remove and re-add stroke + headaches chunks
const kept = allChunks.filter(c => c.section !== 'stroke' && c.section !== 'headaches');

// Re-read the full stroke/headaches data to rebuild their full chunk list
// (We only ADD the new chunks rather than regenerating all existing ones,
//  because the existing chunks are fine — we just append the new ones.)
const existingStroke    = allChunks.filter(c => c.section === 'stroke');
const existingHeadaches = allChunks.filter(c => c.section === 'headaches');

// Remove any previous LVO / migraine-inpatient chunks (idempotent)
const cleanedStroke = existingStroke.filter(c =>
  !c.id?.startsWith('lvo-') && c.id !== 'pediatric-lvo-escalation-pathway'
);
const cleanedHeadaches = existingHeadaches.filter(c =>
  !c.id?.startsWith('migraine-') && c.id !== 'inpatient-migraine-management'
);

const newLvoChunks      = LVO_CHUNKS.map(c => ({ section: 'stroke',    sectionName: 'Stroke',    ...c }));
const newMigraineChunks = MIGRAINE_CHUNKS.map(c => ({ section: 'headaches', sectionName: 'Headaches', ...c }));

const updatedChunks = [
  ...kept,
  ...cleanedStroke,    ...newLvoChunks,
  ...cleanedHeadaches, ...newMigraineChunks,
];

fs.writeFileSync(searchPath, JSON.stringify(updatedChunks, null, 2));
fs.copyFileSync(searchPath, path.join(PUBLIC_DIR, 'search.json'));
console.log(`  ✓ search.json updated — ${updatedChunks.length} total chunks`);

console.log('\n✅  Content update complete.');
