/* SUDEP Risk Assessment — pure logic.
   Pediatric multiplicative model calibrated to Tomson 2025 (Neurology, PMID
   39908470); syndrome baselines from Donnan 2023 (PMID 36750385), Cooper 2016
   (PMID 27810515), Donner 2018, AAN/AES 2017; multipliers from Sveinsson 2020
   (PMID 31831600), Hesdorffer 2011, MORTEMUS (Ryvlin 2013), Langan 2005.
   SUDEP-7 v2.0 (Novak/DeGiorgio 2015) and SUDEP-3 (Nei 2024) scores.
   Values copied verbatim from the reviewed draft. */

export type Syndrome =
  | 'selflimited' | 'newonset' | 'controlled' | 'gefs_mild' | 'focal_dre'
  | 'gen_dre' | 'other_dee' | 'severe_dee' | 'lgs' | 'dravet';
export type GeneticEtiology =
  | 'none' | 'scn1a' | 'scn2a' | 'scn8a' | 'stxbp1'
  | 'kcnq1_h2' | 'scn5a' | 'scn1b' | 'depdc5' | 'dup15q'
  | 'kcnt1' | 'other_chan' | 'other_ge';
export type GtcFrequency = 'never' | 'none_pastyear' | 'rare' | 'frequent' | 'very_frequent';
export type Supervision = 'shared' | 'partial' | 'alone';
export type Adherence = 'good' | 'poor';
export type Duration = 'short' | 'medium' | 'long';

export type PedSUDEPInputs = {
  syndrome: Syndrome;
  geneticEtiology: GeneticEtiology;
  gtcFrequency: GtcFrequency;
  nocturnal: boolean;
  supervision: Supervision;
  adherence: Adherence;
  duration: Duration;
};

export type SyndromeBaseline = { rate: number; label: string; description: string; source: string; floor?: number };
export type GeneticModifier = { mult: number; note: string; cardiacFlag?: boolean; floorRate?: number };
export type Multiplier = { mult: number; note: string };
export type LabeledMultiplier = { mult: number; label: string; note: string };
export type DisplayLevel = 'measurable' | 'detection_limit' | 'lowest_plausible' | 'ceiling';

export type PedSUDEPResult = {
  syndrome: SyndromeBaseline;
  genetic: GeneticModifier;
  geneticApplied: boolean;
  effectiveGeneMult: number;
  geneticFloorApplied: boolean;
  geneticFloorBinding: boolean;
  syndromeFloorApplied: boolean;
  gtc: LabeledMultiplier;
  nocturnal: Multiplier;
  supervision: Multiplier;
  adherence: Multiplier;
  duration: Multiplier;
  rawRate: number;
  displayRate: number;
  displayString: string;
  displayLevel: DisplayLevel;
  annualPrefix: string;
  belowDetection: boolean;
  ceilinged: boolean;
  tier: string;
  annualPercent: number;
  tenYearPercent: number;
  relativeToControlled: number;
  cardiacFlag: boolean;
};

export type SUDEP7Inputs = {
  gtcMore3: boolean; gtc1plus: boolean; anySzPastYear: boolean; sz50plus: boolean;
  dur30plus: boolean; asm3plus: boolean; idDD: boolean;
};
export type SUDEP7Result = { total: number; max: number; quartile: string; interpretation: string };

export type SUDEP3Inputs = { gtcsPastYear: boolean; anySzPastYear: boolean; idDD: boolean };
export type SUDEP3Result = { score: number; max: number; stratum: string; oddsInterp: string };

// ============================================================================
// PEDIATRIC RISK CONTEXT — calibrated multiplicative model
// ============================================================================

const SYNDROME_BASELINES: Record<Syndrome, SyndromeBaseline> = {
  selflimited: {
    rate: 0.10,
    label: 'Self-limited epilepsy syndrome',
    description: 'SeLECTS, CAE, JAE, Panayiotopoulos, etc. Excellent prognosis. SUDEP is rare but not zero — cases have been documented in SeLECTS (Verducci 2020 NA SUDEP Registry). With all favorable factors, raw computation falls below the literature\'s ability to resolve, displayed as ≤0.05 or <0.01 per 1000py.',
    source: 'Tomson 2025; NA SUDEP Registry'
  },
  newonset: {
    rate: 0.20,
    label: 'New-onset / single seizure',
    description: 'Uncomplicated, single unprovoked seizure or early in epilepsy course. Berg 2013 4-cohort study: 0.09/1000py for uncomplicated childhood epilepsy.',
    source: 'Berg 2013 Pediatrics'
  },
  controlled: {
    rate: 0.40,
    label: 'Controlled epilepsy (general pediatric)',
    description: 'General pediatric epilepsy mixed cohorts. AAN/AES 2017 averaged 0.22/1000py; modern capture-recapture data (Donner 2018) found 1.11/1000py — the AAN figure may underestimate. Baseline calibrated to give ~0.2/1000py with typical "controlled" features (rare GTC, supervised, adherent).',
    source: 'AAN/AES 2017; Donner 2018'
  },
  gefs_mild: {
    rate: 0.15,
    label: 'GEFS+ / mild genetic epilepsy (normal intelligence)',
    description: 'Genetic epilepsy with febrile seizures plus and related mild SCN1A-spectrum phenotypes with normal cognition. SUDEP is documented but rare and far below Dravet (GeneReviews "SCN1A Seizure Disorders"; systematic review PMC8739186). This baseline reflects a mild recurrent epilepsy where the gene is unknown or non-SCN1A; selecting SCN1A raises it via the SCN1A risk floor.',
    source: 'GeneReviews SCN1A; Frontiers 2021 (PMC8739186)'
  },
  focal_dre: {
    rate: 1.20,
    label: 'Drug-resistant focal epilepsy',
    description: 'Pediatric DRE. Donner 2018 and Keller 2018 capture-recapture rates ~1.1–1.5/1000py in childhood DRE cohorts.',
    source: 'Donner 2018, Keller 2018 Neurology'
  },
  gen_dre: {
    rate: 1.20,
    label: 'Drug-resistant generalized epilepsy',
    description: 'Generalized DRE in pediatric population. Slightly higher GTCS burden than focal DRE; the multiplier model captures this through GTCS frequency.',
    source: 'Donner 2018, Keller 2018'
  },
  other_dee: {
    rate: 0.80,
    label: 'Other genetic DEE (non-Dravet, non-LGS)',
    description: 'Mixed genetic DEEs overall (Donnan 2023). In that study, SUDEP occurred only in SCN1A, SCN2A, SCN8A, and STXBP1 — not in SYNGAP1, NEXMIF, PCDH19, CHD2, GRIN2A, KCNT1, KCNQ2, or Angelman. Apply gene-specific modifier if known.',
    source: 'Donnan 2023 Neurology'
  },
  severe_dee: {
    rate: 1.90,
    label: 'Severe early-infantile / non-Dravet DEE (e.g., non-Dravet SCN1A-type)',
    description: 'Severe non-Dravet developmental and epileptic encephalopathy — e.g., the gain-of-function early-infantile SCN1A entity (neonatal onset, arthrogryposis, hyperkinetic movement disorder, profound impairment; Sadleir/Berecki, Brain 2022). Placed marginally above Dravet: Donnan 2023 found a higher SUDEP PROPORTION in non-Dravet SCN1A DEE (3/15, 20%) than Dravet (12/203, 5.9%), but this is a small-sample proportion, not an incidence rate, and the authors caution against over-interpretation. The +0.10 over Dravet encodes that prior conservatively.',
    source: 'Donnan 2023 (PMID 36750385); Sadleir/Berecki Brain 2022',
    floor: 2.5
  },
  lgs: {
    rate: 1.20,
    label: 'Lennox-Gastaut syndrome',
    description: 'High mortality syndrome. Sullivan 2024 systematic review: total mortality 6.12/1000py; SUDEP-specific rate is lower (much of the mortality is status epilepticus, aspiration pneumonia, injuries). Calibrated for SUDEP specifically; typical LGS patient with frequent GTCS comes out higher.',
    source: 'Sullivan 2024 Epilepsia'
  },
  dravet: {
    rate: 1.80,
    label: 'Dravet syndrome (SCN1A or clinical)',
    description: 'Highest documented syndrome-specific SUDEP rate. Cooper 2016 reported 9.3/1000py (95% CI 4.5–19.5); Donnan 2023 refined to 4.4/1000py with broader phenotypic spectrum (95% CI 2.3–7.8). Baseline calibrated so that typical Dravet (frequent nocturnal GTCS, supervised) produces ~4–5/1000py. 79% of Dravet SUDEP occurs before age 18.',
    source: 'Cooper 2016, Donnan 2023',
    floor: 2.3
  }
};

// DEE phenotypes whose baseline ALREADY encodes a floor-type channelopathy's
// severity. A floor-type gene (SCN1A) does not additionally multiply these,
// avoiding double-counting: if the SCN1A is presenting as Dravet/severe DEE,
// that is captured by selecting the phenotype, not by a generic gene multiplier.
const DEE_PHENOTYPES = new Set<Syndrome>(['dravet', 'severe_dee', 'lgs', 'other_dee']);

// Gene-specific modifiers. Most genes apply as a multiplier on the syndrome
// baseline. Floor-type genes (floorRate != null) ALSO set a minimum on the FINAL
// computed rate — joining the same final-rate floor logic as the high-mortality
// syndrome floors (see calcPedSUDEP below) — so favorable modifiers cannot drag
// a known-pathogenic gene's estimate implausibly low. A floor-type gene's
// multiplier is suppressed on DEE_PHENOTYPES (the phenotype already encodes it).
const GENETIC_MODIFIERS: Record<GeneticEtiology, GeneticModifier> = {
  none: { mult: 1.0, note: '' },
  scn1a: {
    mult: 1.3,
    floorRate: 0.5,
    note: 'SCN1A spans the full severity spectrum (febrile seizures -> GEFS+ -> Dravet -> severe DEE; GeneReviews) and is never benign. On NON-DEE phenotypes (GEFS+, focal/generalized DRE, etc.) it applies a 1.3× channelopathy multiplier — a pathogenic SCN1A variant raises SUDEP risk over the same phenotype without it — calibrated to stay below the Dravet phenotype (1.20×1.3 < 1.80), preserving the severity ordering. It ALSO sets a 0.5/1000py floor on the FINAL estimate, so a mild SCN1A phenotype with favorable modifiers still reads ≥0.5 rather than slipping toward zero. On DEE phenotypes (Dravet, severe non-Dravet DEE, LGS) the multiplier is suppressed — that severity is already in the phenotype baseline, so apply the gene by choosing the phenotype, not by double-counting. As with the syndrome floor, genuine seizure-freedom (no GTCS ever, or none in the past year) — the dominant protective factor — overrides the floor.',
    cardiacFlag: false
  },
  scn2a: {
    mult: 2.5,
    note: 'SCN2A DEE — SUDEP confirmed as a risk in Donnan 2023 (1/15 patients). SCN2A also has cardiac sodium channel expression with reported arrhythmia overlap.',
    cardiacFlag: false
  },
  scn8a: {
    mult: 3.0,
    note: 'SCN8A-DEE — SUDEP confirmed as a risk in Donnan 2023 (2/22 patients = 9%). The original SCN8A epilepsy proband (Veeramah 2012) died of SUDEP.',
    cardiacFlag: false
  },
  stxbp1: {
    mult: 2.5,
    note: 'STXBP1 encephalopathy — SUDEP confirmed risk per Donnan 2023 (1/17 patients). One of only 4 DEE genes with SUDEP in that cohort.',
    cardiacFlag: false
  },
  kcnq1_h2: {
    mult: 4.0,
    note: 'KCNQ1 or KCNH2 — primary long QT syndrome genes with epilepsy as a recognized phenotype. Auerbach 2013, Anderson 2014: ~30% of LQTS patients have a seizure history. SCD risk is partly cardiac in origin.',
    cardiacFlag: true
  },
  scn5a: {
    mult: 3.5,
    note: 'SCN5A — Brugada and LQT3 syndrome gene with epilepsy overlap. Bagnall 2016: pathogenic SCN5A variants in postmortem SUDEP cohorts.',
    cardiacFlag: true
  },
  scn1b: {
    mult: 2.5,
    note: 'SCN1B — beta-1 subunit of sodium channel, GEFS+ spectrum, also Brugada/LQT overlap. Pathogenic variants identified in SUDEP postmortem studies.',
    cardiacFlag: true
  },
  depdc5: {
    mult: 2.5,
    note: 'DEPDC5 (mTOR pathway, familial focal epilepsy) — Nascimento 2015 reported two definite SUDEP cases within a single family; familial clustering pattern.',
    cardiacFlag: false
  },
  dup15q: {
    mult: 3.5,
    note: 'Dup15q (15q11.2-q13.1 maternal duplication) — Friedman 2016 case series suggested SUDEP rate possibly approaching Dravet. Among highest non-Dravet rates documented.',
    cardiacFlag: false
  },
  kcnt1: {
    mult: 2.0,
    note: 'KCNT1 (EIMFS, ADNFLE phenotypes) — Kuchenbuch 2019 reported 17% SUDEP in KCNT1-EIMFS cohort; Donnan 2023 found none in their smaller sample.',
    cardiacFlag: false
  },
  other_chan: {
    mult: 1.5,
    note: 'Other channelopathy (KCNB1, GABRB3, CACNA1A, etc.) — variable evidence; channelopathies broadly carry elevated SUDEP signal per postmortem genetic studies.',
    cardiacFlag: false
  },
  other_ge: {
    mult: 1.2,
    note: 'Other genetic etiology not classified as channelopathy or established SUDEP gene. Modest baseline adjustment for unmeasured genetic predisposition.',
    cardiacFlag: false
  }
};

// Clinical risk factor multipliers, with explicit OR sources
const GTC_MULTIPLIERS: Record<GtcFrequency, LabeledMultiplier> = {
  never: {
    mult: 0.15,
    label: 'No GTCS ever',
    note: 'Sveinsson 2020: OR 1.15 (95% CI 0.54–2.4, NS) for exclusively non-GTCS seizures vs no GTCS — essentially no excess SUDEP risk without GTCS. The 0.15× factor still preserves a non-zero baseline because: (a) GTCS can emerge later, (b) SUDEP has been reported without antecedent GTCS (Lhatoo 2016).'
  },
  none_pastyear: {
    mult: 0.3,
    label: 'No GTCS in past year',
    note: 'Tomson 2025: SUDEP incidence 8/100,000py without TCS in preceding year vs 287/100,000py with TCS — ~36× lower. Recent GTCS-free interval is highly protective.'
  },
  rare: {
    mult: 1.0,
    label: '1–2 GTCS per year (rare)',
    note: 'Reference category. Hesdorffer 2011 found graded dose-response above this baseline.'
  },
  frequent: {
    mult: 2.5,
    label: '≥3 GTCS per year (frequent)',
    note: 'Walczak 2001: OR 8.1 for >3 GTCS/yr vs 0; Hesdorffer 2011 pooled OR 5.1 for ≥3 vs <3. Frequency is dose-dependent.'
  },
  very_frequent: {
    mult: 5.0,
    label: 'Weekly+ GTCS / >50 seizures per month',
    note: 'Walczak 2001: OR 11.5 for >50 seizures/month. Very high seizure burden is the dominant SUDEP risk in cohort studies.'
  }
};

const NOCTURNAL_MULTIPLIER: Record<'no' | 'yes', Multiplier> = {
  no: { mult: 1.0, note: 'Daytime-only seizures carry lower SUDEP risk.' },
  yes: { mult: 1.7, note: 'Sveinsson 2020: nocturnal GTCS conferred OR 15.31 vs no GTCS (within the GTCS-having subgroup, the nocturnal-specific increment is ~1.5-2× over daytime GTCS). MORTEMUS confirms most SUDEPs occur during sleep.' }
};

const SUPERVISION_MULTIPLIER: Record<Supervision, Multiplier> = {
  shared: { mult: 0.5, note: 'Shared bedroom or active monitoring (co-sleeping, in-room caregiver, attended listening device). Langan 2005: HR ~0.4 for bedroom sharing or monitor use. Tomson 2025: lowest-risk stratum requires bedroom sharing.' },
  partial: { mult: 1.0, note: 'Separate room with intermittent or remote monitoring (periodic checks, baby monitor without continuous attendance) — the typical pediatric situation. Reference category: neither the protective effect of active monitoring nor the elevated risk of being unwitnessed.' },
  alone: { mult: 2.0, note: 'Sleeps alone and unwitnessed / lives alone. Sveinsson 2020: OR 5.01 for living alone (adult data); interaction with GTCS yields OR 67.10. The single most modifiable factor.' }
};

const ADHERENCE_MULTIPLIER: Record<Adherence, Multiplier> = {
  good: { mult: 1.0, note: 'Reference.' },
  poor: { mult: 2.0, note: 'Faught 2008: nonadherence ~doubles mortality risk including SUDEP. Adolescents are highest-risk age group for nonadherence.' }
};

const DURATION_MULTIPLIER: Record<Duration, Multiplier> = {
  short: { mult: 1.0, note: '<5 years duration.' },
  medium: { mult: 1.2, note: '5–15 years. Modest cumulative risk; Hesdorffer 2011 showed graded effect.' },
  long: { mult: 1.5, note: '>15 years. Camfield/Berg pediatric long-follow-up data; effect attenuated relative to adult-onset epilepsy.' }
};

// Floor concept (revised). Rather than a hard numerical floor that overstates
// our certainty at the low end, we use two thresholds:
//   - DETECTION_LIMIT (0.05/1000py): the lowest empirically observed stratum
//     in Tomson 2025 (95% CI 0.02-0.12). Below this, displayed as "≤0.05".
//   - LOWEST_PLAUSIBLE (0.01/1000py): below this, displayed as "<0.01"
//     reflecting that the literature cannot distinguish such low rates from
//     each other or from zero. Berg 2013 reported 0.09/1000py for
//     uncomplicated pediatric epilepsy as a population mean — the favorable
//     subset within that group likely sits well below.
//   The model still calculates the raw multiplicative value internally so
//   that intervention impacts remain visible, but display caps at these
//   thresholds.
const DETECTION_LIMIT = 0.05;
const LOWEST_PLAUSIBLE = 0.01;
// High-end saturation replaces a hard cap. Pure multiplication holds through the
// calibrated range (raw ≤ SAT_KNEE = 7/1000py — about Donnan 2023's Dravet upper
// CI, 7.8, and the upper bound of clean pediatric syndrome point estimates);
// above the knee, increments diminish smoothly toward SAT_ASYMPTOTE (15/1000py).
// Calibration rationale (intentional, clinician-directed):
//   - Clean pediatric syndrome point estimates essentially never exceed ~10
//     (Donnan Dravet 4.4, Cooper Dravet 9.3, pediatric DEE overall 2.8, LGS
//     total mortality 6.1). Rates above 10 are confined to a confidence bound
//     (Cooper CI 19.5) and a heavily risk-stratified, adult-inclusive registry
//     stratum (Tomson 2025: 18.1 for alone + nonadherent + nocturnal TCS + ≥1
//     TCS). The model deliberately does NOT try to reproduce those ~18+ extremes
//     for a pediatric syndrome tool; it tops out near 15 and the UI notes that
//     literature has reported rates as high as ~18 in select strata.
//   - The 15 ceiling is reserved for the genuinely extreme: it takes a
//     maximally-stacked profile (very-frequent + nocturnal GTCS + sleeps alone
//     + nonadherent + long duration, on a refractory/channelopathy baseline) to
//     approach it. A serious-but-not-maximal Very-high case tops out near 12.
//   - Risk-factor ORs attenuate at high absolute risk and factors are
//     correlated, so the naive product overstates; the tail is also genuinely
//     uncertain (these events are rare and SUDEP is never zero), which is why
//     the displayed value is compressed rather than extrapolated. See the
//     saturation transform in calcPedSUDEP.
const SAT_KNEE = 7.0;
const SAT_ASYMPTOTE = 15.0;

export function calcPedSUDEP(inputs: PedSUDEPInputs): PedSUDEPResult {
  const {
    syndrome, geneticEtiology,
    gtcFrequency, nocturnal, supervision,
    adherence, duration
  } = inputs;

  const synd = SYNDROME_BASELINES[syndrome] ?? SYNDROME_BASELINES.controlled;
  const gen  = GENETIC_MODIFIERS[geneticEtiology] ?? GENETIC_MODIFIERS.none;
  const gtc  = GTC_MULTIPLIERS[gtcFrequency] ?? GTC_MULTIPLIERS.rare;
  const noct = NOCTURNAL_MULTIPLIER[nocturnal ? 'yes' : 'no'];
  const sup  = SUPERVISION_MULTIPLIER[supervision];
  const adh  = ADHERENCE_MULTIPLIER[adherence];
  const dur  = DURATION_MULTIPLIER[duration];

  // Floor-type genes (SCN1A) apply their multiplier only on non-DEE phenotypes;
  // on DEE phenotypes the multiplier is suppressed (the phenotype already encodes
  // the channelopathy) and the gene contributes solely via the final-rate floor
  // applied below. Non-floor genes always keep their multiplier.
  const effectiveGeneMult = (gen.floorRate != null && DEE_PHENOTYPES.has(syndrome)) ? 1.0 : gen.mult;
  const rawUnfloored = synd.rate * effectiveGeneMult * gtc.mult * noct.mult *
              sup.mult * adh.mult * dur.mult;

  // Final-rate floors. Two sources set a minimum on the final rate:
  //   - Syndrome floor: high-mortality syndromes (Dravet 2.3, severe non-Dravet
  //     DEE 2.5) retain substantial SUDEP risk despite favorable modifiers — the
  //     published rates (Cooper 2016, Donnan 2023) describe active disease, and
  //     crude within-syndrome stratification by these factors is weakly
  //     evidenced. The floor is the lower bound of Donnan's 95% CI.
  //   - Genetic floor: a pathogenic floor-type gene (SCN1A, 0.5) is never benign;
  //     favorable modifiers cannot pull its final estimate below this minimum.
  // When both apply, the higher floor governs (e.g. Dravet + SCN1A → 2.3, so the
  // gene floor is inert and there is no double-count). EXCEPTION: genuine
  // seizure-freedom (no GTCS ever, or none in the past year) is the strongest
  // protective factor (Tomson 2025, ~36x) and overrides every floor.
  const seizureFree = gtcFrequency === 'never' || gtcFrequency === 'none_pastyear';
  const syndFloorVal = synd.floor ?? 0;
  const geneFloorVal = gen.floorRate ?? 0;
  const activeFloor = Math.max(syndFloorVal, geneFloorVal);
  const floorBinds = !seizureFree && activeFloor > 0 && rawUnfloored < activeFloor;
  const raw = floorBinds ? activeFloor : rawUnfloored;
  // Attribute the binding floor for the breakdown UI; the syndrome floor wins
  // ties so Dravet/severe-DEE + SCN1A reads as a syndrome floor, not a gene one.
  const syndromeFloorApplied = floorBinds && syndFloorVal >= geneFloorVal;
  const geneticFloorBinding = floorBinds && geneFloorVal > syndFloorVal;

  // High-end saturation (diminishing returns) instead of a hard cap. Below the
  // knee the value is unchanged; above it, increments shrink toward the
  // asymptote. Continuous AND C1-smooth at the knee: scale = ASYMPTOTE − KNEE
  // makes the slope 1 on both sides, so there is no kink at the transition.
  const saturated = raw <= SAT_KNEE
    ? raw
    : SAT_KNEE + (SAT_ASYMPTOTE - SAT_KNEE) * (1 - Math.exp(-(raw - SAT_KNEE) / (SAT_ASYMPTOTE - SAT_KNEE)));

  // Display thresholds. Low end uses the same epistemic thresholds as before
  // (the literature can't resolve very low rates); high end shows the saturated
  // value and flags the 'ceiling' (saturating) regime once raw ≥ the asymptote.
  let displayLevel: DisplayLevel;  // 'measurable' | 'detection_limit' | 'lowest_plausible' | 'ceiling'
  let displayRate: number;         // for use in calculations and standard display
  let displayString: string;       // for direct rendering, e.g., "≤0.05" or "0.42"
  let annualPrefix = '';           // for percentage display

  if (raw >= DETECTION_LIMIT) {
    displayLevel = raw >= SAT_ASYMPTOTE ? 'ceiling' : 'measurable';
    displayRate = saturated;
    displayString = saturated.toFixed(2);
  } else if (raw >= LOWEST_PLAUSIBLE) {
    displayLevel = 'detection_limit';
    displayRate = DETECTION_LIMIT;       // upper bound for percentage calcs
    displayString = `≤${DETECTION_LIMIT.toFixed(2)}`;
    annualPrefix = '≤';
  } else {
    displayLevel = 'lowest_plausible';
    displayRate = LOWEST_PLAUSIBLE;
    displayString = `<${LOWEST_PLAUSIBLE.toFixed(2)}`;
    annualPrefix = '<';
  }

  // Tier labels (based on the final display rate, with overrides for the
  // sub-detection strata so they don't get pigeonholed numerically)
  let tier: string;
  if (displayLevel === 'lowest_plausible') tier = 'Extremely low';
  else if (displayLevel === 'detection_limit') tier = 'Very low';
  else if (displayRate < 1.0) tier = 'Low';
  else if (displayRate < 3.0) tier = 'Moderate';
  else if (displayRate < 10) tier = 'High';
  else tier = 'Very high';

  // Annual % and 10-year cumulative — using displayRate (capped at thresholds)
  // to avoid manufacturing false precision at low end or implausibly high end
  const annual = displayRate / 10;
  const tenYear = 100 * (1 - Math.pow(1 - displayRate/1000, 10));

  // Compare to age-matched general pediatric population SUDEP-equivalent rate
  // (the "controlled epilepsy" baseline; reference the table so it can't drift).
  const relativeToControlled = displayRate / SYNDROME_BASELINES.controlled.rate;

  // For display, the UI should use `displayString` (and prefix annual/10-yr
  // percentages with `annualPrefix`). `rawRate` is the pre-saturation value
  // (after any syndrome floor); `displayRate` is the saturated value, snapped
  // to the detection thresholds at the low end.
  return {
    syndrome: synd,
    genetic: gen,
    geneticApplied: geneticEtiology !== 'none',
    effectiveGeneMult,
    geneticFloorApplied: gen.floorRate != null,
    geneticFloorBinding,
    syndromeFloorApplied,
    gtc,
    nocturnal: noct,
    supervision: sup,
    adherence: adh,
    duration: dur,
    rawRate: raw,
    displayRate,
    displayString,
    displayLevel,
    annualPrefix,
    belowDetection: displayLevel === 'detection_limit' || displayLevel === 'lowest_plausible',
    ceilinged: displayLevel === 'ceiling',
    tier,
    annualPercent: annual,
    tenYearPercent: tenYear,
    relativeToControlled,
    cardiacFlag: gen.cardiacFlag === true
  };
}

// ============================================================================
// SUDEP-7 v2.0 — DeGiorgio 2015 weights from Walczak 2001 ORs
// ============================================================================

export function calcSUDEP7(inputs: SUDEP7Inputs): SUDEP7Result {
  const { gtcMore3, gtc1plus, anySzPastYear, sz50plus, dur30plus, asm3plus, idDD } = inputs;
  const item1 = gtcMore3 ? 2 : 0;
  const item2 = gtcMore3 ? 0 : (gtc1plus ? 1 : 0);
  const item4 = sz50plus ? 2 : 0;
  const item3 = sz50plus ? 0 : (anySzPastYear ? 1 : 0);
  const item5 = dur30plus ? 3 : 0;
  const item6 = asm3plus ? 1 : 0;
  const item7 = idDD ? 2 : 0;
  const total = item1 + item2 + item3 + item4 + item5 + item6 + item7;
  let quartile: string, interpretation: string;
  if (total <= 1) {
    quartile = 'Lowest quartile (0–1 points)';
    interpretation = 'Lowest-risk category in the original derivation cohort. Cardiac autonomic function (an objective marker of nervous-system regulation of the heart) was preserved in this group. Counseling can be calibrated to the favorable risk profile.';
  } else if (total <= 3) {
    quartile = 'Lower-middle quartile (2–3 points)';
    interpretation = 'Lower-middle stratum. Patients here carry moderate seizure burden or one major risk factor. Modifiable factor discussion warranted.';
  } else if (total <= 4) {
    quartile = 'Upper-middle quartile (4 points)';
    interpretation = 'Upper-middle stratum. Multiple risk factors typically present. SUDEP discussion should be structured with attention to all modifiable factors and consideration of more aggressive seizure control strategies.';
  } else {
    quartile = 'Highest quartile (≥5 points)';
    interpretation = 'Highest-risk stratum in the derivation cohort. Patients in this group demonstrated cardiac autonomic dysfunction approaching that seen in heart failure patients — a marker of severe systemic dysregulation from chronic uncontrolled epilepsy. Aggressive intervention indicated: optimize ASMs, evaluate for epilepsy surgery, ensure nocturnal supervision.';
  }
  return { total, max: 10, quartile, interpretation };
}

// ============================================================================
// SUDEP-3 — Nei 2024
// ============================================================================

export function calcSUDEP3(inputs: SUDEP3Inputs): SUDEP3Result {
  const { gtcsPastYear, anySzPastYear, idDD } = inputs;
  let score = 0;
  if (gtcsPastYear) score += 1;
  if (anySzPastYear) score += 1;
  if (idDD) score += 2;
  let stratum: string, oddsInterp: string;
  if (score === 0) {
    stratum = 'Reference (lowest)';
    oddsInterp = 'Lowest-risk category in the derivation cohort. The patient has none of the three classical SUDEP risk markers. Counseling can be brief and contextualized to the favorable risk profile.';
  } else if (score <= 2) {
    stratum = 'Intermediate';
    oddsInterp = 'Each point above zero corresponds to roughly triple the SUDEP risk of the reference category. A score of 1–2 puts this patient in the intermediate range — modifiable factors deserve focused attention.';
  } else {
    stratum = 'Highest';
    oddsInterp = 'Score ≥3 is the most concerning stratum. In the derivation cohort, this cutoff correctly identified 57% of patients who died of SUDEP, with a 75% true-negative rate among controls. Structured SUDEP counseling with intervention focus is warranted.';
  }
  return { score, max: 4, stratum, oddsInterp };
}
