// Quiz-attempt log persistence in Vercel Blob. Same pattern as
// family-points/store.ts — including the cache-busting, which is load-bearing:
// see the comment inline before changing it.

import { put, list } from '@vercel/blob';
import type { Attempt } from './calculator';

export const ATTEMPTS_PATH = 'progress/attempts.json';

export async function readAttempts(): Promise<Attempt[]> {
  try {
    const { blobs } = await list({ prefix: ATTEMPTS_PATH });
    const hit = blobs.find((b) => b.pathname === ATTEMPTS_PATH);
    if (!hit) return [];
    // Cache-bust per request — the pathname is stable across overwrites and
    // Blob content URLs sit behind a CDN. See family-points/store.ts for why
    // `uploadedAt` doesn't work as a version stamp and `cache: 'no-store'`
    // alone isn't enough.
    const bust = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const res = await fetch(`${hit.url}?v=${bust}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = (await res.json()) as { attempts?: Attempt[] };
    return Array.isArray(data?.attempts) ? data.attempts : [];
  } catch (err) {
    console.error('[progress] readAttempts failed:', err);
    return [];
  }
}

export async function writeAttempts(attempts: Attempt[]): Promise<void> {
  await put(ATTEMPTS_PATH, JSON.stringify({ attempts }), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
  });
}

export function newAttemptId(): string {
  return 'pa_' + Date.now().toString(36) + Math.random().toString(16).slice(2, 8);
}
