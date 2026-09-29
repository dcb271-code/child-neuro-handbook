// Quiz-attempt log persistence in Vercel Blob. The concurrency and
// cache-busting rules live in lib/blob/jsonList.ts — read its header before
// adding another way to write this blob.

import { readJsonList, updateJsonList } from '@/lib/blob/jsonList';
import type { Attempt } from './calculator';

export const ATTEMPTS_PATH = 'progress/attempts.json';

/** For display. Soft-fails to []. */
export function readAttempts(): Promise<Attempt[]> {
  return readJsonList<Attempt>(ATTEMPTS_PATH, 'attempts');
}

/**
 * Appends to the log; returns how many were written. Throws on failure — the
 * caller must report it rather than claim success.
 *
 * `batchId` makes a client retry idempotent: if a previous request with the
 * same id already landed (its response was lost), nothing is appended twice.
 */
export async function appendAttempts(added: Attempt[], batchId?: string): Promise<number> {
  const result = await updateJsonList<Attempt>(ATTEMPTS_PATH, 'attempts', (current) =>
    batchId && current.some((a) => a.batch === batchId) ? null : [...current, ...added],
  );
  return result === null ? 0 : added.length;
}

export function newAttemptId(): string {
  return 'pa_' + Date.now().toString(36) + Math.random().toString(16).slice(2, 8);
}
