import fs from 'fs';

const fp = 'src/data/epilepsy.json';
const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
let h = d.html;

// === Locate boundaries ===
const basicsH1Pos = h.indexOf('id="eeg-reading-basics"');
const basicsStart = h.lastIndexOf('<h1', basicsH1Pos);
const vpaH1Pos = h.indexOf('id="valproic-acid-toxicity"');
const vpaStart = h.lastIndexOf('<h1', vpaH1Pos);

console.log('Replacing from', basicsStart, 'to', vpaStart);

// Extract existing images from the old section for reuse
const oldSection = h.substring(basicsStart, vpaStart);
const imgMap = {};
const imgMatches = [...oldSection.matchAll(/<img[^>]*?src="([^"]*)"[^>]*>/g)];
imgMatches.forEach(m => {
  const src = m[1];
  const key = src.split('/').pop().replace(/\.[^.]+$/, '');
  imgMap[key] = m[0];
});
console.log('Images found:', Object.keys(imgMap));

function img(key) {
  return imgMap[key] ? `<p>${imgMap[key]}</p>` : '';
}

// Helper for building tables
function table(headers, rows) {
  let html = '<div class="table-wrap"><table><thead><tr>';
  headers.forEach(h => { html += `<th>${h}</th>`; });
  html += '</tr></thead><tbody>';
  rows.forEach(row => {
    html += '<tr>';
    row.forEach(cell => { html += `<td>${cell}</td>`; });
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  return html;
}

// === Build new HTML ===
const newHtml = [
  // H1: EEG Reading Basics
  '<h1 id="eeg-reading-basics">EEG Reading Basics</h1>',
  img('eeg-1020-electrode-map'),
  img('eeg-electrode-regions'),
  img('eeg-1020-montage-freqs'),

  // H2: Sleep Stages on EEG
  '<h2 id="sleep-stages-eeg">Sleep Stages on EEG</h2>',
  table(
    ['Stage', 'Key EEG features'],
    [
      ['Wake (Stage W)', 'Posterior dominant rhythm present; desynchronized background with eye opening.'],
      ['Drowsiness', 'Fluctuating alpha, fronto\u2011central slowing, overall voltage loss.'],
      ['N1', 'Vertex waves; positive occipital sharp transients of sleep (POSTS).'],
      ['N2', 'Sleep spindles and K\u2011complexes; vertex waves and POSTS may persist.'],
      ['N3', 'Slow\u2011wave sleep with prominent delta activity; spindles may persist.'],
      ['REM (Stage R)', 'Low\u2011voltage fast activity, no alpha, rapid lateral eye movements.'],
    ]
  ),
  img('eeg-sleep-stages'),

  // H2: Background Rhythms
  '<h2 id="background-rhythms">Background Rhythms</h2>',
  table(
    ['Rhythm', 'Typical frequency', 'Usual context', 'Key points'],
    [
      ['Alpha', '8\u201313\u00a0Hz', 'Posterior dominant rhythm in relaxed wakefulness, eyes closed.', 'Disappears with eye opening or mental effort; persistent anterior, non\u2011reactive alpha suggests alpha coma.'],
      ['Beta', '>13\u00a0Hz', 'Symmetric, frontally predominant.', 'Enhanced by benzodiazepines, barbiturates, and some structural lesions (\u201cbarbiturates, benzodiazepines, bad brain\u201d).'],
      ['Theta', '4\u20137\u00a0Hz', 'Normal in drowsiness and sleep at any age; normal awake in young children.', 'Excess in awake older children/adults suggests diffuse dysfunction.'],
      ['Delta', '<4\u00a0Hz (3\u00a0Hz or less in many texts)', 'Normal in deep sleep in all ages; normal in infants/young children.', 'In awake adults, focal delta suggests local pathology; diffuse delta suggests generalized dysfunction/encephalopathy.'],
    ]
  ),
  '<p>Theta and delta together are referred to as <strong>slow waves</strong>.</p>',
  img('eeg-rhythms-table'),

  // H2: Normal Sleep Rhythms
  '<h2 id="normal-sleep-rhythms">Normal Sleep Rhythms</h2>',
  table(
    ['Component', 'Features'],
    [
      ['Vertex wave', 'Negative potential maximal at Cz; prominent in stage 1 and 2 sleep and during arousal.'],
      ['Sleep spindle', '11\u201314\u00a0Hz burst lasting 1\u20132 seconds; maximal at C3/C4; hallmark of N2 sleep.'],
      ['K\u2011complex', 'Large, biphasic wave (negative then slow positive) often followed by a spindle; prominent in N2 sleep and partial arousals.'],
      ['POSTS', 'Positive occipital transients of sleep; maximal at O1/O2; benign N1\u2013N2 feature.'],
    ]
  ),
  img('eeg-sleep-rhythms'),

  // H2: Key EEG Events and Abnormalities
  '<h2 id="eeg-events-abnormalities">Key EEG Events and Abnormalities</h2>',
  table(
    ['Term', 'Definition / description'],
    [
      ['Spike', 'Sharp transient lasting ~25\u201370\u00a0ms.'],
      ['Sharp wave', 'Sharp transient lasting ~70\u2013200\u00a0ms.'],
      ['Slow wave', 'Individual waves in theta (4\u201313\u00a0Hz in some texts) or delta (<4\u00a0Hz) range.'],
      ['Sharply contoured slow wave', 'Slow wave with sharply angled morphology, duration >200\u00a0ms.'],
      ['Spike\u2013wave complex', 'Spike followed by a slow wave.'],
      ['Epileptiform discharge', 'Spikes, sharp waves, or spike\u2013wave complexes that stand out from background and suggest predisposition to epilepsy.'],
      ['Posterior dominant rhythm', 'Occipital rhythm of fairly narrow frequency band (alpha); may have superimposed faster or slower activity.'],
    ]
  ),
  img('eeg-events-definitions'),

  // H2: Abnormal EEG Activity
  '<h2 id="abnormal-eeg-activity">Abnormal EEG Activity</h2>',
  table(
    ['Category', 'Differentiation', 'Typical description / significance'],
    [
      ['Epileptiform \u2013 single vs repetitive', 'Single discharge vs frequent, near\u2011continuous discharges.', 'Single discharges are typically interictal; repetitive discharges \u22651/sec and faster are often associated with clinical seizures.'],
      ['Epileptiform \u2013 focal vs multifocal vs generalized', 'Spatial distribution.', 'Focal discharges suggest local structural lesion or circuit abnormality; multifocal often developmental or metabolic; generalized typically genetic/developmental generalized epilepsy.'],
      ['Non\u2011epileptiform \u2013 attenuation / suppression', 'Reduced amplitude, up to near\u2011flat tracing.', 'Focal attenuation: local structural or extra\u2011axial process (e.g., fluid collection). Generalized attenuation/suppression: severe diffuse dysfunction.'],
      ['Non\u2011epileptiform \u2013 slowing', 'Focal vs generalized; polymorphic vs rhythmic.', 'Focal slowing: local structural lesion, often cortical\u2013subcortical. Generalized synchronous slow: metabolic, toxic, or deep lesions; asynchronous diffuse slow: multifocal or diffuse encephalopathy.'],
      ['Non\u2011epileptiform \u2013 abnormal frequency composition', 'Excess fast or slow activity in unexpected regions.', 'Example: prominent frontal alpha in a patient with HIE is abnormal, whereas posterior alpha in an awake patient is normal.'],
      ['Non\u2011epileptiform \u2013 abnormal transients', 'Transients not strictly epileptiform.', 'Includes patterns such as frontal intermittent rhythmic delta activity (FIRDA) and triphasic waves; usually reflect diffuse or metabolic encephalopathy.'],
    ]
  ),
  img('eeg-abnormal-activity'),

  // H2: Photic Stimulation Responses
  '<h2 id="photic-stimulation-responses">Photic Stimulation Responses</h2>',
  table(
    ['Type of response', 'Specific response', 'Description / notes'],
    [
      ['Normal', 'Visual evoked response', 'Occipital positive\u2011predominant wave peaking ~100\u00a0ms after flash; most evident at slow flash rates.'],
      ['Normal', 'Driving response', 'Occipital positive\u2011predominant activity time\u2011locked to photic stimulus; best seen at \u22657\u00a0Hz.'],
      ['Abnormal', 'Photoparoxysmal response', 'Flash\u2011evoked epileptiform discharges (spikes/spike\u2013wave) often in generalized epilepsies; may persist briefly after stimulation.'],
      ['Artifact', 'Photoelectric artifact', 'Electrical activity at electrode\u2013gel interface provoked by flash; non\u2011cerebral electrochemical artifact.'],
      ['Artifact', 'Photomyoclonic response', 'Flash\u2011induced muscle activity in frontal leads; not a cerebral potential.'],
    ]
  ),
  img('eeg-photic-responses'),

  // H2: Neonatal EEG – Quick Tips
  '<h2 id="neonatal-eeg-quick-tips">Neonatal EEG \u2013 Quick Tips</h2>',
  '<ul>',
  '<li>Review neonatal studies at a faster paper speed (e.g., 15\u00a0mm/sec) to better appreciate evolution.</li>',
  '<li>Recognize common artifacts (patting, sucking); correlate closely with video.</li>',
  '<li>Neonatal seizures may be very focal (even a single channel) and low voltage.</li>',
  '<li>Electrographic neonatal seizure: rhythmic evolving pattern lasting \u226510 seconds; shorter (<10\u00a0s) evolving discharges without clear clinical correlate are often termed brief rhythmic discharges (BRDs).</li>',
  '<li>Always check for clinical correlate on video before labeling subtle events as seizures.</li>',
  '</ul>',

  // H2: General EEG Interpretation Tips
  '<h2 id="general-eeg-tips">General EEG Interpretation Tips</h2>',
  '<ul>',
  '<li>For on\u2011call questions, discuss with the primary attending first; involve an epileptologist when interpretation or management is uncertain.</li>',
  '<li>In complex or chronic epilepsies (e.g., Lennox\u2013Gastaut), compare with prior EEGs when available; technologists can retrieve earlier studies.</li>',
  '<li>In young children, arousal patterns (sudden high\u2011amplitude semi\u2011rhythmic bursts from sleep) are a common seizure mimic; always review video.</li>',
  '</ul>',

  // H2: EEG Reporting Template
  '<h2 id="eeg-reporting-template">EEG Reporting Template (Quick Checklist)</h2>',
  table(
    ['Field', 'Notes to include'],
    [
      ['Patient', 'Name, DOB, relevant diagnoses/indications.'],
      ['Technical', 'Number of channels; presence of EKG and eye channels; filter settings (LFF, HFF, notch); sensitivity; timebase.'],
      ['State', 'Awake, drowsy, and/or sleep; adequacy of sampling of each state.'],
      ['Posterior dominant rhythm', 'Frequency, symmetry, organization, and reactivity to eye opening/attention.'],
      ['Hyperventilation', 'Performed or not; presence of symmetric \u201cbuild\u2011up\u201d (slowing with amplitude increase); any focal change.'],
      ['Photic stimulation', 'Presence/absence of driving; frequencies at which PDR tracks; any photoparoxysmal or photomyoclonic response.'],
      ['Sleep', 'Presence of N1/N2/N3/REM; whether architecture appears age\u2011appropriate.'],
      ['Focal slowing', 'Location, continuity, and state dependence.'],
      ['Epileptiform abnormalities', 'Morphology (spikes, sharp waves, spike\u2011and\u2011wave, polyspike), location, frequency, activation (sleep, HV, photic).'],
      ['Summary and impression', 'Normal vs abnormal; type of abnormality (focal/generalized, epileptiform vs non\u2011epileptiform); correlation with clinical question.'],
    ]
  ),
].join('\n');

// === Replace in HTML ===
const before = h.substring(0, basicsStart);
const after = h.substring(vpaStart);
h = before + newHtml + '\n' + after;

d.html = h;

// === Update TOC ===
const toc = d.toc;
// Find the range to replace: from eeg-reading-basics through delta-waves
const tocStartIdx = toc.findIndex(t => t.id === 'eeg-reading-basics');
const tocEndIdx = toc.findIndex(t => t.id === 'valproic-acid-toxicity');

console.log('TOC replace range:', tocStartIdx, 'to', tocEndIdx);

const newTocEntries = [
  { level: 1, text: 'EEG Reading Basics', id: 'eeg-reading-basics' },
  { level: 2, text: 'Sleep Stages on EEG', id: 'sleep-stages-eeg' },
  { level: 2, text: 'Background Rhythms', id: 'background-rhythms' },
  { level: 2, text: 'Normal Sleep Rhythms', id: 'normal-sleep-rhythms' },
  { level: 2, text: 'Key EEG Events and Abnormalities', id: 'eeg-events-abnormalities' },
  { level: 2, text: 'Abnormal EEG Activity', id: 'abnormal-eeg-activity' },
  { level: 2, text: 'Photic Stimulation Responses', id: 'photic-stimulation-responses' },
  { level: 2, text: 'Neonatal EEG \u2013 Quick Tips', id: 'neonatal-eeg-quick-tips' },
  { level: 2, text: 'General EEG Interpretation Tips', id: 'general-eeg-tips' },
  { level: 2, text: 'EEG Reporting Template (Quick Checklist)', id: 'eeg-reporting-template' },
];

d.toc = [
  ...toc.slice(0, tocStartIdx),
  ...newTocEntries,
  ...toc.slice(tocEndIdx)
];

d.imageCount = (h.match(/<img /g) || []).length;

fs.writeFileSync(fp, JSON.stringify(d, null, 2));
console.log('\nDone!');
console.log('Images:', d.imageCount);
console.log('TOC entries:', d.toc.length);

// Verify new section order
const newH = d.html;
const ids = ['eeg-reading-basics','sleep-stages-eeg','background-rhythms','normal-sleep-rhythms',
  'eeg-events-abnormalities','abnormal-eeg-activity','photic-stimulation-responses',
  'neonatal-eeg-quick-tips','general-eeg-tips','eeg-reporting-template','valproic-acid-toxicity'];
ids.forEach(id => {
  const pos = newH.indexOf(`id="${id}"`);
  console.log(`  ${id}: ${pos >= 0 ? pos : 'MISSING!'}`);
});
