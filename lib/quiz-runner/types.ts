// The shape the shared quiz runner (`components/quiz-runner/`) works against.
//
// Two data sets feed it today — the RITE practice exams (`lib/rite/types.ts`)
// and the pediatrics in-service quizzes (`lib/peds-quiz/types.ts`). Both are
// structurally compatible with `RunnerQuestion`; the runner never imports
// either concrete type, so adding a third set means writing an adapter, not
// touching the runner.

export type RunnerOption = {
  letter: string;
  text: string;
};

export type RunnerQuestion = {
  id: string;
  stem: string;
  /** Parent stem for sub-parts whose own stem says "this patient". */
  context?: string;
  options: RunnerOption[];
  answer: string;
  explanation: string;
  images?: string[];
  imageAlt?: string;
  salient?: string;
  learning?: string;
};

/** One selectable sitting — an exam or a quiz. */
export type RunnerSet = {
  /** 1-based number shown in the UI. */
  number: number;
  questions: RunnerQuestion[];
  /** Optional sub-label for the picker card, e.g. a topic breakdown. */
  detail?: string;
};

export type RunnerConfig = {
  /** Singular noun for one sitting, e.g. "Practice Exam" or "Quiz". */
  label: string;
  /** Which quiz the attempts are logged against. */
  quizId: 'rite' | 'peds';
  /** Sentence shown above the picker. */
  intro: string;
  /**
   * Whether to score against the per-PGY RITE benchmarks. False for the
   * pediatrics quizzes, which have no published passing mark — inventing one
   * would be worse than showing none.
   */
  benchmarks: boolean;
  /** Optional provenance line shown under the picker. */
  source?: string;
};
