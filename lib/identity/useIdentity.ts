'use client';

import { useCallback, useEffect, useState } from 'react';
import { identityByName } from '@/lib/roster';
import { parseNameCookie } from './cookie';

const STORAGE_KEY = 'neuro-identity';

/**
 * "Who are you" — not authentication. A resident picks their name once; it's
 * remembered in this browser so quiz attempts can be attributed without a
 * password. Anyone could pick anyone's name; that's an accepted tradeoff for
 * a low-stakes internal tool, matching how Family Points already works
 * (pick-your-name entry, no per-person login).
 *
 * Stored in localStorage *and* a server-set cookie. Safari wipes localStorage
 * after seven days without a visit, which left a resident silently untracked
 * for a month; the cookie survives that and re-seeds localStorage. See
 * lib/identity/cookie.ts.
 */
export function useIdentity() {
  const [name, setNameState] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      // localStorage unavailable (private mode, etc.)
    }
    if (!stored || !identityByName(stored)) {
      // localStorage empty or wiped: fall back to the cookie and restore it.
      const fromCookie = parseNameCookie(typeof document === 'undefined' ? null : document.cookie);
      stored = fromCookie && identityByName(fromCookie) ? fromCookie : null;
      if (stored) {
        try {
          localStorage.setItem(STORAGE_KEY, stored);
        } catch {}
      }
    }
    if (stored) {
      setNameState(stored);
      // Names picked before the cookie existed live only in localStorage, one
      // Safari purge from being lost. Back them up the first time we see one.
      const cookieName = parseNameCookie(typeof document === 'undefined' ? null : document.cookie);
      if (cookieName !== stored) {
        fetch('/api/identity/', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: stored }),
          keepalive: true,
        }).catch(() => {});
      }
    }
    setLoaded(true);
  }, []);

  const setName = useCallback((next: string) => {
    if (!identityByName(next)) return;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    setNameState(next);
    // Best effort; localStorage already holds the name for this session.
    fetch('/api/identity/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: next }),
      keepalive: true,
    }).catch(() => {});
  }, []);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setNameState(null);
    fetch('/api/identity/', { method: 'DELETE', keepalive: true }).catch(() => {});
  }, []);

  return { name, loaded, setName, clear };
}
