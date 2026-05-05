#!/usr/bin/env node
// Append a curated batch of new board-review questions to
// src/data/board-review.json. Idempotent: re-running with the same input
// won't duplicate (matching by id, which is derived from the LO slug).

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const TARGET = resolve(ROOT, 'src', 'data', 'board-review.json');
const DATE = '2026-05-04';

function slug(s, max = 60) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max);
}

// Each entry below omits id / bank / dateAdded / sources — those are filled
// in by the assembler. Options are listed in display order; isCorrect on the
// one to mark right (already varied across A/B/C/D — no all-A bias here).
const RAW = [
  // ─── EPILEPSY (10) ────────────────────────────────────────────────────
  {
    type: 'application',
    labels: { dim1Category: 'epilepsy', dim2Category: 'treatment', population: 'peds', section: 'epilepsy' },
    difficulty: 'medium',
    clerkshipAppropriate: false,
    learningObjective: 'Select first-line and contraindicated anti-seizure medications for Dravet syndrome.',
    blueprintTopic: 'Epilepsy and Episodic Disorders',
    vignette: 'A 14-month-old with a history of prolonged hemiclonic febrile seizures since 5 months of age now has multiple daily afebrile myoclonic and focal seizures. SCN1A sequencing identifies a heterozygous loss-of-function variant.',
    leadIn: 'Which of the following anti-seizure medications should be avoided in this patient?',
    options: [
      { text: 'Valproate', isCorrect: false, rationale: 'Valproate is one of the recommended first-line agents in Dravet syndrome and is broadly effective across seizure types.' },
      { text: 'Lamotrigine', isCorrect: true, rationale: 'Sodium-channel blockers (lamotrigine, carbamazepine, oxcarbazepine, phenytoin) worsen seizures in Dravet syndrome because the SCN1A loss-of-function disproportionately affects inhibitory interneurons; further sodium-channel blockade unmasks excitation.' },
      { text: 'Clobazam', isCorrect: false, rationale: 'Clobazam is a standard adjunct in Dravet and is frequently used with stiripentol.' },
      { text: 'Fenfluramine', isCorrect: false, rationale: 'Fenfluramine is FDA-approved for Dravet seizures and substantially reduces convulsive seizure frequency.' },
    ],
  },
  {
    type: 'application',
    labels: { dim1Category: 'epilepsy', dim2Category: 'treatment', population: 'peds', section: 'epilepsy' },
    difficulty: 'medium',
    clerkshipAppropriate: true,
    learningObjective: 'Identify first-line treatment for infantile spasms in tuberous sclerosis complex.',
    blueprintTopic: 'Epilepsy and Episodic Disorders',
    vignette: 'A 7-month-old with several hypopigmented macules and a history of cardiac rhabdomyoma develops clusters of brief flexor spasms upon awakening. EEG shows hypsarrhythmia and brain MRI demonstrates multiple cortical tubers.',
    leadIn: 'Which of the following is the most appropriate first-line treatment for this patient’s seizures?',
    options: [
      { text: 'Vigabatrin', isCorrect: true, rationale: 'In infantile spasms due to tuberous sclerosis complex, vigabatrin is preferred first-line because of higher response rates than hormonal therapy in this specific etiology, despite the risk of irreversible peripheral visual field constriction.' },
      { text: 'Adrenocorticotropic hormone (ACTH)', isCorrect: false, rationale: 'ACTH is first-line for infantile spasms of non-TSC etiology, but vigabatrin has superior response rates when TSC is the cause.' },
      { text: 'Levetiracetam', isCorrect: false, rationale: 'Levetiracetam has limited efficacy in infantile spasms and is not first-line.' },
      { text: 'Topiramate', isCorrect: false, rationale: 'Topiramate is occasionally used as add-on for refractory spasms but is not first-line.' },
    ],
  },
  {
    type: 'recall',
    labels: { dim1Category: 'epilepsy', dim2Category: 'treatment', population: 'peds', section: 'epilepsy' },
    difficulty: 'easy',
    clerkshipAppropriate: true,
    learningObjective: 'Sequence the stepwise pharmacologic treatment of pediatric convulsive status epilepticus.',
    blueprintTopic: 'Epilepsy and Episodic Disorders',
    vignette: null,
    leadIn: 'A 4-year-old has been actively convulsing for 8 minutes despite two doses of intramuscular midazolam in the field. On arrival to the emergency department, she remains in generalized convulsive status epilepticus. Which of the following is the most appropriate next medication?',
    options: [
      { text: 'A third dose of midazolam', isCorrect: false, rationale: 'After two adequate benzodiazepine doses without seizure cessation, additional benzodiazepines provide diminishing benefit and increase the risk of respiratory depression. Move to a second-line agent.' },
      { text: 'Phenobarbital 20 mg/kg IV', isCorrect: false, rationale: 'Phenobarbital is an acceptable second-line agent but is generally reserved for neonates or when fosphenytoin/levetiracetam/valproate fail; it carries higher sedation and respiratory risk.' },
      { text: 'Fosphenytoin 20 mg PE/kg IV', isCorrect: true, rationale: 'After two doses of a benzodiazepine, the next step in pediatric convulsive status epilepticus is a second-line agent: fosphenytoin (20 mg PE/kg), levetiracetam (60 mg/kg), or valproate (40 mg/kg). The ESETT trial showed comparable efficacy among these three.' },
      { text: 'Continuous propofol infusion', isCorrect: false, rationale: 'Continuous anesthetic infusions (midazolam, pentobarbital, propofol) are reserved for refractory status epilepticus after second-line agents fail.' },
    ],
  },
  {
    type: 'recall',
    labels: { dim1Category: 'epilepsy', dim2Category: 'neuroscience', population: 'peds', section: 'epilepsy' },
    difficulty: 'hard',
    clerkshipAppropriate: false,
    learningObjective: 'Identify the gene responsible for self-limited familial neonatal epilepsy.',
    blueprintTopic: 'Epilepsy and Episodic Disorders',
    vignette: null,
    leadIn: 'A term newborn develops brief, multifocal clonic seizures on day of life 3. Examination, glucose, electrolytes, and brain imaging are normal. The mother reports that her father had a similar self-limited seizure disorder in the newborn period that resolved by 6 months of age. A pathogenic variant in which of the following genes is most likely responsible?',
    options: [
      { text: 'SCN1A', isCorrect: false, rationale: 'SCN1A loss-of-function causes Dravet syndrome, which presents with prolonged febrile hemiclonic seizures around 6 months of age, not self-limited neonatal seizures.' },
      { text: 'KCNQ2', isCorrect: true, rationale: 'Self-limited familial neonatal epilepsy is most commonly caused by autosomal-dominant variants in KCNQ2 (and less often KCNQ3), which encode voltage-gated potassium channel subunits. Severe de novo KCNQ2 variants cause a developmental and epileptic encephalopathy; familial loss-of-function variants tend to produce the benign phenotype.' },
      { text: 'CDKL5', isCorrect: false, rationale: 'CDKL5 encephalopathy presents with refractory infantile-onset epilepsy with hypsarrhythmia and severe developmental impairment, not self-limited neonatal seizures.' },
      { text: 'STXBP1', isCorrect: false, rationale: 'STXBP1 variants cause early infantile developmental and epileptic encephalopathy (Ohtahara phenotype), not self-limited seizures.' },
    ],
  },
  {
    type: 'application',
    labels: { dim1Category: 'epilepsy', dim2Category: 'diagnostic-procedures', population: 'peds', section: 'epilepsy' },
    difficulty: 'hard',
    clerkshipAppropriate: false,
    learningObjective: 'Recognize the EEG and clinical features of Ohtahara syndrome.',
    blueprintTopic: 'Epilepsy and Episodic Disorders',
    vignette: 'A 3-week-old former term neonate is admitted for frequent tonic spasms occurring up to 100 times per day in clusters during both wakefulness and sleep. Examination reveals profound encephalopathy. Brain MRI shows a structural malformation of cortical development.',
    leadIn: 'Which of the following EEG patterns is most likely to be present in this patient?',
    options: [
      { text: 'Burst-suppression', isCorrect: true, rationale: 'Ohtahara syndrome (early infantile developmental and epileptic encephalopathy) presents in the first months of life with tonic spasms and a burst-suppression EEG pattern present in both wakefulness and sleep. Common etiologies include structural brain malformations and STXBP1, KCNQ2, or ARX variants.' },
      { text: 'Hypsarrhythmia', isCorrect: false, rationale: 'Hypsarrhythmia is the EEG signature of West syndrome (infantile spasms), which typically appears at 4–8 months of age.' },
      { text: 'Generalized 3-Hz spike-and-wave', isCorrect: false, rationale: '3-Hz spike-and-wave is the hallmark of childhood absence epilepsy.' },
      { text: 'Continuous spike-and-wave during slow sleep', isCorrect: false, rationale: 'CSWS is the EEG hallmark of Landau-Kleffner syndrome / ESES, which presents in school-age children with language regression.' },
    ],
  },
  {
    type: 'application',
    labels: { dim1Category: 'epilepsy', dim2Category: 'treatment', population: 'peds', section: 'epilepsy' },
    difficulty: 'hard',
    clerkshipAppropriate: false,
    learningObjective: 'Diagnose and treat pyridoxine-dependent epilepsy.',
    blueprintTopic: 'Epilepsy and Episodic Disorders',
    vignette: 'A term neonate develops refractory tonic-clonic seizures within hours of birth. The seizures fail to respond to phenobarbital, fosphenytoin, and levetiracetam. There is no perinatal asphyxia, infection, hypoglycemia, or electrolyte derangement. Brain MRI is normal.',
    leadIn: 'Administration of which of the following is most appropriate next?',
    options: [
      { text: 'Pyridoxine (vitamin B6) 100 mg IV', isCorrect: true, rationale: 'Pyridoxine-dependent epilepsy (caused by ALDH7A1 variants) presents in the neonatal period with seizures refractory to standard anti-seizure medications. A trial of intravenous pyridoxine produces dramatic seizure cessation within minutes and is both diagnostic and therapeutic; lifelong supplementation is required.' },
      { text: 'Folinic acid 5 mg', isCorrect: false, rationale: 'Folinic acid–responsive seizures are a related disorder also due to ALDH7A1 variants and warrant a trial when pyridoxine fails, but pyridoxine is the standard first empiric therapy.' },
      { text: 'Biotin 10 mg', isCorrect: false, rationale: 'Biotinidase deficiency presents with seizures, alopecia, hearing loss, and metabolic acidosis later in infancy, not within hours of birth.' },
      { text: 'Therapeutic hypothermia', isCorrect: false, rationale: 'Therapeutic hypothermia is indicated for hypoxic-ischemic encephalopathy of moderate to severe degree within the first 6 hours of life; this neonate has no perinatal asphyxia.' },
    ],
  },
  {
    type: 'application',
    labels: { dim1Category: 'epilepsy', dim2Category: 'treatment', population: 'peds', section: 'epilepsy' },
    difficulty: 'hard',
    clerkshipAppropriate: false,
    learningObjective: 'Select pharmacologic treatment for electrical status epilepticus during slow-wave sleep (ESES / CSWS).',
    blueprintTopic: 'Epilepsy and Episodic Disorders',
    vignette: 'A 6-year-old with previously normal development has a 6-month history of language regression, behavioral changes, and academic decline. Overnight EEG demonstrates near-continuous bilateral spike-and-wave activity occupying more than 85% of non-REM sleep.',
    leadIn: 'Which of the following is the most appropriate first-line treatment?',
    options: [
      { text: 'Carbamazepine', isCorrect: false, rationale: 'Carbamazepine and other sodium-channel blockers can paradoxically worsen ESES and are generally avoided.' },
      { text: 'Vigabatrin', isCorrect: false, rationale: 'Vigabatrin is first-line for infantile spasms in tuberous sclerosis complex; it is not a standard treatment for ESES.' },
      { text: 'High-dose oral diazepam or corticosteroids', isCorrect: true, rationale: 'ESES (Landau-Kleffner / continuous spike-and-wave during sleep) is treated with high-dose benzodiazepines (e.g., overnight diazepam pulses) or corticosteroids (oral prednisone or ACTH); both can dramatically reduce sleep-activated spike burden and may improve cognitive trajectory.' },
      { text: 'Levetiracetam monotherapy', isCorrect: false, rationale: 'Levetiracetam has only modest efficacy for ESES and is rarely sufficient as monotherapy.' },
    ],
  },
  {
    type: 'recall',
    labels: { dim1Category: 'epilepsy', dim2Category: 'treatment', population: 'peds', section: 'epilepsy' },
    difficulty: 'medium',
    clerkshipAppropriate: false,
    learningObjective: 'Identify appropriate candidates for vagus nerve stimulator placement.',
    blueprintTopic: 'Epilepsy and Episodic Disorders',
    vignette: null,
    leadIn: 'Vagus nerve stimulation is most appropriately considered in which of the following patients?',
    options: [
      { text: 'A 12-year-old with drug-resistant focal epilepsy who is not a candidate for resective surgery', isCorrect: true, rationale: 'Vagus nerve stimulation is FDA-approved as adjunctive therapy for drug-resistant focal epilepsy in patients ≥4 years old who are not candidates for resective surgery; it typically achieves about 50% reduction in seizure frequency in roughly half of patients.' },
      { text: 'A newly diagnosed 7-year-old with childhood absence epilepsy who has not yet started medication', isCorrect: false, rationale: 'Childhood absence epilepsy responds well to ethosuximide; VNS is not indicated as first-line treatment.' },
      { text: 'A 16-year-old with non-epileptic functional seizures', isCorrect: false, rationale: 'Functional (non-epileptic) seizures are not treated with neuromodulation; the management is psychiatric and rehabilitative.' },
      { text: 'A 9-year-old with a single resectable mesial temporal lesion causing focal seizures', isCorrect: false, rationale: 'A single resectable epileptogenic lesion is best treated with resective surgery, which offers the highest chance of seizure freedom; VNS is reserved for patients who are not surgical candidates.' },
    ],
  },
  {
    type: 'application',
    labels: { dim1Category: 'epilepsy', dim2Category: 'clinical-aspects', population: 'peds', section: 'epilepsy' },
    difficulty: 'medium',
    clerkshipAppropriate: false,
    learningObjective: 'Differentiate psychogenic non-epileptic seizures from epileptic seizures by clinical features.',
    blueprintTopic: 'Paroxysmal Disorders',
    vignette: 'A 15-year-old presents with episodes of bilateral rhythmic limb shaking lasting 20–30 minutes. The episodes have a gradual buildup, occur exclusively when others are present, include eye closure with active resistance to passive eye opening, and are followed by immediate return to baseline conversation. Multiple captured events on inpatient video-EEG show no ictal or post-ictal EEG changes.',
    leadIn: 'Which of the following is the most likely diagnosis?',
    options: [
      { text: 'Psychogenic non-epileptic seizures', isCorrect: true, rationale: 'Long duration (>2 minutes), waxing-and-waning motor activity, forced eye closure with resistance, ictal awareness, lack of post-ictal confusion, and an absence of EEG correlate during typical events strongly support psychogenic non-epileptic seizures (functional seizures). Treatment is psychiatric, with cognitive-behavioral therapy as first-line.' },
      { text: 'Frontal lobe nocturnal epilepsy', isCorrect: false, rationale: 'Frontal lobe seizures are typically brief (<1 minute), stereotyped, often occur from sleep, and are accompanied by ictal EEG changes in most cases.' },
      { text: 'Focal seizure with impaired awareness', isCorrect: false, rationale: 'Focal seizures with impaired awareness produce reduced responsiveness, automatisms, and post-ictal confusion, with ictal EEG changes in most cases.' },
      { text: 'Convulsive syncope', isCorrect: false, rationale: 'Convulsive syncope produces brief (<30 seconds) myoclonic jerks following a clear vasovagal trigger and rapid pallor, not 20–30 minutes of rhythmic shaking.' },
    ],
  },
  {
    type: 'recall',
    labels: { dim1Category: 'epilepsy', dim2Category: 'neuroscience', population: 'peds', section: 'epilepsy' },
    difficulty: 'hard',
    clerkshipAppropriate: false,
    learningObjective: 'Identify the genetic cause of PCDH19 epilepsy.',
    blueprintTopic: 'Epilepsy and Episodic Disorders',
    vignette: null,
    leadIn: 'A 14-month-old girl has clusters of brief focal seizures triggered by fever, lasting 1–5 days at a time, separated by months of seizure freedom. A heterozygous loss-of-function variant in PCDH19 is identified. Which of the following statements about this disorder is most accurate?',
    options: [
      { text: 'It is X-linked and only affects hemizygous males', isCorrect: false, rationale: 'PCDH19 epilepsy is X-linked but, paradoxically, affects heterozygous females and rare mosaic males. Hemizygous transmitting males are typically unaffected, presumably because uniform PCDH19 loss does not produce the cellular interference effect.' },
      { text: 'It causes a developmental and epileptic encephalopathy with hypsarrhythmia from age 4 months', isCorrect: false, rationale: 'PCDH19 epilepsy presents with seizure clusters and variable cognitive impact, not the hypsarrhythmia of West syndrome.' },
      { text: 'It is X-linked and produces seizures predominantly in heterozygous females and mosaic males', isCorrect: true, rationale: 'PCDH19-related epilepsy is the second most common monogenic epilepsy after Dravet. The mechanism is cellular interference: a mosaic pattern of PCDH19-expressing and PCDH19-null neurons disrupts cell-cell adhesion and is more pathogenic than uniform loss. Affected patients are therefore heterozygous females and rare somatically mosaic males.' },
      { text: 'It responds robustly to lamotrigine monotherapy', isCorrect: false, rationale: 'No single ASM is reliably effective in PCDH19 epilepsy; treatment is empiric and often unsatisfying. Lamotrigine in particular is not preferred.' },
    ],
  },

  // ─── NORMAL DEVELOPMENT (10) ──────────────────────────────────────────
  {
    type: 'recall',
    labels: { dim1Category: 'normal-development', dim2Category: 'clinical-aspects', population: 'peds', section: 'development' },
    difficulty: 'easy',
    clerkshipAppropriate: true,
    learningObjective: 'Identify the typical age at which a child sits independently.',
    blueprintTopic: 'Normal Structure and Life Cycle Development',
    vignette: null,
    leadIn: 'At what median age does a typically developing child first sit independently without support?',
    options: [
      { text: '4 months', isCorrect: false, rationale: 'At 4 months an infant typically holds the head steady when seated and rolls from front to back, but does not yet sit independently.' },
      { text: '6 months', isCorrect: true, rationale: 'Independent sitting (sitting alone for at least a few seconds without hand support) is typically achieved around 6 months. By 9 months most infants sit steadily and can manipulate objects in sitting.' },
      { text: '9 months', isCorrect: false, rationale: 'By 9 months most infants are pulling to stand and cruising along furniture. Sitting alone has typically been present for 2–3 months by this point.' },
      { text: '12 months', isCorrect: false, rationale: '12 months is the typical age for first independent steps; sitting is well-established months earlier.' },
    ],
  },
  {
    type: 'recall',
    labels: { dim1Category: 'normal-development', dim2Category: 'clinical-aspects', population: 'peds', section: 'development' },
    difficulty: 'easy',
    clerkshipAppropriate: true,
    learningObjective: 'Identify the typical age range for independent walking.',
    blueprintTopic: 'Normal Structure and Life Cycle Development',
    vignette: null,
    leadIn: 'A child who is not walking independently by which of the following ages should prompt formal developmental evaluation?',
    options: [
      { text: '12 months', isCorrect: false, rationale: 'Although the median age for first independent steps is approximately 12 months, the normal range extends to 18 months. Failure to walk by 12 months alone is not a red flag.' },
      { text: '15 months', isCorrect: false, rationale: 'Some typically developing children take their first steps as late as 15–18 months, particularly if there is a strong family history of late walking.' },
      { text: '18 months', isCorrect: true, rationale: 'A child not walking independently by 18 months has crossed the upper limit of the typical range and warrants formal developmental and neuromuscular evaluation, including consideration of cerebral palsy, hip dysplasia, neuromuscular disorders, and global delay.' },
      { text: '24 months', isCorrect: false, rationale: 'Waiting until 24 months delays diagnosis of conditions such as Duchenne muscular dystrophy or spinal muscular atrophy, where earlier identification meaningfully changes management.' },
    ],
  },
  {
    type: 'recall',
    labels: { dim1Category: 'normal-development', dim2Category: 'clinical-aspects', population: 'peds', section: 'development' },
    difficulty: 'easy',
    clerkshipAppropriate: true,
    learningObjective: 'Identify the typical age at which the pincer grasp emerges.',
    blueprintTopic: 'Normal Structure and Life Cycle Development',
    vignette: null,
    leadIn: 'A neat pincer grasp (picking up a small object with the tip of the thumb and the tip of the index finger) is typically present by which of the following ages?',
    options: [
      { text: '6 months', isCorrect: false, rationale: 'At 6 months an infant typically uses a raking grasp (gross use of the whole hand) rather than isolated finger movements.' },
      { text: '9 months', isCorrect: false, rationale: 'At 9 months an immature ("inferior") pincer using the pad of the thumb and index finger emerges, but not yet the fingertip-to-fingertip neat pincer.' },
      { text: '12 months', isCorrect: true, rationale: 'A neat pincer grasp using the fingertips is typically established by 12 months and is one of the prerequisites for self-feeding small objects.' },
      { text: '18 months', isCorrect: false, rationale: 'By 18 months pincer grasp is well-established and the child is using utensils with some skill.' },
    ],
  },
  {
    type: 'recall',
    labels: { dim1Category: 'normal-development', dim2Category: 'clinical-aspects', population: 'peds', section: 'development' },
    difficulty: 'medium',
    clerkshipAppropriate: true,
    learningObjective: 'Identify the typical ages at which children copy specific geometric shapes.',
    blueprintTopic: 'Normal Structure and Life Cycle Development',
    vignette: null,
    leadIn: 'A typically developing child can usually first copy a square at approximately what age?',
    options: [
      { text: '2 years', isCorrect: false, rationale: 'At 2 years children can imitate a vertical line; copying geometric shapes from a model is not yet expected.' },
      { text: '3 years', isCorrect: false, rationale: 'At 3 years children can copy a circle; the square is not yet within reach.' },
      { text: '4–5 years', isCorrect: true, rationale: 'The classic visuomotor sequence is: vertical line by 2, circle by 3, cross by 4, square by 4–5, triangle by 5–6, and diamond by 7. Failure to meet these milestones suggests visuomotor or fine-motor delay.' },
      { text: '7 years', isCorrect: false, rationale: 'A diamond is the figure typically copied around age 7. The square is achieved earlier.' },
    ],
  },
  {
    type: 'recall',
    labels: { dim1Category: 'normal-development', dim2Category: 'clinical-aspects', population: 'peds', section: 'development' },
    difficulty: 'easy',
    clerkshipAppropriate: true,
    learningObjective: 'Identify the typical age at which a child speaks two-word phrases.',
    blueprintTopic: 'Normal Structure and Life Cycle Development',
    vignette: null,
    leadIn: 'A typically developing child first combines two words into meaningful phrases (e.g., "more milk") at approximately what age?',
    options: [
      { text: '12 months', isCorrect: false, rationale: 'At 12 months children typically speak their first true word; two-word combinations come about a year later.' },
      { text: '18 months', isCorrect: false, rationale: 'At 18 months a typical vocabulary is 10–25 single words; two-word phrases are emerging but not yet consistent.' },
      { text: '24 months', isCorrect: true, rationale: 'Two-word phrases are typically spoken by 24 months. A useful rule of thumb is that vocabulary should be ≥50 words and the child should be combining two words by age 2; failure to meet this milestone warrants speech and hearing evaluation.' },
      { text: '36 months', isCorrect: false, rationale: 'By 36 months children typically speak in 3–4 word sentences and are intelligible to strangers about 75% of the time.' },
    ],
  },
  {
    type: 'recall',
    labels: { dim1Category: 'normal-development', dim2Category: 'clinical-aspects', population: 'peds', section: 'development' },
    difficulty: 'easy',
    clerkshipAppropriate: true,
    learningObjective: 'Identify the typical age at which the social smile emerges.',
    blueprintTopic: 'Normal Structure and Life Cycle Development',
    vignette: null,
    leadIn: 'The social smile (smiling responsively to a caregiver’s face) is typically present by what age?',
    options: [
      { text: '2 months', isCorrect: true, rationale: 'A reliable, responsive social smile is typically present by 2 months. Absence of the social smile by this age is an early red flag for autism spectrum disorder, visual impairment, or global delay.' },
      { text: '4 months', isCorrect: false, rationale: 'By 4 months social smiling is well-established and the infant laughs aloud. 4 months is too late as a milestone for first emergence.' },
      { text: '6 months', isCorrect: false, rationale: 'By 6 months the infant has stranger awareness and engages in reciprocal social interactions; the social smile is many months old.' },
      { text: '9 months', isCorrect: false, rationale: 'By 9 months stranger anxiety and joint attention emerge; social smiling has been present since 2 months.' },
    ],
  },
  {
    type: 'recall',
    labels: { dim1Category: 'normal-development', dim2Category: 'clinical-aspects', population: 'peds', section: 'development' },
    difficulty: 'medium',
    clerkshipAppropriate: true,
    learningObjective: 'Identify the typical age range for disappearance of the Moro reflex.',
    blueprintTopic: 'Normal Structure and Life Cycle Development',
    vignette: null,
    leadIn: 'Persistence of which of the following primitive reflexes beyond 6 months of age is most concerning for an underlying upper motor neuron disorder?',
    options: [
      { text: 'Moro reflex', isCorrect: true, rationale: 'The Moro reflex is normally present at birth and disappears by 4–6 months. Persistence beyond 6 months suggests an upper motor neuron lesion, most commonly cerebral palsy.' },
      { text: 'Plantar grasp', isCorrect: false, rationale: 'The plantar grasp normally persists until 9–12 months, so its presence at 6 months is age-appropriate.' },
      { text: 'Parachute reflex', isCorrect: false, rationale: 'The parachute reflex normally appears at 6–9 months and persists for life; its presence is expected, and its absence at 12 months is pathologic.' },
      { text: 'Babinski sign', isCorrect: false, rationale: 'An upgoing toe (Babinski) is a normal finding in infants until approximately 12–24 months because of incomplete corticospinal tract myelination.' },
    ],
  },
  {
    type: 'recall',
    labels: { dim1Category: 'normal-development', dim2Category: 'clinical-aspects', population: 'peds', section: 'development' },
    difficulty: 'medium',
    clerkshipAppropriate: false,
    learningObjective: 'Identify the typical age at which the parachute (protective extension) reflex appears.',
    blueprintTopic: 'Normal Structure and Life Cycle Development',
    vignette: null,
    leadIn: 'The parachute (protective extension) reflex — forward extension of the arms when the suspended infant is plunged head-first toward a surface — typically emerges at what age?',
    options: [
      { text: '2 months', isCorrect: false, rationale: 'At 2 months postural reflexes are immature; the parachute is not present.' },
      { text: '4 months', isCorrect: false, rationale: 'At 4 months the head-righting and lateral propping responses begin to appear, but the parachute reflex emerges later.' },
      { text: '6–9 months', isCorrect: true, rationale: 'The parachute reflex normally emerges between 6 and 9 months and persists throughout life. Its absence by 12 months is abnormal and may indicate cerebral palsy or other CNS dysfunction.' },
      { text: '12–15 months', isCorrect: false, rationale: 'By 12–15 months the parachute reflex should be well-established; its first appearance this late is delayed.' },
    ],
  },
  {
    type: 'recall',
    labels: { dim1Category: 'normal-development', dim2Category: 'neuroscience', population: 'peds', section: 'development' },
    difficulty: 'hard',
    clerkshipAppropriate: false,
    learningObjective: 'Describe the typical pattern of CNS myelination on MRI.',
    blueprintTopic: 'Normal Structure and Life Cycle Development',
    vignette: null,
    leadIn: 'On a brain MRI of a typically developing child, the white matter myelination pattern matures in which general direction?',
    options: [
      { text: 'Anterior to posterior, superior to inferior, and central to peripheral', isCorrect: false, rationale: 'Myelination proceeds in the opposite direction in each axis: posterior to anterior, inferior to superior, and central to peripheral.' },
      { text: 'Posterior to anterior, inferior to superior, central to peripheral, and proximal to distal', isCorrect: true, rationale: 'CNS myelination proceeds in a stereotyped pattern: caudal to rostral (brainstem and posterior limb of internal capsule first, then frontal lobes and subcortical U-fibers last), central to peripheral, and proximal to distal. Adult myelination pattern is essentially complete by 24 months on T1 and 36 months on T2.' },
      { text: 'Frontal lobe first, then occipital, parietal, and temporal in sequence', isCorrect: false, rationale: 'The frontal lobes are among the last to myelinate, not the first. Occipital and posterior structures myelinate before frontal.' },
      { text: 'Cortex first, then deep white matter, then brainstem', isCorrect: false, rationale: 'Brainstem myelinates first (largely complete at term), with cortical projections and subcortical U-fibers last to mature.' },
    ],
  },
  {
    type: 'recall',
    labels: { dim1Category: 'normal-development', dim2Category: 'clinical-aspects', population: 'peds', section: 'development' },
    difficulty: 'medium',
    clerkshipAppropriate: false,
    learningObjective: 'Identify the typical age at which hand preference develops.',
    blueprintTopic: 'Normal Structure and Life Cycle Development',
    vignette: null,
    leadIn: 'A 14-month-old has consistently used the right hand for all reaching and manipulation since 9 months of age, while the left hand remains fisted with limited spontaneous use. This finding is most concerning for which of the following?',
    options: [
      { text: 'Normal early hand preference', isCorrect: false, rationale: 'Established hand preference before 18–24 months is abnormal. Most typically developing children do not show consistent hand dominance until age 2–4 years.' },
      { text: 'A contralateral upper motor neuron lesion (e.g., perinatal stroke or hemiplegic cerebral palsy)', isCorrect: true, rationale: 'Hand preference established before 18 months is a red flag for contralateral hemiparesis. The "preferred" hand is typically the unaffected one because the affected side cannot be used effectively. Perinatal arterial ischemic stroke and hemiplegic cerebral palsy are the most common causes.' },
      { text: 'Familial left-handedness', isCorrect: false, rationale: 'Familial handedness does not produce its phenotype until well after 2 years, and the contralateral hand is normally used capably even before dominance emerges.' },
      { text: 'Mild fine-motor delay of no clinical significance', isCorrect: false, rationale: 'Asymmetric hand use this early should never be dismissed as benign delay; it warrants neuroimaging and a focused neurologic exam.' },
    ],
  },

  // ─── TREATMENT (10) ───────────────────────────────────────────────────
  {
    type: 'application',
    labels: { dim1Category: 'neuroimmunologic', dim2Category: 'treatment', population: 'peds', section: 'neuroimmunology' },
    difficulty: 'medium',
    clerkshipAppropriate: false,
    learningObjective: 'Select first-line immunotherapy for anti-NMDA receptor encephalitis.',
    blueprintTopic: 'Neuroimmunologic and Paraneoplastic Disorders',
    vignette: 'A 16-year-old previously healthy adolescent presents with two weeks of bizarre behavior, paranoia, choreoathetoid orofacial movements, and new focal seizures. CSF shows mild lymphocytic pleocytosis and is positive for anti-NMDA receptor IgG antibodies. Pelvic ultrasound is unrevealing.',
    leadIn: 'Which of the following is the most appropriate initial immunotherapy?',
    options: [
      { text: 'High-dose intravenous methylprednisolone plus IVIG (or plasma exchange)', isCorrect: true, rationale: 'First-line treatment for anti-NMDA receptor encephalitis is high-dose IV methylprednisolone with IVIG or plasma exchange. Patients failing first-line therapy escalate to rituximab and/or cyclophosphamide. Tumor screening (especially ovarian teratoma in adolescent girls) is essential because tumor removal is itself therapeutic.' },
      { text: 'Acyclovir monotherapy', isCorrect: false, rationale: 'Acyclovir is appropriate empirically while HSV encephalitis is being ruled out, but is not the disease-specific therapy for autoimmune encephalitis.' },
      { text: 'Rituximab as first-line monotherapy', isCorrect: false, rationale: 'Rituximab is escalation (second-line) therapy when first-line agents fail. It is not standard first-line.' },
      { text: 'Watchful waiting until tumor is identified', isCorrect: false, rationale: 'Treatment delays worsen long-term outcomes; immunotherapy should not be deferred while tumor work-up is in progress.' },
    ],
  },
  {
    type: 'application',
    labels: { dim1Category: 'neuromuscular', dim2Category: 'treatment', population: 'peds', section: 'neuromuscular' },
    difficulty: 'medium',
    clerkshipAppropriate: true,
    learningObjective: 'Select disease-modifying therapy for spinal muscular atrophy.',
    blueprintTopic: 'Neuromuscular Diseases',
    vignette: 'A 6-week-old infant is identified through state newborn screening as having a homozygous deletion of SMN1 with two copies of SMN2. He is asymptomatic on examination.',
    leadIn: 'Which of the following is the most appropriate disease-modifying therapy?',
    options: [
      { text: 'Onasemnogene abeparvovec (one-time intravenous AAV9 gene replacement)', isCorrect: true, rationale: 'Pre-symptomatic infants under 2 years with SMA identified on newborn screening are candidates for one-time AAV9-based SMN1 gene replacement (onasemnogene abeparvovec). Two other SMN-augmenting agents — nusinersen (intrathecal antisense) and risdiplam (oral SMN2 splicing modifier) — are also approved across ages and SMN2 copy numbers; choice depends on age, weight, and access.' },
      { text: 'Intravenous immunoglobulin', isCorrect: false, rationale: 'IVIG is used in immune-mediated neuromuscular diseases such as Guillain-Barré syndrome and CIDP, not in SMA.' },
      { text: 'Daily oral prednisone', isCorrect: false, rationale: 'Glucocorticoids are first-line in Duchenne muscular dystrophy, not SMA.' },
      { text: 'Watchful waiting until the infant becomes symptomatic', isCorrect: false, rationale: 'Pre-symptomatic treatment dramatically improves motor outcomes versus initiating therapy after symptom onset, when motor neuron loss has already occurred.' },
    ],
  },
  {
    type: 'application',
    labels: { dim1Category: 'neuromuscular', dim2Category: 'treatment', population: 'peds', section: 'neuromuscular' },
    difficulty: 'easy',
    clerkshipAppropriate: true,
    learningObjective: 'Identify glucocorticoid therapy as standard of care for Duchenne muscular dystrophy.',
    blueprintTopic: 'Neuromuscular Diseases',
    vignette: 'A 5-year-old boy with confirmed Duchenne muscular dystrophy is being seen for routine follow-up. He is ambulatory but has begun using the Gowers maneuver to stand from the floor.',
    leadIn: 'Which of the following is the most appropriate disease-modifying treatment to initiate now?',
    options: [
      { text: 'Daily oral glucocorticoid (prednisone or deflazacort)', isCorrect: true, rationale: 'Daily glucocorticoid therapy is standard of care for ambulatory boys with DMD aged ≥4 years. It prolongs ambulation by approximately 2 years, slows decline of pulmonary and cardiac function, and reduces scoliosis. Vamorolone is an alternative dissociative steroid with comparable efficacy and a more favorable side-effect profile.' },
      { text: 'Cyclophosphamide', isCorrect: false, rationale: 'Cyclophosphamide is not used in DMD.' },
      { text: 'Plasmapheresis', isCorrect: false, rationale: 'Plasmapheresis is used in immune-mediated neuropathies and antibody-mediated CNS disorders, not in genetic muscular dystrophies.' },
      { text: 'Watchful waiting until the patient loses ambulation', isCorrect: false, rationale: 'Delaying glucocorticoids forfeits the window when they can prolong ambulation and protect cardiopulmonary function.' },
    ],
  },
  {
    type: 'application',
    labels: { dim1Category: 'metabolic', dim2Category: 'treatment', population: 'peds', section: 'neurogenetics-and-neurometabolics' },
    difficulty: 'medium',
    clerkshipAppropriate: false,
    learningObjective: 'Select maintenance therapy for Wilson disease.',
    blueprintTopic: 'Metabolic Diseases',
    vignette: 'A 14-year-old with newly diagnosed neurologic Wilson disease has been initiated on chelation therapy with trientine. Six months later her neurologic symptoms have stabilized and 24-hour urinary copper has decreased.',
    leadIn: 'Which of the following is the most appropriate long-term maintenance therapy?',
    options: [
      { text: 'Lifelong zinc therapy (often after a course of chelation)', isCorrect: true, rationale: 'After initial decoppering with a chelator (penicillamine or trientine), maintenance therapy is typically zinc, which induces intestinal metallothionein and blocks dietary copper absorption. Some practitioners maintain trientine indefinitely; either approach must continue lifelong because the underlying ATP7B defect is permanent.' },
      { text: 'Discontinue all therapy once urinary copper normalizes', isCorrect: false, rationale: 'Treatment must continue lifelong; cessation reliably leads to relapse and progressive liver and CNS injury.' },
      { text: 'Switch to a low-protein diet alone', isCorrect: false, rationale: 'Dietary modification (avoiding high-copper foods like shellfish, liver, nuts, chocolate) is supportive but cannot replace pharmacologic copper management.' },
      { text: 'Initiate a high-dose oral iron supplement', isCorrect: false, rationale: 'Iron supplementation has no role in Wilson disease and can compete with copper handling unfavorably.' },
    ],
  },
  {
    type: 'application',
    labels: { dim1Category: 'epilepsy', dim2Category: 'treatment', population: 'peds', section: 'epilepsy' },
    difficulty: 'easy',
    clerkshipAppropriate: true,
    learningObjective: 'Identify the criteria and time window for therapeutic hypothermia in neonatal HIE.',
    blueprintTopic: 'Treatment and Management',
    vignette: 'A term newborn with cord arterial pH of 6.9 and a 10-minute Apgar of 4 is admitted to the NICU. At 4 hours of life, examination demonstrates lethargy, hypotonia, weak suck, and seizures. Background EEG is moderately abnormal.',
    leadIn: 'Which of the following is the most appropriate next step?',
    options: [
      { text: 'Initiate therapeutic hypothermia (33.5°C core temperature for 72 hours)', isCorrect: true, rationale: 'Therapeutic hypothermia is indicated for moderate-to-severe HIE in infants ≥36 weeks gestation when initiated within the first 6 hours of life. Cooling to 33.5°C for 72 hours followed by slow rewarming reduces death and major neurodevelopmental disability at 18 months. Eligibility requires evidence of acute peripartum event (cord pH ≤7.0 or BD ≥16, or 10-minute Apgar ≤5) plus moderate-to-severe encephalopathy.' },
      { text: 'Initiate prophylactic phenobarbital before seizures recur', isCorrect: false, rationale: 'Routine prophylactic phenobarbital in HIE has not been shown to improve neurodevelopmental outcome and is not standard. Treat clinical or electrographic seizures as they arise.' },
      { text: 'Defer cooling because the infant is already 4 hours old', isCorrect: false, rationale: 'The 6-hour window is the upper limit, not the start. Initiating cooling at 4 hours is well within the recommended time frame.' },
      { text: 'Begin intravenous magnesium sulfate', isCorrect: false, rationale: 'Magnesium has been studied as a potential neuroprotectant but is not standard of care for term HIE in current guidelines.' },
    ],
  },
  {
    type: 'application',
    labels: { dim1Category: 'movement', dim2Category: 'treatment', population: 'peds', section: 'movement-disorders' },
    difficulty: 'medium',
    clerkshipAppropriate: true,
    learningObjective: 'Select first-line pharmacologic treatment for Tourette syndrome.',
    blueprintTopic: 'Movement Disorders',
    vignette: 'An 11-year-old with a 2-year history of motor and vocal tics is now being teased at school and finds his neck-jerking tic painful. The family asks about pharmacologic treatment.',
    leadIn: 'Which of the following is the most appropriate first-line pharmacologic agent?',
    options: [
      { text: 'Guanfacine (an alpha-2 adrenergic agonist)', isCorrect: true, rationale: 'Alpha-2 agonists (guanfacine, clonidine) are typically first-line pharmacologic therapy for tics in children, particularly given the high comorbidity with ADHD that they can also help. Comprehensive Behavioral Intervention for Tics (CBIT) is the recommended first-line treatment overall and should be offered when available.' },
      { text: 'Haloperidol', isCorrect: false, rationale: 'Typical antipsychotics have proven efficacy but carry significant risk of weight gain, sedation, extrapyramidal effects, and tardive dyskinesia. They are reserved for refractory cases, with newer VMAT2 inhibitors and atypicals often preferred when needed.' },
      { text: 'Levetiracetam', isCorrect: false, rationale: 'Levetiracetam has limited evidence in tic disorders and is not standard.' },
      { text: 'Long-term high-dose benzodiazepines', isCorrect: false, rationale: 'Chronic benzodiazepine therapy is not appropriate for Tourette syndrome given dependence and cognitive risk.' },
    ],
  },
  {
    type: 'application',
    labels: { dim1Category: 'demyelinating', dim2Category: 'treatment', population: 'peds', section: 'neuroimmunology' },
    difficulty: 'medium',
    clerkshipAppropriate: false,
    learningObjective: 'Select disease-modifying therapy for pediatric multiple sclerosis.',
    blueprintTopic: 'Demyelinating Diseases',
    vignette: 'A 14-year-old girl is diagnosed with relapsing-remitting multiple sclerosis after two clinically distinct demyelinating events with new T2 lesions on interval MRI. She has had two relapses in the past 12 months and shows enhancing lesions on her current scan.',
    leadIn: 'Which of the following is the most appropriate disease-modifying therapy?',
    options: [
      { text: 'A high-efficacy agent such as fingolimod, natalizumab, or anti-CD20 (ocrelizumab/rituximab)', isCorrect: true, rationale: 'Pediatric MS tends to be highly inflammatory with frequent relapses. The PARADIGMS trial demonstrated superiority of fingolimod over interferon beta-1a in pediatric MS, and current consensus increasingly favors initial high-efficacy therapy in children with active disease over the older "escalation" approach.' },
      { text: 'Interferon beta-1a as initial therapy in all pediatric patients', isCorrect: false, rationale: 'Although interferons were historically first-line, they are now considered modest-efficacy therapy and are typically chosen only for milder disease courses or where higher-efficacy agents are not feasible.' },
      { text: 'Cyclophosphamide alone', isCorrect: false, rationale: 'Cyclophosphamide is reserved for refractory cases or fulminant presentations and is not standard first-line therapy due to toxicity.' },
      { text: 'No treatment until a third relapse occurs', isCorrect: false, rationale: 'Withholding therapy after a confirmed second clinical event allows accumulation of irreversible disability and brain volume loss; treatment should not be deferred.' },
    ],
  },
  {
    type: 'application',
    labels: { dim1Category: 'headache', dim2Category: 'treatment', population: 'peds', section: 'headaches' },
    difficulty: 'medium',
    clerkshipAppropriate: true,
    learningObjective: 'Apply current evidence-based guidance to migraine prophylaxis in children.',
    blueprintTopic: 'Headache and Pain Disorders',
    vignette: 'A 12-year-old with episodic migraine without aura has 6–8 disabling headaches per month despite reliable acute treatment with ibuprofen and triptans, adequate hydration, and sleep hygiene. The family asks about preventive medication.',
    leadIn: 'Which of the following best reflects current evidence on pharmacologic migraine prevention in children?',
    options: [
      { text: 'The CHAMP trial showed that placebo was equivalent to amitriptyline and topiramate, so non-pharmacologic strategies (CBT, lifestyle, biobehavioral therapy) should be optimized first', isCorrect: true, rationale: 'The CHAMP trial (NEJM 2017) demonstrated that placebo, amitriptyline, and topiramate produced statistically indistinguishable reductions in pediatric migraine frequency, with adverse events more common in the active arms. Current practice prioritizes lifestyle counseling, CBT/biobehavioral therapy, and adequate acute treatment before resorting to daily prophylaxis.' },
      { text: 'Topiramate is the universally agreed first-line prophylactic agent and should be started immediately', isCorrect: false, rationale: 'Topiramate has FDA approval for migraine prevention in adolescents and may have a role in selected patients, but CHAMP showed it was not superior to placebo in children, and side effects (cognitive slowing, paresthesias, weight loss) frequently limit use.' },
      { text: 'Daily ibuprofen prophylaxis is preferred to neuromodulators', isCorrect: false, rationale: 'Daily NSAID use risks medication-overuse headache, gastritis, and renal toxicity; it is not appropriate as prophylactic therapy.' },
      { text: 'Onabotulinumtoxin-A injections are FDA-approved as first-line in children', isCorrect: false, rationale: 'OnabotulinumtoxinA is FDA-approved for chronic migraine in adults but not in children under 18; pediatric data are limited.' },
    ],
  },
  {
    type: 'application',
    labels: { dim1Category: 'vascular', dim2Category: 'treatment', population: 'peds', section: 'stroke' },
    difficulty: 'medium',
    clerkshipAppropriate: true,
    learningObjective: 'Select acute and preventive treatment for stroke in sickle cell disease.',
    blueprintTopic: 'Vascular Neurology',
    vignette: 'An 8-year-old girl with hemoglobin SS disease presents within 90 minutes of acute right hemiparesis and aphasia. MRI confirms an acute left middle cerebral artery territory infarct. Her hemoglobin S percentage is 78%.',
    leadIn: 'Which of the following is the most appropriate acute treatment?',
    options: [
      { text: 'Emergent exchange transfusion to reduce hemoglobin S to under 30%', isCorrect: true, rationale: 'Acute ischemic stroke in sickle cell disease is treated with emergent exchange transfusion to lower hemoglobin S to under 30% (some recommend under 20%) and total hemoglobin to about 10 g/dL. Chronic transfusion therapy is then continued for secondary prevention. Hydroxyurea and bone marrow transplantation are also disease-modifying.' },
      { text: 'Intravenous tissue plasminogen activator (alteplase)', isCorrect: false, rationale: 'IV thrombolysis has not been studied prospectively in pediatric stroke and is generally not recommended in children with sickle cell disease, where the underlying mechanism is large-artery vasculopathy rather than thromboembolism.' },
      { text: 'Aspirin monotherapy without transfusion', isCorrect: false, rationale: 'Antiplatelet therapy alone is inadequate; the priority is to reduce hemoglobin S burden urgently to limit further infarction.' },
      { text: 'Heparin infusion targeting full anticoagulation', isCorrect: false, rationale: 'Anticoagulation is not standard for arterial ischemic stroke in sickle cell disease and increases hemorrhagic risk.' },
    ],
  },
  {
    type: 'recall',
    labels: { dim1Category: 'movement', dim2Category: 'treatment', population: 'peds', section: 'movement-disorders' },
    difficulty: 'easy',
    clerkshipAppropriate: true,
    learningObjective: 'Identify standard treatment for Sydenham chorea.',
    blueprintTopic: 'Movement Disorders',
    vignette: null,
    leadIn: 'A 9-year-old with confirmed Sydenham chorea following streptococcal pharyngitis is being treated. In addition to symptomatic management of the involuntary movements, which of the following is most important to initiate?',
    options: [
      { text: 'Lifelong (or extended) prophylactic penicillin to prevent rheumatic fever recurrence', isCorrect: true, rationale: 'Sydenham chorea is a major manifestation of acute rheumatic fever. Long-term secondary prophylaxis with penicillin is recommended to prevent recurrent streptococcal infection and progression of rheumatic heart disease, with duration determined by carditis status (often through age 21 or longer if carditis is present).' },
      { text: 'Lifelong oral haloperidol', isCorrect: false, rationale: 'Symptomatic treatment of chorea (when needed) is typically with valproate or low-dose dopamine antagonists, but most patients improve spontaneously over weeks to months and do not require chronic therapy.' },
      { text: 'Daily aspirin for life', isCorrect: false, rationale: 'Aspirin is used for arthritis or carditis in acute rheumatic fever but not as long-term therapy specifically for chorea.' },
      { text: 'IVIG monthly for one year', isCorrect: false, rationale: 'IVIG, plasmapheresis, and corticosteroids have been used in severe or refractory cases but are not standard initial therapy.' },
    ],
  },

  // ─── MOVEMENT DISORDERS (8) ───────────────────────────────────────────
  {
    type: 'application',
    labels: { dim1Category: 'movement', dim2Category: 'clinical-aspects', population: 'peds', section: 'movement-disorders' },
    difficulty: 'medium',
    clerkshipAppropriate: false,
    learningObjective: 'Diagnose dopa-responsive dystonia (Segawa syndrome) and identify its definitive treatment.',
    blueprintTopic: 'Movement Disorders',
    vignette: 'A 7-year-old girl is referred for progressive abnormal gait. Her parents note that she walks normally in the morning but develops a "stiff" foot posture and toe-walking by late afternoon. Examination at 5 PM shows lower-limb dystonia, brisk reflexes, and equinovarus posturing of the right foot.',
    leadIn: 'Which of the following is the most appropriate diagnostic and therapeutic step?',
    options: [
      { text: 'A trial of low-dose levodopa-carbidopa', isCorrect: true, rationale: 'Diurnal variation (worsening through the day, improvement with sleep) in childhood-onset dystonia is the hallmark of dopa-responsive dystonia (Segawa syndrome), most often due to GCH1 (GTP cyclohydrolase 1) mutations. A small dose of levodopa produces dramatic and sustained improvement and is both diagnostic and definitive treatment. Failing to consider DRD risks misdiagnosis as cerebral palsy.' },
      { text: 'Initiate baclofen and refer for selective dorsal rhizotomy', isCorrect: false, rationale: 'These are management options for spasticity in cerebral palsy, but DRD is exquisitely responsive to levodopa, which should always be tried first.' },
      { text: 'Begin chronic high-dose benzodiazepine therapy', isCorrect: false, rationale: 'Benzodiazepines are not first-line in childhood dystonia and do not address the underlying dopaminergic deficit in DRD.' },
      { text: 'Order serum ceruloplasmin and 24-hour urinary copper', isCorrect: false, rationale: 'Wilson disease is reasonable to consider in childhood movement disorders but typically presents in adolescence with mixed extrapyramidal-psychiatric features and Kayser-Fleischer rings, not isolated diurnal lower-limb dystonia.' },
    ],
  },
  {
    type: 'application',
    labels: { dim1Category: 'movement', dim2Category: 'clinical-aspects', population: 'peds', section: 'movement-disorders' },
    difficulty: 'hard',
    clerkshipAppropriate: false,
    learningObjective: 'Recognize the clinical features of Niemann-Pick disease type C.',
    blueprintTopic: 'Movement Disorders',
    vignette: 'An 11-year-old boy presents with a 2-year history of progressive clumsiness, dysarthria, learning difficulties, and recent cataplexy-like episodes triggered by laughter. Examination reveals vertical supranuclear gaze palsy (with preserved oculocephalic reflexes), mild dystonia, ataxia, and splenomegaly.',
    leadIn: 'Which of the following is the most likely diagnosis?',
    options: [
      { text: 'Niemann-Pick disease type C', isCorrect: true, rationale: 'The combination of vertical supranuclear gaze palsy (especially downgaze), gelastic cataplexy, splenomegaly, ataxia, dystonia, and progressive cognitive decline in a school-aged child is highly characteristic of Niemann-Pick disease type C, due to NPC1 or NPC2 mutations causing impaired intracellular cholesterol trafficking. Miglustat is approved for the neurologic manifestations.' },
      { text: 'Wilson disease', isCorrect: false, rationale: 'Wilson disease may present with movement disorders and psychiatric symptoms but does not typically cause vertical supranuclear gaze palsy or cataplexy, and characteristically features Kayser-Fleischer rings and hepatic involvement.' },
      { text: 'Juvenile Huntington disease', isCorrect: false, rationale: 'Juvenile Huntington (Westphal variant) presents with rigidity, dystonia, and seizures rather than chorea, but does not feature vertical supranuclear gaze palsy or splenomegaly.' },
      { text: 'Adrenoleukodystrophy', isCorrect: false, rationale: 'X-ALD presents in school-aged boys with behavioral/cognitive decline, hyperpigmentation, and adrenal insufficiency, with white-matter changes on MRI rather than vertical supranuclear gaze palsy and splenomegaly.' },
    ],
  },
  {
    type: 'recall',
    labels: { dim1Category: 'movement', dim2Category: 'clinical-aspects', population: 'peds', section: 'movement-disorders' },
    difficulty: 'medium',
    clerkshipAppropriate: false,
    learningObjective: 'Differentiate stereotypies from tics by clinical features.',
    blueprintTopic: 'Movement Disorders',
    vignette: null,
    leadIn: 'Which of the following clinical features most reliably distinguishes complex motor stereotypies from motor tics in children?',
    options: [
      { text: 'Stereotypies are rhythmic, prolonged, fixed in pattern, and non-suppressible by distraction; tics are brief, variable, and suppressible with effort', isCorrect: true, rationale: 'Stereotypies (e.g., complex hand-flapping during excitement) are rhythmic, repetitive, prolonged, fixed in pattern, often start before age 3, are typically triggered by excitement or concentration, and are not preceded by an urge or suppressible. Tics are brief, jerky, variable, often migrate, are preceded by a premonitory urge, and are at least partially suppressible.' },
      { text: 'Stereotypies always involve vocalizations; tics never do', isCorrect: false, rationale: 'Vocalizations are characteristic of tics (Tourette syndrome). Stereotypies are typically purely motor.' },
      { text: 'Stereotypies always indicate autism spectrum disorder; tics never do', isCorrect: false, rationale: 'Complex motor stereotypies occur in many typically developing children without autism (primary stereotypies). They are common in autism but are not pathognomonic.' },
      { text: 'Tics typically begin in infancy; stereotypies typically begin in adolescence', isCorrect: false, rationale: 'The opposite is true: stereotypies typically begin before age 3, whereas tics typically begin between ages 4 and 8.' },
    ],
  },
  {
    type: 'application',
    labels: { dim1Category: 'movement', dim2Category: 'clinical-aspects', population: 'peds', section: 'movement-disorders' },
    difficulty: 'hard',
    clerkshipAppropriate: false,
    learningObjective: 'Recognize PANDAS and its proposed clinical criteria.',
    blueprintTopic: 'Movement Disorders',
    vignette: 'A 9-year-old previously well boy develops abrupt-onset severe obsessive-compulsive symptoms and motor tics within one week of a confirmed group A streptococcal pharyngitis. His symptoms wax and wane, with each exacerbation temporally linked to documented streptococcal infections.',
    leadIn: 'This presentation is most consistent with which of the following diagnoses?',
    options: [
      { text: 'PANDAS (Pediatric Autoimmune Neuropsychiatric Disorders Associated with Streptococcal infections)', isCorrect: true, rationale: 'PANDAS criteria include prepubertal onset, abrupt-onset OCD or tic disorder, episodic course with relapses temporally linked to group A streptococcal infections, and associated neurologic abnormalities (choreiform movements, motor hyperactivity). PANS is a broader umbrella that does not require streptococcal trigger. Treatment typically combines management of OCD/tics, antimicrobials for active infection, and in some cases immunomodulation.' },
      { text: 'Sydenham chorea', isCorrect: false, rationale: 'Sydenham chorea presents with chorea and emotional lability rather than abrupt-onset OCD as the dominant feature, although the conditions overlap conceptually.' },
      { text: 'Tourette syndrome', isCorrect: false, rationale: 'Tourette syndrome is characterized by waxing-and-waning tics over more than a year without an abrupt-onset, infection-linked relapsing course or prominent OCD.' },
      { text: 'Conversion disorder', isCorrect: false, rationale: 'Conversion (functional) disorders may include movements but lack the streptococcal temporal linkage and waxing-waning relapsing course.' },
    ],
  },
  {
    type: 'application',
    labels: { dim1Category: 'movement', dim2Category: 'clinical-aspects', population: 'peds', section: 'movement-disorders' },
    difficulty: 'hard',
    clerkshipAppropriate: false,
    learningObjective: 'Recognize ATP1A3-related rapid-onset dystonia-parkinsonism and alternating hemiplegia of childhood.',
    blueprintTopic: 'Movement Disorders',
    vignette: 'A 6-month-old infant has stereotyped episodes of unilateral hemiplegia lasting hours to days, alternating between sides, occasionally bilateral, with abnormal eye movements and dystonic posturing. Episodes begin and end abruptly, do not correlate with EEG seizure activity, and resolve with sleep. Genetic testing reveals a heterozygous de novo ATP1A3 variant.',
    leadIn: 'Which of the following is the most likely diagnosis?',
    options: [
      { text: 'Alternating hemiplegia of childhood', isCorrect: true, rationale: 'Alternating hemiplegia of childhood is caused by ATP1A3 mutations and presents before 18 months with recurrent episodes of hemiplegia (alternating sides), abnormal ocular movements, dystonia, and developmental delay. Episodes resolve with sleep. Flunarizine reduces severity in some patients. Other ATP1A3-related disorders include rapid-onset dystonia-parkinsonism and CAPOS syndrome.' },
      { text: 'Familial hemiplegic migraine type 1 (CACNA1A)', isCorrect: false, rationale: 'Familial hemiplegic migraine produces hemiplegia in association with migraine headache, typically beginning in adolescence or adulthood, not infantile-onset alternating hemiplegia.' },
      { text: 'Focal epilepsy with secondary generalization', isCorrect: false, rationale: 'Focal epilepsy would be accompanied by ictal EEG correlates and would not selectively alternate sides over hours to days.' },
      { text: 'Sandifer syndrome', isCorrect: false, rationale: 'Sandifer syndrome features tonic posturing in association with feeding due to GERD, not multi-day hemiplegia.' },
    ],
  },
  {
    type: 'application',
    labels: { dim1Category: 'movement', dim2Category: 'treatment', population: 'peds', section: 'movement-disorders' },
    difficulty: 'medium',
    clerkshipAppropriate: false,
    learningObjective: 'Recognize tardive dyskinesia from chronic dopamine receptor antagonism.',
    blueprintTopic: 'Movement Disorders',
    vignette: 'A 17-year-old has been on risperidone for 3 years for irritability associated with autism. Over the past 6 months, the family has noticed persistent involuntary chewing and lip-smacking movements as well as choreiform finger movements. The movements are present at rest and persist when the patient is distracted.',
    leadIn: 'Which of the following is the most appropriate next step?',
    options: [
      { text: 'Gradual taper of risperidone with consideration of a VMAT2 inhibitor (valbenazine or deutetrabenazine) if symptoms persist', isCorrect: true, rationale: 'The clinical picture is tardive dyskinesia from chronic dopamine receptor blockade. Management is to attempt cautious withdrawal of the offending agent (paradoxically, abrupt withdrawal can transiently worsen the movements) and to consider VMAT2 inhibitors such as valbenazine or deutetrabenazine, which are FDA-approved for tardive dyskinesia.' },
      { text: 'Increase the risperidone dose to suppress the movements', isCorrect: false, rationale: 'Higher doses of dopamine antagonists may transiently mask tardive dyskinesia but worsen the underlying problem and accelerate progression.' },
      { text: 'Initiate intravenous diphenhydramine', isCorrect: false, rationale: 'IV diphenhydramine is treatment for acute dystonic reactions to dopamine antagonists, not for chronic tardive dyskinesia.' },
      { text: 'Begin levodopa', isCorrect: false, rationale: 'Levodopa would worsen tardive dyskinesia by adding to the dopaminergic mismatch; it is not appropriate.' },
    ],
  },
  {
    type: 'application',
    labels: { dim1Category: 'movement', dim2Category: 'clinical-aspects', population: 'peds', section: 'movement-disorders' },
    difficulty: 'medium',
    clerkshipAppropriate: true,
    learningObjective: 'Identify iron deficiency as a treatable contributor to pediatric restless legs syndrome.',
    blueprintTopic: 'Movement Disorders',
    vignette: 'A 10-year-old with chronic insomnia describes uncomfortable "creepy-crawly" sensations in his legs that worsen at bedtime, are relieved by walking, and prevent him from falling asleep. Family history is significant for similar symptoms in his mother. Serum ferritin is 18 ng/mL.',
    leadIn: 'Which of the following is the most appropriate initial treatment?',
    options: [
      { text: 'Oral iron supplementation', isCorrect: true, rationale: 'In children and adolescents with restless legs syndrome and serum ferritin under 50 ng/mL, oral iron supplementation often produces substantial symptom improvement. Dopaminergic agents are generally avoided in pediatric RLS as first-line because of the risk of augmentation; gabapentinoids are used in selected refractory cases.' },
      { text: 'Pramipexole as first-line monotherapy', isCorrect: false, rationale: 'Dopamine agonists are second- or third-line in pediatric RLS due to augmentation risk and limited safety data in children.' },
      { text: 'Daily melatonin alone', isCorrect: false, rationale: 'Melatonin can shorten sleep latency but does not address the underlying dopamine-iron pathophysiology of RLS.' },
      { text: 'Reassurance and sleep hygiene only', isCorrect: false, rationale: 'Sleep hygiene alone is insufficient when an identified, treatable cause (low iron) is present.' },
    ],
  },
  {
    type: 'recall',
    labels: { dim1Category: 'movement', dim2Category: 'clinical-aspects', population: 'peds', section: 'movement-disorders' },
    difficulty: 'medium',
    clerkshipAppropriate: false,
    learningObjective: 'Differentiate chorea from athetosis, dystonia, and myoclonus by clinical features.',
    blueprintTopic: 'Movement Disorders',
    vignette: null,
    leadIn: 'Which of the following statements most accurately describes chorea?',
    options: [
      { text: 'Sustained co-contraction of agonist and antagonist muscles producing patterned twisting postures', isCorrect: false, rationale: 'This describes dystonia, which is sustained, often patterned, and may build up over time.' },
      { text: 'Brief, sudden, shock-like contractions that are typically focal or generalized', isCorrect: false, rationale: 'This describes myoclonus.' },
      { text: 'Brief, irregular, non-stereotyped movements that flow from one body part to another and cannot be predicted', isCorrect: true, rationale: 'Chorea is brief, irregular, non-stereotyped, and unpredictable, typically involving the limbs and face. Patients often appear restless and may incorporate the movements into purposeful motion (parakinesia). Athetosis describes slower, writhing distal movements and is often considered part of the chorea-athetosis spectrum.' },
      { text: 'Coarse rhythmic oscillations of an extremity, present at rest and improved with movement', isCorrect: false, rationale: 'This describes a resting tremor, classically seen in Parkinson disease.' },
    ],
  },

  // ─── VASCULAR (2) ─────────────────────────────────────────────────────
  {
    type: 'application',
    labels: { dim1Category: 'vascular', dim2Category: 'clinical-aspects', population: 'peds', section: 'stroke' },
    difficulty: 'medium',
    clerkshipAppropriate: false,
    learningObjective: 'Recognize focal cerebral arteriopathy as a leading cause of pediatric arterial ischemic stroke.',
    blueprintTopic: 'Vascular Neurology',
    vignette: 'A previously healthy 5-year-old presents with acute right hemiparesis. He had primary varicella infection 4 months earlier. MRI shows an acute infarct in the left basal ganglia and MRA demonstrates focal stenosis and irregularity of the supraclinoid left internal carotid artery and proximal middle cerebral artery, without involvement of more distal vessels or the contralateral side.',
    leadIn: 'Which of the following is the most likely underlying cause?',
    options: [
      { text: 'Focal cerebral arteriopathy of childhood (post-varicella arteriopathy)', isCorrect: true, rationale: 'Focal cerebral arteriopathy of childhood is the single most common cause of arterial ischemic stroke in previously healthy school-aged children. It is unilateral, typically affects the supraclinoid ICA and proximal MCA/ACA, and is often post-infectious (classically following varicella by weeks to months). Most cases are monophasic, and short-course corticosteroids plus antiplatelet therapy are commonly used.' },
      { text: 'Moyamoya disease', isCorrect: false, rationale: 'Moyamoya disease is bilateral and progressive, with characteristic "puff of smoke" collateral vasculature on angiography. The unilateral, monophasic post-varicella pattern here is more consistent with FCA.' },
      { text: 'Cardiac embolism from a patent foramen ovale', isCorrect: false, rationale: 'Cardiac embolism produces small, often multiple cortical infarcts in different vascular territories, not focal arteriopathy on imaging.' },
      { text: 'Cervical arterial dissection', isCorrect: false, rationale: 'Dissection typically follows trauma or neck manipulation and on imaging shows long-segment irregularity, intramural hematoma, or a flame-shaped occlusion of the cervical (not intracranial) carotid or vertebral artery.' },
    ],
  },
  {
    type: 'application',
    labels: { dim1Category: 'vascular', dim2Category: 'clinical-aspects', population: 'peds', section: 'stroke' },
    difficulty: 'medium',
    clerkshipAppropriate: true,
    learningObjective: 'Recognize the typical presentation of perinatal arterial ischemic stroke.',
    blueprintTopic: 'Vascular Neurology',
    vignette: 'A term newborn delivered after an uncomplicated pregnancy develops focal clonic seizures of the right arm and face on day of life 2. The infant is otherwise alert and feeding well between events. Brain MRI on day 3 demonstrates restricted diffusion in the left middle cerebral artery territory.',
    leadIn: 'Which of the following best characterizes this presentation?',
    options: [
      { text: 'Perinatal arterial ischemic stroke, most often presenting with focal seizures in the first days of life', isCorrect: true, rationale: 'Perinatal arterial ischemic stroke (PAIS) most often presents in term newborns within the first 72 hours of life with focal seizures, typically in the left MCA territory. Risk factors include cardiac disease, hypercoagulable states, infection, and chorioamnionitis. Acute treatment is supportive; anticoagulation is generally not indicated for PAIS.' },
      { text: 'Hypoxic-ischemic encephalopathy', isCorrect: false, rationale: 'HIE produces global encephalopathy with seizures and hypotonia and a watershed/deep-grey injury pattern, not a single arterial territory infarct in an otherwise well infant.' },
      { text: 'Neonatal sinus venous thrombosis', isCorrect: false, rationale: 'Neonatal CSVT typically produces multifocal venous infarcts (often hemorrhagic) along venous drainage rather than a discrete arterial-territory infarct on MRI.' },
      { text: 'Benign familial neonatal seizures', isCorrect: false, rationale: 'Benign familial neonatal seizures present with brief, multifocal clonic seizures in the setting of normal imaging and a positive family history, not with an MCA territory infarct on MRI.' },
    ],
  },
];

// ---------- assemble & merge -----------------------------------------------

const existing = JSON.parse(readFileSync(TARGET, 'utf8'));
const existingIds = new Map(existing.map((q) => [q.id, true]));

let added = 0;
let skipped = 0;
const additions = [];

for (const r of RAW) {
  let baseId = 'q-' + slug(r.learningObjective);
  let id = baseId;
  let suffix = 2;
  while (existingIds.has(id)) {
    id = `${baseId}-${suffix++}`;
  }
  if (existingIds.has(id)) {
    skipped++;
    continue;
  }
  existingIds.set(id, true);
  additions.push({
    id,
    bank: 'board-review',
    type: r.type,
    labels: r.labels,
    difficulty: r.difficulty,
    clerkshipAppropriate: r.clerkshipAppropriate,
    dateAdded: DATE,
    sources: [],
    learningObjective: r.learningObjective,
    blueprintTopic: r.blueprintTopic,
    vignette: r.vignette ?? null,
    leadIn: r.leadIn,
    options: r.options,
  });
  added++;
}

const out = existing.concat(additions);
writeFileSync(TARGET, JSON.stringify(out, null, 2) + '\n', 'utf8');

console.log(`Added ${added} new questions; skipped ${skipped} (id collision).`);
console.log(`Total bank: ${out.length} questions.`);

const by = (k) => out.reduce((m, r) => ((m[k(r)] = (m[k(r)] || 0) + 1), m), {});
console.log('\nDim 1 distribution:');
console.log(JSON.stringify(by((r) => r.labels.dim1Category), null, 2));
console.log('\nDim 2 distribution:');
console.log(JSON.stringify(by((r) => r.labels.dim2Category), null, 2));
