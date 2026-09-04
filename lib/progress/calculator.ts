// Pure scoring logic for quiz-progress tracking. No I/O here — the store and
// API wrap this, same split as family-points/calculator.ts.

import { MEMBERS, memberByName } from '@/lib/roster';

export type QuizId = 'daily' | 'board-review';

export const QUIZZES: { id: QuizId; label: string }[] = [
  { id: 'daily', label: 'Daily Question' },
  { id: 'board-review', label: 'Board Review' },
];

export type Attempt = {
  id: string;
  member: string;
  quiz: QuizId;
  /** The source quiz's own question id (numeric for daily, string for board review), stored as text. */
  questionId: string;
  correct: boolean;
  createdAt: number;
};

export type NewAttempt = Pick<Attempt, 'member' | 'quiz' | 'questionId' | 'correct'>;

const QUIZ_IDS = new Set(QUIZZES.map((q) => q.id));

export const MAX_ATTEMPT_BATCH = 50; // a full board-review session tops out at 50 questions

/** Returns an error message, or null if the attempt is valid. */
export function validateNewAttempt(input: unknown): string | null {
  if (typeof input !== 'object' || input === null) return 'attempt must be an object';
  const a = input as Record<string, unknown>;

  if (typeof a.member !== 'string' || !memberByName(a.member)) {
    return `unknown member: ${String(a.member)}`;
  }
  if (typeof a.quiz !== 'string' || !QUIZ_IDS.has(a.quiz as QuizId)) {
    return `unknown quiz: ${String(a.quiz)}`;
  }
  if (typeof a.questionId !== 'string' || a.questionId.length === 0 || a.questionId.length > 64) {
    return 'questionId must be a non-empty string';
  }
  if (typeof a.correct !== 'boolean') {
    return 'correct must be a boolean';
  }
  return null;
}

export type MemberQuizStats = {
  name: string;
  pgy: number;
  completed: number;
  correct: number;
  pct: number; // 0–100, rounded; 0 when completed is 0
};

export type PgyQuizStanding = {
  pgy: number;
  completed: number;
  correct: number;
  pct: number;
  members: MemberQuizStats[]; // every resident in the cohort, sorted by completed desc
};

export type QuizProgress = {
  quiz: QuizId;
  completed: number;
  correct: number;
  pct: number;
  pgys: PgyQuizStanding[];
};

export type ProgressBoard = Record<QuizId, QuizProgress>;

function pct(correct: number, completed: number): number {
  return completed > 0 ? Math.round((correct / completed) * 100) : 0;
}

function emptyQuizProgress(quiz: QuizId): QuizProgress {
  const pgyNums = [...new Set(MEMBERS.map((m) => m.pgy))].sort((a, b) => a - b);
  return {
    quiz,
    completed: 0,
    correct: 0,
    pct: 0,
    pgys: pgyNums.map((pgy) => ({
      pgy,
      completed: 0,
      correct: 0,
      pct: 0,
      members: MEMBERS.filter((m) => m.pgy === pgy).map((m) => ({
        name: m.name,
        pgy: m.pgy,
        completed: 0,
        correct: 0,
        pct: 0,
      })),
    })),
  };
}

export function computeProgress(attempts: Attempt[]): ProgressBoard {
  const board = {
    daily: emptyQuizProgress('daily'),
    'board-review': emptyQuizProgress('board-review'),
  } as ProgressBoard;

  for (const a of attempts) {
    const member = memberByName(a.member);
    const quiz = board[a.quiz];
    if (!member || !quiz) continue; // roster/quiz drift — skip rather than crash

    quiz.completed += 1;
    if (a.correct) quiz.correct += 1;

    const cohort = quiz.pgys.find((g) => g.pgy === member.pgy);
    const ms = cohort?.members.find((m) => m.name === member.name);
    if (cohort && ms) {
      cohort.completed += 1;
      if (a.correct) cohort.correct += 1;
      ms.completed += 1;
      if (a.correct) ms.correct += 1;
    }
  }

  for (const quiz of Object.values(board)) {
    quiz.pct = pct(quiz.correct, quiz.completed);
    for (const cohort of quiz.pgys) {
      cohort.pct = pct(cohort.correct, cohort.completed);
      for (const m of cohort.members) m.pct = pct(m.correct, m.completed);
      cohort.members.sort((a, b) => b.completed - a.completed || a.name.localeCompare(b.name));
    }
  }

  return board;
}
