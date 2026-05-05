'use client';

import { useMemo, useState } from 'react';
import type { Question, Dim1Category, Difficulty } from '@/lib/board-review/types';
import { DIM1_LABEL, DIM1_COLOR } from '@/lib/board-review/types';
import QuestionCard from './QuestionCard';
import ResultsScreen from './ResultsScreen';

type Phase = 'idle' | 'active' | 'complete';

type Filters = {
  dim1: Dim1Category | 'all';
  population: 'peds' | 'adult' | 'all';
  difficulties: Set<Difficulty>;
  clerkshipOnly: boolean;
  count: number;
};

const COUNT_CHOICES = [10, 20, 50];

const DIFFICULTY_STYLE: Record<Difficulty, { dot: string; text: string; border: string; bg: string }> = {
  easy:   { dot: '#16a34a', text: 'text-green-700 dark:text-green-300', border: 'border-green-400',  bg: 'bg-green-50 dark:bg-green-900/20' },
  medium: { dot: '#d97706', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-400',  bg: 'bg-amber-50 dark:bg-amber-900/20' },
  hard:   { dot: '#dc2626', text: 'text-red-700 dark:text-red-300',     border: 'border-red-400',    bg: 'bg-red-50 dark:bg-red-900/20' },
};

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default function BoardReviewApp({ questions: allQuestions }: { questions: Question[] }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [filters, setFilters] = useState<Filters>({
    dim1: 'all',
    population: 'all',
    difficulties: new Set<Difficulty>(['easy', 'medium', 'hard']),
    clerkshipOnly: false,
    count: 10,
  });
  const [session, setSession] = useState<Question[]>([]);
  const [selections, setSelections] = useState<(number | null)[]>([]);
  const [current, setCurrent] = useState(0);

  const dim1Counts = useMemo(() => {
    const counts: Partial<Record<Dim1Category, number>> = {};
    for (const q of allQuestions) counts[q.labels.dim1Category] = (counts[q.labels.dim1Category] || 0) + 1;
    return counts;
  }, [allQuestions]);

  const filteredPool = useMemo(() => {
    return allQuestions.filter((q) => {
      if (filters.dim1 !== 'all' && q.labels.dim1Category !== filters.dim1) return false;
      if (filters.population !== 'all' && q.labels.population !== filters.population) return false;
      if (filters.difficulties.size > 0 && !filters.difficulties.has(q.difficulty)) return false;
      if (filters.clerkshipOnly && !q.clerkshipAppropriate) return false;
      return true;
    });
  }, [allQuestions, filters.dim1, filters.population, filters.difficulties, filters.clerkshipOnly]);

  const effectiveCount = Math.min(filters.count, filteredPool.length);

  function startQuiz() {
    if (filteredPool.length === 0) return;
    const picked = shuffle(filteredPool).slice(0, effectiveCount);
    setSession(picked);
    setSelections(new Array(picked.length).fill(null));
    setCurrent(0);
    setPhase('active');
  }

  function retakeSame() {
    setSelections(new Array(session.length).fill(null));
    setCurrent(0);
    setPhase('active');
  }

  function newQuiz() {
    setPhase('idle');
    setSession([]);
    setSelections([]);
    setCurrent(0);
  }

  function handleSelect(optionIndex: number) {
    setSelections((prev) => {
      const next = prev.slice();
      next[current] = optionIndex;
      return next;
    });
  }

  function handleNext() {
    if (current + 1 >= session.length) {
      setPhase('complete');
    } else {
      setCurrent((c) => c + 1);
    }
  }

  // ── ACTIVE ───────────────────────────────────────────────────────────
  if (phase === 'active') {
    const q = session[current];
    return (
      <QuestionCard
        question={q}
        questionIndex={current}
        totalQuestions={session.length}
        selectedIndex={selections[current]}
        onSelect={handleSelect}
        onNext={handleNext}
        isLast={current + 1 === session.length}
      />
    );
  }

  // ── COMPLETE ─────────────────────────────────────────────────────────
  if (phase === 'complete') {
    return (
      <ResultsScreen
        questions={session}
        selections={selections}
        onRetake={retakeSame}
        onNewQuiz={newQuiz}
      />
    );
  }

  // ── IDLE (landing) ───────────────────────────────────────────────────
  const sortedDim1 = (Object.keys(dim1Counts) as Dim1Category[]).sort(
    (a, b) => (dim1Counts[b] || 0) - (dim1Counts[a] || 0)
  );

  return (
    <div className="max-w-2xl mx-auto py-4 sm:py-6">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">
          Board Review
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          {allQuestions.length} questions · ABPN child-neurology blueprint · instant feedback with all-option rationales.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 p-5 mb-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Topic</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilters((f) => ({ ...f, dim1: 'all' }))}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filters.dim1 === 'all'
                ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-semibold'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            All ({allQuestions.length})
          </button>
          {sortedDim1.map((cat) => {
            const active = filters.dim1 === cat;
            const color = DIM1_COLOR[cat];
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setFilters((f) => ({ ...f, dim1: cat }))}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  active ? 'font-semibold' : 'hover:opacity-80'
                }`}
                style={{
                  borderColor: active ? color : '#e2e8f0',
                  backgroundColor: active ? `${color}15` : 'transparent',
                  color: active ? color : undefined,
                }}
              >
                {DIM1_LABEL[cat]} ({dim1Counts[cat]})
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 p-5 mb-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Population</h2>
        <div className="flex gap-2">
          {(['all', 'peds', 'adult'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setFilters((f) => ({ ...f, population: p }))}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filters.population === p
                  ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-semibold'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {p === 'all' ? 'All' : p === 'peds' ? 'Pediatric' : 'Adult'}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 p-5 mb-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Difficulty</h2>
        <div className="flex gap-2">
          {(['easy', 'medium', 'hard'] as const).map((d) => {
            const active = filters.difficulties.has(d);
            const style = DIFFICULTY_STYLE[d];
            return (
              <button
                key={d}
                type="button"
                onClick={() =>
                  setFilters((f) => {
                    const next = new Set(f.difficulties);
                    if (next.has(d)) next.delete(d);
                    else next.add(d);
                    if (next.size === 0) next.add(d); // never let all be unchecked
                    return { ...f, difficulties: next };
                  })
                }
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5 ${
                  active
                    ? `${style.border} ${style.bg} ${style.text} font-semibold`
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: style.dot }} />
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 p-5 mb-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.clerkshipOnly}
            onChange={(e) => setFilters((f) => ({ ...f, clerkshipOnly: e.target.checked }))}
            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
          />
          <div>
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Clerkship-appropriate only
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Filter to questions tagged appropriate for medical-student level review.
            </div>
          </div>
        </label>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 p-5 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Number of questions</h2>
        <div className="flex gap-2">
          {COUNT_CHOICES.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setFilters((f) => ({ ...f, count: n }))}
              className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
                filters.count === n
                  ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-semibold'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        {filteredPool.length < filters.count && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Only {filteredPool.length} questions match these filters — your quiz will use that many.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={startQuiz}
        disabled={filteredPool.length === 0}
        className="w-full sm:w-auto px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-sm transition-colors"
      >
        {filteredPool.length === 0
          ? 'No questions match these filters'
          : `Start ${effectiveCount}-question quiz →`}
      </button>
    </div>
  );
}
