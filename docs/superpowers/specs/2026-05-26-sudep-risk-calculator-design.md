# SUDEP Risk Assessment Calculator — Design

**Date:** 2026-05-26
**Status:** Approved for planning

## Goal

Add a third interactive calculator to the bottom of the **Epilepsy** section: a
pediatric-focused, evidence-anchored **SUDEP (Sudden Unexpected Death in
Epilepsy) risk assessment** tool aimed at neurology residents. Five tabs:

1. **Pediatric risk context** (primary) — a multiplicative model calibrated to
   Tomson 2025's 350-fold incidence spread, producing an absolute rate per
   1000 person-years (plus annual % and 10-year cumulative), with syndrome
   baselines + genetic/channelopathy modifiers + modifiable clinical
   multipliers, and a defensible low-end display (`≤0.05` / `<0.01`) instead of
   a hard floor.
2. **SUDEP-3** (Nei 2024) — 3-item weighted score.
3. **SUDEP-7 v2.0** (Novak/DeGiorgio 2015) — classical 7-item inventory.
4. **Modifiable factors** — intervention checklist driving the counseling
   conversation (interactive checkbox state).
5. **Teaching** — mechanism (MORTEMUS), definitions, resident learning points.

A working draft exists at `components/SUDEP Calculator/sudep-risk-calculator.jsx`.
This work ports, verifies, restyles, and integrates it — following the
established ASM Withdrawal / Seizure Risk calculator pattern.

## Integration approach (sectionWidgets registry refactor)

This is the **third** widget stacked at the bottom of Epilepsy, so the wiring
moves from repeated conditionals to a declarative registry. In
`app/[section]/page.tsx`, replace the two existing
`{params.section === 'epilepsy' && (<section id=...>...)}` blocks with a single
list:

```tsx
import ASMWithdrawalCalculator from '@/components/asm-withdrawal/ASMWithdrawalCalculator';
import SeizureRiskCalculators from '@/components/seizure-risk/SeizureRiskCalculators';
import SUDEPRiskCalculator from '@/components/sudep-risk/SUDEPRiskCalculator';

const SECTION_WIDGETS: Record<string, { id: string; Component: React.ComponentType }[]> = {
  epilepsy: [
    { id: 'asm-withdrawal-calculator', Component: ASMWithdrawalCalculator },
    { id: 'seizure-risk-calculators', Component: SeizureRiskCalculators },
    { id: 'sudep-risk-calculator', Component: SUDEPRiskCalculator },
  ],
};
```
Rendered after `<SectionContent>`/`<ImageLightbox>`, before Prev/Next:
```tsx
{(SECTION_WIDGETS[params.section] ?? []).map(({ id, Component }) => (
  <section key={id} id={id} className="scroll-mt-24 mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
    <Component />
  </section>
))}
```
Existing ids (`asm-withdrawal-calculator`, `seizure-risk-calculators`) are
preserved exactly, so the TOC anchors keep working. SUDEP renders third.

### Files

- **Create** `lib/sudep-risk/calculator.ts` — types + `calcPedSUDEP`,
  `calcSUDEP7`, `calcSUDEP3` and their numeric lookup tables
  (`SYNDROME_BASELINES`, `GENETIC_MODIFIERS`, `GTC_MULTIPLIERS`,
  `NOCTURNAL_MULTIPLIER`, `SUPERVISION_MULTIPLIER`, `ADHERENCE_MULTIPLIER`,
  `DURATION_MULTIPLIER`, `DETECTION_LIMIT`/`LOWEST_PLAUSIBLE`/`CEILING`). Pure,
  no React.
- **Create** `lib/sudep-risk/__tests__/calculator.test.ts` — anchor tests.
- **Create** `components/sudep-risk/SUDEPRiskCalculator.tsx` — the draft
  converted to TSX, `'use client'`, importing logic from the lib, restyled
  (dark mode + violet, chrome removed). The static `MODIFIABLE_FACTORS` and
  teaching-content arrays stay here (presentational prose, not logic); the
  modifiable-factors checkbox state is preserved.
- **Modify** `app/[section]/page.tsx` — registry refactor (above).
- **Modify** `src/data/epilepsy.json` — append level-1 toc entry
  `{ "level": 1, "text": "SUDEP Risk Assessment", "id": "sudep-risk-calculator" }`;
  bump per-file `tocCount` 95→96 (targeted edits; minified file).
- **Modify** `src/data/index.json` — epilepsy `tocCount` 95→96 (scoped edit).
- **Delete** `components/SUDEP Calculator/` — the draft folder (after porting).

`SectionContent.tsx` is not modified.

## Verification (clinical-safety gate)

These are clinically-assigned, calibrated values (no source code to diff), so
verification is two-pronged:

1. **Anchor tests** (`lib/sudep-risk/__tests__/calculator.test.ts`):
   - **calcPedSUDEP calibration** (reproduce the author's verified points):
     controlled epilepsy "typical favorable" profile ≈ 0.20/1000py; a typical
     Dravet profile in the 4–5/1000py range; an SCN8A profile ≈ 6/1000py;
     general lowest stratum near the detection limit.
   - **Threshold display logic:** raw < 0.01 → `displayString` `<0.01`
     (`displayLevel 'lowest_plausible'`); 0.01 ≤ raw < 0.05 → `≤0.05`
     (`'detection_limit'`); raw ≥ 30 → ceiling `≥30` (`'ceiling'`); a normal
     mid value renders as a plain 2-decimal string.
   - **Intervention impact:** flipping supervision shared→alone (and/or GTCS
     frequency) moves the rate by the expected multiplier (supervision shared
     0.5 vs alone 2.0 ⇒ 4× swing; document the ~75% reduction direction).
   - **Dravet SCN1A suppression:** for `syndrome:'dravet'` with an SCN1A-type
     genetic etiology, the genetic modifier is suppressed (not double-counted),
     while cardiac-overlap genes (KCNQ1/H2, SCN5A, SCN1B) still apply.
   - **calcSUDEP7:** reproduce the published worked subjects — **Subject 1 = 4**
     and **Subject 13 = 6** (DeGiorgio 2015), `max` = 10, and the item
     exclusion rules (gtcMore3 suppresses the 1-pt gtc item; sz50plus
     suppresses the 1-pt anySz item); quartile boundaries (≤1 / 2–3 / 4 / ≥5).
   - **calcSUDEP3:** score = gtcsPastYear(1) + anySzPastYear(1) + idDD(2);
     `max` 4; strata 0 / 1–2 / ≥3.
   - **cardiacFlag:** true for KCNQ1/H2, SCN5A, SCN1B; false otherwise.
2. **Independent PMID spot-check:** verify the headline calibration numbers
   against Tomson 2025 (PMID 39908470), Donnan 2023 (PMID 36750385), Cooper
   2016 (PMID 27810515), Sveinsson 2020 (PMID 31831600). Flag any number that
   doesn't reconcile rather than silently changing it.

The exact worked-subject inputs and calibration profiles are derived in the
implementation plan (Task 1) from the draft's functions so the tests assert the
functions' real outputs.

## Styling adaptation (same as the sibling calculators)

- Add `dark:` variants throughout; re-accent blue → epilepsy violet
  (`violet-600`/`violet-500`) on active tab, focus rings, selected toggles, and
  checkbox accents.
- Remove outer page chrome (`max-w-4xl mx-auto p-4 sm:p-6 bg-white`, page
  `<h1>`); open with an `<h3>` title + subtitle inside a `not-prose` wrapper.
  Inner column headers become `<h4>`.
- `type="button"` on tab buttons; grouped controls use `role="group"` +
  `aria-labelledby` (via `useId`), not a wrapping `<label>`.
- Convert to TS: type the input-state shapes, the calc signatures/returns, and
  UI helper props. Preserve the expandable "Show calculation breakdown" and the
  modifiable-factors checkbox interactivity.
- No logic, rate, multiplier, threshold, banner, or clinical-copy change.

## Out of scope (deferred)

- Dravet pre-test probability calculator (Hattori 2008 + Brunklaus 2012) —
  suggested next sibling.
- Cardiac-evaluation pathway and seizure-detection device decision aid.
- Polygenic risk score (Wagnon 2025 preprint) — not yet clinically actionable.
- PGES/RMSSD physiologic biomarker operationalization (needs EMU data).

## Success criteria

- `/epilepsy/` shows the SUDEP tool below the seizure-risk calculators, styled
  consistently in light and dark mode; the other two calculators still render
  (registry refactor regression-free).
- The Epilepsy TOC lists "SUDEP Risk Assessment" and clicking it scrolls to the
  tool; all three calculator anchors work.
- Anchor tests pass; PMID spot-check documented.
- `epilepsy.json` toc.length and `index.json` epilepsy tocCount both = 96.
- `npm run test:run` and `npm run build` pass.
- The draft `components/SUDEP Calculator/` folder is removed.
