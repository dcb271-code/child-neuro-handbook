import { describe, it, expect } from 'vitest';
import { mgFor, calcDiastatPR } from '../calculator';
import { recommendStabilization } from '../calculator';

describe('mgFor — dose math with cap', () => {
  it('returns mgPerKg × weightKg when below cap', () => {
    expect(mgFor(0.1, 15, 4)).toEqual({ mg: 1.5, hitCap: false });
  });
  it('clips at maxCap and sets hitCap=true', () => {
    expect(mgFor(0.1, 50, 4)).toEqual({ mg: 4, hitCap: true });
  });
  it('rounds to one decimal for clinically-meaningful precision', () => {
    expect(mgFor(0.15, 7.3, 10).mg).toBeCloseTo(1.1, 1);
  });
});

describe('calcDiastatPR — institutional per-age chart', () => {
  it('6–12 mo, 5–9.9 kg → 2.5 mg', () => {
    expect(calcDiastatPR('28d-1y', 8)).toBe(2.5);
  });
  it('6–12 mo, ≥10 kg → 5 mg', () => {
    expect(calcDiastatPR('28d-1y', 10)).toBe(5);
  });
  it('1–5 y → 0.5 mg/kg', () => {
    expect(calcDiastatPR('1-5y', 15)).toBe(7.5);
  });
  it('6–11 y → 0.3 mg/kg', () => {
    expect(calcDiastatPR('6-11y', 25)).toBe(7.5);
  });
  it('≥12 y → 0.2 mg/kg', () => {
    expect(calcDiastatPR('ge_12y', 60)).toBe(12);
  });
});

describe('recommendStabilization — Phase 1 (0–5 min)', () => {
  it('returns the 5 checklist items in fixed order', () => {
    const items = recommendStabilization();
    expect(items.map(i => i.id)).toEqual(['abc','glucose','iv_io','labs','asm_levels']);
    expect(items).toHaveLength(5);
  });
});

import { recommendFirstLine } from '../calculator';
import type { PatientInputs } from '../calculator';

const pBase: PatientInputs = {
  weightKg: 15, ageBand: '1-5y', ivAccess: true, isNeonate: false, flags: []
};

describe('recommendFirstLine — Phase 2 (5–20 min)', () => {
  it('IV access: ranks lorazepam IV first, diazepam IV second', () => {
    const r = recommendFirstLine(pBase);
    expect(r[0].drug).toBe('lorazepam');
    expect(r[0].route).toBe('IV');
    expect(r[0].mg).toBeCloseTo(1.5);            // 0.1 × 15
    expect(r[1].drug).toBe('diazepam');
    expect(r[1].route).toBe('IV');
  });
  it('IV access caps lorazepam at 4 mg for heavy patients', () => {
    const r = recommendFirstLine({ ...pBase, weightKg: 60 });
    const loraz = r[0];
    expect(loraz.mg).toBe(4);
    expect(loraz.hitCap).toBe(true);
  });
  it('no IV access: returns midazolam IM, midazolam IN, and diazepam PR (no IV benzos)', () => {
    const r = recommendFirstLine({ ...pBase, ivAccess: false });
    const drugs = r.map(d => `${d.drug}/${d.route}`);
    expect(drugs).toContain('midazolam/IM');
    expect(drugs).toContain('midazolam/IN');
    expect(drugs).toContain('diazepam/PR');
    expect(drugs.some(d => d.endsWith('/IV'))).toBe(false);
  });
  it('no IV access: midazolam IM is weight-banded (5 mg for 13–40 kg)', () => {
    const r = recommendFirstLine({ ...pBase, ivAccess: false, weightKg: 25 });
    expect(r.find(d => d.drug === 'midazolam' && d.route === 'IM')!.mg).toBe(5);
  });
  it('no IV access: midazolam IM is 10 mg for >40 kg', () => {
    const r = recommendFirstLine({ ...pBase, ivAccess: false, weightKg: 50 });
    expect(r.find(d => d.drug === 'midazolam' && d.route === 'IM')!.mg).toBe(10);
  });
  it('diazepam PR uses the age-band chart (1–5 y, 15 kg → 7.5 mg)', () => {
    const r = recommendFirstLine({ ...pBase, ivAccess: false, weightKg: 15 });
    expect(r.find(d => d.drug === 'diazepam' && d.route === 'PR')!.mg).toBe(7.5);
  });
});
