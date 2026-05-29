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
