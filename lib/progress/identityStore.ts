// Per-resident progress credentials in Vercel Blob. Same shape and the same
// load-bearing cache-busting as store.ts — read that file before changing it.

import { put, list } from '@vercel/blob';
import type { IdentityRecords } from './identityLimits';

export const IDENTITIES_PATH = 'progress/identities.json';

/**
 * Throws on a read failure rather than returning empty records.
 *
 * Empty records mean "nobody has set a password", which would silently
 * *unprotect* every resident who has. Callers must treat a throw as deny, not
 * as an empty list.
 */
export async function readIdentities(): Promise<IdentityRecords> {
  const { blobs } = await list({ prefix: IDENTITIES_PATH });
  const hit = blobs.find((b) => b.pathname === IDENTITIES_PATH);
  if (!hit) return { residents: [] };

  const bust = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const res = await fetch(`${hit.url}?v=${bust}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`identities fetch failed: ${res.status}`);

  const data = (await res.json()) as Partial<IdentityRecords>;
  return { residents: Array.isArray(data?.residents) ? data.residents : [] };
}

export async function writeIdentities(records: IdentityRecords): Promise<void> {
  await put(IDENTITIES_PATH, JSON.stringify(records), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
  });
}
