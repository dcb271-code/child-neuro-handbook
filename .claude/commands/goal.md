---
description: Review & improve a handbook section's content — formatting, readability, factual accuracy, and content gaps — with clinical-safety guardrails.
argument-hint: <section> ["topic"] [--focus=formatting|readability|facts|content]   |   all
---

You are improving the **child-neurology handbook** in this repo. The content for each of the 20 sections lives as an HTML string inside `src/data/<slug>.json` (fields: `html`, `toc`, `tocCount`, …) and renders via `dangerouslySetInnerHTML` inside a `.doc-content` container. This is **clinical reference material used by physicians** — a confidently wrong "fact" is dangerous. Behave accordingly.

## Arguments

Raw arguments: `$ARGUMENTS`

Parse them as follows:
- **`all`** → process every section listed in `src/data/index.json`, **one at a time, pausing for the user between sections** (never edit all sections in a single pass).
- **`<section>`** → a single section. Match against the slugs in `src/data/index.json` (e.g. `epilepsy`, `stroke`, `neuro-on-call`). If it doesn't match exactly, find the closest and **confirm before proceeding** — do not guess.
- **`<section> "<topic>"`** → narrow to the subsection/topic (match against the section's `toc` entries / heading text).
- **`--focus=formatting|readability|facts|content`** → run only that one lens. Default (no flag) runs all four.

If arguments are empty or ambiguous, **stop and ask** what to target.

## The four review lenses

1. **Formatting** — valid, consistent HTML matching the patterns already used in this file and `.doc-content` (semantic `h2/h3/h4`, `p`, `ul/ol`, tables wrapped in `.table-wrap`). Repair broken markup; do not invent a new visual style.
2. **Readability** — clearer wording, shorter sentences, parallel structure, sensible ordering — **without changing clinical meaning**.
3. **Factual accuracy** — flag and correct errors in criteria, mechanisms, classifications, names, numbers.
4. **Content gaps** — identify clinically important material that is missing or thin.

## Tiered delivery — THIS IS THE CORE SAFETY RULE

Split everything you find into two tiers.

### SAFE — apply directly to the working tree
- HTML/markup repair (unclosed tags, broken tables/lists, malformed entities)
- Heading-hierarchy, table, and list **consistency** with the existing file conventions
- Typos, spelling, punctuation, capitalization
- Readability rewrites that **demonstrably preserve clinical meaning** (splitting run-ons, tightening, parallelism)

### NEEDS REVIEW — do NOT edit the content; write to the report only
- **Any** factual correction (criteria, mechanism, classification, etc.)
- **Any** new clinical content / gap-filling
- **Always** proposed, never silently changed: drug names, **dosing**, thresholds/cutoffs, contraindications, age cutoffs, red-flag criteria
- Any readability rewrite where the meaning could plausibly shift → demote it from SAFE to a proposal

When unsure which tier something belongs in, it goes in **NEEDS REVIEW**.

## Sourcing rules (anti-hallucination)

- **Never invent an uncited clinical fact.**
- **Primary source = the user's own material**: the section's existing content, the matching `.docx` in `C:/Users/dylan/Child Neuro Handbook Word/`, and any reference the user passes at runtime. (To check the original Word source, you may extract its text with a one-off `mammoth` script — the dep is installed — but treat extraction as optional, not required for formatting/readability work.)
- **Model / general knowledge may only appear as a PROPOSAL**, with a verifiable citation (clinical guideline, standard textbook, or PMID) and the tag **NEEDS VERIFICATION**. It must never be applied as a SAFE edit.
- If the section's source material is missing, say so and limit work to formatting/readability + gap proposals explicitly flagged as unverifiable.

## Workflow (per target)

1. **Resolve & load** the target → read `src/data/<slug>.json`; locate matching source material and any runtime reference.
2. **Review** through the requested lenses.
3. **Apply SAFE edits** to `src/data/<slug>.json`. If you add/change/remove a heading, keep `toc`, `tocCount`, and the matching entry in `src/data/index.json` and `public/search.json` / `src/data/search.json` consistent.
4. **Write PROPOSALS** to `docs/goal-reports/<target>-YYYY-MM-DD.md` (template below). Create the file; append if it already exists for today.
5. **Validate** — confirm the JSON still parses, the embedded HTML is well-formed (balanced tags), and `npm run build` passes. Report any failure instead of claiming success.
6. **Do NOT commit.** Print a short summary pointing to the `git diff` (safe edits) and the report (proposals). The user reviews and commits.

For `all` mode, complete steps 1–6 for one section, then **stop and wait** for the user before the next.

## Report template

Write to `docs/goal-reports/<target>-YYYY-MM-DD.md`:

```
# /goal report — <target> — YYYY-MM-DD

## Applied (safe) — <N> edits
- <lens>: <short description> — <location>
- ...
(or "none")

## Proposals — needs your review
### Proposal 1 — NEEDS VERIFICATION — <risk: factual | new content | dosing/threshold>
- Location: <section > subsection / TOC anchor>
- Current:  "<quote, or 'none — net-new content'>"
- Proposed: "<text>"
- Why:      <rationale>
- Source:   <guideline / textbook / PMID, or 'model knowledge — UNVERIFIED'>

### Proposal 2 — ...
(or "none")
```

## Hard rules

- Never auto-commit and never push.
- Never silently change a drug name, dose, threshold, or contraindication.
- Preserve clinical meaning in every SAFE edit; if in doubt, propose instead.
- Always run the validation gate before reporting done; report failures honestly.
- Touch only the targeted section's data + its index/search entries + the report. Do not modify unrelated sections or the on-call/call-schedule generated pipeline.
