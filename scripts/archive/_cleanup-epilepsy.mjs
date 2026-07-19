import fs from 'fs';

const fp = 'src/data/epilepsy.json';
const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
let h = d.html;

// ════════════════════════════════════════════════════════════════
// STEP 1: Fix bullet formatting globally — replace <p>· and <p>o
// paragraph bullets with proper <ul><li> throughout
// ════════════════════════════════════════════════════════════════
console.log('Step 1: Fixing bullet formatting...');

// Convert sequences of <p>·  lines into <ul><li> blocks
// Match runs of <p>· or <p> · paragraphs
function fixDotBullets(html) {
  // Pattern: one or more consecutive <p>· ... </p> or <p> · ... </p>
  const bulletRun = /(?:<p>\s*[·•]\s+)(.*?)(?:<\/p>)/g;

  // We need a smarter approach: find runs of consecutive bullet paragraphs
  // and wrap them in <ul>
  let result = '';
  let i = 0;

  while (i < html.length) {
    // Check if we're at a bullet paragraph
    const bulletMatch = matchBulletAt(html, i);
    if (bulletMatch) {
      // Collect all consecutive bullets
      const bullets = [];
      let pos = i;
      while (pos < html.length) {
        const bm = matchBulletAt(html, pos);
        if (!bm) break;
        bullets.push(bm.text);
        pos = bm.end;
        // Skip whitespace between bullets
        while (pos < html.length && (html[pos] === '\n' || html[pos] === '\r' || html[pos] === ' ')) pos++;
      }
      if (bullets.length > 0) {
        result += '<ul>' + bullets.map(b => `<li>${b}</li>`).join('') + '</ul>';
        i = pos;
        continue;
      }
    }
    result += html[i];
    i++;
  }
  return result;
}

function matchBulletAt(html, pos) {
  // Match <p>· text</p> or <p> · text</p> or <p>•  text</p>
  const patterns = [
    /^<p>\s*[·•]\s{1,10}/,
    /^<p>\s*o\s{3,}/,  // <p>o   text (sub-bullet with 3+ spaces)
  ];
  for (const pat of patterns) {
    if (pat.test(html.substring(pos))) {
      const closeP = html.indexOf('</p>', pos);
      if (closeP === -1) return null;
      const full = html.substring(pos, closeP + 4);
      const text = full.replace(/^<p>\s*[·•o]\s+/, '').replace(/<\/p>$/, '').trim();
      return { text, end: closeP + 4 };
    }
  }
  return null;
}

h = fixDotBullets(h);
console.log('  Fixed dot-bullet paragraphs → proper <ul><li>');


// ════════════════════════════════════════════════════════════════
// STEP 2: Fix bridging section — remove redundant title echo
// ════════════════════════════════════════════════════════════════
console.log('Step 2: Fixing bridging section...');
h = h.replace(
  '<h1 id="bridging-sick-kids-with-benzos">Bridging Sick Kids with Benzos</h1><p>Bridging Sick Kids with Benzos*</p>',
  '<h1 id="bridging-sick-kids-with-benzos">Bridging Sick Kids with Benzos</h1>'
);

// ════════════════════════════════════════════════════════════════
// STEP 3: Clean up IS section — remove duplicate content
// ════════════════════════════════════════════════════════════════
console.log('Step 3: Cleaning IS section...');

// 3a: Remove orphaned legacy content between sick-child tables and treatment-choices
// This includes duplicate Etiology, duplicate Diagnosis, orphaned BASED score, orphaned prognosis
const sickChildEnd = h.indexOf('</table></div>', h.indexOf('Clinical Stability and Follow'));
const treatmentChoicesTag = '<h2 id="treatment-choices">';
const tcIdx = h.indexOf(treatmentChoicesTag);

if (sickChildEnd > -1 && tcIdx > sickChildEnd) {
  const orphaned = h.substring(sickChildEnd + 14, tcIdx);

  // Extract BASED 2021 scoring table — this is unique content worth keeping
  const basedTableStart = orphaned.indexOf('<div class="table-wrap"><table>');
  const basedTableEnd = orphaned.indexOf('</table></div>', basedTableStart) + 14;
  let basedTable = '';
  if (basedTableStart > -1 && basedTableEnd > basedTableStart) {
    basedTable = orphaned.substring(basedTableStart, basedTableEnd);
    // Fix the table — add proper thead
    basedTable = basedTable.replace(
      '<table><tbody><tr><td><p><strong>2021 BASED Score</strong></p></td><td><p><strong>Description</strong></p></td></tr>',
      '<table><thead><tr><th>2021 BASED Score</th><th>Description</th></tr></thead><tbody>'
    );
  }

  // Extract prognosis bullets — unique content
  const progStart = orphaned.indexOf('<strong>Prognosis:');
  let prognosisHtml = '';
  if (progStart > -1) {
    const progContent = orphaned.substring(progStart);
    // Convert to proper list
    prognosisHtml = '<ul>';
    prognosisHtml += '<li>Resolution of spasms is associated with better developmental outcomes. The primary driving factor is treatment with a standard first-line therapy (ACTH, prednisolone, or vigabatrin).</li>';
    prognosisHtml += '<li>In children with known etiology, prognosis is related to etiology. Children without prior developmental delay or prior seizures may have a better prognosis.</li>';
    prognosisHtml += '<li>50\u201360% develop other seizure types in the future; about 35% develop Lennox\u2013Gastaut syndrome.</li>';
    prognosisHtml += '</ul>';
  }

  // Remove the entire orphaned block
  h = h.substring(0, sickChildEnd + 14) + '\n' + h.substring(tcIdx);
  console.log('  Removed orphaned duplicate content between sick-child and treatment-choices');

  // Insert BASED table and prognosis as new subsections under IS EEG
  const eegStrategyEnd = h.indexOf('</table></div>', h.indexOf('id="is-eeg-strategy"'));
  if (eegStrategyEnd > -1 && basedTable) {
    const insertPos = eegStrategyEnd + 14;
    const basedSection = '\n<h4>Hypsarrhythmia Grading: BASED 2021 Score</h4>\n' +
      '<p>(Mytinger et al, 2021)</p>\n' + basedTable;
    h = h.substring(0, insertPos) + basedSection + h.substring(insertPos);
    console.log('  Inserted BASED 2021 scoring table under EEG Strategy');
  }

  // Insert prognosis under IS overview
  if (prognosisHtml) {
    const overviewEnd = h.indexOf('<h2 id="is-epidemiology">');
    if (overviewEnd > -1) {
      const progSection = '\n<h4>Prognosis</h4>\n' + prognosisHtml + '\n';
      h = h.substring(0, overviewEnd) + progSection + h.substring(overviewEnd);
      console.log('  Inserted prognosis under IS Overview');
    }
  }
}

// 3b: Replace treatment-choices with a clean, non-redundant version
// Keep only the unique operational content: ACTH dosing, Pred dosing, Vigabatrin REMS, and supportive care
console.log('  Rebuilding treatment-choices section...');
const tcStart = h.indexOf('<h2 id="treatment-choices">');
const followUpTag = '<h2 id="follow-up-for-all-therapies">';
const fuIdx = h.indexOf(followUpTag);

if (tcStart > -1 && fuIdx > tcStart) {
  const oldTC = h.substring(tcStart, fuIdx);

  // Extract the ACTH dosing table
  const acthTableStart = oldTC.indexOf('<strong>Table: High dose ACTH Protocol');
  const acthTableEnd = oldTC.indexOf('</table></div>', acthTableStart) + 14;
  const acthTable = oldTC.substring(oldTC.indexOf('<div class="table-wrap"><table>', acthTableStart), acthTableEnd);
  // Fix ACTH table - add thead
  const acthTableFixed = acthTable
    .replace('<table><tbody><tr><td><p><strong>Schedule</strong></p></td><td><p><strong>Dosing – via intramuscular injection</strong></p></td></tr>',
             '<table><thead><tr><th>Schedule</th><th>Dosing (intramuscular injection)</th></tr></thead><tbody>');

  // Extract prednisolone schedule table
  const predTableStart = oldTC.indexOf('<strong>Table: Oral Prednisolone Protocol');
  const predTableEnd = oldTC.indexOf('</table></div>', predTableStart) + 14;
  const predTable = oldTC.substring(oldTC.indexOf('<div class="table-wrap"><table>', predTableStart), predTableEnd);
  // Fix pred table - add thead
  const predTableFixed = predTable
    .replace('<table><tbody><tr><td><p>Days </p></td><td><p>Dose – prednisolone 15 mg/5 mL suspension</p></td></tr>',
             '<table><thead><tr><th>Days</th><th>Dose (prednisolone 15 mg/5 mL suspension)</th></tr></thead><tbody>');

  // Extract weight-based dosing table
  const weightTableStart = oldTC.indexOf('<p><strong>Dosing</strong></p>', predTableEnd);
  let weightTableEnd = oldTC.indexOf('</table></div>', weightTableStart) + 14;
  const weightTable = oldTC.substring(oldTC.indexOf('<div class="table-wrap"><table>', weightTableStart), weightTableEnd);
  // Fix weight table - add thead, remove empty rows
  const weightTableFixed = weightTable
    .replace('<thead><tr><th><p><strong>Weight (kg)*</strong></p></th><th></th><th><p><strong>mg per dose</strong></p></th><th><p><strong>mL per dose</strong></p></th></tr></thead>',
             '<thead><tr><th>Weight (kg)*</th><th>mg per dose</th><th>mL per dose</th></tr></thead>')
    .replace(/<tr><td><p>\*round up[^<]*<\/p><\/td><td><\/td><td><\/td><td><\/td><\/tr>/, '')
    .replace(/<tr><td><\/td><td><\/td><td><\/td><td><\/td><\/tr>/, '')
    // Collapse 4-col to 3-col rows by removing empty td
    .replace(/<tr><td>(.*?)<\/td><td>(.*?)<\/td><td><\/td><td>(.*?)<\/td><\/tr>/g, '<tr><td>$1</td><td>$2</td><td>$3</td></tr>')
    .replace(/<tr><td><p>(.*?)<\/p><\/td><td><p>(.*?)<\/p><\/td><td><\/td><td><p>(.*?)<\/p><\/td><\/tr>/g,
             '<tr><td>$1</td><td>$2</td><td>$3</td></tr>');

  // Extract vigabatrin options table
  const vigTableStart = oldTC.indexOf('VIGABATRIN OPTIONS');
  const vigTableEnd = oldTC.indexOf('</table></div>', vigTableStart) + 14;
  const vigTable = oldTC.substring(oldTC.indexOf('<div class="table-wrap"><table>', vigTableStart), vigTableEnd);

  // Build new clean treatment-choices
  const newTC = `<h2 id="treatment-choices">Treatment Protocols and Dosing</h2>
<p><em>See also: First-Line IS Treatments table above for pros/cons comparison.</em></p>

<h3 id="is-response-rates">Response Rates</h3>
<div class="table-wrap"><table>
<thead><tr><th>Treatment tier</th><th>Response rate</th></tr></thead>
<tbody>
<tr><td><strong>First-line</strong> (ACTH, prednisolone, vigabatrin)</td><td>~46% overall; higher for steroids (Knupp et al, Ann Neurol 2016; Lux et al, UKISS trial, Lancet 2005)</td></tr>
<tr><td><strong>Second-line</strong> (topiramate, zonisamide, valproate)</td><td>~9%</td></tr>
</tbody>
</table></div>
<p>Etiology and development do <strong>not</strong> influence response patterns (exception: vigabatrin is superior for TSC).</p>

<h3 id="is-acth-protocol">High-Dose ACTH Protocol</h3>
<p>75 units/m<sup>2</sup>/dose twice daily IM, based on body surface area (requires weight and height). <strong>Attending and at least one other person must verify dosing.</strong></p>
${acthTableFixed}

<h3 id="is-pred-protocol">Prednisolone Protocol</h3>
<p>Very high dose: 8 mg/kg/day (~2.6 mg/kg/dose TID). Max 60 mg/day. Prednisolone (active metabolite of prednisone) may have better bioavailability.</p>
${predTableFixed}
<p><strong>Weight-based dosing reference:</strong></p>
${weightTableFixed}
<p><em>*Round up to nearest 0.1 kg. Example: 5 kg infant receives 12 mg (4 mL) TID \u00d7 2 weeks, then BID \u00d7 1 week, then daily \u00d7 1 week, then stop.</em></p>

<h3 id="is-treatment-failure">Treatment Failure</h3>
<p>If ACTH or prednisolone fails after 2 weeks, consider switching to an alternative agent with a different mechanism (e.g., vigabatrin). Taper steroids per protocol while simultaneously starting the alternative. If expedited taper is needed, consult endocrinology.</p>

<h3 id="is-supportive-care">Supportive Care During Steroid Treatment</h3>
<div class="table-wrap"><table>
<thead><tr><th>Domain</th><th>Details</th></tr></thead>
<tbody>
<tr><td><strong>GI prophylaxis</strong></td><td>H<sub>2</sub> blocker or PPI \u00d7 4 weeks.</td></tr>
<tr><td><strong>PJP prophylaxis</strong></td><td>Bactrim 2.5 mg/kg/dose BID on Mon/Tue/Wed \u00d7 8 weeks.</td></tr>
<tr><td><strong>Immunizations</strong></td><td>Defer <strong>live-virus vaccines</strong> until 4 weeks after stopping steroids. Inactivated vaccines may be given during treatment.</td></tr>
<tr><td><strong>Stress-dose steroids</strong></td><td>Adrenal insufficiency persists for a period equal to the treatment course after cessation. With illness (fever, vomiting, diarrhea, hospitalization, trauma), evaluate for hypoglycemia/hypotension and give stress-dose steroids as needed. Consult endocrinology.</td></tr>
<tr><td><strong>Monitoring</strong></td><td>Common steroid side effects: HTN, hyperglycemia, irritability, immunosuppression, GI irritation, increased appetite, adrenal crisis. BP 2\u20133\u00d7/week; weekly glucose.</td></tr>
<tr><td><strong>Pre-treatment screening</strong></td><td>Screen for illness and TB risk. For high-risk patients, place PPD (preferable to QuantiFERON in children &lt;2y) and confirm negative before starting steroids.</td></tr>
</tbody>
</table></div>

<h3 id="is-vigabatrin-protocol">Vigabatrin Protocol</h3>
<p><strong>REMS enrollment required before prescribing.</strong> Review \u201cWhat You Need to Know About Vigabatrin Treatment\u201d with families and complete Parent/Physician agreement form.</p>
<div class="table-wrap"><table>
<thead><tr><th>Step</th><th>Details</th></tr></thead>
<tbody>
<tr><td><strong>Dosing</strong></td><td>50 mg/kg/day divided BID \u00d7 3 days \u2192 100 mg/kg/day divided BID \u00d7 3 days \u2192 150 mg/kg/day divided BID. Target max: 70\u201380 mg/kg/dose BID.</td></tr>
<tr><td><strong>Slow titration option</strong></td><td>For patients at risk of side effects (e.g., somnolence): 25 mg/kg/dose BID \u00d7 3d \u2192 40 \u2192 60 \u2192 75 mg/kg/dose BID.</td></tr>
<tr><td><strong>Ophthalmology</strong></td><td>Baseline screening before or within 4 weeks of start, then every 3 months during treatment, and 3\u20136 months after stopping.</td></tr>
<tr><td><strong>Rounding</strong></td><td>Doses can be rounded to nearest 25 mg and/or packet size for convenience.</td></tr>
</tbody>
</table></div>

<h4>Vigabatrin Manufacturer Options</h4>
${vigTable}
<p><strong>Weekend/holiday note:</strong> REMS forms processed Mon\u2013Fri 8 AM\u20138 PM EST only. Vigadrone Access Pathways: Mon\u2013Fri 8 AM\u20138 PM EST. ACTHAR Support: Mon\u2013Fri 8 AM\u20139 PM EST, Sat 9 AM\u20132 PM EST.</p>

`;

  h = h.substring(0, tcStart) + newTC + h.substring(fuIdx);
  console.log('  Replaced treatment-choices with clean structured version');
}


// ════════════════════════════════════════════════════════════════
// STEP 4: Move is-heterotopia-genes image to IS etiology section
// ════════════════════════════════════════════════════════════════
console.log('Step 4: Moving IS heterotopia genes image...');
const hetImg = '<p><img src="/images/epilepsy/is-heterotopia-genes.png" alt="Genes associated with subcortical band heterotopia and cortical malformations" class="max-w-full rounded-lg my-4 mx-auto block"></p>';
if (h.includes(hetImg)) {
  h = h.replace(hetImg, '');
  // Place after etiology table
  const etiologyEnd = h.indexOf('</table></div>', h.indexOf('id="is-etiology"'));
  if (etiologyEnd > -1) {
    h = h.substring(0, etiologyEnd + 14) + '\n' + hetImg + '\n' + h.substring(etiologyEnd + 14);
    console.log('  Moved is-heterotopia-genes.png to IS Etiology section');
  }
}

// ════════════════════════════════════════════════════════════════
// STEP 5: Move helpful-tips and Neonatal EEG Waveforms from SUDEP to EEG
// ════════════════════════════════════════════════════════════════
console.log('Step 5: Moving EEG tips from SUDEP to EEG section...');

// Find and extract the misplaced content (Neonatal EEG Waveforms + helpful-tips h3 + neuroanatomy images)
const neoEegWaveformsP = '<p><strong>Neonatal EEG Normal Waveforms';
const neoIdx = h.indexOf(neoEegWaveformsP);
const helpfulTipsH3 = '<h3 id="helpful-tips">';
const helpfulIdx = h.indexOf(helpfulTipsH3);

if (neoIdx > -1 && helpfulIdx > -1) {
  // Find the end: after "Remember to use your notch filter.</p>"
  const notchEnd = h.indexOf('Remember to use your notch filter.</p>', helpfulIdx);
  let extractEnd;
  if (notchEnd > -1) {
    extractEnd = notchEnd + 'Remember to use your notch filter.</p>'.length;
  } else {
    // Fallback: find next h1
    extractEnd = h.indexOf('<h1', helpfulIdx + 10);
  }

  const eegTipsContent = h.substring(neoIdx, extractEnd);

  // Remove from current location
  h = h.substring(0, neoIdx) + h.substring(extractEnd);

  // Insert before EEG Tips heading
  const eegTipsHeading = '<h1 id="eeg-tips">';
  const eegTipsIdx = h.indexOf(eegTipsHeading);
  if (eegTipsIdx > -1) {
    // Restructure: give it a proper h2 heading under a new h1
    const cleanedEegTips = eegTipsContent
      .replace(neoEegWaveformsP, '<h2 id="neonatal-eeg-waveforms">Neonatal EEG Normal Waveforms')
      .replace(helpfulTipsH3, '<h2 id="eeg-helpful-tips">')
      .replace('</strong></p>', '</h2>')
      .replace('>Helpful Tips:</h3>', '>Helpful Tips</h2>');

    h = h.substring(0, eegTipsIdx) + cleanedEegTips + '\n' + h.substring(eegTipsIdx);
    console.log('  Moved Neonatal EEG + Helpful Tips before EEG Tips');
  }
}

// ════════════════════════════════════════════════════════════════
// STEP 6: Move neuroanatomy images (Papez, hippocampal) to
// Seizure Basics near semiology content
// ════════════════════════════════════════════════════════════════
console.log('Step 6: Moving neuroanatomy images...');
const anatImgs = [
  'papez-circuit-block.png',
  'papez-circuit-anatomy.png',
  'hippocampal-anatomy.png',
  'medial-temporal-anatomy.png'
];
let anatHtml = '';
for (const img of anatImgs) {
  const imgTag = new RegExp(`<p><img[^>]*src="/images/epilepsy/${img}"[^>]*></p>\\n*`, 'g');
  const match = h.match(imgTag);
  if (match) {
    anatHtml += match[0];
    h = h.replace(imgTag, '');
  }
}
if (anatHtml) {
  // Place at end of Epilepsy Associations section, before SUDEP
  // Actually, place under a new subsection in Seizure Basics
  const coreConceptsH2 = 'id="seizure-core-concepts"';
  const coreIdx = h.indexOf(coreConceptsH2);
  if (coreIdx > -1) {
    // Find first image in core concepts — place anatomy images after the semiology images
    const nextH2 = h.indexOf('<h2', coreIdx + 50);
    if (nextH2 > -1) {
      const anatSection = '<h3 id="neuroanatomy-reference">Neuroanatomy Reference</h3>\n' +
        '<p>Key structures in temporal lobe epilepsy and seizure circuitry:</p>\n' + anatHtml;
      h = h.substring(0, nextH2) + anatSection + '\n' + h.substring(nextH2);
      console.log('  Placed neuroanatomy images under Seizure Basics');
    }
  }
}

// ════════════════════════════════════════════════════════════════
// STEP 7: Distribute EEG images from delta-waves dump
// ════════════════════════════════════════════════════════════════
console.log('Step 7: Distributing EEG images...');

// Define where each EEG image should go
const eegImagePlacements = [
  // Electrode placement images → after EEG tips heading area
  { file: 'eeg-1020-electrode-map.png', after: 'id="eeg-tips"', skip: 100 },
  { file: 'eeg-electrode-regions.png', after: 'eeg-1020-electrode-map.png' },
  { file: 'eeg-1020-montage-freqs.png', after: 'eeg-electrode-regions.png' },
  // Rhythms table → after frequency band intro (before alpha heading)
  { file: 'eeg-rhythms-table.png', before: 'id="alpha-waves"' },
  // Sleep images → after sleep discussion in template area
  { file: 'eeg-sleep-stages.png', after: 'id="delta-waves"', skip: 50 },
  { file: 'eeg-sleep-rhythms.png', after: 'eeg-sleep-stages.png' },
  // Abnormal activity and events → after epileptiform abnormalities discussion
  { file: 'eeg-abnormal-activity.png', after: 'eeg-sleep-rhythms.png' },
  { file: 'eeg-events-definitions.png', after: 'eeg-abnormal-activity.png' },
  // Photic → after photic discussion
  { file: 'eeg-photic-responses.png', after: 'eeg-events-definitions.png' },
  // Neonatal images → after neonatal EEG section
  { file: 'eeg-neonatal-development.gif', after: 'id="neonatal-eeg-waveforms"', skip: 50 },
  { file: 'eeg-neonatal-patterns-by-age.png', after: 'eeg-neonatal-development.gif' },
  { file: 'eeg-neonatal-abnormalities.png', after: 'eeg-neonatal-patterns-by-age.png' },
];

// First, strip all EEG images from their current locations
const eegFiles = eegImagePlacements.map(p => p.file);
for (const file of eegFiles) {
  const re = new RegExp(`<p><img[^>]*src="/images/epilepsy/${file.replace('.', '\\.')}"[^>]*></p>\\n*`, 'g');
  h = h.replace(re, '');
}
console.log('  Stripped all EEG images from current positions');

// Get the original alt text for each image
const eegAlts = {
  'eeg-1020-electrode-map.png': 'International 10-20 EEG electrode placement system',
  'eeg-electrode-regions.png': 'Brain regions corresponding to EEG electrode positions',
  'eeg-rhythms-table.png': 'EEG frequency bands: alpha, beta, theta, delta',
  'eeg-abnormal-activity.png': 'Abnormal EEG activity: epileptiform and non-epileptiform patterns',
  'eeg-events-definitions.png': 'EEG waveform terminology: spikes, sharp waves, complexes',
  'eeg-sleep-stages.png': 'EEG features by sleep stage',
  'eeg-sleep-rhythms.png': 'Sleep-related EEG components: vertex waves, spindles, K-complexes, POSTS',
  'eeg-photic-responses.png': 'Photic stimulation EEG responses',
  'eeg-1020-montage-freqs.png': '10-20 electrode montage with EEG frequency bands',
  'eeg-neonatal-development.gif': 'Normal EEG developmental patterns by conceptional age',
  'eeg-neonatal-patterns-by-age.png': 'Neonatal EEG patterns by conceptional age',
  'eeg-neonatal-abnormalities.png': 'Neonatal EEG abnormalities: maturation, epileptiform, and background',
};

// Now place each image
for (const placement of eegImagePlacements) {
  const imgTag = `<p><img src="/images/epilepsy/${placement.file}" alt="${eegAlts[placement.file]}" class="max-w-full rounded-lg my-4 mx-auto block"></p>`;

  if (placement.before) {
    const idx = h.indexOf(placement.before);
    if (idx > -1) {
      // Find the start of the tag containing this id
      const tagStart = h.lastIndexOf('<', idx);
      h = h.substring(0, tagStart) + imgTag + '\n' + h.substring(tagStart);
      continue;
    }
  }

  if (placement.after) {
    const idx = h.indexOf(placement.after);
    if (idx > -1) {
      const skip = placement.skip || 0;
      // Find the end of the current paragraph/element after the anchor
      let insertPos = idx + placement.after.length + skip;
      // Find end of next </p> or </ul> or </div> after insertPos
      const nextClose = h.indexOf('</p>', insertPos);
      const nextUl = h.indexOf('</ul>', insertPos);
      const nextDiv = h.indexOf('</div>', insertPos);
      const candidates = [nextClose + 4, nextUl + 5, nextDiv + 6].filter(p => p > insertPos);
      insertPos = Math.min(...candidates);
      h = h.substring(0, insertPos) + '\n' + imgTag + '\n' + h.substring(insertPos);
      continue;
    }
  }
}
console.log('  Placed EEG images in contextual locations');


// ════════════════════════════════════════════════════════════════
// STEP 8: Convert Electroclinical Syndromes from paragraphs to table
// ════════════════════════════════════════════════════════════════
console.log('Step 8: Converting Electroclinical Syndromes to table...');

const ecHeading = '<h1 id="electroclincal-syndromes-by-age">';
const ecIdx = h.indexOf(ecHeading);
const ecNextH1 = h.indexOf('<h1', ecIdx + 10);

if (ecIdx > -1 && ecNextH1 > -1) {
  // Find the electroclinical syndromes chart image
  const ecImgTag = h.substring(ecIdx, ecNextH1).match(/<p><img[^>]*electroclinical-syndromes-chart[^>]*><\/p>/);
  const ecImage = ecImgTag ? ecImgTag[0] : '';

  const newEC = `<h1 id="electroclincal-syndromes-by-age">Electroclinical Syndromes by Age</h1>
<p><em>Revised ILAE Classification (Epilepsia, 51(4):676\u2013685, 2010)</em></p>
<div class="table-wrap"><table>
<thead><tr><th>Age period</th><th>Syndromes</th></tr></thead>
<tbody>
<tr><td><strong>Neonatal</strong></td><td>Benign familial neonatal epilepsy (BFNE); Early myoclonic encephalopathy (EME); Ohtahara syndrome</td></tr>
<tr><td><strong>Infancy</strong></td><td>Epilepsy of infancy with migrating focal seizures; West syndrome; Myoclonic epilepsy in infancy (MEI); Benign infantile epilepsy; Benign familial infantile epilepsy; Dravet syndrome; Myoclonic encephalopathy in nonprogressive disorders</td></tr>
<tr><td><strong>Childhood</strong></td><td>Febrile seizures plus (FS+); Panayiotopoulos syndrome; Epilepsy with myoclonic-atonic seizures; BECTS; ADNFLE; Late-onset childhood occipital epilepsy (Gastaut type); Epilepsy with myoclonic absences; Lennox\u2013Gastaut syndrome; CSWS; Landau\u2013Kleffner syndrome (LKS); Childhood absence epilepsy (CAE)</td></tr>
<tr><td><strong>Adolescence\u2013Adult</strong></td><td>Juvenile absence epilepsy (JAE); Juvenile myoclonic epilepsy (JME); Epilepsy with generalized tonic\u2013clonic seizures alone; Progressive myoclonus epilepsies (PME); ADEAF; Other familial temporal lobe epilepsies</td></tr>
<tr><td><strong>Less specific age</strong></td><td>Familial focal epilepsy with variable foci; Reflex epilepsies</td></tr>
<tr><td><strong>Distinctive constellations</strong></td><td>MTLE with hippocampal sclerosis; Rasmussen syndrome; Gelastic seizures with hypothalamic hamartoma; Hemiconvulsion\u2013hemiplegia\u2013epilepsy</td></tr>
<tr><td><strong>Structural\u2013metabolic</strong></td><td>Malformations of cortical development; Neurocutaneous syndromes; Tumor; Infection; Trauma; Angioma; Perinatal insults; Stroke</td></tr>
<tr><td><strong>Not classified as epilepsy per se</strong></td><td>Benign neonatal seizures (BNS); Febrile seizures (FS)</td></tr>
</tbody>
</table></div>
${ecImage ? '\n' + ecImage + '\n' : ''}`;

  h = h.substring(0, ecIdx) + newEC + h.substring(ecNextH1);
  console.log('  Converted to structured table');
}

// ════════════════════════════════════════════════════════════════
// STEP 9: Convert Syndromes subsection to table
// ════════════════════════════════════════════════════════════════
console.log('Step 9: Converting Syndromes to table...');

const syndromesH3 = '<h3 id="syndromes">';
const syndIdx = h.indexOf(syndromesH3);
const firstUnprovoked = '<h2 id="first-unprovoked-afebrile-seizure">';
const fuaIdx = h.indexOf(firstUnprovoked);

if (syndIdx > -1 && fuaIdx > syndIdx) {
  // The ILAE images are between syndromes content and first-unprovoked
  // Extract the images
  const syndContent = h.substring(syndIdx, fuaIdx);
  const ilaeImages = syndContent.match(/<p><img[^>]*ilae[^>]*><\/p>/g) || [];
  const ilaeImgHtml = ilaeImages.join('\n');

  const newSyndromes = `<h3 id="syndromes">Common Epilepsy Syndromes</h3>
<div class="table-wrap"><table>
<thead><tr><th>Syndrome</th><th>Onset</th><th>Key seizure types</th><th>EEG</th><th>Treatment</th><th>Prognosis</th></tr></thead>
<tbody>
<tr><td><strong>Doose (EMAS)</strong></td><td>2\u20134 yr</td><td>Myoclonic, atonic, GTC, absence</td><td>Central theta</td><td>Valproate, clobazam, rufinamide; very sensitive to KD and felbamate</td><td>Usually \u201cburns out;\u201d many with some intellectual delay</td></tr>
<tr><td><strong>Dravet (SCN1A)</strong></td><td>Infancy</td><td>Prolonged febrile convulsions, GTC, status, myoclonus</td><td>Variable</td><td>Depakote + clobazam + stiripentol; fenfluramine, Epidiolex. <strong>Avoid Na channel blockers.</strong></td><td>Poor development</td></tr>
<tr><td><strong>Lennox\u2013Gastaut</strong></td><td>&lt;4 yr</td><td>Tonic, atonic, atypical absence, myoclonic</td><td>Slow spike-and-wave, paroxysmal fast activity</td><td>Most ASMs</td><td>Usually poor</td></tr>
<tr><td><strong>West syndrome</strong></td><td>Infancy</td><td>Epileptic spasms</td><td>Hypsarrhythmia</td><td>ACTH, prednisolone, vigabatrin, KD</td><td>Poor</td></tr>
<tr><td><strong>CAE</strong></td><td>2\u201312 yr (avg 5\u20136)</td><td>Absence; 10\u201340% GTC</td><td>3 Hz generalized spike-wave</td><td>Ethosuximide, valproate, lamotrigine</td><td>Resolves in most; predisposed to ADHD</td></tr>
<tr><td><strong>JAE</strong></td><td>Puberty</td><td>Absence (less frequent, longer than CAE); 80% GTC</td><td>3\u20134 Hz spike-wave</td><td>Valproate, lamotrigine, \u00b1ethosuximide</td><td>Med responsive but commonly lifelong</td></tr>
<tr><td><strong>JME</strong></td><td>Puberty+</td><td>Myoclonic, GTC, sometimes absence</td><td>Generalized polyspike-wave</td><td>Valproate, lamotrigine, levetiracetam</td><td>Usually med responsive; lifelong therapy. 25% achieve long-term freedom off meds</td></tr>
<tr><td><strong>Ohtahara</strong></td><td>First 3 mo</td><td>Epileptic spasms, focal seizures</td><td>Suppression-burst</td><td>ACTH, vigabatrin, clobazam, zonisamide, surgery</td><td>Very poor; high mortality</td></tr>
<tr><td><strong>SeLECTS</strong></td><td>3\u201314 yr (peak 8\u20139)</td><td>Focal orofacial convulsions, may generalize</td><td>Centrotemporal spikes with horizontal dipole</td><td>Often none needed; oxcarbazepine or carbamazepine if frequent</td><td>Excellent; resolves by ~13 yr</td></tr>
</tbody>
</table></div>
<p><em>*Onset of absence seizures &lt;4 yo: consider glucose transporter disorders (GLUT1 deficiency).</em></p>
${ilaeImgHtml}
`;

  h = h.substring(0, syndIdx) + newSyndromes + h.substring(fuaIdx);
  console.log('  Converted syndromes to table');
}

// ════════════════════════════════════════════════════════════════
// STEP 10: Fix Febrile Seizures formatting
// ════════════════════════════════════════════════════════════════
console.log('Step 10: Fixing Febrile Seizures...');

// Remove broken flow diagram reference
h = h.replace('<p>Below is a flow diagram that you may want to consider, please also refer to your attending.</p>', '');

// Fix duplicate reference
h = h.replace(
  '<p>Complex Febrile Seizures: A Practical Guide to Evaluation and Treatment. Journal of Child Neurology, 2013.</p><p>Good articles for febrile seizures</p><p>Patel and Vidaurre. Complex Febrile Seizures: A Practical Guide to Evaluation and Treatment. Journal of Child Neurology, 2013.</p>',
  '<h4>Key References</h4><ul><li>Patel and Vidaurre. Complex Febrile Seizures: A Practical Guide to Evaluation and Treatment. <em>J Child Neurol</em>, 2013.</li>'
);
h = h.replace(
  '<p>Febrile Seizures: Clinical Practice Guideline for the Long-term Management of the Child With Simple Febrile Seizures: <em>Pediatrics </em>2008;121:1281\u20131286</p><p>Shinnar and Glauser. Febrile Seizures:  <em>J Child Neurol </em>2002;17:S44\u2013S52).</p>',
  '<li>AAP Clinical Practice Guideline: Long-term Management of Simple Febrile Seizures. <em>Pediatrics</em> 2008;121:1281\u20131286.</li><li>Shinnar and Glauser. Febrile Seizures. <em>J Child Neurol</em> 2002;17:S44\u2013S52.</li></ul>'
);

// ════════════════════════════════════════════════════════════════
// STEP 11: Fix Epilepsy and Driving formatting (o bullets)
// ════════════════════════════════════════════════════════════════
console.log('Step 11: Fixing Epilepsy and Driving...');
// Already handled by Step 1 bullet conversion

// ════════════════════════════════════════════════════════════════
// STEP 12: Fix EEG Reading Basics — broken table
// ════════════════════════════════════════════════════════════════
console.log('Step 12: Fixing EEG Reading Basics...');
const eegBasicsHeading = '<h1 id="eeg-reading-basics">';
const eegBasicsIdx = h.indexOf(eegBasicsHeading);
const eegTipsH1 = '<h1 id="eeg-tips">';
const eegTipsH1Idx = h.indexOf(eegTipsH1);

if (eegBasicsIdx > -1 && eegTipsH1Idx > eegBasicsIdx) {
  const oldBasics = h.substring(eegBasicsIdx, eegTipsH1Idx);

  const newBasics = `<h1 id="eeg-reading-basics">EEG Reading Basics</h1>
<h2 id="sleep-stages-eeg">Sleep Stages on EEG</h2>
<div class="table-wrap"><table>
<thead><tr><th>Stage</th><th>Key features</th></tr></thead>
<tbody>
<tr><td><strong>Stage W</strong></td><td>Wakefulness \u2014 posterior dominant rhythm present</td></tr>
<tr><td><strong>Drowsiness</strong></td><td>Fluctuation in alpha rhythm, fronto-central slowing, overall voltage loss</td></tr>
<tr><td><strong>Stage N1</strong></td><td>Vertex waves, positive occipital sharp transients of sleep (POSTS)</td></tr>
<tr><td><strong>Stage N2</strong></td><td>Sleep spindles and K-complexes (vertex waves may persist)</td></tr>
<tr><td><strong>Stage N3</strong></td><td>Slow-wave sleep \u2014 appearance of delta activity (spindles may persist)</td></tr>
<tr><td><strong>Stage R</strong></td><td>REM sleep \u2014 low-voltage fast activity, no alpha, rapid lateral eye movements</td></tr>
</tbody>
</table></div>
`;

  h = h.substring(0, eegBasicsIdx) + newBasics + h.substring(eegTipsH1Idx);
  console.log('  Replaced broken table with clean sleep stages table');
}


// ════════════════════════════════════════════════════════════════
// STEP 13: Clean up EEG Tips template section
// ════════════════════════════════════════════════════════════════
console.log('Step 13: Cleaning EEG Tips template...');

// Replace the messy template paragraphs with a structured table
const templateStart = h.indexOf('<p>Template:</p>', h.indexOf('id="eeg-tips"'));
const alphaWaves = h.indexOf('<h2 id="alpha-waves">');

if (templateStart > -1 && alphaWaves > templateStart) {
  const newTemplate = `<h2 id="eeg-reading-template">EEG Reading Template</h2>
<div class="table-wrap"><table>
<thead><tr><th>Field</th><th>Notes</th></tr></thead>
<tbody>
<tr><td><strong>Patient</strong></td><td>Name, DOB, conditions</td></tr>
<tr><td><strong>Technical</strong></td><td># channels, EKG channel (y/n), # eye channels, LFF, HFF, notch, sensitivity, timebase</td></tr>
<tr><td><strong>State</strong></td><td>Awake / drowsy / sleep</td></tr>
<tr><td><strong>Posterior rhythm</strong></td><td>Frequency (Hz), symmetry, organization</td></tr>
<tr><td><strong>Hyperventilation</strong></td><td>Present/absent; symmetric/asymmetric; \u201cbuild-up\u201d (slowing + amplitude increase with quality HV)?</td></tr>
<tr><td><strong>Photic stimulation</strong></td><td>At what frequencies did the posterior rhythm track? Photic response after 20 Hz?</td></tr>
<tr><td><strong>Sleep</strong></td><td>Present/absent; architecture normal? N1 (slow rolling eye mvmts, EMG drops); N2 (spindles, K-complexes); N3 (large-amplitude delta)</td></tr>
<tr><td><strong>Focal slowing</strong></td><td>Areas of consistently slower waveforms regardless of morphology or sharpness</td></tr>
<tr><td><strong>Epileptiform abnormalities</strong></td><td>Morphology: spikes (20\u201370 ms), sharp waves (70\u2013200 ms), spike-and-slow-wave, polyspike complexes. Location, frequency, activation state.</td></tr>
</tbody>
</table></div>
`;

  h = h.substring(0, templateStart) + newTemplate + h.substring(alphaWaves);
  console.log('  Replaced messy template paragraphs with structured table');
}


// ════════════════════════════════════════════════════════════════
// STEP 14: Rebuild TOC
// ════════════════════════════════════════════════════════════════
console.log('Step 14: Rebuilding TOC...');

const tocEntries = [];
const headingRe = /<h([1-3])\s+id="([^"]+)"[^>]*>(.*?)<\/h\1>/g;
let match;
while ((match = headingRe.exec(h)) !== null) {
  const level = parseInt(match[1]);
  let text = match[3]
    .replace(/<[^>]+>/g, '')  // strip inner HTML tags
    .replace(/\s+/g, ' ')
    .trim();
  // Clean up trailing colons and whitespace
  text = text.replace(/:?\s*$/, '');
  if (text) {
    tocEntries.push({ level, text, id: match[2] });
  }
}

d.toc = tocEntries;
d.tocCount = tocEntries.length;

// ════════════════════════════════════════════════════════════════
// STEP 15: Update counts and save
// ════════════════════════════════════════════════════════════════
d.html = h;
d.imageCount = (h.match(/<img /g) || []).length;

// Verify no duplicate images
const allSrcs = h.match(/src="\/images\/epilepsy\/[^"]+"/g) || [];
const srcCounts = {};
allSrcs.forEach(s => srcCounts[s] = (srcCounts[s] || 0) + 1);
const dupes = Object.entries(srcCounts).filter(([, c]) => c > 1);
if (dupes.length) {
  console.log('\nWARNING: Duplicate images:');
  dupes.forEach(([s, c]) => console.log(`  ${s} x${c}`));
}

fs.writeFileSync(fp, JSON.stringify(d, null, 2));
console.log(`\nDone. Images: ${d.imageCount}, TOC: ${d.tocCount}`);
console.log('TOC entries:');
tocEntries.forEach(t => console.log(`  ${'  '.repeat(t.level - 1)}${t.text} (${t.id})`));

// Update index.json
const indexPath = 'src/data/index.json';
const idx = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
const epEntry = idx.find(e => e.slug === 'epilepsy');
if (epEntry) {
  epEntry.tocCount = d.tocCount;
  epEntry.imageCount = d.imageCount;
  fs.writeFileSync(indexPath, JSON.stringify(idx, null, 2));
  console.log(`Updated index.json: tocCount=${d.tocCount}, imageCount=${d.imageCount}`);
}
