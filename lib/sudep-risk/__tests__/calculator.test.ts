import { describe, it, expect } from 'vitest';
import { calcPedSUDEP, calcSUDEP7, calcSUDEP3 } from '../calculator';

const pedBase = {
  syndrome: 'controlled', geneticEtiology: 'none', gtcFrequency: 'rare',
  nocturnal: false, supervision: 'shared', adherence: 'good', duration: 'short',
} as const;

describe('calcPedSUDEP — calibration anchors', () => {
  it('controlled favorable profile ≈ 0.20/1000py (measurable, Low)', () => {
    const r = calcPedSUDEP({ ...pedBase });
    expect(r.rawRate).toBeCloseTo(0.20, 5);
    expect(r.displayString).toBe('0.20');
    expect(r.displayLevel).toBe('measurable');
    expect(r.tier).toBe('Low');
  });
  it('typical Dravet (frequent nocturnal GTCS, supervised, 5-15y) ≈ 4.59/1000py (High)', () => {
    const r = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', gtcFrequency: 'frequent', nocturnal: true, duration: 'medium' });
    expect(r.rawRate).toBeCloseTo(4.59, 2);
    expect(r.displayString).toBe('4.59');
    expect(r.tier).toBe('High');
  });
  it('SCN8A-DEE typical profile ≈ 6.12/1000py', () => {
    const r = calcPedSUDEP({ ...pedBase, syndrome: 'other_dee', geneticEtiology: 'scn8a', gtcFrequency: 'frequent', nocturnal: true, duration: 'medium' });
    expect(r.rawRate).toBeCloseTo(6.12, 2);
  });
});

describe('calcPedSUDEP — threshold display logic', () => {
  it('raw < 0.01 → "<0.01" (lowest_plausible / Extremely low)', () => {
    const r = calcPedSUDEP({ ...pedBase, syndrome: 'selflimited', gtcFrequency: 'never' });
    expect(r.rawRate).toBeCloseTo(0.0075, 6);
    expect(r.displayLevel).toBe('lowest_plausible');
    expect(r.displayString).toBe('<0.01');
    expect(r.annualPrefix).toBe('<');
    expect(r.tier).toBe('Extremely low');
    expect(r.belowDetection).toBe(true);
  });
  it('0.01 ≤ raw < 0.05 → "≤0.05" (detection_limit / Very low)', () => {
    const r = calcPedSUDEP({ ...pedBase, syndrome: 'selflimited', gtcFrequency: 'none_pastyear' });
    expect(r.rawRate).toBeCloseTo(0.015, 6);
    expect(r.displayLevel).toBe('detection_limit');
    expect(r.displayString).toBe('≤0.05');
    expect(r.tier).toBe('Very low');
  });
  it('raw ≥ 30 → ceiling "≥30"', () => {
    const r = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', gtcFrequency: 'very_frequent', nocturnal: true, supervision: 'alone', adherence: 'poor', duration: 'long' });
    expect(r.rawRate).toBeGreaterThan(30);
    expect(r.displayLevel).toBe('ceiling');
    expect(r.displayString).toBe('≥30');
    expect(r.displayRate).toBe(30);
  });
});

describe('calcPedSUDEP — modifiers', () => {
  it('supervision shared→alone multiplies risk 4× (0.5 vs 2.0)', () => {
    const shared = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', gtcFrequency: 'frequent', nocturnal: true, duration: 'medium', supervision: 'shared' });
    const alone = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', gtcFrequency: 'frequent', nocturnal: true, duration: 'medium', supervision: 'alone' });
    expect(alone.rawRate / shared.rawRate).toBeCloseTo(4, 5);
  });
  it('Dravet + SCN1A is unchanged — the SCN1A floor (0.25) is below Dravet (1.80), so not binding (no double-count)', () => {
    const none = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', gtcFrequency: 'frequent', nocturnal: true, duration: 'medium' });
    const scn1a = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', geneticEtiology: 'scn1a', gtcFrequency: 'frequent', nocturnal: true, duration: 'medium' });
    expect(scn1a.rawRate).toBeCloseTo(none.rawRate, 6);
    expect(scn1a.rawRate).toBeCloseTo(4.59, 2);
    expect(scn1a.geneticFloorApplied).toBe(true);
    expect(scn1a.geneticFloorBinding).toBe(false);
  });
  it('cardiac-overlap gene (KCNQ1/H2) is NOT suppressed in Dravet and sets cardiacFlag', () => {
    const none = calcPedSUDEP({ ...pedBase, syndrome: 'dravet' });
    const cardiac = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', geneticEtiology: 'kcnq1_h2' });
    expect(cardiac.rawRate).toBeCloseTo(none.rawRate * 4.0, 5);
    expect(cardiac.cardiacFlag).toBe(true);
  });
  it('cardiacFlag is false for non-cardiac genes', () => {
    expect(calcPedSUDEP({ ...pedBase, geneticEtiology: 'scn8a' }).cardiacFlag).toBe(false);
  });
});

describe('calcSUDEP7', () => {
  const s7 = (o: Partial<Parameters<typeof calcSUDEP7>[0]> = {}) => calcSUDEP7({
    gtcMore3: false, gtc1plus: false, anySzPastYear: false, sz50plus: false,
    dur30plus: false, asm3plus: false, idDD: false, ...o,
  });
  it('all-false = 0, lowest quartile, max 10', () => {
    const r = s7();
    expect(r.total).toBe(0);
    expect(r.max).toBe(10);
    expect(r.quartile).toContain('Lowest');
  });
  it('gtcMore3 suppresses the 1-pt gtc1plus item (still 2, not 3)', () => {
    expect(s7({ gtcMore3: true, gtc1plus: true }).total).toBe(2);
  });
  it('sz50plus suppresses the 1-pt anySz item (still 2, not 3)', () => {
    expect(s7({ sz50plus: true, anySzPastYear: true }).total).toBe(2);
  });
  it('reproduces a total of 4 (gtcMore3 2 + idDD 2) → upper-middle quartile', () => {
    const r = s7({ gtcMore3: true, idDD: true });
    expect(r.total).toBe(4);
    expect(r.quartile).toContain('Upper-middle');
  });
  it('reproduces a total of 6 (gtcMore3 2 + dur30plus 3 + asm3plus 1) → highest quartile', () => {
    const r = s7({ gtcMore3: true, dur30plus: true, asm3plus: true });
    expect(r.total).toBe(6);
    expect(r.quartile).toContain('Highest');
  });
  it('practical maximum is 10 with all items set (exclusion rules cap it)', () => {
    expect(s7({ gtcMore3: true, gtc1plus: true, anySzPastYear: true, sz50plus: true, dur30plus: true, asm3plus: true, idDD: true }).total).toBe(10);
  });
});

describe('calcSUDEP3', () => {
  const s3 = (o: Partial<Parameters<typeof calcSUDEP3>[0]> = {}) => calcSUDEP3({
    gtcsPastYear: false, anySzPastYear: false, idDD: false, ...o,
  });
  it('all-false = 0, reference, max 4', () => {
    const r = s3();
    expect(r.score).toBe(0);
    expect(r.max).toBe(4);
    expect(r.stratum).toContain('Reference');
  });
  it('idDD weighted 2 → intermediate', () => {
    const r = s3({ idDD: true });
    expect(r.score).toBe(2);
    expect(r.stratum).toBe('Intermediate');
  });
  it('all three set = 4 → highest', () => {
    const r = s3({ gtcsPastYear: true, anySzPastYear: true, idDD: true });
    expect(r.score).toBe(4);
    expect(r.stratum).toBe('Highest');
  });
});

const STD = {
  gtcFrequency: 'frequent', nocturnal: true, supervision: 'shared',
  adherence: 'good', duration: 'medium',
} as const;
// STD clinical product = 2.5 * 1.7 * 0.5 * 1.0 * 1.2 = 2.55

describe('calcPedSUDEP — SCN1A floor + phenotype ordering', () => {
  it('enforces severe-DEE > Dravet > focal+SCN1A > GEFS++SCN1A on a fixed clinical profile', () => {
    const severeDee = calcPedSUDEP({ ...pedBase, ...STD, syndrome: 'severe_dee', geneticEtiology: 'scn1a' });
    const dravet    = calcPedSUDEP({ ...pedBase, ...STD, syndrome: 'dravet' });
    const focal     = calcPedSUDEP({ ...pedBase, ...STD, syndrome: 'focal_dre', geneticEtiology: 'scn1a' });
    const gefs      = calcPedSUDEP({ ...pedBase, ...STD, syndrome: 'gefs_mild', geneticEtiology: 'scn1a' });
    expect(severeDee.rawRate).toBeGreaterThan(dravet.rawRate);
    expect(dravet.rawRate).toBeGreaterThan(focal.rawRate);
    expect(focal.rawRate).toBeGreaterThan(gefs.rawRate);
    expect(severeDee.rawRate).toBeCloseTo(4.85, 2);
    expect(focal.rawRate).toBeCloseTo(3.06, 2);
  });

  it('SCN1A adds risk to a GEFS+ phenotype — floor 0.25 exceeds the 0.15 GEFS+ baseline (drift guard for the invariant)', () => {
    const bare  = calcPedSUDEP({ ...pedBase, ...STD, syndrome: 'gefs_mild', geneticEtiology: 'none' });
    const scn1a = calcPedSUDEP({ ...pedBase, ...STD, syndrome: 'gefs_mild', geneticEtiology: 'scn1a' });
    expect(scn1a.rawRate).toBeGreaterThan(bare.rawRate);
    expect(bare.rawRate  / 2.55).toBeCloseTo(0.15, 6);
    expect(scn1a.rawRate / 2.55).toBeCloseTo(0.25, 6);
    expect(scn1a.geneticFloorBinding).toBe(true);
  });

  it('SCN1A floors a self-limited phenotype up to the GEFS+-with-SCN1A level (0.25)', () => {
    const r = calcPedSUDEP({ ...pedBase, ...STD, syndrome: 'selflimited', geneticEtiology: 'scn1a' });
    expect(r.rawRate / 2.55).toBeCloseTo(0.25, 6);
    expect(r.geneticFloorBinding).toBe(true);
  });

  it('regression: drug-resistant focal + SCN1A is no longer the 10.71 Very-high artifact', () => {
    const r = calcPedSUDEP({ ...pedBase, ...STD, syndrome: 'focal_dre', geneticEtiology: 'scn1a' });
    expect(r.rawRate).toBeCloseTo(3.06, 2);
    expect(r.rawRate).toBeLessThan(10);
    expect(r.tier).toBe('High');
  });
});
