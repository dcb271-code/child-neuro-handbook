# Seizure Risk Calculators — Design

**Date:** 2026-05-26
**Status:** Approved for planning

## Goal

Add a second interactive calculator suite to the bottom of the **Epilepsy**
section, alongside the existing ASM Withdrawal Risk Calculator. It bundles
three counseling tools for the "when to start, when to worry" decision point:

1. **First unprovoked seizure** — 2-yr / 5-yr recurrence risk, with side-by-side
   treated vs untreated estimates and an automatic ILAE-2014 epilepsy-diagnosis
   flag (single seizure + ≥60% recurrence risk).
2. **Febrile seizure recurrence** — Berg/Shinnar 1997 four-factor model.
3. **Febrile seizure → future epilepsy** — Annegers-anchored stratification,
   updated for the recent evidence that recurrence-within-24h alone behaves
   like simple FS, and that febrile status epilepticus (FSE, ≥30 min) is its
   own high-risk tier (FEBSTAT / Lewis 2025). Includes Dravet/SCN1A and FSE
   banners.

A working draft exists at
`components/Epilepsy Risk Calc/seizure-risk-calculators.jsx`. This work ports,
verifies, restyles, and integrates it — following the established ASM
Withdrawal calculator pattern.

## Integration approach (stack a second conditional)

The Epilepsy section body is a single HTML string rendered via
`dangerouslySetInnerHTML` in `SectionContent`. As with the withdrawal calc,
the widget renders as a sibling React component after `<SectionContent>` in
`app/[section]/page.tsx`, gated on the epilepsy slug. The new calculator is
rendered **after** the existing withdrawal calculator (so TOC order == DOM
order with no JSON re-ordering). A `sectionWidgets` registry was considered
and deferred (only two widgets today; revisit if/when JME/Dravet tools land).

### Files

- **Create** `lib/seizure-risk/calculator.ts` — types + the three pure
  functions (`calcFirstSeizure`, `calcFebrileRecurrence`, `calcFutureEpilepsy`)
  and their lookup tables (`FIRST_SZ_TABLE`, `FS_RECUR_RISK`). No React.
- **Create** `lib/seizure-risk/__tests__/calculator.test.ts` — anchor tests
  (the verification gate).
- **Create** `components/seizure-risk/SeizureRiskCalculators.tsx` — the draft
  converted to TSX, `'use client'`, importing logic from the lib, restyled
  (dark mode + violet accent, chrome removed). Helpers `Field`/`Toggle`/
  `Select`/`RiskPill` ported with dark-mode variants; `Toggle` is new vs the
  withdrawal calc.
- **Modify** `app/[section]/page.tsx` — import `SeizureRiskCalculators`; add a
  second `{params.section === 'epilepsy' && (<section id="seizure-risk-calculators" ...><SeizureRiskCalculators/></section>)}` block immediately after the
  existing withdrawal-calculator block, before Prev/Next.
- **Modify** `src/data/epilepsy.json` — append one level-1 toc entry
  `{ "level": 1, "text": "First & Febrile Seizure Risk Calculators", "id": "seizure-risk-calculators" }`
  as the new LAST element (targeted string edit; file is single-line minified).
  Also bump the vestigial per-file `tocCount` 94→95 for internal consistency.
- **Modify** `src/data/index.json` — epilepsy `tocCount` 94 → 95 (scoped edit).
- **Delete** `components/Epilepsy Risk Calc/` — the draft folder (after porting).

`SectionContent.tsx` is not modified.

## Verification (clinical-safety gate)

These risk numbers are clinically assigned from the literature (not ported
from authoritative source code), so verification is two-pronged:

1. **Anchor tests** (`lib/seizure-risk/__tests__/calculator.test.ts`) that
   regression-lock the published values the draft cites:
   - First seizure 2-yr recurrence: idiopathic/normal 21, idiopathic/abnormal
     41, remote/normal 32, remote/abnormal 54; 5-yr 26/56/40/65. Treated 2-yr
     ≈ round(0.6 × untreated); treated 5-yr ≈ round(0.7 × untreated). The
     `epilepsyDx` flag is true when untreated 2-yr ≥ 60 (remote+abnormal+a
     modifier crosses it) and false for the low-risk base case.
   - Febrile recurrence: 14 / 24 / 32 / 63 / 76 for 0/1/2/3/4 risk factors.
   - Future epilepsy strata: simple 2.4; recurrence-only 3.5; one higher-risk
     feature 7; ≥2 higher-risk 17; prior-abnormality + higher-risk 22; FSE 25,
     FSE+focal 35, FSE+prior-abnormality 40; family-hx-epilepsy modifier ×1.5
     capped at 75; recurrence-only adds no tier when focal/prolonged present.
2. **Independent PMID spot-check:** I verify a handful of the headline numbers
   against the cited papers — Shinnar 1996 (PMID 8692621), Berg/Shinnar 1997
   (PMID 9111436), Annegers 1987 (PMID 3807992), Lewis 2025 FEBSTAT (PMID
   40770931) — via web lookup. Any number that does not reconcile is flagged
   to the user, not silently changed.

## Styling adaptation (same as withdrawal calc)

- Add `dark:` variants throughout (handbook is dark-mode-first).
- Re-accent blue → epilepsy violet (`violet-600`/`violet-500`) on active tab,
  focus rings, and `Toggle` selected state.
- Remove outer page chrome (`max-w-4xl mx-auto p-4 sm:p-6 bg-white`, the page
  `<h1>` + subtitle); open with an `<h3>` heading + one-line subtitle inside a
  `not-prose` wrapper.
- Tab `<button>`s get `type="button"`. Form controls associated with labels
  (wrap control in `<label>`, per the withdrawal-calc review).
- Convert to TS: type the three input-state shapes, the calc signatures/
  returns, and the UI helper props (`Toggle` is generic over its option type
  like `Select`).
- No logic, point values, thresholds, banners, or clinical copy change.

## Out of scope (deferred)

- `sectionWidgets` registry refactor (revisit when a 3rd widget lands).
- JME (Stevelink) and SCN1A/Dravet pre-test calculators — suggested future
  siblings, not this work.
- Acute-MRI second-level refinement for the FSE tab (23% vs 71%).

## Success criteria

- `/epilepsy/` shows the new calculators below the withdrawal calculator,
  styled consistently in light and dark mode.
- The Epilepsy TOC (sidebar + mobile pills) lists "First & Febrile Seizure
  Risk Calculators" and clicking it scrolls to the widget.
- All anchor tests pass; the PMID spot-check is documented.
- `index.json` epilepsy tocCount and `epilepsy.json` toc.length both = 95.
- `npm run test:run` and `npm run build` pass.
- The draft `components/Epilepsy Risk Calc/` folder is removed.
