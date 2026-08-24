'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MONTHS, TEAMS, MEMBERS, TASKS, monthForDate, type Month } from '@/lib/family-points/config';
import { entryPoints, type Entry } from '@/lib/family-points/calculator';

export default function EntryPanel({ recent }: { recent: Entry[] }) {
  const router = useRouter();
  const [member, setMember] = useState('');
  const [month, setMonth] = useState<Month>(() => monthForDate(new Date()));
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const staged = useMemo(
    () => TASKS.filter((t) => (counts[t.id] ?? 0) > 0).map((t) => ({ task: t, count: counts[t.id] })),
    [counts],
  );
  const stagedPoints = staged.reduce((s, x) => s + x.task.points * x.count, 0);

  function bump(taskId: string, delta: number) {
    setSaved(null);
    setCounts((c) => {
      const next = Math.max(0, Math.min(99, (c[taskId] ?? 0) + delta));
      return { ...c, [taskId]: next };
    });
  }

  async function save() {
    if (!member || staged.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/family-points/entries', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          entries: staged.map(({ task, count }) => ({ member, taskId: task.id, month, count })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? (res.status === 401 ? 'Session expired — log in again' : 'Something went wrong'));
        return;
      }
      setCounts({});
      setSaved(`Saved ${staged.length} ${staged.length === 1 ? 'entry' : 'entries'} (+${stagedPoints} pts) for ${member} — ${month}`);
      router.refresh();
    } catch {
      setError('Network error — check your connection');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      const res = await fetch('/api/family-points/entries', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(
          res.status === 401
            ? 'Session expired — log in again'
            : `Delete failed: ${data?.error ?? res.status}`,
        );
        return;
      }
      router.refresh();
    } catch {
      setError('Network error — check your connection');
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 p-4 sm:p-5">
      <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Enter points</h2>

      {/* Who + when */}
      <div className="flex flex-wrap gap-3 mb-4">
        <label className="flex-1 min-w-[220px]">
          <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Resident</span>
          <select
            value={member}
            onChange={(e) => { setMember(e.target.value); setSaved(null); }}
            className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          >
            <option value="">Select resident…</option>
            {TEAMS.map((t) => (
              <optgroup key={t.id} label={t.name}>
                {MEMBERS.filter((m) => m.teamId === t.id).map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name} (PGY{m.pgy})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="w-40">
          <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Month</span>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value as Month)}
            className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          >
            {MONTHS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Task steppers */}
      <div className="divide-y divide-slate-100 dark:divide-slate-700/60 border-y border-slate-100 dark:border-slate-700/60 mb-4">
        {TASKS.map((t) => {
          const n = counts[t.id] ?? 0;
          return (
            <div key={t.id} className="flex items-center gap-3 py-2">
              <div className="flex-1 min-w-0">
                <span className="text-sm text-slate-700 dark:text-slate-200">{t.label}</span>
                <span className="ml-2 text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">{t.points} pts</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => bump(t.id, -1)}
                  disabled={n === 0}
                  aria-label={`Remove one ${t.label}`}
                  className="w-8 h-8 rounded-md border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 text-base leading-none"
                >
                  −
                </button>
                <span className={`w-7 text-center text-sm tabular-nums ${n > 0 ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-300 dark:text-slate-600'}`}>
                  {n}
                </span>
                <button
                  type="button"
                  onClick={() => bump(t.id, 1)}
                  aria-label={`Add one ${t.label}`}
                  className="w-8 h-8 rounded-md border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-base leading-none"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Save row */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={save}
          disabled={busy || !member || staged.length === 0}
          className="text-sm px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors"
        >
          {busy ? 'Saving…' : `Save${stagedPoints > 0 ? ` (+${stagedPoints} pts)` : ''}`}
        </button>
        {!member && staged.length > 0 && (
          <span className="text-xs text-amber-600 dark:text-amber-400">Pick a resident to save</span>
        )}
        {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
        {saved && <span className="text-xs text-emerald-600 dark:text-emerald-400">{saved}</span>}
      </div>

      {/* Recent entries with undo */}
      {recent.length > 0 && (
        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
            Recent entries
          </h3>
          <ul className="space-y-1">
            {recent.map((e) => (
              <li key={e.id} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <span className="flex-1 min-w-0 truncate">
                  {e.member} — {TASKS.find((t) => t.id === e.taskId)?.label ?? e.taskId}
                  {e.count > 1 ? ` ×${e.count}` : ''} <span className="text-slate-400 dark:text-slate-500">({e.month}, +{entryPoints(e)} pts)</span>
                </span>
                <button
                  type="button"
                  onClick={() => remove(e.id)}
                  aria-label="Delete entry"
                  className="shrink-0 text-xs text-slate-400 hover:text-red-600 dark:hover:text-red-400 px-1.5 py-0.5"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
