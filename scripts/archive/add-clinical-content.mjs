/**
 * add-clinical-content.mjs
 * Adds new clinical reference content to existing section JSON files:
 *  1. Thunderclap headache / emergent red flags → headaches.json
 *  2. Anisocoria algorithm → neuro-ophthalmology.json
 *  3. VPA toxicity management → epilepsy.json
 *  4. GBS workup protocol → neuromuscular.json
 *  5. Jitteriness vs seizures → paroxysms.json
 *
 * Also updates TOC arrays and rebuilds search.json.
 * Run: node scripts/add-clinical-content.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src', 'data');

function loadJson(name) {
  const p = path.join(DATA_DIR, name);
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function saveJson(name, data) {
  const p = path.join(DATA_DIR, name);
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
}

function headingId(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── 1. Headaches: Thunderclap Headache & Emergent Red Flags ──────────────────

console.log('\n1. Headaches — adding emergent headache content...');
{
  const data = loadJson('headaches.json');

  const newHtml = `
<h1 id="emergent-headache-evaluation">Emergent Headache Evaluation</h1>

<h2 id="thunderclap-headache">Thunderclap Headache</h2>
<p><strong>Definition:</strong> Severe headache reaching maximum intensity within 60 seconds ("worst headache of my life").</p>
<div class="red-flag-box">
<p><strong>Must rule out subarachnoid hemorrhage (SAH):</strong></p>
<ul>
<li><strong>Step 1:</strong> Non-contrast CT head — sensitivity ~98% within 6 hours of onset, drops to ~93% at 24h and ~50% by day 5</li>
<li><strong>Step 2:</strong> If CT negative and within 2 weeks of onset → <strong>lumbar puncture</strong> looking for xanthochromia (send tube 4 for spectrophotometry) and elevated RBCs that do not clear</li>
<li><strong>Step 3:</strong> If LP also negative → consider CTA or MRA to evaluate for unruptured aneurysm, cerebral venous sinus thrombosis (CVST), or reversible cerebral vasoconstriction syndrome (RCVS)</li>
</ul>
</div>

<p><strong>Differential diagnosis for thunderclap headache:</strong></p>
<ul>
<li>Subarachnoid hemorrhage (most dangerous — prevalence ~10-25% of thunderclap presentations)</li>
<li>Cerebral venous sinus thrombosis (CVST)</li>
<li>Reversible cerebral vasoconstriction syndrome (RCVS) — "Call-Fleming syndrome"</li>
<li>Pituitary apoplexy</li>
<li>Arterial dissection (carotid or vertebral)</li>
<li>Hypertensive emergency</li>
<li>Primary thunderclap headache (diagnosis of exclusion)</li>
</ul>

<h2 id="headache-red-flags-snoop">Headache Red Flags — "SNOOP" Mnemonic</h2>
<div class="red-flag-box">
<p><strong>S</strong> — Systemic symptoms (fever, weight loss, rash) or Secondary risk factors (immunocompromised, malignancy, coagulopathy)</p>
<p><strong>N</strong> — Neurologic signs (papilledema, focal deficits, altered mental status, meningismus)</p>
<p><strong>O</strong> — Onset sudden (thunderclap) or recent onset in child &lt; 5 years</p>
<p><strong>O</strong> — Other associated features: positional (worse lying down → IIH; worse standing → low-pressure), nocturnal or early morning awakening headaches, triggered by Valsalva/cough/exertion</p>
<p><strong>P</strong> — Prior headache history: new headache type, pattern change, progressive worsening, refractory to appropriate treatment</p>
</div>

<h2 id="when-to-image-pediatric-headache">When to Image a Pediatric Headache</h2>
<p><strong>Urgent imaging (CT head) indicated if:</strong></p>
<ul>
<li>Thunderclap onset</li>
<li>Focal neurologic deficits</li>
<li>Papilledema or loss of venous pulsations on fundoscopy</li>
<li>Altered mental status or worsening GCS</li>
<li>Signs of increased ICP: vomiting (especially AM), personality change, head tilt</li>
<li>Post-traumatic with "red flag" features</li>
<li>VP shunt concern</li>
</ul>
<p><strong>MRI brain (outpatient) consider if:</strong></p>
<ul>
<li>Headache always same side</li>
<li>Headache wakes from sleep or present on awakening</li>
<li>Progressive headache over weeks with new neurologic findings</li>
<li>Age &lt; 5 with new recurrent headaches</li>
<li>Neurofibromatosis (screen for optic pathway glioma)</li>
</ul>

<h2 id="idiopathic-intracranial-hypertension-workup">IIH Workup Essentials</h2>
<p><strong>Opening pressure thresholds (LP in lateral decubitus):</strong></p>
<ul>
<li>Normal: &lt; 20 cmH₂O (children) or &lt; 25 cmH₂O (adolescents/obese)</li>
<li><strong>Elevated: ≥ 25 cmH₂O</strong> (≥ 28 cmH₂O if obese/sedated)</li>
<li>Ensure child is calm, legs extended — crying can double pressure readings</li>
</ul>`;

  data.html += newHtml;

  // Add TOC entries
  const newTocEntries = [
    { level: 1, text: 'Emergent Headache Evaluation', id: 'emergent-headache-evaluation' },
    { level: 2, text: 'Thunderclap Headache', id: 'thunderclap-headache' },
    { level: 2, text: 'Headache Red Flags — "SNOOP" Mnemonic', id: 'headache-red-flags-snoop' },
    { level: 2, text: 'When to Image a Pediatric Headache', id: 'when-to-image-pediatric-headache' },
    { level: 2, text: 'IIH Workup Essentials', id: 'idiopathic-intracranial-hypertension-workup' },
  ];
  data.toc.push(...newTocEntries);

  saveJson('headaches.json', data);
  console.log('  ✓ Added emergent headache evaluation (thunderclap, SNOOP, imaging criteria, IIH)');
}

// ── 2. Neuro-Ophthalmology: Anisocoria Algorithm ────────────────────────────

console.log('\n2. Neuro-Ophthalmology — adding anisocoria algorithm...');
{
  const data = loadJson('neuro-ophthalmology.json');

  const newHtml = `
<h1 id="anisocoria-evaluation">Anisocoria Evaluation</h1>

<h2 id="anisocoria-approach">Approach to Unequal Pupils</h2>
<p><strong>Key question:</strong> Which pupil is abnormal — the large one or the small one?</p>

<div class="red-flag-box">
<p><strong>EMERGENCY: Large pupil + ptosis + eye "down and out" = CN III palsy until proven otherwise.</strong> In a post-operative or head-injured patient, this may indicate uncal herniation requiring emergent neurosurgical evaluation.</p>
</div>

<h3 id="anisocoria-in-light-vs-dark">Step 1: Examine in Light vs Dark</h3>
<ul>
<li><strong>Anisocoria greater in light</strong> (large pupil doesn't constrict) → problem is with the <strong>large pupil</strong>
  <ul>
  <li>CN III palsy (check for ptosis, eye movement limitation)</li>
  <li>Pharmacologic mydriasis (topical atropine/cyclopentolate — won't constrict to 1% pilocarpine)</li>
  <li>Traumatic mydriasis (iris sphincter damage)</li>
  <li>Tonic pupil (Adie) — vermiform movements, slow constriction, constricts to dilute 0.1% pilocarpine (denervation supersensitivity)</li>
  </ul>
</li>
<li><strong>Anisocoria greater in dark</strong> (small pupil doesn't dilate) → problem is with the <strong>small pupil</strong>
  <ul>
  <li>Horner syndrome (ptosis + miosis ± anhidrosis)</li>
  <li>Pharmacologic miosis</li>
  </ul>
</li>
<li><strong>Anisocoria equal in light and dark</strong> (~0.5-1mm) → <strong>physiologic anisocoria</strong> (present in ~20% of population, no workup needed)</li>
</ul>

<h3 id="horner-syndrome-workup">Horner Syndrome Workup</h3>
<p><strong>Confirm:</strong> Topical 4% cocaine or 0.5% apraclonidine — Horner pupil fails to dilate with cocaine (or reverses with apraclonidine).</p>
<p><strong>Localize:</strong></p>
<ul>
<li><strong>Central (1st order):</strong> Stroke, demyelination, tumor — MRI brain + cervical spine</li>
<li><strong>Preganglionic (2nd order):</strong> Pancoast tumor, neuroblastoma (pediatric!), carotid dissection — CT/MRI chest + neck</li>
<li><strong>Postganglionic (3rd order):</strong> Carotid dissection, cavernous sinus lesion — MRA head/neck</li>
</ul>
<div class="red-flag-box">
<p><strong>Pediatric Horner:</strong> Must rule out neuroblastoma (obtain urine catecholamines — HVA, VMA) and birth-related brachial plexus injury in infants. New-onset Horner in any age → imaging mandatory.</p>
</div>

<h3 id="cn-iii-palsy-evaluation">CN III Palsy — Surgical vs Medical</h3>
<ul>
<li><strong>"Surgical" (pupil-involving):</strong> Mydriasis + ptosis + limited adduction/elevation/depression → concern for posterior communicating artery (PComm) aneurysm compression. <strong>Urgent CTA/MRA.</strong></li>
<li><strong>"Medical" (pupil-sparing):</strong> Ptosis + eye movement limitation but <strong>normal pupil</strong> → microvascular (diabetes, hypertension). More common in adults; rare in children.</li>
<li><strong>In children:</strong> Pupil-sparing distinction is less reliable. Any CN III palsy in a child warrants imaging.</li>
</ul>`;

  data.html += newHtml;

  data.toc.push(
    { level: 1, text: 'Anisocoria Evaluation', id: 'anisocoria-evaluation' },
    { level: 2, text: 'Approach to Unequal Pupils', id: 'anisocoria-approach' },
    { level: 3, text: 'Examine in Light vs Dark', id: 'anisocoria-in-light-vs-dark' },
    { level: 3, text: 'Horner Syndrome Workup', id: 'horner-syndrome-workup' },
    { level: 3, text: 'CN III Palsy — Surgical vs Medical', id: 'cn-iii-palsy-evaluation' },
  );

  saveJson('neuro-ophthalmology.json', data);
  console.log('  ✓ Added anisocoria evaluation (approach, Horner workup, CN III)');
}

// ── 3. Epilepsy: VPA Toxicity Management ─────────────────────────────────────

console.log('\n3. Epilepsy — adding VPA toxicity management...');
{
  const data = loadJson('epilepsy.json');

  const newHtml = `
<h1 id="valproic-acid-toxicity">Valproic Acid (VPA) Toxicity</h1>

<h2 id="vpa-hyperammonemic-encephalopathy">VPA-Induced Hyperammonemic Encephalopathy</h2>
<p>Can occur even with therapeutic VPA levels. Suspect in any patient on VPA with acute confusion, lethargy, vomiting, or worsening seizures.</p>

<h3 id="vpa-toxicity-recognition">Recognition</h3>
<div class="red-flag-box">
<p><strong>Check ammonia level in any encephalopathic patient on valproic acid — even if VPA level is "therapeutic."</strong></p>
<ul>
<li>Ammonia &gt; 80 µmol/L — clinically significant</li>
<li>Ammonia &gt; 100 µmol/L — concerning, likely symptomatic</li>
<li>Ammonia &gt; 200 µmol/L — critical, risk of cerebral edema</li>
</ul>
<p>Also check: hepatic function panel (AST, ALT, total/direct bilirubin), VPA level, CBC with platelets, lipase</p>
</div>

<h3 id="l-carnitine-protocol">L-Carnitine Treatment Protocol</h3>
<div class="protocol-box">
<p><strong>Indication:</strong> VPA-induced hyperammonemia with encephalopathy, VPA overdose, or hepatotoxicity.</p>
<p><strong>IV Levocarnitine (Carnitor):</strong></p>
<ul>
<li><strong>Loading dose:</strong> 100 mg/kg IV (max 6 g) over 30 minutes</li>
<li><strong>Maintenance:</strong> 50 mg/kg IV (max 3 g) every 8 hours</li>
<li>Continue until ammonia normalizes and mental status improves</li>
<li>Transition to oral: 50-100 mg/kg/day divided TID (max 3 g/day)</li>
</ul>
<p><strong>Additional management:</strong></p>
<ul>
<li>Hold VPA immediately</li>
<li>Consider lactulose if ammonia critically elevated (&gt; 200 µmol/L)</li>
<li>Monitor ammonia every 4-6 hours until trending down</li>
<li>If on VPA + other enzyme inducers (phenytoin, carbamazepine, phenobarbital) → higher risk of carnitine depletion</li>
</ul>
</div>

<h3 id="vpa-overdose-management">VPA Overdose</h3>
<ul>
<li><strong>VPA level &gt; 150 mg/L:</strong> Significant toxicity likely — L-carnitine, supportive care</li>
<li><strong>VPA level &gt; 300 mg/L:</strong> Severe — consider hemodialysis (VPA is protein-bound at therapeutic levels but saturation occurs at high concentrations, making dialysis more effective)</li>
<li><strong>VPA level &gt; 850 mg/L:</strong> Life-threatening — hemodialysis strongly recommended</li>
<li>Activated charcoal if within 1-2 hours of ingestion (VPA is well-absorbed)</li>
<li>No specific antidote — L-carnitine is the primary treatment adjunct</li>
</ul>`;

  data.html += newHtml;

  data.toc.push(
    { level: 1, text: 'Valproic Acid (VPA) Toxicity', id: 'valproic-acid-toxicity' },
    { level: 2, text: 'VPA-Induced Hyperammonemic Encephalopathy', id: 'vpa-hyperammonemic-encephalopathy' },
    { level: 3, text: 'Recognition', id: 'vpa-toxicity-recognition' },
    { level: 3, text: 'L-Carnitine Treatment Protocol', id: 'l-carnitine-protocol' },
    { level: 3, text: 'VPA Overdose', id: 'vpa-overdose-management' },
  );

  saveJson('epilepsy.json', data);
  console.log('  ✓ Added VPA toxicity (hyperammonemia, L-carnitine protocol, overdose management)');
}

// ── 4. Neuromuscular: GBS Workup Protocol ────────────────────────────────────

console.log('\n4. Neuromuscular — adding GBS workup protocol...');
{
  const data = loadJson('neuromuscular.json');

  // Find the end of the GBS section (before next h1)
  const $ = cheerio.load(data.html, { decodeEntities: false });

  const newHtml = `
<h2 id="gbs-acute-workup">GBS — Acute Workup & Management Protocol</h2>

<h3 id="gbs-diagnosis">Diagnostic Workup</h3>
<div class="protocol-box">
<p><strong>Lumbar Puncture:</strong></p>
<ul>
<li>Classic finding: <strong>albuminocytologic dissociation</strong> (elevated protein, normal WBC &lt; 10/µL)</li>
<li>CSF protein may be <strong>normal in the first week</strong> — sensitivity improves after day 7</li>
<li>If WBC &gt; 50/µL → reconsider diagnosis (think infectious, HIV, Lyme, CMV)</li>
</ul>
<p><strong>NCS/EMG:</strong></p>
<ul>
<li>May be <strong>normal in first 1-2 weeks</strong></li>
<li>Optimal timing: <strong>2-3 weeks after symptom onset</strong></li>
<li>Early findings: prolonged F-waves, prolonged distal latencies, absent H-reflexes</li>
<li>Helps classify subtype: AIDP (demyelinating, most common) vs AMAN/AMSAN (axonal)</li>
</ul>
<p><strong>Additional labs:</strong> Anti-ganglioside antibodies (anti-GM1, anti-GD1a, anti-GQ1b for Miller Fisher variant), Lyme serology, HIV if risk factors</p>
</div>

<h3 id="gbs-respiratory-monitoring">Respiratory Monitoring — "20/30/40 Rule"</h3>
<div class="red-flag-box">
<p><strong>Monitor FVC (forced vital capacity) every 4-6 hours in all GBS patients:</strong></p>
<ul>
<li><strong>FVC &lt; 20 mL/kg</strong> → consider ICU transfer / intubation</li>
<li><strong>NIF (MIP) &lt; -30 cmH₂O</strong> → respiratory muscles weakening</li>
<li><strong>FVC declining &gt; 30%</strong> from baseline → rapid progression, prepare for intubation</li>
</ul>
<p><strong>Other intubation indicators:</strong> inability to count to 20 in one breath, paradoxical abdominal breathing, oxygen desaturation, inability to lift head off bed</p>
<p><strong>Do NOT rely on pulse oximetry alone</strong> — desaturation is a LATE finding in neuromuscular respiratory failure.</p>
</div>

<h3 id="gbs-treatment-protocol">Treatment Protocol</h3>
<div class="protocol-box">
<p><strong>IVIG (first-line in pediatrics):</strong></p>
<ul>
<li><strong>Dose: 2 g/kg total</strong>, given over 2-5 days (e.g., 0.4 g/kg/day × 5 days)</li>
<li>Check IgA level before first dose (IgA deficiency → anaphylaxis risk)</li>
<li>Monitor for adverse effects: headache, aseptic meningitis, renal dysfunction, thrombosis</li>
</ul>
<p><strong>Plasmapheresis (PLEX):</strong></p>
<ul>
<li>Alternative to IVIG — equally effective in severe cases</li>
<li>Typically 5 exchanges over 1-2 weeks</li>
<li>Preferred if IVIG contraindicated or patient not improving</li>
<li><strong>Do NOT give IVIG after PLEX</strong> (PLEX removes the IVIG)</li>
</ul>
<p><strong>Steroids are NOT effective in GBS</strong> (unlike CIDP)</p>
<p><strong>Supportive:</strong> DVT prophylaxis, pain management (neuropathic pain common — gabapentin), monitor for autonomic instability (BP swings, arrhythmia), early PT/OT</p>
</div>`;

  // Insert after the first GBS heading's content and before "Neonatal Hypotonia"
  const neonatalH1 = $('h1#neonatal-hypotonia-etiology-and-exam');
  if (neonatalH1.length > 0) {
    neonatalH1.before(newHtml);
    data.html = $('body').html() || data.html;
  } else {
    // Fallback: append to end
    data.html += newHtml;
  }

  // Insert TOC entries after GBS entry
  const gbsIdx = data.toc.findIndex(t => t.id === 'guillain-barre-syndrome-gbs');
  const newTocEntries = [
    { level: 2, text: 'GBS — Acute Workup & Management Protocol', id: 'gbs-acute-workup' },
    { level: 3, text: 'Diagnostic Workup', id: 'gbs-diagnosis' },
    { level: 3, text: 'Respiratory Monitoring — "20/30/40 Rule"', id: 'gbs-respiratory-monitoring' },
    { level: 3, text: 'Treatment Protocol', id: 'gbs-treatment-protocol' },
  ];
  if (gbsIdx >= 0) {
    data.toc.splice(gbsIdx + 1, 0, ...newTocEntries);
  } else {
    data.toc.push(...newTocEntries);
  }

  saveJson('neuromuscular.json', data);
  console.log('  ✓ Added GBS workup protocol (diagnosis, respiratory monitoring, IVIG/PLEX)');
}

// ── 5. Paroxysms: Jitteriness vs Seizures ────────────────────────────────────

console.log('\n5. Paroxysms — adding jitteriness vs seizures table...');
{
  const data = loadJson('paroxysms.json');

  const newHtml = `
<h1 id="neonatal-jitteriness-vs-seizures">Neonatal Jitteriness vs Seizures</h1>

<p>One of the most common consult questions in the nursery/NICU. Key clinical features distinguish jitteriness (benign) from seizures (requires workup).</p>

<div class="table-wrap"><table>
<thead>
<tr>
<th>Feature</th>
<th>Jitteriness</th>
<th>Seizure</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>Movement type</strong></td>
<td>Tremor (equal amplitude, frequency in both directions)</td>
<td>Clonic (fast phase in one direction, slow return)</td>
</tr>
<tr>
<td><strong>Stimulus-sensitive</strong></td>
<td>Yes — provoked or worsened by stimulation</td>
<td>No — occurs spontaneously</td>
</tr>
<tr>
<td><strong>Suppressible with flexion/restraint</strong></td>
<td>Yes — stops when limb is gently held</td>
<td>No — continues despite restraint</td>
</tr>
<tr>
<td><strong>Eye deviation</strong></td>
<td>Absent</td>
<td>May have tonic eye deviation or nystagmus</td>
</tr>
<tr>
<td><strong>Autonomic changes</strong></td>
<td>Absent</td>
<td>May have HR/BP changes, desaturations, apnea</td>
</tr>
<tr>
<td><strong>Level of consciousness</strong></td>
<td>Alert, normal</td>
<td>May be altered (obtunded, poorly responsive)</td>
</tr>
<tr>
<td><strong>Dominant movement</strong></td>
<td>Rhythmic, symmetric, fine/rapid</td>
<td>Rhythmic but may be asymmetric; can be subtle (lip smacking, eye fluttering, cycling)</td>
</tr>
<tr>
<td><strong>EEG correlation</strong></td>
<td>No epileptiform activity</td>
<td>Usually has electrographic correlate (though some seizures are electrographic-only)</td>
</tr>
</tbody>
</table></div>

<h2 id="neonatal-jitteriness-causes">Common Causes of Neonatal Jitteriness</h2>
<ul>
<li>Hypoglycemia (check glucose!)</li>
<li>Hypocalcemia</li>
<li>Neonatal drug withdrawal (maternal SSRI, opioids)</li>
<li>Hypothermia</li>
<li>Sepsis (can also cause seizures — low threshold to work up)</li>
<li>Idiopathic / benign neonatal jitteriness (diagnosis of exclusion)</li>
</ul>

<h2 id="neonatal-seizure-workup">If Seizure Suspected — Initial Workup</h2>
<div class="protocol-box">
<p><strong>Stat labs:</strong> Glucose, BMP (calcium, magnesium, sodium), blood gas, lactate</p>
<p><strong>Infection workup:</strong> CBC, blood culture, consider LP (CSF studies + HSV PCR)</p>
<p><strong>EEG:</strong> Continuous video EEG monitoring if seizure confirmed or ongoing suspicion</p>
<p><strong>Imaging:</strong> Head ultrasound (bedside), MRI brain when stable</p>
<p><strong>Consider:</strong> Urine organic acids, serum amino acids, ammonia if metabolic etiology suspected</p>
<p><strong>First-line treatment:</strong> Phenobarbital 20 mg/kg IV loading dose</p>
</div>`;

  data.html += newHtml;

  data.toc.push(
    { level: 1, text: 'Neonatal Jitteriness vs Seizures', id: 'neonatal-jitteriness-vs-seizures' },
    { level: 2, text: 'Common Causes of Neonatal Jitteriness', id: 'neonatal-jitteriness-causes' },
    { level: 2, text: 'If Seizure Suspected — Initial Workup', id: 'neonatal-seizure-workup' },
  );

  saveJson('paroxysms.json', data);
  console.log('  ✓ Added jitteriness vs seizures (differentiation table, causes, neonatal seizure workup)');
}

// ── 6. Rebuild search.json ───────────────────────────────────────────────────

console.log('\n6. Rebuilding search.json...');
{
  const searchPath = path.join(DATA_DIR, 'search.json');
  const searchData = JSON.parse(fs.readFileSync(searchPath, 'utf-8'));

  // Build new search chunks for the new content
  const sectionsToUpdate = [
    'headaches.json',
    'neuro-ophthalmology.json',
    'epilepsy.json',
    'neuromuscular.json',
    'paroxysms.json',
  ];

  for (const file of sectionsToUpdate) {
    const data = loadJson(file);
    const $ = cheerio.load(data.html, { decodeEntities: false });

    // Find new heading IDs we added
    const newIds = new Set();
    if (file === 'headaches.json') {
      newIds.add('emergent-headache-evaluation');
      newIds.add('thunderclap-headache');
      newIds.add('headache-red-flags-snoop');
      newIds.add('when-to-image-pediatric-headache');
      newIds.add('idiopathic-intracranial-hypertension-workup');
    } else if (file === 'neuro-ophthalmology.json') {
      newIds.add('anisocoria-evaluation');
      newIds.add('anisocoria-approach');
      newIds.add('anisocoria-in-light-vs-dark');
      newIds.add('horner-syndrome-workup');
      newIds.add('cn-iii-palsy-evaluation');
    } else if (file === 'epilepsy.json') {
      newIds.add('valproic-acid-toxicity');
      newIds.add('vpa-hyperammonemic-encephalopathy');
      newIds.add('vpa-toxicity-recognition');
      newIds.add('l-carnitine-protocol');
      newIds.add('vpa-overdose-management');
    } else if (file === 'neuromuscular.json') {
      newIds.add('gbs-acute-workup');
      newIds.add('gbs-diagnosis');
      newIds.add('gbs-respiratory-monitoring');
      newIds.add('gbs-treatment-protocol');
    } else if (file === 'paroxysms.json') {
      newIds.add('neonatal-jitteriness-vs-seizures');
      newIds.add('neonatal-jitteriness-causes');
      newIds.add('neonatal-seizure-workup');
    }

    // For each new heading, create a search chunk
    $('h1[id], h2[id], h3[id]').each(function () {
      const id = $(this).attr('id');
      if (!newIds.has(id)) return;

      const heading = $(this).text().trim();

      // Collect text until next heading
      let text = '';
      let el = $(this).next();
      while (el.length && !el.is('h1, h2, h3')) {
        text += el.text().trim() + ' ';
        el = el.next();
      }
      text = text.trim().slice(0, 500);

      searchData.push({
        section: data.slug,
        sectionName: data.name,
        heading,
        id,
        text,
      });
    });
  }

  fs.writeFileSync(searchPath, JSON.stringify(searchData, null, 2), 'utf-8');

  // Also copy to public
  const publicSearchPath = path.join(ROOT, 'public', 'search.json');
  if (fs.existsSync(publicSearchPath)) {
    fs.writeFileSync(publicSearchPath, JSON.stringify(searchData, null, 2), 'utf-8');
  }

  console.log(`  ✓ Search index updated (${searchData.length} total chunks)`);
}

// ── 7. Update index.json counts ──────────────────────────────────────────────

console.log('\n7. Updating index.json counts...');
{
  const indexData = loadJson('index.json');

  for (const entry of indexData) {
    const sectionPath = path.join(DATA_DIR, `${entry.slug}.json`);
    if (!fs.existsSync(sectionPath)) continue;
    const sectionData = JSON.parse(fs.readFileSync(sectionPath, 'utf-8'));
    entry.tocCount = sectionData.toc.length;
    entry.imageCount = sectionData.imageCount || 0;
  }

  saveJson('index.json', indexData);
  console.log('  ✓ index.json tocCounts updated');
}

console.log('\n── Done! ──\n');
