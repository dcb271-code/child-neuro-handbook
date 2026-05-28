/* Neonatal HIE Assessment — pure logic.
   Three integrated tools for hypoxic-ischemic encephalopathy:
     1. Modified Sarnat staging (Sarnat 1976; modified per NICHD/TOBY/CoolCap).
     2. Thompson encephalopathy score (Thompson 1997, PMID 9240886).
     3. Therapeutic hypothermia (TH) eligibility per the TOBY/NICHD framework.
   Values copied verbatim from the reviewed draft. */

// ============================================================================
// MODIFIED SARNAT STAGING
// ============================================================================

export type SarnatSeverityKey = 'normal' | 'mild' | 'moderate' | 'severe';
export type SarnatDomainId =
  | 'consciousness' | 'spontActivity' | 'posture'
  | 'tone' | 'primitiveReflexes' | 'autonomic';

export type SarnatDomain = {
  id: SarnatDomainId;
  label: string;
  options: ReadonlyArray<readonly [SarnatSeverityKey, string, number]>;
};

export type SarnatInputs = Record<SarnatDomainId, SarnatSeverityKey> & { seizures: boolean };

export type SarnatStage = 'normal' | 'mild' | 'moderate' | 'severe' | 'moderate_severe';

export type SarnatDomainResult = {
  id: SarnatDomainId;
  label: string;
  value: SarnatSeverityKey;
  severity: number;
};

export type SarnatResult = {
  stage: SarnatStage;
  stageLabel: string;
  maxSeverity: number;
  moderateOrSevereCount: number;
  abnormalCount: number;
  domainResults: SarnatDomainResult[];
  meetsThCriteria: boolean;
};

export const SARNAT_DOMAINS: ReadonlyArray<SarnatDomain> = [
  {
    id: 'consciousness',
    label: 'Level of consciousness',
    options: [
      ['normal', 'Normal / alert', 0],
      ['mild', 'Hyperalert / irritable', 1],
      ['moderate', 'Lethargic', 2],
      ['severe', 'Stupor / coma', 3]
    ]
  },
  {
    id: 'spontActivity',
    label: 'Spontaneous activity',
    options: [
      ['normal', 'Normal', 0],
      ['mild', 'Normal or decreased', 1],
      ['moderate', 'Decreased activity', 2],
      ['severe', 'No activity', 3]
    ]
  },
  {
    id: 'posture',
    label: 'Posture',
    options: [
      ['normal', 'Normal flexed', 0],
      ['mild', 'Mild distal flexion', 1],
      ['moderate', 'Strong distal flexion / complete extension', 2],
      ['severe', 'Decerebrate posturing', 3]
    ]
  },
  {
    id: 'tone',
    label: 'Tone',
    options: [
      ['normal', 'Normal', 0],
      ['mild', 'Hypertonia (mild)', 1],
      ['moderate', 'Hypotonia (focal or generalized)', 2],
      ['severe', 'Flaccid', 3]
    ]
  },
  {
    id: 'primitiveReflexes',
    label: 'Primitive reflexes (suck and Moro)',
    options: [
      ['normal', 'Both present', 0],
      ['mild', 'Strong suck, hyperactive Moro', 1],
      ['moderate', 'Weak suck or incomplete Moro', 2],
      ['severe', 'Absent suck and Moro', 3]
    ]
  },
  {
    id: 'autonomic',
    label: 'Autonomic system (pupils, HR, respiration)',
    options: [
      ['normal', 'Normal pupils, HR, respiration', 0],
      ['mild', 'Mydriasis, tachycardia, normal respiration', 1],
      ['moderate', 'Miosis, bradycardia, periodic respiration', 2],
      ['severe', 'Pupils variable/poor light reflex, variable HR, apnea/ventilator', 3]
    ]
  }
];

// NICHD/TOBY: moderate or severe HIE = ≥3 domains in moderate (≥2) or severe
// range, OR any severe (3) finding, OR seizures with supportive features.
export function calcSarnat(inputs: SarnatInputs): SarnatResult {
  let maxSeverity = 0;
  let moderateOrSevereCount = 0;
  let abnormalCount = 0;
  const domainResults: SarnatDomainResult[] = [];

  for (const d of SARNAT_DOMAINS) {
    const val = inputs[d.id] ?? 'normal';
    const opt = d.options.find(o => o[0] === val);
    const severity = opt ? opt[2] : 0;
    domainResults.push({ id: d.id, label: d.label, value: val, severity });
    if (severity > maxSeverity) maxSeverity = severity;
    if (severity >= 2) moderateOrSevereCount++;
    if (severity >= 1) abnormalCount++;
  }

  let stage: SarnatStage;
  let stageLabel: string;
  if (inputs.seizures) {
    stage = 'moderate_severe';
    stageLabel = 'Stage II–III (moderate to severe) — seizures alone meet TH criteria when other features support HIE diagnosis';
  } else if (moderateOrSevereCount >= 3 || maxSeverity === 3) {
    stage = maxSeverity === 3 ? 'severe' : 'moderate';
    stageLabel = stage === 'severe'
      ? 'Stage III (severe encephalopathy)'
      : 'Stage II (moderate encephalopathy)';
  } else if (abnormalCount >= 1) {
    stage = 'mild';
    stageLabel = 'Stage I (mild encephalopathy)';
  } else {
    stage = 'normal';
    stageLabel = 'No encephalopathy detected';
  }

  return {
    stage,
    stageLabel,
    maxSeverity,
    moderateOrSevereCount,
    abnormalCount,
    domainResults,
    meetsThCriteria: stage === 'moderate' || stage === 'severe' || stage === 'moderate_severe'
  };
}

// ============================================================================
// THOMPSON ENCEPHALOPATHY SCORE (Thompson 1997, max 22 — some items cap at 2)
// ============================================================================

export type ThompsonItemId =
  | 'tone' | 'loc' | 'fits' | 'posture' | 'moro'
  | 'grasp' | 'suck' | 'respiration' | 'fontanelle';

export type ThompsonItem = {
  id: ThompsonItemId;
  label: string;
  options: ReadonlyArray<readonly [string, string, number]>;
};

export type ThompsonInputs = Record<ThompsonItemId, string>;

export type ThompsonItemResult = {
  id: ThompsonItemId;
  label: string;
  valueLabel: string;
  score: number;
};

export type ThompsonResult = {
  total: number;
  max: 22;
  category: string;
  interpretation: string;
  itemResults: ThompsonItemResult[];
};

export const THOMPSON_ITEMS: ReadonlyArray<ThompsonItem> = [
  { id: 'tone', label: 'Tone',
    options: [['n', 'Normal', 0], ['h', 'Hyper', 1], ['lo', 'Hypo', 2], ['f', 'Flaccid', 3]] },
  { id: 'loc', label: 'Level of consciousness',
    options: [['n', 'Normal', 0], ['s', 'Staring', 1], ['l', 'Lethargic', 2], ['c', 'Comatose', 3]] },
  { id: 'fits', label: 'Fits (seizures)',
    options: [['n', 'None', 0], ['l', '<3/day', 1], ['h', '≥3/day', 2]] },
  { id: 'posture', label: 'Posture',
    options: [['n', 'Normal', 0], ['f', 'Fisting / cycling', 1], ['s', 'Strong distal flexion', 2], ['d', 'Decerebrate', 3]] },
  { id: 'moro', label: 'Moro reflex',
    options: [['n', 'Normal', 0], ['p', 'Partial', 1], ['a', 'Absent', 2]] },
  { id: 'grasp', label: 'Grasp reflex',
    options: [['n', 'Normal', 0], ['p', 'Poor', 1], ['a', 'Absent', 2]] },
  { id: 'suck', label: 'Suck reflex',
    options: [['n', 'Normal', 0], ['p', 'Poor', 1], ['a', 'Absent / bites', 2]] },
  { id: 'respiration', label: 'Respiration',
    options: [['n', 'Normal', 0], ['h', 'Hyperventilation', 1], ['a', 'Brief apnea', 2], ['v', 'Apnea / IPPV', 3]] },
  { id: 'fontanelle', label: 'Fontanelle',
    options: [['n', 'Normal', 0], ['f', 'Full, not tense', 1], ['t', 'Tense', 2]] }
];

export function calcThompson(inputs: ThompsonInputs): ThompsonResult {
  let total = 0;
  const itemResults: ThompsonItemResult[] = [];
  for (const item of THOMPSON_ITEMS) {
    const val = inputs[item.id] ?? item.options[0][0];
    const opt = item.options.find(o => o[0] === val);
    const score = opt ? opt[2] : 0;
    total += score;
    itemResults.push({ id: item.id, label: item.label, valueLabel: opt ? opt[1] : '', score });
  }

  let category: string;
  let interpretation: string;
  if (total <= 10) {
    category = 'Mild (1–10)';
    interpretation = 'Mild encephalopathy. Most infants in this range have normal outcomes. Score >7 within 6 hours is sometimes used as a TH inclusion threshold in mixed protocols.';
  } else if (total <= 14) {
    category = 'Moderate (11–14)';
    interpretation = 'Moderate encephalopathy. ~80% will have a normal outcome with appropriate management including therapeutic hypothermia. Best window for TH benefit.';
  } else {
    category = 'Severe (≥15)';
    interpretation = 'Severe encephalopathy. Substantially elevated risk of death or significant neurodevelopmental impairment. TH should be offered when criteria met. Peak score >15 in the first 7 days suggests poor prognosis.';
  }

  return { total, max: 22, category, interpretation, itemResults };
}

// ============================================================================
// TH ELIGIBILITY (institutional HIE pathway; aligns with NICHD/TOBY/CoolCap)
//
// Two-path physiologic logic, operationalized for the resident to walk through:
//   Path A (Biochemical): blood gas in first hour of life with pH ≤7.0 OR
//                         base deficit ≥16. Single qualifying value.
//   Path B (Alternative): used when no gas is available OR the gas is in the
//                         intermediate zone (pH 7.01–7.15 or BD 10–15.9).
//                         REQUIRES BOTH:
//                           (i)  10-min Apgar ≤5 OR assisted ventilation at
//                                birth for ≥10 min, AND
//                           (ii) an acute perinatal event (decels, abruption,
//                                cord prolapse/rupture, uterine rupture,
//                                maternal trauma/hemorrhage/arrest, shoulder
//                                dystocia, nuchal cord).
// Plus the gates: GA ≥36 wks (35w0d–35w6d case-by-case), BW >1800 g, age ≤6 h
// (6–24 h extended window may be considered after parental discussion).
// Plus encephalopathy: Sarnat moderate/severe (≥3 mod-or-severe domains) OR
// seizures OR Thompson ≥7.
// Plus no major contraindications.
// ============================================================================

// Banded inputs avoid false precision and match how the protocol thinks (in
// thresholds, not exact decimals).
export type PHBand = 'le_7' | '7.01-7.15' | 'gt_7.15' | 'unknown';
export type BDBand = 'ge_16' | '10-15.9' | 'lt_10' | 'unknown';
export type ApgarBand = 'le_5' | 'gt_5' | 'unknown';

export type THEligibilityInputs = {
  gestationalAge: number;     // weeks (decimal; 35.5 = 35w3-4d)
  birthWeight: number;        // grams
  ageHours: number;           // hours of life at assessment
  // Path A (biochemical)
  ph: PHBand;
  baseDeficit: BDBand;
  // Path B (alternative — clinical + sentinel event)
  apgar10: ApgarBand;
  assistedVent10min: boolean;   // assisted ventilation at birth ≥10 min
  acutePerinatalEvent: boolean; // any qualifying sentinel event
  // Encephalopathy — pulled from prior tabs
  sarnatStage: SarnatStage;
  thompsonScore: number | null;
  // Contraindications
  contraindications: boolean;
};

export type THEligibilityResult = {
  eligible: boolean;
  reasons: string[];   // blocking reasons (only present when not eligible)
  warnings: string[];  // non-blocking caveats (case-by-case, extended window)
  // Gates
  eligibleGA: boolean;
  gaCaseByCase: boolean;    // 35w0d–35w6d
  eligibleBW: boolean;
  eligibleAge: boolean;
  ageExtendedWindow: boolean; // 6–24 h
  // Physiologic paths
  criterionA: boolean;
  criterionAReason: string; // e.g. "pH ≤7.0" / "BD ≥16" / "" if not met
  criterionB: boolean;
  biochemTriggerForB: boolean;  // no gas OR intermediate values
  clinicalTriggerForB: boolean; // Apgar ≤5 OR vent ≥10 min
  sentinelEventForB: boolean;
  physiologicMet: boolean;      // A OR B
  // Encephalopathy
  encephalopathyMet: boolean;
};

export function assessTHEligibility(inputs: THEligibilityInputs): THEligibilityResult {
  const {
    gestationalAge, birthWeight, ageHours,
    ph, baseDeficit, apgar10, assistedVent10min, acutePerinatalEvent,
    sarnatStage, thompsonScore, contraindications,
  } = inputs;

  // --- Gates ---
  const eligibleGA = gestationalAge >= 36;
  const gaCaseByCase = !eligibleGA && gestationalAge >= 35;
  const eligibleBW = birthWeight > 1800;
  const eligibleAge = ageHours <= 6;
  const ageExtendedWindow = !eligibleAge && ageHours <= 24;

  // --- Path A: Biochemical ---
  let criterionA = false;
  let criterionAReason = '';
  if (ph === 'le_7') { criterionA = true; criterionAReason = 'pH ≤7.0'; }
  else if (baseDeficit === 'ge_16') { criterionA = true; criterionAReason = 'base deficit ≥16'; }

  // --- Path B: Alternative ---
  // Trigger requires either no gas available, or gas in the intermediate band.
  const biochemTriggerForB =
    (ph === 'unknown' && baseDeficit === 'unknown') ||
    ph === '7.01-7.15' || baseDeficit === '10-15.9';
  const clinicalTriggerForB = apgar10 === 'le_5' || assistedVent10min;
  const sentinelEventForB = acutePerinatalEvent;
  const criterionB = biochemTriggerForB && clinicalTriggerForB && sentinelEventForB;

  const physiologicMet = criterionA || criterionB;

  // --- Encephalopathy ---
  const encephalopathyMet =
    sarnatStage === 'moderate' || sarnatStage === 'severe' || sarnatStage === 'moderate_severe' ||
    (thompsonScore !== null && thompsonScore >= 7);

  // --- Overall ---
  // GA: <35 wks is a hard block; 35–35w6d is case-by-case (allowed, with warning).
  const gaPasses = eligibleGA || gaCaseByCase;
  // Age: >24 h is a hard block; 6–24 h is the extended window (allowed with discussion).
  const agePasses = eligibleAge || ageExtendedWindow;
  const eligible = gaPasses && eligibleBW && agePasses && physiologicMet
                && encephalopathyMet && !contraindications;

  const reasons: string[] = [];
  if (!gaPasses) reasons.push('Gestational age <35 weeks (cooling not indicated; target strict normothermia)');
  if (!eligibleBW) reasons.push('Birth weight ≤1800 g');
  if (!agePasses) reasons.push('Age >24 hours of life');
  if (!physiologicMet) reasons.push('Neither Path A (biochemical) nor Path B (alternative) physiologic criteria are met');
  if (!encephalopathyMet) reasons.push('Encephalopathy does not meet moderate/severe threshold (Sarnat or Thompson ≥7)');
  if (contraindications) reasons.push('Contraindication present');

  const warnings: string[] = [];
  if (gaCaseByCase) warnings.push('GA 35w0d–35w6d: case-by-case per protocol — discuss with neonatology (Faix 2025).');
  if (ageExtendedWindow) warnings.push('Age 6–24 h: outside the standard 6-h window. Initiation may be considered after parental discussion of potential benefits and risks (Zanelli 2026 AAP clinical report).');

  return {
    eligible, reasons, warnings,
    eligibleGA, gaCaseByCase, eligibleBW, eligibleAge, ageExtendedWindow,
    criterionA, criterionAReason, criterionB,
    biochemTriggerForB, clinicalTriggerForB, sentinelEventForB,
    physiologicMet, encephalopathyMet,
  };
}

// Acute perinatal events that satisfy Path B's sentinel-event criterion
// (per the institutional HIE pathway — broader than NICHD's original list).
export const ACUTE_PERINATAL_EVENTS: readonly string[] = [
  'Late or variable decelerations',
  'Placental abruption',
  'Cord prolapse / rupture',
  'Uterine rupture',
  'Maternal trauma, hemorrhage, or cardioresp arrest',
  'Shoulder dystocia',
  'Nuchal cord',
];
