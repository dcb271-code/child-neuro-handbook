'use client';

import type { RunnerQuestion } from '@/lib/quiz-runner/types';
import type { RiteResult } from '@/lib/rite/scoring';
import { BENCHMARK_PGYS, passMark } from '@/lib/rite/scoring';

type Props = {
  setNumber: number;
  questions: RunnerQuestion[];
  answers: (string | null)[];
  result: RiteResult;
  pgy: number | null;
  onRetake: () => void;
  onBack: () => void;
  /** Singular noun for one sitting, e.g. "Practice Exam" or "Quiz". */
  label: string;
  /** Locator for each reviewed item, by index. */
  locator: (i: number) => string;
  /** False for sets with no published passing mark (the pediatrics quizzes). */
  benchmarks: boolean;
};

export default function RunnerResults({
  setNumber, questions, answers, result, pgy, onRetake, onBack,
  label, locator, benchmarks,
}: Props) {
  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-6">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-5 sm:p-6 mb-4">
        <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-1">
          {label} {setNumber} — complete
        </h1>

        <div className="flex items-baseline gap-3 flex-wrap mt-3">
          <span className="text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
            {result.correct}/{result.total}
          </span>
          <span className="text-xl tabular-nums text-slate-500 dark:text-slate-400">{result.pct}%</span>
          {benchmarks && result.passed !== null && (
            <span
              className={`text-sm font-semibold px-2.5 py-1 rounded-full ${
                result.passed
                  ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
              }`}
            >
              {result.passed ? 'At or above' : 'Below'} the PGY{pgy} benchmark
            </span>
          )}
        </div>

        {!benchmarks ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Scored out of {result.total}. These quizzes have no published passing mark, so no
            benchmark is shown.
          </p>
        ) : result.passMark !== null ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            PGY{pgy} benchmark for this exam: <strong>{result.passMark}</strong> of {result.total} correct.
          </p>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Benchmarks are published for PGY3–5 only. Pick your name on the Board Review screen to see yours.
          </p>
        )}

        {benchmarks && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60">
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-1.5">Benchmarks for this exam</p>
          <div className="flex gap-4 flex-wrap text-xs">
            {BENCHMARK_PGYS.map((p) => {
              const mark = passMark(result.total, p);
              return (
                <span key={p} className={`tabular-nums ${p === pgy ? 'font-semibold text-slate-700 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>
                  PGY{p}: {mark}/{result.total}
                </span>
              );
            })}
          </div>
        </div>
        )}

        <div className="flex gap-2 mt-4 flex-wrap">
          <button type="button" onClick={onRetake} className="text-sm px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white min-h-[44px]">
            Retake this {label.toLowerCase()}
          </button>
          <button type="button" onClick={onBack} className="text-sm px-4 py-2 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 min-h-[44px]">
            Back to list
          </button>
        </div>
      </div>

      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Review</h2>
      <ol className="space-y-3">
        {questions.map((q, i) => {
          const sel = answers[i];
          const ok = sel === q.answer;
          return (
            <li
              key={q.id}
              className={`rounded-xl border p-4 ${
                ok
                  ? 'border-green-200 dark:border-green-900/50 bg-green-50/40 dark:bg-green-900/10'
                  : 'border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-900/10'
              }`}
            >
              <div className="flex gap-2 items-start">
                <span className={`shrink-0 font-semibold ${ok ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                  {ok ? '✓' : '✗'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-1 tabular-nums">
                    {i + 1}. {locator(i)}
                  </p>
                  {q.context && <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{q.context}</p>}
                  <p className="text-sm text-slate-700 dark:text-slate-200 mb-2">{q.stem}</p>

                  {q.images?.map((src) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={src} src={src} alt={q.imageAlt ?? 'Figure'} className="w-full max-w-md h-auto rounded-lg border border-slate-200 dark:border-slate-700 mb-2 bg-white" />
                  ))}

                  <p className="text-xs mb-1">
                    <span className="text-slate-500 dark:text-slate-400">Your answer: </span>
                    <span className={ok ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-400'}>
                      {sel ? `${sel}. ${q.options.find((o) => o.letter === sel)?.text ?? ''}` : 'not answered'}
                    </span>
                  </p>
                  {!ok && (
                    <p className="text-xs mb-1">
                      <span className="text-slate-500 dark:text-slate-400">Correct: </span>
                      <span className="text-green-700 dark:text-green-300">
                        {q.answer}. {q.options.find((o) => o.letter === q.answer)?.text ?? ''}
                      </span>
                    </p>
                  )}
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">{q.explanation}</p>
                  {q.salient && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1"><strong>Salient points:</strong> {q.salient}</p>}
                  {q.learning && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1"><strong>Learning points:</strong> {q.learning}</p>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
