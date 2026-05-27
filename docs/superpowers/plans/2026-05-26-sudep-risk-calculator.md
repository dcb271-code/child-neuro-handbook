# SUDEP Risk Assessment Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a pediatric-focused SUDEP risk assessment tool (5 tabs) below the existing two calculators in the Epilepsy section, and refactor the section-widget wiring to a registry.

**Architecture:** Pure calc logic + numeric tables in `lib/sudep-risk/calculator.ts` (vitest-tested). A `'use client'` component in `components/sudep-risk/` renders the UI and imports the logic; static content (modifiable factors, teaching, references) stays in the component. `app/[section]/page.tsx` moves from per-widget conditionals to a `SECTION_WIDGETS` registry.

**Tech Stack:** Next.js 14 (static export), React 18, TypeScript, Tailwind (class-based dark mode), vitest.

**Pattern:** Mirrors the verified ASM Withdrawal + Seizure Risk calculators (`lib/<feature>/` + `components/<feature>/`). Reuse those conventions: dark-mode classes, violet accent, `type="button"` tabs, `role="group"`+`aria-labelledby` (via `useId`) for grouped controls, `not-prose` wrapper, `<h3>` title / `<h4>` subheads.

---

## File Structure

- **Create** `lib/sudep-risk/calculator.ts` — types + `calcPedSUDEP`, `calcSUDEP7`, `calcSUDEP3` and all numeric tables/constants. Pure, no React.
- **Create** `lib/sudep-risk/__tests__/calculator.test.ts` — calibration + score anchor tests.
- **Create** `components/sudep-risk/SUDEPRiskCalculator.tsx` — `'use client'` UI (5 tabs), imports logic from the lib, dark mode + violet, chrome removed. Keeps `MODIFIABLE_FACTORS` + teaching/reference content.
- **Modify** `app/[section]/page.tsx` — `SECTION_WIDGETS` registry replacing the two existing epilepsy conditional blocks.
- **Modify** `src/data/epilepsy.json` — append TOC entry; per-file `tocCount` 95→96.
- **Modify** `src/data/index.json` — epilepsy `tocCount` 95→96.
- **Delete** `components/SUDEP Calculator/` — draft folder (after porting).

---

## Task 1: Port calc logic to `lib/sudep-risk/calculator.ts` (TDD)

**Files:**
- Create: `lib/sudep-risk/calculator.ts`
- Test: `lib/sudep-risk/__tests__/calculator.test.ts`

Tables/values are copied verbatim from the draft `components/SUDEP Calculator/sudep-risk-calculator.jsx` (lines 40–382). Task 2 spot-checks them against the literature.

- [ ] **Step 1: Write the failing test**

Create `lib/sudep-risk/__tests__/calculator.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { calcPedSUDEP, calcSUDEP7, calcSUDEP3 } from '../calculator';

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

  it('raw ≥ 30 → ceiling "≥30"', () => {
    const r = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', gtcFrequency: 'very_frequent', nocturnal: true, supervision: 'alone', adherence: 'poor', duration: 'long' });
    expect(r.rawRate).toBeGreaterThan(30);
    expect(r.displayLevel).toBe('ceiling');
    expect(r.displayString).toBe('≥30');
    expect(r.displayRate).toBe(30);
  });
});

describe('calcPedSUDEP — modifiers', () => {
  it('supervision shared→alone multiplies risk 4× (0.5 vs 2.0)', () => {
    const shared = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', gtcFrequency: 'frequent', nocturnal: true, duration: 'medium', supervision: 'shared' });
    const alone = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', gtcFrequency: 'frequent', nocturnal: true, duration: 'medium', supervision: 'alone' });
    expect(alone.rawRate / shared.rawRate).toBeCloseTo(4, 5);
  });

  it('Dravet baseline suppresses an SCN1A-type genetic modifier (no double-count)', () => {
    const none = calcPedSUDEP({ ...pedBase, syndrome: 'dravet' });
    const scn1a = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', geneticEtiology: 'scn1a_nondravet' });
    expect(scn1a.rawRate).toBeCloseTo(none.rawRate, 6);
    expect(scn1a.geneticSuppressedForDravet).toBe(true);
  });

  it('cardiac-overlap gene (KCNQ1/H2) is NOT suppressed in Dravet and sets cardiacFlag', () => {
    const none = calcPedSUDEP({ ...pedBase, syndrome: 'dravet' });
    const cardiac = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', geneticEtiology: 'kcnq1_h2' });
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- lib/sudep-risk`
Expected: FAIL — cannot resolve `../calculator`.

- [ ] **Step 3: Write the implementation**

Create `lib/sudep-risk/calculator.ts`. Port the tables and three functions VERBATIM from the draft (`components/SUDEP Calculator/sudep-risk-calculator.jsx` lines 40–382), adding the TypeScript types below. Do not change any numeric value, label, note, or source string.

```ts
/* SUDEP Risk Assessment — pure logic.
   Pediatric multiplicative model calibrated to Tomson 2025 (Neurology, PMID
   39908470); syndrome baselines from Donnan 2023 (PMID 36750385), Cooper 2016
   (PMID 27810515), Donner 2018, AAN/AES 2017; multipliers from Sveinsson 2020
   (PMID 31831600), Hesdorffer 2011, MORTEMUS (Ryvlin 2013), Langan 2005.
   SUDEP-7 v2.0 (Novak/DeGiorgio 2015) and SUDEP-3 (Nei 2024) scores.
   Values copied verbatim from the reviewed draft. */

export type Syndrome =
  | 'selflimited' | 'newonset' | 'controlled' | 'focal_dre'
  | 'gen_dre' | 'other_dee' | 'lgs' | 'dravet';
export type GeneticEtiology =
  | 'none' | 'scn1a_nondravet' | 'scn2a' | 'scn8a' | 'stxbp1'
  | 'kcnq1_h2' | 'scn5a' | 'scn1b' | 'depdc5' | 'dup15q'
  | 'kcnt1' | 'other_chan' | 'other_ge';
export type GtcFrequency = 'never' | 'none_pastyear' | 'rare' | 'frequent' | 'very_frequent';
export type Supervision = 'shared' | 'alone';
export type Adherence = 'good' | 'poor';
export type Duration = 'short' | 'medium' | 'long';

export type PedSUDEPInputs = {
  syndrome: Syndrome;
  geneticEtiology: GeneticEtiology;
  gtcFrequency: GtcFrequency;
  nocturnal: boolean;
  supervision: Supervision;
  adherence: Adherence;
  duration: Duration;
};

export type SyndromeBaseline = { rate: number; label: string; description: string; source: string };
export type GeneticModifier = { mult: number; note: string; cardiacFlag?: boolean };
export type Multiplier = { mult: number; note: string };
export type LabeledMultiplier = { mult: number; label: string; note: string };
export type DisplayLevel = 'measurable' | 'detection_limit' | 'lowest_plausible' | 'ceiling';

export type PedSUDEPResult = {
  syndrome: SyndromeBaseline;
  genetic: GeneticModifier;
  geneticApplied: boolean;
  geneticSuppressedForDravet: boolean;
  gtc: LabeledMultiplier;
  nocturnal: Multiplier;
  supervision: Multiplier;
  adherence: Multiplier;
  duration: Multiplier;
  rawRate: number;
  finalRate: number;
  displayRate: number;
  displayString: string;
  displayLevel: DisplayLevel;
  annualPrefix: string;
  belowDetection: boolean;
  ceilinged: boolean;
  tier: string;
  annualPercent: number;
  tenYearPercent: number;
  relativeToControlled: number;
  cardiacFlag: boolean;
};

export type SUDEP7Inputs = {
  gtcMore3: boolean; gtc1plus: boolean; anySzPastYear: boolean; sz50plus: boolean;
  dur30plus: boolean; asm3plus: boolean; idDD: boolean;
};
export type SUDEP7Result = { total: number; max: number; quartile: string; interpretation: string };

export type SUDEP3Inputs = { gtcsPastYear: boolean; anySzPastYear: boolean; idDD: boolean };
export type SUDEP3Result = { score: number; max: number; stratum: string; oddsInterp: string };

// --- tables (verbatim from draft lines 40-206) ---
const SYNDROME_BASELINES: Record<Syndrome, SyndromeBaseline> = { /* ...copy lines 40-89... */ } as Record<Syndrome, SyndromeBaseline>;
const GENETIC_MODIFIERS: Record<GeneticEtiology, GeneticModifier> = { /* ...copy lines 94-156... */ } as Record<GeneticEtiology, GeneticModifier>;
const GTC_MULTIPLIERS: Record<GtcFrequency, LabeledMultiplier> = { /* ...copy lines 159-185... */ } as Record<GtcFrequency, LabeledMultiplier>;
const NOCTURNAL_MULTIPLIER: Record<'no' | 'yes', Multiplier> = { /* ...copy lines 187-190... */ } as Record<'no' | 'yes', Multiplier>;
const SUPERVISION_MULTIPLIER: Record<Supervision, Multiplier> = { /* ...copy lines 192-195... */ } as Record<Supervision, Multiplier>;
const ADHERENCE_MULTIPLIER: Record<Adherence, Multiplier> = { /* ...copy lines 197-200... */ } as Record<Adherence, Multiplier>;
const DURATION_MULTIPLIER: Record<Duration, Multiplier> = { /* ...copy lines 202-206... */ } as Record<Duration, Multiplier>;

const DETECTION_LIMIT = 0.05;
const LOWEST_PLAUSIBLE = 0.01;
const CEILING = 30.0;
```

> Implementer note: the `/* ...copy lines NN... */` placeholders above MUST be replaced with the exact object literals from the draft at those line ranges — same keys, numbers, and strings, just typed. Then port `calcPedSUDEP` (draft lines 224–327), `calcSUDEP7` (333–358), and `calcSUDEP3` (364–382) verbatim, changing only: (a) the function signature to `(inputs: PedSUDEPInputs): PedSUDEPResult` etc., and (b) `let quartile, interpretation;` style declarations to typed `let quartile: string; let interpretation: string;`. The function BODIES (the multiplicative math, the suppression rule, the threshold branches, the tier logic) are unchanged. Export all three functions.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- lib/sudep-risk`
Expected: PASS. If a calibration anchor differs, STOP — the porting has an error (re-check the copied table values against the draft).

- [ ] **Step 5: Commit**

```bash
git add lib/sudep-risk/calculator.ts lib/sudep-risk/__tests__/calculator.test.ts
git commit -m "Add SUDEP risk calculator logic (pediatric model, SUDEP-7, SUDEP-3)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: PMID spot-check of the calibration anchors

**Files:** none unless a number is wrong (then edit `lib/sudep-risk/calculator.ts` + test).

Use WebFetch/WebSearch (load via ToolSearch `select:WebFetch` / `select:WebSearch`). Confirm the headline numbers sit within published ranges.

- [ ] **Step 1: Spot-check**

- **Tomson 2025 (PMID 39908470):** 350-fold incidence spread; lowest stratum ~5/100,000py (0.05/1000py, 95% CI 0.02–0.12); ~36× difference TCS-free vs TCS in past year. Confirm the detection-limit/ceiling design and the GTCS-frequency multipliers are consistent.
- **Donnan 2023 (PMID 36750385):** DEE SUDEP ~2.8/1000py; occurred only in SCN1A/SCN2A/SCN8A/STXBP1; SCN8A ~9%. Confirm SCN8A ~6/1000py and Dravet refined ~4.4/1000py.
- **Cooper 2016 (PMID 27810515):** Dravet SUDEP 9.3/1000py (95% CI 4.5–19.5). Confirm Dravet typical 4–5 and ceiling 30 sit sensibly relative to this CI.
- **Sveinsson 2020 (PMID 31831600):** OR ~27 ≥1 GTCS; OR 1.15 (NS) non-GTCS-only; OR 5.01 living alone; OR 67 living-alone×GTCS; nocturnal OR 15.31. Confirm the GTCS / supervision / nocturnal multipliers trace to these.

- [ ] **Step 2: Record findings**

Per number: "confirmed within published range" or "DISCREPANCY: ours vs published". If clearly wrong, fix `calculator.ts` + the matching test, re-run `npm run test:run -- lib/sudep-risk`, and commit:
```bash
git add lib/sudep-risk/calculator.ts lib/sudep-risk/__tests__/calculator.test.ts
git commit -m "Reconcile SUDEP calibration anchors with cited literature

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```
If all within range, make NO changes and report "spot-check passed, no changes." Never silently change a value that disagrees with a source — flag it.

---

## Task 3: Build the SUDEP UI component (copy-and-transform)

**Files:**
- Create: `components/sudep-risk/SUDEPRiskCalculator.tsx`

The draft UI (~900 lines) is content-heavy (modifiable-factors cards, teaching, references). To preserve all clinical content verbatim, COPY the draft and transform it, rather than retyping. Apply the established styling recipe used by `components/seizure-risk/SeizureRiskCalculators.tsx` and `components/asm-withdrawal/ASMWithdrawalCalculator.tsx` — read one of those first as the style reference.

- [ ] **Step 1: Copy the draft to the new path**

```bash
mkdir -p components/sudep-risk
cp "components/SUDEP Calculator/sudep-risk-calculator.jsx" components/sudep-risk/SUDEPRiskCalculator.tsx
```

- [ ] **Step 2: Replace the top (imports + moved logic) — keep MODIFIABLE_FACTORS**

Delete from the top of the file everything from the `import React...` line through the END of `calcSUDEP3` (the draft's logic + numeric tables, lines 1–382), and replace it with:

```tsx
'use client';

import { useId, useMemo, useState } from 'react';
import {
  calcPedSUDEP,
  calcSUDEP7,
  calcSUDEP3,
  type PedSUDEPInputs,
  type SUDEP7Inputs,
  type SUDEP3Inputs,
} from '@/lib/sudep-risk/calculator';
```

KEEP the `MODIFIABLE_FACTORS` array (draft lines ~388–438) — it is presentational content used by the UI. (It sits between `calcSUDEP3` and the UI helpers; do not delete it.)

- [ ] **Step 3: Replace the three UI helpers (typed, dark-mode, violet, a11y)**

Replace the draft's `Field`, `Toggle`, and `Select` helper definitions with:

```tsx
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  // role="group" + aria-labelledby works for a <select> and for a Toggle button-group alike.
  const labelId = useId();
  return (
    <div className="mb-3" role="group" aria-labelledby={labelId}>
      <span id={labelId} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</span>
      {children}
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{hint}</p>}
    </div>
  );
}

function Toggle<T extends string | boolean>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: [T, string][];
}) {
  return (
    <div className="flex gap-2 flex-wrap">
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
```

- [ ] **Step 4: Type the component state**

Change the three `useState` initializers in `SUDEPRiskCalculator` to typed generics:
```tsx
const [P, setP] = useState<PedSUDEPInputs>({
  syndrome: 'controlled', geneticEtiology: 'none', gtcFrequency: 'rare',
  nocturnal: false, supervision: 'shared', adherence: 'good', duration: 'short',
});
const [S7, setS7] = useState<SUDEP7Inputs>({
  gtcMore3: false, gtc1plus: false, anySzPastYear: false,
  sz50plus: false, dur30plus: false, asm3plus: false, idDD: false,
});
const [S3, setS3] = useState<SUDEP3Inputs>({
  gtcsPastYear: false, anySzPastYear: false, idDD: false,
});
const [done, setDone] = useState<Record<string, boolean>>({});
```
Leave `const [tab, setTab] = useState('pediatric');` (string) and the three `useMemo` calls unchanged.

- [ ] **Step 5: Strip page chrome + restyle the header and tab bar**

Replace the outer wrapper + title + tab bar. Change the root `<div className="max-w-4xl mx-auto p-4 sm:p-6 bg-white">` to `<div className="not-prose text-slate-900 dark:text-slate-100">`; change the `<h1 className="text-xl sm:text-2xl font-semibold text-slate-900">` to `<h3 className="text-lg font-semibold text-slate-900 dark:text-white">`; add `dark:text-slate-400` to the subtitle `<p>`. For the tab bar, add `dark:border-slate-700` to the container border, add `type="button"` to the tab `<button>`, and change the active/inactive classes to:
```tsx
tab === id ? 'border-violet-600 text-violet-700 dark:text-violet-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
```

- [ ] **Step 6: Apply the dark-mode + violet + heading transform to the body (all tabs)**

Preserve ALL text/content verbatim; change only classNames and heading tags. Apply these rules across every tab body (pediatric, sudep3, sudep7, modifiable, teaching, refs). Use the sibling `SeizureRiskCalculators.tsx` as the canonical reference for exact dark pairings.

Heading tags: every section `<h2 className="...text-slate-800...uppercase tracking-wide">` → `<h4 ...>` (and matching `</h2>`→`</h4>`); every About/teaching `<h3 className="font-semibold text-slate-900 ...">` → `<h4 ... dark:text-slate-100 ...>` (and `</h3>`→`</h4>`). (The only `<h3>` that should remain is the component title from Step 5.)

Accent: every `blue-600`/`blue-700`/`blue-500` used for interactive accent → `violet-*`. (Leave the semantic blue *calibration info box* — `bg-blue-50 border-blue-200 text-blue-900` — as an informational color, but add dark variants `dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200`.)

Dark-mode class pairings to add (apply to every occurrence; this list covers the patterns in the file — also theme any analogous light-only class you encounter):

| Light class | Add dark variant |
|---|---|
| `text-slate-900` | `dark:text-slate-100` (or `dark:text-white` for the title) |
| `text-slate-800` | `dark:text-slate-200` |
| `text-slate-700` | `dark:text-slate-300` |
| `text-slate-600` | `dark:text-slate-400` |
| `text-slate-500` | `dark:text-slate-400` |
| `text-slate-400` | `dark:text-slate-500` |
| `bg-white` | `dark:bg-slate-900` (inputs) / remove for the root (now not-prose) |
| `bg-slate-50` | `dark:bg-slate-900/40` |
| `border-slate-200` | `dark:border-slate-700` |
| `border-slate-300` | `dark:border-slate-600` |
| `bg-blue-50 border-blue-200 text-blue-900` (info box) | `dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200` |
| `bg-amber-50 border-amber-200/300 text-amber-900` | `dark:bg-amber-900/20 dark:border-amber-700/800 dark:text-amber-200` |
| `bg-red-50 border-red-200/300 text-red-900` | `dark:bg-red-900/20 dark:border-red-700/800 dark:text-red-200` |
| `bg-emerald-50 border-emerald-200/300 text-emerald-900` | `dark:bg-emerald-900/20 dark:border-emerald-700/800 dark:text-emerald-200` |
| `bg-purple-50 border-purple-200/300 text-purple-700/900` | `dark:bg-purple-900/20 dark:border-purple-700 dark:text-purple-200/300` |
| `bg-rose-50 border-rose-200/300 text-rose-700/900` | `dark:bg-rose-900/20 dark:border-rose-700 dark:text-rose-200/300` |

Inline state setters (e.g. `onChange={(v) => setP((s) => ({ ...s, syndrome: v }))}`) stay as-is; they type-check against the typed state.

- [ ] **Step 7: Verify content fidelity + types**

```bash
# All references preserved (count PMIDs in draft vs new file):
grep -c "PMID" "components/SUDEP Calculator/sudep-risk-calculator.jsx"
grep -c "PMID" components/sudep-risk/SUDEPRiskCalculator.tsx
# Should be EQUAL.
# Key content present:
grep -c "MORTEMUS" components/sudep-risk/SUDEPRiskCalculator.tsx       # >= 1
grep -c "cardiac" components/sudep-risk/SUDEPRiskCalculator.tsx        # several
# No leftover page chrome / un-themed accents:
grep -c "max-w-4xl" components/sudep-risk/SUDEPRiskCalculator.tsx      # expect 0
grep -c "bg-blue-600" components/sudep-risk/SUDEPRiskCalculator.tsx    # expect 0 (all → violet)
```
Then `npx tsc --noEmit` — must pass. Common gotcha: the generic `Toggle<T>` boolean inference; ensure boolean option tuples are `[[false, ...], [true, ...]]`.

Visually scan the diff for any element still missing a `dark:` variant (search for `text-slate-`, `bg-slate-`, `border-slate-` occurrences lacking a `dark:` sibling) and fix.

- [ ] **Step 8: Commit**

```bash
git add components/sudep-risk/SUDEPRiskCalculator.tsx
git commit -m "Add SUDEP risk assessment UI (dark mode, epilepsy accent)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Wire into Epilepsy via a sectionWidgets registry

**Files:**
- Modify: `app/[section]/page.tsx`
- Modify: `src/data/epilepsy.json`
- Modify: `src/data/index.json`

- [ ] **Step 1: Refactor page.tsx to a registry**

Near the top imports, ensure all three calculator imports are present:
```tsx
import ASMWithdrawalCalculator from '@/components/asm-withdrawal/ASMWithdrawalCalculator';
import SeizureRiskCalculators from '@/components/seizure-risk/SeizureRiskCalculators';
import SUDEPRiskCalculator from '@/components/sudep-risk/SUDEPRiskCalculator';
```
Add the registry near the top-level consts (e.g., after `accentMap`):
```tsx
const SECTION_WIDGETS: Record<string, { id: string; Component: React.ComponentType }[]> = {
  epilepsy: [
    { id: 'asm-withdrawal-calculator', Component: ASMWithdrawalCalculator },
    { id: 'seizure-risk-calculators', Component: SeizureRiskCalculators },
    { id: 'sudep-risk-calculator', Component: SUDEPRiskCalculator },
  ],
};
```
Replace the two existing `{params.section === 'epilepsy' && (<section id="asm-withdrawal-calculator" ...>...)}` and `{... id="seizure-risk-calculators" ...}` blocks (between `<ImageLightbox />` and the Prev/Next comment) with a single:
```tsx
          {(SECTION_WIDGETS[params.section] ?? []).map(({ id, Component }) => (
            <section key={id} id={id} className="scroll-mt-24 mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
              <Component />
            </section>
          ))}
```

- [ ] **Step 2: Add the TOC entry (targeted edit, minified file)**

In `src/data/epilepsy.json`, Grep for the current last toc entry and with the Edit tool replace:
`{"level": 1, "text": "First & Febrile Seizure Risk Calculators", "id": "seizure-risk-calculators"}]`
with:
`{"level": 1, "text": "First & Febrile Seizure Risk Calculators", "id": "seizure-risk-calculators"}, {"level": 1, "text": "SUDEP Risk Assessment", "id": "sudep-risk-calculator"}]`
(verify the actual spacing with Grep first.)

- [ ] **Step 3: Bump epilepsy.json per-file tocCount**

Change the trailing `"tocCount": 95` → `"tocCount": 96` (appears once near the end as `..."chunkCount": 39, "tocCount": 95}`).

- [ ] **Step 4: Bump index.json tocCount**

In `src/data/index.json`, find the epilepsy entry (`"slug": "epilepsy"`) and change its `"tocCount": 95` → `"tocCount": 96`. Scope to the epilepsy block only.

- [ ] **Step 5: Verify**

```bash
node -e "const d=require('./src/data/epilepsy.json'); console.log('toc len', d.toc.length, '| last', JSON.stringify(d.toc[d.toc.length-1]), '| fileTocCount', d.tocCount);"
node -e "const i=require('./src/data/index.json'); console.log('index epilepsy tocCount', i.find(x=>x.slug==='epilepsy').tocCount);"
```
Expected: toc len 96; last id `sudep-risk-calculator`; both tocCounts 96.
Then `npm run build` — expected PASS. Confirm all three calculators still render on `/epilepsy` (the registry refactor must not drop the first two) and the TOC shows all three entries.

- [ ] **Step 6: Commit**

```bash
git add app/[section]/page.tsx src/data/epilepsy.json src/data/index.json
git commit -m "Embed SUDEP calculator; refactor epilepsy widgets to a registry

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Remove the draft and run final verification

**Files:**
- Delete: `components/SUDEP Calculator/`

- [ ] **Step 1: Delete the untracked draft**

```bash
rm -rf "components/SUDEP Calculator"
```
(Do NOT `git add -A` — the repo has unrelated untracked files.)

- [ ] **Step 2: Full test suite**

Run: `npm run test:run`
Expected: PASS (includes `lib/sudep-risk`, `lib/seizure-risk`, `lib/asm-withdrawal`, `lib/resources`).

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit (only if something tracked changed)**

The draft was untracked, so its removal is not a git change. Confirm `git status --short` shows no unintended staged files; if nothing tracked changed, skip the commit.

---

## Self-Review Notes

- **Spec coverage:** logic + tables (Task 1), calibration/threshold/score anchors + PMID spot-check (Tasks 1–2), 5-tab UI with dark mode/violet/a11y + verbatim content (Task 3), registry-refactor integration + TOC + tocCount (Task 4), draft removal + build (Task 5). All spec success criteria mapped.
- **Type consistency:** `PedSUDEPInputs`/`SUDEP7Inputs`/`SUDEP3Inputs` + result types defined in Task 1 and consumed unchanged in Task 3/4. `calcPedSUDEP` returns the full `PedSUDEPResult` (with nested table objects) the UI reads for its breakdown.
- **id consistency:** `sudep-risk-calculator` identical in Task 4 registry, TOC entry, and scroll target; existing ids `asm-withdrawal-calculator` / `seizure-risk-calculators` preserved by the registry.
- **Placeholder note:** Task 1 Step 3 uses `/* ...copy lines NN... */` markers — these are explicit copy instructions tied to exact draft line ranges (not vague TODOs); the implementer fills them from the draft verbatim. This avoids duplicating ~170 lines of identical table data into the plan while keeping the source unambiguous.
- **SUDEP-7 worked subjects:** the spec referenced DeGiorgio's Subject 1=4 / Subject 13=6; the draft does not contain those subjects' per-item input profiles, so Task 1 instead locks valid input combos that PRODUCE totals of 4 and 6, plus the exclusion rules and the practical max of 10. Task 2 attempts to confirm the published subject values against the paper.
