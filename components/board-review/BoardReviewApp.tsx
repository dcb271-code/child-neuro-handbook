'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Question, Dim1Category, Difficulty, ModuleId } from '@/lib/board-review/types';
import { DIM1_LABEL, DIM1_COLOR, MODULE_IDS } from '@/lib/board-review/types';
import QuestionCard from './QuestionCard';
import ResultsScreen from './ResultsScreen';
import WhoAmI from '@/components/identity/WhoAmI';
import { useIdentity } from '@/lib/identity/useIdentity';
import { submitAttempts } from '@/lib/progress/submitAttempts';
import { computeProgress, type Attempt } from '@/lib/progress/calculator';
import QuizProgressSection from '@/components/progress/QuizProgressSection';

type Phase = 'idle' | 'active' | 'complete';

type TopicSelection = 'all' | 'adult' | Dim1Category;

type Filters = {
  topic: TopicSelection;
  module: ModuleId | 'all';
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

const ADULT_COLOR = '#475569'; // slate
const CLERKSHIP_COLOR = '#0d9488'; // teal

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
    topic: 'all',
    module: 'all',
    difficulties: new Set<Difficulty>(['easy', 'medium', 'hard']),
    clerkshipOnly: false,
    count: 10,
  });
  const [session, setSession] = useState<Question[]>([]);
  const [selections, setSelections] = useState<(number | null)[]>([]);
  const [current, setCurrent] = useState(0);
  const { name: identityName } = useIdentity();

  // Progress is fetched client-side (not passed down from the server page,
  // which stays force-static) so this stays in sync when a session completes
  // without needing the board-review page itself to become dynamic.
  const [progress, setProgress] = useState(() => computeProgress([]));
  const refetchProgress = useCallback(() => {
    fetch('/api/progress/attempts/', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { attempts?: Attempt[] }) => setProgress(computeProgress(d.attempts ?? [])))
      .catch((err) => console.error('[progress] fetch failed:', err));
  }, []);
  useEffect(() => { refetchProgress(); }, [refetchProgress]);

  const dim1Counts = useMemo(() => {
    const counts: Partial<Record<Dim1Category, number>> = {};
    for (const q of allQuestions) counts[q.labels.dim1Category] = (counts[q.labels.dim1Category] || 0) + 1;
    return counts;
  }, [allQuestions]);

  const adultCount = useMemo(() => allQuestions.filter((q) => q.labels.population === 'adult').length, [allQuestions]);

  const moduleCounts = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    for (const q of allQuestions) counts[q.module] = (counts[q.module] || 0) + 1;
    return counts;
  }, [allQuestions]);

  const filteredPool = useMemo(() => {
    return allQuestions.filter((q) => {
      if (filters.topic === 'adult') {
        if (q.labels.population !== 'adult') return false;
      } else if (filters.topic !== 'all') {
        if (q.labels.dim1Category !== filters.topic) return false;
      }
      if (filters.module !== 'all' && q.module !== filters.module) return false;
      if (filters.difficulties.size > 0 && !filters.difficulties.has(q.difficulty)) return false;
      if (filters.clerkshipOnly && !q.clerkshipAppropriate) return false;
      return true;
    });
  }, [allQuestions, filters.topic, filters.module, filters.difficulties, filters.clerkshipOnly]);

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
      if (identityName) {
        submitAttempts(
          session.map((q, i) => {
            const sel = selections[i];
            return {
              member: identityName,
              quiz: 'board-review' as const,
              questionId: q.id,
              correct: sel !== null && !!q.options[sel]?.isCorrect,
            };
          }),
        );
        // Give the write a moment to land before pulling it back.
        setTimeout(refetchProgress, 1500);
      }
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
        <WhoAmI className="mt-2" />
      </div>

      {/* My Progress — tucked away, collapsed by default so it doesn't compete
          with starting a quiz. Covers both board review and the homepage's
          daily question, since both are opt-in self-tracked quiz progress. */}
      <details className="mb-4 group/details">
        <summary className="flex items-center gap-2.5 cursor-pointer select-none py-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          <svg className="w-3 h-3 transition-transform details-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-xs font-semibold uppercase tracking-widest">My Progress</span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700 ml-2" />
        </summary>
        <div className="pt-3 pb-1">
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
            Opt-in and self-identified — pick your name above to start showing up here. Anyone can pick any
            name; this is not a login.
          </p>
          <QuizProgressSection
            title="Daily Question"
            blurb="One attempt logged per day — the first question you see, whether right or wrong."
            progress={progress.daily}
          />
          <QuizProgressSection
            title="Board Review"
            blurb="Every question answered in a session, across all sessions."
            progress={progress['board-review']}
          />
        </div>
      </details>

      {/* Topic — includes "Adult" as a folded pill at the end */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 p-5 mb-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Topic</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilters((f) => ({ ...f, topic: 'all' }))}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filters.topic === 'all'
                ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-semibold'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            All ({allQuestions.length})
          </button>
          {sortedDim1.map((cat) => {
            const active = filters.topic === cat;
            const color = DIM1_COLOR[cat];
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setFilters((f) => ({ ...f, topic: cat }))}
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
          {/* visual divider */}
          <span className="self-center text-slate-300 dark:text-slate-600 select-none px-1" aria-hidden="true">|</span>
          <button
            type="button"
            onClick={() => setFilters((f) => ({ ...f, topic: 'adult' }))}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filters.topic === 'adult' ? 'font-semibold' : 'hover:opacity-80'
            }`}
            style={{
              borderColor: filters.topic === 'adult' ? ADULT_COLOR : '#e2e8f0',
              backgroundColor: filters.topic === 'adult' ? `${ADULT_COLOR}15` : 'transparent',
              color: filters.topic === 'adult' ? ADULT_COLOR : undefined,
            }}
          >
            Adult ({adultCount})
          </button>
        </div>
      </div>

      {/* Module */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 p-5 mb-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Module</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Each module is a balanced slice of the bank — pick a different one each visit to avoid repeats.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilters((f) => ({ ...f, module: 'all' }))}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filters.module === 'all'
                ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-semibold'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            All
          </button>
          {MODULE_IDS.map((m) => {
            const active = filters.module === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setFilters((f) => ({ ...f, module: m }))}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  active
                    ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {m} <span className="opacity-60">({moduleCounts[m]})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Difficulty + clerkship folded into one row */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 p-5 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Difficulty</h2>
        <div className="flex flex-wrap items-center gap-2">
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
          <span className="text-slate-300 dark:text-slate-600 select-none px-1" aria-hidden="true">|</span>
          <button
            type="button"
            onClick={() => setFilters((f) => ({ ...f, clerkshipOnly: !f.clerkshipOnly }))}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filters.clerkshipOnly ? 'font-semibold' : 'hover:opacity-80'
            }`}
            style={{
              borderColor: filters.clerkshipOnly ? CLERKSHIP_COLOR : '#e2e8f0',
              backgroundColor: filters.clerkshipOnly ? `${CLERKSHIP_COLOR}15` : 'transparent',
              color: filters.clerkshipOnly ? CLERKSHIP_COLOR : undefined,
            }}
            title="Restrict to questions tagged appropriate for medical-student level review"
          >
            Clerkship-only
          </button>
        </div>
      </div>

      {/* Count */}
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
