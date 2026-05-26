import { describe, it, expect } from 'vitest';
import { calcLamberink, calcDai } from '../calculator';

describe('calcLamberink — published worked examples', () => {
  // Lamberink 2017 worked example A (recurrence):
  // child, onset 3y, duration 1y, seizure-free interval 2y, no self-limiting syndrome.
  it('reproduces 28% (2y) and 36% (5y) recurrence', () => {
    const r = calcLamberink({
      duration: 1, ttr: 2, naed: 1, ageonset: 3,
      sex: 'male', famhist: 'no', histfeb: 'no', nseizures: '0-9',
      benign: 'no', delay: 'no', focal: 'no', eeg: 'normal',
    });
    expect(r).not.toBeNull();
    expect(r!.risk2y).toBe(28);
    expect(r!.risk5y).toBe(36);
  });

  // Lamberink 2017 worked example B (long-term freedom):
  // female, duration 1y, seizure-free interval 2y, 1 ASM.
  it('reproduces 97% 10-year sustained seizure freedom', () => {
    const r = calcLamberink({
      duration: 1, ttr: 2, naed: 1, ageonset: 5,
      sex: 'female', famhist: 'no', histfeb: 'no', nseizures: '0-9',
      benign: 'no', delay: 'no', focal: 'no', eeg: 'normal',
    });
    expect(r).not.toBeNull();
    expect(r!.riskLong).toBe(97);
  });

  it('clamps out-of-range inputs without crashing', () => {
    const r = calcLamberink({
      duration: 999, ttr: -5, naed: 50, ageonset: 200,
      sex: 'male', famhist: 'no', histfeb: 'no', nseizures: '0-9',
      benign: 'no', delay: 'no', focal: 'no', eeg: 'normal',
    });
    expect(r).not.toBeNull();
  });
});

describe('calcDai — strata boundaries', () => {
  const base = {
    ageOnsetD: '<10', durationD: '<3', eegStart: 'normal', eegAfter: 'normal',
    febrile: 'no', intellectual: 'no', motor: 'no', nASM: '1', focalOnly: 'no',
  } as const;

  it('score 0 → Low', () => {
    const r = calcDai({ ...base });
    expect(r.score).toBe(0);
    expect(r.stratum).toBe('Low');
  });

  it('score 3 → Low (upper edge)', () => {
    const r = calcDai({ ...base, eegStart: 'abnormal', motor: 'yes' }); // 2 + 1 = 3
    expect(r.score).toBe(3);
    expect(r.stratum).toBe('Low');
  });

  it('score 4 → Moderate (lower edge)', () => {
    const r = calcDai({ ...base, ageOnsetD: '10+', durationD: '3+' }); // 2 + 2 = 4
    expect(r.score).toBe(4);
    expect(r.stratum).toBe('Moderate');
  });

  it('score 7 → High (lower edge)', () => {
    const r = calcDai({ ...base, eegAfter: 'abnormal', ageOnsetD: '10+', durationD: '3+' }); // 3 + 2 + 2 = 7
    expect(r.score).toBe(7);
    expect(r.stratum).toBe('High');
  });

  it('maximum possible score is 17', () => {
    const r = calcDai({
      ageOnsetD: '10+', durationD: '3+', eegStart: 'abnormal', eegAfter: 'abnormal',
      febrile: 'yes', intellectual: 'yes', motor: 'yes', nASM: '2+', focalOnly: 'yes',
    });
    expect(r.score).toBe(17);
    expect(r.maxScore).toBe(17);
    expect(r.stratum).toBe('High');
  });
});
