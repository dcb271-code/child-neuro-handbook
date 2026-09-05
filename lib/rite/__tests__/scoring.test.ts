import { describe, it, expect } from 'vitest';
import { passMark, scoreExam, PASS_PCT, BENCHMARK_PGYS } from '../scoring';
import riteData from '@/src/data/rite-exams.json';
import type { RiteData } from '../types';

const data = riteData as RiteData;

describe('passMark', () => {
  it('reproduces the published 40-item marks exactly', () => {
    // The programme's stated benchmarks: 24 / 27 / 30 correct out of 40.
    expect(passMark(40, 3)).toBe(24);
    expect(passMark(40, 4)).toBe(27);
    expect(passMark(40, 5)).toBe(30);
  });

  it('scales to the real exam lengths', () => {
    expect(passMark(43, 3)).toBe(26); // 60% of 43 = 25.8
    expect(passMark(43, 5)).toBe(32); // 75% of 43 = 32.25
    expect(passMark(44, 4)).toBe(30); // 67.5% of 44 = 29.7
  });

  it('returns null for training years without a benchmark', () => {
    expect(passMark(40, 1)).toBeNull();
    expect(passMark(40, 2)).toBeNull();
    expect(passMark(40, 6)).toBeNull();
  });

  it('returns null for a zero-length exam rather than dividing by nothing', () => {
    expect(passMark(0, 3)).toBeNull();
  });

  it('keeps the benchmarks ordered by seniority', () => {
    for (const n of [40, 42, 43, 44]) {
      const marks = BENCHMARK_PGYS.map((p) => passMark(n, p)!);
      expect(marks[0]).toBeLessThan(marks[1]);
      expect(marks[1]).toBeLessThan(marks[2]);
      expect(marks[2]).toBeLessThanOrEqual(n);
    }
  });
});

describe('scoreExam', () => {
  const correct = ['A', 'B', 'C', 'D'];

  it('counts only exact matches', () => {
    const r = scoreExam(['A', 'B', 'X', null], correct, null);
    expect(r.correct).toBe(2);
    expect(r.total).toBe(4);
    expect(r.pct).toBe(50);
  });

  it('treats unanswered questions as wrong, not as skipped', () => {
    const r = scoreExam([null, null, null, null], correct, null);
    expect(r.correct).toBe(0);
    expect(r.pct).toBe(0);
  });

  it('reports pass/fail against the resident PGY benchmark', () => {
    const answers = ['A', 'B', 'C', 'X']; // 3/4 = 75%
    expect(scoreExam(answers, correct, 5).passed).toBe(true);  // needs 3
    expect(scoreExam(['A', 'B', 'X', 'X'], correct, 5).passed).toBe(false); // 2 < 3
  });

  it('leaves pass/fail null when the PGY has no benchmark', () => {
    const r = scoreExam(['A', 'B', 'C', 'D'], correct, 1);
    expect(r.passed).toBeNull();
    expect(r.passMark).toBeNull();
    expect(r.correct).toBe(4); // still scored
  });

  it('handles an unidentified resident', () => {
    const r = scoreExam(['A', 'B', 'C', 'D'], correct, null);
    expect(r.passed).toBeNull();
    expect(r.pct).toBe(100);
  });
});

describe('rite-exams.json integrity', () => {
  it('has 10 exams of exactly 40 numbered items', () => {
    expect(data.exams).toHaveLength(10);
    for (const e of data.exams) {
      const items = new Set(e.questions.map((q) => q.num));
      expect(items.size).toBe(40);
    }
  });

  it('has 424 answerable questions in total', () => {
    expect(data.exams.reduce((s, e) => s + e.questions.length, 0)).toBe(424);
  });

  it('gives every question a stem, options, and a valid answer', () => {
    for (const e of data.exams) {
      for (const q of e.questions) {
        expect(q.stem.length).toBeGreaterThan(0);
        expect(q.options.length).toBeGreaterThanOrEqual(3);
        expect(q.options.map((o) => o.letter)).toContain(q.answer);
        expect(q.explanation.length).toBeGreaterThan(0);
      }
    }
  });

  it('uses unique question ids', () => {
    const ids = data.exams.flatMap((e) => e.questions.map((q) => q.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every sub-part its parent context so it reads standalone', () => {
    const subs = data.exams.flatMap((e) => e.questions.filter((q) => q.part !== 'a'));
    expect(subs.length).toBeGreaterThan(0);
    for (const q of subs) expect(q.context).toBeTruthy();
  });

  it('points every image at a rooted /rite/ path', () => {
    for (const e of data.exams) {
      for (const q of e.questions) {
        for (const src of q.images ?? []) expect(src.startsWith('/rite/')).toBe(true);
      }
    }
  });

  it('never lets the correct answer give itself away by length', () => {
    // A correct answer much longer than every distractor is answerable without
    // knowing any neurology. The original extraction had 49 items where the gap
    // exceeded 40 characters; the fix expands distractors rather than gutting
    // the correct answer, so the cap is on the gap, not on answer length.
    const offenders = data.exams.flatMap((e) =>
      e.questions
        .map((q) => {
          const len = (l: string) => q.options.find((o) => o.letter === l)!.text.length;
          const longestWrong = Math.max(
            ...q.options.filter((o) => o.letter !== q.answer).map((o) => o.text.length),
          );
          return { id: q.id, gap: len(q.answer) - longestWrong };
        })
        .filter((x) => x.gap >= 40),
    );
    expect(offenders).toEqual([]);
  });

  it('keeps every exam within the benchmark-able size range', () => {
    for (const e of data.exams) {
      expect(e.questions.length).toBeGreaterThanOrEqual(40);
      expect(passMark(e.questions.length, 3)).toBeGreaterThan(0);
    }
  });
});

describe('PASS_PCT', () => {
  it('matches the stated marks as fractions of 40', () => {
    expect(PASS_PCT[3]).toBeCloseTo(24 / 40);
    expect(PASS_PCT[4]).toBeCloseTo(27 / 40);
    expect(PASS_PCT[5]).toBeCloseTo(30 / 40);
  });
});
