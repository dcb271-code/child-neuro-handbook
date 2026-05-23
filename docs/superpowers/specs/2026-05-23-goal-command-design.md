# `/goal` command — design spec

**Date:** 2026-05-23
**Status:** Approved (design)
**Deliverable:** A Claude Code custom slash command, `.claude/commands/goal.md`, that reviews and improves the child-neurology handbook's content across four lenses, with safety guardrails appropriate to clinical material.

## Purpose

Provide one repeatable command to improve handbook content: fix **formatting**, improve **readability**, **error-check/correct** facts, and **add important content** — while never silently changing clinical meaning or inventing uncited clinical facts.

## Invocation & target (flexible)

| Form | Meaning |
|------|---------|
| `/goal <section>` | One section, e.g. `/goal epilepsy` → `src/data/epilepsy.json` |
| `/goal <section> "<topic>"` | One subsection/topic, e.g. `/goal epilepsy "infantile spasms"` |
| `/goal all` | Every section, processed **one at a time with a checkpoint between each** |
| `/goal <section> --focus=formatting\|readability\|facts\|content` | Run only one lens (optional; default = all four) |

- Section names match the 20 slugs in `src/data/index.json`. If the target is ambiguous or unknown, **stop and ask** rather than guess.
- `all` mode never edits all sections in a single pass; it completes one section (apply safe edits + write report), reports, and pauses for the user before the next.

## Workflow (per target)

1. **Resolve & load** — parse the target; load the section JSON (`html`, `toc`, counts); locate matching source material in `C:/Users/dylan/Child Neuro Handbook Word/` and any reference passed at runtime.
2. **Review through four lenses** — formatting, readability, factual accuracy, content gaps.
3. **Apply SAFE edits in place** (working tree only) — see classification below. Keep the section's `toc`, `tocCount`, and `index.json`/`search.json` consistent with any structural change.
4. **Write PROPOSALS** (no content change) for everything in the "needs review" tier → dated report `docs/goal-reports/<target>-YYYY-MM-DD.md`.
5. **Validate** — section JSON parses; embedded HTML is well-formed; `npm run build` passes. **Never auto-commit**; the user reviews the diff + report and commits.

## Tiered delivery

**SAFE — applied directly to the working tree:**
- HTML/markup repair (unclosed tags, broken tables/lists, malformed entities)
- Heading hierarchy, table, and list **consistency** with existing `.doc-content` conventions
- Typos, spelling, punctuation, capitalization
- Readability edits **that demonstrably preserve clinical meaning** (splitting run-ons, tightening wording, parallel structure)

**NEEDS REVIEW — proposed only, written to the report, never auto-applied:**
- Any factual correction (diagnostic criteria, mechanisms, classifications)
- New clinical content / gap-filling
- **Always** proposed, never silently changed: drug names, dosing, thresholds/cutoffs, contraindications, age cutoffs, red-flag criteria
- Any readability rewrite where meaning could plausibly shift

## Sourcing & safety rules (baked into the prompt)

- **Never invent an uncited clinical fact.**
- Primary source = the user's own material (`Child Neuro Handbook Word/` docs + runtime-provided references).
- Model/general knowledge may only appear as a **proposal**, with a verifiable citation (guideline / textbook / PMID) and the tag **NEEDS VERIFICATION**.
- If a readability edit could change clinical meaning, it becomes a proposal, not a silent edit.
- If source material for the target is missing, say so and limit work to non-factual lenses (formatting/readability) plus gap proposals flagged as unverifiable.
- Content-gap suggestions are **always** proposal-only (report), so the `content` lens is safe to run by default.

## Report format

`docs/goal-reports/<target>-YYYY-MM-DD.md`:

```
# /goal report — <target> — YYYY-MM-DD

## Applied (safe) — N edits
- <lens>: <short description> [location]
- ...

## Proposals — needs your review
### Proposal 1 — NEEDS VERIFICATION — <risk: factual | new content | dosing>
- Location: <section > subsection / TOC anchor>
- Current:  "<quote or 'none'>"
- Proposed: "<text>"
- Why:      <rationale>
- Source:   <guideline / textbook / PMID, or 'model knowledge — unverified'>

### Proposal 2 — ...
```

## File layout

- Command: `.claude/commands/goal.md` (new; no custom commands exist yet)
- Reports: `docs/goal-reports/` (new directory)

## Non-goals (YAGNI)

- No auto-commit or auto-PR.
- No parallel multi-section subagents in v1 (`all` is sequential with checkpoints); can graduate later if sweeps feel slow.
- No new build tooling; reuse existing `npm run build` and existing data-sync scripts.
- Does not modify on-call/call-schedule generated artifacts (those have their own pipeline).

## Risks & mitigations

- **Hallucinated clinical facts** → sourcing rules + tiered "proposals only" for all factual/new content.
- **Silent meaning drift in readability edits** → meaning-changing rewrites demoted to proposals.
- **Broken rendering from HTML edits in JSON** → validation gate (JSON parse + HTML well-formedness + `npm run build`).
- **TOC/index drift** → keep `toc`/counts and `index.json`/`search.json` in sync on structural edits.
