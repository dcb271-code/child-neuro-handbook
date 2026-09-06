'use client';

import type { RunnerQuestion } from '@/lib/quiz-runner/types';

type Props = {
  question: RunnerQuestion;
  index: number;
  total: number;
  selected: string | null;
  onSelect: (letter: string) => void;
  onPrev: () => void;
  onNext: () => void;
  isFirst: boolean;
  isLast: boolean;
  /** Right-aligned locator, e.g. "Exam 3 · item 12b" or "Quiz 2 · question 7". */
  locator: string;
  /** Singular noun for one sitting — used on the finish button. */
  label: string;
};

export default function RunnerQuestionCard({
  question, index, total, selected, onSelect, onPrev, onNext, isFirst, isLast,
  locator, label,
}: Props) {
  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-6">
      <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2 flex-wrap">
        <span className="tabular-nums">Question {index + 1} of {total}</span>
        <span className="tabular-nums">{locator}</span>
      </div>

      <div className="h-1 rounded-full bg-slate-100 dark:bg-slate-700/60 mb-4 overflow-hidden">
        <div
          className="h-full bg-indigo-500 transition-all duration-300"
          style={{ width: `${((index + 1) / total) * 100}%` }}
        />
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4 sm:p-6">
        {question.context && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 pb-2 border-b border-slate-100 dark:border-slate-700/60">
            {question.context}
          </p>
        )}

        {question.images?.map((src) => (
          // Plain <img>: these are pre-sized exam figures served from /public,
          // and next/image's optimizer would add cost for no benefit here.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt={question.imageAlt ?? 'Figure'}
            className="w-full h-auto rounded-lg border border-slate-200 dark:border-slate-700 mb-4 bg-white"
          />
        ))}

        <p className="text-slate-800 dark:text-slate-100 mb-4 leading-relaxed">{question.stem}</p>

        <div className="space-y-2">
          {question.options.map((o) => {
            const isSel = selected === o.letter;
            return (
              <button
                key={o.letter}
                type="button"
                onClick={() => onSelect(o.letter)}
                className={`w-full text-left flex gap-3 px-3 py-2.5 rounded-lg border transition-colors min-h-[44px] ${
                  isSel
                    ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40'
                }`}
              >
                <span className={`font-semibold shrink-0 ${isSel ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-400 dark:text-slate-500'}`}>
                  {o.letter}.
                </span>
                <span className="text-sm text-slate-700 dark:text-slate-200">{o.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mt-4">
        <button
          type="button"
          onClick={onPrev}
          disabled={isFirst}
          className="text-sm px-4 py-2 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 min-h-[44px]"
        >
          ← Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          className="text-sm px-5 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium min-h-[44px]"
        >
          {isLast ? `Finish ${label.toLowerCase()}` : 'Next →'}
        </button>
      </div>

      {/* Answers stay hidden until the whole set is submitted — this is an
          exam simulation, not the instant-feedback board review mode. */}
      <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-3">
        Answers and explanations are shown after you finish.
      </p>
    </div>
  );
}
