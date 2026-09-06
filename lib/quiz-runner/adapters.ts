// Adapters mapping each concrete data set onto the shared runner's shape.
// Keeping these here rather than in the component means adding a third quiz
// set never requires touching `components/quiz-runner/`.

import type { RiteData, RiteQuestion } from '@/lib/rite/types';
import type { PedsQuizData, PedsQuestion } from '@/lib/peds-quiz/types';
import type { RunnerConfig, RunnerQuestion, RunnerSet } from './types';

// ── RITE practice exams ────────────────────────────────────────────────
export const RITE_CONFIG: RunnerConfig = {
  label: 'Practice Exam',
  quizId: 'rite',
  intro:
    'Ten full-length practice exams. Answers are hidden until you finish, then every ' +
    'item is shown with its explanation.',
  benchmarks: true,
};

export function riteSets(data: RiteData): RunnerSet[] {
  return data.exams.map((e) => ({
    number: e.exam,
    questions: e.questions,
    detail: `${e.questions.filter((q) => q.images?.length).length} with images`,
  }));
}

export function riteLocator(q: RunnerQuestion, setNumber: number): string {
  const r = q as RiteQuestion;
  return `Exam ${setNumber} · item ${r.num}${r.part !== 'a' ? r.part : ''}`;
}

// ── Pediatrics in-service quizzes ──────────────────────────────────────
export const PEDS_CONFIG: RunnerConfig = {
  label: 'Quiz',
  quizId: 'peds',
  intro:
    'Four 50-question quizzes for the PGY1-2 pediatrics years — about a third neurology, ' +
    'a fifth genetics and metabolism, the rest general pediatrics. Answers are hidden ' +
    'until you finish.',
  // No published passing mark exists for these, and the RITE benchmarks are for
  // a different exam entirely — so no benchmark is shown rather than a made-up one.
  benchmarks: false,
  source:
    'Source: Nelson Textbook of Pediatrics, 17th ed. self-assessment sets. Answer keys are ' +
    "the source's own; explanations flag where current practice has moved on.",
};

/**
 * Condense the source's per-subtopic tally ("Derm 3, EM 3, Gen 3, ID 11, ...")
 * into the three buckets the mix was designed around. The full breakdown is
 * still in the data as `topicMix`; it is just far too long for a picker card.
 */
export function topicSummary(topicMix: string): string {
  let neuro = 0;
  let genMetab = 0;
  let general = 0;
  for (const part of topicMix.split(',')) {
    const m = /^\s*(\S+)\s+(\d+)\s*$/.exec(part);
    if (!m) continue;
    const [, key, n] = m;
    const count = Number(n);
    if (key.startsWith('N-')) neuro += count;
    else if (key === 'Gen' || key === 'Metab') genMetab += count;
    else general += count;
  }
  return `${neuro} neuro · ${genMetab} genetics/metabolic · ${general} general peds`;
}

export function pedsSets(data: PedsQuizData): RunnerSet[] {
  return data.quizzes.map((z) => ({
    number: z.quiz,
    questions: z.questions,
    detail: topicSummary(z.topicMix),
  }));
}

export function pedsLocator(q: RunnerQuestion, setNumber: number): string {
  return `Quiz ${setNumber} · question ${(q as PedsQuestion).num}`;
}
