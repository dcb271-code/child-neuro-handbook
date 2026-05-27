/* Seizure Recurrence Risk Calculators — pure logic.
   1) First unprovoked seizure recurrence — Shinnar 1996 (PMID 8692621),
      Berg/Shinnar 1991 (PMID 2067659); treatment effect from FIRST
      (Musicco 1997) / MESS (Marson 2005); ILAE 2014 dx criterion (PMID 24730690).
   2) Febrile seizure recurrence — Berg/Shinnar 1997 4-factor (PMID 9111436).
   3) Febrile -> future epilepsy — Annegers 1987 (PMID 3807992), refined by
      Sartori 2019 / Whitney 2024 / Jiang 2026 (recurrence-only ~ simple FS) and
      FEBSTAT / Lewis 2025 (PMID 40770931) for the FSE tier.
   Values copied verbatim from the reviewed draft; central estimates for
   counseling, not individual prognostic certainty. */

export type FirstSeizureInputs = {
  etiology: 'idiopathic' | 'remoteSymptomatic';
  eeg: 'normal' | 'abnormal';
  nocturnal: boolean;
  todds: boolean;
  priorFS: boolean;
};

export type FirstSeizureResult = {
  label: string;
  untreated: { r2y: number; r5y: number };
  treated: { r2y: number; r5y: number };
  epilepsyDx: boolean;        // 5-yr (proxy for ILAE 10-yr) >= 60%
  likelyEpilepsyDx: boolean;  // 5-yr 51-59%: likely meets once extrapolated to 10 yr
};

export type FebrileRecurrenceInputs = {
  ageYoung: boolean;
  familyHistoryFS: boolean;
  lowTemp: boolean;
  shortFever: boolean;
};

export type FebrileRecurrenceResult = { rfCount: number; risk: number; stratum: string };

export type FutureEpilepsyInputs = {
  focal: boolean;
  prolongedLevel: 'no' | 'moderate' | 'fse';
  multipleInDay: boolean;
  priorAbnormality: boolean;
  familyHxEpilepsy: boolean;
};

export type FutureEpilepsyResult = {
  higherRiskCount: number;
  recurrenceOnly: boolean;
  fse: boolean;
  stratum: string;
  baseRisk: number;
  adjustedRisk: number;
  isComplex: boolean;
};

// 2-year / 5-year recurrence by etiology x EEG (Shinnar 1996 extended F/U).
const FIRST_SZ_TABLE: Record<
  FirstSeizureInputs['etiology'],
  Record<FirstSeizureInputs['eeg'], { r2y: number; r5y: number; label: string }>
> = {
  idiopathic: {
    normal:   { r2y: 21, r5y: 26, label: 'Idiopathic etiology, normal EEG (lowest risk)' },
    abnormal: { r2y: 41, r5y: 56, label: 'Idiopathic etiology, abnormal (epileptiform) EEG' },
  },
  remoteSymptomatic: {
    normal:   { r2y: 32, r5y: 40, label: 'Remote symptomatic etiology, normal EEG' },
    abnormal: { r2y: 54, r5y: 65, label: 'Remote symptomatic etiology, abnormal (epileptiform) EEG' },
  },
};

export function calcFirstSeizure(inputs: FirstSeizureInputs): FirstSeizureResult {
  const { etiology, eeg, nocturnal, todds, priorFS } = inputs;
  const base = FIRST_SZ_TABLE[etiology][eeg];
  let r2y = base.r2y;
  let r5y = base.r5y;

  // Modest, approximate relative-risk modifiers (Shinnar/Berg series).
  if (nocturnal) { r2y = Math.min(85, r2y * 1.25); r5y = Math.min(90, r5y * 1.20); }
  if (todds)     { r2y = Math.min(85, r2y * 1.10); r5y = Math.min(90, r5y * 1.08); }
  if (priorFS)   { r2y = Math.min(85, r2y * 1.10); r5y = Math.min(90, r5y * 1.08); }

  // Treatment effect (FIRST/MESS): ~halves 2-yr recurrence, attenuates long-term.
  const treatedR2y = r2y * 0.6;
  const treatedR5y = r5y * 0.7;

  // The ILAE 2014 criterion is a >=60% recurrence risk at 10 years. This tool
  // only computes to 5 years, so we flag off the (rounded, untreated) 5-yr
  // value — the closest proxy — and add a softer "likely meets" note in the
  // 51-59% band, where the 10-yr risk plausibly crosses 60%.
  const untreatedR2y = Math.round(r2y);
  const untreatedR5y = Math.round(r5y);

  return {
    label: base.label,
    untreated: { r2y: untreatedR2y, r5y: untreatedR5y },
    treated: { r2y: Math.round(treatedR2y), r5y: Math.round(treatedR5y) },
    epilepsyDx: untreatedR5y >= 60,
    likelyEpilepsyDx: untreatedR5y > 50 && untreatedR5y < 60,
  };
}

// 2-year recurrence by number of risk factors (Berg/Shinnar 1997, n=428).
const FS_RECUR_RISK: Record<number, number> = { 0: 14, 1: 24, 2: 32, 3: 63, 4: 76 };

export function calcFebrileRecurrence(inputs: FebrileRecurrenceInputs): FebrileRecurrenceResult {
  const { ageYoung, familyHistoryFS, lowTemp, shortFever } = inputs;
  const rfCount = [ageYoung, familyHistoryFS, lowTemp, shortFever].filter(Boolean).length;
  const risk = FS_RECUR_RISK[rfCount];
  let stratum: string;
  if (rfCount === 0) stratum = 'Lowest (population baseline)';
  else if (rfCount === 1) stratum = 'Low';
  else if (rfCount === 2) stratum = 'Moderate';
  else stratum = 'High';
  return { rfCount, risk, stratum };
}

export function calcFutureEpilepsy(inputs: FutureEpilepsyInputs): FutureEpilepsyResult {
  const { focal, prolongedLevel, multipleInDay, priorAbnormality, familyHxEpilepsy } = inputs;

  const fse = prolongedLevel === 'fse';
  const moderatelyProlonged = prolongedLevel === 'moderate';
  const anyProlonged = fse || moderatelyProlonged;

  const higherRiskCount = [focal, moderatelyProlonged].filter(Boolean).length;
  const recurrenceOnly = multipleInDay && !focal && !anyProlonged;
  const anyComplex = focal || anyProlonged || multipleInDay;

  let baseRisk: number;
  let stratum: string;
  let fseFlag = false;

  if (fse) {
    fseFlag = true;
    if (priorAbnormality) {
      baseRisk = 40;
      stratum = 'Febrile status epilepticus + prior neurodevelopmental abnormality';
    } else if (focal) {
      baseRisk = 35;
      stratum = 'Febrile status epilepticus + focal features';
    } else {
      baseRisk = 25;
      stratum = 'Febrile status epilepticus (≥30 min) — FEBSTAT high-risk subset';
    }
  } else if (!anyComplex && !priorAbnormality) {
    baseRisk = 2.4;
    stratum = 'Simple FS';
  } else if (recurrenceOnly && !priorAbnormality) {
    baseRisk = 3.5;
    stratum = 'Recurrence within 24h only (behaves like simple FS per recent evidence)';
  } else if (higherRiskCount === 1 && !priorAbnormality) {
    baseRisk = 7;
    stratum = multipleInDay
      ? 'One higher-risk complex feature + recurrence'
      : 'One higher-risk complex feature (focal or 15–29 min prolonged)';
  } else if (higherRiskCount >= 2 && !priorAbnormality) {
    baseRisk = 17;
    stratum = 'Multiple higher-risk complex features';
  } else if (priorAbnormality && !anyComplex) {
    baseRisk = 7;
    stratum = 'Prior neurodevelopmental abnormality';
  } else if (priorAbnormality && recurrenceOnly) {
    baseRisk = 10;
    stratum = 'Prior neurodevelopmental abnormality + recurrence only';
  } else if (priorAbnormality && higherRiskCount >= 1) {
    baseRisk = 22;
    stratum = 'Prior neurodevelopmental abnormality + higher-risk complex features';
  } else {
    baseRisk = 2;
    stratum = 'Baseline';
  }

  let adjusted = baseRisk;
  if (familyHxEpilepsy) adjusted = Math.min(75, baseRisk * 1.5);

  return {
    higherRiskCount,
    recurrenceOnly,
    fse: fseFlag,
    stratum,
    baseRisk,
    adjustedRisk: Math.round(adjusted * 10) / 10,
    isComplex: anyComplex,
  };
}
