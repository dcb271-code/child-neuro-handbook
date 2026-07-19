# Archived scripts

One-off migrations that have already run. Kept for reference — **none of these are part
of any current pipeline**, and most cannot run on this machine at all: they read source
`.docx` files from `C:/Users/dylan/Child Neuro Handbook Word/`, a Windows path that does
not exist on the current (macOS) checkout.

Nothing in `package.json`, `.github/workflows/`, or the live scripts references anything
here. Safe to delete outright; git history preserves them either way.

Rough groupings:

- `_*.mjs`, `_*.txt` — the author's own "spent" naming convention. Epilepsy section
  restructuring, image moves and renames, table-header repairs, board-review question
  batches, section body text staged as `.txt`.
- `replace-*.py`, `fix-heading-ids.py` — one-time section replacements and heading-id repair.
- `update-content.mjs`, `update-on-call.mjs` — each applies a specific, already-applied
  set of content edits ("two manual content updates", "three changes to neuro-on-call.json").
- `build-on-call.mjs`, `build-neuroimmunology.mjs` — built one section each from the Word
  source. Superseded by `extract.mjs` / `re-extract-sections.mjs`.
- `add-clinical-content.mjs`, `fix-review-issues.mjs`, `fix-minor-issues.mjs`,
  `inject-epilepsy-images.mjs` — single-pass content fixes.
- `probe.mjs` — a debugging scratch script with a hardcoded path to `Headaches.docx`.

If you need to regenerate a section from Word again, use `npm run extract` (all sections)
or `node scripts/re-extract-sections.mjs <slug>...` (named sections) rather than reviving
anything here.
