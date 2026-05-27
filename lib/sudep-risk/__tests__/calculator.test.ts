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
  it('cardiac-overlap gene (KCNQ1/H2) multiplies the Dravet baseline by 4.0 and sets cardiacFlag', () => {
    // frequent + nocturnal keeps both well above the syndrome floor so the 4x ratio is clean
    const none = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', gtcFrequency: 'frequent', nocturnal: true });
    const cardiac = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', gtcFrequency: 'frequent', nocturnal: true, geneticEtiology: 'kcnq1_h2' });
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
    expect(severeDee.rawRate).toBeCloseTo(1.90 * 2.55, 5); // severe_dee (DEE) baseline x STD; SCN1A does NOT multiply DEE phenotypes
    expect(focal.rawRate).toBeCloseTo(1.20 * 1.3 * 2.55, 4); // focal+SCN1A: ×1.3 channelopathy multiplier (3.98), still < Dravet
  });

  it('SCN1A floors a GEFS+ phenotype to the 0.5/1000py final-rate floor (drift guard for the invariant)', () => {
    const bare  = calcPedSUDEP({ ...pedBase, ...STD, syndrome: 'gefs_mild', geneticEtiology: 'none' });
    const scn1a = calcPedSUDEP({ ...pedBase, ...STD, syndrome: 'gefs_mild', geneticEtiology: 'scn1a' });
    expect(bare.rawRate / 2.55).toBeCloseTo(0.15, 6);   // gene-agnostic GEFS+ baseline, unfloored (0.3825)
    expect(scn1a.rawRate).toBeGreaterThan(bare.rawRate); // SCN1A raises it...
    expect(scn1a.rawRate).toBeCloseTo(0.5, 6);           // 0.15 × ×1.3 × 2.55 = 0.497 < 0.5 → floored to 0.5
    expect(scn1a.geneticFloorBinding).toBe(true);
  });

  it('SCN1A floors a self-limited phenotype up to the 0.5/1000py final-rate floor', () => {
    const r = calcPedSUDEP({ ...pedBase, ...STD, syndrome: 'selflimited', geneticEtiology: 'scn1a' });
    expect(r.rawRate).toBeCloseTo(0.5, 6);               // 0.10 × ×1.3 × 2.55 = 0.332 < 0.5 → floored
    expect(r.geneticFloorBinding).toBe(true);
  });

  it('regression: drug-resistant focal + SCN1A is no longer the 10.71 Very-high artifact', () => {
    const r = calcPedSUDEP({ ...pedBase, ...STD, syndrome: 'focal_dre', geneticEtiology: 'scn1a' });
    expect(r.rawRate).toBeCloseTo(1.20 * 1.3 * 2.55, 4); // 3.98 — ×1.3 multiplier, far from the old 10.71 artifact
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
  it('genuinely seizure-free Dravet (no GTCS in past year) escapes the floor', () => {
    const r = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', gtcFrequency: 'none_pastyear' });
    expect(r.rawRate).toBeCloseTo(0.27, 6); // 1.8 * 0.3 * 0.5
    expect(r.syndromeFloorApplied).toBe(false);
    expect(r.rawRate).toBeLessThan(2.3);
  });
  it('"No GTCS ever" Dravet also escapes the floor', () => {
    const r = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', gtcFrequency: 'never' });
    expect(r.syndromeFloorApplied).toBe(false);
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
    const big  = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', gtcFrequency: 'frequent', nocturnal: true, supervision: 'alone', adherence: 'poor', duration: 'long' });
    const huge = calcPedSUDEP({ ...pedBase, syndrome: 'severe_dee', geneticEtiology: 'kcnq1_h2', gtcFrequency: 'very_frequent', nocturnal: true, supervision: 'alone', adherence: 'poor', duration: 'long' });
    expect(huge.rawRate).toBeGreaterThan(big.rawRate * 2);            // raw at least doubles
    expect(huge.displayRate - big.displayRate).toBeLessThan(0.5);     // displayed value barely changes
    expect(huge.displayRate).toBeLessThanOrEqual(15);                 // never exceeds the asymptote (approaches it)
  });
});

describe('calcPedSUDEP — SCN1A 0.5 final-rate floor (favorable modifiers cannot pull below it)', () => {
  it('GEFS+/SCN1A with rare GTCS + monitoring floors to 0.5 (was the ~0.13 favorable-modifier underestimate)', () => {
    // unfloored product = 0.15 * rare(1.0) * shared(0.5) = 0.075; the old 0.25 baseline-floor route landed ~0.13
    const r = calcPedSUDEP({ ...pedBase, syndrome: 'gefs_mild', geneticEtiology: 'scn1a', gtcFrequency: 'rare', supervision: 'shared' });
    expect(r.rawRate).toBeCloseTo(0.5, 6);
    expect(r.geneticFloorApplied).toBe(true);
    expect(r.geneticFloorBinding).toBe(true);
    expect(r.tier).toBe('Low');
  });
  it('the floor is on the FINAL rate — an active-enough SCN1A profile rises above 0.5 on its own', () => {
    // 0.15 × ×1.3 × very_frequent(5) × nocturnal(1.7) × alone(2) = 3.315 — well above the floor, so it is inert
    const r = calcPedSUDEP({ ...pedBase, syndrome: 'gefs_mild', geneticEtiology: 'scn1a', gtcFrequency: 'very_frequent', nocturnal: true, supervision: 'alone' });
    expect(r.rawRate).toBeCloseTo(0.15 * 1.3 * 5 * 1.7 * 2, 5);
    expect(r.geneticFloorBinding).toBe(false);
  });
  it('genuine seizure-freedom overrides the SCN1A floor (consistent with the syndrome floor)', () => {
    const r = calcPedSUDEP({ ...pedBase, syndrome: 'gefs_mild', geneticEtiology: 'scn1a', gtcFrequency: 'none_pastyear' });
    expect(r.rawRate).toBeLessThan(0.5);   // 0.15 * none_pastyear(0.3) * shared(0.5) = 0.0225, not floored
    expect(r.geneticFloorBinding).toBe(false);
  });
  it('Dravet + SCN1A: the 2.3 syndrome floor dominates the 0.5 gene floor (no double-count, gene floor not binding)', () => {
    const r = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', geneticEtiology: 'scn1a' }); // favorable → floored
    expect(r.rawRate).toBeCloseTo(2.3, 5);
    expect(r.syndromeFloorApplied).toBe(true);
    expect(r.geneticFloorBinding).toBe(false);
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

describe('calcPedSUDEP — SCN1A multiplies risk on non-DEE phenotypes (×1.3), not on DEE phenotypes', () => {
  it('adding SCN1A to an active focal DRE increases the rate (×1.3), staying below Dravet', () => {
    const std = { gtcFrequency: 'frequent', nocturnal: true, supervision: 'shared', duration: 'medium' } as const;
    const none   = calcPedSUDEP({ ...pedBase, syndrome: 'focal_dre', ...std });
    const scn1a  = calcPedSUDEP({ ...pedBase, syndrome: 'focal_dre', geneticEtiology: 'scn1a', ...std });
    const dravet = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', ...std });
    expect(scn1a.rawRate).toBeGreaterThan(none.rawRate);          // SCN1A now visibly raises an active phenotype
    expect(scn1a.rawRate).toBeCloseTo(none.rawRate * 1.3, 5);     // by exactly ×1.3
    expect(scn1a.rawRate).toBeLessThan(dravet.rawRate);           // ordering invariant: focal+SCN1A < Dravet
    expect(scn1a.effectiveGeneMult).toBeCloseTo(1.3, 6);
  });
  it('adding SCN1A to an active GEFS+ increases the rate (×1.3)', () => {
    const std = { gtcFrequency: 'frequent', nocturnal: true, supervision: 'alone' } as const;
    const none  = calcPedSUDEP({ ...pedBase, syndrome: 'gefs_mild', ...std });
    const scn1a = calcPedSUDEP({ ...pedBase, syndrome: 'gefs_mild', geneticEtiology: 'scn1a', ...std });
    expect(scn1a.rawRate).toBeGreaterThan(none.rawRate);
    expect(scn1a.rawRate).toBeCloseTo(none.rawRate * 1.3, 5);
  });
  it('SCN1A does NOT multiply DEE phenotypes — the phenotype already encodes the channelopathy', () => {
    const std = { gtcFrequency: 'frequent', nocturnal: true, supervision: 'alone' } as const;
    for (const syndrome of ['dravet', 'severe_dee', 'lgs', 'other_dee'] as const) {
      const none  = calcPedSUDEP({ ...pedBase, syndrome, ...std });
      const scn1a = calcPedSUDEP({ ...pedBase, syndrome, geneticEtiology: 'scn1a', ...std });
      expect(scn1a.rawRate).toBeCloseTo(none.rawRate, 5);   // no multiplier on DEE phenotypes
      expect(scn1a.effectiveGeneMult).toBeCloseTo(1.0, 6);
    }
  });
  it('non-floor channelopathy genes still multiply on every phenotype (unchanged)', () => {
    const none  = calcPedSUDEP({ ...pedBase, syndrome: 'focal_dre', gtcFrequency: 'frequent', nocturnal: true });
    const scn8a = calcPedSUDEP({ ...pedBase, syndrome: 'focal_dre', geneticEtiology: 'scn8a', gtcFrequency: 'frequent', nocturnal: true });
    expect(scn8a.rawRate).toBeCloseTo(none.rawRate * 3.0, 5);
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
