'use client';

import { useEffect, useState } from 'react';

type Week = {
  start: string; // YYYY-MM-DD (UTC)
  end:   string; // YYYY-MM-DD (UTC, inclusive)
  general: string;
  icu: string;
  notes: string;
};

function fmtRange(startISO: string, endISO: string): string {
  const s = new Date(startISO + 'T00:00:00Z');
  const e = new Date(endISO   + 'T00:00:00Z');
  const md = (d: Date) => `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
  return `${md(s)}–${md(e)}`;
}

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function CallWeekStrip() {
  const [weeks, setWeeks] = useState<Week[] | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    fetch('/data/call-weeks.json')
      .then(r => r.json())
      .then((w: Week[]) => setWeeks(w))
      .catch(() => setErr(true));
  }, []);

  if (err || !weeks || weeks.length === 0) return null;

  const today = todayISO();
  const thisIdx = weeks.findIndex(w => w.start <= today && today <= w.end);
  let current: Week | null = null;
  let next: Week | null = null;

  if (thisIdx >= 0) {
    current = weeks[thisIdx];
    next = weeks[thisIdx + 1] ?? null;
  } else {
    // Off-schedule (gap day) — show next upcoming as "this" if any
    const upcoming = weeks.find(w => w.start > today);
    if (upcoming) {
      const idx = weeks.indexOf(upcoming);
      current = null;
      next = upcoming;
    } else {
      return null; // Schedule has ended
    }
  }

  const cell = (label: string, w: Week | null) => {
    if (!w) return null;
    return (
      <div className="flex flex-col sm:flex-row sm:items-baseline gap-x-2 gap-y-0.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 shrink-0">
          {label} ({fmtRange(w.start, w.end)})
        </span>
        <span className="text-xs sm:text-[13px] text-slate-700 dark:text-slate-200">
          General <span className="font-semibold">{w.general || '—'}</span>
          {' · '}
          ICU <span className="font-semibold">{w.icu || '—'}</span>
          {w.notes && (
            <span className="text-amber-700 dark:text-amber-400 ml-1">· {w.notes}</span>
          )}
        </span>
      </div>
    );
  };

  return (
    <a
      href="/neuro-on-call/#faculty-call-schedule"
      className="block mb-4 sm:mb-5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600 transition-colors px-3 sm:px-4 py-2 sm:py-2.5"
      aria-label="Faculty call coverage — current and next week"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6 gap-1.5">
        {cell(current ? 'This Week' : 'Next Week', current ?? next)}
        {current && next && cell('Next Week', next)}
      </div>
    </a>
  );
}
