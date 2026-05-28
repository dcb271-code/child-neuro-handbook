import { describe, it, expect } from 'vitest';
import {
  calcSarnat, calcThompson, assessTHEligibility,
  type SarnatInputs, type ThompsonInputs, type THEligibilityInputs
} from '../calculator';

const sarnatBase: SarnatInputs = {
  consciousness: 'normal', spontActivity: 'normal', posture: 'normal',
  tone: 'normal', primitiveReflexes: 'normal', autonomic: 'normal',
  seizures: false,
};
const thompsonBase: ThompsonInputs = {
  tone: 'n', loc: 'n', fits: 'n', posture: 'n', moro: 'n',
  grasp: 'n', suck: 'n', respiration: 'n', fontanelle: 'n',
};
// A fully-qualifying eligibility profile: term, sufficient BW, within the 6-h
// window, Path A satisfied (pH ≤7.0), moderate encephalopathy, no contraindications.
const eligBase: THEligibilityInputs = {
  gestationalAge: 39, birthWeight: 3200, ageHours: 2,
  ph: 'le_7', baseDeficit: 'unknown', apgar10: 'gt_5',
  assistedVent10min: false, acutePerinatalEvent: false,
  sarnatStage: 'moderate', thompsonScore: 12, contraindications: false,
};

describe('calcSarnat — staging', () => {
  it('all-normal exam → no encephalopathy, does not meet TH', () => {
    const r = calcSarnat(sarnatBase);
    expect(r.stage).toBe('normal');
    expect(r.meetsThCriteria).toBe(false);
    expect(r.abnormalCount).toBe(0);
  });
  it('a single "mild" finding → Stage I (mild), still does not meet TH', () => {
    const r = calcSarnat({ ...sarnatBase, consciousness: 'mild' });
    expect(r.stage).toBe('mild');
    expect(r.meetsThCriteria).toBe(false);
    expect(r.abnormalCount).toBe(1);
  });
  it('3 domains in moderate range → Stage II (moderate), meets TH', () => {
    const r = calcSarnat({ ...sarnatBase, consciousness: 'moderate', tone: 'moderate', posture: 'moderate' });
    expect(r.stage).toBe('moderate');
    expect(r.meetsThCriteria).toBe(true);
    expect(r.moderateOrSevereCount).toBe(3);
  });
  it('only 2 domains in moderate range → still Stage I (mild), not TH-eligible', () => {
    const r = calcSarnat({ ...sarnatBase, consciousness: 'moderate', tone: 'moderate' });
    expect(r.stage).toBe('mild');
    expect(r.meetsThCriteria).toBe(false);
  });
  it('any single severe (3) domain triggers Stage III, meets TH', () => {
    const r = calcSarnat({ ...sarnatBase, autonomic: 'severe' });
    expect(r.stage).toBe('severe');
    expect(r.maxSeverity).toBe(3);
    expect(r.meetsThCriteria).toBe(true);
  });
  it('seizures alone → meets TH (Stage II–III)', () => {
    const r = calcSarnat({ ...sarnatBase, seizures: true });
    expect(r.stage).toBe('moderate_severe');
    expect(r.meetsThCriteria).toBe(true);
  });
});

describe('calcThompson — scoring', () => {
  it('all-normal items → score 0, Mild category', () => {
    const r = calcThompson(thompsonBase);
    expect(r.total).toBe(0);
    expect(r.max).toBe(22);
    expect(r.category).toContain('Mild');
  });
  it('practical maximum is 22 (some items cap at 2)', () => {
    // Items maxing at 3: tone(3), loc(3), posture(3), respiration(3) = 12
    // Items maxing at 2: fits(2), moro(2), grasp(2), suck(2), fontanelle(2) = 10
    const r = calcThompson({
      tone: 'f', loc: 'c', fits: 'h', posture: 'd', moro: 'a',
      grasp: 'a', suck: 'a', respiration: 'v', fontanelle: 't',
    });
    expect(r.total).toBe(22);
    expect(r.category).toContain('Severe');
  });
  it('score 11 lands in Moderate (11–14)', () => {
    // tone hypo(2) + loc lethargic(2) + posture distal flex(2) + respiration apnea(2)
    // + moro absent(2) + fits <3/day(1) = 11
    const r = calcThompson({ ...thompsonBase, tone: 'lo', loc: 'l', posture: 's', respiration: 'a', moro: 'a', fits: 'l' });
    expect(r.total).toBe(11);
    expect(r.category).toContain('Moderate');
  });
  it('score 15 lands in Severe (≥15)', () => {
    // 3+3+3+3+1+1+1 = 15
    const r = calcThompson({ ...thompsonBase, tone: 'f', loc: 'c', posture: 'd', respiration: 'v', moro: 'p', fits: 'l', grasp: 'p' });
    expect(r.total).toBe(15);
    expect(r.category).toContain('Severe');
  });
  it('returns per-item results matching the inputs', () => {
    const r = calcThompson({ ...thompsonBase, tone: 'lo' });
    const tone = r.itemResults.find(i => i.id === 'tone');
    expect(tone?.score).toBe(2);
    expect(tone?.valueLabel).toBe('Hypo');
  });
});

describe('assessTHEligibility — Path A (biochemical)', () => {
  it('pH ≤7.0 alone satisfies Path A — eligible (no Path B needed)', () => {
    const r = assessTHEligibility(eligBase);
    expect(r.eligible).toBe(true);
    expect(r.criterionA).toBe(true);
    expect(r.criterionAReason).toContain('pH');
    expect(r.criterionB).toBe(false);  // not needed; Path A already met
  });
  it('base deficit ≥16 alone satisfies Path A', () => {
    const r = assessTHEligibility({ ...eligBase, ph: 'gt_7.15', baseDeficit: 'ge_16' });
    expect(r.criterionA).toBe(true);
    expect(r.criterionAReason).toContain('base deficit');
    expect(r.eligible).toBe(true);
  });
  it('benign biochem (pH >7.15 and BD <10) → Path A fails', () => {
    const r = assessTHEligibility({ ...eligBase, ph: 'gt_7.15', baseDeficit: 'lt_10' });
    expect(r.criterionA).toBe(false);
  });
});

describe('assessTHEligibility — Path B (alternative)', () => {
  // Start from eligBase but flip pH out of the qualifying zone so Path A fails.
  const noPathA = { ...eligBase, ph: '7.01-7.15' as const, baseDeficit: '10-15.9' as const };
  it('intermediate biochem + Apgar ≤5 + sentinel event → Path B met → eligible', () => {
    const r = assessTHEligibility({ ...noPathA, apgar10: 'le_5', acutePerinatalEvent: true });
    expect(r.criterionA).toBe(false);
    expect(r.criterionB).toBe(true);
    expect(r.eligible).toBe(true);
  });
  it('intermediate biochem + assisted vent ≥10 min + sentinel event → Path B met', () => {
    const r = assessTHEligibility({ ...noPathA, assistedVent10min: true, acutePerinatalEvent: true });
    expect(r.criterionB).toBe(true);
    expect(r.eligible).toBe(true);
  });
  it('NO blood gas available + clinical trigger + sentinel event → Path B met', () => {
    const r = assessTHEligibility({ ...eligBase, ph: 'unknown', baseDeficit: 'unknown',
      apgar10: 'le_5', acutePerinatalEvent: true });
    expect(r.biochemTriggerForB).toBe(true);
    expect(r.criterionB).toBe(true);
    expect(r.eligible).toBe(true);
  });
  it('Path B requires ALL three sub-criteria — sentinel event alone is not enough', () => {
    const r = assessTHEligibility({ ...noPathA, apgar10: 'gt_5', assistedVent10min: false,
      acutePerinatalEvent: true });
    expect(r.criterionB).toBe(false);
    expect(r.clinicalTriggerForB).toBe(false);
    expect(r.eligible).toBe(false);
  });
  it('Path B requires ALL three — clinical trigger without sentinel event is not enough', () => {
    const r = assessTHEligibility({ ...noPathA, apgar10: 'le_5', acutePerinatalEvent: false });
    expect(r.clinicalTriggerForB).toBe(true);
    expect(r.sentinelEventForB).toBe(false);
    expect(r.criterionB).toBe(false);
  });
  it('biochem out of intermediate zone (pH >7.15) blocks the Path B trigger even with clinical+sentinel', () => {
    const r = assessTHEligibility({ ...eligBase, ph: 'gt_7.15', baseDeficit: 'lt_10',
      apgar10: 'le_5', acutePerinatalEvent: true });
    expect(r.biochemTriggerForB).toBe(false);
    expect(r.criterionB).toBe(false);
    expect(r.eligible).toBe(false);
  });
});

describe('assessTHEligibility — gates', () => {
  it('GA <35 wk is a hard block', () => {
    const r = assessTHEligibility({ ...eligBase, gestationalAge: 34 });
    expect(r.eligible).toBe(false);
    expect(r.eligibleGA).toBe(false);
    expect(r.gaCaseByCase).toBe(false);
    expect(r.reasons.join(' ')).toContain('35 weeks');
  });
  it('GA 35w0d–35w6d is case-by-case: eligible WITH warning, not blocked', () => {
    const r = assessTHEligibility({ ...eligBase, gestationalAge: 35.5 });
    expect(r.eligibleGA).toBe(false);
    expect(r.gaCaseByCase).toBe(true);
    expect(r.eligible).toBe(true);
    expect(r.warnings.join(' ')).toContain('35w0d');
  });
  it('GA ≥36 has no GA warning', () => {
    const r = assessTHEligibility({ ...eligBase, gestationalAge: 39 });
    expect(r.eligibleGA).toBe(true);
    expect(r.gaCaseByCase).toBe(false);
  });
  it('birth weight ≤1800 g blocks eligibility', () => {
    const r = assessTHEligibility({ ...eligBase, birthWeight: 1800 });
    expect(r.eligibleBW).toBe(false);
    expect(r.eligible).toBe(false);
  });
  it('age >24 h is a hard block', () => {
    const r = assessTHEligibility({ ...eligBase, ageHours: 30 });
    expect(r.eligible).toBe(false);
    expect(r.eligibleAge).toBe(false);
    expect(r.ageExtendedWindow).toBe(false);
  });
  it('age 6–24 h is the extended window: eligible WITH warning, not blocked', () => {
    const r = assessTHEligibility({ ...eligBase, ageHours: 12 });
    expect(r.eligibleAge).toBe(false);
    expect(r.ageExtendedWindow).toBe(true);
    expect(r.eligible).toBe(true);
    expect(r.warnings.join(' ')).toContain('6–24');
  });
});

describe('assessTHEligibility — encephalopathy & contraindications', () => {
  it('mild Sarnat + low Thompson → encephalopathy threshold not met → ineligible', () => {
    const r = assessTHEligibility({ ...eligBase, sarnatStage: 'mild', thompsonScore: 5 });
    expect(r.encephalopathyMet).toBe(false);
    expect(r.eligible).toBe(false);
  });
  it('Thompson ≥7 alone meets the encephalopathy threshold even when Sarnat is mild', () => {
    const r = assessTHEligibility({ ...eligBase, sarnatStage: 'mild', thompsonScore: 7 });
    expect(r.encephalopathyMet).toBe(true);
    expect(r.eligible).toBe(true);
  });
  it('a contraindication blocks eligibility even when everything else qualifies', () => {
    const r = assessTHEligibility({ ...eligBase, contraindications: true });
    expect(r.eligible).toBe(false);
    expect(r.reasons.join(' ')).toContain('Contraindication');
  });
});
