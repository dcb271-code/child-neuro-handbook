import { describe, it, expect } from 'vitest';
import { calcPedSUDEP, calcSUDEP7, calcSUDEP3, type PedSUDEPInputs } from '../calculator';

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
  it('a SUDEP-associated gene on the non-trumped other-DEE category applies the ×1.3 multiplier', () => {
    const none = calcPedSUDEP({ ...pedBase, syndrome: 'other_dee', gtcFrequency: 'frequent', nocturnal: true, duration: 'medium' });
    const gene = calcPedSUDEP({ ...pedBase, syndrome: 'other_dee', geneticEtiology: 'sudep_gene', gtcFrequency: 'frequent', nocturnal: true, duration: 'medium' });
    expect(gene.rawRate).toBeCloseTo(none.rawRate * 1.3, 5);
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
  it('extreme profile saturates toward the ~15 asymptote (no hard ≥30 cap; ceiling lowered from 20)', () => {
    const r = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', gtcFrequency: 'very_frequent', nocturnal: true, supervision: 'alone', adherence: 'poor', duration: 'long' });
    expect(r.rawRate).toBeGreaterThan(30);     // uncapped multiplicative product remains high (~92)
    expect(r.displayLevel).toBe('ceiling');
    expect(r.displayRate).toBeLessThan(15);    // approaches but never reaches the asymptote
    expect(r.displayRate).toBeGreaterThan(14.9);
    expect(r.displayString).toBe(r.displayRate.toFixed(2));
  });
});

describe('calcPedSUDEP — modifiers', () => {
  it('supervision shared→alone multiplies risk 4× (0.5 vs 2.0)', () => {
    const shared = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', gtcFrequency: 'frequent', nocturnal: true, duration: 'medium', supervision: 'shared' });
    const alone = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', gtcFrequency: 'frequent', nocturnal: true, duration: 'medium', supervision: 'alone' });
    expect(alone.rawRate / shared.rawRate).toBeCloseTo(4, 5);
  });
  it('supervision is a 3-level scale: shared (0.5) < separate/intermittent (1.0 reference) < alone (2.0)', () => {
    const shared  = calcPedSUDEP({ ...pedBase, syndrome: 'focal_dre', gtcFrequency: 'frequent', supervision: 'shared' });
    const partial = calcPedSUDEP({ ...pedBase, syndrome: 'focal_dre', gtcFrequency: 'frequent', supervision: 'partial' });
    const alone   = calcPedSUDEP({ ...pedBase, syndrome: 'focal_dre', gtcFrequency: 'frequent', supervision: 'alone' });
    expect(partial.supervision.mult).toBe(1.0);
    expect(partial.rawRate / shared.rawRate).toBeCloseTo(2, 5);  // 1.0 vs 0.5
    expect(alone.rawRate / partial.rawRate).toBeCloseTo(2, 5);   // 2.0 vs 1.0
  });
  it('Dravet + SCN1A is unchanged — the SCN1A floor (0.25) is below Dravet (1.80), so not binding (no double-count)', () => {
    const none = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', gtcFrequency: 'frequent', nocturnal: true, duration: 'medium' });
    const scn1a = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', geneticEtiology: 'scn1a', gtcFrequency: 'frequent', nocturnal: true, duration: 'medium' });
    expect(scn1a.rawRate).toBeCloseTo(none.rawRate, 6);
    expect(scn1a.rawRate).toBeCloseTo(4.59, 2);
    expect(scn1a.geneticFloorApplied).toBe(true);
    expect(scn1a.geneticFloorBinding).toBe(false);
  });
  it('cardiac-overlap bucket multiplies a non-DEE phenotype by ×1.3 (capped ≤ SCN1A) and sets cardiacFlag', () => {
    const none = calcPedSUDEP({ ...pedBase, syndrome: 'focal_dre', gtcFrequency: 'frequent', nocturnal: true });
    const cardiac = calcPedSUDEP({ ...pedBase, syndrome: 'focal_dre', gtcFrequency: 'frequent', nocturnal: true, geneticEtiology: 'cardiac' });
    expect(cardiac.rawRate).toBeCloseTo(none.rawRate * 1.3, 5);
    expect(cardiac.cardiacFlag).toBe(true);
  });
  it('cardiacFlag is false for non-cardiac genes', () => {
    expect(calcPedSUDEP({ ...pedBase, geneticEtiology: 'sudep_gene' }).cardiacFlag).toBe(false);
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
    expect(severeDee.rawRate).toBeCloseTo(1.90 * 2.55, 5); // severe_dee assumes a severe channelopathy → SCN1A does NOT multiply
    expect(focal.rawRate).toBeCloseTo(1.20 * 1.4 * 2.55, 4); // focal+SCN1A: ×1.4 (strongest channelopathy), still < Dravet
  });

  it('SCN1A multiplies a GEFS+ phenotype by ×1.4 — above the floor on an active profile (drift guard)', () => {
    const bare  = calcPedSUDEP({ ...pedBase, ...STD, syndrome: 'gefs_mild', geneticEtiology: 'none' });
    const scn1a = calcPedSUDEP({ ...pedBase, ...STD, syndrome: 'gefs_mild', geneticEtiology: 'scn1a' });
    expect(bare.rawRate / 2.55).toBeCloseTo(0.30, 6);        // gene-agnostic GEFS+ baseline (raised to 0.30), unfloored
    expect(scn1a.rawRate).toBeGreaterThan(bare.rawRate);      // SCN1A raises it...
    expect(scn1a.rawRate).toBeCloseTo(0.30 * 1.4 * 2.55, 5);  // ...by ×1.4 → 1.071, just above the 1.0 floor
    expect(scn1a.geneticFloorBinding).toBe(false);            // the multiplier carried it above the floor
  });

  it('SCN1A floors a self-limited phenotype up to the 1.0/1000py final-rate floor', () => {
    const r = calcPedSUDEP({ ...pedBase, ...STD, syndrome: 'selflimited', geneticEtiology: 'scn1a' });
    expect(r.rawRate).toBeCloseTo(1.0, 6);               // 0.10 × ×1.4 × 2.55 = 0.357 < 1.0 → floored
    expect(r.geneticFloorBinding).toBe(true);
  });

  it('regression: drug-resistant focal + SCN1A is no longer the 10.71 Very-high artifact', () => {
    const r = calcPedSUDEP({ ...pedBase, ...STD, syndrome: 'focal_dre', geneticEtiology: 'scn1a' });
    expect(r.rawRate).toBeCloseTo(1.20 * 1.4 * 2.55, 4); // 4.28 — ×1.4 multiplier, far from the old 10.71 artifact
    expect(r.rawRate).toBeLessThan(10);
    expect(r.tier).toBe('High');
  });
});

describe('calcPedSUDEP — syndrome floor (high-mortality syndromes)', () => {
  // pedBase is the favorable default profile: rare GTC, no nocturnal, shared, good adherence, short duration
  it('Dravet with favorable-but-active factors is floored to 2.3 (Moderate), not 0.9 (Low)', () => {
    const r = calcPedSUDEP({ ...pedBase, syndrome: 'dravet' }); // rare GTC = still active disease
    expect(r.rawRate).toBeCloseTo(2.3, 5);
    expect(r.syndromeFloorApplied).toBe(true);
    expect(r.tier).toBe('Moderate');
  });
  it('severe non-Dravet DEE floors to 2.5, preserving severe-DEE > Dravet at the floor', () => {
    const dravet = calcPedSUDEP({ ...pedBase, syndrome: 'dravet' });
    const severe = calcPedSUDEP({ ...pedBase, syndrome: 'severe_dee' });
    expect(severe.rawRate).toBeCloseTo(2.5, 5);
    expect(severe.syndromeFloorApplied).toBe(true);
    expect(severe.rawRate).toBeGreaterThan(dravet.rawRate);
  });
  it('typical active Dravet (frequent nocturnal) is above the floor — floor inert', () => {
    const r = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', gtcFrequency: 'frequent', nocturnal: true, duration: 'medium' });
    expect(r.rawRate).toBeCloseTo(4.59, 2);
    expect(r.syndromeFloorApplied).toBe(false);
  });
  it('seizure-free Dravet (no GTCS past year) floors to the REMISSION floor (0.65×2.3=1.495), not full escape', () => {
    const r = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', gtcFrequency: 'none_pastyear' });
    expect(r.rawRate).toBeCloseTo(2.3 * 0.65, 5);   // channelopathy substrate persists; floor reduced, not deleted
    expect(r.syndromeFloorApplied).toBe(true);
    expect(r.floorIsRemission).toBe(true);
    expect(r.rawRate).toBeLessThan(2.3);             // still below the active floor
    expect(r.rawRate).toBeGreaterThan(0.4);          // but above general epilepsy — no longer 0.27
  });
  it('"No GTCS ever" Dravet also floors to the remission floor', () => {
    const r = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', gtcFrequency: 'never' });
    expect(r.rawRate).toBeCloseTo(2.3 * 0.65, 5);
    expect(r.floorIsRemission).toBe(true);
    expect(r.rawRate).toBeLessThan(2.3);
  });
  it('non-floor syndromes (focal DRE) are never floored, even with favorable factors', () => {
    const r = calcPedSUDEP({ ...pedBase, syndrome: 'focal_dre' });
    expect(r.syndromeFloorApplied).toBe(false);
  });
});

describe('calcPedSUDEP — high-end saturation (soft asymptote)', () => {
  it('leaves the calibrated range (≤10/1000py) unchanged — displayRate equals rawRate', () => {
    const r = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', gtcFrequency: 'frequent', nocturnal: true, duration: 'medium' }); // 4.59
    expect(r.rawRate).toBeCloseTo(4.59, 2);
    expect(r.displayRate).toBeCloseTo(r.rawRate, 6);
    expect(r.displayLevel).toBe('measurable');
  });
  it('compresses an above-knee value below the asymptote without flagging the saturating note (raw ~9.18 → ~8.91)', () => {
    const r = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', gtcFrequency: 'frequent', nocturnal: true, supervision: 'partial', duration: 'medium' });
    expect(r.rawRate).toBeCloseTo(9.18, 2);
    expect(r.displayRate).toBeLessThan(r.rawRate);   // saturation is applied above the knee (7)
    expect(r.displayRate).toBeCloseTo(8.91, 1);
    expect(r.ceilinged).toBe(false);                  // raw < asymptote(15), so no note yet
  });
  it('flags the saturating note once raw reaches the asymptote (raw ~18.4 → displayed ~13.07)', () => {
    const r = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', gtcFrequency: 'frequent', nocturnal: true, supervision: 'alone', duration: 'medium' });
    expect(r.rawRate).toBeCloseTo(18.36, 2);
    expect(r.displayRate).toBeLessThan(r.rawRate);
    expect(r.displayRate).toBeCloseTo(13.07, 1);
    expect(r.ceilinged).toBe(true);                   // raw ≥ asymptote(15)
  });
  it('diminishing returns: a far larger raw barely moves the displayed value near the asymptote', () => {
    const big  = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', gtcFrequency: 'very_frequent', nocturnal: true, supervision: 'alone' }); // raw 30.6
    const huge = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', gtcFrequency: 'very_frequent', nocturnal: true, supervision: 'alone', adherence: 'poor', duration: 'long' }); // raw 91.8
    expect(huge.rawRate).toBeGreaterThan(big.rawRate * 2);            // raw at least doubles (91.8 vs 30.6)
    expect(huge.displayRate - big.displayRate).toBeLessThan(0.5);     // displayed value barely changes
    expect(huge.displayRate).toBeLessThanOrEqual(15);                 // never exceeds the asymptote (approaches it)
  });
});

describe('calcPedSUDEP — SCN1A 1.0 final-rate floor (favorable modifiers cannot pull below it)', () => {
  it('GEFS+/SCN1A with rare GTCS + monitoring floors to 1.0 (a known-pathogenic SCN1A is never benign)', () => {
    // unfloored product = 0.30 × ×1.4 × rare(1.0) × shared(0.5) = 0.21 → floored to the 1.0 SCN1A floor
    const r = calcPedSUDEP({ ...pedBase, syndrome: 'gefs_mild', geneticEtiology: 'scn1a', gtcFrequency: 'rare', supervision: 'shared' });
    expect(r.rawRate).toBeCloseTo(1.0, 6);
    expect(r.geneticFloorApplied).toBe(true);
    expect(r.geneticFloorBinding).toBe(true);
    expect(r.tier).toBe('Moderate');
  });
  it('the floor is on the FINAL rate — an active-enough SCN1A profile rises above 1.0 on its own', () => {
    // 0.30 × ×1.4 × very_frequent(5) × nocturnal(1.7) × alone(2) = 7.14 — well above the floor, so it is inert
    const r = calcPedSUDEP({ ...pedBase, syndrome: 'gefs_mild', geneticEtiology: 'scn1a', gtcFrequency: 'very_frequent', nocturnal: true, supervision: 'alone' });
    expect(r.rawRate).toBeCloseTo(0.30 * 1.4 * 5 * 1.7 * 2, 5);
    expect(r.geneticFloorBinding).toBe(false);
  });
  it('seizure-freedom REDUCES the SCN1A floor (0.65×1.0=0.65) rather than eliminating it', () => {
    const r = calcPedSUDEP({ ...pedBase, syndrome: 'gefs_mild', geneticEtiology: 'scn1a', gtcFrequency: 'none_pastyear' });
    expect(r.rawRate).toBeCloseTo(1.0 * 0.65, 5);  // 0.30×1.4×0.3×0.5 = 0.063 < 0.65 → remission floor
    expect(r.floorIsRemission).toBe(true);
    expect(r.geneticFloorBinding).toBe(true);
  });
  it('Dravet + SCN1A: the 2.3 syndrome floor dominates the 1.0 gene floor (no double-count, gene floor not binding)', () => {
    const r = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', geneticEtiology: 'scn1a' }); // favorable → floored
    expect(r.rawRate).toBeCloseTo(2.3, 5);
    expect(r.syndromeFloorApplied).toBe(true);
    expect(r.geneticFloorBinding).toBe(false);
  });
  it('seizure-free Dravet + SCN1A uses the reduced syndrome remission floor (0.65×2.3), gene floor not binding', () => {
    const r = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', geneticEtiology: 'scn1a', gtcFrequency: 'none_pastyear' });
    expect(r.rawRate).toBeCloseTo(2.3 * 0.65, 5);   // syndrome remission floor (1.495) > gene remission floor (0.65)
    expect(r.floorIsRemission).toBe(true);
    expect(r.syndromeFloorApplied).toBe(true);
  });
});

describe('calcPedSUDEP — ceiling reserved for the genuinely extreme (knee 7 / asymptote 15)', () => {
  it('a serious-but-not-maximal Very-high case (Dravet frequent + nocturnal + alone) tops out well below the ceiling (~12)', () => {
    const r = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', gtcFrequency: 'frequent', nocturnal: true, supervision: 'alone' });
    expect(r.rawRate).toBeCloseTo(15.3, 2);
    expect(r.tier).toBe('Very high');
    expect(r.displayRate).toBeCloseTo(12.17, 1);
    expect(r.displayRate).toBeLessThan(13);          // nowhere near the 15 ceiling
  });
  it('only the maximally-stacked profile (very-freq + nocturnal + alone + nonadherent + long) approaches 15', () => {
    const max = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', gtcFrequency: 'very_frequent', nocturnal: true, supervision: 'alone', adherence: 'poor', duration: 'long' });
    expect(max.displayRate).toBeGreaterThan(14.9);
    expect(max.displayRate).toBeLessThan(15);
  });
  it('the Very-high tier (display ≥10) requires a genuinely high computed rate — adding "alone" crosses High → Very high', () => {
    const high     = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', gtcFrequency: 'frequent', nocturnal: true, supervision: 'partial' }); // raw 9.18
    const veryHigh = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', gtcFrequency: 'frequent', nocturnal: true, supervision: 'alone' });   // raw 15.3
    expect(high.tier).toBe('High');
    expect(veryHigh.tier).toBe('Very high');
  });
});

describe('calcPedSUDEP — SCN1A multiplies non-DEE phenotypes (×1.4), trumped on Dravet/severe-DEE', () => {
  it('adding SCN1A to an active focal DRE increases the rate (×1.4), staying below Dravet', () => {
    const std = { gtcFrequency: 'frequent', nocturnal: true, supervision: 'shared', duration: 'medium' } as const;
    const none   = calcPedSUDEP({ ...pedBase, syndrome: 'focal_dre', ...std });
    const scn1a  = calcPedSUDEP({ ...pedBase, syndrome: 'focal_dre', geneticEtiology: 'scn1a', ...std });
    const dravet = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', ...std });
    expect(scn1a.rawRate).toBeGreaterThan(none.rawRate);          // SCN1A visibly raises an active phenotype
    expect(scn1a.rawRate).toBeCloseTo(none.rawRate * 1.4, 5);     // by exactly ×1.4
    expect(scn1a.rawRate).toBeLessThan(dravet.rawRate);           // ordering invariant: focal+SCN1A < Dravet
    expect(scn1a.effectiveGeneMult).toBeCloseTo(1.4, 6);
  });
  it('adding SCN1A to an active GEFS+ increases the rate (×1.4)', () => {
    const std = { gtcFrequency: 'frequent', nocturnal: true, supervision: 'alone' } as const;
    const none  = calcPedSUDEP({ ...pedBase, syndrome: 'gefs_mild', ...std });
    const scn1a = calcPedSUDEP({ ...pedBase, syndrome: 'gefs_mild', geneticEtiology: 'scn1a', ...std });
    expect(scn1a.rawRate).toBeGreaterThan(none.rawRate);
    expect(scn1a.rawRate).toBeCloseTo(none.rawRate * 1.4, 5);
  });
  it('SCN1A does NOT multiply Dravet or severe-DEE — those baselines already assume the channelopathy', () => {
    const std = { gtcFrequency: 'frequent', nocturnal: true, supervision: 'alone' } as const;
    for (const syndrome of ['dravet', 'severe_dee'] as const) {
      const none  = calcPedSUDEP({ ...pedBase, syndrome, ...std });
      const scn1a = calcPedSUDEP({ ...pedBase, syndrome, geneticEtiology: 'scn1a', ...std });
      expect(scn1a.rawRate).toBeCloseTo(none.rawRate, 5);
      expect(scn1a.effectiveGeneMult).toBeCloseTo(1.0, 6);
    }
  });
  it('SCN1A still multiplies the non-trumped DEE categories (other-DEE, LGS) so the gene specifies etiology', () => {
    const std = { gtcFrequency: 'frequent', nocturnal: true, supervision: 'alone' } as const;
    for (const syndrome of ['other_dee', 'lgs'] as const) {
      const none  = calcPedSUDEP({ ...pedBase, syndrome, ...std });
      const scn1a = calcPedSUDEP({ ...pedBase, syndrome, geneticEtiology: 'scn1a', ...std });
      expect(scn1a.rawRate).toBeGreaterThan(none.rawRate);
      expect(scn1a.effectiveGeneMult).toBeCloseTo(1.4, 6);
    }
  });
});

describe('calcPedSUDEP — genetic ordering: SCN1A strongest, cardiac capped, Dravet/severe-DEE trump', () => {
  const std = { gtcFrequency: 'frequent', nocturnal: true, supervision: 'partial' } as const;
  const otherGenes = ['sudep_gene','cardiac','other_chan','other_ge'] as const;
  it('on a non-DEE phenotype, no single gene exceeds SCN1A', () => {
    const scn1a = calcPedSUDEP({ ...pedBase, syndrome: 'focal_dre', geneticEtiology: 'scn1a', ...std }).rawRate;
    for (const g of otherGenes) {
      const r = calcPedSUDEP({ ...pedBase, syndrome: 'focal_dre', geneticEtiology: g, ...std }).rawRate;
      expect(r).toBeLessThanOrEqual(scn1a + 1e-9);
    }
  });
  it('a non-SCN1A channelopathy still raises a non-DEE phenotype (×1.3), at/below SCN1A', () => {
    const none  = calcPedSUDEP({ ...pedBase, syndrome: 'focal_dre', ...std });
    const gene  = calcPedSUDEP({ ...pedBase, syndrome: 'focal_dre', geneticEtiology: 'sudep_gene', ...std });
    const scn1a = calcPedSUDEP({ ...pedBase, syndrome: 'focal_dre', geneticEtiology: 'scn1a', ...std });
    expect(gene.rawRate).toBeGreaterThan(none.rawRate);
    expect(gene.rawRate).toBeCloseTo(none.rawRate * 1.3, 5);
    expect(gene.rawRate).toBeLessThanOrEqual(scn1a.rawRate);
  });
  it('cardiac-overlap genes are capped at/below SCN1A but still raise the cardiac-eval flag', () => {
    const scn1a = calcPedSUDEP({ ...pedBase, syndrome: 'focal_dre', geneticEtiology: 'scn1a', ...std }).rawRate;
    const r = calcPedSUDEP({ ...pedBase, syndrome: 'focal_dre', geneticEtiology: 'cardiac', ...std });
    expect(r.rawRate).toBeLessThanOrEqual(scn1a + 1e-9);
    expect(r.cardiacFlag).toBe(true);
  });
  it('Dravet trumps every gene — adding any etiology leaves the Dravet rate unchanged', () => {
    const dravet = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', ...std }).rawRate;
    for (const g of ['scn1a', ...otherGenes] as const) {
      expect(calcPedSUDEP({ ...pedBase, syndrome: 'dravet', geneticEtiology: g, ...std }).rawRate).toBeCloseTo(dravet, 5);
    }
  });
  it('a cardiac gene on Dravet leaves the rate unchanged but still flags cardiac eval', () => {
    const dravet = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', ...std });
    const withCardiac = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', geneticEtiology: 'cardiac', ...std });
    expect(withCardiac.rawRate).toBeCloseTo(dravet.rawRate, 5);
    expect(withCardiac.cardiacFlag).toBe(true);
  });
  it('LGS + a gene never exceeds Dravet or severe-DEE (the ×1.4 cap keeps 1.20×1.4 < 1.80)', () => {
    const dravet = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', ...std }).rawRate;
    const severe = calcPedSUDEP({ ...pedBase, syndrome: 'severe_dee', ...std }).rawRate;
    for (const g of ['scn1a', ...otherGenes] as const) {
      const lgs = calcPedSUDEP({ ...pedBase, syndrome: 'lgs', geneticEtiology: g, ...std }).rawRate;
      expect(lgs).toBeLessThan(dravet);
      expect(lgs).toBeLessThan(severe);
    }
  });
});

describe('calcPedSUDEP — calibration anchors are reproduced (regression guard)', () => {
  const disp = (i: Partial<PedSUDEPInputs>) => calcPedSUDEP({ ...pedBase, ...i }).displayRate;
  it('general pediatric epilepsy ≈ 0.2 (AAN/AES 0.22)', () => {
    expect(disp({ syndrome: 'controlled', gtcFrequency: 'rare', supervision: 'shared' })).toBeCloseTo(0.20, 2);
  });
  it('pediatric DRE in the 1.1–1.5 band (Donner/Keller)', () => {
    const d = disp({ syndrome: 'focal_dre', gtcFrequency: 'rare', supervision: 'partial' });
    expect(d).toBeGreaterThanOrEqual(1.1);
    expect(d).toBeLessThanOrEqual(1.5);
  });
  it('Dravet monitored ≈ Donnan 4.4', () => {
    expect(disp({ syndrome: 'dravet', gtcFrequency: 'frequent', nocturnal: true, supervision: 'shared', duration: 'medium' })).toBeCloseTo(4.59, 1);
  });
  it('Dravet general/unmonitored sits in the 4.4–9.3 band near Cooper 9.3', () => {
    const d = disp({ syndrome: 'dravet', gtcFrequency: 'frequent', nocturnal: true, supervision: 'partial', duration: 'medium' });
    expect(d).toBeGreaterThan(8);
    expect(d).toBeLessThanOrEqual(9.3);
  });
  it('Tomson lowest stratum ≈ 0.05', () => {
    expect(disp({ syndrome: 'controlled', gtcFrequency: 'none_pastyear', supervision: 'shared' })).toBeLessThanOrEqual(0.1);
  });
  it('Tomson highest stratum (18.1) is intentionally capped near 15, not reproduced', () => {
    const d = disp({ syndrome: 'dravet', gtcFrequency: 'very_frequent', nocturnal: true, supervision: 'alone', adherence: 'poor', duration: 'long' });
    expect(d).toBeLessThan(15);
    expect(d).toBeGreaterThan(14.5);
  });
});

describe('calcPedSUDEP — confidence interval & evidence strength', () => {
  it('strong-evidence syndrome (Dravet) gives a tight ÷×1.8 band and "strong" label', () => {
    const r = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', gtcFrequency: 'frequent', nocturnal: true, supervision: 'shared', duration: 'medium' });
    expect(r.evidence).toBe('strong');
    expect(r.ciLow / r.displayRate).toBeCloseTo(1 / 1.8, 2);
    expect(r.ciHigh / r.displayRate).toBeCloseTo(1.8, 2);
  });
  it('a limited-evidence gene widens the band and downgrades the evidence label', () => {
    const strong   = calcPedSUDEP({ ...pedBase, syndrome: 'focal_dre', gtcFrequency: 'frequent', nocturnal: true });
    const withGene = calcPedSUDEP({ ...pedBase, syndrome: 'focal_dre', geneticEtiology: 'sudep_gene', gtcFrequency: 'frequent', nocturnal: true });
    expect(withGene.ciHigh / withGene.ciLow).toBeGreaterThan(strong.ciHigh / strong.ciLow);
    expect(withGene.evidence).toBe('limited');
  });
  it('a trumped gene does NOT widen the band — the gene does not contribute on Dravet', () => {
    const plain    = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', gtcFrequency: 'frequent', nocturnal: true });
    const withGene = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', geneticEtiology: 'cardiac', gtcFrequency: 'frequent', nocturnal: true });
    expect(withGene.ciLow).toBeCloseTo(plain.ciLow, 5);
    expect(withGene.ciHigh).toBeCloseTo(plain.ciHigh, 5);
    expect(withGene.evidence).toBe(plain.evidence);
  });
  it('the upper bound clamps at 20 (≈ Cooper/Tomson extreme) for max-stacked profiles', () => {
    const max = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', gtcFrequency: 'very_frequent', nocturnal: true, supervision: 'alone', adherence: 'poor', duration: 'long' });
    expect(max.ciHigh).toBeLessThanOrEqual(20);
    expect(max.ciHigh).toBeGreaterThan(15);   // band extends above the point ceiling toward ~18-20
  });
  it('the lower bound never drops below 0.01', () => {
    const r = calcPedSUDEP({ ...pedBase, syndrome: 'selflimited', gtcFrequency: 'never', supervision: 'shared' });
    expect(r.ciLow).toBeGreaterThanOrEqual(0.01);
  });
});
