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
const eligBase: THEligibilityInputs = {
  gestationalAge: 39, ageHours: 2, hasEvidence: true,
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

describe('assessTHEligibility', () => {
  it('all criteria met → eligible, no reasons', () => {
    const r = assessTHEligibility(eligBase);
    expect(r.eligible).toBe(true);
    expect(r.reasons).toHaveLength(0);
  });
  it('preterm (<36 wk) → ineligible with GA reason', () => {
    const r = assessTHEligibility({ ...eligBase, gestationalAge: 34 });
    expect(r.eligible).toBe(false);
    expect(r.eligibleGA).toBe(false);
    expect(r.reasons.join(' ')).toContain('<36 weeks');
  });
  it('outside the 6-hour cooling window → ineligible', () => {
    const r = assessTHEligibility({ ...eligBase, ageHours: 8 });
    expect(r.eligible).toBe(false);
    expect(r.eligibleAge).toBe(false);
    expect(r.reasons.join(' ')).toContain('6 hours');
  });
  it('no documented perinatal HI event → ineligible', () => {
    const r = assessTHEligibility({ ...eligBase, hasEvidence: false });
    expect(r.eligible).toBe(false);
    expect(r.physiologicCriteria).toBe(false);
  });
  it('mild Sarnat + low Thompson → encephalopathy threshold not met', () => {
    const r = assessTHEligibility({ ...eligBase, sarnatStage: 'mild', thompsonScore: 5 });
    expect(r.eligible).toBe(false);
    expect(r.encephalopathyCriteria).toBe(false);
  });
  it('Thompson ≥7 alone meets the encephalopathy threshold even when Sarnat is mild', () => {
    const r = assessTHEligibility({ ...eligBase, sarnatStage: 'mild', thompsonScore: 7 });
    expect(r.encephalopathyCriteria).toBe(true);
    expect(r.eligible).toBe(true);
  });
  it('a contraindication blocks eligibility even when everything else qualifies', () => {
    const r = assessTHEligibility({ ...eligBase, contraindications: true });
    expect(r.eligible).toBe(false);
    expect(r.reasons.join(' ')).toContain('Contraindication');
  });
});
