# Status Epilepticus Med Ladder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pediatric Convulsive SE Med Ladder widget — a 5-tab, 5-phase interactive walker that operationalizes the institutional SE pathway, living in the Neurocritical Care section alongside the HIE calculator.

**Architecture:** Pure logic + types in `lib/se-ladder/calculator.ts` (mirrors `lib/hie/`); UI in `components/se-ladder/SEMedLadder.tsx` (`'use client'`, 5 tabs, dark-mode classes, mirrors `components/hie/`); registered in `app/[section]/page.tsx` SECTION_WIDGETS under `'neurocritical-care'`; TOC entry + search entries appended. Globals (weight / age band / IV access / clinical flags) drive flag-filtered recommendations per phase.

**Tech Stack:** TypeScript, Next.js 14 App Router, React 18, Tailwind (with `dark:` variants), Vitest, vitest + tsc for verification, Node ≥18 for `npx`.

**Branch:** `se-med-ladder` (already created and tracking the spec commit).

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/se-ladder/calculator.ts` (create) | Types, `mgFor` cap helper, `calcDiastatPR` per-age chart, per-phase recommendation functions, phase-state machine. |
| `lib/se-ladder/__tests__/calculator.test.ts` (create) | Vitest unit tests; ≈30 tests across helpers, recommendations, flag filtering, state machine. |
| `components/se-ladder/SEMedLadder.tsx` (create) | `'use client'` component. 5 tabs (Pathway / Dosing / Refractory & weaning / Teaching / References). Global inputs sticky. Inline sub-components: `PhaseCard`, `DrugSubCard`, `CautionChip`. |
| `app/[section]/page.tsx` (modify) | Import `SEMedLadder`; add `{ id: 'se-med-ladder', Component: SEMedLadder }` to the `'neurocritical-care'` entry in `SECTION_WIDGETS`. |
| `src/data/neurocritical-care.json` (modify) | Append TOC entry `{ level: 1, text: 'Status Epilepticus Med Ladder', id: 'se-med-ladder' }`. |
| `src/data/index.json` (modify) | Bump `neurocritical-care.tocCount` 11 → 12. |
| `src/data/search.json` and `public/search.json` (modify) | Append `{ section, sectionName, heading, id, text }` entry. |

---

## Task 1: Types + `mgFor` cap helper

**Files:**
- Create: `lib/se-ladder/calculator.ts`
- Create: `lib/se-ladder/__tests__/calculator.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/se-ladder/__tests__/calculator.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run lib/se-ladder
```

Expected: FAIL with "Cannot find module '../calculator'" or similar.

- [ ] **Step 3: Write minimal implementation**

Create `lib/se-ladder/calculator.ts`:

```typescript
/* SE Med Ladder — pure logic, mirrors the structure of lib/hie/calculator.ts.
   Operationalizes the institutional Pediatric Convulsive SE pathway. */

export type AgeBand = '28d-1y' | '1-5y' | '6-11y' | 'ge_12y';
export type Route = 'IV' | 'IM' | 'IN' | 'PR' | 'infusion';
export type Flag =
  | 'suspected_dravet' | 'polg_mito' | 'cardiac_conduction' | 'renal'
  | 'on_home_phenobarb' | 'on_home_levetiracetam';
export type Phase = 'stabilization' | 'first_line' | 'second_line' | 'refractory' | 'super_refractory';

export type PatientInputs = {
  weightKg: number;
  ageBand: AgeBand;
  ivAccess: boolean;
  isNeonate: boolean;
  flags: Flag[];
};

export type Severity = 'contraindicated' | 'caution' | 'note';
export type CautionChip = { severity: Severity; text: string };

export type DrugRecommendation = {
  drug: string;
  route: Route;
  mgPerKg?: number;
  mg: number;
  maxCap: number;
  hitCap: boolean;
  infusionTime?: string;
  rate?: string;
  note?: string;
  cautions: CautionChip[];
  rank: number;
};

/** Dose math with cap: returns clipped mg + whether the cap was hit. */
export function mgFor(mgPerKg: number, weightKg: number, maxCap: number): { mg: number; hitCap: boolean } {
  const raw = mgPerKg * weightKg;
  if (raw > maxCap) return { mg: maxCap, hitCap: true };
  return { mg: Math.round(raw * 10) / 10, hitCap: false };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run lib/se-ladder
```

Expected: PASS — all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/se-ladder/calculator.ts lib/se-ladder/__tests__/calculator.test.ts
git commit -m "SE Ladder: types + mgFor cap helper"
```

---

## Task 2: `calcDiastatPR` per-age chart

**Files:**
- Modify: `lib/se-ladder/calculator.ts` (append below `mgFor`)
- Modify: `lib/se-ladder/__tests__/calculator.test.ts` (append a new `describe`)

- [ ] **Step 1: Write the failing test (append to test file)**

```typescript
import { calcDiastatPR } from '../calculator';

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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run lib/se-ladder
```

Expected: FAIL with "calcDiastatPR is not exported".

- [ ] **Step 3: Append the implementation to `lib/se-ladder/calculator.ts`**

```typescript
/** Diastat (diazepam rectal gel) per-age dosing per the institutional pathway.
    The 28d–1y band has a sub-rule by weight (5–9.9 kg → 2.5 mg, ≥10 kg → 5 mg). */
export function calcDiastatPR(ageBand: AgeBand, weightKg: number): number {
  if (ageBand === '28d-1y') return weightKg < 10 ? 2.5 : 5;
  if (ageBand === '1-5y')   return Math.round(0.5 * weightKg * 10) / 10;
  if (ageBand === '6-11y')  return Math.round(0.3 * weightKg * 10) / 10;
  return Math.round(0.2 * weightKg * 10) / 10;     // ge_12y
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run lib/se-ladder
```

Expected: PASS — all tests green (3 + 5 = 8).

- [ ] **Step 5: Commit**

```bash
git add lib/se-ladder
git commit -m "SE Ladder: Diastat per-age PR dosing chart"
```

---

## Task 3: Phase 1 stabilization recommendation (returns checklist items)

**Files:**
- Modify: `lib/se-ladder/calculator.ts`
- Modify: `lib/se-ladder/__tests__/calculator.test.ts`

- [ ] **Step 1: Append the failing test**

```typescript
import { recommendStabilization } from '../calculator';

describe('recommendStabilization — Phase 1 (0–5 min)', () => {
  it('returns the 5 checklist items in fixed order', () => {
    const items = recommendStabilization();
    expect(items.map(i => i.id)).toEqual(['abc','glucose','iv_io','labs','asm_levels']);
    expect(items).toHaveLength(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run lib/se-ladder
```

Expected: FAIL — `recommendStabilization` not exported.

- [ ] **Step 3: Append the implementation**

```typescript
export type StabilizationItem = { id: string; label: string; note?: string };

export function recommendStabilization(): StabilizationItem[] {
  return [
    { id: 'abc',        label: 'ABCs — position airway, supplemental O₂' },
    { id: 'glucose',    label: 'Check glucose; treat if <60 mg/dL' },
    { id: 'iv_io',      label: 'Get IV or IO access' },
    { id: 'labs',       label: 'Send basic labs (CBC, BMP, ammonia, lactate)', note: 'Consider toxicology, blood gas as indicated' },
    { id: 'asm_levels', label: 'Send ASM levels if on chronic ASMs' },
  ];
}
```

- [ ] **Step 4: Verify pass**

```bash
npx vitest run lib/se-ladder
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/se-ladder
git commit -m "SE Ladder: Phase 1 stabilization checklist"
```

---

## Task 4: Phase 2 first-line benzo recommendation with IV branching

**Files:**
- Modify: `lib/se-ladder/calculator.ts`
- Modify: `lib/se-ladder/__tests__/calculator.test.ts`

- [ ] **Step 1: Append the failing test**

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run lib/se-ladder
```

Expected: FAIL — `recommendFirstLine` not exported.

- [ ] **Step 3: Append the implementation**

```typescript
const respCaution: CautionChip = { severity: 'caution', text: 'Watch airway / blood pressure' };

export function recommendFirstLine(p: PatientInputs): DrugRecommendation[] {
  const out: DrugRecommendation[] = [];
  if (p.ivAccess) {
    const loraz = mgFor(0.1, p.weightKg, 4);
    out.push({
      drug: 'lorazepam', route: 'IV', mgPerKg: 0.1, mg: loraz.mg, maxCap: 4, hitCap: loraz.hitCap,
      infusionTime: 'over 2 min', note: 'May repeat once after 3–5 min if still seizing',
      cautions: [respCaution], rank: 1,
    });
    const diaz = mgFor(0.2, p.weightKg, 10);
    out.push({
      drug: 'diazepam', route: 'IV', mgPerKg: 0.2, mg: diaz.mg, maxCap: 10, hitCap: diaz.hitCap,
      infusionTime: 'over 2 min', note: 'Alternative to lorazepam. May repeat once after 3–5 min',
      cautions: [respCaution], rank: 2,
    });
    return out;
  }
  // No IV access path
  const midIM = p.weightKg < 13 ? 0 : (p.weightKg <= 40 ? 5 : 10);
  out.push({
    drug: 'midazolam', route: 'IM', mg: midIM, maxCap: 10, hitCap: false,
    note: p.weightKg < 13 ? 'Weight <13 kg: use IN or PR instead' : 'Weight-banded: 13–40 kg → 5 mg; >40 kg → 10 mg',
    cautions: [respCaution], rank: 1,
  });
  const midIN = mgFor(0.2, p.weightKg, 10);
  out.push({
    drug: 'midazolam', route: 'IN', mgPerKg: 0.2, mg: midIN.mg, maxCap: 10, hitCap: midIN.hitCap,
    note: '0.1 mg/kg per nostril; use concentrated solution',
    cautions: [respCaution], rank: 2,
  });
  const prMg = calcDiastatPR(p.ageBand, p.weightKg);
  out.push({
    drug: 'diazepam', route: 'PR', mg: prMg, maxCap: prMg, hitCap: false,
    note: 'Diastat per age band; use the prefilled-dose closest to the calculated amount',
    cautions: [respCaution], rank: 3,
  });
  return out;
}
```

- [ ] **Step 4: Verify pass**

```bash
npx vitest run lib/se-ladder
```

Expected: PASS — all 6 new tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/se-ladder
git commit -m "SE Ladder: Phase 2 first-line benzo recommendation (IV branching, Diastat)"
```

---

## Task 5: Phase 3 second-line ASM — default ordering (no flags)

**Files:**
- Modify: `lib/se-ladder/calculator.ts`
- Modify: `lib/se-ladder/__tests__/calculator.test.ts`

- [ ] **Step 1: Append the failing test**

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run lib/se-ladder
```

Expected: FAIL — `recommendSecondLine` not exported.

- [ ] **Step 3: Append the implementation (flags handled in Task 6; this is the default-no-flags path)**

```typescript
type SecondLineEntry = {
  drug: string; mgPerKg: number; maxCap: number; infusionTime: string;
  baseCautions?: CautionChip[];
};

const SECOND_LINE_TABLE: SecondLineEntry[] = [
  { drug: 'levetiracetam', mgPerKg: 60, maxCap: 4500, infusionTime: 'over 10–15 min',
    baseCautions: [{ severity: 'note', text: 'Safe even if on home levetiracetam' }] },
  { drug: 'fosphenytoin',  mgPerKg: 20, maxCap: 1500, infusionTime: 'over 10–15 min',
    baseCautions: [{ severity: 'note', text: 'Consider extra 10 mg PE/kg if no response after 10 min' }] },
  { drug: 'phenobarbital', mgPerKg: 20, maxCap: 1000, infusionTime: '1–2 mg/kg/min',
    baseCautions: [{ severity: 'caution', text: 'Respiratory depression and hypotension' }] },
  { drug: 'valproate',     mgPerKg: 40, maxCap: 3000, infusionTime: 'up to ~20 mg/min',
    baseCautions: [] },
];

export function recommendSecondLine(p: PatientInputs): DrugRecommendation[] {
  return SECOND_LINE_TABLE.map((e, idx) => {
    const { mg, hitCap } = mgFor(e.mgPerKg, p.weightKg, e.maxCap);
    return {
      drug: e.drug,
      route: 'IV' as Route,
      mgPerKg: e.mgPerKg,
      mg,
      maxCap: e.maxCap,
      hitCap,
      infusionTime: e.infusionTime,
      cautions: [...(e.baseCautions ?? [])],
      rank: idx + 1,
    };
  });
}
```

- [ ] **Step 4: Verify pass**

```bash
npx vitest run lib/se-ladder
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/se-ladder
git commit -m "SE Ladder: Phase 3 second-line ASM default ordering"
```

---

## Task 6: Phase 3 flag filtering (Dravet, POLG, age <2 y, cardiac, renal, home meds)

**Files:**
- Modify: `lib/se-ladder/calculator.ts`
- Modify: `lib/se-ladder/__tests__/calculator.test.ts`

- [ ] **Step 1: Append the failing test**

```typescript
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
  it('age 1-5y: valproate contraindicated by age default (POLG status unknown)', () => {
    const r = recommendSecondLine({ ...pBase, ageBand: '1-5y' });
    const val = r.find(d => d.drug === 'valproate')!;
    expect(val.cautions.some(c => c.severity === 'contraindicated' && /<2/.test(c.text))).toBe(true);
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run lib/se-ladder
```

Expected: FAIL — none of the chips are present yet.

- [ ] **Step 3: Update `recommendSecondLine` to apply flag-driven chips**

Replace the existing `recommendSecondLine` in `lib/se-ladder/calculator.ts` with:

```typescript
export function recommendSecondLine(p: PatientInputs): DrugRecommendation[] {
  return SECOND_LINE_TABLE.map((e, idx) => {
    const { mg, hitCap } = mgFor(e.mgPerKg, p.weightKg, e.maxCap);
    const cautions: CautionChip[] = [...(e.baseCautions ?? [])];

    // Per-drug flag filters
    if (e.drug === 'fosphenytoin') {
      if (p.flags.includes('suspected_dravet')) cautions.push({ severity: 'contraindicated', text: 'Contraindicated: suspected Dravet — sodium-channel blockers can paradoxically worsen' });
      if (p.flags.includes('cardiac_conduction')) cautions.push({ severity: 'contraindicated', text: 'Contraindicated: cardiac conduction disease — risk of arrhythmia' });
    }
    if (e.drug === 'valproate') {
      if (p.flags.includes('polg_mito')) cautions.push({ severity: 'contraindicated', text: 'Contraindicated: known/suspected POLG or mitochondrial disease (hepatotoxicity)' });
      if ((p.ageBand === '28d-1y' || p.ageBand === '1-5y') && !p.flags.includes('polg_mito')) {
        cautions.push({ severity: 'contraindicated', text: 'Avoid in <2 y unless POLG status is known' });
      }
    }
    if (e.drug === 'levetiracetam' && p.flags.includes('renal')) {
      cautions.push({ severity: 'caution', text: 'Renal impairment: consider dose reduction' });
    }
    if (e.drug === 'phenobarbital' && p.flags.includes('on_home_phenobarb')) {
      cautions.push({ severity: 'caution', text: 'Already on home phenobarbital — do not repeat full load' });
    }

    return {
      drug: e.drug, route: 'IV' as Route,
      mgPerKg: e.mgPerKg, mg, maxCap: e.maxCap, hitCap,
      infusionTime: e.infusionTime,
      cautions, rank: idx + 1,
    };
  });
}
```

- [ ] **Step 4: Verify pass**

```bash
npx vitest run lib/se-ladder
```

Expected: PASS — all flag-filter tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/se-ladder
git commit -m "SE Ladder: Phase 3 flag filtering (Dravet, POLG, age, cardiac, renal, home meds)"
```

---

## Task 7: Phase 4 refractory — midazolam primary + ketamine

**Files:**
- Modify: `lib/se-ladder/calculator.ts`
- Modify: `lib/se-ladder/__tests__/calculator.test.ts`

- [ ] **Step 1: Append the failing test**

```typescript
import { recommendRefractory } from '../calculator';

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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run lib/se-ladder
```

Expected: FAIL — `recommendRefractory` not exported.

- [ ] **Step 3: Append the implementation**

```typescript
export function recommendRefractory(p: PatientInputs): DrugRecommendation[] {
  const midBolus = mgFor(0.15, p.weightKg, 1000);   // 0.1–0.15 mg/kg, no realistic cap
  const ketBolus = mgFor(2, p.weightKg, 1000);
  return [
    {
      drug: 'midazolam', route: 'infusion',
      mgPerKg: 0.15, mg: midBolus.mg, maxCap: 1000, hitCap: false,
      rate: 'start 0.1 mg/kg/hr; ↑ by 0.1 q15–30 min; usual switch ≥0.6–1; absolute max 2 mg/kg/hr',
      note: 'Bolus 0.1–0.15 mg/kg over 2 min; intubate; start continuous EEG. PRIMARY 3rd-line.',
      cautions: [{ severity: 'caution', text: 'Watch BP; tachyphylaxis common with prolonged infusion' }],
      rank: 1,
    },
    {
      drug: 'ketamine', route: 'infusion',
      mgPerKg: 2, mg: ketBolus.mg, maxCap: 1000, hitCap: false,
      rate: 'start 0.5–1 mg/kg/hr; ↑ by 0.5 q30–120 min to max 6 mg/kg/hr',
      note: 'Bolus 2 mg/kg over 5 min. Alternative or early adjunct to midazolam (NMDA blockade complements GABAergic agents; emerging earlier-is-better signal).',
      cautions: [{ severity: 'note', text: 'Consider adding earlier rather than waiting for SRSE' }],
      rank: 2,
    },
  ];
}
```

- [ ] **Step 4: Verify pass**

```bash
npx vitest run lib/se-ladder
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/se-ladder
git commit -m "SE Ladder: Phase 4 refractory — midazolam primary + ketamine"
```

---

## Task 8: Phase 5 super-refractory — pentobarbital + FIRES/NORSE adjuncts

**Files:**
- Modify: `lib/se-ladder/calculator.ts`
- Modify: `lib/se-ladder/__tests__/calculator.test.ts`

- [ ] **Step 1: Append the failing test**

```typescript
import { recommendSuperRefractory } from '../calculator';

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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run lib/se-ladder
```

Expected: FAIL.

- [ ] **Step 3: Append the implementation**

```typescript
export function recommendSuperRefractory(p: PatientInputs): DrugRecommendation[] {
  const pentoBolus = mgFor(5, p.weightKg, 1000);
  return [
    {
      drug: 'pentobarbital', route: 'infusion',
      mgPerKg: 5, mg: pentoBolus.mg, maxCap: 1000, hitCap: false,
      rate: 'start 0.5 mg/kg/hr; ↑ by 0.5 to max 5 mg/kg/hr',
      note: 'Bolus 2–5 mg/kg over 15 min. Goal: burst-suppression on EEG. Reserved for SRSE (used a few times/year).',
      cautions: [
        { severity: 'caution', text: 'Hemodynamic, immunosuppression, GI dysmotility burden' },
        { severity: 'note',    text: 'Contains sugar alcohol (no ketosis)' },
      ],
      rank: 1,
    },
    {
      drug: 'anakinra', route: 'IV', mg: 0, maxCap: 0, hitCap: false,
      note: 'IL-1Ra. Consider for FIRES/NORSE; typically SC dosing per rheum/ICU/Neuro protocol.',
      cautions: [{ severity: 'note', text: 'Pair with concurrent immunotherapy and supportive care' }],
      rank: 2,
    },
    {
      drug: 'ketogenic_diet', route: 'IV', mg: 0, maxCap: 0, hitCap: false,
      note: 'Consider initiating in SRSE/FIRES; coordinate with dietitian/neurology.',
      cautions: [],
      rank: 3,
    },
    {
      drug: 'immunotherapy', route: 'IV', mg: 0, maxCap: 0, hitCap: false,
      note: 'Pulse methylprednisolone ± IVIG ± plasma exchange; consider tocilizumab in select FIRES.',
      cautions: [],
      rank: 4,
    },
  ];
}
```

- [ ] **Step 4: Verify pass**

```bash
npx vitest run lib/se-ladder
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/se-ladder
git commit -m "SE Ladder: Phase 5 super-refractory — pentobarbital + FIRES/NORSE adjuncts"
```

---

## Task 9: Phase-state machine (`currentPhase`, `nextPhase`)

**Files:**
- Modify: `lib/se-ladder/calculator.ts`
- Modify: `lib/se-ladder/__tests__/calculator.test.ts`

- [ ] **Step 1: Append the failing test**

```typescript
import { currentPhase, nextPhase } from '../calculator';
import type { Phase } from '../calculator';

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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run lib/se-ladder
```

Expected: FAIL.

- [ ] **Step 3: Append the implementation**

```typescript
export type GivenLog = Partial<Record<Phase, boolean>>;

const PHASE_ORDER: Phase[] = ['stabilization','first_line','second_line','refractory','super_refractory'];

export function currentPhase(given: GivenLog): Phase {
  for (const p of PHASE_ORDER) {
    if (!given[p]) return p;
  }
  return 'super_refractory';
}

export function nextPhase(p: Phase): Phase {
  const i = PHASE_ORDER.indexOf(p);
  return i < 0 || i === PHASE_ORDER.length - 1 ? p : PHASE_ORDER[i + 1];
}
```

- [ ] **Step 4: Verify pass**

```bash
npx vitest run lib/se-ladder
```

Expected: PASS — all 6 tests green; full file totals ≈ 30+ tests.

- [ ] **Step 5: Commit**

```bash
git add lib/se-ladder
git commit -m "SE Ladder: phase-state machine (currentPhase / nextPhase)"
```

---

## Task 10: Component scaffold — `SEMedLadder.tsx` with 5 tabs + globals + empty bodies

**Files:**
- Create: `components/se-ladder/SEMedLadder.tsx`

- [ ] **Step 1: Implement the scaffold**

Create `components/se-ladder/SEMedLadder.tsx`:

```tsx
'use client';

import { useId, useMemo, useState } from 'react';
import {
  recommendStabilization, recommendFirstLine, recommendSecondLine,
  recommendRefractory, recommendSuperRefractory, currentPhase,
  type PatientInputs, type AgeBand, type Flag, type Phase, type GivenLog,
} from '@/lib/se-ladder/calculator';

const ALL_FLAGS: { id: Flag; label: string; hint: string }[] = [
  { id: 'suspected_dravet',    label: 'Suspected Dravet',      hint: 'Sodium-channel blockers can paradoxically worsen seizures' },
  { id: 'polg_mito',           label: 'Known/suspected POLG or mitochondrial', hint: 'Valproate contraindicated' },
  { id: 'cardiac_conduction',  label: 'Cardiac conduction disease', hint: 'Fosphenytoin contraindicated' },
  { id: 'renal',               label: 'Renal impairment',      hint: 'Consider levetiracetam dose reduction' },
  { id: 'on_home_phenobarb',   label: 'On home phenobarbital', hint: "Don't repeat full load" },
  { id: 'on_home_levetiracetam', label: 'On home levetiracetam', hint: 'Still safe to give' },
];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <div className="mb-3" role="group" aria-labelledby={id}>
      <span id={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</span>
      {children}
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{hint}</p>}
    </div>
  );
}

type Tab = 'pathway' | 'dosing' | 'refractory' | 'teaching' | 'refs';

export default function SEMedLadder() {
  const [tab, setTab] = useState<Tab>('pathway');
  const [weightKg, setWeightKg] = useState(15);
  const [ageBand, setAgeBand] = useState<AgeBand>('1-5y');
  const [ivAccess, setIvAccess] = useState(true);
  const [isNeonate, setIsNeonate] = useState(false);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [given, setGiven] = useState<GivenLog>({});

  const inputs: PatientInputs = { weightKg, ageBand, ivAccess, isNeonate, flags };

  const phase1 = useMemo(() => recommendStabilization(),       []);
  const phase2 = useMemo(() => recommendFirstLine(inputs),     [inputs]);
  const phase3 = useMemo(() => recommendSecondLine(inputs),    [inputs]);
  const phase4 = useMemo(() => recommendRefractory(inputs),    [inputs]);
  const phase5 = useMemo(() => recommendSuperRefractory(inputs), [inputs]);
  const phase: Phase = currentPhase(given);

  const toggleFlag = (f: Flag) =>
    setFlags(s => s.includes(f) ? s.filter(x => x !== f) : [...s, f]);

  return (
    <div className="not-prose text-slate-900 dark:text-slate-100">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Status Epilepticus Med Ladder</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Pediatric Convulsive SE (≥28 d). Operationalizes the institutional pathway with weight-based dosing and flag-driven cautions. For super-refractory SE, see the Refractory &amp; weaning tab.
        </p>
      </div>

      {/* Global inputs */}
      <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-md p-3 mb-4 grid sm:grid-cols-2 gap-3">
        <Field label="Weight (kg)">
          <input type="number" value={weightKg} onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0)}
            className="w-24 px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900" />
        </Field>
        <Field label="Age band">
          <select value={ageBand} onChange={(e) => setAgeBand(e.target.value as AgeBand)}
            className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900">
            <option value="28d-1y">28 days – 1 year</option>
            <option value="1-5y">1 – 5 years</option>
            <option value="6-11y">6 – 11 years</option>
            <option value="ge_12y">≥12 years</option>
          </select>
        </Field>
        <Field label="IV access">
          <div className="flex gap-2">
            {[[true,'Yes'],[false,'No']].map(([v,l]) => (
              <button key={String(v)} type="button" onClick={() => setIvAccess(v as boolean)}
                className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${ivAccess === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600'}`}>{l as string}</button>
            ))}
          </div>
        </Field>
        <Field label="Neonate (<28 d)?" hint="Redirects to the neonatal seizure pathway PDF.">
          <input type="checkbox" checked={isNeonate} onChange={(e) => setIsNeonate(e.target.checked)} className="mr-2" />
          <span className="text-sm">Yes</span>
        </Field>
        <div className="sm:col-span-2">
          <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Clinical flags</span>
          <div className="flex flex-wrap gap-2">
            {ALL_FLAGS.map(f => (
              <button key={f.id} type="button" onClick={() => toggleFlag(f.id)} title={f.hint}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${flags.includes(f.id) ? 'bg-amber-500 text-white border-amber-500' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600'}`}>{f.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-5 border-b border-slate-200 dark:border-slate-700 flex-wrap">
        {([
          ['pathway',    'Pathway walker'],
          ['dosing',     'Dosing card'],
          ['refractory', 'Refractory & weaning'],
          ['teaching',   'Teaching'],
          ['refs',       'References'],
        ] as [Tab, string][]).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors ${tab === id ? 'border-blue-600 text-blue-700 dark:text-blue-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab bodies (stubs — filled in subsequent tasks) */}
      {tab === 'pathway'    && <div data-testid="tab-pathway">Pathway walker — TODO Task 11–16</div>}
      {tab === 'dosing'     && <div data-testid="tab-dosing">Dosing card — TODO Task 17</div>}
      {tab === 'refractory' && <div data-testid="tab-refractory">Refractory &amp; weaning — TODO Task 18</div>}
      {tab === 'teaching'   && <div data-testid="tab-teaching">Teaching — TODO Task 19</div>}
      {tab === 'refs'       && <div data-testid="tab-refs">References — TODO Task 20</div>}

      {/* Silence unused-variable warnings — these are wired in subsequent tasks */}
      <div className="hidden">{phase}{phase1.length}{phase2.length}{phase3.length}{phase4.length}{phase5.length}{given.first_line ? '' : ''}{setGiven ? '' : ''}</div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: exit 0 (no errors).

- [ ] **Step 3: Commit**

```bash
git add components/se-ladder
git commit -m "SE Ladder: component scaffold with 5 tabs and global inputs"
```

---

## Task 11: Pathway tab — Phase 1 Stabilization card with checklist

**Files:**
- Modify: `components/se-ladder/SEMedLadder.tsx`

- [ ] **Step 1: Add a `PhaseCard` helper and a `StabilizationCard` and wire it in the pathway tab**

Add above the `export default function SEMedLadder` block:

```tsx
function PhaseCard({ title, time, current, complete, children }: { title: string; time: string; current: boolean; complete: boolean; children: React.ReactNode }) {
  const ring = current ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-900/30' : 'border-slate-200 dark:border-slate-700';
  return (
    <section className={`rounded-lg border-2 p-4 mb-3 bg-white dark:bg-slate-900 ${ring}`}>
      <header className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {complete && <span className="mr-2 text-emerald-600 dark:text-emerald-400">✓</span>}
          {title}
        </h4>
        <span className="text-xs text-slate-500 dark:text-slate-400">{time}</span>
      </header>
      {children}
    </section>
  );
}

function StabilizationCard({ items, complete, onCheck, allChecked }: {
  items: { id: string; label: string; note?: string }[];
  complete: Record<string, boolean>;
  onCheck: (id: string, v: boolean) => void;
  allChecked: boolean;
}) {
  return (
    <ul className="space-y-1.5 text-sm">
      {items.map(it => (
        <li key={it.id} className="flex items-start gap-2">
          <input type="checkbox" checked={!!complete[it.id]} onChange={(e) => onCheck(it.id, e.target.checked)} className="mt-1" />
          <div>
            <span className={complete[it.id] ? 'line-through text-slate-400 dark:text-slate-500' : ''}>{it.label}</span>
            {it.note && <div className="text-xs text-slate-500 dark:text-slate-400">{it.note}</div>}
          </div>
        </li>
      ))}
      {allChecked && <li className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">All stabilization steps complete — advance to first-line benzo.</li>}
    </ul>
  );
}
```

Add `useEffect` to the existing `react` import (top of file):

```tsx
import { useEffect, useId, useMemo, useState } from 'react';
```

Add to component state (inside `SEMedLadder`):

```tsx
const [stabilizationDone, setStabilizationDone] = useState<Record<string, boolean>>({});
const allStabChecked = phase1.every(i => stabilizationDone[i.id]);

// Auto-mark stabilization phase complete when all 5 checklist items done.
// useEffect (not useMemo) — this is a side effect, not a derivation.
useEffect(() => {
  if (allStabChecked && !given.stabilization) setGiven(g => ({ ...g, stabilization: true }));
}, [allStabChecked, given.stabilization]);
```

Replace the `tab === 'pathway'` body with:

```tsx
{tab === 'pathway' && (
  <div>
    <PhaseCard title="Phase 1 — Stabilization" time="0–5 min" current={phase === 'stabilization'} complete={!!given.stabilization}>
      <StabilizationCard items={phase1} complete={stabilizationDone}
        onCheck={(id, v) => setStabilizationDone(s => ({ ...s, [id]: v }))} allChecked={allStabChecked} />
    </PhaseCard>
    {/* Phases 2–5 added in Tasks 12–15 */}
  </div>
)}
```

Also remove the unused `{phase1.length}` from the "Silence unused-variable" block since it's now in use.

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add components/se-ladder
git commit -m "SE Ladder: pathway tab — Phase 1 stabilization checklist card"
```

---

## Task 12: Pathway tab — Phase 2 first-line benzo card

**Files:**
- Modify: `components/se-ladder/SEMedLadder.tsx`

- [ ] **Step 1: Add a `DrugSubCard` helper and `FirstLineCard`, wire below Phase 1**

Add above the component:

```tsx
function CautionChipView({ c }: { c: { severity: 'contraindicated' | 'caution' | 'note'; text: string } }) {
  const cls = c.severity === 'contraindicated' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200'
            : c.severity === 'caution'        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
            :                                   'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200';
  const icon = c.severity === 'contraindicated' ? '✗' : c.severity === 'caution' ? '⚠' : 'ⓘ';
  return <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded mr-1 mb-1 ${cls}`}>{icon} {c.text}</span>;
}

function DrugSubCard({ rec, given, onToggle }: {
  rec: import('@/lib/se-ladder/calculator').DrugRecommendation;
  given: boolean;
  onToggle: () => void;
}) {
  const contraindicated = rec.cautions.some(c => c.severity === 'contraindicated');
  return (
    <div className={`rounded border p-2.5 mb-2 ${contraindicated ? 'bg-rose-50/40 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800' : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm">
          <strong className="capitalize">{rec.drug}</strong> <span className="text-xs text-slate-500 dark:text-slate-400">· {rec.route}</span>
          {rec.mg > 0 && (
            <span className="ml-2 font-semibold text-blue-700 dark:text-blue-300">
              {rec.mg} mg{rec.hitCap && <span className="ml-1 text-xs text-amber-700 dark:text-amber-300">(at max cap)</span>}
            </span>
          )}
          {rec.mgPerKg && rec.mg > 0 && <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">({rec.mgPerKg} mg/kg)</span>}
          {rec.infusionTime && <div className="text-xs text-slate-600 dark:text-slate-400">{rec.infusionTime}</div>}
          {rec.rate && <div className="text-xs text-slate-600 dark:text-slate-400">Rate: {rec.rate}</div>}
          {rec.note && <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">{rec.note}</div>}
          <div className="mt-1">{rec.cautions.map((c, i) => <CautionChipView key={i} c={c} />)}</div>
        </div>
        <label className="text-xs flex items-center gap-1 shrink-0">
          <input type="checkbox" checked={given} onChange={onToggle} />
          Given
        </label>
      </div>
    </div>
  );
}
```

Add new state to track per-drug "given":

```tsx
const [drugsGiven, setDrugsGiven] = useState<Record<string, boolean>>({});
const toggleDrug = (key: string, phaseKey: Phase) => {
  setDrugsGiven(s => ({ ...s, [key]: !s[key] }));
  setGiven(g => ({ ...g, [phaseKey]: true }));   // marking ANY drug in a phase advances
};
const drugKey = (phaseKey: string, drug: string, route: string) => `${phaseKey}/${drug}/${route}`;
```

Replace the pathway tab body to include Phase 2:

```tsx
{tab === 'pathway' && (
  <div>
    <PhaseCard title="Phase 1 — Stabilization" time="0–5 min" current={phase === 'stabilization'} complete={!!given.stabilization}>
      <StabilizationCard items={phase1} complete={stabilizationDone}
        onCheck={(id, v) => setStabilizationDone(s => ({ ...s, [id]: v }))} allChecked={allStabChecked} />
    </PhaseCard>

    <PhaseCard title={`Phase 2 — First-line benzo (${ivAccess ? 'IV access' : 'no IV access'})`} time="5–20 min" current={phase === 'first_line'} complete={!!given.first_line}>
      {phase2.map(d => {
        const k = drugKey('first_line', d.drug, d.route);
        return <DrugSubCard key={k} rec={d} given={!!drugsGiven[k]} onToggle={() => toggleDrug(k, 'first_line')} />;
      })}
    </PhaseCard>
    {/* Phases 3–5 added in Tasks 13–15 */}
  </div>
)}
```

Remove `{phase2.length}` from the unused-vars block.

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add components/se-ladder
git commit -m "SE Ladder: pathway tab — Phase 2 first-line benzo card with IV branching"
```

---

## Task 13: Pathway tab — Phase 3 second-line ASM card

**Files:**
- Modify: `components/se-ladder/SEMedLadder.tsx`

- [ ] **Step 1: Add Phase 3 card to the pathway tab body**

Insert after the Phase 2 `PhaseCard`:

```tsx
<PhaseCard title="Phase 3 — Second-line ASM" time="20–40 min" current={phase === 'second_line'} complete={!!given.second_line}>
  {phase3.map(d => {
    const k = drugKey('second_line', d.drug, d.route);
    return <DrugSubCard key={k} rec={d} given={!!drugsGiven[k]} onToggle={() => toggleDrug(k, 'second_line')} />;
  })}
  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">If still seizing 10–20 min post-load → Phase 4 (refractory).</p>
</PhaseCard>
```

Remove `{phase3.length}` from the unused-vars block.

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add components/se-ladder
git commit -m "SE Ladder: pathway tab — Phase 3 second-line ASM card with caution chips"
```

---

## Task 14: Pathway tab — Phase 4 refractory card + tab CTA

**Files:**
- Modify: `components/se-ladder/SEMedLadder.tsx`

- [ ] **Step 1: Add Phase 4 card**

Insert after the Phase 3 `PhaseCard`:

```tsx
<PhaseCard title="Phase 4 — Refractory SE" time="40–60+ min" current={phase === 'refractory'} complete={!!given.refractory}>
  {phase4.map(d => {
    const k = drugKey('refractory', d.drug, d.route);
    return <DrugSubCard key={k} rec={d} given={!!drugsGiven[k]} onToggle={() => toggleDrug(k, 'refractory')} />;
  })}
  <button type="button" onClick={() => setTab('refractory')}
    className="mt-2 text-xs px-2.5 py-1 rounded border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30">
    See Refractory &amp; weaning tab for full escalation, EEG goals, weaning
  </button>
</PhaseCard>
```

Remove `{phase4.length}` from the unused-vars block.

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add components/se-ladder
git commit -m "SE Ladder: pathway tab — Phase 4 refractory card"
```

---

## Task 15: Pathway tab — Phase 5 super-refractory card + neonate redirect

**Files:**
- Modify: `components/se-ladder/SEMedLadder.tsx`

- [ ] **Step 1: Add Phase 5 card and the neonate-redirect short-circuit**

Wrap the whole pathway-tab `<div>` body so that when `isNeonate` is true, the redirect card replaces the phases. Replace the `tab === 'pathway' && (...)` block with:

```tsx
{tab === 'pathway' && (
  isNeonate ? (
    <div className="rounded-lg border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4">
      <div className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-1">Neonate (&lt;28 d) — use the Neonatal Seizure Pathway</div>
      <p className="text-xs text-amber-900 dark:text-amber-200">First-line drug, dose, and escalation differ for neonates (phenobarbital is typically 1st-line, etc.).</p>
      <a href="/pdfs/pathways/neonatal-seizure-pathway.pdf" target="_blank" rel="noopener"
         className="inline-block mt-2 text-xs px-2.5 py-1 rounded border border-amber-400 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40">
        Open Neonatal Seizure Pathway PDF →
      </a>
    </div>
  ) : (
    <div>
      <PhaseCard title="Phase 1 — Stabilization" time="0–5 min" current={phase === 'stabilization'} complete={!!given.stabilization}>
        <StabilizationCard items={phase1} complete={stabilizationDone}
          onCheck={(id, v) => setStabilizationDone(s => ({ ...s, [id]: v }))} allChecked={allStabChecked} />
      </PhaseCard>

      <PhaseCard title={`Phase 2 — First-line benzo (${ivAccess ? 'IV access' : 'no IV access'})`} time="5–20 min" current={phase === 'first_line'} complete={!!given.first_line}>
        {phase2.map(d => { const k = drugKey('first_line', d.drug, d.route); return <DrugSubCard key={k} rec={d} given={!!drugsGiven[k]} onToggle={() => toggleDrug(k, 'first_line')} />; })}
      </PhaseCard>

      <PhaseCard title="Phase 3 — Second-line ASM" time="20–40 min" current={phase === 'second_line'} complete={!!given.second_line}>
        {phase3.map(d => { const k = drugKey('second_line', d.drug, d.route); return <DrugSubCard key={k} rec={d} given={!!drugsGiven[k]} onToggle={() => toggleDrug(k, 'second_line')} />; })}
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">If still seizing 10–20 min post-load → Phase 4 (refractory).</p>
      </PhaseCard>

      <PhaseCard title="Phase 4 — Refractory SE" time="40–60+ min" current={phase === 'refractory'} complete={!!given.refractory}>
        {phase4.map(d => { const k = drugKey('refractory', d.drug, d.route); return <DrugSubCard key={k} rec={d} given={!!drugsGiven[k]} onToggle={() => toggleDrug(k, 'refractory')} />; })}
        <button type="button" onClick={() => setTab('refractory')}
          className="mt-2 text-xs px-2.5 py-1 rounded border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30">
          See Refractory &amp; weaning tab for full escalation, EEG goals, weaning
        </button>
      </PhaseCard>

      <PhaseCard title="Phase 5 — Super-refractory SE" time=">24 h despite anesthetic" current={phase === 'super_refractory'} complete={!!given.super_refractory}>
        {phase5.map(d => { const k = drugKey('super_refractory', d.drug, d.route); return <DrugSubCard key={k} rec={d} given={!!drugsGiven[k]} onToggle={() => toggleDrug(k, 'super_refractory')} />; })}
      </PhaseCard>

      <div className="rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-3 mt-3 text-xs">
        <strong>Summary:</strong> Patient {weightKg} kg, {ageBand}, {ivAccess ? 'IV access' : 'no IV access'}.{' '}
        {Object.keys(drugsGiven).filter(k => drugsGiven[k]).length === 0
          ? 'Nothing administered yet.'
          : `Given: ${Object.keys(drugsGiven).filter(k => drugsGiven[k]).map(k => k.split('/').slice(1).join(' ')).join('; ')}.`}
        <button type="button" onClick={() => { setDrugsGiven({}); setGiven({}); setStabilizationDone({}); }}
          className="ml-3 px-2 py-0.5 text-[11px] rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">Reset</button>
      </div>
    </div>
  )
)}
```

Remove `{phase5.length}{given.first_line ? '' : ''}{setGiven ? '' : ''}` from the unused-vars block (no longer needed).

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add components/se-ladder
git commit -m "SE Ladder: pathway tab — Phase 5 + neonate redirect + summary panel"
```

---

## Task 16: Dosing card tab — pre-calculated dose tables

**Files:**
- Modify: `components/se-ladder/SEMedLadder.tsx`

- [ ] **Step 1: Replace the `tab === 'dosing'` body**

```tsx
{tab === 'dosing' && (
  <div className="space-y-4 text-sm">
    <p className="text-xs text-slate-500 dark:text-slate-400">Pre-calculated for {weightKg} kg, {ageBand}, {ivAccess ? 'IV access' : 'no IV access'}. Adjust globals above to recompute.</p>
    {([
      ['Phase 2 — First-line benzo', phase2],
      ['Phase 3 — Second-line ASM',   phase3],
      ['Phase 4 — Refractory',        phase4],
      ['Phase 5 — Super-refractory',  phase5],
    ] as const).map(([label, recs]) => (
      <div key={label}>
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">{label}</h4>
        <table className="w-full text-xs border border-slate-200 dark:border-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-900/40">
            <tr><th className="text-left p-1.5">Drug · route</th><th className="text-left p-1.5">Dose</th><th className="text-left p-1.5">Notes</th></tr>
          </thead>
          <tbody>
            {recs.map((r, i) => (
              <tr key={i} className="border-t border-slate-200 dark:border-slate-700">
                <td className="p-1.5"><span className="capitalize">{r.drug}</span> · {r.route}</td>
                <td className="p-1.5">{r.mg > 0 ? `${r.mg} mg${r.hitCap ? ' (cap)' : ''}` : '—'}{r.infusionTime && <span className="text-slate-500"> · {r.infusionTime}</span>}{r.rate && <span className="text-slate-500"> · rate: {r.rate}</span>}</td>
                <td className="p-1.5 text-slate-600 dark:text-slate-400">{r.note} {r.cautions.filter(c => c.severity !== 'note').map((c, j) => <CautionChipView key={j} c={c} />)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ))}
    <button type="button" onClick={() => {
      const lines: string[] = [`SE Med Ladder — ${weightKg} kg, ${ageBand}, ${ivAccess ? 'IV+' : 'No IV'}`];
      const blocks: [string, typeof phase2][] = [['1st-line', phase2], ['2nd-line', phase3], ['Refractory', phase4], ['SRSE', phase5]];
      for (const [lbl, recs] of blocks) {
        lines.push(`\n[${lbl}]`);
        for (const r of recs) lines.push(`  ${r.drug} ${r.route}: ${r.mg > 0 ? r.mg + ' mg' : '—'}${r.infusionTime ? ' ' + r.infusionTime : ''}${r.rate ? ' (' + r.rate + ')' : ''}`);
      }
      const text = lines.join('\n');
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text);
    }}
      className="text-xs px-2.5 py-1 rounded border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30">
      Copy summary to clipboard
    </button>
  </div>
)}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add components/se-ladder
git commit -m "SE Ladder: dosing card tab with copy-to-clipboard"
```

---

## Task 17: Refractory & weaning tab — detailed RSE + SRSE content

**Files:**
- Modify: `components/se-ladder/SEMedLadder.tsx`

- [ ] **Step 1: Replace the `tab === 'refractory'` body**

```tsx
{tab === 'refractory' && (
  <div className="space-y-5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
    <section>
      <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 text-base">Phase 4 — Refractory SE management</h4>
      <p><strong>Midazolam infusion (primary 3rd-line).</strong> Bolus 0.1–0.15 mg/kg over 2 min; start 0.1 mg/kg/hr; rebolus 0.1–0.15 mg/kg and ↑ by 0.1 mg/kg/hr every 15–30 min as needed. Usual switch threshold ≥0.6–1 mg/kg/hr; absolute max 2 mg/kg/hr. Intubate; start continuous EEG.</p>
      <p className="mt-2"><strong>Ketamine infusion (alternative or early adjunct).</strong> Bolus 2 mg/kg over 5 min; start 0.5–1 mg/kg/hr; rebolus 1.5 mg/kg; ↑ by 0.5 mg/kg/hr q30–120 min to a max of 6 mg/kg/hr. Decrease 10–20% if oversuppressed on EEG. Evidence summary populated in Task 21 (WebSearch).</p>
      <p className="mt-2"><strong>EEG goal:</strong> electrographic seizure cessation or agreed burst-suppression pattern (typically 1 burst/10 s). Maintain ≈24 h of electrographic control before weaning. Reassess at least q2h; oversuppression (&lt;1 burst/page) → decrease infusion 10–20%.</p>
    </section>

    <section>
      <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 text-base">Phase 5 — Super-refractory SE management</h4>
      <p><strong>Pentobarbital infusion.</strong> Bolus 2–5 mg/kg over 15 min; start 0.5 mg/kg/hr; rebolus 1–2 mg/kg; ↑ by 0.5 mg/kg/hr to max 5 mg/kg/hr. Goal: burst-suppression on EEG. Reserved for SRSE — used a few times per year. Burden: hemodynamic, immunosuppression, GI dysmotility.</p>
      <p className="mt-2"><strong>FIRES / NORSE adjuncts.</strong> Anakinra (IL-1Ra) per rheum/ICU/Neuro protocol; ketogenic diet initiation; pulse methylprednisolone ± IVIG ± plasma exchange; consider tocilizumab in select FIRES.</p>
      <p className="mt-2"><strong>Anesthetic rotation.</strong> When one anesthetic fails after 24–48 h at therapeutic doses, consider rotating among midazolam / ketamine / propofol / pentobarbital / inhaled isoflurane.</p>
    </section>

    <section>
      <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 text-base">Weaning</h4>
      <p>Typical starting approach after <strong>24–48 h seizure-free</strong> on EEG.</p>
      <ul className="list-disc list-inside ml-2 mt-1 space-y-0.5">
        <li><strong>Midazolam:</strong> decrease by 0.1 mg/kg/hr every 1–3 h.</li>
        <li><strong>Ketamine:</strong> decrease by 1 mg/kg/hr every 1–3 h.</li>
        <li><strong>Pentobarbital:</strong> decrease by 1 mg/kg/hr every 1–3 h.</li>
      </ul>
      <p className="mt-2">If seizures recur during wean, resume the prior tolerated rate and consider adjunctive ASM optimization before re-attempting.</p>
    </section>

    <section>
      <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 text-base">Monitoring</h4>
      <ul className="list-disc list-inside ml-2 space-y-0.5">
        <li><strong>Airway:</strong> intubate if GCS 3–8, poor airway protection, or deep anesthetic dosing needed. Target normocapnia (PaCO₂ 40–45 mmHg).</li>
        <li><strong>Hemodynamics:</strong> maintain age-appropriate normal BP; avoid hypotension. Ensure adequate intravascular volume.</li>
        <li><strong>Labs:</strong> per institutional checklist — CBC, CMP, blood gas + lactate, INR/PTT, Mg/Phos, glucose q4h × 4 then q8h.</li>
      </ul>
    </section>
  </div>
)}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add components/se-ladder
git commit -m "SE Ladder: refractory & weaning tab — RSE/SRSE detail + weaning + monitoring"
```

---

## Task 18: Teaching tab content

**Files:**
- Modify: `components/se-ladder/SEMedLadder.tsx`

- [ ] **Step 1: Replace the `tab === 'teaching'` body**

```tsx
{tab === 'teaching' && (
  <div className="max-w-2xl text-sm text-slate-700 dark:text-slate-300 space-y-5 leading-relaxed">
    <section>
      <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-base">ILAE 2015 — t1 / t2 framework</h4>
      <p>Trinka et al. (Epilepsia 2015) operationalized status epilepticus in time: <strong>t1</strong> = when you start treating as SE; <strong>t2</strong> = when long-term consequences (brain injury, pharmacoresistance) become a concern. For convulsive SE, t1 = 5 min and t2 = 30 min. Early treatment matters because pharmacoresistance progresses with each unsuccessful intervention.</p>
    </section>

    <section>
      <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-base">ESETT — three 2nd-line drugs ≈ equivalent</h4>
      <p>Kapur et al. (NEJM 2019) showed fosphenytoin, levetiracetam, and valproate produce seizure cessation in roughly half of patients each. Practical implication: pick by patient features (cautions, contraindications, availability), not by relative efficacy.</p>
    </section>

    <section>
      <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-base">Why levetiracetam often goes first now</h4>
      <p>Cleaner side-effect profile, no cardiac monitoring needed, broad indication (no contraindication in Dravet), ease of administration. Many institutions now default to levetiracetam as 2nd-line first choice. Fosphenytoin remains primary when levetiracetam is contraindicated/unavailable or when sodium-channel mechanism is desired.</p>
    </section>

    <section>
      <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-base">Ketamine's role in refractory SE</h4>
      <p>NMDA receptor blockade mechanistically complements GABAergic agents (lorazepam/midazolam) — synergy is established preclinically (Niquet 2017, Ann Neurol). Clinical signal favors <strong>earlier rather than later</strong> initiation (Jacobwitz 2022). Consider adding ketamine to or substituting for midazolam in Phase 4 rather than waiting until Phase 5.</p>
    </section>

    <section>
      <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-base">Pentobarbital reserved for SRSE</h4>
      <p>Hemodynamic, immunosuppression, and GI-dysmotility burden plus prolonged ICU stay make pentobarbital a Phase 5 drug — used a few times per year at most. Burst-suppression on EEG is the standard target.</p>
    </section>

    <section>
      <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-base">Non-convulsive and focal SE</h4>
      <p>This tool is calibrated for <em>convulsive</em> SE. Non-convulsive SE requires EEG to detect and a less time-critical pharmacologic escalation. Focal SE with impaired awareness has a different time framework (ILAE t1 = 10 min, t2 &gt; 60 min). Consult neurology / cEEG early.</p>
    </section>

    <section>
      <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-base">FIRES / NORSE</h4>
      <p>Febrile Infection-Related Epilepsy Syndrome (FIRES) and New-Onset Refractory SE (NORSE): suspect in a previously healthy patient with refractory SE preceded by a febrile prodrome (FIRES) or no clear cause (NORSE). Immunotherapy should start early — anakinra + pulse steroids ± IVIG. Ketogenic diet initiation. Hirsch et al. 2018 consensus paper is the standard reference.</p>
    </section>

    <section>
      <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-base">Common pitfalls</h4>
      <ul className="list-disc list-inside ml-2 space-y-0.5">
        <li>Under-dosing benzos (the most common error).</li>
        <li>Not repeating the benzo when the first dose was inadequate.</li>
        <li>Delay from benzo failure to 2nd-line load (target ≤10 min).</li>
        <li>Late ICU consultation / cEEG initiation.</li>
        <li>Persisting on one anesthetic strategy too long when it isn't working at 24 h.</li>
      </ul>
    </section>
  </div>
)}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add components/se-ladder
git commit -m "SE Ladder: teaching tab — ILAE, ESETT, ketamine rationale, FIRES/NORSE, pitfalls"
```

---

## Task 19: References tab content

**Files:**
- Modify: `components/se-ladder/SEMedLadder.tsx`

- [ ] **Step 1: Replace the `tab === 'refs'` body**

```tsx
{tab === 'refs' && (
  <div className="max-w-2xl text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">References (PubMed format)</h4>
    <ol className="space-y-2 list-decimal list-inside">
      <li>Trinka E, Cock H, Hesdorffer D, et al. A definition and classification of status epilepticus — Report of the ILAE Task Force on Classification of Status Epilepticus. Epilepsia. 2015;56(10):1515-1523. PMID: 26336950.</li>
      <li>Glauser T, Shinnar S, Gloss D, et al. Evidence-Based Guideline: Treatment of Convulsive Status Epilepticus in Children and Adults. Epilepsy Curr. 2016;16(1):48-61. PMID: 26900382.</li>
      <li>Kapur J, Elm J, Chamberlain JM, et al. Randomized Trial of Three Anticonvulsant Medications for Status Epilepticus (ESETT). N Engl J Med. 2019;381(22):2103-2113. PMID: 31774955.</li>
      <li>Niquet J, Baldwin R, Suchomelova L, et al. Benzodiazepine-refractory status epilepticus: pathophysiology and principles of treatment. Ann N Y Acad Sci. 2016;1378(1):166-173. PMID: 27606928.</li>
      <li>Rosati A, L&apos;Erario M, Ilvento L, et al. Efficacy and safety of ketamine in refractory status epilepticus in children (KETASER01). Neurology. 2018;90(13):e1129-e1135. PMID: 29490863.</li>
      <li>Jacobwitz M, Mulvihill C, Kaufman MC, et al. Ketamine for Management of Neonatal and Pediatric Refractory Status Epilepticus. Neurology. 2022;99(15):e1602-e1612. PMID: 35977840.</li>
      <li>Höfler J, Trinka E. Intravenous ketamine in status epilepticus. Epilepsia. 2018;59(S2):198-206. PMID: 30146751.</li>
      <li>Gaspard N, Foreman B, Judd LM, et al. Intravenous ketamine for the treatment of refractory status epilepticus: a retrospective multicenter study. Epilepsia. 2013;54(8):1498-1503. PMID: 23758557.</li>
      <li>Hirsch LJ, Gaspard N, van Baalen A, et al. Proposed consensus definitions for new-onset refractory status epilepticus (NORSE), febrile infection-related epilepsy syndrome (FIRES), and related conditions. Epilepsia. 2018;59(4):739-744. PMID: 29399791.</li>
    </ol>
    <p className="mt-3 text-slate-500 dark:text-slate-400">Institutional pathway: <a href="/epilepsy#status-epilepticus-pathway" className="text-blue-600 dark:text-blue-400 hover:underline">Status Epilepticus Pathway (Epilepsy section)</a>, <a href="/pdfs/pathways/refractory-status-epilepticus-pathway.pdf" target="_blank" rel="noopener" className="text-blue-600 dark:text-blue-400 hover:underline">Refractory SE Pathway PDF</a>. Additional ketamine sources may be added in Task 21 after WebSearch verification.</p>
  </div>
)}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add components/se-ladder
git commit -m "SE Ladder: references tab"
```

---

## Task 20: Integrate the widget (page.tsx + TOC + index + search)

**Files:**
- Modify: `app/[section]/page.tsx`
- Modify: `src/data/neurocritical-care.json`
- Modify: `src/data/index.json`
- Modify: `src/data/search.json`
- Modify: `public/search.json`

- [ ] **Step 1: Register in `app/[section]/page.tsx`**

Find:

```tsx
import NeonatalHIECalculator from '@/components/hie/NeonatalHIECalculator';
```

Replace with:

```tsx
import NeonatalHIECalculator from '@/components/hie/NeonatalHIECalculator';
import SEMedLadder from '@/components/se-ladder/SEMedLadder';
```

Find:

```tsx
  'neurocritical-care': [
    { id: 'hie-calculator', Component: NeonatalHIECalculator },
  ],
```

Replace with:

```tsx
  'neurocritical-care': [
    { id: 'hie-calculator', Component: NeonatalHIECalculator },
    { id: 'se-med-ladder',  Component: SEMedLadder },
  ],
```

- [ ] **Step 2: Update JSON data files (TOC + tocCount + search) via a one-shot node script**

```bash
node -e "
const fs=require('fs');
const ID='se-med-ladder';
const ENTRY={level:1,text:'Status Epilepticus Med Ladder',id:ID};
const SEARCH={section:'neurocritical-care',sectionName:'Neurocritical Care',heading:'Status Epilepticus Med Ladder',id:ID,text:''};
function read(p){return fs.readFileSync(p,'utf8');}
function dump(p,obj,pretty){fs.writeFileSync(p, pretty? JSON.stringify(obj,null,2)+'\n' : JSON.stringify(obj));}
{ const p='src/data/neurocritical-care.json'; const t=read(p); const pretty=t.includes('\n  '); const d=JSON.parse(t); d.toc.push(ENTRY); dump(p,d,pretty); console.log('neurocritical-care toc length:',d.toc.length); }
{ const p='src/data/index.json'; const t=read(p); const pretty=t.includes('\n  '); const d=JSON.parse(t); d.find(x=>x.slug==='neurocritical-care').tocCount+=1; dump(p,d,pretty); console.log('index tocCount updated'); }
for (const p of ['src/data/search.json','public/search.json']) { const t=read(p); const pretty=t.includes('\n  '); const d=JSON.parse(t); d.push(SEARCH); dump(p,d,pretty); console.log(p,'length:',d.length); }
"
```

Expected output:
```
neurocritical-care toc length: 12
index tocCount updated
src/data/search.json length: 369
public/search.json length: 369
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 4: Run full vitest suite**

```bash
npx vitest run
```

Expected: all tests pass (HIE 25 + SUDEP 116 + others + SE ladder 30+).

- [ ] **Step 5: Commit**

```bash
git add app/[section]/page.tsx src/data/neurocritical-care.json src/data/index.json src/data/search.json public/search.json
git commit -m "SE Ladder: register widget in Neurocritical Care section"
```

---

## Task 21: WebSearch ketamine percentages + update evidence summary

**Files:**
- Modify: `components/se-ladder/SEMedLadder.tsx` (Refractory tab — evidence summary paragraph; References tab — add any newly-found citations)

- [ ] **Step 1: Search for the conference-quoted ketamine percentages**

Use the `WebSearch` tool with the following queries (run all; collect citations):

1. `"ketamine" status epilepticus pediatric "76%" OR "60%" seizure cessation`
2. `"ketamine" "midazolam" combination refractory status epilepticus synergy pediatric`
3. `ketamine "first-line" "infusion" refractory status epilepticus mortality randomized`
4. `Niquet Wasterlain ketamine midazolam synergy benzodiazepine refractory status epilepticus`
5. `KETASER01 ketamine pediatric refractory status epilepticus response rate`
6. `Jacobwitz 2022 Neurology ketamine pediatric refractory status epilepticus early initiation`

For each result, capture: paper title, journal/year, sample size, the specific percentages or rates reported (ketamine vs midazolam cessation rates, combination effect, time-to-cessation comparisons). If a paper reports numbers close to 76% / 60+% / 80% combo / 45% / 28% / 2% **and** matches the context (5-min cessation, ≥30 min SE, etc.), record the citation.

- [ ] **Step 2: Update the Refractory tab's ketamine evidence-summary paragraph**

In `components/se-ladder/SEMedLadder.tsx`, find the Refractory tab's Phase 4 section paragraph:

```
<p className="mt-2"><strong>Ketamine infusion (alternative or early adjunct).</strong> ... Evidence summary populated in Task 21 (WebSearch).</p>
```

Replace `Evidence summary populated in Task 21 (WebSearch).` with the actual evidence-summary based on what the search found. Two cases:

- **If the search surfaced sources matching the conference numbers**: cite those numbers with the matching reference, e.g. `"In [Author Year]'s [n-patient cohort/study], ketamine produced seizure cessation in X%, vs Y% with midazolam alone; the combination achieved Z% cessation within 30 min."` Include the PMID inline.
- **If the search did NOT surface those exact numbers**: fall back to the strongest available pediatric/adult data. Example template (adjust to actual findings): `"Pediatric data suggest ketamine produces seizure cessation in [X]% of refractory SE patients (Rosati 2018 KETASER01, n=[N]); earlier initiation (<32 h) is associated with improved control (Jacobwitz 2022). Mechanistic rationale for combination with midazolam is established preclinically (Niquet 2016/2017)."`

If a stat cannot be matched to a published source, **omit it** rather than fabricate a citation.

- [ ] **Step 3: Add any new sources to the References tab**

Append any newly-found papers to the References tab's `<ol>` in the same PubMed format. If `Niquet 2016 (Ann N Y Acad Sci)` should be supplemented or replaced by a more specific Niquet 2017 Annals of Neurology paper, update accordingly using the actual found citation.

- [ ] **Step 4: Typecheck + tests**

```bash
npx tsc --noEmit && npx vitest run
```

Expected: exit 0, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add components/se-ladder
git commit -m "SE Ladder: ketamine evidence summary sourced and added to references"
```

---

## Task 22: Final verification — dev server + page renders

**Files:** none modified (verification only)

- [ ] **Step 1: Run the full test suite + typecheck**

```bash
npx vitest run && npx tsc --noEmit
echo "TSC=$?"
```

Expected: all tests pass; TSC=0.

- [ ] **Step 2: Start the dev server in background**

```bash
npm run dev
```

Wait for "Ready" message (the harness runs this in background; you'll be notified when started).

- [ ] **Step 3: Verify `/neurocritical-care` renders with the new widget**

```bash
curl -sS http://localhost:3000/neurocritical-care/ | grep -oE 'id="se-med-ladder"|Status Epilepticus Med Ladder|Pathway walker|First-line benzo' | sort -u
```

Expected output (at least these):
```
First-line benzo
Pathway walker
Status Epilepticus Med Ladder
id="se-med-ladder"
```

- [ ] **Step 4: Stop the dev server**

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
```

- [ ] **Step 5: No-op commit (verification log) — skip if everything already green**

(If any fix was needed during this task, commit it; otherwise this task has no commit.)

---

## Final integration commit (if needed)

If the WebSearch task surfaced changes that landed before the dev verification, no additional commit is needed. The branch should now contain:

```
<hash> Task 22 verification (no-op or fix)
<hash> SE Ladder: ketamine evidence summary sourced and added to references
<hash> SE Ladder: register widget in Neurocritical Care section
<hash> SE Ladder: references tab
<hash> SE Ladder: teaching tab — ILAE, ESETT, ketamine rationale, FIRES/NORSE, pitfalls
<hash> SE Ladder: refractory & weaning tab — RSE/SRSE detail + weaning + monitoring
<hash> SE Ladder: dosing card tab with copy-to-clipboard
<hash> SE Ladder: pathway tab — Phase 5 + neonate redirect + summary panel
<hash> SE Ladder: pathway tab — Phase 4 refractory card
<hash> SE Ladder: pathway tab — Phase 3 second-line ASM card with caution chips
<hash> SE Ladder: pathway tab — Phase 2 first-line benzo card with IV branching
<hash> SE Ladder: pathway tab — Phase 1 stabilization checklist card
<hash> SE Ladder: component scaffold with 5 tabs and global inputs
<hash> SE Ladder: phase-state machine (currentPhase / nextPhase)
<hash> SE Ladder: Phase 5 super-refractory — pentobarbital + FIRES/NORSE adjuncts
<hash> SE Ladder: Phase 4 refractory — midazolam primary + ketamine
<hash> SE Ladder: Phase 3 flag filtering (Dravet, POLG, age, cardiac, renal, home meds)
<hash> SE Ladder: Phase 3 second-line ASM default ordering
<hash> SE Ladder: Phase 2 first-line benzo recommendation (IV branching, Diastat)
<hash> SE Ladder: Phase 1 stabilization checklist
<hash> SE Ladder: Diastat per-age PR dosing chart
<hash> SE Ladder: types + mgFor cap helper
a5f49af SE Med Ladder: design spec
```

Approximately 22 commits.

---

## Post-implementation (out of scope for this plan)

Merge to `main` and push are not in this plan — the user does that explicitly after review. After the final task, ask the user to eyeball the dev build (`/neurocritical-care#se-med-ladder`), then merge + push on their word.
