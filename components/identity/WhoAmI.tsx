'use client';

import { useState } from 'react';
import { IDENTITIES, pgyLabel, comparePgy } from '@/lib/roster';
import { useIdentity } from '@/lib/identity/useIdentity';

const PGYS = [...new Set(IDENTITIES.map((m) => m.pgy))].sort(comparePgy);

/**
 * Compact "who are you" status + picker, dropped into the daily challenge and
 * board review so attempts can be attributed to a resident. Never blocks use
 * of either quiz — picking a name is optional; unset means "don't track me."
 */
export default function WhoAmI({ className = '' }: { className?: string }) {
  const { name, loaded, setName, clear } = useIdentity();
  const [picking, setPicking] = useState(false);

  if (!loaded) return null;

  if (name && !picking) {
    return (
      <div className={`flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 ${className}`}>
        <span>
          Tracking progress as <span className="font-medium text-slate-700 dark:text-slate-200">{name}</span>
        </span>
        <button type="button" onClick={() => setPicking(true)} className="text-indigo-600 dark:text-indigo-400 hover:underline">
          switch
        </button>
        <button type="button" onClick={clear} className="text-slate-400 hover:underline">
          stop tracking
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 text-xs ${className}`}>
      <label className="text-slate-500 dark:text-slate-400">
        {name ? 'Switch to:' : 'Track my progress —'}
      </label>
      <select
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) {
            setName(e.target.value);
            setPicking(false);
          }
        }}
        className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1 text-xs"
      >
        <option value="">Select your name…</option>
        {PGYS.map((pgy) => (
          <optgroup key={pgy} label={pgyLabel(pgy)}>
            {IDENTITIES.filter((m) => m.pgy === pgy).map((m) => (
              <option key={m.name} value={m.name}>{m.name}</option>
            ))}
          </optgroup>
        ))}
      </select>
      {name && (
        <button type="button" onClick={() => setPicking(false)} className="text-slate-400 hover:underline">
          cancel
        </button>
      )}
    </div>
  );
}
