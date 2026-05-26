/* ASM Withdrawal Risk Calculator — pure logic.
   Lamberink 2017 (Lancet Neurol; PMID 28483337) point tables ported from the
   official UMC Utrecht implementation (github.com/wmotte/epilepsypredictiontools,
   aed-calc.js, Apache-2.0). Dai 2025 (eClinicalMedicine; PMID 40134561) 0-17 score. */

export type LamberinkInputs = {
  duration: number;   // epilepsy duration before remission, 0-40 y
  ttr: number;        // seizure-free interval before withdrawal, 0-24 y
  naed: number;       // number of ASMs before withdrawal, 0-9 (long-term only)
  ageonset: number;   // age at seizure onset, 0-80 y
  sex: 'male' | 'female';
  famhist: 'yes' | 'no';
  histfeb: 'yes' | 'no';
  nseizures: '0-9' | '10+';
  benign: 'yes' | 'no';        // self-limiting epilepsy syndrome
  delay: 'yes' | 'no';         // developmental delay / IQ < 70
  focal: 'yes' | 'no';
  eeg: 'normal' | 'notdone' | 'epileptiform';
};

export type RiskValue = number | string | null;

export type LamberinkResult = {
  scoreRec: number;
  scoreLong: number;
  risk2y: RiskValue;
  risk5y: RiskValue;
  riskLong: RiskValue;
};

export type DaiInputs = {
  ageOnsetD: '<10' | '10+';
  durationD: '<3' | '3+';
  eegStart: 'normal' | 'abnormal';
  eegAfter: 'normal' | 'abnormal';
  febrile: 'yes' | 'no';
  intellectual: 'yes' | 'no';
  motor: 'yes' | 'no';
  nASM: '1' | '2+';
  focalOnly: 'yes' | 'no';
};

export type DaiResult = {
  score: number;
  stratum: 'Low' | 'Moderate' | 'High';
  rr: string;
  interp: string;
  maxScore: number;
};

// ---------- LAMBERINK 2017 POINT TABLES (verbatim from UMC Utrecht) ----------

const TTR_VALUES = [24,23,22,21,20,19,18,17,16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,1,0];
const TTR_PTS_REC  = [0.0,1.0,2.0,3.0,4.0,5.0,5.5,6.5,7.5,8.5,9.5,10.5,11.5,12.5,13.0,14.0,15.0,16.0,17.0,18.0,19.0,19.5,20.0,20.0,20.0];
const TTR_PTS_LONG = [0,1,1.5,2,3,4,4.5,5,6,6.5,7.5,8,9,9.5,10.5,11,12,12.5,13.5,14,15,16,17,18.5,20];

const DUR_VALUES = Array.from({ length: 41 }, (_, i) => i);
const DUR_PTS_REC  = [0,2,3.5,5,6,7,7.5,8,8,8.5,8.5,8.5,8.5,8.5,9,9,9,9,9,9,9,9,9.5,9.5,9.5,9.5,9.5,9.5,9.5,10,10,10,10,10,10,10,10,10.5,10.5,10.5,10.5];
const DUR_PTS_LONG = [0,1,2.5,3,4,4.5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5];

const AGE_VALUES = [3,4,2,5,1,6,0,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,
                   26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,
                   50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,
                   74,75,76,77,78,79,80];
const AGE_PTS = [0,0,0.5,1,1.5,2,2.5,3.5,5,5.5,6.5,6.5,6.5,6.5,6.5,6.5,6.5,6.5,6.5,6.5,
                 6.5,6.5,6.5,6.5,6.5,6.5,6.5,6.5,6.5,6.5,6.5,6.5,6.5,7,7,7,7,7,7.5,7.5,
                 7.5,7.5,7.5,7.5,8,8,8,8,8,8.5,8.5,8.5,8.5,8.5,9,9,9,9,9,9,9.5,9.5,
                 9.5,9.5,9.5,10,10,10,10,10,10.5,10.5,10.5,10.5,10.5,10.5,11,11,11,11,11];

const NAED_PTS_LONG = [0,0,1.5,3,4.5,6,7,8.5,10,11.5];

const RISK_2Y: RiskValue[] = ['<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10',10,11,11,12,13,13,14,14,15,16,16,17,18,18,19,19,20,21,22,23,24,26,27,28,29,30,31,33,34,36,37,39,40,41,43,44,46,47,49,50,52,53,55,57,58,60,62,64,66,68,70,72,73,75,77,78,80,81,83,84,86,87,89,90,'>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90'];
const RISK_5Y: RiskValue[] = ['<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10',10,11,11,12,13,13,14,15,15,16,17,17,18,19,19,20,21,22,23,24,26,27,28,29,30,31,33,34,35,36,38,39,40,42,43,45,47,48,50,52,53,55,57,58,60,62,64,66,68,70,72,73,75,77,78,80,81,83,84,86,87,89,90,'>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90'];
const RISK_LONG: RiskValue[] = ['>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99',99,99,99,99,98,98,98,98,98,97,97,97,96,96,95,94,94,93,92,91,91,90,89,87,86,84,83,81,80,78,75,73,70,67,63,60,57,53,50,47,43,40,'<40','<40','<40','<40','<40','<40','<40','<40','<40','<40','<40','<40','<40','<40','<40','<40','<40','<40','<40','<40','<40','<40','<40','<40'];

const findIdx = (arr: number[], val: number) => arr.indexOf(val);

const lookupRisk = (total: number, table: RiskValue[]): RiskValue => {
  const idx = Math.round(total * 2);
  if (idx < 0 || idx >= table.length) return null;
  return table[idx];
};

export function calcLamberink(inputs: LamberinkInputs): LamberinkResult | null {
  const {
    duration, ttr, naed, ageonset, sex, famhist, histfeb,
    nseizures, benign, delay, focal, eeg,
  } = inputs;

  // The TTR/DUR/AGE/NAED tables are keyed by integer years/counts, so clamp
  // AND round: a non-integer input (e.g. 1.5y) would otherwise miss every
  // indexOf match and silently return null / undefined.
  const ttrC = Math.round(Math.min(24, Math.max(0, ttr)));
  const durC = Math.round(Math.min(40, Math.max(0, duration)));
  const ageC = Math.round(Math.min(80, Math.max(0, ageonset)));
  const naedC = Math.round(Math.min(9, Math.max(0, naed)));

  const ttrIdx = findIdx(TTR_VALUES, ttrC);
  const durIdx = findIdx(DUR_VALUES, durC);
  const ageIdx = findIdx(AGE_VALUES, ageC);
  if (ttrIdx < 0 || durIdx < 0 || ageIdx < 0) return null;

  const histfebPts   = histfeb === 'yes' ? 3.5 : 0;
  const nseizPtsRec  = nseizures === '10+' ? 3.0 : 0;
  const nseizPtsLong = nseizures === '10+' ? 2.5 : 0;
  const benignPts    = benign === 'yes' ? 0 : 5.5;
  const delayPts     = delay === 'yes' ? 2.0 : 0;
  // Only an epileptiform EEG carries points; 'normal' and 'notdone' both
  // score 0, matching the Lamberink model (a missing EEG is treated as normal).
  const eegPtsRec    = eeg === 'epileptiform' ? 4 : 0;
  const eegPtsLong   = eeg === 'epileptiform' ? 2 : 0;
  const sexPts       = sex === 'female' ? 1.5 : 0;
  const famhistPts   = famhist === 'yes' ? 2.0 : 0;
  const focalPts     = focal === 'yes' ? 3.0 : 0;

  const totalRec = TTR_PTS_REC[ttrIdx] + DUR_PTS_REC[durIdx] + AGE_PTS[ageIdx]
                 + histfebPts + nseizPtsRec + benignPts + delayPts + eegPtsRec;

  const totalLong = TTR_PTS_LONG[ttrIdx] + DUR_PTS_LONG[durIdx] + NAED_PTS_LONG[naedC]
                  + sexPts + famhistPts + nseizPtsLong + focalPts + eegPtsLong;

  const tr = Math.round(totalRec * 2) / 2;
  const tl = Math.round(totalLong * 2) / 2;

  return {
    scoreRec: tr,
    scoreLong: tl,
    risk2y: lookupRisk(tr, RISK_2Y),
    risk5y: lookupRisk(tr, RISK_5Y),
    riskLong: lookupRisk(tl, RISK_LONG),
  };
}

export function calcDai(inputs: DaiInputs): DaiResult {
  const {
    ageOnsetD, durationD, eegStart, eegAfter, febrile,
    intellectual, motor, nASM, focalOnly,
  } = inputs;

  let score = 0;
  if (ageOnsetD === '10+') score += 2;
  if (durationD === '3+') score += 2;
  if (eegAfter === 'abnormal') score += 3;
  if (eegStart === 'abnormal') score += 2;
  if (febrile === 'yes') score += 2;
  if (intellectual === 'yes') score += 2;
  if (motor === 'yes') score += 1;
  if (nASM === '2+') score += 2;
  if (focalOnly === 'yes') score += 1;

  let stratum: DaiResult['stratum'];
  let rr: string;
  let interp: string;
  if (score <= 3) {
    stratum = 'Low';
    rr = '1.0 (reference)';
    interp = 'Reference group. Lowest observed recurrence rate.';
  } else if (score <= 6) {
    stratum = 'Moderate';
    rr = '4.42 (95% CI 2.85–6.85)';
    interp = 'Approximately 4-fold higher recurrence vs low-risk.';
  } else {
    stratum = 'High';
    rr = '6.52 (95% CI 4.32–9.84)';
    interp = 'Approximately 6-fold higher recurrence vs low-risk.';
  }

  return { score, stratum, rr, interp, maxScore: 17 };
}
