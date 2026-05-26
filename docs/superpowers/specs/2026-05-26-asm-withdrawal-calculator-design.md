# ASM Withdrawal Risk Calculator — Design

**Date:** 2026-05-26
**Status:** Approved for planning

## Goal

Add an interactive, evidence-based calculator that estimates seizure
recurrence and sustained-seizure-freedom risk after antiseizure medication
(ASM) withdrawal. It lives **inside the Epilepsy section** of the handbook as
a new subsection at the bottom of the article.

A working draft already exists at
`components/ASM Withdrawal/asm-withdrawal-calculator.jsx`. This work ports,
verifies, restyles, and integrates it.

## Models implemented (unchanged from draft)

1. **Lamberink 2017** (Lancet Neurol; PMID 28483337) — IPD meta-analysis,
   n=1,769 (~56% pediatric). Predicts 2-year and 5-year recurrence risk and
   10-year sustained seizure freedom. Point tables ported from the official
   UMC Utrecht implementation (`github.com/wmotte/epilepsypredictiontools`,
   `aed-calc.js`, Apache-2.0).
2. **Dai 2025** (eClinicalMedicine; PMID 40134561) — pediatric-specific
   0–17 weighted score with low/moderate/high strata; validated in 341
   children (AUC 0.85).

The About tab keeps validation caveats verbatim (Lamberink overprediction in
external cohorts; Dai single-cohort validation; decision-support, not
replacement).

## Integration approach (Approach B — append below section)

The Epilepsy section body is a single HTML string rendered via
`dangerouslySetInnerHTML` inside `SectionContent`. Rather than inject a React
island into that HTML, render the calculator as a sibling React component
**after** `<SectionContent>` within the article card, only for the epilepsy
slug.

### Components / files

- **`components/asm-withdrawal/ASMWithdrawalCalculator.tsx`** (new) — the draft
  converted to TSX, `'use client'`, restyled for the handbook (see Styling).
  Exports a default component taking no props.
- **`app/[section]/page.tsx`** (edit) — after `<SectionContent html={data.html} />`
  and before the Prev/Next nav, conditionally render:
  ```tsx
  {params.section === 'epilepsy' && (
    <section id="asm-withdrawal-calculator" className="scroll-mt-24 mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
      <ASMWithdrawalCalculator />
    </section>
  )}
  ```
  Import is a static client-component reference; rendering a client component
  from this server component is supported by Next.js.
- **`src/data/epilepsy.json`** (edit) — append one level-1 TOC entry so the
  calculator appears in the desktop TOC sidebar and the mobile pill nav:
  ```json
  { "level": 1, "text": "ASM Withdrawal Risk Calculator", "id": "asm-withdrawal-calculator" }
  ```
  The `id` must match the wrapper `<section id>` above. No change to the
  `html` field. `tocCount` in `index.json` ticks up by 1 (regenerate or
  hand-edit to stay consistent).
- **`components/ASM Withdrawal/`** (delete) — remove the draft folder once
  ported.

`SectionContent.tsx` is **not** modified.

### Why Approach B

User-selected. Simplest: no change to the generic section renderer, no
client-only portal/hydration concerns. Cost: the calculator sits at the very
bottom of the section rather than next to the maintenance-ASM content. The
TOC entry + mobile pill make it directly reachable, mitigating placement.

## Styling adaptation

The draft is light-mode-only with a blue accent and its own page chrome.
Changes to fit the handbook:

- Add `dark:` Tailwind variants throughout (handbook is dark-mode-first via
  `DarkModeToggle`). Inputs, selects, labels, tabs, pills, About-tab prose,
  and the score panels all need dark equivalents.
- Re-accent active tab + focus rings from blue to epilepsy purple `#7c3aed`
  (Tailwind `violet-600` family is the closest utility; use it for tab
  underline/text and `focus:ring`).
- Keep the risk pills' semantic colors: amber (2y), red (5y), emerald
  (long-term freedom); add dark variants.
- Remove the draft's outer wrapper (`max-w-4xl mx-auto p-4 sm:p-6 bg-white`),
  top `<h1>` title, and subtitle. The section article already supplies the
  card, padding, and (via the new TOC entry) a heading. Open the component
  with a heading element that matches `.doc-content` h-levels so it reads as a
  native subsection — render an `<h2>`-equivalent "ASM Withdrawal Risk
  Calculator" styled to match the section, or rely on the wrapper + an inline
  heading. (Implementation detail; match surrounding `.doc-content` headings.)
- Convert JS to TS: type the input-state objects, the calc function
  signatures/returns, and the small UI helper components (`Field`, `NumInput`,
  `Select`, `RiskPill`).

No logic, point values, thresholds, or copy change during the restyle.

## Verification (gate — must pass before integration is considered done)

1. Fetch the official UMC Utrecht `aed-calc.js` from
   `github.com/wmotte/epilepsypredictiontools`.
2. Diff the six ported structures against the source: `TTR_PTS_REC`,
   `TTR_PTS_LONG`, `DUR_PTS_REC`, `DUR_PTS_LONG`, `AGE_PTS`, `NAED_PTS_LONG`,
   and the three risk-lookup tables (`RISK_2Y`, `RISK_5Y`, `RISK_LONG`).
   Any divergence is a defect to fix in the ported file.
3. Run the two published Lamberink worked examples through `calcLamberink`
   in Node and confirm:
   - child, onset 3y, duration 1y, SFI 2y, no self-limiting syndrome →
     **28%** (2y) / **36%** (5y)
   - female, duration 1y, SFI 2y, 1 ASM → **97%** long-term freedom
4. Smoke-check `calcDai` strata boundaries (≤3 Low, 4–6 Moderate, ≥7 High)
   and max score 17.

**Fallback if the source repo is unreachable:** reproduce the two worked
examples (step 3) and spot-check several points against the published
nomogram figure; document in the PR/notes that a full table diff could not be
performed.

## Out of scope (explicitly deferred)

- Lamberink 2018 TimeToStop post-surgical nomogram (PMID 29446447).
- Stevelink JME-specific calculator (PMID 36467455).
- Result export / clinic-note copy-out.
- Homepage featured card (calculator is reached via the Epilepsy section only).

## Success criteria

- Visiting `/epilepsy/` shows the calculator at the bottom of the article,
  styled consistently with the section in both light and dark mode.
- The Epilepsy TOC (desktop sidebar + mobile pills) lists "ASM Withdrawal
  Risk Calculator" and clicking it scrolls to the calculator.
- The two Lamberink worked examples reproduce 28% / 36% / 97%.
- Ported point tables match the UMC Utrecht source (or fallback documented).
- `npm run build` succeeds (static export) with no type errors.
- The draft `components/ASM Withdrawal/` folder is removed.
