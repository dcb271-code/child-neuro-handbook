import { describe, it, expect } from 'vitest';
import { mgFor } from '../calculator';
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
  it('IV access: returns lorazepam IV only', () => {
    const r = recommendFirstLine(pBase);
    expect(r).toHaveLength(1);
    expect(r[0].drug).toBe('lorazepam');
    expect(r[0].route).toBe('IV');
    expect(r[0].mg).toBeCloseTo(1.5);            // 0.1 × 15
  });
  it('IV access caps lorazepam at 4 mg for heavy patients', () => {
    const r = recommendFirstLine({ ...pBase, weightKg: 60 });
    const loraz = r[0];
    expect(loraz.mg).toBe(4);
    expect(loraz.hitCap).toBe(true);
  });
  it('no IV access: returns midazolam IN only — IM is not used at this institution', () => {
    const r = recommendFirstLine({ ...pBase, ivAccess: false });
    expect(r).toHaveLength(1);
    const drugs = r.map(d => `${d.drug}/${d.route}`);
    expect(drugs).toEqual(['midazolam/IN']);
  });
  it('no IV access: IM is never recommended at any weight', () => {
    for (const weightKg of [8, 12, 13, 25, 40, 41, 60]) {
      const r = recommendFirstLine({ ...pBase, ivAccess: false, weightKg });
      expect(r.some(d => d.route === 'IM')).toBe(false);
    }
  });
  it('no IV access: midazolam IN is 0.2 mg/kg capped at 10 mg', () => {
    expect(recommendFirstLine({ ...pBase, ivAccess: false, weightKg: 25 })[0].mg).toBe(5);
    const heavy = recommendFirstLine({ ...pBase, ivAccess: false, weightKg: 80 })[0];
    expect(heavy.mg).toBe(10);
    expect(heavy.hitCap).toBe(true);
  });
  it('no IV access: small infants still get a dose (no IM weight-band gap)', () => {
    const r = recommendFirstLine({ ...pBase, ivAccess: false, weightKg: 8 });
    expect(r).toHaveLength(1);
    expect(r[0].mg).toBeCloseTo(1.6);
  });
});

import { recommendSecondLine } from '../calculator';

describe('recommendSecondLine — Phase 3 (20–40 min)', () => {
  it('default order is levetiracetam → fosphenytoin → phenobarbital → valproate', () => {
    const r = recommendSecondLine({ ...pBase, ageBand: '6-11y' });   // ≥6 y to avoid <2y valproate caution
    expect(r.map(d => d.drug)).toEqual(['levetiracetam','fosphenytoin','phenobarbital','valproate']);
  });
  it('calculates loads against weight with caps (60 mg/kg levetiracetam, max 4500)', () => {
    const r = recommendSecondLine({ ...pBase, weightKg: 25, ageBand: '6-11y' });
    const lev = r.find(d => d.drug === 'levetiracetam')!;
    expect(lev.mg).toBe(1500);      // 60 × 25
    expect(lev.hitCap).toBe(false);
  });
  it('caps fosphenytoin at 1500 PE for heavy patients', () => {
    const r = recommendSecondLine({ ...pBase, weightKg: 80, ageBand: 'ge_12y' });
    const fos = r.find(d => d.drug === 'fosphenytoin')!;
    expect(fos.mg).toBe(1500);
    expect(fos.hitCap).toBe(true);
  });
  it('caps phenobarbital at 1000 mg', () => {
    const r = recommendSecondLine({ ...pBase, weightKg: 60, ageBand: 'ge_12y' });
    expect(r.find(d => d.drug === 'phenobarbital')!.mg).toBe(1000);
  });
  it('caps valproate at 3000 mg', () => {
    const r = recommendSecondLine({ ...pBase, weightKg: 80, ageBand: 'ge_12y' });
    expect(r.find(d => d.drug === 'valproate')!.mg).toBe(3000);
  });
});

const pAdult = { ...pBase, ageBand: 'ge_12y' as const };

describe('recommendSecondLine — flag filtering', () => {
  it('suspected_dravet adds ✗ contraindicated chip to fosphenytoin', () => {
    const r = recommendSecondLine({ ...pAdult, flags: ['suspected_dravet'] });
    const fos = r.find(d => d.drug === 'fosphenytoin')!;
    expect(fos.cautions.some(c => c.severity === 'contraindicated' && /Dravet/i.test(c.text))).toBe(true);
  });
  it('cardiac_conduction adds ✗ contraindicated chip to fosphenytoin', () => {
    const r = recommendSecondLine({ ...pAdult, flags: ['cardiac_conduction'] });
    const fos = r.find(d => d.drug === 'fosphenytoin')!;
    expect(fos.cautions.some(c => c.severity === 'contraindicated' && /cardiac/i.test(c.text))).toBe(true);
  });
  it('polg_mito adds ✗ contraindicated chip to valproate', () => {
    const r = recommendSecondLine({ ...pAdult, flags: ['polg_mito'] });
    const val = r.find(d => d.drug === 'valproate')!;
    expect(val.cautions.some(c => c.severity === 'contraindicated' && /POLG|mitochondr/i.test(c.text))).toBe(true);
  });
  it('age 28d-1y: valproate contraindicated by age default (POLG status unknown)', () => {
    const r = recommendSecondLine({ ...pBase, ageBand: '28d-1y' });
    const val = r.find(d => d.drug === 'valproate')!;
    expect(val.cautions.some(c => c.severity === 'contraindicated' && /<2/.test(c.text))).toBe(true);
  });
  it('age 1-5y: valproate has age-based CAUTION (since band covers both <2y and ≥2y)', () => {
    const r = recommendSecondLine({ ...pBase, ageBand: '1-5y' });
    const val = r.find(d => d.drug === 'valproate')!;
    expect(val.cautions.some(c => c.severity === 'caution' && /<2/.test(c.text))).toBe(true);
    expect(val.cautions.some(c => c.severity === 'contraindicated' && /<2/.test(c.text))).toBe(false);
  });
  it('age ≥6y: valproate has no age-based contraindication', () => {
    const r = recommendSecondLine({ ...pBase, ageBand: '6-11y' });
    const val = r.find(d => d.drug === 'valproate')!;
    expect(val.cautions.some(c => c.severity === 'contraindicated' && /<2/.test(c.text))).toBe(false);
  });
  it('renal adds ⚠ caution chip to levetiracetam (still ranked)', () => {
    const r = recommendSecondLine({ ...pAdult, flags: ['renal'] });
    const lev = r.find(d => d.drug === 'levetiracetam')!;
    expect(lev.cautions.some(c => c.severity === 'caution' && /renal|reduction/i.test(c.text))).toBe(true);
    expect(r.indexOf(lev)).toBe(0);    // still first in default order
  });
  it('on_home_phenobarb adds note + de-ranks phenobarbital', () => {
    const r = recommendSecondLine({ ...pAdult, flags: ['on_home_phenobarb'] });
    const pb = r.find(d => d.drug === 'phenobarbital')!;
    expect(pb.cautions.some(c => /home|already/i.test(c.text))).toBe(true);
  });
  it('flags stack: dravet + polg + cardiac + renal does not crash and stacks chips', () => {
    const r = recommendSecondLine({ ...pAdult, flags: ['suspected_dravet','polg_mito','cardiac_conduction','renal'] });
    expect(r).toHaveLength(4);
    expect(r.find(d => d.drug === 'fosphenytoin')!.cautions.filter(c => c.severity === 'contraindicated').length).toBeGreaterThanOrEqual(2);
  });
});

import { recommendRefractory } from '../calculator';
import { recommendSuperRefractory } from '../calculator';
import { currentPhase, nextPhase } from '../calculator';
import type { Phase } from '../calculator';

describe('recommendRefractory — Phase 4 (40–60+ min, RSE)', () => {
  it('ranks midazolam first and ketamine second; pentobarbital is NOT in Phase 4', () => {
    const r = recommendRefractory({ ...pBase, weightKg: 20 });
    expect(r.map(d => d.drug)).toEqual(['midazolam','ketamine']);
  });
  it('returns midazolam bolus (0.1–0.15 mg/kg) + start rate (0.1 mg/kg/hr)', () => {
    const r = recommendRefractory({ ...pBase, weightKg: 20 });
    const mid = r[0];
    expect(mid.drug).toBe('midazolam');
    expect(mid.route).toBe('infusion');
    expect(mid.note).toMatch(/0\.1|bolus/i);
    expect(mid.rate).toMatch(/0\.1.*kg.*hr/);
  });
  it('returns ketamine bolus (2 mg/kg) + start rate (0.5–1 mg/kg/hr)', () => {
    const r = recommendRefractory({ ...pBase, weightKg: 20 });
    const ket = r.find(d => d.drug === 'ketamine')!;
    expect(ket.route).toBe('infusion');
    expect(ket.note).toMatch(/2.*mg.*kg/i);
    expect(ket.rate).toMatch(/0\.5|1.*kg.*hr/i);
  });
});

describe('recommendSuperRefractory — Phase 5 (>24 h or recurrence on weaning)', () => {
  it('headlines pentobarbital, then FIRES/NORSE adjuncts (anakinra, ketogenic, immunotherapy)', () => {
    const r = recommendSuperRefractory({ ...pBase, weightKg: 20 });
    expect(r[0].drug).toBe('pentobarbital');
    const drugs = r.map(d => d.drug);
    expect(drugs).toContain('anakinra');
    expect(drugs).toContain('ketogenic_diet');
    expect(drugs).toContain('immunotherapy');
  });
  it('pentobarbital has bolus 2–5 mg/kg + start 0.5 mg/kg/hr', () => {
    const r = recommendSuperRefractory({ ...pBase, weightKg: 20 });
    const pb = r[0];
    expect(pb.note).toMatch(/2.{0,3}5.*mg.*kg/i);
    expect(pb.rate).toMatch(/0\.5.*kg.*hr/);
  });
});

describe('phase-state machine', () => {
  it('currentPhase: no drugs given → "stabilization"', () => {
    expect(currentPhase({})).toBe('stabilization');
  });
  it('currentPhase: stabilization complete → "first_line"', () => {
    expect(currentPhase({ stabilization: true })).toBe('first_line');
  });
  it('currentPhase: stabilization + first_line complete → "second_line"', () => {
    expect(currentPhase({ stabilization: true, first_line: true })).toBe('second_line');
  });
  it('currentPhase: through second_line → "refractory"', () => {
    expect(currentPhase({ stabilization: true, first_line: true, second_line: true })).toBe('refractory');
  });
  it('currentPhase: through refractory → "super_refractory"', () => {
    expect(currentPhase({ stabilization: true, first_line: true, second_line: true, refractory: true })).toBe('super_refractory');
  });
  it('nextPhase advances linearly', () => {
    expect(nextPhase('stabilization')).toBe('first_line');
    expect(nextPhase('first_line')).toBe('second_line');
    expect(nextPhase('second_line')).toBe('refractory');
    expect(nextPhase('refractory')).toBe('super_refractory');
    expect(nextPhase('super_refractory')).toBe('super_refractory');   // stays at terminal
  });
});
