'use client';

import { useCallback, useEffect, useState } from 'react';
import { memberByName } from '@/lib/roster';

const STORAGE_KEY = 'neuro-identity';

/**
 * "Who are you" — not authentication. A resident picks their name once; it's
 * remembered in this browser via localStorage so quiz attempts can be
 * attributed without a password. Anyone could pick anyone's name; that's an
 * accepted tradeoff for a low-stakes internal tool, matching how Family
 * Points already works (pick-your-name entry, no per-person login).
 */
export function useIdentity() {
  const [name, setNameState] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && memberByName(stored)) setNameState(stored);
    } catch {
      // localStorage unavailable (private mode, etc.) — stay anonymous
    }
    setLoaded(true);
  }, []);

  const setName = useCallback((next: string) => {
    if (!memberByName(next)) return;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    setNameState(next);
  }, []);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setNameState(null);
  }, []);

  return { name, loaded, setName, clear };
}
