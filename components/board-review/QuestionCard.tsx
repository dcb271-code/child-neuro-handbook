'use client';

import type { Question, Difficulty } from '@/lib/board-review/types';
import { DIM1_LABEL, DIM1_COLOR } from '@/lib/board-review/types';

const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  easy: '#16a34a',
  medium: '#d97706',
  hard: '#dc2626',
};

type Props = {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  selectedIndex: number | null;
  onSelect: (optionIndex: number) => void;
  onNext: () => void;
  isLast: boolean;
};

export default function QuestionCard({
  question,
  questionIndex,
  totalQuestions,
  selectedIndex,
  onSelect,
  onNext,
  isLast,
}: Props) {
  const revealed = selectedIndex !== null;
  const accent = DIM1_COLOR[question.labels.dim1Category];

  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-6">
      {/* Top: progress + difficulty + topic tag */}
      <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2 flex-wrap">
        <span className="tabular-nums">
          Question {questionIndex + 1} of {totalQuestions}
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className="font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1.5"
            style={{
              color: DIFFICULTY_COLOR[question.difficulty],
              backgroundColor: `${DIFFICULTY_COLOR[question.difficulty]}10`,
              borderColor: `${DIFFICULTY_COLOR[question.difficulty]}30`,
            }}
            title={`Difficulty: ${question.difficulty}`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: DIFFICULTY_COLOR[question.difficulty] }}
            />
            {question.difficulty}
          </span>
          <span
            className="font-semibold px-2.5 py-0.5 rounded-full border"
            style={{
              color: accent,
              backgroundColor: `${accent}10`,
              borderColor: `${accent}30`,
            }}
          >
            {DIM1_LABEL[question.labels.dim1Category]}
          </span>
        </div>
      </div>

      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mb-6">
        <div
          className="h-1.5 rounded-full transition-all duration-300"
          style={{
            width: `${((questionIndex + 1) / totalQuestions) * 100}%`,
            backgroundColor: accent,
          }}
        />
      </div>

      {question.vignette && (
        <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
          {question.vignette}
        </p>
      )}

      <p className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white leading-snug mb-5">
        {question.leadIn}
      </p>

      <div className="space-y-2.5">
        {question.options.map((opt, i) => {
          const isSelected = selectedIndex === i;
          const isCorrect = opt.isCorrect;

          let cls = 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/40 text-slate-700 dark:text-slate-200';
          if (revealed) {
            if (isCorrect) {
              cls = 'border-green-400 bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-200 font-semibold';
            } else if (isSelected) {
              cls = 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 line-through';
            } else {
              cls = 'border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/20 text-slate-400 dark:text-slate-500';
            }
          } else if (isSelected) {
            cls = 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-200 font-medium';
          }

          return (
            <button
              key={i}
              type="button"
              onClick={() => !revealed && onSelect(i)}
              disabled={revealed}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${cls} ${
                !revealed ? 'hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 cursor-pointer' : 'cursor-default'
              }`}
            >
              <span className="font-mono text-xs opacity-60 mr-2">
                {String.fromCharCode(65 + i)}.
              </span>
              {opt.text}
            </button>
          );
        })}
      </div>

      {revealed && (
        <div className="mt-5 space-y-3">
          {question.options.map((opt, i) => {
            const borderColor = opt.isCorrect ? 'border-green-400' : 'border-slate-200 dark:border-slate-700';
            const bg = opt.isCorrect ? 'bg-green-50 dark:bg-green-900/10' : 'bg-slate-50 dark:bg-slate-800/40';
            const labelColor = opt.isCorrect
              ? 'text-green-800 dark:text-green-300'
              : 'text-slate-500 dark:text-slate-400';
            return (
              <div
                key={i}
                className={`rounded-lg border-l-4 p-3 text-sm ${borderColor} ${bg}`}
              >
                <div className={`text-[11px] font-bold uppercase tracking-wide mb-1 ${labelColor}`}>
                  {opt.isCorrect ? `✓ Correct — ${String.fromCharCode(65 + i)}` : `${String.fromCharCode(65 + i)}`}
                </div>
                <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {opt.rationale || <span className="italic text-slate-400">(no rationale)</span>}
                </div>
              </div>
            );
          })}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onNext}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
              style={{ backgroundColor: accent }}
            >
              {isLast ? 'See results →' : 'Next question →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
