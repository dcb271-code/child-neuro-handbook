'use client';

import type { Question } from '@/lib/board-review/types';
import { DIM1_LABEL } from '@/lib/board-review/types';

type Props = {
  questions: Question[];
  selections: (number | null)[];
  onRetake: () => void;
  onNewQuiz: () => void;
};

export default function ResultsScreen({ questions, selections, onRetake, onNewQuiz }: Props) {
  const correctCount = questions.reduce(
    (n, q, i) => (selections[i] !== null && q.options[selections[i]!]?.isCorrect ? n + 1 : n),
    0
  );
  const total = questions.length;
  const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  const tier =
    pct >= 80
      ? { ring: 'border-green-400', bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', message: 'Excellent — keep this momentum.' }
      : pct >= 60
      ? { ring: 'border-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', message: 'Solid — review the misses below.' }
      : { ring: 'border-red-400', bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', message: 'More review needed — focus on the missed topics.' };

  return (
    <div className="max-w-2xl mx-auto py-6 sm:py-10 px-2">
      <div className="flex flex-col items-center text-center mb-8">
        <div
          className={`w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold border-4 ${tier.ring} ${tier.bg} ${tier.text} mb-4`}
        >
          {pct}%
        </div>
        <p className="text-xl font-bold text-slate-900 dark:text-white">
          {correctCount} / {total} correct
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{tier.message}</p>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 p-4 mb-6">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">
          Question-by-question
        </p>
        <div className="space-y-1.5">
          {questions.map((q, i) => {
            const sel = selections[i];
            const correct = sel !== null && q.options[sel]?.isCorrect;
            return (
              <div
                key={q.id}
                className={`flex items-start gap-3 p-2.5 rounded-lg text-sm border ${
                  correct
                    ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10'
                    : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10'
                }`}
              >
                <span className={`shrink-0 mt-0.5 ${correct ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                  {correct ? '✓' : '✗'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    {DIM1_LABEL[q.labels.dim1Category]} · {q.type}
                  </div>
                  <div className="text-slate-700 dark:text-slate-300 leading-snug truncate">
                    {q.leadIn}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
        <button
          type="button"
          onClick={onRetake}
          className="px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          ↺ Retake same questions
        </button>
        <button
          type="button"
          onClick={onNewQuiz}
          className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold text-white shadow-sm"
        >
          New quiz
        </button>
      </div>
    </div>
  );
}
