# Handoff — Child Neuro Handbook

Last updated: 2026-09-04. Covers work since the last handoff (there wasn't
one) through commit `2f2f34a`. Written for whoever picks this project up next
— a co-maintainer, a future chief resident, or future-you in six months.

## What this project is

A Next.js 14 site serving the UofL child neurology residency's reference
handbook (20 clinical sections, static content) plus a handful of interactive
tools: five dosing/risk calculators, a board-review quiz bank, a password-gated
file-sharing area (`/resources`), and — newest — a team points leaderboard
(`/family-points`). Deployed on Vercel, auto-deploys on push to `main`.
Full architecture and conventions are in `CLAUDE.md` — read that first for
anything not covered here.

## Family Points — new this cycle

Replaces a SharePoint spreadsheet the residency used to track a team-based
points competition (procedures, wellness activities, teaching, scholarship).
Live at `/family-points`, gated behind the same daily-question quiz as the
homepage. Entry (adding points) requires the shared resources password; viewing
is open. **It's in active use** — residents added entries on Sep 3.

**Current standings** (as of this writing): Stroke of Genius 100 pts (+25
pending), Nucleotide Ninjas 40, The Narcos 35, Connectome Crew 0, Highly
Functional 0.

**How it works**
- Roster, teams, and the 18-task point catalog live in
  `lib/family-points/config.ts` — the single source of truth. Adding a new
  loggable activity is a one-line edit there; it propagates to the entry
  panel, validation, breakdowns, and CSV export automatically. See the code
  comments in that file for the two gotchas (a parity test pins `TASKS.length`
  to 18 on purpose, and point-value changes are retroactive since only
  `taskId` + `count` are stored, not points).
- Entries are stored as a flat JSON log in Vercel Blob
  (`lib/family-points/store.ts`), not a database. Standings are computed at
  read time in `lib/family-points/calculator.ts`.
- **Points logged against a future month are held as "pending"** — excluded
  from totals and the monthly table, shown as `+N pending` next to the team's
  score, and converted automatically once the month arrives. This exists
  because someone had already logged a November conference in September,
  which was quietly inflating that team's lead.
- Residents are grouped by PGY year on the page ("Points by resident"),
  not ranked individually — deliberate, to avoid a flat 17-person public
  ranking in a wellness competition.
- `scripts/import-family-points.mjs` syncs the log from a CSV export of the
  team's tracker spreadsheet, for whenever someone hands you an updated sheet
  instead of using the web UI directly. Defaults to a dry run; reads the
  roster/tasks from `config.ts` so it can't drift; refuses to guess when a
  cell looks like a miskeyed point total instead of a count. Usage is in the
  file's header comment.

**A bug worth knowing about, now fixed but instructive**: the Blob store's
content URL is stable across overwrites and sits behind a CDN cache. An
earlier fix used the blob's `uploadedAt` as a cache-busting version stamp —
that doesn't work, because `uploadedAt` doesn't reliably change on overwrite,
so reads stayed pinned to a stale copy. This once caused a delete to read a
pre-write copy of the list and wipe out 11 entries that had just been added
(caught and recovered same session — see commit `27a6af9`). Current fix uses a
per-request random cache-bust token, which is correct. **If you ever touch
`readEntries`/`readMetadata` in either `family-points/store.ts` or
`resources/metadata.ts`, do not "simplify" the cache-busting** — it looks
redundant with `cache: 'no-store'` but isn't; that only bypasses Next's cache,
not the CDN's.

**Known gaps / next steps**
- No trend-over-time chart yet (discussed, deliberately deferred — two months
  of data isn't enough to make one meaningful; December is a reasonable
  target).
- `RESOURCES_PASSWORD` in Vercel gates both `/resources` uploads and Family
  Points entry. It's a low-stakes shared password by design (user's call), but
  worth knowing it's a single shared secret across two features.
- The five team icons (`components/family-points/TeamIcon.tsx`) went through
  a long design iteration — see
  `~/.claude/…/memory/family-points-icon-direction.md` for the
  house style if any of them ever need revisiting (pun-first, standalone, no
  borrowed sports-logo conventions).

## Epilepsy: Neonatal Acute Symptomatic Seizures in HIE — new this cycle,
## incomplete

New subsection added to `/epilepsy` (commit `8c273bb`) covering seizure
timing/burden, a hand-built inline SVG figure, a burden-threshold table,
treatment, rewarming monitoring, and weaning. Content was transcribed
verbatim from a spec the user provided, including numbers already corrected
once from an earlier version (two mis-cited studies, one overstated finding —
see that commit message for detail).

**This is not fully done.** Of 17 references, only 2 are complete —
Alharbi (PMID 36990719) and Chalak (PMID 34882200), both verified against
PubMed. **The other 15 currently render as "[full citation pending]"** in the
live handbook. This is visible to residents reading the section right now.

To finish it: get the user's numbered master reference list (their spec
implied one — Alharbi was numbered 11 and Chalak 16 in it, vs. 4 and 9 in what
shipped, so local numbering will need to be reconciled to match). Then fill in
the 15 placeholders and renumber the inline `<sup>` markers to match. Also
still unattributed: the source for the "presence of seizures alone, not
associated (p=0.126)" row in the threshold table — the spec didn't name one.

Separately: this content lives only in `src/data/epilepsy.json`. Per
`CLAUDE.md`, `scripts/extract.mjs` would overwrite it if ever re-run against
the source .docx (that pipeline is currently broken anyway — Windows path that
doesn't exist on this Mac — so no urgency, but don't forget it's hand-authored
JSON, not derived from a source document like the rest of the section).

## Everything else, briefly

- **Status epilepticus content** had an accuracy audit this cycle: retired IM
  midazolam and IV diazepam, unified benzo redose interval, fixed a PMID, and
  produced a `/goal` accuracy report
  (`docs/goal-reports/epilepsy-status-epilepticus-pathway-2026-07-19.md`).
  These were clinician-reviewed factual changes, not drive-by edits — see
  memory file `institutional-benzo-conventions.md` for why (settled decision,
  don't re-raise it).
- **Call schedule** continues to auto-rebuild from XLSX/email via the existing
  GitHub Action — no changes needed there, just noting it's still the source
  of most "automated" commits in the log.
- Working tree is clean; nothing uncommitted as of this writing.

## If you're picking this up cold

1. Read `CLAUDE.md` in full — especially "Working on clinical content" before
   touching any dose, threshold, or drug name.
2. Check `docs/goal-reports/` for pending clinician decisions before assuming
   a number is settled.
3. Run `npm run test:run` and `npm run build` before and after any change —
   288 tests as of this commit, all passing.
4. If something about Family Points' Blob storage seems flaky, read the cache
   note above before "fixing" it again.
