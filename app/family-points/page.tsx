import { isAuthed } from '@/lib/resources/auth';
import { readEntries } from '@/lib/family-points/store';
import { computeLeaderboard } from '@/lib/family-points/calculator';
import { ACADEMIC_YEAR, MONTHS, TASKS, monthForDate } from '@/lib/family-points/config';
import AuthBar from '@/components/family-points/AuthBar';
import TeamIcon from '@/components/family-points/TeamIcon';
import DailyChallenge from '@/components/DailyChallenge';
import EntryPanel from '@/components/family-points/EntryPanel';
import ExportCsvButton from '@/components/family-points/ExportCsvButton';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Family Points — Child Neurology Handbook',
};

export default async function FamilyPointsPage() {
  const authed = (() => { try { return isAuthed(); } catch { return false; } })();
  const entries = await readEntries();
  const board = computeLeaderboard(entries);
  const recent = [...entries].sort((a, b) => b.createdAt - a.createdAt).slice(0, 12);

  // Columns run through the current academic month and no further — points
  // logged against a future month are held as pending, not shown as scored.
  const currentIdx = MONTHS.indexOf(monthForDate(new Date()));
  const lastActiveIdx = MONTHS.reduce(
    (last, m, i) => (board.teams.some((t) => t.byMonth[m] > 0) ? i : last),
    0,
  );
  const visibleMonths = MONTHS.slice(0, Math.max(Math.min(lastActiveIdx, currentIdx) + 1, 3));

  return (
    <DailyChallenge>
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">
          Family Points
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Peds neuro family competition &middot; {ACADEMIC_YEAR} &middot; log procedures, wellness, teaching, and scholarship
        </p>
      </div>

      <AuthBar authed={authed} />

      {/* Standings */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 p-4 sm:p-5 mb-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Leaderboard</h2>
        <ol className="space-y-3">
          {board.teams.map((t, i) => (
            <li key={t.teamId} className={`fp-c-${t.colorIndex}`}>
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
                  <span className="inline-block w-4 text-slate-400 dark:text-slate-500 tabular-nums">{i + 1}.</span>
                  <TeamIcon teamId={t.teamId} size={24} className="shrink-0" />
                  {t.name}
                </span>
                <span className="flex items-baseline gap-1.5 shrink-0">
                  <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                    {t.total} pts
                  </span>
                  {t.pending > 0 && (
                    <span
                      className="text-xs tabular-nums text-slate-400 dark:text-slate-500"
                      title="Logged against a month that hasn't arrived yet — counts once it does"
                    >
                      +{t.pending} pending
                    </span>
                  )}
                </span>
              </div>
              <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-700/60 overflow-hidden ml-5">
                <div
                  className="h-full rounded-full fp-bar"
                  style={{
                    width: `${(t.total / board.maxTeamTotal) * 100}%`,
                    backgroundColor: 'var(--fp)',
                    animationDelay: `${i * 90}ms`,
                  }}
                />
              </div>
            </li>
          ))}
        </ol>
        {entries.length === 0 && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">No points logged yet this year.</p>
        )}
      </section>

      {/* Monthly table */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 p-4 sm:p-5 mb-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Points by month</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700/60">
                <th className="py-1.5 pr-3 font-medium">Team</th>
                {visibleMonths.map((m) => (
                  <th key={m} className="py-1.5 px-2 font-medium text-right">{m.slice(0, 3)}</th>
                ))}
                <th className="py-1.5 pl-2 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {board.teams.map((t) => (
                <tr key={t.teamId} className={`fp-c-${t.colorIndex} border-b border-slate-50 dark:border-slate-700/40 last:border-0`}>
                  <td className="py-1.5 pr-3 text-slate-700 dark:text-slate-200 whitespace-nowrap">
                    <TeamIcon teamId={t.teamId} size={18} className="inline-block mr-2 align-[-4px]" />
                    {t.name}
                  </td>
                  {visibleMonths.map((m) => (
                    <td key={m} className="py-1.5 px-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                      {t.byMonth[m] || '·'}
                    </td>
                  ))}
                  <td className="py-1.5 pl-2 text-right tabular-nums font-semibold text-slate-900 dark:text-white">{t.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Points by resident, grouped by training year */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 p-4 sm:p-5 mb-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Points by resident</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">
          Grouped by training year. Tap a year to see who earned what.
        </p>
        {board.pgys.map((g) => (
          <details key={g.pgy} className="group border-b border-slate-100 dark:border-slate-700/60 last:border-0">
            <summary className="flex items-center gap-2.5 cursor-pointer select-none py-2.5 text-sm text-slate-700 dark:text-slate-200 min-h-[44px]">
              <svg className="w-3 h-3 shrink-0 text-slate-400 transition-transform details-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
              <span className="font-medium flex-1">PGY{g.pgy}</span>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {g.members.length} resident{g.members.length === 1 ? '' : 's'}
              </span>
              <span className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100 w-16 text-right">
                {g.total} pts
              </span>
            </summary>
            <ul className="pb-3 pl-8 space-y-2">
              {g.members.map((m) => (
                <li key={m.name} className="text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-slate-700 dark:text-slate-200">{m.name}</span>
                    <span className="flex items-baseline gap-1.5 shrink-0">
                      <span className="tabular-nums text-slate-600 dark:text-slate-300">{m.total} pts</span>
                      {m.pending > 0 && (
                        <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500">+{m.pending} pending</span>
                      )}
                    </span>
                  </div>
                  {Object.keys(m.byTask).length > 0 && (
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {Object.entries(m.byTask)
                        .map(([taskId, v]) => {
                          const label = TASKS.find((x) => x.id === taskId)?.label ?? taskId;
                          return `${label}${v.count > 1 ? ` \u00d7${v.count}` : ''} (+${v.points})`;
                        })
                        .join(' \u00b7 ')}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </details>
        ))}
      </section>

      {/* Entry */}
      {authed ? (
        <EntryPanel recent={recent} />
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-4 text-sm text-slate-500 dark:text-slate-400">
          Log in above with the shared resources password to enter points.
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <ExportCsvButton entries={entries} />
      </div>
    </div>
    </DailyChallenge>
  );
}
