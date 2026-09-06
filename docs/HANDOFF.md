# Handoff — Child Neuro Handbook

Last updated: 2026-09-06, through commit `0b17f4b`. Written for whoever picks
this project up next — a co-maintainer, a future chief resident, or future-you
in six months.

## What this project is

A Next.js 14 site serving the UofL child neurology residency's reference
handbook (20 clinical sections, static content) plus interactive tools: five
dosing/risk calculators, a board-review quiz bank, ten RITE practice exams, a
password-gated file-sharing area (`/resources`), a team points leaderboard
(`/family-points`), and opt-in quiz-progress tracking. Deployed on Vercel,
auto-deploys on push to `main`. Full architecture and conventions are in
`CLAUDE.md` — read that first for anything not covered here.

## Board Review — four things live under one page

`/board-review` now hosts four related features. The page itself stays
`force-static`; anything needing live data fetches it client-side.

**1. The original quiz builder.** Filter the 350-question bank by topic,
module, difficulty; instant feedback per question. Unchanged.

**2. RITE Practice Exams** (`components/rite/`, `src/data/rite-exams.json`).
Ten full-length exams extracted from a supplied .docx — 40 numbered items each,
206 figures, full answer key with explanations. Runs as a timed-style
simulation: answers hidden until the whole exam is submitted, then every item
is shown with its explanation and figure. An in-progress exam takes over the
page, and the component deliberately stays *mounted* (hidden via CSS rather
than unmounted) so a part-finished exam isn't destroyed by that transition.

  The scoring subtlety worth knowing: 24 of the 400 items carry a **second
  part** (e.g. `1.25b`) with its own stem, options, and answer, so exams are
  42–44 answerable questions, not 40. The programme's benchmarks (24 / 27 / 30
  correct for PGY3 / 4 / 5) were set against 40, so they're stored in
  `lib/rite/scoring.ts` as the equivalent percentages — 60% / 67.5% / 75% — and
  applied to each exam's real length. At n=40 they reproduce 24 / 27 / 30
  exactly; a 43-question exam needs 26 / 29 / 32. There are tests pinning that.
  Sub-parts inherit the parent's image and carry its stem as `context`, because
  their own stems say "this patient" and are unanswerable alone.

  **Item quality was audited after the first resident used it**, and the two
  defects found were both systematic rather than one-off. First, the correct
  answer was often far longer than every distractor — the single longest option
  in 62% of items against a ~22% chance rate — making them answerable on format
  alone. The fix expands the distractors to comparable specificity rather than
  trimming the correct answer; clinical detail moved out of an option (drug
  names, thresholds, trial figures) landed in that item's explanation or
  learning points, so nothing was lost from the teaching side. Second, the
  extraction had carried source-deck artifacts into resident-visible text:
  slide citations in alt text, meta-commentary in explanations, and
  cross-references to the deck's own exam numbering, which is not the 1–10 the
  app shows.

  Two invariants in `lib/rite/__tests__/scoring.test.ts` now pin this: no
  correct answer may exceed its longest distractor by 20 characters, and no
  letter may hold 35% or more of the answers. The second exists because a batch
  rewrite once left all 63 edited answers on option A — a worse cue than the one
  being fixed. If you rewrite options in bulk, reshuffle and re-check both.

  Figures live in `public/rite/` (20 MB, 206 JPEGs, content-hash filenames).
  Don't "optimise" them — they're already optimally compressed (re-encoding at
  q82 made them *larger*) and they're diagnostic radiology/histology where the
  detail carries the answer.

**3. Pediatrics In-Service Practice Quizzes** (`src/data/peds-quizzes.json`).
Four 50-question quizzes for the PGY1–2 pediatrics years, sitting in a second
collapsed disclosure below RITE. Each is mixed 30% neurology / 20%
genetics-metabolism / 50% general pediatrics — that ratio is pinned by a test,
since it's the whole point of the set.

  **Every one of the 200 items was read against its stem, distractors and
  explanation** after import: all 200 answer keys are correct and the
  transcription is verbatim against the source. Three items carried 2004-era
  guidance the source had not annotated, and now carry a flag — the UTI
  catheter colony count (AAP now wants 50,000 CFU/mL), thrombophilia testing
  after perinatal stroke, and crystalloid volume in pediatric trauma. The
  flags live in the markdown source so regeneration reproduces them, and a
  test in `lib/peds-quiz/__tests__/` fails if they go missing. Keys were not
  changed — the flags annotate, they never re-key.

  Two things to know. They carry **no passing mark**: the RITE benchmarks belong
  to a different exam and none is published for these, so the runner shows a
  score and says so explicitly rather than inventing one. And the source is
  **Nelson 17th ed., which is from 2004** — the supplied explanations carry
  current-practice notes where the original answer key has since been
  superseded. Those notes are what make a 20-year-old bank safe to study from,
  so don't edit them out.

  RITE and pediatrics share one runner (`components/quiz-runner/`), which was
  generalised out of the old `components/rite/` in the same commit. It works
  against `lib/quiz-runner/types.ts` and never imports either concrete data
  type; `lib/quiz-runner/adapters.ts` does the mapping. A third bank is an
  adapter, not a runner change.

**4. My Progress** — see below. Both RITE and My Progress are collapsed
disclosures on the idle screen so they don't compete with starting a quiz.

## Quiz progress tracking

Opt-in and self-identified. A resident picks their name once
(`lib/identity/useIdentity.ts` + `components/identity/WhoAmI.tsx`), stored in
localStorage on that device. **This is not authentication** — anyone can pick
anyone's name, an accepted tradeoff matching how Family Points already works.
The picker appears on the board-review idle screen and in the daily-challenge
header, and never gates either quiz; skipping it just means you aren't tracked.

Four quizzes feed it (`lib/progress/calculator.ts`): the daily question,
board review, RITE, and the pediatrics quizzes. Daily logs exactly one attempt per calendar day — the
first question seen, right or wrong — since a wrong answer cycles to a new
question and retries shouldn't inflate "days completed". Board review and RITE
log every question in a session as a batch on completion. Results are shown
grouped by PGY year rather than as a flat 17-person ranking. All four are now
rendered in the My Progress panel — RITE attempts had been logged but never
displayed until the pediatrics work went in.

Attempts are a flat JSON log in Vercel Blob (`lib/progress/store.ts`).
`POST /api/progress/attempts` has **no password gate**, unlike family-points
entries — it's self-tracking, not competitive scoring.

`/progress` is a redirect to `/board-review/`, kept only for old bookmarks.

**`BrockTest` is a test identity**, not a resident. It lives in `TEST_MEMBERS`
in `lib/roster.ts` rather than `MEMBERS`, so it can be picked for progress
tracking without joining a Family Points team or skewing a PGY cohort — it gets
its own "Test" group, sorted last. Family Points rejects it outright. Add more
test accounts there, never to `MEMBERS`.

**As of this writing: 0 attempts logged.** Nobody has opted in yet. The empty
states are wired and render cleanly, but the feature is unproven in real use.

## Family Points

Replaces a SharePoint spreadsheet tracking a team points competition. Live at
`/family-points`, gated behind the daily-question quiz. Entry requires the
shared resources password; viewing is open. **In active use** — 17 entries.

**Current standings**: Nucleotide Ninjas 115, Stroke of Genius 100 (+25
pending), The Narcos 35, Connectome Crew 0, Highly Functional 0.

- Roster lives in `lib/roster.ts` (shared with progress tracking, re-exported
  from `family-points/config.ts` for compatibility). Teams and the 18-task
  point catalog stay in `lib/family-points/config.ts`. Adding a loggable
  activity is a one-line edit there; it propagates to the entry panel,
  validation, breakdowns, and CSV export. Two gotchas are noted in that file:
  a parity test pins `TASKS.length` to 18 on purpose, and point-value changes
  are retroactive since only `taskId` + `count` are stored.
- **Points logged against a future month are held as "pending"** — excluded
  from totals and the monthly table, shown as `+N pending`, converted
  automatically when the month arrives. This exists because a November
  conference had been logged in September and was inflating a team's lead.
- `scripts/import-family-points.mjs` syncs the log from a CSV export of the
  tracker spreadsheet. Defaults to a dry run; reads roster/tasks from config so
  it can't drift; refuses to guess when a cell looks like a miskeyed point
  total rather than a count. Usage is in the file header.

## The Blob caching bug — read before touching either store

Both `lib/family-points/store.ts` and `lib/progress/store.ts` (and
`lib/resources/metadata.ts`) write to a fixed Blob pathname with
`allowOverwrite`, so the content URL never changes and sits behind a CDN.

An earlier fix used the blob's `uploadedAt` as a cache-busting version stamp.
**That does not work** — `uploadedAt` doesn't reliably change on overwrite, so
reads stayed pinned to a stale copy. This once caused a delete to read a
pre-write copy of the list and wipe out 11 entries that had just been added
(recovered same session; see `27a6af9`).

The current fix uses a **per-request random token** on the read URL. It looks
redundant next to `cache: 'no-store'` but isn't — that only bypasses Next's
cache, not the CDN's. Do not simplify it away.

## Epilepsy: Neonatal Acute Symptomatic Seizures in HIE

New subsection under `/epilepsy` covering seizure timing/burden, a hand-built
inline SVG figure, a burden-threshold table, treatment, rewarming monitoring,
and weaning. Content was transcribed verbatim from a clinician-supplied spec,
including numbers already corrected once from an earlier version.

**All 16 references now carry full citations with PMIDs**, each resolved
against PubMed and matched to the finding it supports (commit `1de68ab`). This
closes the gap where 15 entries shipped reading "[full citation pending]".
Note that Hunt and NEST are the same trial (Hunt RW, *JAMA Netw Open* 2021),
which is why the study count and reference count differ by one.

One item still open: the source for the "presence of seizures alone, not
associated (p=0.126)" row in the threshold table is an em-dash — the spec never
named one.

This content lives only in `src/data/epilepsy.json`. Per `CLAUDE.md`,
`scripts/extract.mjs` would overwrite it if re-run against the source .docx
(that pipeline is broken anyway — Windows path — so no urgency, but don't
forget it's hand-authored JSON, not derived).

## Everything else, briefly

- **Status epilepticus content** had an accuracy audit: retired IM midazolam
  and IV diazepam, unified benzo redose interval, fixed a PMID, and produced a
  `/goal` report in `docs/goal-reports/`. Clinician-reviewed factual changes —
  see memory file `institutional-benzo-conventions.md` for why it's settled.
- **Call schedule** still auto-rebuilds from XLSX/email via the GitHub Action.
  Source of most "automated" commits.
- The Family Points team icons went through a long design iteration; the house
  style is recorded in the `family-points-icon-direction` memory file
  (pun-first, standalone, no borrowed sports-logo conventions).
- `RESOURCES_PASSWORD` in Vercel gates both `/resources` uploads and Family
  Points entry — one shared secret across two features, low-stakes by design.

## If you're picking this up cold

1. Read `CLAUDE.md` in full — especially "Working on clinical content" before
   touching any dose, threshold, or drug name.
2. Check `docs/goal-reports/` for pending clinician decisions before assuming
   a number is settled.
3. Run `npm run test:run` and `npm run build` before and after any change —
   352 tests as of this commit, all passing.
4. After editing any section's HTML, run `npm run build-search` or the
   consistency tests will fail.
5. If Blob storage seems flaky, read the caching section above before "fixing"
   it again.
