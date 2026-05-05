#!/usr/bin/env node
// One-time pass to fill in 18 distractor rationales that were terse or
// missing in the source material. Matches by (questionId, optionText).
// Idempotent: if the rationale is already non-empty, leaves it alone.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TARGET = resolve(__dirname, '..', 'src', 'data', 'board-review.json');

const PATCHES = [
  {
    id: 'q-identify-the-expected-clinical-course-of-reversible-cerebral',
    optionText: '1 year',
    rationale:
      'RCVS is by definition a self-limited vasculopathy whose angiographic changes resolve within 12 weeks. Persistence of vasoconstriction at 1 year would exclude RCVS and prompt evaluation for primary CNS angiitis or another persistent arteriopathy.',
  },
  {
    id: 'q-differentiate-central-from-peripheral-hypotonia-based-on-the',
    optionText: 'Skeletal muscle',
    rationale:
      'Skeletal muscle pathology (congenital myopathies, muscular dystrophies) is a peripheral cause of hypotonia and characteristically produces depressed or absent deep tendon reflexes. The brisk reflexes and preserved alertness here point to a central, not peripheral, localization.',
  },
  {
    id: 'q-recognize-the-semiology-of-infantile-spasms-and-understand-t',
    optionText: 'Sudden cardiac arrest',
    rationale:
      'Infantile spasms do not carry an increased risk of sudden cardiac arrest. The urgency of treatment relates to preventing the catastrophic cognitive and developmental impact of ongoing hypsarrhythmia and untreated epileptic encephalopathy.',
  },
  {
    id: 'q-identify-post-varicella-arteriopathy-as-a-cause-of-childhood',
    optionText: 'Rotavirus',
    rationale:
      'Rotavirus causes acute gastroenteritis and does not have an established association with cerebral arteriopathy or pediatric arterial ischemic stroke.',
  },
  {
    id: 'q-formulate-a-management-plan-for-a-simple-febrile-seizure',
    optionText: 'Prescribe a daily prophylactic anti-seizure medication',
    rationale:
      'Daily prophylactic anti-seizure medication is explicitly not recommended for simple febrile seizures. The risks of chronic AED therapy outweigh both the modest recurrence risk and the very small (~1%) excess lifetime epilepsy risk.',
  },
  {
    id: 'q-formulate-a-basic-localization-hypothesis-for-a-patient-with',
    optionText: 'Diffuse cortical dysfunction',
    rationale:
      'Diffuse cortical dysfunction (post-anoxic injury, severe metabolic encephalopathy) can cause profound unresponsiveness while sparing brainstem reflexes, and remains a real consideration in this presentation. It is not the *least* likely cause.',
  },
  {
    id: 'q-adapt-the-neurologic-examination-for-pediatric-patients',
    optionText: 'Two-point discrimination testing of the lower extremities',
    rationale:
      'Two-point discrimination requires verbal report and cooperation that a 2-month-old cannot provide. It is not part of the infant neurologic examination.',
  },
  {
    id: 'q-identify-early-handedness-as-a-red-flag-for-hemiplegic-cereb',
    optionText: 'Attention-deficit/hyperactivity disorder',
    rationale:
      'ADHD is a behavioral diagnosis made in school-aged children based on inattention, hyperactivity, and impulsivity. It does not present in infancy with motor asymmetry and is unrelated to early hand preference.',
  },
  {
    id: 'q-identify-the-comorbidities-frequently-associated-with-touret',
    optionText: 'Oppositional defiant disorder and specific learning disorder',
    rationale:
      'ODD and learning disorders can co-occur in children with Tourette syndrome, but the two highest-yield comorbidities — present in roughly half of patients and central to management — are OCD and ADHD.',
  },
  {
    id: 'q-recall-the-effect-of-oral-versus-intravenous-corticosteroids',
    optionText: 'Oral prednisone caused a higher rate of permanent blindness compared to placebo.',
    rationale:
      'The ONTT did not demonstrate a higher rate of permanent blindness with oral prednisone. The actual finding was an increased rate of recurrent optic neuritis attacks in the oral-prednisone arm, which is why isolated oral prednisone is no longer recommended.',
  },
  {
    id: 'q-identify-the-age-dependent-diagnostic-criteria-for-pediatric',
    optionText: 'Pediatric migraines must be continuous and unremitting for 7 days.',
    rationale:
      'Pediatric migraines are episodic, lasting 2–72 hours per attack. Continuous unremitting headache for 7 days does not meet ICHD migraine criteria and would suggest status migrainosus or a different headache disorder.',
  },
  {
    id: 'q-identify-the-intracellular-signaling-pathway-dysregulated-in',
    optionText: 'Notch signaling pathway',
    rationale:
      'Notch signaling regulates cell-fate decisions and is implicated in T-cell leukemias and other malignancies, but it is not the pathway disrupted in TSC. The hamartin-tuberin complex acts as a GAP for Rheb, directly inhibiting mTORC1.',
  },
  {
    id: 'q-identify-the-genetic-defect-and-molecular-mechanism-of-narp-',
    optionText: 'Nuclear DNA on chromosome 15',
    rationale:
      'NARP is caused by point mutations (most commonly m.8993T>G) in the mitochondrial ATP6 gene, which encodes a subunit of complex V. It is inherited maternally and is not encoded on nuclear chromosome 15.',
  },
  {
    id: 'q-recognize-the-phenomenon-of-autoinduction-associated-with-ca',
    optionText: '1 to 2 years',
    rationale:
      'CYP3A4 autoinduction by carbamazepine is largely complete within 3–5 weeks of reaching a stable dose; serum levels then plateau. A 1–2 year time course would be inconsistent with the known pharmacokinetics of enzyme induction.',
  },
  {
    id: 'q-classify-a-complex-febrile-seizure-based-on-duration-and-foc',
    optionText: 'The fever reaches a peak of 40.5°C (104.9°F) just prior to the seizure',
    rationale:
      'Peak temperature does not classify a febrile seizure as simple or complex. Classification depends on duration (>15 minutes), focality, or recurrence within 24 hours.',
  },
  {
    id: 'q-recall-normal-pediatric-eeg-maturation-regarding-the-posteri',
    optionText: '12 years',
    rationale:
      'By age 12 the PDR has long since reached the adult alpha range (~9–10 Hz). The 8 Hz milestone is achieved much earlier — typically around 3 years; waiting until 12 would be abnormally delayed.',
  },
  {
    id: 'q-recall-the-clinical-criteria-for-phace-syndrome',
    optionText: 'Epidermal nevi',
    rationale:
      'Epidermal nevi are the hallmark of Epidermal Nevus Syndrome (Schimmelpenning), not PHACE. The "E" in PHACE stands for Eye abnormalities; sternal/supraumbilical raphe defects extend the acronym to PHACES.',
  },
  {
    id: 'q-recognize-the-classic-cardiac-metabolic-and-dysmorphic-featu',
    optionText: 'Hypophosphatemia',
    rationale:
      'Williams syndrome is classically associated with infantile hypercalcemia (not hypophosphatemia), thought to relate to abnormal vitamin D handling and calcium-sensing receptor function in the setting of the 7q11.23 microdeletion.',
  },
  {
    id: 'q-recognize-the-clinical-features-of-nightmare-disorder',
    optionText: 'Non-REM Stage 1 (N1)',
    rationale:
      'N1 is the brief transition between wake and sleep; nightmares are not characteristic of this stage.',
  },
  {
    id: 'q-recognize-the-clinical-features-of-nightmare-disorder',
    optionText: 'Non-REM Stage 2 (N2)',
    rationale:
      'N2 (light sleep) is when most non-REM time is spent, but it is not the stage associated with vivid dream imagery; nightmares are a REM phenomenon.',
  },
  {
    id: 'q-identify-the-cranial-nerves-traversing-the-cavernous-sinus',
    optionText: 'Ophthalmic nerve (CN V1)',
    rationale:
      'CN V1 (ophthalmic division of the trigeminal) runs in the lateral wall of the cavernous sinus alongside CN III, CN IV, and CN V2 — not centrally with the internal carotid and CN VI.',
  },
  {
    id: 'q-formulate-the-next-best-step-for-isolated-severe-language-de',
    optionText: 'Genetic testing for Fragile X syndrome',
    rationale:
      'Fragile X testing is reasonable in a child with global developmental delay, intellectual disability, or autistic features, but is not the first step for isolated expressive language delay. Hearing impairment must be ruled out first.',
  },
  {
    id: 'q-diagnose-idiopathic-intracranial-hypertension-iih-based-on-c',
    optionText: '20 cm H2O',
    rationale:
      'Normal pediatric and adult opening pressures can range up to ~20–25 cm H2O depending on body habitus and position; this overlaps the upper limit of normal and does not by itself meet the IIH threshold of >25 cm H2O.',
  },
  {
    id: 'q-recognize-the-primary-stroke-prevention-strategy-in-sickle-c',
    optionText: 'Electroencephalogram (EEG)',
    rationale:
      'EEG evaluates seizure activity, not cerebral blood flow or stroke risk. It has no established role in primary stroke screening for sickle cell disease.',
  },
];

const data = JSON.parse(readFileSync(TARGET, 'utf8'));
const byId = new Map(data.map((q) => [q.id, q]));

let patched = 0;
let alreadyFilled = 0;
let notFound = [];

for (const p of PATCHES) {
  const q = byId.get(p.id);
  if (!q) {
    notFound.push(`question id not found: ${p.id}`);
    continue;
  }
  const opt = q.options.find((o) => o.text === p.optionText);
  if (!opt) {
    notFound.push(`option text not found in ${p.id}: "${p.optionText}"`);
    continue;
  }
  if (opt.rationale && opt.rationale.trim()) {
    alreadyFilled++;
    continue;
  }
  opt.rationale = p.rationale;
  patched++;
}

writeFileSync(TARGET, JSON.stringify(data, null, 2) + '\n', 'utf8');

console.log(`Patched ${patched} rationales; ${alreadyFilled} already filled; ${notFound.length} not found.`);
if (notFound.length) notFound.forEach((m) => console.log('  ! ' + m));

// Verify: count remaining empties.
const remaining = data.filter((q) => q.options.some((o) => !o.isCorrect && !o.rationale)).length;
console.log(`Questions still missing at least one distractor rationale: ${remaining}`);
