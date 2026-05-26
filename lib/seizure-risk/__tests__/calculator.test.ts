import { describe, it, expect } from 'vitest';
import { calcFirstSeizure, calcFebrileRecurrence, calcFutureEpilepsy } from '../calculator';

describe('calcFirstSeizure', () => {
  it('idiopathic/normal EEG = lowest-risk anchors (untreated 21/26, treated 13/18, no epilepsy dx)', () => {
    const r = calcFirstSeizure({ etiology: 'idiopathic', eeg: 'normal', nocturnal: false, todds: false, priorFS: false });
    expect(r.untreated).toEqual({ r2y: 21, r5y: 26 });
    expect(r.treated).toEqual({ r2y: 13, r5y: 18 });
    expect(r.epilepsyDx).toBe(false);
  });

  it('idiopathic/abnormal = 41/56 untreated', () => {
    const r = calcFirstSeizure({ etiology: 'idiopathic', eeg: 'abnormal', nocturnal: false, todds: false, priorFS: false });
    expect(r.untreated).toEqual({ r2y: 41, r5y: 56 });
  });

  it('remoteSymptomatic/normal = 32/40 untreated', () => {
    const r = calcFirstSeizure({ etiology: 'remoteSymptomatic', eeg: 'normal', nocturnal: false, todds: false, priorFS: false });
    expect(r.untreated).toEqual({ r2y: 32, r5y: 40 });
  });

  it('remoteSymptomatic/abnormal = 54/65 untreated, still below ILAE 60% threshold', () => {
    const r = calcFirstSeizure({ etiology: 'remoteSymptomatic', eeg: 'abnormal', nocturnal: false, todds: false, priorFS: false });
    expect(r.untreated).toEqual({ r2y: 54, r5y: 65 });
    expect(r.epilepsyDx).toBe(false);
  });

  it('remoteSymptomatic/abnormal + nocturnal crosses the ILAE 60% epilepsy threshold', () => {
    const r = calcFirstSeizure({ etiology: 'remoteSymptomatic', eeg: 'abnormal', nocturnal: true, todds: false, priorFS: false });
    expect(r.epilepsyDx).toBe(true);
    expect(r.untreated.r2y).toBe(68);
  });
});

describe('calcFebrileRecurrence', () => {
  const tt = (n: 0|1|2|3|4) => {
    const flags = [n>=1, n>=2, n>=3, n>=4];
    return calcFebrileRecurrence({ ageYoung: flags[0], familyHistoryFS: flags[1], lowTemp: flags[2], shortFever: flags[3] });
  };
  it('reproduces 14/24/32/63/76 for 0..4 risk factors', () => {
    expect(tt(0).risk).toBe(14);
    expect(tt(1).risk).toBe(24);
    expect(tt(2).risk).toBe(32);
    expect(tt(3).risk).toBe(63);
    expect(tt(4).risk).toBe(76);
  });
  it('strata labels and counts', () => {
    expect(tt(0).stratum).toBe('Lowest (population baseline)');
    expect(tt(2).stratum).toBe('Moderate');
    expect(tt(4).rfCount).toBe(4);
    expect(tt(4).stratum).toBe('High');
  });
});

describe('calcFutureEpilepsy', () => {
  const base = { focal: false, prolongedLevel: 'no', multipleInDay: false, priorAbnormality: false, familyHxEpilepsy: false } as const;

  it('simple FS = 2.4%', () => {
    const r = calcFutureEpilepsy({ ...base });
    expect(r.baseRisk).toBe(2.4);
    expect(r.adjustedRisk).toBe(2.4);
    expect(r.fse).toBe(false);
    expect(r.isComplex).toBe(false);
  });
  it('recurrence-only behaves like simple FS (3.5%)', () => {
    const r = calcFutureEpilepsy({ ...base, multipleInDay: true });
    expect(r.recurrenceOnly).toBe(true);
    expect(r.baseRisk).toBe(3.5);
  });
  it('one higher-risk feature (focal) = 7%', () => {
    const r = calcFutureEpilepsy({ ...base, focal: true });
    expect(r.higherRiskCount).toBe(1);
    expect(r.baseRisk).toBe(7);
  });
  it('focal + recurrence does NOT exceed one-feature tier (recurrence adds no tier)', () => {
    const r = calcFutureEpilepsy({ ...base, focal: true, multipleInDay: true });
    expect(r.recurrenceOnly).toBe(false);
    expect(r.higherRiskCount).toBe(1);
    expect(r.baseRisk).toBe(7);
  });
  it('two higher-risk features (focal + 15-29 min) = 17%', () => {
    const r = calcFutureEpilepsy({ ...base, focal: true, prolongedLevel: 'moderate' });
    expect(r.higherRiskCount).toBe(2);
    expect(r.baseRisk).toBe(17);
  });
  it('FSE strata: alone 25, +focal 35, +prior abnormality 40', () => {
    expect(calcFutureEpilepsy({ ...base, prolongedLevel: 'fse' }).baseRisk).toBe(25);
    expect(calcFutureEpilepsy({ ...base, prolongedLevel: 'fse' }).fse).toBe(true);
    expect(calcFutureEpilepsy({ ...base, prolongedLevel: 'fse', focal: true }).baseRisk).toBe(35);
    expect(calcFutureEpilepsy({ ...base, prolongedLevel: 'fse', priorAbnormality: true }).baseRisk).toBe(40);
  });
  it('FSE + recurrence equals FSE alone (recurrence adds nothing)', () => {
    expect(calcFutureEpilepsy({ ...base, prolongedLevel: 'fse', multipleInDay: true }).baseRisk).toBe(25);
  });
  it('prior abnormality + higher-risk feature = 22%', () => {
    expect(calcFutureEpilepsy({ ...base, focal: true, priorAbnormality: true }).baseRisk).toBe(22);
  });
  it('family history of epilepsy applies a x1.5 modifier (focal 7 -> 10.5)', () => {
    const r = calcFutureEpilepsy({ ...base, focal: true, familyHxEpilepsy: true });
    expect(r.adjustedRisk).toBe(10.5);
  });
});
