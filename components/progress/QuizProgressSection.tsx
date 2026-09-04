import type { QuizProgress } from '@/lib/progress/calculator';

/**
 * One quiz's progress card: overall completed/accuracy, then a PGY-grouped
 * accordion. Every resident is listed even at 0 completed, same as Family
 * Points' team totals, so it's visible who hasn't engaged yet without being a
 * flat individual ranking.
 */
export default function QuizProgressSection({ title, blurb, progress }: {
  title: string;
  blurb: string;
  progress: QuizProgress;
}) {
  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 p-4 sm:p-5 mb-4">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
        <span className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
          {progress.completed === 0 ? '—' : `${progress.pct}% correct`}
        </span>
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">
        {blurb} {progress.completed > 0 && (
          <>· {progress.completed} answered, {progress.correct} correct</>
        )}
      </p>

      {progress.completed === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500 py-2">No tracked attempts yet.</p>
      ) : (
        progress.pgys.map((g) => (
          <details key={g.pgy} className="group border-b border-slate-100 dark:border-slate-700/60 last:border-0">
            <summary className="flex items-center gap-2.5 cursor-pointer select-none py-2.5 text-sm text-slate-700 dark:text-slate-200 min-h-[44px]">
              <svg className="w-3 h-3 shrink-0 text-slate-400 transition-transform details-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
              <span className="font-medium flex-1">PGY{g.pgy}</span>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {g.completed === 0 ? 'no attempts' : `${g.completed} answered`}
              </span>
              <span className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100 w-16 text-right">
                {g.completed === 0 ? '—' : `${g.pct}%`}
              </span>
            </summary>
            <ul className="pb-3 pl-8 space-y-1.5">
              {g.members.map((m) => (
                <li key={m.name} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-slate-700 dark:text-slate-200">{m.name}</span>
                  <span className="flex items-baseline gap-2 shrink-0 tabular-nums text-slate-500 dark:text-slate-400">
                    {m.completed === 0 ? (
                      <span className="text-slate-300 dark:text-slate-600">no attempts</span>
                    ) : (
                      <>
                        <span>{m.completed} answered</span>
                        <span className="text-slate-700 dark:text-slate-200 font-medium">{m.pct}%</span>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ))
      )}
    </section>
  );
}
