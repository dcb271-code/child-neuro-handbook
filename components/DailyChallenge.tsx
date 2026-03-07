'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import questions from '@/src/data/questions.json';
import factoids from '@/src/data/factoids.json';

type Question = {
  id: number;
  category: string;
  stem: string;
  choices: string[];
  answer: number;
  explanation: string;
};

/** Seed-based deterministic PRNG (mulberry32). */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Get today's date string as YYYY-MM-DD in local time. */
function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Get a numeric seed from a date string. */
function dateSeed(dateStr: string): number {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) {
    h = (Math.imul(31, h) + dateStr.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/** Shuffle array using a seeded RNG. */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const copy = [...arr];
  const rng = mulberry32(seed);
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function DailyChallenge({ children }: { children: React.ReactNode }) {
  const [passed, setPassed] = useState<boolean | null>(null); // null = loading
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [showEntry, setShowEntry] = useState(false);

  const today = todayKey();
  const seed = dateSeed(today);

  // Deterministic daily order of questions
  const shuffled = useMemo(() => seededShuffle(questions as Question[], seed), [seed]);

  // Today's factoid — rotate by day of year
  const factoid = useMemo(() => {
    const start = new Date(new Date().getFullYear(), 0, 0);
    const diff = +new Date() - +start;
    const dayOfYear = Math.floor(diff / 86400000);
    return factoids[dayOfYear % factoids.length];
  }, []);

  const currentQuestion = shuffled[questionIndex % shuffled.length];

  // Check localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('daily-challenge-passed');
      if (stored === today) {
        setPassed(true);
      } else {
        setPassed(false);
      }
    } catch {
      setPassed(false);
    }
  }, [today]);

  const handleSelect = useCallback(
    (idx: number) => {
      if (answered) return;
      setSelectedIdx(idx);
      setAnswered(true);
      const isCorrect = idx === currentQuestion.answer;
      setCorrect(isCorrect);
      if (isCorrect) {
        try {
          localStorage.setItem('daily-challenge-passed', today);
        } catch {}
      }
    },
    [answered, currentQuestion.answer, today]
  );

  const handleEnter = useCallback(() => {
    setShowEntry(true);
    setTimeout(() => setPassed(true), 400);
  }, []);

  const handleNextQuestion = useCallback(() => {
    setQuestionIndex((prev) => prev + 1);
    setSelectedIdx(null);
    setAnswered(false);
    setCorrect(false);
  }, []);

  // Still loading
  if (passed === null) {
    return <>{children}</>;
  }

  // Already passed today — show handbook
  if (passed) {
    return <>{children}</>;
  }

  return (
    <div
      className={`transition-opacity duration-400 ${showEntry ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Daily challenge overlay */}
      <div className="max-w-2xl mx-auto py-2 sm:py-6">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Daily Neuro Challenge
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Answer correctly to enter the handbook
          </p>
        </div>

        {/* Factoid of the day */}
        <div className="mb-6 sm:mb-8 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="text-blue-500 dark:text-blue-400 text-lg mt-0.5 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </span>
            <div>
              <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
                Factoid of the Day
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {factoid}
              </p>
            </div>
          </div>
        </div>

        {/* Question card */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 shadow-sm overflow-hidden">
          {/* Category badge */}
          <div className="px-4 sm:px-6 pt-4 sm:pt-5">
            <span className="inline-block text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-full px-2.5 py-0.5 mb-3">
              {currentQuestion.category}
            </span>
          </div>

          {/* Stem */}
          <div className="px-4 sm:px-6 pb-4">
            <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed">
              {currentQuestion.stem}
            </p>
          </div>

          {/* Choices */}
          <div className="px-4 sm:px-6 pb-4 sm:pb-5 space-y-2">
            {currentQuestion.choices.map((choice, idx) => {
              const letter = String.fromCharCode(65 + idx);
              let borderClass = 'border-slate-200 dark:border-slate-600';
              let bgClass = 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750';
              let textClass = 'text-slate-700 dark:text-slate-300';
              let cursor = 'cursor-pointer';

              if (answered) {
                cursor = 'cursor-default';
                if (idx === currentQuestion.answer) {
                  borderClass = 'border-emerald-400 dark:border-emerald-500';
                  bgClass = 'bg-emerald-50 dark:bg-emerald-950/40';
                  textClass = 'text-emerald-800 dark:text-emerald-200';
                } else if (idx === selectedIdx && !correct) {
                  borderClass = 'border-red-400 dark:border-red-500';
                  bgClass = 'bg-red-50 dark:bg-red-950/40';
                  textClass = 'text-red-800 dark:text-red-200';
                } else {
                  bgClass = 'bg-slate-50/50 dark:bg-slate-800/50';
                  textClass = 'text-slate-400 dark:text-slate-500';
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  disabled={answered}
                  className={`w-full text-left rounded-lg border ${borderClass} ${bgClass} ${textClass} ${cursor} px-4 py-3 text-sm transition-all duration-200 flex items-start gap-3`}
                >
                  <span className="font-semibold shrink-0 mt-px">{letter}.</span>
                  <span className="leading-relaxed">{choice}</span>
                </button>
              );
            })}
          </div>

          {/* Result feedback */}
          {answered && (
            <div
              className={`px-4 sm:px-6 py-4 sm:py-5 border-t ${
                correct
                  ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20'
                  : 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'
              }`}
            >
              <div
                className={`text-sm font-semibold mb-2 ${
                  correct
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-red-700 dark:text-red-400'
                }`}
              >
                {correct ? 'Correct!' : 'Incorrect'}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {currentQuestion.explanation}
              </p>

              <div className="mt-4">
                {correct ? (
                  <button
                    onClick={handleEnter}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm px-5 py-2.5 transition-colors"
                  >
                    Enter Handbook
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={handleNextQuestion}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-600 hover:bg-slate-700 dark:bg-slate-500 dark:hover:bg-slate-400 text-white font-medium text-sm px-5 py-2.5 transition-colors"
                  >
                    Try Another Question
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
