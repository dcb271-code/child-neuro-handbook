# /goal reports

Per-run output from the `/goal` command (`.claude/commands/goal.md`).

Each run writes `docs/goal-reports/<target>-YYYY-MM-DD.md` containing:

- **Applied (safe)** — low-risk edits already made to the working tree (formatting, readability, HTML fixes, typos). Review them in `git diff`.
- **Proposals — needs your review** — factual corrections and new clinical content that were **not** applied. Each carries a location, current → proposed text, rationale, and a citation. Apply the ones you verify; the rest are a record of what was considered.

These reports are review artifacts — keep, prune, or commit them as you like.
