#!/usr/bin/env node
// Parse _inbox/Board Review Qs.txt into src/data/board-review.json.
// Idempotent given identical input (uses content hash for option shuffle seed
// and stable id derivation).

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const INPUT = resolve(ROOT, '_inbox', 'Board Review Qs.txt');
const OUTPUT = resolve(ROOT, 'src', 'data', 'board-review.json');
const DATE_ADDED = '2026-05-04';

// ---------- helpers ---------------------------------------------------------

function stripCitations(s) {
  if (!s) return s;
  return s
    .replace(/\s*\[\d+(?:\s*[,–-]\s*\d+)*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function hash(s) {
  return createHash('sha1').update(s).digest('hex');
}

function slugify(s, max = 60) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max);
}

// Mulberry32 PRNG seeded from a string hash so shuffles are reproducible.
function seededRng(seedString) {
  let a = parseInt(hash(seedString).slice(0, 8), 16) >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleSeeded(arr, seedString) {
  const rng = seededRng(seedString);
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ---------- parsing ---------------------------------------------------------

const RAW = readFileSync(INPUT, 'utf8');

// Split on lines starting with "Question N:"; keep the header.
const blocks = RAW.split(/(?=^Question \d+:)/m).filter((b) => /^Question \d+:/.test(b));

function parseBlock(block) {
  // Header: "Question 1: Application (Child Neurology)" or "Question 1: Application"
  const headerMatch = block.match(/^Question (\d+):\s*(Application|Recall)(?:\s*\(([^)]+)\))?/i);
  if (!headerMatch) return { error: 'no-header', block };
  const [, qnumRaw, typeRaw, popHint] = headerMatch;
  const type = typeRaw.toLowerCase();

  const blueprintMatch = block.match(/Blueprint Topic:\s*(.*?)\s+Learning Objective/s);
  const loMatch = block.match(/Learning Objective\s*\(LO\):\s*(.*?)(?=\s+(?:Clinical Vignette|Lead-in):)/s);
  const vignetteMatch = block.match(/Clinical Vignette:\s*(.*?)(?=\s+Lead-in:)/s);
  const leadInMatch = block.match(/Lead-in:\s*(.*?)(?=\s*\*?\*?Options:?\*?\*?\s*A\))/s);

  if (!blueprintMatch || !loMatch || !leadInMatch) {
    return { error: 'missing-field', block: block.slice(0, 200) };
  }

  // Options: "A) ... B) ... C) ... D) ... Reasoning:"
  // Some authored items have no whitespace between option text and the next
  // letter (e.g. "A) SLC2A1B) SCN1A") — keep separators optional.
  const optsMatch = block.match(
    /\*?\*?Options:?\*?\*?\s*A\)\s*(.*?)\s*B\)\s*(.*?)\s*C\)\s*(.*?)\s*D\)\s*(.*?)\s*Reasoning:/s
  );
  if (!optsMatch) return { error: 'no-options', block: block.slice(0, 200) };
  const [, optA, optB, optC, optD] = optsMatch;

  // Reasoning: split on per-option markers
  const reasoningSlice = block.slice(block.indexOf('Reasoning:') + 'Reasoning:'.length);
  const reasoning = parseReasoning(reasoningSlice);
  if (!reasoning.correctLetter || !reasoning.rationales[reasoning.correctLetter]) {
    return { error: 'no-correct-rationale', block: block.slice(0, 200) };
  }

  return {
    qnum: parseInt(qnumRaw, 10),
    type,
    popHint: popHint?.trim() || null,
    blueprintTopic: stripCitations(blueprintMatch[1]),
    learningObjective: stripCitations(loMatch[1]),
    vignette: vignetteMatch ? stripCitations(vignetteMatch[1]) : null,
    leadIn: stripCitations(leadInMatch[1]),
    rawOptions: { A: stripCitations(optA), B: stripCitations(optB), C: stripCitations(optC), D: stripCitations(optD) },
    correctLetter: reasoning.correctLetter,
    rationales: {
      A: stripCitations(reasoning.rationales.A || ''),
      B: stripCitations(reasoning.rationales.B || ''),
      C: stripCitations(reasoning.rationales.C || ''),
      D: stripCitations(reasoning.rationales.D || ''),
    },
  };
}

function fixRationalePrefix(body, isCorrect) {
  if (!body) return body;
  // Source format: "Distractor B describes X..." — after stripping the
  // letter we're left with a verb-led fragment. Promote to a full sentence.
  if (isCorrect) return body;
  const first = body.match(/^([a-z])/);
  if (!first) return body;
  return 'This option ' + body;
}

function parseReasoning(text) {
  // Find "Correct Answer (X):"
  const correctMatch = text.match(/Correct Answer\s*\(([A-D])\)\s*:\s*(.*?)(?=(?:\s*Distractors?\s+[A-D])|\s*Question \d+:|$)/s);
  if (!correctMatch) return { correctLetter: null, rationales: {} };

  const correctLetter = correctMatch[1];
  const correctRationale = correctMatch[2].trim();

  const rationales = { [correctLetter]: correctRationale };

  // "Distractor X" or "Distractors X and Y" chunks
  const distractorRegex = /Distractors?\s+([A-D](?:\s*(?:and|,|&)\s*[A-D])*(?:\s*and\s*[A-D])?)\s*(?:\([^)]*\))?\s*(.*?)(?=(?:\s*Distractors?\s+[A-D])|\s*Question \d+:|$)/gs;
  let m;
  while ((m = distractorRegex.exec(text)) !== null) {
    const lettersText = m[1];
    const body = m[2].trim();
    const letters = [...lettersText.matchAll(/[A-D]/g)].map((x) => x[0]);
    for (const L of letters) {
      // If the rationale was for joined letters, keep the same body for each.
      if (!rationales[L]) rationales[L] = body;
    }
  }

  return { correctLetter, rationales };
}

// ---------- auto-tagging ----------------------------------------------------

// Primary signal: the author-assigned Blueprint Topic. Order matters — the
// FIRST regex that matches wins. Keep specific topics before broad ones.
const BLUEPRINT_TO_DIM1 = [
  [/Brain and Spinal Trauma|Trauma/i, 'trauma'],
  [/Vascular Neurology/i, 'vascular'],
  [/Neuro-?oncolog/i, 'neuro-onc'],
  [/Neuroinfectious/i, 'neuroinfectious'],
  [/Demyelinating/i, 'demyelinating'],
  [/Neuroimmunolog|Paraneoplastic/i, 'neuroimmunologic'],
  [/Sleep Disorder/i, 'sleep'],
  [/Headache|Pain Disorder/i, 'headache'],
  [/Movement Disorder/i, 'movement'],
  [/Neuro-?ophthalmolog|Neuro-?otolog/i, 'neuro-oph-oto'],
  [/Behavioral Neurology|Neurocognitive/i, 'behavioral-neurocognitive'],
  [/Psychiatr/i, 'psychiatric'],
  [/Autonomic/i, 'autonomic'],
  [/Normal Structure|Life Cycle Development/i, 'normal-development'],
  [/Peripheral Nerve|Neuromuscular/i, 'neuromuscular'],
  [/Metabolic|Nutritional|Toxin|Leukodystrop|Lysosomal|Lipidoses|Trace Metals/i, 'metabolic'],
  [/Paroxysmal|Episodic|Epilepsy/i, 'epilepsy'],
  [/Neurocutaneous|Genetic and Developmental|Chromosomal/i, 'genetic-developmental'],
];

const DIM1_KEYWORDS = [
  // Specific anatomic / disease-defining keywords first
  ['vascular', /\b(stroke|moyamoya|sickle cell|tpa|thrombolyt|sinus thrombos|cvst|csvt|wallenberg|aneurysm|berry aneurysm|pica|aica|mca|posterior communicating|cerebral artery|epidural hematoma|subdural hematoma|subarachnoid)\b/i],
  ['trauma', /\b(traumatic brain injury|tbi|abusive head trauma|shaken baby|concussion|cerebral perfusion pressure|cpp|spinal cord injury|herniation)\b/i],
  ['neuro-onc', /\b(medulloblastoma|ependymoma|astrocytoma|hemangioblastoma|schwannoma|craniopharyngioma|retinoblastoma|neuroblastoma|brain tumor|cns tumor|posterior fossa mass|sega|glioma|meningioma)\b/i],
  ['neuroinfectious', /\b(meningitis|encephalitis|hsv encephalit|lyme|borrelia|polio|toxoplasm|cytomegalo|cmv\b|rabies|prion|jakob|TORCH|listeria|treponema|syphilis|botulism|tetanus|tuberculo)\b/i],
  ['demyelinating', /\b(multiple sclerosis|\bMS\b|neuromyelitis optica|\bNMO\b|aquaporin|\bADEM\b|optic neuritis|McDonald criteria|MOG)\b/i],
  ['neuroimmunologic', /\b(nmda receptor|nmdar|opsoclonus-?myoclonus|paraneoplastic|aquaporin-?4|antibody-mediated encephalit)\b/i],
  ['neuro-oph-oto', /\b(horner|leukocoria|fundoscop|cherry-?red|papilledema|hemianopsia|abducens|oculomotor|cn iii|cn vi|cn vii|facial palsy|menière|meniere|optic atrophy|sensorineural)\b/i],
  ['sleep', /\b(narcolepsy|cataplexy|sleep apnea|parasomnia|sleep terror|night terror|REM behavior|polysomnograph|hypocretin|orexin)\b/i],
  ['headache', /\b(migraine|cluster headache|tension-?type headache|cyclic vomiting|abdominal migraine|idiopathic intracranial hypertension|pseudotumor|stabbing headache)\b/i],
  ['neuromuscular', /\b(muscular dystroph|myasthen|spinal muscular atrophy|sma\b|duchenne|becker|charcot-?marie|guillain-?barr|aidp|cidp|dermatomyositis|myotonia congenita|myotonic dystroph|periodic paralysis|gowers|werdnig|carpal tunnel|peripheral neuropath)\b/i],
  ['movement', /\b(huntington|tourette|sydenham|dystonia|chorea|tic disorder|tremor|dopa-?responsive|parkinson|opsoclonus|stereotyp)\b/i],
  ['metabolic', /\b(tay-?sachs|krabbe|gaucher|niemann|melas|merrf|pompe|mcardle|msud|maple syrup|pku|phenylketonuria|galactos|wilson disease|menkes|zellweger|peroxisom|metachromatic|alexander disease|canavan|leukodystroph|urea cycle|wernicke|biotinidase|otc|ornithine|hyperammonemia|sialidos|nonketotic hyperglycinemia|pkan|pantothenate|homocystinuri|adrenoleuko|fabry|hexosaminidas|arylsulfatase|fatty acid oxidation|VLCFA|propionic|methylmalonic|glutaric|tick paralysis)\b/i],
  ['behavioral-neurocognitive', /\b(autism|adhd|attention.deficit|alzheimer|frontotemporal|aphasia|agnosia|neglect)\b/i],
  ['psychiatric', /\b(major depress|generalized anxiety|conversion disorder|somatic symptom|schizophrenia|psychosis|bipolar|panic disorder)\b/i],
  ['autonomic', /\b(familial dysautonomia|riley-?day|orthostatic hypotension)\b/i],
  ['normal-development', /\b(developmental milestone|primitive reflex|moro reflex|tonic neck reflex)\b/i],
  // Epilepsy & genetic-developmental are intentionally last because their
  // hallmarks (EEG, seizure, syndrome names) appear in vignettes for many
  // other categories.
  ['epilepsy', /\b(infantile spasm|absence epilepsy|hypsarrhythmia|landau-?kleffner|bects|selects|dravet|lennox-?gastaut|west syndrome|panayiotopoulos|juvenile myoclonic epilepsy|jme\b|febrile seizure|breath-?holding|sandifer|ketogenic diet|status epilepticus|GLUT-?1|spike-and-wave)\b/i],
  ['genetic-developmental', /\b(lissencephaly|schizencephaly|polymicrogyria|holoprosencephaly|chiari|dandy-walker|aicardi|joubert|septo-?optic|miller-?dieker|cortical dysplasia|heterotopi|trinucleotide|CGG repeat|CAG repeat|CTG repeat|GAA repeat|prader-?willi|angelman|rett syndrome|fragile x|williams syndrome|down syndrome|fetal alcohol|incontinentia pigmenti|sturge-?weber|von hippel|tuberous sclerosis|neurofibromatosis|\bNF1\b|\bNF2\b|\bTSC\b|phace|neurocutaneous|phakomatos|microcephal|macrocephal|hypomelanotic|cafe-?au-?lait|port-?wine|microdeletion|chromosomal|developmental delay|intellectual disability)\b/i],
];

const DIM1_TO_SECTION = {
  epilepsy: 'epilepsy',
  metabolic: 'neurogenetics-and-neurometabolics',
  'genetic-developmental': 'neurogenetics-and-neurometabolics',
  neuromuscular: 'neuromuscular',
  headache: 'headaches',
  'behavioral-neurocognitive': 'other-topics',
  neuroinfectious: 'infectious-disease',
  demyelinating: 'neuroimmunology',
  movement: 'movement-disorders',
  vascular: 'stroke',
  'neuro-onc': 'other-topics',
  neuroimmunologic: 'neuroimmunology',
  'neuro-oph-oto': 'neuro-ophthalmology',
  trauma: 'neurocritical-care',
  psychiatric: 'psychiatry',
  sleep: 'sleep',
  autonomic: 'other-topics',
  'normal-development': 'development',
};

function tagDim1(blueprintTopic, fallbackText) {
  // Authoritative: blueprint topic the writer assigned
  for (const [re, cat] of BLUEPRINT_TO_DIM1) {
    if (re.test(blueprintTopic)) return cat;
  }
  // Keyword fallback (specific → broad)
  for (const [cat, re] of DIM1_KEYWORDS) {
    if (re.test(fallbackText)) return cat;
  }
  return 'genetic-developmental';
}

function tagDim2(leadIn, vignette) {
  const li = leadIn.toLowerCase();
  if (/\b(treatment|therap|first-line|management|drug|medication|pharmacolog|antibiotic|antiepilept|supplement|intervention|administer|aborti)\b/.test(li))
    return 'treatment';
  if (/\b(eeg|mri|ct scan|imaging|lumbar puncture|csf|biopsy|laboratory|blood test|nerve conduction|emg|polysomnograph|ultrasound|fundoscop|neuroimag|finding|appearance|sign|pattern)\b/.test(li))
    return 'diagnostic-procedures';
  if (/\b(enzyme|gene|protein|mechanism|pathophysiolog|inheritance|chromosome|mutation|deletion|target|channel|receptor|defect|deficien|underlying|due to|cause of|caused by|biomarker|substrate|accumulat)\b/.test(li))
    return 'neuroscience';
  return 'clinical-aspects';
}

function tagPopulation(popHint, vignette, blueprint) {
  if (popHint) {
    if (/child neurology|pediatric/i.test(popHint)) return 'peds';
    if (/adult/i.test(popHint)) return 'adult';
  }
  const ageMatch = (vignette || '').match(/(\d+)\s*-?\s*(year|month|week|day)s?\s*-?\s*old/i);
  if (ageMatch) {
    const num = parseInt(ageMatch[1], 10);
    const unit = ageMatch[2].toLowerCase();
    if (unit !== 'year') return 'peds';
    return num < 18 ? 'peds' : 'adult';
  }
  // No age — infer from disease
  if (/parkinson|alzheimer|frontotemporal|tabes dorsalis|adult/i.test((vignette || '') + blueprint)) return 'adult';
  return 'peds';
}

const ZEBRA_TOPICS = /sialidos|nonketotic hyperglycinemia|incontinentia pigmenti|aicardi|panayiotopoulos|pantothenate kinase|menkes|zellweger|alexander disease|canavan|alpha-?galactosidase|fabry|miller-?dieker|tick paralysis|moyamoya|wilson disease|homocystinuri|adrenoleukodystroph|metachromatic|krabbe|sandifer|landau-?kleffner|periventricular nodular heterotopia|williams syndrome|prader-?willi|angelman|rett syndrome|friedreich/i;

const CLERKSHIP_FRIENDLY = /febrile seizure|migraine|guillain-?barr|meningitis|infantile spasm|west syndrome|cerebral palsy|absence epilepsy|concussion|down syndrome|stroke|sickle cell|tourette|adhd|autism|breath-?holding|developmental milestone|cn vii|bell.s palsy|tay-?sachs|tuberous sclerosis|neurofibromatosis|nf1|duchenne|spinal muscular atrophy|sma\b|myasthenia gravis|HSV encephalit|wilson disease|hypotonia|febrile|status epilepticus/i;

function tagDifficulty(type, blueprintAndContent) {
  if (ZEBRA_TOPICS.test(blueprintAndContent)) return 'hard';
  if (type === 'recall') return 'easy';
  return 'medium';
}

function tagClerkshipAppropriate(type, blueprintAndContent, difficulty) {
  if (difficulty === 'hard') return false;
  if (CLERKSHIP_FRIENDLY.test(blueprintAndContent)) return true;
  if (type === 'recall' && difficulty === 'easy') return true;
  return false;
}

// ---------- build records ---------------------------------------------------

const parseErrors = [];
const records = [];
const seenIds = new Map();

for (const block of blocks) {
  const parsed = parseBlock(block);
  if (parsed.error) {
    parseErrors.push(parsed);
    continue;
  }

  const optionLetters = ['A', 'B', 'C', 'D'];
  const seedKey = parsed.learningObjective + '|' + parsed.leadIn;
  const order = shuffleSeeded(optionLetters, seedKey);

  const options = order.map((L) => {
    const isCorrect = L === parsed.correctLetter;
    return {
      text: parsed.rawOptions[L],
      isCorrect,
      rationale: fixRationalePrefix(parsed.rationales[L] || '', isCorrect),
    };
  });

  const allText = [parsed.blueprintTopic, parsed.learningObjective, parsed.vignette || '', parsed.leadIn, ...Object.values(parsed.rawOptions)].join(' ');
  const dim1 = tagDim1(parsed.blueprintTopic, parsed.learningObjective + ' ' + (parsed.vignette || '') + ' ' + parsed.leadIn);
  const dim2 = tagDim2(parsed.leadIn, parsed.vignette || '');
  const population = tagPopulation(parsed.popHint, parsed.vignette, parsed.blueprintTopic);
  const section = DIM1_TO_SECTION[dim1] || 'other-topics';
  const difficulty = tagDifficulty(parsed.type, allText);
  const clerkshipAppropriate = tagClerkshipAppropriate(parsed.type, allText, difficulty);

  // Stable id from learning objective slug
  let baseId = 'q-' + slugify(parsed.learningObjective);
  let id = baseId;
  let suffix = 2;
  while (seenIds.has(id)) {
    id = `${baseId}-${suffix++}`;
  }
  seenIds.set(id, true);

  records.push({
    id,
    bank: 'board-review',
    type: parsed.type,
    labels: { dim1Category: dim1, dim2Category: dim2, population, section },
    difficulty,
    clerkshipAppropriate,
    dateAdded: DATE_ADDED,
    sources: [],
    learningObjective: parsed.learningObjective,
    blueprintTopic: parsed.blueprintTopic,
    vignette: parsed.vignette,
    leadIn: parsed.leadIn,
    options,
  });
}

// ---------- output ----------------------------------------------------------

writeFileSync(OUTPUT, JSON.stringify(records, null, 2) + '\n', 'utf8');

// Stats
const by = (k) => records.reduce((m, r) => ((m[k(r)] = (m[k(r)] || 0) + 1), m), {});
const dim1Dist = by((r) => r.labels.dim1Category);
const dim2Dist = by((r) => r.labels.dim2Category);
const popDist = by((r) => r.labels.population);
const sectionDist = by((r) => r.labels.section);
const typeDist = by((r) => r.type);
const diffDist = by((r) => r.difficulty);
const clerkshipDist = by((r) => (r.clerkshipAppropriate ? 'yes' : 'no'));

console.log(`Parsed ${records.length} questions; ${parseErrors.length} parse failures.`);
console.log('--- Dim 1 (disorder) ---');
console.log(JSON.stringify(dim1Dist, null, 2));
console.log('--- Dim 2 (competency) ---');
console.log(JSON.stringify(dim2Dist, null, 2));
console.log('--- Population ---');
console.log(JSON.stringify(popDist, null, 2));
console.log('--- Section ---');
console.log(JSON.stringify(sectionDist, null, 2));
console.log('--- Type ---');
console.log(JSON.stringify(typeDist, null, 2));
console.log('--- Difficulty ---');
console.log(JSON.stringify(diffDist, null, 2));
console.log('--- Clerkship-appropriate ---');
console.log(JSON.stringify(clerkshipDist, null, 2));

if (parseErrors.length) {
  console.log('\n--- Parse errors ---');
  for (const e of parseErrors.slice(0, 10)) {
    console.log(`[${e.error}] ${e.block.slice(0, 120).replace(/\s+/g, ' ')}…`);
  }
}

console.log(`\nWrote ${OUTPUT}`);
