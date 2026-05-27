# SUDEP SCN1A Genotype/Phenotype Axis Reorg — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the SUDEP calculator's SCN1A handling correct — move severity to the phenotype axis, turn the SCN1A gene option into a pure risk floor (above the GEFS+ baseline), and remove the Dravet-suppression hack that produced the focal-DRE+SCN1A (10.71) > Dravet (4.59) anomaly.

**Architecture:** Pure-logic change in `lib/sudep-risk/calculator.ts` (two new phenotype baselines; SCN1A becomes a `floorBaseline` gene with `mult: 1.0`; combination logic uses `max(baseline, floor)`), driven by tests in `__tests__/calculator.test.ts`, then the React UI in `components/sudep-risk/SUDEPRiskCalculator.tsx` is updated to expose the two new phenotypes, relabel SCN1A, and render the floor in the breakdown.

**Tech Stack:** TypeScript, Vitest, Next.js 14 (React), Tailwind. Tests run with `npx vitest run`. Typecheck with `npx tsc --noEmit`.

**Spec:** `docs/superpowers/specs/2026-05-26-sudep-scn1a-phenotype-axis-design.md`

**Approved calibration:** GEFS+/mild baseline `0.15`; SCN1A floor `0.25`; severe non-Dravet DEE `1.90` (Dravet stays `1.80`). Invariant: SCN1A floor (0.25) **>** GEFS+ baseline (0.15).

---

## Task 1: Calculator logic, types, and baselines (TDD)

**Files:**
- Modify: `lib/sudep-risk/calculator.ts`
- Test: `lib/sudep-risk/__tests__/calculator.test.ts`

Note on TDD here: Vitest strips types at runtime, so tests referencing the new `'scn1a'` / `'gefs_mild'` / `'severe_dee'` values will *run* (not compile-fail) before implementation — they fail because `SYNDROME_BASELINES['gefs_mild']` falls back to `controlled` and `GENETIC_MODIFIERS['scn1a']` falls back to `none`. That is the expected red state.

- [ ] **Step 1: Replace the obsolete Dravet-suppression test and add the new behavior tests**

In `lib/sudep-risk/__tests__/calculator.test.ts`, **replace** the test currently at lines 61–66 (the `'Dravet baseline suppresses an SCN1A-type genetic modifier (no double-count)'` test) with:

```ts
  it('Dravet + SCN1A is unchanged — the SCN1A floor (0.25) is below Dravet (1.80), so not binding (no double-count)', () => {
    const none = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', gtcFrequency: 'frequent', nocturnal: true, duration: 'medium' });
    const scn1a = calcPedSUDEP({ ...pedBase, syndrome: 'dravet', geneticEtiology: 'scn1a', gtcFrequency: 'frequent', nocturnal: true, duration: 'medium' });
    expect(scn1a.rawRate).toBeCloseTo(none.rawRate, 6);
    expect(scn1a.rawRate).toBeCloseTo(4.59, 2);
    expect(scn1a.geneticFloorApplied).toBe(true);
    expect(scn1a.geneticFloorBinding).toBe(false);
  });
```

(Leave the cardiac-gene test at lines 67–72 unchanged — `kcnq1_h2` has no `floorBaseline`, so it still multiplies the Dravet baseline by 4.0 and the test still passes.)

Then **append a new describe block** at the end of the file (after the `calcSUDEP3` block):

```ts
const STD = {
  gtcFrequency: 'frequent', nocturnal: true, supervision: 'shared',
  adherence: 'good', duration: 'medium',
} as const;
// STD clinical product = 2.5 * 1.7 * 0.5 * 1.0 * 1.2 = 2.55

describe('calcPedSUDEP — SCN1A floor + phenotype ordering', () => {
  it('enforces severe-DEE > Dravet > focal+SCN1A > GEFS++SCN1A on a fixed clinical profile', () => {
    const severeDee = calcPedSUDEP({ ...pedBase, ...STD, syndrome: 'severe_dee', geneticEtiology: 'scn1a' });
    const dravet    = calcPedSUDEP({ ...pedBase, ...STD, syndrome: 'dravet' });
    const focal     = calcPedSUDEP({ ...pedBase, ...STD, syndrome: 'focal_dre', geneticEtiology: 'scn1a' });
    const gefs      = calcPedSUDEP({ ...pedBase, ...STD, syndrome: 'gefs_mild', geneticEtiology: 'scn1a' });
    expect(severeDee.rawRate).toBeGreaterThan(dravet.rawRate);
    expect(dravet.rawRate).toBeGreaterThan(focal.rawRate);
    expect(focal.rawRate).toBeGreaterThan(gefs.rawRate);
    expect(severeDee.rawRate).toBeCloseTo(4.85, 2);
    expect(focal.rawRate).toBeCloseTo(3.06, 2);
  });

  it('SCN1A adds risk to a GEFS+ phenotype — floor 0.25 exceeds the 0.15 GEFS+ baseline (drift guard for the invariant)', () => {
    const bare  = calcPedSUDEP({ ...pedBase, ...STD, syndrome: 'gefs_mild', geneticEtiology: 'none' });
    const scn1a = calcPedSUDEP({ ...pedBase, ...STD, syndrome: 'gefs_mild', geneticEtiology: 'scn1a' });
    expect(scn1a.rawRate).toBeGreaterThan(bare.rawRate);
    expect(bare.rawRate  / 2.55).toBeCloseTo(0.15, 6);  // gene-agnostic GEFS+ baseline
    expect(scn1a.rawRate / 2.55).toBeCloseTo(0.25, 6);  // floored to GEFS+-with-SCN1A level
    expect(scn1a.geneticFloorBinding).toBe(true);
  });

  it('SCN1A floors a self-limited phenotype up to the GEFS+-with-SCN1A level (0.25)', () => {
    const r = calcPedSUDEP({ ...pedBase, ...STD, syndrome: 'selflimited', geneticEtiology: 'scn1a' });
    expect(r.rawRate / 2.55).toBeCloseTo(0.25, 6);
    expect(r.geneticFloorBinding).toBe(true);
  });

  it('regression: drug-resistant focal + SCN1A is no longer the 10.71 Very-high artifact', () => {
    const r = calcPedSUDEP({ ...pedBase, ...STD, syndrome: 'focal_dre', geneticEtiology: 'scn1a' });
    expect(r.rawRate).toBeCloseTo(3.06, 2);
    expect(r.rawRate).toBeLessThan(10);
    expect(r.tier).toBe('High');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/sudep-risk/__tests__/calculator.test.ts`
Expected: FAIL — the new SCN1A/ordering tests fail (e.g. `geneticFloorApplied` is `undefined`; `gefs_mild` falls back to the `controlled` 0.40 baseline so rates are wrong), and the replaced Dravet test fails on `geneticFloorApplied`.

- [ ] **Step 3: Update the type definitions**

In `lib/sudep-risk/calculator.ts`, change the `Syndrome` union (currently lines 9–11) to add `gefs_mild` and `severe_dee`:

```ts
export type Syndrome =
  | 'selflimited' | 'newonset' | 'controlled' | 'gefs_mild' | 'focal_dre'
  | 'gen_dre' | 'other_dee' | 'severe_dee' | 'lgs' | 'dravet';
```

Change the `GeneticEtiology` union (currently lines 12–15), replacing `scn1a_nondravet` with `scn1a`:

```ts
export type GeneticEtiology =
  | 'none' | 'scn1a' | 'scn2a' | 'scn8a' | 'stxbp1'
  | 'kcnq1_h2' | 'scn5a' | 'scn1b' | 'depdc5' | 'dup15q'
  | 'kcnt1' | 'other_chan' | 'other_ge';
```

Add `floorBaseline` to `GeneticModifier` (currently line 32):

```ts
export type GeneticModifier = { mult: number; note: string; cardiacFlag?: boolean; floorBaseline?: number };
```

In `PedSUDEPResult` (currently lines 37–60), **remove** the line `geneticSuppressedForDravet: boolean;` and **add** these two in its place:

```ts
  geneticFloorApplied: boolean;
  geneticFloorBinding: boolean;
```

- [ ] **Step 4: Add the two new phenotype baselines**

In `SYNDROME_BASELINES` (`lib/sudep-risk/calculator.ts`), add a `gefs_mild` entry immediately after the `controlled` entry (after line 93), and a `severe_dee` entry immediately after the `other_dee` entry (after line 111):

```ts
  gefs_mild: {
    rate: 0.15,
    label: 'GEFS+ / mild genetic epilepsy (normal intelligence)',
    description: 'Genetic epilepsy with febrile seizures plus and related mild SCN1A-spectrum phenotypes with normal cognition. SUDEP is documented but rare and far below Dravet (GeneReviews "SCN1A Seizure Disorders"; systematic review PMC8739186). This baseline reflects a mild recurrent epilepsy where the gene is unknown or non-SCN1A; selecting SCN1A raises it via the SCN1A risk floor.',
    source: 'GeneReviews SCN1A; Frontiers 2021 (PMC8739186)'
  },
```

```ts
  severe_dee: {
    rate: 1.90,
    label: 'Severe early-infantile / non-Dravet DEE (e.g., non-Dravet SCN1A-type)',
    description: 'Severe non-Dravet developmental and epileptic encephalopathy — e.g., the gain-of-function early-infantile SCN1A entity (neonatal onset, arthrogryposis, hyperkinetic movement disorder, profound impairment; Sadleir/Berecki, Brain 2022). Placed marginally above Dravet: Donnan 2023 found a higher SUDEP PROPORTION in non-Dravet SCN1A DEE (3/15, 20%) than Dravet (12/203, 5.9%), but this is a small-sample proportion, not an incidence rate, and the authors caution against over-interpretation. The +0.10 over Dravet encodes that prior conservatively.',
    source: 'Donnan 2023 (PMID 36750385); Sadleir/Berecki Brain 2022'
  },
```

- [ ] **Step 5: Replace the SCN1A genetic modifier with a floor**

In `GENETIC_MODIFIERS` (`lib/sudep-risk/calculator.ts`), **replace** the entire `scn1a_nondravet` entry (currently lines 131–135) with:

```ts
  scn1a: {
    mult: 1.0,
    floorBaseline: 0.25,
    note: 'SCN1A spans the full severity spectrum (febrile seizures -> GEFS+ -> Dravet -> severe DEE; GeneReviews). A pathogenic SCN1A variant is never benign, so it sets a risk FLOOR at 0.25/1000py — the GEFS+-with-SCN1A level, above the 0.15 gene-agnostic GEFS+ baseline — regardless of the phenotype chosen. Severity above that floor is set by the selected phenotype (Dravet, severe non-Dravet DEE), so SCN1A does not additionally multiply those, avoiding double-counting.',
    cardiacFlag: false
  },
```

- [ ] **Step 6: Update the combination logic in `calcPedSUDEP`**

In `lib/sudep-risk/calculator.ts`, **replace** the suppression block and raw computation (currently lines 274–284, from the `// Genetic modifier is suppressed...` comment through the `raw` assignment) with:

```ts
  // SCN1A is modeled as a risk floor, not a multiplier: a pathogenic SCN1A
  // variant is never benign, so it raises the baseline to its floor when the
  // selected phenotype sits below it, and otherwise leaves severity to the
  // phenotype (no double-counting for Dravet / severe non-Dravet DEE, which
  // already exceed the floor). Non-floor genes keep their multiplier.
  const effectiveBaseline = gen.floorBaseline != null
    ? Math.max(synd.rate, gen.floorBaseline)
    : synd.rate;
  const effectiveGeneMult = gen.floorBaseline != null ? 1.0 : gen.mult;

  const raw = effectiveBaseline * effectiveGeneMult * gtc.mult * noct.mult *
              sup.mult * adh.mult * dur.mult;
```

Then **replace** the two result fields `geneticApplied` and `geneticSuppressedForDravet` in the returned object (currently lines 343–346) with:

```ts
    geneticApplied: geneticEtiology !== 'none',
    geneticFloorApplied: gen.floorBaseline != null,
    geneticFloorBinding: gen.floorBaseline != null && gen.floorBaseline > synd.rate,
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run lib/sudep-risk/__tests__/calculator.test.ts`
Expected: PASS — all tests green (the new SCN1A/ordering block, the rewritten Dravet test, and every pre-existing test including the SCN8A `other_dee` 6.12 anchor and the cardiac-gene Dravet test).

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors from `calculator.ts` or the test file. (The component still references the old field at this point — see the note below.)

> If `tsc` reports errors in `components/sudep-risk/SUDEPRiskCalculator.tsx` referencing `geneticSuppressedForDravet` or `scn1a_nondravet`, that is expected and fixed in Task 2. It is acceptable to commit Task 1 with that known component breakage since the next task fixes it immediately; the logic + its tests are self-contained and green.

- [ ] **Step 9: Commit**

```bash
git add lib/sudep-risk/calculator.ts lib/sudep-risk/__tests__/calculator.test.ts
git commit -m "SUDEP: model SCN1A as a phenotype-axis risk floor, not a x3.5 multiplier" -m "Adds GEFS+/mild (0.15) and severe non-Dravet DEE (1.90) phenotype baselines; SCN1A becomes a floor at 0.25 (mult 1.0); removes the Dravet-suppression branch. Fixes focal-DRE+SCN1A outranking Dravet. Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: UI — expose new phenotypes, relabel SCN1A, render the floor

**Files:**
- Modify: `components/sudep-risk/SUDEPRiskCalculator.tsx`

- [ ] **Step 1: Add the two new phenotype options to the syndrome Select**

In `components/sudep-risk/SUDEPRiskCalculator.tsx`, **replace** the syndrome `options` array (currently lines 232–241) with:

```tsx
                  options={[
                    ['selflimited', 'Self-limited (SeLECTS, CAE, JAE, etc.)'],
                    ['newonset', 'New-onset / single seizure'],
                    ['controlled', 'Controlled epilepsy (general pediatric)'],
                    ['gefs_mild', 'GEFS+ / mild genetic epilepsy (normal intelligence)'],
                    ['focal_dre', 'Drug-resistant focal epilepsy'],
                    ['gen_dre', 'Drug-resistant generalized epilepsy'],
                    ['other_dee', 'Other genetic DEE (non-Dravet, non-LGS)'],
                    ['severe_dee', 'Severe early-infantile / non-Dravet DEE'],
                    ['lgs', 'Lennox-Gastaut syndrome'],
                    ['dravet', 'Dravet syndrome']
                  ]}
```

- [ ] **Step 2: Relabel the SCN1A genetic option and update the field hint**

In the same file, **replace** the genetic option tuple (currently line 254):

```tsx
                    ['scn1a', 'SCN1A'],
```

And **replace** the genetic-etiology `hint` text (currently line 247) with:

```tsx
                hint="Most genes multiply the syndrome baseline (SCN2A, SCN8A, STXBP1, KCNT1, etc.). SCN1A instead sets a risk floor at the GEFS+/mild-with-SCN1A level — severity above that is set by the phenotype, so choose 'Dravet' or 'Severe early-infantile / non-Dravet DEE' for those presentations. KCNQ1/KCNH2/SCN5A/SCN1B flag for cardiac evaluation due to brain-heart channelopathy overlap."
```

- [ ] **Step 3: Render the floor in the genetic-modifier breakdown line**

In the same file, **replace** the genetic-modifier block (currently lines 416–423) with:

```tsx
                  {P.geneticEtiology !== 'none' && (
                    <div>
                      <strong>Genetic modifier:</strong> {pResult.geneticFloorApplied
                        ? (pResult.geneticFloorBinding
                            ? `risk floor ${pResult.genetic.floorBaseline}/1000py (raised the baseline)`
                            : `risk floor ${pResult.genetic.floorBaseline}/1000py (not binding — phenotype baseline is already higher)`)
                        : `${pResult.genetic.mult}×`}
                      <div className="text-slate-500 dark:text-slate-400 mt-0.5 italic">{pResult.genetic.note}</div>
                    </div>
                  )}
```

- [ ] **Step 4: Typecheck the whole project**

Run: `npx tsc --noEmit`
Expected: PASS, no errors. (Confirms `scn1a_nondravet` / `geneticSuppressedForDravet` have no remaining references, and `floorBaseline` is accessed correctly.)

- [ ] **Step 5: Re-run the full test suite**

Run: `npx vitest run`
Expected: PASS — all suites green.

- [ ] **Step 6: Commit**

```bash
git add components/sudep-risk/SUDEPRiskCalculator.tsx
git commit -m "SUDEP UI: add GEFS+/mild and severe-DEE phenotypes; SCN1A floor display" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Final verification

**Files:** none modified (verification only)

- [ ] **Step 1: Confirm no stray references to the removed symbols remain**

Run: `git grep -n "scn1a_nondravet\|geneticSuppressedForDravet"`
Expected: matches **only** inside `docs/superpowers/` (the historical original-calculator spec/plan and this design doc's problem statement) — none in `lib/` or `components/`.

- [ ] **Step 2: Production build (static export) to catch any Next.js build-time issue**

Run: `npm run build`
Expected: build succeeds. (The handbook is a static-export Next.js app; this confirms the embedded calculator widget compiles in the real build.)

- [ ] **Step 3: Full test suite, final pass**

Run: `npx vitest run`
Expected: all suites PASS. Note the file count and "passed" totals in your completion summary as evidence.

---

## Self-Review (completed by plan author)

**Spec coverage:**
- Phenotype axis: two new baselines (gefs_mild 0.15, severe_dee 1.90) → Task 1 Step 4 ✓
- Genetic axis: scn1a floor 0.25, mult 1.0, cardiacFlag false; others untouched → Task 1 Step 5 ✓
- Computation: `max(baseline, floor)`, `effectiveGeneMult`, suppression branch deleted → Task 1 Step 6 ✓
- Result type: remove `geneticSuppressedForDravet`, add `geneticFloorApplied`/`geneticFloorBinding` → Task 1 Step 3 & 6 ✓
- UI: two phenotype options, SCN1A relabel, hint rewrite, floor display → Task 2 ✓
- Methods/SCN1A note + severe-DEE caveat → embedded in baseline `description`/`note` strings (Task 1 Steps 4–5) ✓
- Tests #1–#5 → Task 1 Step 1 ✓. Test #6 (invariant guard) → covered behaviorally by the "SCN1A adds risk to a GEFS+ phenotype" test (if floor ≤ baseline, `scn1a.rawRate` would not exceed `bare.rawRate`), so internals need not be exported ✓. Test #7 (other genes unchanged) → existing SCN8A 6.12 and cardiac-gene tests retained ✓

**Placeholder scan:** none — every code/command step shows literal content.

**Type consistency:** `floorBaseline` (modifier), `geneticFloorApplied`/`geneticFloorBinding` (result), values `'scn1a'`/`'gefs_mild'`/`'severe_dee'` used identically across calculator, tests, and component. `pResult.genetic.floorBaseline` matches the optional field added to `GeneticModifier`. ✓
