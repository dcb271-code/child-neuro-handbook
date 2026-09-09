'use client';

import { useState } from 'react';
import { IDENTITIES, TEST_MEMBERS, pgyLabel, comparePgy } from '@/lib/roster';
import { useIdentity } from '@/lib/identity/useIdentity';
import { useProgressIdentity } from '@/lib/identity/useProgressIdentity';

const PGYS = [...new Set(IDENTITIES.map((m) => m.pgy))].sort(comparePgy);
const TEST_NAMES = new Set(TEST_MEMBERS.map((m) => m.name));

type Pending =
  | { kind: 'switch'; name: string }    // resident -> different resident
  | { kind: 'admin'; name: string }     // selecting a test/admin identity
  | { kind: 'password'; name: string }  // resident who set their own password
  | null;

/**
 * Compact "who are you" status + picker, on the board review screen so attempts
 * can be attributed to a resident. Never blocks use of a quiz — picking a name
 * is optional; unset means "don't track me".
 *
 * Two deliberate bits of friction, both about the progress board rather than
 * about tracking:
 *
 *   - Switching from one resident to another asks you to type the new name.
 *     Since your own row is the only one shown unredacted, flipping the
 *     dropdown was otherwise a way to read someone else's scores.
 *   - Selecting a test/admin identity needs the admin password, which is what
 *     actually unlocks the by-name view of everyone (see progress/adminAuth.ts).
 *     Being *named* BrockTest grants nothing on its own.
 */
export default function WhoAmI({ className = '', onIdentityChange }: {
  className?: string;
  onIdentityChange?: () => void;
}) {
  const { name, loaded, setName, clear } = useIdentity();
  const { protectedNames, refresh } = useProgressIdentity();
  const [picking, setPicking] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loaded) return null;

  function reset() {
    setPending(null);
    setTyped('');
    setError(null);
    setPicking(false);
  }

  function choose(next: string) {
    if (!next || next === name) return;
    setError(null);
    setTyped('');
    if (TEST_NAMES.has(next)) setPending({ kind: 'admin', name: next });
    // A resident who set a password must enter it — this is the whole point of
    // the opt-in, and it takes precedence over the type-the-name friction.
    else if (protectedNames.includes(next)) setPending({ kind: 'password', name: next });
    else if (name) setPending({ kind: 'switch', name: next });
    else { setName(next); reset(); onIdentityChange?.(); }
  }

  async function confirmPassword() {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/progress/identity/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', name: pending.name, password: typed }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? 'Incorrect password');
        return;
      }
      setName(pending.name);
      reset();
      await refresh();
      onIdentityChange?.();
    } catch {
      setError('Could not reach the server');
    } finally {
      setBusy(false);
    }
  }

  function confirmSwitch() {
    if (!pending) return;
    if (typed.trim().toLowerCase() !== pending.name.toLowerCase()) {
      setError('That does not match the name you selected.');
      return;
    }
    // Stepping down from an admin identity gives up the admin view too.
    fetch('/api/progress/admin/', { method: 'DELETE' }).catch(() => {});
    fetch('/api/progress/identity/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'signout' }),
    }).catch(() => {});
    setName(pending.name);
    reset();
    onIdentityChange?.();
  }

  async function confirmAdmin() {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/progress/admin/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: typed }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? 'Incorrect password');
        return;
      }
      setName(pending.name);
      reset();
      onIdentityChange?.();
    } catch {
      setError('Could not reach the server');
    } finally {
      setBusy(false);
    }
  }

  // ── confirmation step ───────────────────────────────────────────────
  if (pending) {
    const isAdmin = pending.kind === 'admin';
    const isOwnPassword = pending.kind === 'password';
    const secret = isAdmin || isOwnPassword;
    const submit = isAdmin ? confirmAdmin : isOwnPassword ? confirmPassword : confirmSwitch;
    return (
      <div className={`text-xs ${className}`}>
        <div className="inline-block text-left rounded-lg border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-900/20 p-3 max-w-sm">
          <p className="text-slate-700 dark:text-slate-200 mb-2">
            {isAdmin ? (
              <>Enter the admin password to track as <strong>{pending.name}</strong> and see all residents by name.</>
            ) : isOwnPassword ? (
              <><strong>{pending.name}</strong> has set a password on this site. Enter it to track as them.</>
            ) : (
              <>
                Switching to <strong>{pending.name}</strong> will attribute future attempts to them and
                show their scores instead of yours. Type the name to confirm.
              </>
            )}
          </p>
          <input
            // Remount when the mode changes so a typed name never survives
            // into the password field (or vice versa).
            key={pending.kind}
            type={secret ? 'password' : 'text'}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            placeholder={isAdmin ? 'Admin password' : isOwnPassword ? 'Your password' : pending.name}
            autoComplete={secret ? 'current-password' : 'off'}
            className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs mb-2"
          />
          {error && <p className="text-red-600 dark:text-red-400 mb-2">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={submit}
              className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium"
            >
              {busy ? 'Checking…' : 'Confirm'}
            </button>
            <button type="button" onClick={reset} className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── current identity ────────────────────────────────────────────────
  if (name && !picking) {
    return (
      <div className={`flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 ${className}`}>
        <span>
          Tracking progress as <span className="font-medium text-slate-700 dark:text-slate-200">{name}</span>
        </span>
        <button type="button" onClick={() => setPicking(true)} className="text-indigo-600 dark:text-indigo-400 hover:underline">
          switch
        </button>
        <button
          type="button"
          onClick={() => {
            fetch('/api/progress/admin/', { method: 'DELETE' }).catch(() => {});
            fetch('/api/progress/identity/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'signout' }),
            }).catch(() => {});
            clear();
            refresh();
            onIdentityChange?.();
          }}
          className="text-slate-400 hover:underline"
        >
          stop tracking
        </button>
      </div>
    );
  }

  // ── picker ──────────────────────────────────────────────────────────
  return (
    <div className={`flex items-center gap-2 text-xs ${className}`}>
      <label className="text-slate-500 dark:text-slate-400">
        {name ? 'Switch to:' : 'Track my progress —'}
      </label>
      <select
        value=""
        onChange={(e) => choose(e.target.value)}
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
        <button type="button" onClick={reset} className="text-slate-400 hover:underline">
          cancel
        </button>
      )}
    </div>
  );
}
