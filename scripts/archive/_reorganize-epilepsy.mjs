import fs from 'fs';

const fp = 'src/data/epilepsy.json';
const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
let h = d.html;

// ── Step 1: Find the bridging heading and split ──
const bridgingH1 = '<h1 id="bridging-sick-kids-with-benzos">';
const bridgingIdx = h.indexOf(bridgingH1);
if (bridgingIdx === -1) { console.log('Bridging heading NOT FOUND'); process.exit(1); }

// Find end of bridging section (next h1)
const afterBridging = h.substring(bridgingIdx);
const bridgingNextH1 = afterBridging.indexOf('<h1', bridgingH1.length);
const bridgingSectionEnd = bridgingIdx + bridgingNextH1;

const preBridging = h.substring(0, bridgingSectionEnd); // everything up to and including bridging section
let postBridging = h.substring(bridgingSectionEnd);

console.log('Pre-bridging length:', preBridging.length);
console.log('Post-bridging length:', postBridging.length);

// ── Step 1b: Strip ALL images from post-bridging and store them ──
const allPostImages = [];
const imgBlockRe = /<p><img[^>]*src="\/images\/epilepsy\/[^"]*"[^>]*><\/p>/g;
let imgM;
while ((imgM = imgBlockRe.exec(postBridging)) !== null) {
  allPostImages.push(imgM[0]);
}
// Also find bare img tags (not wrapped in <p>)
const bareImgRe = /<img[^>]*src="\/images\/epilepsy\/[^"]*"[^>]*>/g;
while ((imgM = bareImgRe.exec(postBridging)) !== null) {
  const src = imgM[0].match(/src="([^"]+)"/)?.[1];
  const wrapped = '<p>' + imgM[0] + '</p>';
  if (!allPostImages.some(p => p.includes(src))) {
    allPostImages.push(wrapped);
  }
}

// Remove ALL image tags from post-bridging content
postBridging = postBridging.replace(/<p><img[^>]*src="\/images\/epilepsy\/[^"]*"[^>]*><\/p>\n*/g, '');
postBridging = postBridging.replace(/<img[^>]*src="\/images\/epilepsy\/[^"]*"[^>]*>/g, '');

// Deduplicate images by src
const seenSrcs = new Set();
const uniqueImages = [];
for (const img of allPostImages) {
  const src = img.match(/src="([^"]+)"/)?.[1];
  if (src && !seenSrcs.has(src)) {
    seenSrcs.add(src);
    uniqueImages.push(img);
  }
}
console.log('Extracted', uniqueImages.length, 'unique post-bridging images');

// ── Step 2: Extract all h1-level sections from post-bridging ──
function extractSections(html) {
  const sections = [];
  const h1Re = /<h1[^>]*id="([^"]*)"[^>]*>(.*?)<\/h1>/g;
  let match;
  const h1Positions = [];

  while ((match = h1Re.exec(html)) !== null) {
    h1Positions.push({ id: match[1], title: match[2], pos: match.index });
  }

  for (let i = 0; i < h1Positions.length; i++) {
    const start = h1Positions[i].pos;
    const end = i + 1 < h1Positions.length ? h1Positions[i + 1].pos : html.length;
    sections.push({
      id: h1Positions[i].id,
      title: h1Positions[i].title,
      html: html.substring(start, end)
    });
  }
  return sections;
}

const sections = extractSections(postBridging);
console.log('\nSections found:');
sections.forEach(s => console.log('  ', s.id, '(' + s.html.length + ' chars)'));

// ── Step 3: Build section map ──
const sectionMap = {};
for (const s of sections) {
  sectionMap[s.id] = s;
}

// ── Helper: extract images from HTML ──
function extractImages(html) {
  const imgs = [];
  const re = /<(?:p>)?<img[^>]*>[^<]*<\/p>|<img[^>]*>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    imgs.push(m[0]);
  }
  return imgs;
}

// ── Step 4: Build Section 1 — Ketogenic Diet (KD) ──
function buildKDSection() {
  const kd = sectionMap['ketogenic-diet'];
  if (!kd) return '';

  return `
<h1 id="ketogenic-diet">Ketogenic Diet (KD)</h1>
<p>High-fat (80\u201390%), adequate protein, limited carbohydrate diet used as adjunctive therapy for drug-resistant epilepsy.</p>

<h2 id="kd-indications">Indications and Efficacy</h2>
<div class="table-wrap"><table>
<thead><tr><th>Study</th><th>Key finding</th></tr></thead>
<tbody>
<tr><td><strong>Neal 2008</strong> (randomized prospective)</td><td>38% had &gt;50% seizure reduction; 7% seizure-free (vs 6% controls, 0% seizure-free).</td></tr>
<tr><td><strong>Johns Hopkins 1997</strong></td><td>7% seizure-free; 20% with &gt;90% reduction; 50% with &gt;50% reduction after 1 year.</td></tr>
<tr><td><strong>Freitas 2007</strong> (54 children)</td><td>57% achieved &gt;75% seizure control.</td></tr>
<tr><td><strong>Cochrane 2016</strong></td><td>Seizure freedom up to 55% and seizure reduction up to 85% in the 4:1 KD group after 3 months.</td></tr>
</tbody>
</table></div>
<p><strong>Key indications:</strong></p>
<ul>
<li><strong>GLUT-1 transporter deficiency</strong> (first-line treatment)</li>
<li>Tonic, atonic, and atypical absence seizures</li>
<li>Infantile spasms</li>
<li>Dravet syndrome</li>
<li>Doose syndrome / Epilepsy with Myoclonic-Atonic Seizures (EMAS)</li>
<li>FIRES (Febrile Infection-Related Epilepsy Syndrome)</li>
</ul>
<p><strong>Epileptologist consultation is needed prior to referring a patient for the ketogenic diet.</strong></p>

<h2 id="kd-pre-diet">Pre-Diet Evaluation</h2>
<p><strong>Pre-ketogenic labs:</strong></p>
<ul>
<li>CMP, CBC, lactate/pyruvate, urine organic acids, serum amino acids</li>
<li>Acylcarnitine profile, phosphorus, fasting lipid panel</li>
<li>Carnitine, 25-OH vitamin D, Mg, Zn, selenium</li>
</ul>

<h2 id="kd-monitoring">Monitoring, Supplementation, and Adverse Effects</h2>
<p><strong>Required supplements:</strong></p>
<ul>
<li>Multivitamin, calcium, and vitamin D supplementation</li>
<li>Monitor for deficiencies in: carnitine, zinc, selenium, vitamin D, vitamin K, phosphorus, fiber, bicarbonate</li>
</ul>
<p><strong>Adverse effects:</strong></p>
<div class="table-wrap"><table>
<thead><tr><th>Common</th><th>Less common / serious</th></tr></thead>
<tbody>
<tr><td>Kidney stones, constipation, increased lipids, decreased growth, acidosis, weight loss, GERD</td><td>Osteopenia, anemia, prolonged QT, cardiomyopathy, pancreatitis, hypoproteinemia, leukopenia</td></tr>
</tbody>
</table></div>

<h2 id="kd-initiation">Initiation (EMU or Inpatient)</h2>
<ul>
<li>Monday admission (9 AM) to EMU (hospitalization per keto team and epileptologist discretion).</li>
<li>Patients do <strong>not</strong> need to fast for this admission.</li>
<li>Non-caloric beverages only on admission; formula options: RCF, Ketocal 3:1 or 4:1.</li>
<li><strong>Day one fasting labs:</strong> BMP and lipids; liquid diet for first day for 100% of calories.</li>
</ul>

<h2 id="kd-illness-oncall">Illness, NPO, and On-Call Management</h2>
<p><strong>Basic principles:</strong> Maintain ketosis. Avoid carbs. Average bicarb 18\u201323, BS 50\u201380 (if on TPX/ZGN may have lower bicarb).</p>
<div class="table-wrap"><table>
<thead><tr><th>Scenario</th><th>Recommended action</th></tr></thead>
<tbody>
<tr><td><strong>High-carb food ingested</strong></td><td>Continue current ratio; do not fast. Try adding extra fat (tablespoon of butter or oil for PO-fed; continue keto formula for G-tube).</td></tr>
<tr><td><strong>Vomiting / refusing to eat</strong></td><td>Give \u00bd meal quantity and double the number of meals per day. If still refusing, try liquid ketogenic replacement (sip all day). If still refusing, carb replacement: 1\u00bd\u20132 oz OJ or apple juice up to every 4 hours. Pedialyte is OK (less carb, more volume needed). Encourage 0-calorie/caffeine fluids.</td></tr>
<tr><td><strong>Ketones low / increased seizures</strong></td><td>Evaluate as if not on diet (missed meds, illness, ASM changes). Keto-specific: Have ketones dropped? Any ratio/calorie changes? High-carb food or new meds? AM ketones are typically lower than PM. <strong>Intervention:</strong> Remove hidden carb food or change med form; revert to prior calorie/ratio; use IN midazolam or rectal Diastat if needed.</td></tr>
<tr><td><strong>Dehydration</strong></td><td>Increase fluid intake to 1.5\u00d7 maintenance. If unable to tolerate PO, IV hydration with <strong>non-dextrose fluids</strong> (NS for bolus). If concerned, seek ED with Paramedic/ED letter. If back/abd pain \u00b1 dark/bloody urine \u2192 suspect kidney stone \u2192 increase fluids to 130%+ maintenance, try Cytra-K. If severe pain/emesis \u00b1 fever \u2192 consider pancreatitis.</td></tr>
<tr><td><strong>Hypoglycemia</strong></td><td>If BS &gt;40: no dextrose, NS only. If BS &lt;40: give 4\u20135 g dextrose, recheck with goal 40\u201380. D5W = 5 g dextrose per 100 mL; D10W = 10 g per 100 mL. <strong>Do not give &gt;10% dextrose through peripheral IV.</strong> Ketones will return to pre-illness levels after recovery.</td></tr>
<tr><td><strong>NPO and procedural planning</strong></td><td>Keto patients should not be NPO &gt;12\u201313 hours without glucose monitoring (q1h while NPO). Metabolic patients: max 8 hours fasting, consult genetics/metabolics. Give meal or full replacement liquid meal just before NPO. Carb-free clear liquids until 2 hours before procedure. No carbs for 8 hours before sedation (water only). In metabolic disorders, defer fluid management to metabolic team.</td></tr>
<tr><td><strong>Admission for other problems</strong></td><td><strong>Any keto child admitted &gt;24 hours \u2192 transfer to main campus for keto support.</strong> Convert NPO/clear liquids to keto-acceptable fluids/meals (juice/soda/Pedialyte \u2192 keto eggnog or liquid replacement meal \u2192 full solid meals). Child should eat all meals to maintain ketosis and prevent hypoglycemia. Check BG at least once; check urinary ketones and consider BHB. If admitted overnight and maintaining PO/GT \u2192 IVF without dextrose. If NPO: IV without carbs, give dextrose (juice) if BS &lt;40; or give continuous D5W diluted with saline, start max 1\u20132 g/hr until BS &gt;40, titrate to keep glucose 40\u201380.</td></tr>
</tbody>
</table></div>

<h2 id="kd-medications">Medication Considerations</h2>
<ul>
<li><strong>Acceptable forms:</strong> Tablets, capsules, IM, IV, rectal, nasal drops, sprays, nebulizers.</li>
<li><strong>Avoid:</strong> Chewables, oral suspensions/liquids/elixirs (use only if no substitute).</li>
<li><strong>Acceptable fever/pain meds:</strong> Brand name Tylenol 325 mg tabs/caps, 500 mg caps; Feverall rectal suppositories (80, 120, 325 mg); Children\u2019s Junior Motrin 100 mg caps; Advil 200 mg caps, 100 mg/5 mL (use sparingly \u2014 contains some carbs).</li>
<li>Addition of concomitant meds including pain management: oral meds must have minimal CHO.</li>
</ul>
`;
}

// ── Step 5: Build Section 2 — VNS ──
function buildVNSSection() {
  const vns = sectionMap['vagus-nerve-stimulator-vns'];
  if (!vns) return '';

  return `
<h1 id="vagus-nerve-stimulator-vns">Vagus Nerve Stimulator (VNS)</h1>
<p>VNS is not a cure. It is used to help control or lessen the severity of seizures. VNS is discussed prior to implantation at the epilepsy surgery conference to determine eligibility.</p>

<h2 id="vns-basics">Basics for Families</h2>
<ul>
<li>The generator is implanted under the skin of the chest; electrodes wrap around the <strong>left vagus nerve</strong> in the neck.</li>
<li>A stimulus is sent to the vagus nerve at programmed intervals to attempt to prevent seizures.</li>
<li>Newer devices (Model 106 and Sentiva) monitor heart rate and deliver a slightly higher current for rapid heart-rate changes that may be associated with seizures.</li>
<li>VNS is activated just after implantation and ramped up via clinic visits and automatic protocols every 1\u20132 weeks.</li>
<li>Battery lasts <strong>6\u201310 years</strong>; generator must be surgically replaced. The lead on the vagus nerve is generally <strong>not removed</strong> due to risk of injury.</li>
</ul>

<h2 id="vns-magnet">Using the Magnet</h2>
<ul>
<li>Swipe the magnet over the generator for a count of <strong>3 seconds</strong>.</li>
<li>Once the magnet is removed, the generator provides a <strong>higher-amplitude pulse</strong> for ~60 seconds to try to abort the seizure or shorten the postictal period.</li>
<li>The magnet can never be used too much or damage the device. The VNS can only be activated every 60 seconds regardless of how many times you swipe.</li>
</ul>

<h2 id="vns-side-effects">Side Effects and Temporary Shut-Off</h2>
<ul>
<li><strong>Side effects:</strong> Local discomfort, throat pain, cough, changes in voice pitch/volume, reflux. These can usually be modulated by adjusting VNS settings.</li>
<li><strong>OSA</strong> can be an adverse effect \u2014 increased daytime sleepiness or worsening snoring should be evaluated with PSG.</li>
<li><strong>To temporarily turn off:</strong> Place the magnet over the generator and tape it in place with heavy tape. As long as the magnet is over the generator, no current is delivered. Remove the magnet to resume normal stimulation.</li>
</ul>

<h2 id="vns-imaging-surgery">Imaging and Surgery Considerations</h2>
<ul>
<li>The VNS lead is ferromagnetic and may heat up in a strong magnetic field. <strong>MRI should not be performed of the chest and upper spine.</strong></li>
<li>Before MRI: set output current to <strong>zero</strong> (can be done by EEG techs/APPs in EMU for inpatients or clinic RNs for outpatients). Restore settings after scan.</li>
<li>Electrocautery during surgery can affect the device. <strong>Interrogate before and after surgery</strong> to ensure proper function. The OR typically requests the device be turned off before surgery and back on after.</li>
</ul>
`;
}

// ── Step 6: Build Section 3 — Infantile Spasms ──
function buildISSection() {
  const is = sectionMap['infantile-spasms'];
  if (!is) return '';

  // The IS section already has good structure from our previous edits.
  // Just clean up the h1 title and keep the content.
  let isHtml = is.html;

  // Replace the h1 with new title
  isHtml = isHtml.replace(
    /<h1 id="infantile-spasms">[^<]*<\/h1>/,
    '<h1 id="infantile-spasms">Infantile Spasms (Infantile Epileptic Spasms Syndrome)</h1>'
  );

  // Promote the intro paragraph to an h2 "Overview" if it's not already
  // The intro is right after the h1: <p>Epilepsy of early infancy...
  const introStart = isHtml.indexOf('</h1>') + 5;
  const firstH2 = isHtml.indexOf('<h2', introStart);
  if (firstH2 > introStart) {
    const introContent = isHtml.substring(introStart, firstH2);
    if (!introContent.includes('<h2')) {
      isHtml = isHtml.substring(0, introStart) +
        '\n<h2 id="is-overview">Overview</h2>' +
        introContent +
        isHtml.substring(firstH2);
    }
  }

  return isHtml;
}

// ── Step 7: Build Section 4 — Seizure Basics and Classification ──
function buildSeizureBasicsSection() {
  const semiology = sectionMap['seizure-semiology'];
  const syndromes = sectionMap['epilepsy-syndromes'];
  const firstUnprovoked = sectionMap['first-unprovoked-afebrile-seizure'];

  let result = '<h1 id="seizure-basics">Seizure Basics and Classification</h1>\n';

  // Core Concepts from Seizure Semiology
  if (semiology) {
    // Remove the old h1 and wrap content in h2
    let content = semiology.html.replace(/<h1[^>]*>[^<]*<\/h1>/, '');
    result += '<h2 id="seizure-core-concepts">Core Concepts</h2>' + content;
  }

  // 2017 Classification from Epilepsy Syndromes
  if (syndromes) {
    // Remove the old h1, keep h2 and below
    let content = syndromes.html.replace(/<h1[^>]*>[^<]*<\/h1>/, '');
    result += content;
  }

  // First Unprovoked Afebrile Seizure
  if (firstUnprovoked) {
    let content = firstUnprovoked.html.replace(
      /<h1[^>]*>[^<]*<\/h1>/,
      '<h2 id="first-unprovoked-afebrile-seizure">First Unprovoked Afebrile Seizure</h2>'
    );
    result += content;
  }

  return result;
}

// ── Step 8: Build Section 5 — Electroclinical Syndromes ──
function buildElectroclinicalSection() {
  const ec = sectionMap['electroclincal-syndromes-by-age'];
  if (!ec) return '';

  let ecHtml = ec.html;

  // The Epilepsy Associations and SUDEP are currently nested under this section.
  // We need to extract them out and only keep the syndromes list.
  const assocIdx = ecHtml.indexOf('<h2 id="epilepsy-associations">');
  if (assocIdx > 0) {
    ecHtml = ecHtml.substring(0, assocIdx);
  }

  return ecHtml;
}

// ── Step 9: Build Section 6 — Epilepsy Associations and SUDEP ──
function buildAssociationsAndSUDEP() {
  const ec = sectionMap['electroclincal-syndromes-by-age'];
  if (!ec) return '';

  let ecHtml = ec.html;

  // Extract Epilepsy Associations and SUDEP from within Electroclinical Syndromes
  const assocIdx = ecHtml.indexOf('<h2 id="epilepsy-associations">');
  if (assocIdx < 0) return '';

  let assocContent = ecHtml.substring(assocIdx);

  // Wrap in a new h1
  return '<h1 id="epilepsy-associations-sudep">Epilepsy Associations and SUDEP</h1>\n' + assocContent;
}

// ── Step 10: Collect remaining sections ──
function getRemainingSections() {
  const remainingIds = [
    'febrile-seizures',
    'epilepsy-and-driving',
  ];

  let result = '';
  for (const id of remainingIds) {
    if (sectionMap[id]) {
      result += sectionMap[id].html;
    }
  }

  // EEG content (Neonatal EEG + EEG Reading Basics + EEG Tips)
  if (sectionMap['eeg-reading-basics']) {
    result += sectionMap['eeg-reading-basics'].html;
  }
  if (sectionMap['eeg-tips']) {
    result += sectionMap['eeg-tips'].html;
  }

  // VPA Toxicity
  if (sectionMap['valproic-acid-toxicity']) {
    result += sectionMap['valproic-acid-toxicity'].html;
  }

  return result;
}

// ── Step 12: Assemble everything ──
console.log('\nBuilding new structure...');

const newKD = buildKDSection();
const newVNS = buildVNSSection();
const newIS = buildISSection();
const newSeizureBasics = buildSeizureBasicsSection();
const newElectroclinical = buildElectroclinicalSection();
const newAssocSUDEP = buildAssociationsAndSUDEP();
const remaining = getRemainingSections();

const newPostBridging = [
  newKD,
  newVNS,
  newIS,
  newSeizureBasics,
  newElectroclinical,
  newAssocSUDEP,
  remaining,
  '\n\n' + uniqueImages.join('\n'),
].join('\n');

// Combine with pre-bridging content
const newHtml = preBridging + newPostBridging;

console.log('\nPre-bridging:', preBridging.length, 'chars');
console.log('New post-bridging:', newPostBridging.length, 'chars');
console.log('Total:', newHtml.length, 'chars');
console.log('End images:', uniqueImages.length);

// Count images
const imgCount = (newHtml.match(/<img /g) || []).length;
const origImgCount = (h.match(/<img /g) || []).length;
console.log('Original image count:', origImgCount);
console.log('New image count:', imgCount);

if (imgCount !== origImgCount) {
  console.log('WARNING: Image count mismatch!');
  // Debug: list all images in new vs old
  const oldImgs = h.match(/src="\/images\/epilepsy\/[^"]+"/g) || [];
  const newImgs = newHtml.match(/src="\/images\/epilepsy\/[^"]+"/g) || [];
  console.log('Old images:', [...new Set(oldImgs)].sort().join(', '));
  console.log('New images:', [...new Set(newImgs)].sort().join(', '));
}

// ── Step 13: Build new TOC ──
// Keep TOC entries from pre-bridging, then rebuild for post-bridging
const bridgingTocIdx = d.toc.findIndex(t => t.id === 'bridging-sick-kids-with-benzos');
const preBridgingToc = d.toc.slice(0, bridgingTocIdx + 1);
// Also include any sub-entries of bridging
let bridgingSubEnd = bridgingTocIdx + 1;
while (bridgingSubEnd < d.toc.length && d.toc[bridgingSubEnd].level > 1) {
  bridgingSubEnd++;
}
const bridgingToc = d.toc.slice(bridgingTocIdx, bridgingSubEnd);

const newPostToc = [
  // KD
  { level: 1, text: 'Ketogenic Diet (KD)', id: 'ketogenic-diet' },
  { level: 2, text: 'Indications and Efficacy', id: 'kd-indications' },
  { level: 2, text: 'Pre-Diet Evaluation', id: 'kd-pre-diet' },
  { level: 2, text: 'Monitoring, Supplementation, and Adverse Effects', id: 'kd-monitoring' },
  { level: 2, text: 'Initiation (EMU or Inpatient)', id: 'kd-initiation' },
  { level: 2, text: 'Illness, NPO, and On-Call Management', id: 'kd-illness-oncall' },
  { level: 2, text: 'Medication Considerations', id: 'kd-medications' },
  // VNS
  { level: 1, text: 'Vagus Nerve Stimulator (VNS)', id: 'vagus-nerve-stimulator-vns' },
  { level: 2, text: 'Basics for Families', id: 'vns-basics' },
  { level: 2, text: 'Using the Magnet', id: 'vns-magnet' },
  { level: 2, text: 'Side Effects and Temporary Shut-Off', id: 'vns-side-effects' },
  { level: 2, text: 'Imaging and Surgery Considerations', id: 'vns-imaging-surgery' },
  // IS
  { level: 1, text: 'Infantile Spasms (IESS)', id: 'infantile-spasms' },
  { level: 2, text: 'Overview', id: 'is-overview' },
  { level: 2, text: 'Epidemiology and Etiology', id: 'is-epidemiology' },
  { level: 3, text: 'Epidemiology', id: 'is-epidemiology-details' },
  { level: 3, text: 'Etiology', id: 'is-etiology' },
  { level: 3, text: 'EEG Requirements', id: 'is-eeg-strategy' },
  { level: 3, text: 'First-Line IS Treatments', id: 'is-first-line-treatments' },
  { level: 3, text: 'IS HTN Monitoring Pathway', id: 'is-htn-pathway' },
  { level: 3, text: 'IS Sick Child Pathway', id: 'is-sick-child' },
  { level: 2, text: 'Treatment Choices', id: 'treatment-choices' },
  { level: 2, text: 'Follow-up for All Therapies', id: 'follow-up-for-all-therapies' },
  // Seizure Basics
  { level: 1, text: 'Seizure Basics and Classification', id: 'seizure-basics' },
  { level: 2, text: 'Core Concepts', id: 'seizure-core-concepts' },
  { level: 2, text: '2017 Seizure Classification', id: '2017-seizure-classification' },
  { level: 2, text: 'First Unprovoked Afebrile Seizure', id: 'first-unprovoked-afebrile-seizure' },
  // Electroclinical Syndromes
  { level: 1, text: 'Electroclinical Syndromes by Age', id: 'electroclincal-syndromes-by-age' },
  // Associations + SUDEP
  { level: 1, text: 'Epilepsy Associations and SUDEP', id: 'epilepsy-associations-sudep' },
  { level: 2, text: 'Epilepsy Associations \u2013 Quick Reference', id: 'epilepsy-associations' },
  { level: 2, text: 'SUDEP', id: 'sudep' },
  // Remaining
  { level: 1, text: 'Febrile Seizures', id: 'febrile-seizures' },
  { level: 1, text: 'Epilepsy and Driving', id: 'epilepsy-and-driving' },
  { level: 1, text: 'EEG Tips', id: 'eeg-tips' },
  { level: 1, text: 'Valproic Acid (VPA) Toxicity', id: 'valproic-acid-toxicity' },
];

d.toc = [...preBridgingToc.slice(0, bridgingTocIdx), ...bridgingToc, ...newPostToc];
d.tocCount = d.toc.length;
d.html = newHtml;
d.imageCount = imgCount;

fs.writeFileSync(fp, JSON.stringify(d, null, 2));
console.log('\nDone. TOC:', d.tocCount, 'Images:', d.imageCount);
