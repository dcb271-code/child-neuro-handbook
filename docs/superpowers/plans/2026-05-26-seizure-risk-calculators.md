# Seizure Risk Calculators Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a second Epilepsy-section calculator suite (first unprovoked seizure recurrence; febrile seizure recurrence; febrile → future epilepsy) below the existing ASM Withdrawal calculator.

**Architecture:** Pure logic + lookup tables in `lib/seizure-risk/calculator.ts` (vitest-tested). A `'use client'` component in `components/seizure-risk/` renders the UI and imports the logic. `app/[section]/page.tsx` gains a second `params.section === 'epilepsy'` block rendering the new widget after the withdrawal calc. A TOC entry in `epilepsy.json` makes it reachable.

**Tech Stack:** Next.js 14 (static export), React 18, TypeScript, Tailwind (class-based dark mode), vitest.

**Pattern:** This mirrors the verified ASM Withdrawal calculator (`lib/asm-withdrawal/` + `components/asm-withdrawal/`). Follow that precedent for dark-mode classes, violet accent, label-wrapped fields, and `type="button"` on tabs.

---

## File Structure

- **Create** `lib/seizure-risk/calculator.ts` — types + `calcFirstSeizure`, `calcFebrileRecurrence`, `calcFutureEpilepsy` and tables. Pure, no React.
- **Create** `lib/seizure-risk/__tests__/calculator.test.ts` — published-anchor tests (verification gate).
- **Create** `components/seizure-risk/SeizureRiskCalculators.tsx` — `'use client'` UI, imports from the lib, dark mode + violet, chrome removed.
- **Modify** `app/[section]/page.tsx` — second epilepsy-only block after the withdrawal calc.
- **Modify** `src/data/epilepsy.json` — append one level-1 TOC entry; bump per-file `tocCount` 94→95.
- **Modify** `src/data/index.json` — epilepsy `tocCount` 94→95.
- **Delete** `components/Epilepsy Risk Calc/` — the draft folder (after porting).

---

## Task 1: Port calculation logic to `lib/seizure-risk/calculator.ts` (TDD)

**Files:**
- Create: `lib/seizure-risk/calculator.ts`
- Test: `lib/seizure-risk/__tests__/calculator.test.ts`

The risk values are copied verbatim from the draft at `components/Epilepsy Risk Calc/seizure-risk-calculators.jsx` (lines 38–199). Task 2 spot-checks them against the cited PMIDs.

- [ ] **Step 1: Write the failing test**

Create `lib/seizure-risk/__tests__/calculator.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { calcFirstSeizure, calcFebrileRecurrence, calcFutureEpilepsy } from '../calculator';

describe('calcFirstSeizure', () => {
  it('idiopathic/normal EEG = lowest-risk anchors (untreated 21/26, treated 13/18, no epilepsy dx)', () => {
    const r = calcFirstSeizure({ etiology: 'idiopathic', eeg: 'normal', nocturnal: false, todds: false, priorFS: false });
    expect(r.untreated).toEqual({ r2y: 21, r5y: 26 });
    expect(r.treated).toEqual({ r2y: 13, r5y: 18 }); // round(0.6*21)=13, round(0.7*26)=18
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
    expect(r.epilepsyDx).toBe(false); // 54 < 60
  });

  it('remoteSymptomatic/abnormal + nocturnal crosses the ILAE 60% epilepsy threshold', () => {
    const r = calcFirstSeizure({ etiology: 'remoteSymptomatic', eeg: 'abnormal', nocturnal: true, todds: false, priorFS: false });
    expect(r.epilepsyDx).toBe(true); // 54*1.25 = 67.5 >= 60
    expect(r.untreated.r2y).toBe(68); // round(67.5)
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- lib/seizure-risk`
Expected: FAIL — cannot resolve `../calculator`.

- [ ] **Step 3: Write the implementation**

Create `lib/seizure-risk/calculator.ts`:

```ts
/* Seizure Recurrence Risk Calculators — pure logic.
   1) First unprovoked seizure recurrence — Shinnar 1996 (PMID 8692621),
      Berg/Shinnar 1991 (PMID 2067659); treatment effect from FIRST
      (Musicco 1997) / MESS (Marson 2005); ILAE 2014 dx criterion (PMID 24730690).
   2) Febrile seizure recurrence — Berg/Shinnar 1997 4-factor (PMID 9111436).
   3) Febrile -> future epilepsy — Annegers 1987 (PMID 3807992), refined by
      Sartori 2019 / Whitney 2024 / Jiang 2026 (recurrence-only ~ simple FS) and
      FEBSTAT / Lewis 2025 (PMID 40770931) for the FSE tier.
   Values copied verbatim from the reviewed draft; central estimates for
   counseling, not individual prognostic certainty. */

export type FirstSeizureInputs = {
  etiology: 'idiopathic' | 'remoteSymptomatic';
  eeg: 'normal' | 'abnormal';
  nocturnal: boolean;
  todds: boolean;
  priorFS: boolean;
};

export type FirstSeizureResult = {
  label: string;
  untreated: { r2y: number; r5y: number };
  treated: { r2y: number; r5y: number };
  epilepsyDx: boolean;
};

export type FebrileRecurrenceInputs = {
  ageYoung: boolean;
  familyHistoryFS: boolean;
  lowTemp: boolean;
  shortFever: boolean;
};

export type FebrileRecurrenceResult = { rfCount: number; risk: number; stratum: string };

export type FutureEpilepsyInputs = {
  focal: boolean;
  prolongedLevel: 'no' | 'moderate' | 'fse';
  multipleInDay: boolean;
  priorAbnormality: boolean;
  familyHxEpilepsy: boolean;
};

export type FutureEpilepsyResult = {
  higherRiskCount: number;
  recurrenceOnly: boolean;
  anyComplex: boolean;
  fse: boolean;
  stratum: string;
  baseRisk: number;
  adjustedRisk: number;
  isComplex: boolean;
};

// 2-year / 5-year recurrence by etiology x EEG (Shinnar 1996 extended F/U).
const FIRST_SZ_TABLE: Record<
  FirstSeizureInputs['etiology'],
  Record<FirstSeizureInputs['eeg'], { r2y: number; r5y: number; label: string }>
> = {
  idiopathic: {
    normal:   { r2y: 21, r5y: 26, label: 'Idiopathic etiology, normal EEG (lowest risk)' },
    abnormal: { r2y: 41, r5y: 56, label: 'Idiopathic etiology, abnormal (epileptiform) EEG' },
  },
  remoteSymptomatic: {
    normal:   { r2y: 32, r5y: 40, label: 'Remote symptomatic etiology, normal EEG' },
    abnormal: { r2y: 54, r5y: 65, label: 'Remote symptomatic etiology, abnormal (epileptiform) EEG' },
  },
};

export function calcFirstSeizure(inputs: FirstSeizureInputs): FirstSeizureResult {
  const { etiology, eeg, nocturnal, todds, priorFS } = inputs;
  const base = FIRST_SZ_TABLE[etiology][eeg];
  let r2y = base.r2y;
  let r5y = base.r5y;

  // Modest, approximate relative-risk modifiers (Shinnar/Berg series).
  if (nocturnal) { r2y = Math.min(85, r2y * 1.25); r5y = Math.min(90, r5y * 1.20); }
  if (todds)     { r2y = Math.min(85, r2y * 1.10); r5y = Math.min(90, r5y * 1.08); }
  if (priorFS)   { r2y = Math.min(85, r2y * 1.10); r5y = Math.min(90, r5y * 1.08); }

  // Treatment effect (FIRST/MESS): ~halves 2-yr recurrence, attenuates long-term.
  const treatedR2y = r2y * 0.6;
  const treatedR5y = r5y * 0.7;

  return {
    label: base.label,
    untreated: { r2y: Math.round(r2y), r5y: Math.round(r5y) },
    treated: { r2y: Math.round(treatedR2y), r5y: Math.round(treatedR5y) },
    epilepsyDx: r2y >= 60, // ILAE 2014: single seizure + >=60% recurrence risk
  };
}

// 2-year recurrence by number of risk factors (Berg/Shinnar 1997, n=428).
const FS_RECUR_RISK: Record<number, number> = { 0: 14, 1: 24, 2: 32, 3: 63, 4: 76 };

export function calcFebrileRecurrence(inputs: FebrileRecurrenceInputs): FebrileRecurrenceResult {
  const { ageYoung, familyHistoryFS, lowTemp, shortFever } = inputs;
  const rfCount = [ageYoung, familyHistoryFS, lowTemp, shortFever].filter(Boolean).length;
  const risk = FS_RECUR_RISK[rfCount];
  let stratum: string;
  if (rfCount === 0) stratum = 'Lowest (population baseline)';
  else if (rfCount === 1) stratum = 'Low';
  else if (rfCount === 2) stratum = 'Moderate';
  else stratum = 'High';
  return { rfCount, risk, stratum };
}

export function calcFutureEpilepsy(inputs: FutureEpilepsyInputs): FutureEpilepsyResult {
  const { focal, prolongedLevel, multipleInDay, priorAbnormality, familyHxEpilepsy } = inputs;

  const fse = prolongedLevel === 'fse';
  const moderatelyProlonged = prolongedLevel === 'moderate';
  const anyProlonged = fse || moderatelyProlonged;

  const higherRiskCount = [focal, moderatelyProlonged].filter(Boolean).length;
  const recurrenceOnly = multipleInDay && !focal && !anyProlonged;
  const anyComplex = focal || anyProlonged || multipleInDay;

  let baseRisk: number;
  let stratum: string;
  let fseFlag = false;

  if (fse) {
    fseFlag = true;
    if (priorAbnormality) {
      baseRisk = 40;
      stratum = 'Febrile status epilepticus + prior neurodevelopmental abnormality';
    } else if (focal) {
      baseRisk = 35;
      stratum = 'Febrile status epilepticus + focal features';
    } else {
      baseRisk = 25;
      stratum = 'Febrile status epilepticus (≥30 min) — FEBSTAT high-risk subset';
    }
  } else if (!anyComplex && !priorAbnormality) {
    baseRisk = 2.4;
    stratum = 'Simple FS';
  } else if (recurrenceOnly && !priorAbnormality) {
    baseRisk = 3.5;
    stratum = 'Recurrence within 24h only (behaves like simple FS per recent evidence)';
  } else if (higherRiskCount === 1 && !priorAbnormality) {
    baseRisk = 7;
    stratum = multipleInDay
      ? 'One higher-risk complex feature + recurrence'
      : 'One higher-risk complex feature (focal or 15–29 min prolonged)';
  } else if (higherRiskCount >= 2 && !priorAbnormality) {
    baseRisk = 17;
    stratum = 'Multiple higher-risk complex features';
  } else if (priorAbnormality && !anyComplex) {
    baseRisk = 7;
    stratum = 'Prior neurodevelopmental abnormality';
  } else if (priorAbnormality && recurrenceOnly) {
    baseRisk = 10;
    stratum = 'Prior neurodevelopmental abnormality + recurrence only';
  } else if (priorAbnormality && higherRiskCount >= 1) {
    baseRisk = 22;
    stratum = 'Prior neurodevelopmental abnormality + higher-risk complex features';
  } else {
    baseRisk = 2;
    stratum = 'Baseline';
  }

  let adjusted = baseRisk;
  if (familyHxEpilepsy) adjusted = Math.min(75, baseRisk * 1.5);

  return {
    higherRiskCount,
    recurrenceOnly,
    anyComplex,
    fse: fseFlag,
    stratum,
    baseRisk,
    adjustedRisk: Math.round(adjusted * 10) / 10,
    isComplex: anyComplex,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- lib/seizure-risk`
Expected: PASS. If any anchor differs, STOP — the porting has an error.

- [ ] **Step 5: Commit**

```bash
git add lib/seizure-risk/calculator.ts lib/seizure-risk/__tests__/calculator.test.ts
git commit -m "Add seizure risk calculator logic (first seizure, febrile recurrence, future epilepsy)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: PMID spot-check of the headline numbers

**Files:** none changed unless a number is found to be wrong (then edit `lib/seizure-risk/calculator.ts` + its test).

Use WebFetch/WebSearch (load schemas via ToolSearch `select:WebFetch` / `select:WebSearch`). These values are clinically assigned (no source code to diff), so spot-check a representative subset against the cited papers and confirm they sit within published ranges.

- [ ] **Step 1: Spot-check the anchors**

Verify against the cited literature (abstracts suffice):
- Shinnar 1996 (PMID 8692621): idiopathic/normal lowest (~21% 2-yr) and remote-symptomatic/epileptiform highest (~63–65% 5-yr) recurrence — confirm the 21/41/32/54 (2-yr) and 26/56/40/65 (5-yr) grid sits within reported ranges.
- FIRST/MESS (Musicco 1997 / Marson 2005): treatment roughly halves short-term recurrence (FIRST 51%→25%) — confirm the ×0.6 (2-yr) factor is a defensible central estimate.
- Berg/Shinnar 1997 (PMID 9111436): febrile recurrence 14/24/32/63/76 by 0–4 factors — confirm these match the paper.
- Annegers 1987 (PMID 3807992): simple FS ~2.4% future epilepsy; complex features stratify higher — confirm 2.4 baseline and the complex-feature ladder are consistent.
- Lewis 2025 FEBSTAT (PMID 40770931): ~30% overall, 23% normal acute MRI, 71% with hippocampal T2 — confirm the 25/35/40 FSE tier sits within/below this range (intentionally conservative).

- [ ] **Step 2: Record findings**

In your report, list each checked number as "confirmed within published range" or "DISCREPANCY: <ours> vs <published>". If a value is clearly wrong, correct it in `calculator.ts` AND the matching test, re-run `npm run test:run -- lib/seizure-risk`, and commit:
```bash
git add lib/seizure-risk/calculator.ts lib/seizure-risk/__tests__/calculator.test.ts
git commit -m "Reconcile seizure risk anchors with cited literature

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```
If no number needs changing, do NOT commit — report "spot-check passed, no changes." Do NOT silently change a value that disagrees with the published source without flagging it.

---

## Task 3: Build the calculator UI component

**Files:**
- Create: `components/seizure-risk/SeizureRiskCalculators.tsx`

Build the component in two parts: (A) write the full restyled code below, which covers everything through the `future` tab, and (B) splice in the draft's About tab verbatim (with a tiny dark-mode substitution list) so its 30 references and prose are preserved exactly.

- [ ] **Step 1: Create the file with the restyled interactive portion**

Create `components/seizure-risk/SeizureRiskCalculators.tsx` with the following. The `{/* ABOUT_TAB_PLACEHOLDER */}` line is replaced in Step 2 — leave it for now.

```tsx
'use client';

import { useMemo, useState } from 'react';
import {
  calcFirstSeizure,
  calcFebrileRecurrence,
  calcFutureEpilepsy,
  type FirstSeizureInputs,
  type FebrileRecurrenceInputs,
  type FutureEpilepsyInputs,
} from '@/lib/seizure-risk/calculator';

// ---------- UI helpers ----------
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-3">
      <label className="block">
        <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</span>
        {children}
      </label>
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

function Toggle<T extends string | boolean>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: [T, string][];
}) {
  return (
    <div className="flex gap-2">
      {options.map(([v, l]) => (
        <button
          key={String(v)}
          type="button"
          onClick={() => onChange(v)}
          className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
            value === v
              ? 'bg-violet-600 text-white border-violet-600'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
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

function RiskPill({ value, label, color, suffix = '%' }: {
  value: number | string | null; label: string; color: string; suffix?: string;
}) {
  return (
    <div className={`rounded-lg p-3 ${color}`}>
      <div className="text-xs uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-2xl font-semibold mt-1">
        {value === null || value === undefined ? '—' : `${value}${suffix}`}
      </div>
    </div>
  );
}

type Tab = 'first' | 'recur' | 'future' | 'about';

export default function SeizureRiskCalculators() {
  const [tab, setTab] = useState<Tab>('first');

  const [F, setF] = useState<FirstSeizureInputs>({
    etiology: 'idiopathic', eeg: 'normal', nocturnal: false, todds: false, priorFS: false,
  });
  const [R, setR] = useState<FebrileRecurrenceInputs>({
    ageYoung: false, familyHistoryFS: false, lowTemp: false, shortFever: false,
  });
  const [E, setE] = useState<FutureEpilepsyInputs>({
    focal: false, prolongedLevel: 'no', multipleInDay: false, priorAbnormality: false, familyHxEpilepsy: false,
  });

  const firstResult = useMemo(() => calcFirstSeizure(F), [F]);
  const recurResult = useMemo(() => calcFebrileRecurrence(R), [R]);
  const futureResult = useMemo(() => calcFutureEpilepsy(E), [E]);

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      tab === t
        ? 'border-violet-600 text-violet-700 dark:text-violet-400'
        : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
    }`;

  return (
    <div className="not-prose text-slate-900 dark:text-slate-100">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">First Seizure &amp; Febrile Seizure Risk Calculators</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Counseling tools for recurrence risk after a first unprovoked seizure or a first febrile seizure.
        </p>
      </div>

      <div className="flex gap-1 mb-5 border-b border-slate-200 dark:border-slate-700 flex-wrap">
        <button type="button" onClick={() => setTab('first')} className={tabClass('first')}>First unprovoked seizure</button>
        <button type="button" onClick={() => setTab('recur')} className={tabClass('recur')}>Febrile sz: recurrence</button>
        <button type="button" onClick={() => setTab('future')} className={tabClass('future')}>Febrile sz: future epilepsy</button>
        <button type="button" onClick={() => setTab('about')} className={tabClass('about')}>About</button>
      </div>

      {/* TAB 1: FIRST UNPROVOKED SEIZURE */}
      {tab === 'first' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wide">Clinical inputs</h4>

            <Field label="Etiology" hint="Remote symptomatic = pre-existing brain abnormality (prior stroke, CP, TBI, malformation, etc.)">
              <Select value={F.etiology} onChange={(v) => setF((s) => ({ ...s, etiology: v }))}
                options={[['idiopathic', 'Idiopathic / cryptogenic'], ['remoteSymptomatic', 'Remote symptomatic']]} />
            </Field>

            <Field label="EEG findings" hint="Epileptiform = spikes, sharp waves, or generalized spike-wave. For prediction, EEG done when the child is well and afebrile for ≥2 weeks is much more reliable than EEG at presentation (postictal slowing and intercurrent-illness effects are non-specific and resolve).">
              <Select value={F.eeg} onChange={(v) => setF((s) => ({ ...s, eeg: v }))}
                options={[['normal', 'Normal (or non-epileptiform)'], ['abnormal', 'Epileptiform abnormality']]} />
            </Field>

            <Field label="Seizure occurred during sleep">
              <Toggle value={F.nocturnal} onChange={(v) => setF((s) => ({ ...s, nocturnal: v }))} options={[[false, 'No'], [true, 'Yes']]} />
            </Field>

            <Field label="Todd's paresis (post-ictal focal weakness)">
              <Toggle value={F.todds} onChange={(v) => setF((s) => ({ ...s, todds: v }))} options={[[false, 'No'], [true, 'Yes']]} />
            </Field>

            <Field label="Prior febrile seizures">
              <Toggle value={F.priorFS} onChange={(v) => setF((s) => ({ ...s, priorFS: v }))} options={[[false, 'No'], [true, 'Yes']]} />
            </Field>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wide">Recurrence risk</h4>

            <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 rounded-md p-3 mb-3">
              {firstResult.label}
            </div>

            <div className="mb-4">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Without ASM treatment</div>
              <div className="grid grid-cols-2 gap-2">
                <RiskPill label="2-year recurrence" value={firstResult.untreated.r2y}
                  color="bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200" />
                <RiskPill label="5-year recurrence" value={firstResult.untreated.r5y}
                  color="bg-red-50 border border-red-200 text-red-900 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200" />
              </div>
            </div>

            <div className="mb-4">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">With ASM treatment (FIRST/MESS estimate)</div>
              <div className="grid grid-cols-2 gap-2">
                <RiskPill label="2-year recurrence" value={firstResult.treated.r2y}
                  color="bg-emerald-50 border border-emerald-200 text-emerald-900 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-200" />
                <RiskPill label="5-year recurrence" value={firstResult.treated.r5y}
                  color="bg-emerald-50 border border-emerald-200 text-emerald-900 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-200" />
              </div>
            </div>

            {firstResult.epilepsyDx && (
              <div className="bg-red-50 border-2 border-red-300 dark:bg-red-900/20 dark:border-red-700 rounded-lg p-3 mb-4">
                <div className="text-sm font-semibold text-red-900 dark:text-red-200">⚠ Meets ILAE 2014 epilepsy criterion</div>
                <div className="text-xs text-red-800 dark:text-red-300 mt-1">
                  10-year recurrence risk likely ≥60% after a single unprovoked seizure with this risk profile → can be classified as epilepsy without waiting for a second seizure.
                </div>
              </div>
            )}

            <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/40 rounded-md p-3 space-y-2">
              <p><strong>Counseling points.</strong> ASM treatment after a first seizure roughly halves 2-year recurrence (FIRST trial: 51% → 25%; MESS: similar magnitude), but does <em>not</em> change long-term seizure freedom or remission rates. By 3–5 years, treated and untreated groups converge.</p>
              <p>Most recurrences occur in the first 6–12 months. Among those who recur, ~70% will have a second seizure within a year. Decision to treat balances reduced short-term recurrence against ASM side effects and the social cost (driving, stigma) of an epilepsy label.</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FEBRILE SEIZURE RECURRENCE */}
      {tab === 'recur' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wide">Risk factors (Berg/Shinnar 1997)</h4>

            <Field label="Age <18 months at first febrile seizure">
              <Toggle value={R.ageYoung} onChange={(v) => setR((s) => ({ ...s, ageYoung: v }))} options={[[false, 'No'], [true, 'Yes']]} />
            </Field>

            <Field label="Family history of febrile seizures" hint="First-degree relative (parent or sibling)">
              <Toggle value={R.familyHistoryFS} onChange={(v) => setR((s) => ({ ...s, familyHistoryFS: v }))} options={[[false, 'No'], [true, 'Yes']]} />
            </Field>

            <Field label="Low peak temperature" hint="Peak documented temp <40°C (104°F) — lower threshold = lower seizure threshold">
              <Toggle value={R.lowTemp} onChange={(v) => setR((s) => ({ ...s, lowTemp: v }))} options={[[false, 'No (≥40°C)'], [true, 'Yes (<40°C)']]} />
            </Field>

            <Field label="Short fever-to-seizure interval" hint="Seizure within first hour of recognized fever">
              <Toggle value={R.shortFever} onChange={(v) => setR((s) => ({ ...s, shortFever: v }))} options={[[false, 'No (≥1 hour)'], [true, 'Yes (<1 hour)']]} />
            </Field>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wide">Recurrence risk</h4>

            <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-lg p-4 mb-4">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Risk factors present</div>
              <div className="text-3xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
                {recurResult.rfCount} <span className="text-base text-slate-400 dark:text-slate-500">/ 4</span>
              </div>
            </div>

            <div className={`rounded-lg p-4 border-2 mb-4 ${
              recurResult.rfCount <= 1 ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-200' :
              recurResult.rfCount === 2 ? 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-200' :
              'bg-red-50 border-red-300 text-red-900 dark:bg-red-900/20 dark:border-red-700 dark:text-red-200'
            }`}>
              <div className="text-xs uppercase tracking-wide opacity-75">{recurResult.stratum}</div>
              <div className="text-3xl font-semibold mt-1">~{recurResult.risk}%</div>
              <div className="text-sm mt-1 opacity-90">2-year cumulative recurrence risk</div>
            </div>

            <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/40 rounded-md p-3 space-y-2">
              <p><strong>What we tell families.</strong> Overall recurrence after any first FS is ~30–35% over 2 years, but it ranges from ~14% (no risk factors) to ~75% (all four). Most recurrences happen within 1 year. Risk decreases as the child ages out of the FS-susceptible window (~6 mo to 5 yr).</p>
              <p><strong>Treatment.</strong> Neither prophylactic ASM nor scheduled antipyretics prevent recurrence at clinically meaningful rates. Daily phenobarbital and valproate reduce recurrence but the adverse effect burden outweighs benefit (AAP 2008 guideline, Offringa Cochrane 2021). Rectal diazepam or intranasal midazolam during fever can be considered in selected high-risk children but is not routinely recommended.</p>
              <p><strong>Key reassurance.</strong> Simple FS does <em>not</em> cause brain damage, does not affect cognitive outcome, and does not meaningfully increase mortality risk.</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FUTURE EPILEPSY AFTER FS */}
      {tab === 'future' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wide">Higher-risk complex features</h4>

            <Field label="Focal features" hint="Focal motor activity, focal version, Todd's paresis">
              <Toggle value={E.focal} onChange={(v) => setE((s) => ({ ...s, focal: v }))} options={[[false, 'No'], [true, 'Yes']]} />
            </Field>

            <Field label="Seizure duration" hint="Brief (<15 min) is simple. 15–29 min is complex by duration. ≥30 min is febrile status (FSE) — much higher risk, FEBSTAT-relevant.">
              <Select value={E.prolongedLevel} onChange={(v) => setE((s) => ({ ...s, prolongedLevel: v }))}
                options={[['no', 'Brief (<15 min)'], ['moderate', 'Prolonged 15–29 min (complex)'], ['fse', 'Febrile status epilepticus (≥30 min)']]} />
            </Field>

            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-5 mb-3 uppercase tracking-wide">Recurrence</h4>

            <Field label="Recurrence within same febrile illness" hint="≥2 seizures within 24h. Recent evidence (Sartori 2019, Whitney 2024, Jiang 2026) shows that recurrence alone — without focal or prolonged features — does NOT independently elevate epilepsy risk and approaches simple FS baseline.">
              <Toggle value={E.multipleInDay} onChange={(v) => setE((s) => ({ ...s, multipleInDay: v }))} options={[[false, 'No'], [true, 'Yes']]} />
            </Field>

            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-5 mb-3 uppercase tracking-wide">Other modifiers</h4>

            <Field label="Pre-existing neurodevelopmental abnormality" hint="CP, developmental delay, structural brain abnormality before the FS">
              <Toggle value={E.priorAbnormality} onChange={(v) => setE((s) => ({ ...s, priorAbnormality: v }))} options={[[false, 'No'], [true, 'Yes']]} />
            </Field>

            <Field label="Family history of epilepsy (not just FS)" hint="First-degree relative with afebrile epilepsy">
              <Toggle value={E.familyHxEpilepsy} onChange={(v) => setE((s) => ({ ...s, familyHxEpilepsy: v }))} options={[[false, 'No'], [true, 'Yes']]} />
            </Field>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wide">Risk of future unprovoked seizures</h4>

            <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-lg p-4 mb-4">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Classification</div>
              <div className="text-lg font-medium text-slate-900 dark:text-slate-100 mt-1">{futureResult.stratum}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                {futureResult.fse ? 'Febrile status epilepticus subset' : futureResult.isComplex ? 'Complex febrile seizure' : 'Simple febrile seizure'}
                {futureResult.recurrenceOnly && ' (recurrence-only complex)'}
                {futureResult.higherRiskCount > 0 && ` — ${futureResult.higherRiskCount} higher-risk feature${futureResult.higherRiskCount > 1 ? 's' : ''}`}
              </div>
            </div>

            {futureResult.fse && (
              <div className="bg-purple-50 border-2 border-purple-300 dark:bg-purple-900/20 dark:border-purple-700 rounded-lg p-3 mb-4">
                <div className="text-xs uppercase tracking-wide text-purple-700 dark:text-purple-300 font-semibold">⚠ FEBSTAT-relevant subset</div>
                <div className="text-xs text-purple-900 dark:text-purple-200 mt-2 space-y-1">
                  <p>FSE is associated with acute hippocampal T2 hyperintensity in ~10% of children; 70% of those evolve to radiologic hippocampal sclerosis over 1–10 years (Lewis 2025, FEBSTAT).</p>
                  <p><strong>Consider:</strong> acute brain MRI within days of the event (FEBSTAT protocol), with attention to hippocampal T2 signal. Acute MRI dramatically refines risk — 23% epilepsy at 10 yrs if normal, 71% if T2 hyperintensity is present.</p>
                </div>
              </div>
            )}

            {futureResult.fse && (E.focal || E.multipleInDay) && (
              <div className="bg-rose-50 border-2 border-rose-300 dark:bg-rose-900/20 dark:border-rose-700 rounded-lg p-3 mb-4">
                <div className="text-xs uppercase tracking-wide text-rose-700 dark:text-rose-300 font-semibold">⚠ Consider Dravet syndrome / <em>SCN1A</em></div>
                <div className="text-xs text-rose-900 dark:text-rose-200 mt-2 space-y-1">
                  <p>Hemiclonic FSE — especially with alternating sides between events — is the most characteristic presentation of Dravet syndrome. The classic prodrome is normal early development with onset of prolonged, often hemiclonic, fever- or vaccine-triggered seizures in the first year, evolving to multiple seizure types and developmental slowing by toddlerhood.</p>
                  <p><strong>Suggestive features:</strong> onset &lt;12 months, prolonged/hemiclonic FS, alternating hemiconvulsions, status triggered by hot baths or vaccines, photosensitivity, family history of GEFS+ spectrum, apparent worsening on sodium channel blockers (CBZ, OXC, LTG, PHT).</p>
                  <p>Threshold for <em>SCN1A</em> testing (or epilepsy gene panel) should be low — early diagnosis affects ASM choice substantially (avoid sodium channel blockers; consider stiripentol, fenfluramine, cannabidiol).</p>
                </div>
              </div>
            )}

            <div className={`rounded-lg p-4 border-2 mb-4 ${
              futureResult.adjustedRisk < 5 ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-200' :
              futureResult.adjustedRisk < 15 ? 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-200' :
              'bg-red-50 border-red-300 text-red-900 dark:bg-red-900/20 dark:border-red-700 dark:text-red-200'
            }`}>
              <div className="text-xs uppercase tracking-wide opacity-75">Risk of epilepsy by age 25</div>
              <div className="text-3xl font-semibold mt-1">~{futureResult.adjustedRisk}%</div>
              <div className="text-sm mt-1 opacity-90">vs general population baseline ~1%</div>
            </div>

            <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/40 rounded-md p-3 space-y-2">
              <p><strong>Anchors.</strong> Annegers et al (NEJM 1987, Rochester cohort, n=687) and Nelson/Ellenberg (NCPP 1976/1978) established the framework: simple FS confers ~2-fold increase in lifetime epilepsy risk (~2-3% vs ~1% baseline), with complex features stratifying risk further.</p>
              <p><strong>Recent evidence has refined which complex features matter.</strong> Multivariable analyses (Sartori 2019 DMCN; Whitney 2024 IJP; Jiang 2026 Front Neurol, n=611) show that recurrence within 24h alone — without focal or prolonged features — does NOT independently elevate epilepsy risk. In Jiang's cohort, recurrent vs non-recurrent FS yielded 4.0% vs 1.6% epilepsy at median 39-month follow-up (p=0.218, log-rank NS). MRI yield was 0/56 across the cohort. The "complex" label is doing too much heavy lifting historically — focal features and prolonged duration are the real risk drivers.</p>
              <p><strong>Febrile status epilepticus (FSE).</strong> Updated 10-year FEBSTAT data (Lewis et al, Epilepsia Open 2025, n=199–226) gives a sharper picture: 30% cumulative epilepsy incidence overall, 23% even with a normal acute MRI, and 71% in the ~10% subset with acute hippocampal T2 hyperintensity. Of those with acute T2 signal change, 70% evolved to radiologic hippocampal sclerosis on 1–10 year follow-up MRI — closing the loop on the long-debated FSE → mesial temporal sclerosis → TLE pathway.</p>
              <p><strong>Genetic considerations.</strong> Children with multiple recurrent complex FS, FS persisting beyond age 5, or FS plus other seizure types should prompt consideration of <em>SCN1A</em>-related disorders (GEFS+ spectrum, Dravet syndrome). Early dystonia + valproate-induced encephalopathy + photosensitive myoclonus would push further toward Dravet.</p>
            </div>
          </div>
        </div>
      )}

      {/* ABOUT_TAB_PLACEHOLDER */}
    </div>
  );
}
```

- [ ] **Step 2: Splice in the About tab verbatim**

Open the draft `components/Epilepsy Risk Calc/seizure-risk-calculators.jsx` and copy the ENTIRE About block — the JSX expression `{tab === 'about' && ( ... )}` (draft lines 756 through 1040, i.e. from `{tab === 'about' && (` down to and including its closing `)}`). Replace the `{/* ABOUT_TAB_PLACEHOLDER */}` line in the new file with that block, then apply these four dark-mode substitutions to the pasted block ONLY (the prose/refs inherit color from the wrapper, so nothing else changes):

1. `<div className="max-w-2xl text-sm text-slate-700 space-y-4 leading-relaxed">` → `<div className="max-w-2xl text-sm text-slate-700 dark:text-slate-300 space-y-4 leading-relaxed">`
2. Replace every `<h3 className="font-semibold text-slate-900 mb-1">` → `<h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">`
3. Replace every `</h3>` → `</h4>` (within the pasted block; it contains no other h3)
4. `<section className="text-xs text-slate-500 border-t border-slate-200 pt-3">` → `<section className="text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-3">`

Do NOT alter any reference text, PMID, or prose.

- [ ] **Step 3: Verify content fidelity + types**

Run these checks:
```bash
# All 30 references preserved (draft has an <li> per reference inside the <ol>):
grep -c "PMID:" "components/Epilepsy Risk Calc/seizure-risk-calculators.jsx"
grep -c "PMID:" components/seizure-risk/SeizureRiskCalculators.tsx
# Both numbers must be EQUAL. Both banners present:
grep -c "Consider Dravet syndrome" components/seizure-risk/SeizureRiskCalculators.tsx   # expect 1
grep -c "FEBSTAT-relevant subset" components/seizure-risk/SeizureRiskCalculators.tsx     # expect 1
```
Then type-check: `npx tsc --noEmit`
Expected: PASS, no type errors. (If `tsc` flags the generic `Toggle<T>` boolean inference at a call site, ensure the `options` tuples use literal `false`/`true` so `T` infers as `boolean`.)

- [ ] **Step 4: Commit**

```bash
git add components/seizure-risk/SeizureRiskCalculators.tsx
git commit -m "Add seizure risk calculators UI (dark mode, epilepsy accent)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Wire the calculators into the Epilepsy section

**Files:**
- Modify: `app/[section]/page.tsx`
- Modify: `src/data/epilepsy.json`
- Modify: `src/data/index.json`

- [ ] **Step 1: Render the component after the withdrawal calc**

In `app/[section]/page.tsx`, add the import beside the existing `ASMWithdrawalCalculator` import near the top:
```tsx
import SeizureRiskCalculators from '@/components/seizure-risk/SeizureRiskCalculators';
```
The file currently has this block inside the `<article>`:
```tsx
          {params.section === 'epilepsy' && (
            <section id="asm-withdrawal-calculator" className="scroll-mt-24 mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
              <ASMWithdrawalCalculator />
            </section>
          )}
```
Immediately after that closing `)}`, add a second block:
```tsx
          {params.section === 'epilepsy' && (
            <section id="seizure-risk-calculators" className="scroll-mt-24 mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
              <SeizureRiskCalculators />
            </section>
          )}
```

- [ ] **Step 2: Add the TOC entry**

`src/data/epilepsy.json` is single-line minified — make a TARGETED string edit, do NOT reparse/rewrite the whole file. The toc array currently ends with the withdrawal entry. Use Grep to confirm the exact bytes, then with the Edit tool replace:
`{"level": 1, "text": "ASM Withdrawal Risk Calculator", "id": "asm-withdrawal-calculator"}]`
with:
`{"level": 1, "text": "ASM Withdrawal Risk Calculator", "id": "asm-withdrawal-calculator"}, {"level": 1, "text": "First & Febrile Seizure Risk Calculators", "id": "seizure-risk-calculators"}]`
(match the file's actual spacing — verify with Grep first.)

- [ ] **Step 3: Bump the per-file tocCount in epilepsy.json**

In the same file, change the trailing `"tocCount": 94` to `"tocCount": 95` (targeted Edit; it appears once near the end as `..."chunkCount": 39, "tocCount": 94}`).

- [ ] **Step 4: Bump index.json tocCount**

In `src/data/index.json` (pretty-printed), find the epilepsy entry (its `"slug": "epilepsy"` line) and change its `"tocCount": 94` to `"tocCount": 95`. Scope the edit to the epilepsy block (94 may appear elsewhere — confirm you change only epilepsy's).

- [ ] **Step 5: Verify**

```bash
node -e "const d=require('./src/data/epilepsy.json'); console.log('toc len', d.toc.length, '| last', JSON.stringify(d.toc[d.toc.length-1]), '| tocCount', d.tocCount);"
node -e "const i=require('./src/data/index.json'); console.log('index epilepsy tocCount', i.find(x=>x.slug==='epilepsy').tocCount);"
```
Expected: toc len 95; last entry id `seizure-risk-calculators`; both tocCounts 95.
Then `npm run build` — expected PASS.

- [ ] **Step 6: Commit**

```bash
git add app/[section]/page.tsx src/data/epilepsy.json src/data/index.json
git commit -m "Embed seizure risk calculators in Epilepsy section

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Remove the draft and run final verification

**Files:**
- Delete: `components/Epilepsy Risk Calc/`

- [ ] **Step 1: Delete the draft folder**

The draft is untracked, so just remove it from disk (do NOT `git rm`, and do NOT `git add -A` — the repo has unrelated untracked files):
```bash
rm -rf "components/Epilepsy Risk Calc"
```

- [ ] **Step 2: Full test suite**

Run: `npm run test:run`
Expected: PASS (includes `lib/seizure-risk` and `lib/asm-withdrawal`).

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit (only if there is anything to commit)**

The draft was untracked, so its deletion is not a git change — there may be nothing to commit. Confirm with `git status --short` that no unintended files are staged. If `git status` shows no tracked changes, skip the commit.

---

## Self-Review Notes

- **Spec coverage:** three calculators + ILAE flag + FSE/Dravet banners (Task 1 logic, Task 3 UI); verification = anchor tests (Task 1) + PMID spot-check (Task 2); stack-a-second-conditional integration + TOC entry + tocCount (Task 4); draft removal + build (Task 5); About copy/refs preserved verbatim (Task 3 Step 2). All spec success criteria mapped.
- **Type consistency:** `FirstSeizureInputs`/`FebrileRecurrenceInputs`/`FutureEpilepsyInputs` (and the `*Result` types) defined in Task 1 and consumed unchanged in Task 3. The draft's vestigial `treated` input to `calcFirstSeizure` is dropped (it was destructured but unused). `prolongedLevel` union `'no'|'moderate'|'fse'` matches the Select options in Task 3.
- **id consistency:** `seizure-risk-calculators` is identical in Task 4 Step 1 (section), Step 2 (TOC entry), and the scroll target.
- **Placeholder scan:** the only intentional placeholder is `{/* ABOUT_TAB_PLACEHOLDER */}`, explicitly replaced in Task 3 Step 2 with exact instructions — not a plan gap.
