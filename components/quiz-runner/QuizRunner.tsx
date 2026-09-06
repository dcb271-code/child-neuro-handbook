'use client';

import { useMemo, useState } from 'react';
import type { RunnerConfig, RunnerQuestion, RunnerSet } from '@/lib/quiz-runner/types';
import { scoreExam, passMark, BENCHMARK_PGYS } from '@/lib/rite/scoring';
import { useIdentity } from '@/lib/identity/useIdentity';
import { identityByName } from '@/lib/roster';
import { submitAttempts } from '@/lib/progress/submitAttempts';
import RunnerQuestionCard from './RunnerQuestionCard';
import RunnerResults from './RunnerResults';

type Phase = 'list' | 'active' | 'complete';

/**
 * Shared runner for full-length, answers-at-the-end quiz sets. Drives both the
 * RITE practice exams and the pediatrics in-service quizzes; the difference
 * between them is entirely in `config` and the adapted data passed in.
 */
export default function QuizRunner({
  sets, config, locator, onAttemptsSubmitted, onPhaseChange,
}: {
  sets: RunnerSet[];
  config: RunnerConfig;
  /** Per-question locator line, e.g. "Exam 3 · item 12b". */
  locator: (q: RunnerQuestion, setNumber: number) => string;
  onAttemptsSubmitted?: () => void;
  /** Lets the page hide its own chrome while a set is in progress. */
  onPhaseChange?: (inSet: boolean) => void;
}) {
  const [phase, setPhase] = useState<Phase>('list');
  const [setNo, setSetNo] = useState<number | null>(null);
  const [questions, setQuestions] = useState<RunnerQuestion[]>([]);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [current, setCurrent] = useState(0);

  const { name: identityName } = useIdentity();
  const rosterPgy = identityName ? identityByName(identityName)?.pgy ?? null : null;
  // Sets without published marks are never scored against a PGY benchmark,
  // whatever year the resident is in.
  const pgy = config.benchmarks ? rosterPgy : null;

  const result = useMemo(
    () => scoreExam(answers, questions.map((q) => q.answer), pgy),
    [answers, questions, pgy],
  );

  function start(n: number) {
    const found = sets.find((s) => s.number === n);
    if (!found) return;
    setSetNo(n);
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
          quiz: config.quizId,
          questionId: q.id,
          correct: answers[i] === q.answer,
        })),
      );
      if (onAttemptsSubmitted) setTimeout(onAttemptsSubmitted, 1500);
    }
    setPhase('complete');
    window.scrollTo({ top: 0 });
  }

  if (phase === 'active' && setNo !== null) {
    return (
      <RunnerQuestionCard
        question={questions[current]}
        index={current}
        total={questions.length}
        selected={answers[current]}
        onSelect={select}
        onPrev={() => { setCurrent((c) => Math.max(0, c - 1)); window.scrollTo({ top: 0 }); }}
        onNext={next}
        isFirst={current === 0}
        isLast={current + 1 === questions.length}
        locator={locator(questions[current], setNo)}
        label={config.label}
      />
    );
  }

  if (phase === 'complete' && setNo !== null) {
    return (
      <RunnerResults
        setNumber={setNo}
        questions={questions}
        answers={answers}
        result={result}
        pgy={pgy}
        onRetake={() => start(setNo)}
        onBack={() => { setPhase('list'); onPhaseChange?.(false); window.scrollTo({ top: 0 }); }}
        label={config.label}
        locator={(i) => locator(questions[i], setNo)}
        benchmarks={config.benchmarks}
      />
    );
  }

  // ── set picker ───────────────────────────────────────────────────────
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
        {config.intro}
        {config.benchmarks && (
          rosterPgy && BENCHMARK_PGYS.includes(rosterPgy)
            ? ` Scored against the PGY${rosterPgy} benchmark.`
            : ' Pick your name above to be scored against your PGY benchmark.'
        )}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {sets.map((s) => {
          const n = s.questions.length;
          return (
            <button
              key={s.number}
              type="button"
              onClick={() => start(s.number)}
              className="group text-left rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 bg-white dark:bg-slate-800/60 hover:shadow-sm transition-all px-4 py-3 min-h-[56px] flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-slate-800 dark:text-slate-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-400">
                  {config.label} {s.number}
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 tabular-nums">
                  {n} questions
                  {s.detail && <> · {s.detail}</>}
                  {config.benchmarks && pgy && passMark(n, pgy) !== null && <> · pass {passMark(n, pgy)}</>}
                </div>
              </div>
              <svg className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          );
        })}
      </div>

      {config.source && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 leading-relaxed">{config.source}</p>
      )}
    </div>
  );
}
