import { describe, it, expect } from 'vitest';
import {
  validateNewAttempt,
  computeProgress,
  MAX_ATTEMPT_BATCH,
  type Attempt,
} from '../calculator';
import { MEMBERS } from '@/lib/roster';

function attempt(partial: Partial<Attempt>): Attempt {
  return {
    id: 'pa_test',
    member: 'Cambri Fox',
    quiz: 'daily',
    questionId: '1',
    correct: true,
    createdAt: 0,
    ...partial,
  };
}

describe('validateNewAttempt', () => {
  it('accepts a valid attempt', () => {
    expect(validateNewAttempt({ member: 'Cambri Fox', quiz: 'daily', questionId: '1', correct: true })).toBeNull();
  });

  it('rejects unknown member and quiz', () => {
    expect(validateNewAttempt({ member: 'Nobody', quiz: 'daily', questionId: '1', correct: true })).toMatch(/member/);
    expect(validateNewAttempt({ member: 'Cambri Fox', quiz: 'trivia-night', questionId: '1', correct: true })).toMatch(/quiz/);
  });

  it('rejects a missing or oversized questionId', () => {
    expect(validateNewAttempt({ member: 'Cambri Fox', quiz: 'daily', questionId: '', correct: true })).toMatch(/questionId/);
    expect(validateNewAttempt({ member: 'Cambri Fox', quiz: 'daily', questionId: 'x'.repeat(65), correct: true })).toMatch(/questionId/);
  });

  it('rejects a non-boolean correct', () => {
    expect(validateNewAttempt({ member: 'Cambri Fox', quiz: 'daily', questionId: '1', correct: 'yes' })).toMatch(/correct/);
  });

  it('rejects non-objects', () => {
    expect(validateNewAttempt(null)).not.toBeNull();
    expect(validateNewAttempt('daily')).not.toBeNull();
  });
});

describe('computeProgress', () => {
  it('returns both quizzes at zero, with every resident listed, for an empty log', () => {
    const board = computeProgress([]);
    expect(board.daily.completed).toBe(0);
    expect(board.daily.pct).toBe(0); // not NaN
    expect(board['board-review'].completed).toBe(0);

    const totalListed = board.daily.pgys.reduce((s, g) => s + g.members.length, 0);
    expect(totalListed).toBe(MEMBERS.length);
  });

  it('credits an attempt to the right quiz, cohort, and member', () => {
    const board = computeProgress([attempt({ member: 'Cambri Fox', quiz: 'daily', correct: true })]);
    expect(board.daily.completed).toBe(1);
    expect(board.daily.correct).toBe(1);
    expect(board.daily.pct).toBe(100);
    expect(board['board-review'].completed).toBe(0); // other quiz untouched

    const cambri = MEMBERS.find((m) => m.name === 'Cambri Fox')!;
    const cohort = board.daily.pgys.find((g) => g.pgy === cambri.pgy)!;
    expect(cohort.completed).toBe(1);
    const ms = cohort.members.find((m) => m.name === 'Cambri Fox')!;
    expect(ms).toEqual({ name: 'Cambri Fox', pgy: cambri.pgy, completed: 1, correct: 1, pct: 100 });
  });

  it('computes accuracy across multiple attempts, rounded', () => {
    const board = computeProgress([
      attempt({ id: 'a', correct: true }),
      attempt({ id: 'b', correct: true }),
      attempt({ id: 'c', correct: false }),
    ]);
    // 2/3 = 66.67 -> rounds to 67
    expect(board.daily.pct).toBe(67);
    expect(board.daily.completed).toBe(3);
    expect(board.daily.correct).toBe(2);
  });

  it('keeps quizzes independent', () => {
    const board = computeProgress([
      attempt({ id: 'a', quiz: 'daily', correct: true }),
      attempt({ id: 'b', quiz: 'board-review', correct: false }),
    ]);
    expect(board.daily.completed).toBe(1);
    expect(board.daily.pct).toBe(100);
    expect(board['board-review'].completed).toBe(1);
    expect(board['board-review'].pct).toBe(0);
  });

  it('sorts cohort members by completed count, ties broken by name', () => {
    const cambri = MEMBERS.find((m) => m.name === 'Cambri Fox')!; // PGY2
    const other = MEMBERS.find((m) => m.pgy === cambri.pgy && m.name !== 'Cambri Fox')!;
    const board = computeProgress([
      attempt({ id: 'a', member: other.name, correct: true }),
      attempt({ id: 'b', member: other.name, correct: true }),
      attempt({ id: 'c', member: cambri.name, correct: true }),
    ]);
    const cohort = board.daily.pgys.find((g) => g.pgy === cambri.pgy)!;
    expect(cohort.members[0].name).toBe(other.name); // 2 attempts beats 1
  });

  it('skips attempts referencing a removed member or unknown quiz instead of crashing', () => {
    const board = computeProgress([
      { id: 'x', member: 'Graduated Resident', quiz: 'daily', questionId: '1', correct: true, createdAt: 0 },
      attempt({ id: 'ok', correct: true }),
    ]);
    expect(board.daily.completed).toBe(1);
  });

  it('never divides by zero for an empty cohort or member', () => {
    const board = computeProgress([]);
    for (const quiz of [board.daily, board['board-review']]) {
      expect(Number.isFinite(quiz.pct)).toBe(true);
      for (const g of quiz.pgys) {
        expect(Number.isFinite(g.pct)).toBe(true);
        for (const m of g.members) expect(Number.isFinite(m.pct)).toBe(true);
      }
    }
  });
});

describe('MAX_ATTEMPT_BATCH', () => {
  it('matches the board-review session cap (largest session size)', () => {
    expect(MAX_ATTEMPT_BATCH).toBeGreaterThanOrEqual(50);
  });
});
