'use client';

import { useMemo, useState } from 'react';
import type { RiteData, RiteQuestion } from '@/lib/rite/types';
import { scoreExam, passMark, BENCHMARK_PGYS } from '@/lib/rite/scoring';
import { useIdentity } from '@/lib/identity/useIdentity';
import { memberByName } from '@/lib/roster';
import { submitAttempts } from '@/lib/progress/submitAttempts';
import RiteQuestionCard from './RiteQuestionCard';
import RiteResults from './RiteResults';

type Phase = 'list' | 'active' | 'complete';

export default function RiteExamApp({ data, onAttemptsSubmitted, onPhaseChange }: {
  data: RiteData;
  onAttemptsSubmitted?: () => void;
  /** Lets the page hide its own chrome while an exam is in progress. */
  onPhaseChange?: (inExam: boolean) => void;
}) {
  const [phase, setPhase] = useState<Phase>('list');
  const [examNo, setExamNo] = useState<number | null>(null);
  const [questions, setQuestions] = useState<RiteQuestion[]>([]);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [current, setCurrent] = useState(0);

  const { name: identityName } = useIdentity();
  const pgy = identityName ? memberByName(identityName)?.pgy ?? null : null;

  const result = useMemo(
    () => scoreExam(answers, questions.map((q) => q.answer), pgy),
    [answers, questions, pgy],
  );

  function start(exam: number) {
    const found = data.exams.find((e) => e.exam === exam);
    if (!found) return;
    setExamNo(exam);
    setQuestions(found.questions);
    setAnswers(new Array(found.questions.length).fill(null));
    setCurrent(0);
    setPhase('active');
    onPhaseChange?.(true);
    window.scrollTo({ top: 0 });
  }

  function select(letter: string) {
    setAnswers((prev) => {
      const next = prev.slice();
      next[current] = letter;
      return next;
    });
  }

  function next() {
    if (current + 1 >= questions.length) finish();
    else { setCurrent((c) => c + 1); window.scrollTo({ top: 0 }); }
  }

  function finish() {
    if (identityName) {
      submitAttempts(
        questions.map((q, i) => ({
          member: identityName,
          quiz: 'rite' as const,
          questionId: q.id,
          correct: answers[i] === q.answer,
        })),
      );
      if (onAttemptsSubmitted) setTimeout(onAttemptsSubmitted, 1500);
    }
    setPhase('complete');
    window.scrollTo({ top: 0 });
  }

  if (phase === 'active' && examNo !== null) {
    return (
      <RiteQuestionCard
        question={questions[current]}
        index={current}
        total={questions.length}
        selected={answers[current]}
        onSelect={select}
        onPrev={() => { setCurrent((c) => Math.max(0, c - 1)); window.scrollTo({ top: 0 }); }}
        onNext={next}
        isFirst={current === 0}
        isLast={current + 1 === questions.length}
      />
    );
  }

  if (phase === 'complete' && examNo !== null) {
    return (
      <RiteResults
        exam={examNo}
        questions={questions}
        answers={answers}
        result={result}
        pgy={pgy}
        onRetake={() => start(examNo)}
        onBack={() => { setPhase('list'); onPhaseChange?.(false); window.scrollTo({ top: 0 }); }}
      />
    );
  }

  // ── exam picker ──────────────────────────────────────────────────────
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
        Ten full-length practice exams. Answers are hidden until you finish, then every
        item is shown with its explanation.
        {pgy && BENCHMARK_PGYS.includes(pgy)
          ? ` Scored against the PGY${pgy} benchmark.`
          : ' Pick your name above to be scored against your PGY benchmark.'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {data.exams.map((e) => {
          const n = e.questions.length;
          const withImages = e.questions.filter((q) => q.images?.length).length;
          return (
            <button
              key={e.exam}
              type="button"
              onClick={() => start(e.exam)}
              className="group text-left rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 bg-white dark:bg-slate-800/60 hover:shadow-sm transition-all px-4 py-3 min-h-[56px] flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-slate-800 dark:text-slate-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-400">
                  Practice Exam {e.exam}
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 tabular-nums">
                  {n} questions · {withImages} with images
                  {pgy && passMark(n, pgy) !== null && <> · pass {passMark(n, pgy)}</>}
                </div>
              </div>
              <svg className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}
