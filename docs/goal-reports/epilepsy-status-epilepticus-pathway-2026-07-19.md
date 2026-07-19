# /goal report — epilepsy > "Status Epilepticus Pathway" — 2026-07-19

**Focus:** `--focus=facts`
**Scope reviewed:** `status-epilepticus-pathway` → `se-second-line` (TOC 5–10), plus the
`status-epilepticus-antiseizure-medications` dosing tables (TOC 11), which is where the
prose dosing actually lives. Monitoring/work-up checklist (TOC 12) skimmed only.

**Cross-reference used:** `lib/se-ladder/calculator.ts` + `components/se-ladder/SEMedLadder.tsx`
— the SE Med Ladder widget, which received a sourced accuracy audit in commit `46ba639`
(2026-05-29) and carries 10 cited references (ILAE 2015 / Trinka PMID 26336950,
Glauser 2016 PMID 26900382, ESETT/Kapur PMID 31774955, et al.).

## Headline

The handbook now states benzodiazepine dosing in **three** places that do not agree:
the pathway's *First-Line Benzodiazepines* table, the *SE ASM Dosing & Weaning Tables*
(§1), and the audited calculator. The second-line, third-line-infusion, and weaning
numbers, by contrast, are **consistent across all three** — those check out.

No content was changed. Every item below is dosing or a threshold, so per the safety
rules all of it is a proposal.

## Applied — IM midazolam removed (user decision, 2026-07-19)

User confirmed: **this institution does not use IM midazolam — IN or IV only.** That
retires Proposal 1 by deletion rather than by picking between the two dose figures.
Applied in three places:

| File | Change |
|---|---|
| `src/data/epilepsy.json` | Pathway first-line benzo table: dropped the `Midazolam IM 0.15 mg/kg` row; "No IV access" rowspan 3→2 |
| `src/data/epilepsy.json` | §1 dosing table: dropped the `Midazolam IM 13–40 kg: 5 mg; >40 kg: 10 mg` row |
| `src/data/neuro-on-call.json` | Benzo quick-reference: `Midazolam (IV / IM / IN / buccal)` → `(IV / IN / buccal)`; `0.2 mg/kg IV or IM` → `0.2 mg/kg IV`; removed the `IM: 10 mg if >40 kg; 5 mg if 13–40 kg` pediatric clause |
| `lib/se-ladder/calculator.ts` | `recommendFirstLine()` no-IV path no longer returns an IM option; midazolam IN promoted to rank 1 |
| `lib/se-ladder/__tests__/calculator.test.ts` | IM weight-band tests replaced with tests asserting IM is never recommended at any weight, and that small infants still get a dose |

**Side effect — a gap closed.** The calculator's IM banding started at 13 kg and returned
**0 mg** below that, so an 8 kg infant with no IV access got no IM dose. With IM gone,
IN midazolam (0.2 mg/kg, capped at 10 mg) covers every weight. There is now a regression
test for this.

Verified: html diffs vs HEAD contain *only* the IM deletions and the rowspan change;
`npm run build` compiles; 263 tests pass.

**Left alone deliberately:** the IM mentions in `headaches.json` (migraine abortives —
metoclopramide, DHE, ketorolac), `epilepsy.json` stress-dose hydrocortisone IV/IM, and
the generic "Tablets, capsules, IM, IV, rectal…" formulations line. Your instruction was
about midazolam; I did not extrapolate it to unrelated drugs.

## Second round — user decisions applied 2026-07-19

All four remaining questions were answered and applied.

| Decision | Applied |
|---|---|
| **Lorazepam IV redose = 3–5 min** | epilepsy pathway table (was 5–10 min) and neuro-on-call quick reference, both cells (was 10 min). §1 table and calculator already said 3–5 — all four sources now agree. |
| **IV diazepam: drop it** | Removed from the epilepsy pathway table (lorazepam is now the sole IV first-line benzo, rowspan dropped), from the §1 dosing table, and from the neuro-on-call row — which became `Diazepam (PR)` with the IV-only propylene-glycol adverse-effect note trimmed. Matches the calculator, which never offered it. |
| **Diastat PR / Valtoco IN: keep in prose only** | No change. Prose keeps the full weight/age rescue-dosing tables; the calculator stays an in-hospital acute tool. Proposal 3 closed. |
| **Thiamine line: drop** | Removed "In malnourished risk, consider IV thiamine 20 mg/kg/day before dextrose." from the hypoglycemia row of the monitoring checklist. Proposal 5 closed. |

**Midazolam IV redose → 3–5 min** (user decision, second round). Every benzodiazepine
redose interval in the handbook is now 3–5 min; no "10 min" remains.

### Still open — deliberately not changed

That table's midazolam **IV** dose is **0.2 mg/kg**, which is the same figure given for
the IN route; the epilepsy tables give no IV midazolam dose at all for first-line use.
Not flagged as an error — it is simply the one remaining benzo figure with no second
source in the repo to check against. Worth a look next time you're in this table.

## Proposals — needs your review

### ~~Proposal 1~~ — **RESOLVED 2026-07-19** — IM route retired, see "Applied" above
- **Location:** epilepsy > Status Epilepticus Pathway > First‑Line Benzodiazepines (`#se-first-line-benzos`), "No IV access" row
- **Current:** "Midazolam IM | **0.15 mg/kg IM (max 10 mg)** | Large muscle (thigh); good prehospital choice."
- **Proposed:** "Midazolam IM | **13–40 kg: 5 mg; >40 kg: 10 mg** | Large muscle (thigh); good prehospital choice. For <13 kg use IN or PR."
- **Why:** This is the one place in the handbook that doses IM midazolam per-kg. The
  dosing table 8 headings later (§1) and the audited calculator (`recommendFirstLine`,
  `lib/se-ladder/calculator.ts:70`) both use **weight-banding**. The two methods diverge
  by more than 2× in the commonest toddler weight range:

  | Weight | per-kg (0.15 mg/kg) | weight-banded |
  |---|---|---|
  | 15 kg | 2.25 mg | 5 mg |
  | 20 kg | 3.0 mg | 5 mg |
  | 30 kg | 4.5 mg | 5 mg |
  | 50 kg | 7.5 mg | 10 mg |

  A resident reading the pathway table and a resident using the calculator will give
  different doses to the same child. Note that **both are defensible in the literature** —
  0.15–0.2 mg/kg IM is the Glauser 2016/AES figure, and the 5 mg/10 mg banding is the
  RAMPART-derived autoinjector convention — so this is a "which does *our institution* do"
  question, not a right/wrong one. It needs your answer, not mine.
- **Source:** internal inconsistency (`src/data/epilepsy.json` §1 table vs. this table vs.
  `lib/se-ladder/calculator.ts:70`). External context: Glauser T, et al. *Evidence-Based
  Guideline: Treatment of Convulsive Status Epilepticus in Children and Adults.*
  Epilepsy Curr 2016;16(1):48-61. PMID 26900382. — **UNVERIFIED against your institutional pathway**

### Proposal 2 — NEEDS VERIFICATION — risk: dosing — **now the highest priority**
- **Location:** four tables across two sections (see grid)
- **Why this got worse:** while tracing IM mentions I found a **fourth** benzodiazepine
  table — `neuro-on-call.json` > "Benzodiazepines for Seizures – Quick Reference". It
  disagrees with the other three. Current state:

  | Source | Lorazepam IV redose | Diazepam IV dose | Diazepam IV redose |
  |---|---|---|---|
  | epilepsy `#se-first-line-benzos` | **5–10 min** | **0.2 mg/kg** | 5 min |
  | epilepsy §1 dosing table | **3–5 min** | **0.15–0.2 mg/kg** | 3–5 min |
  | neuro-on-call quick reference | **10 min** | **0.15 mg/kg** | 5 min |
  | `lib/se-ladder/calculator.ts` | **3–5 min** | *(not offered)* | — |

  Three different redose intervals for lorazepam and three different diazepam IV doses,
  in a handbook whose readers are covering call. This matters clinically: the pathway's
  own phase table allots 5–20 min to first-line therapy, so a 10-minute wait before the
  second benzo can push the second-line load past the 20-minute mark.
- **Proposed:** pick one value for each and I will propagate it to all four locations.
  I am **not** picking for you — all three intervals appear in the literature.
- **Source:** internal inconsistency across `src/data/epilepsy.json`,
  `src/data/neuro-on-call.json`, `lib/se-ladder/calculator.ts`. — **UNVERIFIED**

### Proposal 3 — NEEDS VERIFICATION — risk: dosing / scope
- **Location:** epilepsy > `#se-first-line-benzos` and §1 dosing table
- **Current:** Both prose tables list **IV diazepam** and **diazepam rectal gel (Diastat)** as first-line options.
- **Proposed:** No change to the prose — instead, decide whether the *calculator* should carry them again.
- **Why:** Commit `46ba639` deliberately **removed** IV diazepam and the `calcDiastatPR()`
  helper from the ladder, so the audited tool now offers lorazepam only (IV) and
  midazolam IM/IN (no IV). The prose still offers four benzos plus PR. I could not find a
  rationale for the removal in the commit message beyond "accuracy audit fixes", so I
  don't know whether the intent was "these aren't on our pathway" (→ prose should shrink)
  or "the widget is deliberately a narrow decision aid" (→ prose is fine, widget is a
  subset by design). **Do not let me guess this one.**
- **Update 2026-07-19:** the infant-safety half of this is now moot — with IM gone,
  IN midazolam covers all weights, so PR diazepam is no longer load-bearing as the only
  sub-13 kg option. What remains is purely the scope question: should the prose keep
  offering IV diazepam and Diastat PR when the calculator doesn't?
- **Source:** commit `46ba639` vs. current `src/data/epilepsy.json`. — **UNVERIFIED — intent question for you**

### Proposal 4 — NEEDS VERIFICATION — risk: factual / minor
- **Location:** epilepsy > Status Epilepticus Pathway > Second‑Line (`#se-second-line`)
- **Current:** "Levetiracetam | 40–60 mg/kg (max 4500) | **About 15 minutes**"
- **Proposed:** "over 10–15 minutes"
- **Why:** §1 table and the calculator both say 10–15 min. Trivial, but it is a stated
  infusion time and therefore not something I'll change silently.
- **Source:** internal inconsistency. — **UNVERIFIED**

### Proposal 5 — NEEDS VERIFICATION — risk: factual / thiamine dosing
- **Location:** epilepsy > SE Monitoring & Work‑up Checklist (`#se-monitoring-workup`), Hypoglycemia row
- **Current:** "In malnourished risk, consider IV thiamine **20 mg/kg/day** before dextrose."
- **Proposed:** flag for verification; commonly cited pediatric figures for thiamine in
  suspected deficiency are considerably lower, and "mg/kg/day" is an odd unit for a
  one-time pre-dextrose dose.
- **Why:** I am **not confident** what the right number is here and will not propose a
  replacement value. Flagging because the unit/context reads inconsistently with the
  single-dose intent of the surrounding text ("before dextrose"), not because I have
  established the number is wrong.
- **Source:** model observation — **UNVERIFIED, no citation offered.** Please check against
  your own pathway rather than treating this as a correction.

## Verified consistent — no action

These were cross-checked against the audited calculator and **agree**; recording them so
the next pass doesn't redo the work:

- ILAE t1/t2 operational times — convulsive 5/30 min, focal w/ impaired awareness 10/>60 min,
  absence 10–15 min / t2 unknown. Matches Trinka 2015 (PMID 26336950).
- Second-line loads and caps — fosphenytoin 20 mg PE/kg (1500), levetiracetam 60 mg/kg (4500),
  phenobarbital 20 mg/kg (1000), valproate 40 mg/kg (3000). All three sources agree.
- Second-line cautions — fosphenytoin avoided in suspected Dravet and cardiac conduction
  disease; valproate avoided in POLG/mitochondrial disease and <2 y unless POLG status known;
  levetiracetam full load safe on home levetiracetam.
- Third-line infusions — midazolam bolus 0.1–0.15 mg/kg, start 0.1 mg/kg/hr, max 2 mg/kg/hr;
  ketamine bolus 2 mg/kg, 0.5–1 mg/kg/hr, max 6 mg/kg/hr; pentobarbital bolus 2–5 mg/kg,
  0.5 mg/kg/hr, max 5 mg/kg/hr. Prose §3 and calculator agree exactly.
- Weaning table (§4) — no calculator counterpart to conflict with.

## Note on provenance

This subsection contains **zero citations** (0 PMIDs) while the calculator covering the
same content carries 10. If you want the prose to become auditable, this subsection is the
natural place to start — the reference list already exists in
`components/se-ladder/SEMedLadder.tsx:423-432` and could be surfaced in the prose without
new sourcing work.

## Validation

- `src/data/epilepsy.json` unmodified this run — JSON parses, content byte-identical.
- `npm run build` — passes.
- `npx vitest run` — 262 passed.
