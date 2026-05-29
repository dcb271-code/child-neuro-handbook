import { describe, it, expect } from 'vitest';
import { mgFor } from '../calculator';

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
