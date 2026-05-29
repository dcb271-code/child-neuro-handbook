/* Neonatal HIE Assessment — pure logic.
   Two integrated tools for hypoxic-ischemic encephalopathy:
     1. Modified Sarnat staging (Sarnat 1976; modified per NICHD/TOBY/CoolCap).
     2. Therapeutic hypothermia (TH) eligibility, operationalized to the
        institutional HIE pathway (which aligns with NICHD/TOBY/CoolCap).
   Thompson 1997 is deliberately omitted — the institutional pathway uses Sarnat,
   and Thompson was derived pre-cooling so it undercalls sedated/intubated
   infants (co-suppression of tone, LOC, suck, respiration under sedation+TH). */

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
// seizures with supportive features.
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
  // Encephalopathy — pulled from prior tab
  sarnatStage: SarnatStage;
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
    sarnatStage, contraindications,
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
  // Sarnat is the institutional triage instrument (≥3 mod-or-severe domains, or
  // seizures with supportive features). Thompson is deliberately not used: it
  // was derived pre-cooling and undercalls sedated/intubated infants.
  const encephalopathyMet =
    sarnatStage === 'moderate' || sarnatStage === 'severe' || sarnatStage === 'moderate_severe';

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
  if (!encephalopathyMet) reasons.push('Encephalopathy does not meet moderate/severe threshold on Sarnat');
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
