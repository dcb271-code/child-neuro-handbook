import fs from 'fs';

const fp = 'src/data/epilepsy.json';
const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
let h = d.html;

// The section to remove starts with "<ul><li>SUDEP Risk factors:" (we added the <ul> when removing Rite Review)
// and ends right before <h1 id="eeg-tips">
const startMarker = '<ul><li>SUDEP Risk factors:';
const startIdx = h.indexOf(startMarker);
if (startIdx === -1) { console.log('Start NOT FOUND'); process.exit(1); }

const endMarker = '<h1 id="eeg-tips">';
const endIdx = h.indexOf(endMarker);
if (endIdx === -1) { console.log('End marker NOT FOUND'); process.exit(1); }

console.log('Section to remove: from', startIdx, 'to', endIdx);
console.log('Section length:', endIdx - startIdx);
console.log('Starts with:', h.substring(startIdx, startIdx + 100));
console.log('Ends before:', h.substring(endIdx, endIdx + 60));

// New replacement content
const newContent = `
<h2 id="epilepsy-associations">Epilepsy Associations \u2013 Quick Reference</h2>

<h3 id="epilepsy-dev-behavior">Development, Behavior, Cognition</h3>
<div class="table-wrap"><table>
<thead><tr><th>Association</th><th>What to think about / do</th></tr></thead>
<tbody>
<tr><td><strong>Global developmental delay, intellectual disability, ASD</strong></td><td>Common in developmental and epileptic encephalopathies (SCN1A, STXBP1, CDKL5, PCDH19, KCNQ2, mTOR\u2011pathway genes, CNVs); low threshold for WES/WGS and neurogenetics referral.</td></tr>
<tr><td><strong>Learning problems, ADHD</strong></td><td>Very common in childhood epilepsies; screen routinely; treat ADHD (stimulants usually acceptable with monitoring).</td></tr>
<tr><td><strong>Mood and anxiety disorders</strong></td><td>Higher rates of depression, anxiety, suicidality; ask directly, especially in teens; consider therapy/SSRIs and safety planning.</td></tr>
</tbody>
</table></div>

<h3 id="epilepsy-neuro-red-flags">Neurologic Red Flags</h3>
<div class="table-wrap"><table>
<thead><tr><th>Finding</th><th>Implications</th></tr></thead>
<tbody>
<tr><td><strong>Developmental regression or plateau</strong></td><td>Suggests DEEs, epileptic spasms, ESES/CSWS, Lennox\u2013Gastaut, metabolic or neurodegenerative disease \u2192 urgent EEG, MRI, metabolic/genetic work\u2011up.</td></tr>
<tr><td><strong>Movement disorder, ataxia, neuropathy</strong></td><td>Consider mitochondrial disease, basal\u2011ganglia disorders, leukodystrophies, neurotransmitter defects, Wilson disease, channelopathies (CACNA1A, ATP1A2), and transportopathies (GLUT1 deficiency).</td></tr>
<tr><td><strong>Focal weakness or hemiparesis</strong></td><td>Think perinatal stroke, malformation, tumor, Rasmussen encephalitis, hemimegalencephaly \u2192 MRI and focused work\u2011up.</td></tr>
<tr><td><strong>Visual or hearing loss</strong></td><td>Consider mitochondrial disease, neuronal ceroid lipofuscinoses, peroxisomal/lysosomal disease, syndromic genes (e.g., WFS1, Usher).</td></tr>
</tbody>
</table></div>

<h3 id="epilepsy-syndrome-hints">Syndrome\u2011Hint Associations</h3>
<div class="table-wrap"><table>
<thead><tr><th>Feature</th><th>Possible syndrome / next step</th></tr></thead>
<tbody>
<tr><td><strong>Prolonged or recurrent febrile seizures \u00b1 afebrile seizures</strong></td><td>GEFS+ / Dravet spectrum (SCN1A); avoid sodium\u2011channel blockers in Dravet\u2011like phenotypes; prioritize genetic testing.</td></tr>
<tr><td><strong>Infantile/epileptic spasms</strong></td><td>Strongly linked to TSC, trisomy 21, structural lesions, metabolic disease, many DEEs; treat urgently (ACTH or high\u2011dose steroids, vigabatrin in TSC) and investigate etiology.</td></tr>
<tr><td><strong>Photosensitivity, morning myoclonus</strong></td><td>Genetic generalized epilepsies, especially JME; counsel about sleep deprivation, alcohol, screen flicker; choose broad\u2011spectrum ASMs.</td></tr>
<tr><td><strong>Sleep\u2011activated spikes or seizures; language/behavior regression</strong></td><td>Consider ESES/CSWS, Landau\u2013Kleffner, benign focal epilepsies; obtain sleep EEG and treat aggressively if ESES present.</td></tr>
<tr><td><strong>Prominent headache/migraine</strong></td><td>Common comorbidity; think hemiplegic migraine\u2013epilepsy overlap in appropriate channelopathy contexts (CACNA1A, ATP1A2, SCN1A).</td></tr>
</tbody>
</table></div>

<h3 id="epilepsy-systemic-clues">Systemic and Neurocutaneous Clues</h3>
<div class="table-wrap"><table>
<thead><tr><th>Clue</th><th>Consider</th></tr></thead>
<tbody>
<tr><td><strong>Caf\u00e9\u2011au\u2011lait, axillary freckling; ash\u2011leaf macules, angiofibromas; facial port\u2011wine stain; whorled hypopigmentation</strong></td><td>NF1, TSC, Sturge\u2013Weber, incontinentia pigmenti, hypomelanosis of Ito \u2192 MRI, ophthalmology, genetics.</td></tr>
<tr><td><strong>Cardiomyopathy, arrhythmia, conduction disease</strong></td><td>Mitochondrial disease, cardiac channelopathies; involve cardiology early.</td></tr>
<tr><td><strong>Renal cysts or angiomyolipomas; liver or endocrine disease</strong></td><td>TSC, mitochondrial and other metabolic disorders; coordinate with nephrology/endocrinology.</td></tr>
</tbody>
</table></div>

<h2 id="sudep">SUDEP \u2013 Sudden Unexpected Death in Epilepsy</h2>
<p><strong>Definition:</strong> Sudden, unexpected, non\u2011traumatic, non\u2011drowning death in a person with epilepsy, with or without a witnessed seizure, and no structural or toxicologic cause identified at autopsy.</p>

<h3 id="sudep-incidence">How Common Is SUDEP?</h3>
<p>(Approximate, order\u2011of\u2011magnitude figures for counseling.)</p>
<div class="table-wrap"><table>
<thead><tr><th>Population</th><th>Approximate incidence</th></tr></thead>
<tbody>
<tr><td><strong>Children with epilepsy</strong></td><td>\u22480.2\u20130.5 per 1000 patient\u2011years (about 1 per 2,000\u20135,000 children per year).</td></tr>
<tr><td><strong>Adults with epilepsy</strong></td><td>\u22481\u20132 per 1000 patient\u2011years (about 1 per 1,000 per year).</td></tr>
<tr><td><strong>Drug\u2011resistant / surgery\u2011candidate cohorts</strong></td><td>Up to ~9 per 1000 patient\u2011years in some series.</td></tr>
<tr><td><strong>Dravet syndrome / SCN1A\u2011related epilepsy</strong></td><td>Cumulative SUDEP risk substantially higher; older cohorts estimate several to ~10\u201320% across childhood and young adulthood.</td></tr>
</tbody>
</table></div>

<h3 id="sudep-risk-factors">Major Risk Factors</h3>
<p>(Focus on modifiable items)</p>
<div class="table-wrap"><table>
<thead><tr><th>Risk factor</th><th>Practical takeaway</th></tr></thead>
<tbody>
<tr><td><strong>Frequent generalized tonic\u2013clonic seizures (especially \u22653/year)</strong></td><td>Strongest known risk factor; reducing GTCS frequency is the main protective strategy.</td></tr>
<tr><td><strong>Nocturnal GTCS and sleeping alone</strong></td><td>Many SUDEPs occur at night; consider room\u2011sharing, reliable monitors, or seizure\u2011alert devices in high\u2011risk patients.</td></tr>
<tr><td><strong>Poor adherence or abrupt ASM withdrawal</strong></td><td>Review adherence at each visit; warn against suddenly stopping medications.</td></tr>
<tr><td><strong>Long duration of active epilepsy, drug resistance, polytherapy</strong></td><td>Markers of severe disease; refer to epilepsy center for surgery, ketogenic diet, or device options when appropriate.</td></tr>
<tr><td><strong>Developmental disability, young adult age</strong></td><td>Non\u2011modifiable background risks; emphasize supervision, clear rescue plans, and support during transitions to independence.</td></tr>
</tbody>
</table></div>

<h3 id="sudep-counseling">Counseling Script (At\u2011a\u2011Glance)</h3>
<p>\u201cThere is a small but real risk of sudden death related to epilepsy called SUDEP. In children, it may be as high as about 1 in 2\u20133 thousand each year in some groups.\u201d</p>
<p>\u201cRisk is highest in people who have frequent big convulsive seizures, especially at night. The main goal is to reduce or eliminate those seizures.\u201d</p>
<p>\u201cTaking medicine every day, avoiding missed doses, treating clusters quickly, and having some form of nighttime supervision or alarm all help lower risk.\u201d</p>
<p>\u201cThis topic should be revisited over time, especially as adolescents gain independence.\u201d</p>

`;

// Replace the section
h = h.substring(0, startIdx) + newContent + h.substring(endIdx);

d.html = h;
d.imageCount = (h.match(/<img /g) || []).length;

// Update TOC - add new entries, remove old rite-review related ones if any remain
// Find where eeg-tips is in the TOC to insert before it
const eegTipsTocIdx = d.toc.findIndex(t => t.id === 'eeg-tips');
const newTocEntries = [
  { level: 1, text: 'Epilepsy Associations \u2013 Quick Reference', id: 'epilepsy-associations' },
  { level: 2, text: 'Development, Behavior, Cognition', id: 'epilepsy-dev-behavior' },
  { level: 2, text: 'Neurologic Red Flags', id: 'epilepsy-neuro-red-flags' },
  { level: 2, text: 'Syndrome\u2011Hint Associations', id: 'epilepsy-syndrome-hints' },
  { level: 2, text: 'Systemic and Neurocutaneous Clues', id: 'epilepsy-systemic-clues' },
  { level: 1, text: 'SUDEP \u2013 Sudden Unexpected Death in Epilepsy', id: 'sudep' },
  { level: 2, text: 'How Common Is SUDEP?', id: 'sudep-incidence' },
  { level: 2, text: 'Major Risk Factors', id: 'sudep-risk-factors' },
  { level: 2, text: 'Counseling Script', id: 'sudep-counseling' },
];

if (eegTipsTocIdx !== -1) {
  d.toc.splice(eegTipsTocIdx, 0, ...newTocEntries);
} else {
  d.toc.push(...newTocEntries);
}

d.tocCount = d.toc.length;

fs.writeFileSync(fp, JSON.stringify(d, null, 2));
console.log('Done. Images:', d.imageCount, 'TOC:', d.tocCount);
console.log('TOC entries around insertion:');
const idx = d.toc.findIndex(t => t.id === 'epilepsy-associations');
for (let i = Math.max(0, idx-1); i < Math.min(d.toc.length, idx+11); i++) {
  console.log(' ', '  '.repeat(d.toc[i].level-1) + d.toc[i].text);
}
