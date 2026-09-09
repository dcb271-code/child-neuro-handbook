'use client';

import { useState } from 'react';
import { useIdentity } from '@/lib/identity/useIdentity';
import { useProgressIdentity } from '@/lib/identity/useProgressIdentity';
import { TEST_MEMBERS } from '@/lib/roster';
import { MAX_PSEUDONYM_LENGTH, MIN_PASSWORD_LENGTH } from '@/lib/progress/identityLimits';

const TEST_NAMES = new Set(TEST_MEMBERS.map((m) => m.name));

/**
 * Opt-in privacy for the resident who has selected their name. Two independent
 * choices, both entirely optional:
 *
 *   - A **display name** replaces the generated cohort letter ("PGY3 · B") that
 *     colleagues see. Cosmetic.
 *   - A **password** stops anyone else selecting your name and reading your
 *     scores, and stops them logging attempts as you. Entered once per device.
 *
 * Kept out of WhoAmI so the picker stays a one-line control; this is a
 * collapsed disclosure beneath it.
 */
export default function PrivacyOptions({ onChange }: { onChange?: () => void }) {
  const { name } = useIdentity();
  const { verified, pseudonym, hasPassword, loaded, refresh } = useProgressIdentity();

  const [open, setOpen] = useState(false);
  const [alias, setAlias] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Nothing to configure until a name is picked, and test/admin identities use
  // the admin password instead.
  if (!name || !loaded || TEST_NAMES.has(name)) return null;

  const isVerified = verified === name;

  async function post(body: Record<string, unknown>, okMsg: string) {
    setBusy(true); setErr(null); setMsg(null);
    try {
      const res = await fetch('/api/progress/identity/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(d.error ?? 'That did not work'); return false; }
      setMsg(okMsg);
      setPw(''); setPw2('');
      await refresh();
      onChange?.();
      return true;
    } catch {
      setErr('Could not reach the server');
      return false;
    } finally {
      setBusy(false);
    }
  }

  const input = 'w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs';
  const btn = 'px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-xs';

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
      >
        {open ? '− ' : '+ '}Privacy options{hasPassword && ' · password set'}
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-3 max-w-md space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Both optional. Colleagues already only see your row as a cohort letter — these change
            what that letter says, and who can select your name.
          </p>

          {/* ── display name ─────────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">
              Display name others see
              {pseudonym && <span className="font-normal text-slate-400"> — currently “{pseudonym}”</span>}
            </label>
            <div className="flex gap-2">
              <input
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                maxLength={MAX_PSEUDONYM_LENGTH}
                placeholder="e.g. Owl"
                className={input}
              />
              <button
                type="button"
                disabled={busy || alias.trim() === ''}
                onClick={() => post({ action: 'pseudonym', name, pseudonym: alias }, 'Display name saved.')}
                className={btn}
              >
                Save
              </button>
            </div>
            {pseudonym && (
              <button
                type="button"
                disabled={busy}
                onClick={() => { setAlias(''); post({ action: 'pseudonym', name, pseudonym: '' }, 'Back to a cohort letter.'); }}
                className="mt-1 text-xs text-slate-400 hover:underline"
              >
                clear and use the cohort letter again
              </button>
            )}
          </div>

          {/* ── password ─────────────────────────────────────────────── */}
          <div className="border-t border-slate-100 dark:border-slate-700/60 pt-3">
            {!hasPassword ? (
              <>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">
                  Set a password (optional)
                </label>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">
                  Stops anyone else picking your name to read your scores or log attempts as you.
                  Something short and memorable is fine — at least {MIN_PASSWORD_LENGTH} characters.
                  You&apos;ll enter it once per device. There is no reset by email; ask an admin to
                  clear it if you forget.
                </p>
                <input
                  type="password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="Password"
                  autoComplete="new-password"
                  className={`${input} mb-2`}
                />
                <button
                  type="button"
                  disabled={busy || pw.length < MIN_PASSWORD_LENGTH}
                  onClick={() => post({ action: 'claim', name, password: pw, pseudonym: alias || undefined }, 'Password set — your scores are now private to you.')}
                  className={btn}
                >
                  Protect my scores
                </button>
              </>
            ) : isVerified ? (
              <>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">
                  Change password
                </label>
                <input
                  type="password" value={pw} onChange={(e) => setPw(e.target.value)}
                  placeholder="Current password" autoComplete="current-password" className={`${input} mb-2`}
                />
                <input
                  type="password" value={pw2} onChange={(e) => setPw2(e.target.value)}
                  placeholder="New password" autoComplete="new-password" className={`${input} mb-2`}
                />
                <button
                  type="button"
                  disabled={busy || pw.length === 0 || pw2.length < MIN_PASSWORD_LENGTH}
                  onClick={() => post({ action: 'change-password', password: pw, newPassword: pw2 }, 'Password changed.')}
                  className={btn}
                >
                  Change
                </button>
              </>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                This name has a password set. Re-select it from the picker and enter the password to
                manage these settings.
              </p>
            )}
          </div>

          {msg && <p className="text-xs text-green-700 dark:text-green-400">{msg}</p>}
          {err && <p className="text-xs text-red-600 dark:text-red-400">{err}</p>}
        </div>
      )}
    </div>
  );
}
