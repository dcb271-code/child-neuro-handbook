# Status Epilepticus Med Ladder — Design

**Date:** 2026-05-29
**Section:** Neurocritical Care (anchor `#se-med-ladder`)
**Pattern reference:** The HIE Neonatal Assessment widget (`components/hie/`, `lib/hie/`) is the structural analogue.

## Overview

An operationalized, weight-and-flag-aware tool that walks a resident through the institutional Pediatric Convulsive Status Epilepticus pathway in real time. Replaces the static handbook content (currently a series of HTML tables in the Epilepsy section) with an interactive, patient-specific decision aid usable on call. Five tabs: a sequential **Pathway walker** (default), a **Dosing card** reference, a **Refractory & weaning** detail tab covering RSE + SRSE, **Teaching**, and **References**.

## Scope

- **Pediatric Convulsive SE, ≥28 days of age.** Matches the existing handbook section "Pediatric Convulsive SE (≥28 days)."
- **Convulsive SE only**, with a Teaching-tab callout that non-convulsive SE and focal SE require EEG and have a different escalation tempo.
- **Source of truth = the institutional Status Epilepticus Pathway** already in `src/data/epilepsy.json` (ILAE 2015 timing framework, 4 phases as written, dosing & weaning tables, monitoring checklist) plus the **Refractory Status Epilepticus Pathway** PDF in `public/pdfs/pathways/refractory-status-epilepticus-pathway.pdf`.
- **Neonate redirect**: if the user marks "Age <28 d" in the globals, the Pathway walker swaps for a single card pointing to `neonatal-seizure-pathway.pdf` and noting the protocol differs (phenobarbital is typically 1st-line, etc.).
- **Out of scope** for v1: persistence across sessions; multi-patient tracking; integration with timing/timestamps for actual minute-by-minute clock; cEEG interpretation.

## Placement

- Section: **Neurocritical Care** (alongside the HIE calculator).
- Anchor `id`: `se-med-ladder`.
- TOC entry: `{ level: 1, text: 'Status Epilepticus Med Ladder', id: 'se-med-ladder' }` appended to the end of `neurocritical-care.json`'s `toc`.
- `index.json` `neurocritical-care.tocCount`: 11 → 12.
- Both `search.json` copies (`src/data/search.json`, `public/search.json`): append `{ section: 'neurocritical-care', sectionName: 'Neurocritical Care', heading: 'Status Epilepticus Med Ladder', id: 'se-med-ladder', text: '' }`.

## Tab architecture

| Tab | Purpose |
|---|---|
| **Pathway walker** (default) | Sequential, patient-specific algorithm walkthrough. The "3am on call" shape. |
| **Dosing card** | All drugs / routes / doses laid out as a printable reference for the entered weight. No algorithm. Includes "Copy summary" button. |
| **Refractory & weaning** | RSE (Phase 4) and SRSE (Phase 5) detail: midazolam infusion, ketamine (with evidence summary), pentobarbital, FIRES/NORSE adjuncts, weaning schedules, EEG goals. |
| **Teaching** | ILAE 2015 t1/t2 framework, ESETT equivalence, why levetiracetam often goes first, ketamine's NMDA rationale and earlier-is-better signal, pentobarbital reserved for SRSE, NCSE/focal SE callout, FIRES/NORSE framing, common pitfalls. |
| **References** | ILAE, NCS, ESETT, KETASER01, Niquet, Jacobwitz, Höfler, Gaspard, NORSE consensus, institutional pathway. |

## Phase structure — five phases

A change from the handbook's 4-phase table: the de facto practice separates Refractory SE (RSE, Phase 4) from Super-Refractory SE (SRSE, Phase 5), and treats midazolam as the primary 3rd-line with ketamine as a prominent adjunct/alternative; pentobarbital is deferred to SRSE per clinician direction.

| Phase | Time window | Content (summary) |
|---|---|---|
| 1 — Stabilization | 0–5 min | Checklist: ABCs / position airway / O₂ / glucose (treat if <60) / IV or IO / send labs + ASM levels. |
| 2 — First-line benzo | 5–20 min | Branches by IV access. IV+: lorazepam IV (primary), diazepam IV (alt). No IV: midazolam IM / IN / diazepam PR via the Diastat per-age-band chart. May repeat once after 3–5 min. |
| 3 — Second-line ASM | 20–40 min | Four options: levetiracetam (default first per ESETT-era preference), fosphenytoin, phenobarbital, valproate — each with calculated load dose, infusion time, cautions filtered by flags. |
| 4 — Refractory SE | 40–60+ min | **Midazolam infusion = primary 3rd-line.** Ketamine alternative or early adjunct with evidence summary and synergy rationale. Pentobarbital not shown here. Hand-off to Refractory & weaning tab for full escalation. |
| 5 — Super-refractory SE | >24 h despite anesthetic, or recurrence on weaning | Pentobarbital (full dosing); FIRES/NORSE adjuncts (anakinra, ketogenic diet, immunotherapy); anesthetic rotation; EEG burst-suppression target. |

## Global inputs (sticky on Pathway, Dosing, Refractory tabs)

- **Weight** — number input, kg.
- **Age band** — select: 28d–1y / 1–5y / 6–11y / ≥12y. Drives Diastat PR chart row and auto-derives the "<2 y" valproate caution.
- **<28 d?** — single checkbox; when checked, swaps Pathway content for the neonatal redirect card.
- **IV access** — toggle yes / no. Drives 1st-line benzo recommendation.
- **Clinical flags** (multi-select chips):
  - `suspected_dravet` → fosphenytoin contraindicated (sodium-channel blocker paradoxical worsening).
  - `polg_mito` → valproate contraindicated.
  - `cardiac_conduction` → fosphenytoin contraindicated.
  - `renal` → levetiracetam ⚠ "consider dose reduction" but still presentable.
  - `on_home_phenobarb` → grays out phenobarbital as 2nd-line option with note "don't repeat."
  - `on_home_levetiracetam` → levetiracetam still safe; note "may be given even if on home dose."

## Pathway walker — UX detail

Vertically-flowing card stack, one card per phase. Each card has a header (phase name + ILAE time window), a recommendation body (1–4 drug sub-cards), and a "Mark as given" affordance.

**Per-drug sub-card** displays:
- Drug name, route.
- The actual mg for the patient's weight, with a `mgPerKg × weightKg = mg` annotation underneath. Max-cap warning if the unclipped value would have exceeded the cap.
- Infusion time and any administration note.
- Caution chips driven by the flag-filter pass — yellow ⚠ or red ✗ — with hover/tap revealing the rationale.
- A "Mark as given" checkbox.

**Phase highlighting:** Current phase = first phase not yet checked off. Current phase is bordered prominently; completed phases collapse to a one-line summary with ✓ and which drug(s) were given. Marking any drug "given" within a phase advances `currentPhase` to the next phase (the resident-on-call semantic: if you're moving on, the prior step's effect is being evaluated and you're escalating). A completed phase can be re-expanded by clicking its summary line, and a "Reset" button on the summary panel clears all given-state.

**Phase 1 specifics:** Five checkable items rather than drug sub-cards. When all checked → phase ✓.

**Phase 2 specifics:**
- IV access yes: Lorazepam IV `0.1 mg/kg over 2 min, max 4 mg` (primary); Diazepam IV `0.15–0.2 mg/kg, max 10 mg` (alternative). Both expose a "Repeat dose after 3–5 min" checkbox once initially given.
- IV access no: Midazolam IM (weight-banded: 13–40 kg → 5 mg; >40 kg → 10 mg); Midazolam IN `0.2 mg/kg, 0.1 mg/kg per nostril, max 10 mg`; Diazepam PR via the Diastat per-age chart with the patient's age-band row highlighted.

**Phase 3 specifics:** Four sub-cards ranked levetiracetam → fosphenytoin → phenobarbital → valproate by default. Flag filters reorder/hide as appropriate. Each card shows load mg/kg, calculated mg, max cap, infusion time, key cautions. Footnote: "If still seizing 10–20 min post-load → Phase 4."

**Phase 4 specifics:** Two sub-cards at headline level — Midazolam infusion (primary; bolus mg + start rate mg/kg/hr) and Ketamine infusion (alternative or combo; bolus + start rate + evidence-summary line). Both with "See Refractory & weaning tab for full escalation, EEG goals, weaning."

**Phase 5 specifics:** Pentobarbital headline card. Adjunct cards for FIRES/NORSE (anakinra, ketogenic, immunotherapy). Anesthetic-rotation note. "See Refractory & weaning tab" CTA.

**Summary panel** (sticky right rail or sticky bottom on mobile): "Patient: 15 kg, 4 y, IV access. Given: Lorazepam 1.5 mg IV ✓. Next: 2nd-line ASM if still seizing." Includes a small "Reset" button.

## Logic / Recommendation engine (in `lib/se-ladder/calculator.ts`)

Pure, deterministic, fully unit-testable. Types:

```ts
type AgeBand = '28d-1y' | '1-5y' | '6-11y' | 'ge_12y';
type Route = 'IV' | 'IM' | 'IN' | 'PR' | 'infusion';
type Flag = 'suspected_dravet' | 'polg_mito' | 'cardiac_conduction' | 'renal'
          | 'on_home_phenobarb' | 'on_home_levetiracetam';
type Phase = 'stabilization' | 'first_line' | 'second_line' | 'refractory' | 'super_refractory';

type PatientInputs = {
  weightKg: number;
  ageBand: AgeBand;
  ivAccess: boolean;
  isNeonate: boolean;     // <28 d
  flags: Flag[];
};

type Severity = 'contraindicated' | 'caution' | 'note';
type CautionChip = { severity: Severity; text: string };

type DrugRecommendation = {
  drug: string;             // 'lorazepam' | 'diazepam' | ...
  route: Route;
  mgPerKg?: number;
  mg: number;               // computed for this patient (or weight-banded for midaz IM)
  maxCap: number;
  hitCap: boolean;          // true if uncapped product would have exceeded cap
  infusionTime?: string;    // e.g. "over 10–15 min"
  rate?: string;            // e.g. "0.1 mg/kg/hr" for infusions
  note?: string;
  cautions: CautionChip[];
  rank: number;             // for ordering within phase
};
```

Recommendation functions return ranked, flag-filtered lists per phase:

```ts
recommendFirstLine(inputs): DrugRecommendation[];
recommendSecondLine(inputs): DrugRecommendation[];
recommendRefractory(inputs): DrugRecommendation[];      // midaz + ketamine
recommendSuperRefractory(inputs): DrugRecommendation[]; // pentobarb + FIRES/NORSE
```

Helpers:
- `mgFor(mgPerKg, weightKg, maxCap)` → `{ mg, hitCap }`.
- `calcDiastatPR(ageBand, weightKg)` → `mg` from the institutional per-age chart.
- `applyFlagsToSecondLine(options, flags, ageBand)` → filtered/cautioned options.

Phase-state machine for the Pathway walker:
- `currentPhase(given: GivenLog)` → which phase the resident is on. `given` is a map from phase → "complete" with which drug(s).
- `nextPhase(current)` → linear advance.

## Testing plan (`lib/se-ladder/__tests__/calculator.test.ts`)

Coverage targets (≈30–40 tests):

- **Dose math** at 10 / 25 / 50 / 80 kg — `mg = mgPerKg × weight`, clipped at maxCap. Per-drug per-route.
- **Cap enforcement** — 50 kg lorazepam = 4 mg, not 5 mg; 80 kg fosphenytoin = 1500 PE not 1600; etc. `hitCap` set correctly.
- **Diastat PR chart** — every age band returns correct mg for representative weights (6 kg infant, 8 kg infant, 15 kg toddler, 25 kg school-age, 50 kg teen).
- **Flag filters:**
  - Dravet → fosphenytoin contraindicated; still allowed but ✗ chip.
  - POLG → valproate contraindicated.
  - Cardiac conduction → fosphenytoin contraindicated.
  - Renal → levetiracetam ⚠ caution chip with "consider dose reduction"; still ranked.
  - On home phenobarb → phenobarbital second-line option grayed/de-ranked with note.
  - On home levetiracetam → levetiracetam still safe note (chip).
- **Age <2 y → valproate caution** (handbook: "avoid <2 y unless POLG known"). Specifically: 28d–1y AND 1–5y bands need codified. Assumed implementation: 28d–1y → valproate contraindicated by default (no POLG status); 1–5y → contraindicated by default. ≥6y → not contraindicated for age.
- **Default ordering:**
  - 2nd-line: levetiracetam → fosphenytoin → phenobarbital → valproate (no flags).
  - 2nd-line with Dravet: levetiracetam → phenobarbital → valproate (fosphenytoin removed/last with ✗).
  - 4th-phase (RSE): midazolam first, ketamine second.
  - 5th-phase (SRSE): pentobarbital first, FIRES adjuncts after.
- **Phase state machine** — marking 1st-line as given advances current → 2nd-line; etc. Reset clears all given drugs.
- **Edge cases** — 3 kg patient (just out of neonate) — caps work, no NaN; very heavy patient (100 kg) — caps work; all flags set — contraindications stack without crashing; isNeonate true → returns empty/no-recommendations and component renders the redirect card.

## Citation handling

Specific ketamine percentages from CNS conference notes (76% / 60+% / 80% combo / 45% / 28% / 2%) will be **WebSearched during implementation** to source against the published literature. If a stat can be matched to a published source (Rosati 2018, Jacobwitz 2022, Niquet 2017, Höfler 2018, Gaspard 2013, Alkhachroum 2020, or a more recent paper), the actual number with citation is used. If a stat cannot be sourced, it is omitted rather than cited speculatively. The evidence summary in the Refractory tab is anchored on Niquet 2017 (mechanism / synergy) + the strongest pediatric cohort data the search surfaces.

References list will include at minimum: ILAE 2015 (Trinka et al.); NCS guideline (Glauser 2016); ESETT (Kapur 2019, NEJM); KETASER01 (Rosati 2018); Niquet 2017 (Ann Neurol); Jacobwitz 2022 (Neurology); Höfler & Trinka 2018 (Epilepsia); Gaspard 2013 (Epilepsia); Hirsch 2018 NORSE consensus. Institutional pathway link (epilepsy section anchor + refractory pathway PDF).

## File layout

```
lib/
  se-ladder/
    calculator.ts                  -- types, dose math, recommendation engine
    __tests__/
      calculator.test.ts           -- vitest, ~30–40 tests

components/
  se-ladder/
    SEMedLadder.tsx                -- 'use client', 5 tabs, dark-mode classes
                                      Sub-components inline: PhaseCard, DrugSubCard, CautionChip
```

## Integration steps

1. `app/[section]/page.tsx`: import `SEMedLadder`, add `{ id: 'se-med-ladder', Component: SEMedLadder }` to the `'neurocritical-care'` `SECTION_WIDGETS` entry.
2. `src/data/neurocritical-care.json`: append `{ level: 1, text: 'Status Epilepticus Med Ladder', id: 'se-med-ladder' }` to `toc`.
3. `src/data/index.json`: bump `neurocritical-care.tocCount` 11 → 12.
4. `src/data/search.json` and `public/search.json`: append `{ section: 'neurocritical-care', sectionName: 'Neurocritical Care', heading: 'Status Epilepticus Med Ladder', id: 'se-med-ladder', text: '' }`.

## Verification (acceptance criteria for the implementation plan)

- `npx tsc --noEmit` clean.
- `npx vitest run` — all tests pass, ≥30 in the new file.
- `/neurocritical-care` returns 200 with `id="se-med-ladder"` and "Status Epilepticus Med Ladder" visible in the SSR HTML.
- Manual spot-check: enter a 15 kg patient with IV access → Pathway walker shows Lorazepam IV 1.5 mg as the 1st-line primary recommendation; Phase 2's "given" checkbox advances to Phase 3; Phase 3 ranks levetiracetam first by default; Dravet flag moves fosphenytoin to ✗; POLG flag adds valproate ✗; Phase 4 shows midazolam primary and ketamine secondary; Phase 5 shows pentobarbital + FIRES adjuncts.

## Open questions / risks

- **Citation availability for ketamine stats.** Mitigated by the "if not sourceable, omit" rule. If WebSearch surfaces nothing close to the conference numbers, the evidence summary in the Refractory tab will rely on Rosati / Jacobwitz / Niquet headline numbers instead.
- **The "<2 y → valproate" caution codification.** The handbook says "<2 y unless POLG known." This implementation defaults to contraindicated for 28d–1y and 1–5y bands; a future iteration could expose a "POLG ruled out" toggle that lifts the age-only caution. Documented as future work.
- **`<28 d` neonate redirect** keeps a thin surface (just the redirect card) — by design, since the neonatal pathway is in the separate PDF and has different first-line drugs.
- **Print/copy on Dosing card.** Browser-clipboard API approach; degrade to no-op if unsupported. Not blocking.
