import fs from 'fs';

const fp = 'src/data/epilepsy.json';
const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
let h = d.html;

// Find the h1 for Neonatal Seizure Algorithm
const h1Start = '<h1 id="neonatal-seizure-algorithm">';
const h1Idx = h.indexOf(h1Start);
if (h1Idx === -1) { console.log('h1 NOT FOUND'); process.exit(1); }

// Find the end - last "give another agent" followed by closing tags
// The section ends with: "If >35, give another agent</...>"
// Find the last occurrence of "give another agent" in this section
const sectionStart = h1Idx;
// Find the next h1 after this one
const afterH1 = h.substring(h1Idx + h1Start.length);
const nextH1Match = afterH1.match(/<h1[^>]*>/);
let sectionEndBound;
if (nextH1Match) {
  sectionEndBound = h1Idx + h1Start.length + afterH1.indexOf(nextH1Match[0]);
} else {
  sectionEndBound = h.length;
}

console.log('Section from', h1Idx, 'to next h1 at', sectionEndBound);

// Find the last "give another agent" before the next h1
const sectionContent = h.substring(h1Idx, sectionEndBound);
const lastAgentIdx = sectionContent.lastIndexOf('give another agent');
if (lastAgentIdx === -1) { console.log('give another agent NOT FOUND in section'); process.exit(1); }

// Find the closing tag after "give another agent"
const afterAgent = sectionContent.substring(lastAgentIdx);
// It should end with </p> or </li>
const closeMatch = afterAgent.match(/give another agent[^<]*<\/[^>]+>/);
if (!closeMatch) { console.log('Could not find closing tag'); process.exit(1); }

const sectionEnd = h1Idx + lastAgentIdx + closeMatch[0].length;
console.log('Section end at:', sectionEnd);
console.log('End content:', h.substring(sectionEnd - 50, sectionEnd + 50));

// Check for any images in this section
const removedContent = h.substring(h1Idx, sectionEnd);
const imgs = removedContent.match(/<img[^>]*>/g);
console.log('\nImages in section:', imgs ? imgs.length : 0);
if (imgs) imgs.forEach(i => { const s = i.match(/src="([^"]+)"/); console.log('  ', s?.[1]); });

const newContent = `<h1 id="neonatal-seizure-algorithm">Neonatal Seizure Diagnosis and Treatment \u2013 Quick Pathway</h1>
<p>(Term / late\u2011preterm infants, &lt;28 days CGA)</p>

<h3 id="neonatal-sz-step1">1. Suspected Seizure</h3>
<div class="table-wrap"><table>
<thead><tr><th>Step</th><th>Key actions</th></tr></thead>
<tbody>
<tr><td><strong>Initial assessment</strong></td><td>Attempt to record video if safe; note semiology and duration; document vital signs; check glucose and electrolytes per local protocol.</td></tr>
<tr><td><strong>Emergent treatment if seizure highly suspected</strong></td><td>Give phenobarbital (PHB) 20 mg/kg IV load (preferred) or lorazepam 0.1 mg/kg IV if PHB not immediately available. Discuss with neurology and initiate continuous EEG (cEEG) urgently.</td></tr>
</tbody>
</table></div>

<h3 id="neonatal-sz-step2">2. Confirmation</h3>
<div class="table-wrap"><table>
<thead><tr><th>Situation</th><th>Management</th></tr></thead>
<tbody>
<tr><td><strong>Seizure confirmed on cEEG or suspicion remains very high</strong></td><td>Treat with PHB 20 mg/kg IV as first\u2011line antiseizure medication (counting any emergent dose toward this total). Aim for PHB level in at least the low\u2011 to mid\u201120 \u00b5g/mL range.</td></tr>
</tbody>
</table></div>

<h3 id="neonatal-sz-step3">3. Second\u2011Line Therapy</h3>
<div class="table-wrap"><table>
<thead><tr><th>Step</th><th>Options / notes</th></tr></thead>
<tbody>
<tr><td><strong>Seizures persist after first PHB load</strong></td><td>1) Give an additional 10\u201320 mg/kg PHB (dose guided by blood pressure and respiratory status), and/or 2) Add a second\u2011line agent: levetiracetam 60 mg/kg IV or fosphenytoin 20 mg/kg IV (as PE). Levetiracetam is often favored in neonates with cardiac disease; fosphenytoin may be preferred when a sodium\u2011channel\u2013responsive channelopathy is suspected.</td></tr>
</tbody>
</table></div>

<h3 id="neonatal-sz-step4">4. Third\u2011Line and Refractory Therapy</h3>
<div class="table-wrap"><table>
<thead><tr><th>Level</th><th>Treatment</th></tr></thead>
<tbody>
<tr><td><strong>Third line</strong></td><td>Use whichever of levetiracetam 60 mg/kg, fosphenytoin 20 mg/kg, or lacosamide 4\u20138 mg/kg has not yet been given, based on local protocol and evolving safety data.</td></tr>
<tr><td><strong>Fourth line</strong></td><td>Midazolam: 0.2 mg/kg IV bolus, then continuous infusion at 0.2 mg/kg/h. Check EEG about every 15 minutes; if seizures continue, repeat 0.2 mg/kg bolus and increase infusion by 0.1\u20130.2 mg/kg/h to a maximum of 2 mg/kg/h.</td></tr>
<tr><td><strong>If still refractory or midazolam not tolerated</strong></td><td>Consider ketamine infusion or other ICU\u2011level therapies after discussion with neurology/intensive care. In select refractory cases, PHB levels up to ~80\u2013100 \u00b5g/mL may be used with close hemodynamic and airway support.</td></tr>
</tbody>
</table></div>

<h3 id="neonatal-sz-step5">5. Ongoing Monitoring and Weaning</h3>
<div class="table-wrap"><table>
<thead><tr><th>Item</th><th>Recommendation</th></tr></thead>
<tbody>
<tr><td><strong>cEEG duration</strong></td><td>Continue cEEG until the infant has been seizure\u2011free on EEG for at least 24 hours, unless there is a confirmed neonatal epilepsy syndrome or care is being redirected.</td></tr>
<tr><td><strong>Skin\u2011integrity precautions</strong></td><td>Premature infants, those on ECMO, pharmacologically paralyzed infants, and those in incubators are at high risk for skin breakdown with prolonged electrodes; remove or reposition leads as soon as clinically safe.</td></tr>
<tr><td><strong>Maintenance ASM</strong></td><td>After seizures are controlled, consider PHB 5 mg/kg/day (often divided BID or given QHS) if large PHB loads were used. If levetiracetam was loaded or ongoing risk is high, use maintenance LEV 40\u201360 mg/kg/day divided every 8\u201312 hours. Because most neonatal seizures are acute symptomatic, if the acute cause has resolved and there is no concern for neonatal epilepsy, aim to wean ASM before discharge or within a short, planned outpatient interval.</td></tr>
</tbody>
</table></div>

<h2 id="acute-symptomatic-neonatal">Acute Symptomatic Neonatal Seizures</h2>
<p><strong>Definition:</strong> Acute symptomatic (acute provoked) neonatal seizures are electrographic seizures that occur in close temporal association with an acute brain insult or systemic disturbance such as hypoxic\u2011ischemic encephalopathy, stroke, intracranial hemorrhage, infection, or significant metabolic derangement, in an infant without prior epilepsy.</p>
<p>In current neonatal ILAE frameworks, seizures are defined electrographically: sudden, repetitive, evolving, and stereotyped EEG discharges with clear onset, evolution, and offset; clinical signs may be absent or subtle.</p>

<h3 id="neonatal-sz-dx-certainty">Levels of Diagnostic Certainty</h3>
<div class="table-wrap"><table>
<thead><tr><th>Level</th><th>Definition</th><th>Usual action</th></tr></thead>
<tbody>
<tr><td><strong>1 \u2013 Definite seizure</strong></td><td>Clinical event with a continuous EEG seizure correlate.</td><td>Treat as seizure.</td></tr>
<tr><td><strong>2 \u2013 Probable seizure</strong></td><td>Clinically clear focal clonic or focal tonic seizure, or seizure confirmed on amplitude\u2011integrated EEG.</td><td>Treat as seizure.</td></tr>
<tr><td><strong>3 \u2013 Possible seizure</strong></td><td>Event suspicious but not classic, or EEG correlation unclear.</td><td>Consider treatment based on overall context; discuss with neurology.</td></tr>
<tr><td><strong>4 \u2013 Suspected seizure</strong></td><td>Insufficient evidence to meet seizure criteria.</td><td>Generally do not treat as seizure alone.</td></tr>
<tr><td><strong>5 \u2013 Not a seizure</strong></td><td>Movement shown by EEG or exam to be non\u2011epileptic.</td><td>Do not treat as seizure.</td></tr>
</tbody>
</table></div>

<h3 id="neonatal-sz-natural-course">Natural Course of Seizure Burden After Acute Neonatal Brain Injury</h3>
<p>(Especially hypoxic\u2011ischemic encephalopathy with continuous EEG monitoring.)</p>
<div class="table-wrap"><table>
<thead><tr><th>Feature</th><th>Typical pattern</th></tr></thead>
<tbody>
<tr><td><strong>Time to first seizure</strong></td><td>Many infants have their first electrographic seizure within the first 12\u201324 hours of life, often during the early phase of therapeutic hypothermia.</td></tr>
<tr><td><strong>Time of peak seizure burden</strong></td><td>Seizure burden generally peaks between about 12 and 24 hours after birth or after injury, with a median around the early 20\u2011hour range in published cohorts.</td></tr>
<tr><td><strong>Duration of seizure period</strong></td><td>In many infants, seizures continue for roughly 2\u20133 days after onset, with most seizure activity occurring within the first 72 hours. Time from first to peak seizure burden is typically shorter than from peak to last seizure.</td></tr>
<tr><td><strong>Clinical implication</strong></td><td>Expect seizure burden to ramp up over the first day, remain significant for another 24\u201348 hours, and usually decline by around 72 hours if the injury is not rapidly worsening. Because higher total seizure burden is associated with worse neurodevelopmental outcomes, aggressive monitoring and treatment over this early 72\u2011hour window are crucial.</td></tr>
</tbody>
</table></div>
`;

// Replace the section
h = h.substring(0, h1Idx) + newContent + h.substring(sectionEnd);

d.html = h;
d.imageCount = (h.match(/<img /g) || []).length;

// Update TOC - find neonatal-seizure-algorithm entry and replace/expand
const neoIdx = d.toc.findIndex(t => t.id === 'neonatal-seizure-algorithm');
if (neoIdx !== -1) {
  // Replace with expanded entries
  const newTocEntries = [
    { level: 1, text: 'Neonatal Seizure Diagnosis and Treatment', id: 'neonatal-seizure-algorithm' },
    { level: 2, text: '1. Suspected Seizure', id: 'neonatal-sz-step1' },
    { level: 2, text: '2. Confirmation', id: 'neonatal-sz-step2' },
    { level: 2, text: '3. Second\u2011Line Therapy', id: 'neonatal-sz-step3' },
    { level: 2, text: '4. Third\u2011Line and Refractory', id: 'neonatal-sz-step4' },
    { level: 2, text: '5. Monitoring and Weaning', id: 'neonatal-sz-step5' },
    { level: 1, text: 'Acute Symptomatic Neonatal Seizures', id: 'acute-symptomatic-neonatal' },
    { level: 2, text: 'Diagnostic Certainty Levels', id: 'neonatal-sz-dx-certainty' },
    { level: 2, text: 'Natural Course of Seizure Burden', id: 'neonatal-sz-natural-course' },
  ];
  d.toc.splice(neoIdx, 1, ...newTocEntries);
  console.log('Replaced TOC entry at index', neoIdx);
} else {
  console.log('neonatal-seizure-algorithm TOC entry NOT FOUND');
}

d.tocCount = d.toc.length;

fs.writeFileSync(fp, JSON.stringify(d, null, 2));
console.log('Done. Images:', d.imageCount, 'TOC:', d.tocCount);
