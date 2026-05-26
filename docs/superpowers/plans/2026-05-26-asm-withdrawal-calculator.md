# ASM Withdrawal Risk Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an interactive, evidence-based seizure-recurrence calculator (Lamberink 2017 + Dai 2025) at the bottom of the Epilepsy section, with verified math and full dark-mode styling.

**Architecture:** Pure calculation logic + point tables live in `lib/asm-withdrawal/calculator.ts` (vitest-tested, matching the repo's `lib/<feature>/__tests__` pattern). A `'use client'` component in `components/asm-withdrawal/` renders the UI and imports the logic. `app/[section]/page.tsx` renders the component as a sibling after `<SectionContent>` only when the slug is `epilepsy` (Approach B). A TOC entry in `epilepsy.json` makes it reachable from the sidebar + mobile nav.

**Tech Stack:** Next.js 14 (static export), React 18, TypeScript, Tailwind CSS, vitest.

**Refinement vs spec:** The spec put calc logic inside the `.tsx`. This plan instead splits it into `lib/asm-withdrawal/calculator.ts` to follow the repo's existing test pattern (`lib/resources/__tests__`, `lib/board-review`) and make the verification gate executable as unit tests. No behavior change.

---

## File Structure

- **Create** `lib/asm-withdrawal/calculator.ts` — types, Lamberink + Dai point tables, `calcLamberink()`, `calcDai()`. Pure, no React.
- **Create** `lib/asm-withdrawal/__tests__/calculator.test.ts` — worked-example + strata tests (the verification gate).
- **Create** `components/asm-withdrawal/ASMWithdrawalCalculator.tsx` — `'use client'` UI; imports from the lib. Dark-mode + epilepsy-purple styling; no outer page chrome.
- **Modify** `app/[section]/page.tsx` — render the calculator after `<SectionContent>` for `params.section === 'epilepsy'`.
- **Modify** `src/data/epilepsy.json` — append one level-1 TOC entry.
- **Modify** `src/data/index.json` — bump epilepsy `tocCount` by 1.
- **Delete** `components/ASM Withdrawal/` — the original draft folder (after porting).

---

## Task 1: Port calculation logic to `lib/asm-withdrawal/calculator.ts` (TDD)

**Files:**
- Create: `lib/asm-withdrawal/calculator.ts`
- Test: `lib/asm-withdrawal/__tests__/calculator.test.ts`

The point arrays below are copied verbatim from the draft at `components/ASM Withdrawal/asm-withdrawal-calculator.jsx` (lines 28–53), which were ported from the UMC Utrecht `aed-calc.js`. Task 2 independently verifies them against the source.

- [ ] **Step 1: Write the failing test**

Create `lib/asm-withdrawal/__tests__/calculator.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- lib/asm-withdrawal`
Expected: FAIL — cannot resolve `../calculator` (module does not exist yet).

- [ ] **Step 3: Write the implementation**

Create `lib/asm-withdrawal/calculator.ts`:

```ts
/* ASM Withdrawal Risk Calculator — pure logic.
   Lamberink 2017 (Lancet Neurol; PMID 28483337) point tables ported from the
   official UMC Utrecht implementation (github.com/wmotte/epilepsypredictiontools,
   aed-calc.js, Apache-2.0). Dai 2025 (eClinicalMedicine; PMID 40134561) 0-17 score. */

export type LamberinkInputs = {
  duration: number;   // epilepsy duration before remission, 0-40 y
  ttr: number;        // seizure-free interval before withdrawal, 0-24 y
  naed: number;       // number of ASMs before withdrawal, 0-9 (long-term only)
  ageonset: number;   // age at seizure onset, 0-80 y
  sex: 'male' | 'female';
  famhist: 'yes' | 'no';
  histfeb: 'yes' | 'no';
  nseizures: '0-9' | '10+';
  benign: 'yes' | 'no';        // self-limiting epilepsy syndrome
  delay: 'yes' | 'no';         // developmental delay / IQ < 70
  focal: 'yes' | 'no';
  eeg: 'normal' | 'notdone' | 'epileptiform';
};

export type RiskValue = number | string | null;

export type LamberinkResult = {
  scoreRec: number;
  scoreLong: number;
  risk2y: RiskValue;
  risk5y: RiskValue;
  riskLong: RiskValue;
};

export type DaiInputs = {
  ageOnsetD: '<10' | '10+';
  durationD: '<3' | '3+';
  eegStart: 'normal' | 'abnormal';
  eegAfter: 'normal' | 'abnormal';
  febrile: 'yes' | 'no';
  intellectual: 'yes' | 'no';
  motor: 'yes' | 'no';
  nASM: '1' | '2+';
  focalOnly: 'yes' | 'no';
};

export type DaiResult = {
  score: number;
  stratum: 'Low' | 'Moderate' | 'High';
  rr: string;
  interp: string;
  maxScore: number;
};

// ---------- LAMBERINK 2017 POINT TABLES (verbatim from UMC Utrecht) ----------

const TTR_VALUES = [24,23,22,21,20,19,18,17,16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,1,0];
const TTR_PTS_REC  = [0.0,1.0,2.0,3.0,4.0,5.0,5.5,6.5,7.5,8.5,9.5,10.5,11.5,12.5,13.0,14.0,15.0,16.0,17.0,18.0,19.0,19.5,20.0,20.0,20.0];
const TTR_PTS_LONG = [0,1,1.5,2,3,4,4.5,5,6,6.5,7.5,8,9,9.5,10.5,11,12,12.5,13.5,14,15,16,17,18.5,20];

const DUR_VALUES = Array.from({ length: 41 }, (_, i) => i);
const DUR_PTS_REC  = [0,2,3.5,5,6,7,7.5,8,8,8.5,8.5,8.5,8.5,8.5,9,9,9,9,9,9,9,9,9.5,9.5,9.5,9.5,9.5,9.5,9.5,10,10,10,10,10,10,10,10,10.5,10.5,10.5,10.5];
const DUR_PTS_LONG = [0,1,2.5,3,4,4.5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5];

const AGE_VALUES = [3,4,2,5,1,6,0,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,
                   26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,
                   50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,
                   74,75,76,77,78,79,80];
const AGE_PTS = [0,0,0.5,1,1.5,2,2.5,3.5,5,5.5,6.5,6.5,6.5,6.5,6.5,6.5,6.5,6.5,6.5,6.5,
                 6.5,6.5,6.5,6.5,6.5,6.5,6.5,6.5,6.5,6.5,6.5,6.5,6.5,7,7,7,7,7,7.5,7.5,
                 7.5,7.5,7.5,7.5,8,8,8,8,8,8.5,8.5,8.5,8.5,8.5,9,9,9,9,9,9,9.5,9.5,
                 9.5,9.5,9.5,10,10,10,10,10,10.5,10.5,10.5,10.5,10.5,10.5,11,11,11,11,11];

const NAED_PTS_LONG = [0,0,1.5,3,4.5,6,7,8.5,10,11.5];

const RISK_2Y: RiskValue[] = ['<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10',10,11,11,12,13,13,14,14,15,16,16,17,18,18,19,19,20,21,22,23,24,26,27,28,29,30,31,33,34,36,37,39,40,41,43,44,46,47,49,50,52,53,55,57,58,60,62,64,66,68,70,72,73,75,77,78,80,81,83,84,86,87,89,90,'>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90'];
const RISK_5Y: RiskValue[] = ['<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10','<10',10,11,11,12,13,13,14,15,15,16,17,17,18,19,19,20,21,22,23,24,26,27,28,29,30,31,33,34,35,36,38,39,40,42,43,45,47,48,50,52,53,55,57,58,60,62,64,66,68,70,72,73,75,77,78,80,81,83,84,86,87,89,90,'>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90','>90'];
const RISK_LONG: RiskValue[] = ['>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99','>99',99,99,99,99,98,98,98,98,98,97,97,97,96,96,95,94,94,93,92,91,91,90,89,87,86,84,83,81,80,78,75,73,70,67,63,60,57,53,50,47,43,40,'<40','<40','<40','<40','<40','<40','<40','<40','<40','<40','<40','<40','<40','<40','<40','<40','<40','<40','<40','<40','<40','<40','<40'];

const findIdx = (arr: number[], val: number) => arr.indexOf(val);

const lookupRisk = (total: number, table: RiskValue[]): RiskValue => {
  const idx = Math.round(total * 2);
  if (idx < 0 || idx >= table.length) return null;
  return table[idx];
};

export function calcLamberink(inputs: LamberinkInputs): LamberinkResult | null {
  const {
    duration, ttr, naed, ageonset, sex, famhist, histfeb,
    nseizures, benign, delay, focal, eeg,
  } = inputs;

  const ttrC = Math.min(24, Math.max(0, ttr));
  const durC = Math.min(40, Math.max(0, duration));
  const ageC = Math.min(80, Math.max(0, ageonset));
  const naedC = Math.min(9, Math.max(0, naed));

  const ttrIdx = findIdx(TTR_VALUES, ttrC);
  const durIdx = findIdx(DUR_VALUES, durC);
  const ageIdx = findIdx(AGE_VALUES, ageC);
  if (ttrIdx < 0 || durIdx < 0 || ageIdx < 0) return null;

  const histfebPts   = histfeb === 'yes' ? 3.5 : 0;
  const nseizPtsRec  = nseizures === '10+' ? 3.0 : 0;
  const nseizPtsLong = nseizures === '10+' ? 2.5 : 0;
  const benignPts    = benign === 'yes' ? 0 : 5.5;
  const delayPts     = delay === 'yes' ? 2.0 : 0;
  const eegPtsRec    = eeg === 'epileptiform' ? 4 : 0;
  const eegPtsLong   = eeg === 'epileptiform' ? 2 : 0;
  const sexPts       = sex === 'female' ? 1.5 : 0;
  const famhistPts   = famhist === 'yes' ? 2.0 : 0;
  const focalPts     = focal === 'yes' ? 3.0 : 0;

  const totalRec = TTR_PTS_REC[ttrIdx] + DUR_PTS_REC[durIdx] + AGE_PTS[ageIdx]
                 + histfebPts + nseizPtsRec + benignPts + delayPts + eegPtsRec;

  const totalLong = TTR_PTS_LONG[ttrIdx] + DUR_PTS_LONG[durIdx] + NAED_PTS_LONG[naedC]
                  + sexPts + famhistPts + nseizPtsLong + focalPts + eegPtsLong;

  const tr = Math.round(totalRec * 2) / 2;
  const tl = Math.round(totalLong * 2) / 2;

  return {
    scoreRec: tr,
    scoreLong: tl,
    risk2y: lookupRisk(tr, RISK_2Y),
    risk5y: lookupRisk(tr, RISK_5Y),
    riskLong: lookupRisk(tl, RISK_LONG),
  };
}

export function calcDai(inputs: DaiInputs): DaiResult {
  const {
    ageOnsetD, durationD, eegStart, eegAfter, febrile,
    intellectual, motor, nASM, focalOnly,
  } = inputs;

  let score = 0;
  if (ageOnsetD === '10+') score += 2;
  if (durationD === '3+') score += 2;
  if (eegAfter === 'abnormal') score += 3;
  if (eegStart === 'abnormal') score += 2;
  if (febrile === 'yes') score += 2;
  if (intellectual === 'yes') score += 2;
  if (motor === 'yes') score += 1;
  if (nASM === '2+') score += 2;
  if (focalOnly === 'yes') score += 1;

  let stratum: DaiResult['stratum'];
  let rr: string;
  let interp: string;
  if (score <= 3) {
    stratum = 'Low';
    rr = '1.0 (reference)';
    interp = 'Reference group. Lowest observed recurrence rate.';
  } else if (score <= 6) {
    stratum = 'Moderate';
    rr = '4.42 (95% CI 2.85–6.85)';
    interp = 'Approximately 4-fold higher recurrence vs low-risk.';
  } else {
    stratum = 'High';
    rr = '6.52 (95% CI 4.32–9.84)';
    interp = 'Approximately 6-fold higher recurrence vs low-risk.';
  }

  return { score, stratum, rr, interp, maxScore: 17 };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- lib/asm-withdrawal`
Expected: PASS — all tests green. If the two Lamberink worked examples do NOT return 28/36/97, STOP — the porting has an error; do not proceed to styling until resolved.

- [ ] **Step 5: Commit**

```bash
git add lib/asm-withdrawal/calculator.ts lib/asm-withdrawal/__tests__/calculator.test.ts
git commit -m "Add ASM withdrawal calculator logic (Lamberink + Dai) with verified worked examples

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Verify ported tables against the UMC Utrecht source

**Files:** none changed unless a discrepancy is found (then edit `lib/asm-withdrawal/calculator.ts`).

This is the clinical-safety gate from the spec. Use the `WebFetch` tool (load its schema via ToolSearch `select:WebFetch` first).

- [ ] **Step 1: Fetch the source**

Fetch the official implementation, e.g.:
`https://raw.githubusercontent.com/wmotte/epilepsypredictiontools/master/js/aed-calc.js`
(If that path 404s, fetch the repo root `https://github.com/wmotte/epilepsypredictiontools` to locate the JS file, then fetch its raw URL.)

- [ ] **Step 2: Diff the nine structures**

Compare these against the source's equivalents (point arrays and risk-lookup tables):
`TTR_PTS_REC`, `TTR_PTS_LONG`, `DUR_PTS_REC`, `DUR_PTS_LONG`, `AGE_PTS`, `NAED_PTS_LONG`, `RISK_2Y`, `RISK_5Y`, `RISK_LONG`. Also confirm the per-predictor point increments (febrile 3.5, ≥10 seizures 3.0/2.5, self-limiting 5.5, delay 2.0, epileptiform EEG 4/2, female 1.5, family history 2.0, focal 3.0).

- [ ] **Step 3: Resolve discrepancies**

If any value differs, correct `lib/asm-withdrawal/calculator.ts` to match the source, then re-run `npm run test:run -- lib/asm-withdrawal` and confirm the worked examples still produce 28/36/97. If they no longer do, the source disagrees with the published examples — record the conflict in the commit message and surface it to the user before continuing.

**Fallback if the source repo is unreachable:** the Task 1 worked-example tests already reproduce the published 28/36/97; additionally spot-check 3–4 points against the Lamberink 2017 nomogram figure. Document in the commit that a full table diff could not be performed.

- [ ] **Step 4: Commit (only if changes were made)**

```bash
git add lib/asm-withdrawal/calculator.ts
git commit -m "Reconcile Lamberink point tables with UMC Utrecht source

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```
If no changes were needed, note "verified, no changes" in the next commit instead.

---

## Task 3: Build the calculator UI component

**Files:**
- Create: `components/asm-withdrawal/ASMWithdrawalCalculator.tsx`

Port the draft UI to TSX, import logic from the lib, add dark-mode variants, re-accent blue → epilepsy violet, and drop the outer page chrome. Write the complete file below.

- [ ] **Step 1: Write the component**

Create `components/asm-withdrawal/ASMWithdrawalCalculator.tsx`:

```tsx
'use client';

import { useMemo, useState } from 'react';
import {
  calcLamberink,
  calcDai,
  type LamberinkInputs,
  type DaiInputs,
  type RiskValue,
} from '@/lib/asm-withdrawal/calculator';

// ---------- UI helpers ----------
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-3">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

function NumInput({ value, onChange, min, max, step = 1 }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
    />
  );
}

function Select<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: [T, string][];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
    >
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

function RiskPill({ value, label, color }: { value: RiskValue; label: string; color: string }) {
  return (
    <div className={`rounded-lg p-3 border ${color}`}>
      <div className="text-xs uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-2xl font-semibold mt-1">
        {value === null || value === undefined ? '—' : `${value}%`}
      </div>
    </div>
  );
}

type Tab = 'lamberink' | 'dai' | 'about';

export default function ASMWithdrawalCalculator() {
  const [tab, setTab] = useState<Tab>('lamberink');

  const [L, setL] = useState<LamberinkInputs>({
    duration: 2, ttr: 2, naed: 1, ageonset: 5,
    sex: 'male', famhist: 'no', histfeb: 'no', nseizures: '0-9',
    benign: 'no', delay: 'no', focal: 'no', eeg: 'normal',
  });

  const [D, setD] = useState<DaiInputs>({
    ageOnsetD: '<10', durationD: '<3', eegStart: 'normal', eegAfter: 'normal',
    febrile: 'no', intellectual: 'no', motor: 'no', nASM: '1', focalOnly: 'no',
  });

  const lamberinkResult = useMemo(() => calcLamberink(L), [L]);
  const daiResult = useMemo(() => calcDai(D), [D]);

  const setL_ = <K extends keyof LamberinkInputs>(k: K) => (v: LamberinkInputs[K]) =>
    setL((s) => ({ ...s, [k]: v }));
  const setD_ = <K extends keyof DaiInputs>(k: K) => (v: DaiInputs[K]) =>
    setD((s) => ({ ...s, [k]: v }));

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      tab === t
        ? 'border-violet-600 text-violet-700 dark:text-violet-400'
        : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
    }`;

  return (
    <div className="not-prose text-slate-900 dark:text-slate-100">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">ASM Withdrawal Risk Calculator</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Individualized estimates of seizure recurrence and sustained seizure freedom after weaning antiseizure medication.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-5 border-b border-slate-200 dark:border-slate-700">
        <button onClick={() => setTab('lamberink')} className={tabClass('lamberink')}>Lamberink 2017 (peds + adults)</button>
        <button onClick={() => setTab('dai')} className={tabClass('dai')}>Dai 2025 (peds only)</button>
        <button onClick={() => setTab('about')} className={tabClass('about')}>About / caveats</button>
      </div>

      {tab === 'lamberink' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wide">Clinical inputs</h4>

            <Field label="Epilepsy duration before remission (years)" hint="From first seizure to onset of sustained remission">
              <NumInput value={L.duration} onChange={setL_('duration')} min={0} max={40} />
            </Field>
            <Field label="Seizure-free interval before withdrawal (years)" hint="Years from last seizure to start of taper">
              <NumInput value={L.ttr} onChange={setL_('ttr')} min={0} max={24} />
            </Field>
            <Field label="Age at seizure onset (years)">
              <NumInput value={L.ageonset} onChange={setL_('ageonset')} min={0} max={80} />
            </Field>
            <Field label="Number of ASMs before withdrawal" hint="Long-term outcome only">
              <NumInput value={L.naed} onChange={setL_('naed')} min={0} max={9} />
            </Field>
            <Field label="Sex">
              <Select value={L.sex} onChange={setL_('sex')} options={[['male','Male'],['female','Female']]} />
            </Field>
            <Field label="History of febrile seizures">
              <Select value={L.histfeb} onChange={setL_('histfeb')} options={[['no','No'],['yes','Yes']]} />
            </Field>
            <Field label="Family history of epilepsy" hint="1st or 2nd degree relative">
              <Select value={L.famhist} onChange={setL_('famhist')} options={[['no','No'],['yes','Yes']]} />
            </Field>
            <Field label="≥10 seizures before remission">
              <Select value={L.nseizures} onChange={setL_('nseizures')} options={[['0-9','No (0–9)'],['10+','Yes (≥10)']]} />
            </Field>
            <Field label="Self-limiting epilepsy syndrome" hint="e.g., SeLECTS, CAE, Panayiotopoulos">
              <Select value={L.benign} onChange={setL_('benign')} options={[['no','No'],['yes','Yes']]} />
            </Field>
            <Field label="Developmental delay / IQ <70">
              <Select value={L.delay} onChange={setL_('delay')} options={[['no','No'],['yes','Yes']]} />
            </Field>
            <Field label="Focal seizures present">
              <Select value={L.focal} onChange={setL_('focal')} options={[['no','No'],['yes','Yes']]} />
            </Field>
            <Field label="EEG before withdrawal">
              <Select value={L.eeg} onChange={setL_('eeg')} options={[['normal','Normal'],['notdone','Not performed'],['epileptiform','Epileptiform abnormality']]} />
            </Field>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wide">Predicted outcomes</h4>
            {lamberinkResult ? (
              <>
                <div className="grid grid-cols-1 gap-3 mb-4">
                  <RiskPill label="2-year recurrence risk" value={lamberinkResult.risk2y}
                    color="bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200" />
                  <RiskPill label="5-year recurrence risk" value={lamberinkResult.risk5y}
                    color="bg-red-50 border-red-200 text-red-900 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200" />
                  <RiskPill label="10-year sustained seizure freedom" value={lamberinkResult.riskLong}
                    color="bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-200" />
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 rounded-md p-3 space-y-1">
                  <div>Recurrence score: <span className="font-mono">{lamberinkResult.scoreRec}</span></div>
                  <div>Long-term score: <span className="font-mono">{lamberinkResult.scoreLong}</span></div>
                </div>
                <div className="mt-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  <p className="mb-2">
                    <strong>Interpretation.</strong> Each year of additional seizure freedom reduces relapse risk; the conventional 2-year threshold is an artificial cutoff. Of patients who relapse, ~80% regain seizure control after restarting medication. Refractoriness after withdrawal has not been convincingly demonstrated to be caused by withdrawal itself.
                  </p>
                  <p>
                    Discrimination is moderate (c-stat 0.65 for recurrence, 0.71 for long-term). External validations have shown overprediction in some cohorts — see About tab.
                  </p>
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-500 dark:text-slate-400">Check input values.</div>
            )}
          </div>
        </div>
      )}

      {tab === 'dai' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wide">Clinical inputs</h4>
            <Field label="Age at first seizure">
              <Select value={D.ageOnsetD} onChange={setD_('ageOnsetD')} options={[['<10','<10 years (0 pts)'],['10+','≥10 years (2 pts)']]} />
            </Field>
            <Field label="Duration of epilepsy">
              <Select value={D.durationD} onChange={setD_('durationD')} options={[['<3','<3 years (0 pts)'],['3+','≥3 years (2 pts)']]} />
            </Field>
            <Field label="EEG at start of ASM tapering">
              <Select value={D.eegStart} onChange={setD_('eegStart')} options={[['normal','Normal (0 pts)'],['abnormal','Abnormal (2 pts)']]} />
            </Field>
            <Field label="EEG after ASM tapering" hint="Highest individual predictor (AUC ≈0.79)">
              <Select value={D.eegAfter} onChange={setD_('eegAfter')} options={[['normal','Normal (0 pts)'],['abnormal','Abnormal (3 pts)']]} />
            </Field>
            <Field label="History of febrile seizures">
              <Select value={D.febrile} onChange={setD_('febrile')} options={[['no','No (0 pts)'],['yes','Yes (2 pts)']]} />
            </Field>
            <Field label="Intellectual disability">
              <Select value={D.intellectual} onChange={setD_('intellectual')} options={[['no','No (0 pts)'],['yes','Yes (2 pts)']]} />
            </Field>
            <Field label="Abnormal neuro exam or motor deficit">
              <Select value={D.motor} onChange={setD_('motor')} options={[['no','No (0 pts)'],['yes','Yes (1 pt)']]} />
            </Field>
            <Field label="Total number of ASMs used historically">
              <Select value={D.nASM} onChange={setD_('nASM')} options={[['1','1 (0 pts)'],['2+','≥2 (2 pts)']]} />
            </Field>
            <Field label="Only focal-onset seizures">
              <Select value={D.focalOnly} onChange={setD_('focalOnly')} options={[['no','No / other (0 pts)'],['yes','Only focal (1 pt)']]} />
            </Field>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wide">Risk score</h4>
            <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-lg p-5 mb-4">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Total score</div>
              <div className="text-4xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
                {daiResult.score} <span className="text-lg text-slate-400 dark:text-slate-500">/ {daiResult.maxScore}</span>
              </div>
            </div>
            <div className={`rounded-lg p-4 border-2 ${
              daiResult.stratum === 'Low' ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-200' :
              daiResult.stratum === 'Moderate' ? 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-200' :
              'bg-red-50 border-red-300 text-red-900 dark:bg-red-900/20 dark:border-red-700 dark:text-red-200'
            }`}>
              <div className="text-xs uppercase tracking-wide opacity-75">Risk stratum</div>
              <div className="text-xl font-semibold mt-1">{daiResult.stratum} risk</div>
              <div className="text-sm mt-2">Relative risk vs low-risk group: {daiResult.rr}</div>
              <div className="text-sm mt-2 opacity-90">{daiResult.interp}</div>
            </div>
            <div className="mt-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <p className="mb-2"><strong>Strata.</strong> Low ≤3, Moderate 4–6, High ≥7. Cutoff 4 corresponds to a 31.7% recurrence probability (95% CI 25.7–37.7) in the validation cohort.</p>
              <p className="mb-2"><strong>Note.</strong> Seizure-free interval was not retained in this pediatric meta-analysis (lost significance in pooled analysis), although a minimum 2 years remains clinically advisable. EEG after tapering carries the most predictive weight.</p>
              <p>Derivation 4,080 children across 26 cohorts; validation in 341 Chinese children: AUC 0.85, sensitivity 0.74, specificity 0.82. External validation outside Asia not yet published.</p>
            </div>
          </div>
        </div>
      )}

      {tab === 'about' && (
        <div className="max-w-2xl text-sm text-slate-700 dark:text-slate-300 space-y-4 leading-relaxed">
          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">When to use which</h4>
            <p>Lamberink applies broadly (children and adults, medical cohorts; does <em>not</em> apply post-resective surgery — use the TimeToStop nomogram for that). Dai is pediatric-specific and adds post-taper EEG as a strong, dynamic input.</p>
          </section>
          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Discordance worth knowing</h4>
            <ul className="space-y-1.5 list-disc list-inside">
              <li><strong>Seizure-free interval:</strong> Lamberink retains it; Dai dropped it (NS on pediatric meta-analysis). Both groups still recommend ≥2 years clinically.</li>
              <li><strong>Age at onset:</strong> Lamberink finds U-shaped risk; Dai finds onset ≥10 years confers higher recurrence (likely reflecting fewer self-limited syndromes in older-onset pediatric epilepsy).</li>
              <li><strong>Number of historical seizures:</strong> Significant in Lamberink, dropped in Dai (cited unreliability of parental recall).</li>
              <li><strong>Sex / family history:</strong> Predict long-term outcome in Lamberink; not significant in Dai&apos;s pediatric pool.</li>
            </ul>
          </section>
          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Validation caveats</h4>
            <p className="mb-2">The Lamberink model has been externally validated multiple times with mixed results: it has overpredicted relapse risk in at least two external cohorts and showed poor calibration in a third (Lin et al. and others, summarized in Hakeem et al. medRxiv 2022). Adjusted c-statistic is 0.65 (recurrence), suggesting modest individual-level discrimination despite good population-level fit.</p>
            <p>The Dai 2025 model shows higher AUC (0.85) but has only been validated in a single Chinese cohort. Generalizability to other populations is unconfirmed.</p>
          </section>
          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Background numbers</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Pooled relapse rate after withdrawal: ~34% (Lamberink 2015 meta-analysis); 46% in the IPD cohort (higher, reflecting RCT-heavy mix).</li>
              <li>Of relapsers, ~80% regain seizure control on reinstated ASM at short-term follow-up; this proportion rises to ~88% with &gt;15 years follow-up.</li>
              <li>In the MRC trial, 2-year relapse was 41% (withdrawal) vs 22% (continued ASM).</li>
              <li>In peds (Dai cohort): 83% of relapses occur within 2 years of withdrawal.</li>
            </ul>
          </section>
          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">References</h4>
            <ol className="space-y-2 text-xs list-decimal list-inside">
              <li>Lamberink HJ, Otte WM, Geerts AT, et al. Individualised prediction model of seizure recurrence and long-term outcomes after withdrawal of antiepileptic drugs in seizure-free patients: a systematic review and individual participant data meta-analysis. Lancet Neurol. 2017;16(7):523-531. PMID: 28483337.</li>
              <li>Dai K, Tang D, Bao L, et al. Development and validation of a predictive model for seizure recurrence following discontinuation of antiseizure medication in children with epilepsy. eClinicalMedicine. 2025;82:103154. PMID: 40134561.</li>
              <li>Lamberink HJ, Boshuisen K, Otte WM, et al. Individualized prediction of seizure relapse and outcomes following antiepileptic drug withdrawal after pediatric epilepsy surgery. Epilepsia. 2018;59(3):e28-e33. PMID: 29446447.</li>
              <li>Gloss D, Pargeon K, Pack A, et al. Antiseizure medication withdrawal in seizure-free patients: practice advisory update summary. Neurology. 2021;97(23):1072-1081. PMID: 34873018.</li>
              <li>MRC AED Withdrawal Study Group. Randomised study of antiepileptic drug withdrawal in patients in remission. Lancet. 1991;337(8751):1175-1180. PMID: 1673736.</li>
              <li>Lossius MI, Hessen E, Mowinckel P, et al. Consequences of antiepileptic drug withdrawal: a randomized, double-blind study (Akershus study). Epilepsia. 2008;49(3):455-463. PMID: 17888074.</li>
            </ol>
          </section>
          <section className="text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-3">
            Lamberink point tables ported from the official UMC Utrecht implementation (github.com/wmotte/epilepsypredictiontools, Apache-2.0). This tool is decision-support and does not replace clinical judgment.
          </section>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check the component**

Run: `npx tsc --noEmit`
Expected: PASS — no type errors. (Common gotchas: the generic `Select<T>` and `setL_`/`setD_` signatures must infer correctly; if `tsc` complains about the option tuples, ensure each `options` array is typed as `[T, string][]` via the literal values.)

- [ ] **Step 3: Commit**

```bash
git add components/asm-withdrawal/ASMWithdrawalCalculator.tsx
git commit -m "Add ASM withdrawal calculator UI (dark mode, epilepsy accent)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Wire the calculator into the Epilepsy section

**Files:**
- Modify: `app/[section]/page.tsx`
- Modify: `src/data/epilepsy.json`
- Modify: `src/data/index.json`

- [ ] **Step 1: Render the component for the epilepsy slug**

In `app/[section]/page.tsx`, add the import near the other component imports (top of file):

```tsx
import ASMWithdrawalCalculator from '@/components/asm-withdrawal/ASMWithdrawalCalculator';
```

Then inside the `<article>`, immediately after `<SectionContent html={data.html} />` and the `<ImageLightbox />` line, before the Prev/Next `<div>`, insert:

```tsx
{params.section === 'epilepsy' && (
  <section id="asm-withdrawal-calculator" className="scroll-mt-24 mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
    <ASMWithdrawalCalculator />
  </section>
)}
```

- [ ] **Step 2: Add the TOC entry**

In `src/data/epilepsy.json`, append one entry to the END of the `toc` array (after the last entry, currently the VPA toxicity group). The new entry:

```json
{ "level": 1, "text": "ASM Withdrawal Risk Calculator", "id": "asm-withdrawal-calculator" }
```

The `id` MUST exactly match the `<section id>` from Step 1. Edit by hand — find the closing `]` of the `toc` array and add the entry as the final element (add a comma after the previous last entry).

- [ ] **Step 3: Bump the index tocCount**

In `src/data/index.json`, find the `epilepsy` entry and increase its `tocCount` by 1 (it currently reflects 93 TOC entries → set to 94). This keeps the homepage "topics" count accurate.

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: PASS — static export completes with no errors. Confirm `out/epilepsy/index.html` (or the build output) is produced without a type/render error referencing the new component.

- [ ] **Step 5: Visually verify in dev (manual)**

Run: `npm run dev` (note the port it selects). Open `/epilepsy/`, scroll to the bottom: the calculator renders below VPA Toxicity, the TOC sidebar + mobile pills list "ASM Withdrawal Risk Calculator", clicking it scrolls to the calculator, the three tabs switch, and toggling dark mode restyles the calculator correctly. Change a couple of inputs and confirm the risk pills update.

- [ ] **Step 6: Commit**

```bash
git add app/[section]/page.tsx src/data/epilepsy.json src/data/index.json
git commit -m "Embed ASM withdrawal calculator at bottom of Epilepsy section

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Remove the draft and run final verification

**Files:**
- Delete: `components/ASM Withdrawal/`

- [ ] **Step 1: Delete the original draft folder**

```bash
git rm -r "components/ASM Withdrawal"
```
(If the folder is untracked rather than committed, use `rm -r "components/ASM Withdrawal"` instead.)

- [ ] **Step 2: Run the full test suite**

Run: `npm run test:run`
Expected: PASS — all tests, including `lib/asm-withdrawal/__tests__/calculator.test.ts`.

- [ ] **Step 3: Run the production build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Remove ASM withdrawal draft; calculator now lives in lib + components

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review Notes

- **Spec coverage:** Models (Task 1), verification gate (Tasks 1–2), TSX conversion + dark mode + purple accent + chrome removal (Task 3), Approach-B integration + TOC entry + tocCount (Task 4), draft removal + build (Task 5), caveats preserved verbatim (Task 3 About tab). All spec success criteria mapped.
- **Deviation from spec:** logic split into `lib/asm-withdrawal/` (testability); documented in header.
- **Type consistency:** `LamberinkInputs`, `DaiInputs`, `RiskValue`, `LamberinkResult`, `DaiResult` defined in Task 1 and consumed unchanged in Task 3. `calcLamberink` returns `LamberinkResult | null`; the component null-checks before rendering.
- **Naming:** `id="asm-withdrawal-calculator"` is used identically in Task 4 Step 1 (section), Step 2 (TOC entry), and matches the scroll target.
