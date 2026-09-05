// RITE practice-exam scoring and per-PGY passing benchmarks.
//
// The programme set passing marks against a 40-item exam: 24 correct for PGY3,
// 27 for PGY4, 30 for PGY5. Exams here carry 42-44 answerable questions
// (24 items across the set have a second part), so the marks are held as the
// equivalent percentages and applied to whatever an exam's real length is.
// At n = 40 they reproduce 24 / 27 / 30 exactly.

export const PASS_PCT: Record<number, number> = {
  3: 0.6,    // 24 / 40
  4: 0.675,  // 27 / 40
  5: 0.75,   // 30 / 40
};

/** Training years with a published benchmark, ascending. */
export const BENCHMARK_PGYS = [3, 4, 5];

/**
 * Correct answers needed for the given PGY to pass an exam of `total`
 * questions. Rounds to nearest so a 43-question exam is not made harder than
 * the 40-question benchmark implies.
 */
export function passMark(total: number, pgy: number): number | null {
  const pct = PASS_PCT[pgy];
  if (pct === undefined || total <= 0) return null;
  return Math.round(pct * total);
}

export type RiteResult = {
  total: number;
  correct: number;
  pct: number; // 0–100, rounded
  /** Null when the resident's PGY has no published benchmark (PGY1–2). */
  passMark: number | null;
  passed: boolean | null;
};

export function scoreExam(
  answers: (string | null)[],
  correctLetters: string[],
  pgy: number | null,
): RiteResult {
  const total = correctLetters.length;
  let correct = 0;
  for (let i = 0; i < total; i++) {
    if (answers[i] !== null && answers[i] === correctLetters[i]) correct += 1;
  }
  const mark = pgy === null ? null : passMark(total, pgy);
  return {
    total,
    correct,
    pct: total > 0 ? Math.round((correct / total) * 100) : 0,
    passMark: mark,
    passed: mark === null ? null : correct >= mark,
  };
}
