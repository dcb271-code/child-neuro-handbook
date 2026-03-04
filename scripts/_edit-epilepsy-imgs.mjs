import fs from 'fs';

const fp = 'src/data/epilepsy.json';
const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
let h = d.html;

// Images to delete (with their surrounding tags)
const toDelete = ['img-7.png', 'img-4.png', 'img-8.png', 'img-6.png', 'img-5.png'];

// Images to move to end
const toMove = ['img-35.png', 'img-33.png', 'img-34.png'];

// Extract move images first (before deleting anything)
const moveImgTags = [];
for (const img of toMove) {
  const re = new RegExp(`<img[^>]*src="/images/epilepsy/${img}"[^>]*>`);
  const match = h.match(re);
  if (match) {
    moveImgTags.push(match[0]);
    console.log('Will move:', img);
  } else {
    console.log('NOT FOUND for move:', img);
  }
}

// Delete the 5 images
for (const img of toDelete) {
  const re = new RegExp(`<img[^>]*src="/images/epilepsy/${img}"[^>]*>`);
  if (re.test(h)) {
    h = h.replace(re, '');
    console.log('Deleted:', img);
  } else {
    console.log('NOT FOUND for delete:', img);
  }
}

// Remove the 3 move images from their current positions
for (const img of toMove) {
  const re = new RegExp(`<img[^>]*src="/images/epilepsy/${img}"[^>]*>`);
  h = h.replace(re, '');
  console.log('Removed from current position:', img);
}

// Now find where the deleted images were and insert the new SE content
// The deleted images were between the ILAE 2015 text and the SE Antiseizure Medications heading
// Find the insertion point - after the paragraph that ends before the old images
const ilaeIdx = h.indexOf('ILAE Task Force on Classification of Status Epilepticus');
const paraEnd = h.indexOf('</p>', ilaeIdx) + 4;
const seAsmIdx = h.indexOf('<h1 id="status-epilepticus-antiseizure-medications">');

console.log('\nInsertion area: after pos', paraEnd, 'before pos', seAsmIdx);
console.log('Gap content:', h.substring(paraEnd, seAsmIdx).trim().substring(0, 100));

const newSEContent = `

<h2 id="se-key-time-points">Status Epilepticus – Key Time Points (ILAE 2015)</h2>
<p><strong>Concept:</strong> A seizure that lasts too long, or a series of seizures without recovery, because normal "stop" mechanisms fail.</p>
<p><strong>t1</strong> = when you treat as status. <strong>t2</strong> = when brain injury becomes a concern.</p>

<h3 id="se-operational-times">Operational Times by Seizure Type</h3>
<div class="table-wrap"><table>
<thead><tr><th>Type of SE</th><th>t1 – treat as status</th><th>t2 – risk of long‑term problems</th></tr></thead>
<tbody>
<tr><td><strong>Convulsive (generalized tonic–clonic)</strong></td><td>5 minutes</td><td>30 minutes</td></tr>
<tr><td><strong>Focal SE with impaired awareness</strong></td><td>10 minutes</td><td>&gt;60 minutes</td></tr>
<tr><td><strong>Absence status epilepticus</strong></td><td>10–15 minutes</td><td>Unknown</td></tr>
</tbody>
</table></div>

<h3 id="se-time-phases">Pediatric Convulsive SE (≥28 days) – Time‑Based Phases</h3>
<div class="table-wrap"><table>
<thead><tr><th>Phase</th><th>Time window</th><th>What to do</th></tr></thead>
<tbody>
<tr><td><strong>Stabilization</strong></td><td>0–5 minutes</td><td>ABCs, position airway, oxygen; check glucose and treat if &lt;60; get IV/IO if possible; send basic labs and ASM levels if relevant.</td></tr>
<tr><td><strong>First‑line therapy</strong></td><td>5–20 minutes</td><td>Give a benzodiazepine (route depends on IV access). May repeat once after 5–10 minutes if still seizing.</td></tr>
<tr><td><strong>Second‑line therapy</strong></td><td>20–40 minutes</td><td>Give one second‑line ASM (fosphenytoin, levetiracetam, phenobarbital, or valproate). Call neurology; prepare for PICU.</td></tr>
<tr><td><strong>Third‑line therapy</strong></td><td>40–60 minutes</td><td>If seizures continue, start continuous infusion (midazolam, pentobarbital, ketamine, propofol per local protocol) and arrange continuous EEG.</td></tr>
</tbody>
</table></div>

<h3 id="se-first-line-benzos">First‑Line Benzodiazepines – With and Without IV Access</h3>
<div class="table-wrap"><table>
<thead><tr><th>Scenario</th><th>Medication / route</th><th>Dose (max)</th><th>Notes</th></tr></thead>
<tbody>
<tr><td rowspan="3"><strong>No IV access</strong></td><td>Midazolam IM</td><td>0.15 mg/kg IM (max 10 mg)</td><td>Large muscle (thigh); good prehospital choice.</td></tr>
<tr><td>Midazolam IN</td><td>0.2 mg/kg total (max 10 mg); 0.1 mg/kg in each nostril</td><td>Use concentrated solution.</td></tr>
<tr><td>Diazepam PR (rectal gel)</td><td>6–12 mo 5–9.9 kg: 2.5 mg; 6–12 mo ≥10 kg: 5 mg; 1–5 yrs: 0.5 mg/kg; 6–11 yrs: 0.3 mg/kg; ≥12 yrs: 0.2 mg/kg</td><td>Follow Diastat chart for exact prefilled doses.</td></tr>
<tr><td rowspan="2"><strong>IV access available</strong></td><td>Lorazepam IV</td><td>0.1 mg/kg (max 4 mg)</td><td>May repeat once after 5–10 minutes.</td></tr>
<tr><td>Diazepam IV</td><td>0.2 mg/kg (max 10 mg)</td><td>May repeat once after 5 minutes.</td></tr>
</tbody>
</table></div>
<p><strong>Main risks for all:</strong> respiratory depression and hypotension; monitor airway and blood pressure closely.</p>

<h3 id="se-second-line">Second‑Line Antiseizure Medications (Convulsive SE ≥28 days)</h3>
<p>Give one of the following if seizures continue after adequate benzodiazepine dosing.</p>
<div class="table-wrap"><table>
<thead><tr><th>Drug</th><th>Loading dose</th><th>Infusion time</th><th>Key cautions</th></tr></thead>
<tbody>
<tr><td><strong>Fosphenytoin (PE)</strong></td><td>20 mg PE/kg (max 1500 mg PE)</td><td>Over 10–15 minutes</td><td>Avoid in severe cardiac conduction disease or known Dravet; consider extra 10 mg PE/kg if no response after 10 min.</td></tr>
<tr><td><strong>Levetiracetam</strong></td><td>40–60 mg/kg (max 4500 mg)</td><td>About 15 minutes</td><td>Adjust for renal impairment; safe even if on home levetiracetam.</td></tr>
<tr><td><strong>Phenobarbital</strong></td><td>20 mg/kg (max 1000 mg)</td><td>1–2 mg/kg/min</td><td>Watch for respiratory depression and hypotension; often used in infants.</td></tr>
<tr><td><strong>Valproate sodium</strong></td><td>20–40 mg/kg (max 3000 mg)</td><td>Up to ~20 mg/min</td><td>Avoid in liver disease, known or suspected POLG disease, and most children &lt;2 years.</td></tr>
</tbody>
</table></div>
<p>If still seizing 10–20 minutes after this load, move to continuous infusion therapy and ICU‑level care with EEG.</p>

`;

// Replace the gap between ILAE text and SE ASM heading with new content
h = h.substring(0, paraEnd) + newSEContent + h.substring(seAsmIdx);

// Add moved images to the very end
h = h.trimEnd() + '\n\n' + moveImgTags.map(t => '<p>' + t + '</p>').join('\n');

d.html = h;
d.imageCount = (h.match(/<img /g) || []).length;
d.tocCount = d.toc.length;

fs.writeFileSync(fp, JSON.stringify(d, null, 2));
console.log('\nDone. Images:', d.imageCount, 'TOC:', d.tocCount);
