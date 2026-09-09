'use client';

import { useCallback, useEffect, useState } from 'react';

export type ProgressIdentityState = {
  /** Resident this browser has proved a password for, if any. */
  verified: string | null;
  /** Names that require a password to select or view. */
  protectedNames: string[];
  /** The verified resident's chosen pseudonym. */
  pseudonym: string | null;
  hasPassword: boolean;
};

const EMPTY: ProgressIdentityState = {
  verified: null,
  protectedNames: [],
  pseudonym: null,
  hasPassword: false,
};

/**
 * Server-held identity state for the progress board: who this browser is
 * verified as and which names are locked. Distinct from `useIdentity`, which is
 * only the locally remembered name — this is the half the server enforces.
 */
export function useProgressIdentity() {
  const [state, setState] = useState<ProgressIdentityState>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/progress/identity/', { cache: 'no-store' });
      if (!res.ok) {
        setState(EMPTY);
        return;
      }
      const d = await res.json();
      setState({
        verified: d.verified ?? null,
        protectedNames: Array.isArray(d.protected) ? d.protected : [],
        pseudonym: d.pseudonym ?? null,
        hasPassword: !!d.hasPassword,
      });
    } catch {
      setState(EMPTY);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { ...state, loaded, refresh };
}
