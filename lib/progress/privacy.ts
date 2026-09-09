// Who is allowed to see whose scores.
//
// The progress board used to be sent to every browser with real names attached,
// which made any UI-level hiding cosmetic — the raw JSON was one URL away. So
// redaction happens on the server, before the board is serialised: a resident
// receives their own row by name and everyone else's as a cohort pseudonym.
//
// Honest limits, worth knowing before relying on this:
//
//   - Identity is still a picked name, not a login. A determined resident can
//     claim to be someone else and see that one person's row. What this stops
//     is reading the whole roster's scores at once, which is what "switch name
//     and look" used to give.
//   - Cohorts are 3-4 people. If one PGY4 has attempts and the others don't,
//     the pseudonym is guessable from context. Pseudonymity here reduces casual
//     browsing; it is not anonymity.
//   - The roster itself (names and years) already ships in the client bundle.
//     What is protected is the mapping from person to score, not who exists.

import { pgyLabel, TEST_MEMBERS } from '@/lib/roster';
import type { ProgressBoard, QuizProgress } from './calculator';
import { findCredential, type IdentityRecords } from './identityLimits';

/** Bumping this reshuffles every pseudonym; keep it stable. */
const PSEUDONYM_SALT = 'neuro-progress-v1';

const TEST_NAMES = new Set(TEST_MEMBERS.map((m) => m.name));

/** FNV-1a — small, dependency-free, and identical across Node and browsers. */
function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** A, B, ... Z, AA, AB — only the first few ever get used at this scale. */
export function pseudonymLetter(index: number): string {
  let out = '';
  let i = index + 1;
  while (i > 0) {
    out = String.fromCharCode(65 + ((i - 1) % 26)) + out;
    i = Math.floor((i - 1) / 26);
  }
  return out;
}

/**
 * Stable pseudonym per resident within their cohort, e.g. "PGY3 · B".
 *
 * Ordered by salted hash rather than alphabetically on purpose — with three
 * people in a year, "the first one is A" would hand back the mapping to anyone
 * who knows the roster, and the roster is in the bundle.
 */
export function assignPseudonyms(names: string[], pgy: number): Map<string, string> {
  const ordered = [...names].sort((a, b) => {
    const d = hash32(PSEUDONYM_SALT + a) - hash32(PSEUDONYM_SALT + b);
    return d !== 0 ? d : a.localeCompare(b);
  });
  const map = new Map<string, string>();
  ordered.forEach((name, i) => map.set(name, `${pgyLabel(pgy)} · ${pseudonymLetter(i)}`));
  return map;
}

function pct(correct: number, completed: number): number {
  return completed > 0 ? Math.round((correct / completed) * 100) : 0;
}

function redactQuiz(
  quiz: QuizProgress,
  viewer: string | null,
  chosen: Map<string, string>,
): QuizProgress {
  const pgys = quiz.pgys
    // Test accounts are an admin tool; residents have no reason to see them.
    .filter((g) => !g.members.every((m) => TEST_NAMES.has(m.name)))
    .map((g) => {
      const real = g.members.filter((m) => !TEST_NAMES.has(m.name));
      const generated = assignPseudonyms(real.map((m) => m.name), g.pgy);
      const members = real.map((m) =>
        m.name === viewer
          ? { ...m, isViewer: true }
          // A resident's own chosen pseudonym wins over the generated letter.
          : { ...m, name: chosen.get(m.name) ?? generated.get(m.name) ?? pgyLabel(g.pgy), isViewer: false },
      );
      // Recompute from the rows that survived, so a dropped test account
      // cannot leave its attempts behind in the cohort total.
      const completed = members.reduce((s, m) => s + m.completed, 0);
      const correct = members.reduce((s, m) => s + m.correct, 0);
      return { ...g, members, completed, correct, pct: pct(correct, completed) };
    });

  // Same at the quiz level: the headline "43 answered" a resident sees must
  // describe the rows they can actually see, not include hidden test runs.
  const completed = pgys.reduce((s, g) => s + g.completed, 0);
  const correct = pgys.reduce((s, g) => s + g.correct, 0);
  return { ...quiz, pgys, completed, correct, pct: pct(correct, completed) };
}

/**
 * Strip other residents' names from a board.
 *
 * `isAdmin` returns it untouched — that is the only path that sees the real
 * mapping, and it is gated on a password (see adminAuth.ts), not on which name
 * is selected in the picker.
 */
export function redactBoard(
  board: ProgressBoard,
  viewer: string | null,
  isAdmin: boolean,
  /** name -> resident-chosen pseudonym, replacing the generated letter. */
  chosen: Map<string, string> = new Map(),
): ProgressBoard {
  if (isAdmin) return board;
  const out = {} as ProgressBoard;
  for (const [quizId, quiz] of Object.entries(board)) {
    out[quizId as keyof ProgressBoard] = redactQuiz(quiz, viewer, chosen);
  }
  return out;
}

/**
 * Which resident's rows a request may see unredacted.
 *
 * This is the rule that gives an opt-in password its teeth. `claimed` is the
 * `?as=` parameter — a *claim*, since identity is a name picked from a
 * dropdown. A claim is honoured only for a name nobody has protected; once a
 * resident sets a password, only their verified cookie resolves to them.
 */
export function resolveViewer(
  records: IdentityRecords,
  claimed: string | null,
  verified: string | null,
): string | null {
  if (verified) return verified;
  if (!claimed) return null;
  return findCredential(records, claimed)?.hash ? null : claimed;
}
