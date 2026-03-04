import fs from 'fs';

const fp = 'src/data/epilepsy.json';
const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
let h = d.html;

// Find img-20
const re20 = /<img[^>]*src="\/images\/epilepsy\/img-20\.png"[^>]*>/;
const match20 = h.match(re20);
if (!match20) { console.log('img-20 NOT FOUND'); process.exit(1); }
console.log('Found img-20:', match20[0].substring(0, 80));

const newContent = `
<h2 id="is-epidemiology">Infantile Spasms \u2013 Epidemiology and Etiology</h2>

<h3 id="is-epidemiology-details">Epidemiology</h3>
<div class="table-wrap"><table>
<thead><tr><th>Feature</th><th>Details</th></tr></thead>
<tbody>
<tr><td><strong>Incidence</strong></td><td>\u22482\u20133 per 10,000 live births.</td></tr>
<tr><td><strong>Usual age of onset</strong></td><td>4\u20139 months (almost all before 1 year).</td></tr>
<tr><td><strong>Sex</strong></td><td>Slight male predominance.</td></tr>
</tbody>
</table></div>

<h3 id="is-etiology">Etiology</h3>
<div class="table-wrap"><table>
<thead><tr><th>Category</th><th>Notes / examples</th></tr></thead>
<tbody>
<tr><td><strong>Known cause (~70%)</strong></td><td>Perinatal HIE, neurocutaneous disorders, brain malformations, chromosomal abnormalities, inborn errors of metabolism (&gt;200 causes).</td></tr>
<tr><td><strong>Unknown cause (~30%)</strong></td><td>No clear etiology despite evaluation.</td></tr>
<tr><td><strong>Selected predisposing conditions</strong></td><td>Aicardi syndrome; CMV; hemimegalencephaly; HIE; incontinentia pigmenti; lissencephaly; Sturge\u2013Weber; PKU; TSC; trisomy 21; ARX\u2011related disorders.</td></tr>
</tbody>
</table></div>

<h3 id="is-eeg-strategy">EEG Requirements and Repeat\u2011EEG Strategy</h3>
<div class="table-wrap"><table>
<thead><tr><th>Step</th><th>Key points</th></tr></thead>
<tbody>
<tr><td><strong>Diagnostic EEG</strong></td><td>Before diagnosing IS, obtain EEG showing hypsarhythmia, modified hypsarhythmia, or ictal EEG pattern of spasms. Not all patients have classic hypsarhythmia, especially early.</td></tr>
<tr><td><strong>Adequate recording</strong></td><td>EEG must include both wake and sleep (at least one sleep\u2013wake cycle).</td></tr>
<tr><td><strong>If initial routine EEG is nondiagnostic and no clear alternative diagnosis</strong></td><td>Perform prolonged same\u2011day overnight video\u2011EEG to capture clinical events and interictal activity in wake and all sleep stages.</td></tr>
<tr><td><strong>If spells began within past 7 days and first study is nondiagnostic</strong></td><td>Early EEG can be falsely negative if no spells are captured. If episodes continue, repeat EEG with at least one sleep\u2013wake cycle in 3\u20135 days.</td></tr>
</tbody>
</table></div>

<h3 id="is-first-line-treatments">First\u2011Line IS Treatments \u2013 Pros and Cons</h3>
<div class="table-wrap"><table>
<thead><tr><th>Therapy</th><th>Pros</th><th>Cons / risks</th></tr></thead>
<tbody>
<tr><td><strong>ACTH (adrenocorticotropic hormone)</strong></td><td>Likely most effective first\u2011line treatment overall in many studies.</td><td>Immune suppression; edema; gastric bleeding; weight gain; irritability; sleep disturbance; hypertension; cortical atrophy; HPA\u2011axis suppression; rare death; IM injections required; very expensive and limited distribution.</td></tr>
<tr><td><strong>Prednisolone (high\u2011dose oral steroid)</strong></td><td>Least expensive; oral administration; similar effectiveness to high\u2011dose ACTH in several modern series when dosed adequately.</td><td>Same steroid adverse effects as ACTH (immune suppression, edema, GI bleeding, weight gain, irritability, sleep disturbance, hypertension, cortical atrophy, HPA suppression, rare death); may be slightly less effective than ACTH in some cohorts.</td></tr>
<tr><td><strong>Vigabatrin</strong></td><td>Treatment of choice and most effective option for IS in TSC; oral; avoids steroid\u2011related side effects and hypertension.</td><td>Sedation; behavioral changes; sleep disturbance; weight gain; psychosis; 25\u201350% risk of irreversible peripheral visual field loss (time\u2011 and dose\u2011dependent); reversible MRI signal changes; requires enrollment in Vigabatrin REMS program; generally less effective than hormonal therapy for non\u2011TSC IS.</td></tr>
</tbody>
</table></div>
<p><strong>Black box warning:</strong> more than 30% of patients on vigabatrin may develop irreversible peripheral vision loss, with risk increasing with dose and duration; available only through the Vigabatrin REMS program.</p>

<h3 id="is-htn-pathway">IS Hypertension Monitoring Pathway (ACTH / Prednisolone)</h3>

<h4>Who to Monitor and How</h4>
<div class="table-wrap"><table>
<thead><tr><th>Item</th><th>Details</th></tr></thead>
<tbody>
<tr><td><strong>Applies to</strong></td><td>Infants with IS treated with ACTH or prednisolone (not vigabatrin alone).</td></tr>
<tr><td><strong>BP monitoring</strong></td><td>Measure BP 2\u20133 times per week (upper extremity preferred). Ensure infant is calm; repeat readings and average if elevated.</td></tr>
<tr><td><strong>Initial \u201celevated\u201d threshold</strong></td><td>&gt;95th percentile for age/sex/height or &gt;102/62 in infants &lt;1 year.</td></tr>
</tbody>
</table></div>

<h4>Stepwise Approach</h4>
<div class="table-wrap"><table>
<thead><tr><th>Decision point</th><th>Action</th></tr></thead>
<tbody>
<tr><td><strong>BP elevated at visit</strong></td><td>Repeat measurements during visit; if average remains elevated, recheck in 24 hours.</td></tr>
<tr><td><strong>Still elevated at 24\u2011hour recheck</strong></td><td>Recheck again in 24 hours (third check within 72 hours).</td></tr>
<tr><td><strong>Sustained hypertension (&gt;95th percentile or &gt;102/62 on 3 checks)</strong></td><td>Obtain BMP; obtain echocardiogram for infants on ACTH; start daily BP monitoring until normalized or management plan set.</td></tr>
<tr><td><strong>BMP abnormal (e.g., hypokalemia, hypernatremia)</strong></td><td>Start spironolactone (dose per local protocol, e.g., ~0.66 mg/kg/dose TID) and consult endocrinology; if creatinine &gt;0.2, consult nephrology before spironolactone.</td></tr>
<tr><td><strong>BMP normal</strong></td><td>Start propranolol (e.g., 0.5 mg/kg/dose every 6\u20138 hours) and consult nephrology to guide ongoing BP management and eventual wean after IS treatment.</td></tr>
</tbody>
</table></div>

<h3 id="is-sick-child">IS \u201cSick Child\u201d Pathway (On or Recently Off ACTH / Prednisolone)</h3>
<p><strong>Inclusion:</strong> Infant currently on ACTH or prednisolone, or discontinued within the past 4 weeks, presenting with acute illness or injury (ED or inpatient).</p>

<h4>Initial Simultaneous Actions</h4>
<div class="table-wrap"><table>
<thead><tr><th>Domain</th><th>Actions</th></tr></thead>
<tbody>
<tr><td><strong>Clinical assessment</strong></td><td>Assess for vomiting, diarrhea, fever, new oxygen requirement, need for sedation, fracture or other non\u2011minor trauma, or other infectious concerns.</td></tr>
<tr><td><strong>Labs</strong></td><td>Obtain renal function panel and glucose (risk of electrolyte derangements and hyper\u2011 or hypoglycemia).</td></tr>
<tr><td><strong>Blood pressure</strong></td><td>Measure BP (risk of steroid\u2011induced hypertension or adrenal\u2011insufficiency hypotension).</td></tr>
</tbody>
</table></div>

<h4>Electrolytes and Glucose</h4>
<div class="table-wrap"><table>
<thead><tr><th>Finding</th><th>Management</th></tr></thead>
<tbody>
<tr><td><strong>Hyponatremia, hypokalemia, or hypoglycemia</strong></td><td>Check EKG (arrhythmia risk), correct derangements, consult cardiology if needed.</td></tr>
<tr><td><strong>Hypernatremia, hyperkalemia, or hyperglycemia</strong></td><td>Correct abnormalities and consult endocrinology.</td></tr>
</tbody>
</table></div>

<h4>Adrenal Insufficiency and Sepsis</h4>
<div class="table-wrap"><table>
<thead><tr><th>Situation</th><th>Management</th></tr></thead>
<tbody>
<tr><td><strong>Concern for sepsis</strong></td><td>Manage per sepsis pathway; note that serious infection may occur without fever.</td></tr>
<tr><td><strong>Suspicion for adrenal insufficiency</strong></td><td>Give stress\u2011dose IV/IM hydrocortisone (e.g., 25 mg in infants under 3 years per local protocol) without delay.</td></tr>
</tbody>
</table></div>

<h4>Clinical Stability and Follow\u2011Up</h4>
<div class="table-wrap"><table>
<thead><tr><th>Status</th><th>Next step</th></tr></thead>
<tbody>
<tr><td><strong>Clinically stable after evaluation</strong></td><td>Continue oral prednisolone (e.g., 3 mg PO/GT twice daily) until back to baseline plus 24 hours, per pathway; adjust with endocrinology input.</td></tr>
<tr><td><strong>Not clinically stable</strong></td><td>Consult endocrinology urgently for additional stress\u2011dose planning and further management.</td></tr>
</tbody>
</table></div>
`;

// Replace img-20 with new content
h = h.replace(match20[0], newContent);

d.html = h;
d.imageCount = (h.match(/<img /g) || []).length;

// Add TOC entries - find where IS content is in the TOC
// These should go near the infantile spasms area
const tocInsertEntries = [
  { level: 2, text: 'IS Epidemiology and Etiology', id: 'is-epidemiology' },
  { level: 3, text: 'Epidemiology', id: 'is-epidemiology-details' },
  { level: 3, text: 'Etiology', id: 'is-etiology' },
  { level: 3, text: 'EEG Requirements', id: 'is-eeg-strategy' },
  { level: 3, text: 'First\u2011Line IS Treatments', id: 'is-first-line-treatments' },
  { level: 3, text: 'IS HTN Monitoring Pathway', id: 'is-htn-pathway' },
  { level: 3, text: 'IS Sick Child Pathway', id: 'is-sick-child' },
];

// Find the infantile-spasms TOC entry or nearby entry
const isIdx = d.toc.findIndex(t => t.id === 'infantile-spasms' || t.text.toLowerCase().includes('infantile spasm'));
if (isIdx !== -1) {
  // Insert after the infantile spasms entry
  d.toc.splice(isIdx + 1, 0, ...tocInsertEntries);
  console.log('Inserted TOC entries after:', d.toc[isIdx].text);
} else {
  // Find where img-20 was roughly - look for nearby headings
  console.log('No infantile spasms TOC entry found, checking TOC...');
  d.toc.forEach((t, i) => console.log(i, '  '.repeat(t.level-1) + t.text));
}

d.tocCount = d.toc.length;

fs.writeFileSync(fp, JSON.stringify(d, null, 2));
console.log('Done. Images:', d.imageCount, 'TOC:', d.tocCount);
