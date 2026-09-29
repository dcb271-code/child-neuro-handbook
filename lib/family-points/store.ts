// Entry log persistence in Vercel Blob. The concurrency and cache-busting
// rules live in lib/blob/jsonList.ts — read its header before adding another
// way to write this blob.

import { readJsonList, updateJsonList } from '@/lib/blob/jsonList';
import type { Entry } from './calculator';

export const ENTRIES_PATH = 'family-points/entries.json';

/** For display. Soft-fails to []. */
export function readEntries(): Promise<Entry[]> {
  return readJsonList<Entry>(ENTRIES_PATH, 'entries');
}

/** Throws on failure. */
export async function appendEntries(added: Entry[]): Promise<void> {
  await updateJsonList<Entry>(ENTRIES_PATH, 'entries', (current) => [...current, ...added]);
}

/** Resolves false if no entry has that id. Throws on failure. */
export async function deleteEntry(id: string): Promise<boolean> {
  const result = await updateJsonList<Entry>(ENTRIES_PATH, 'entries', (current) => {
    const next = current.filter((e) => e.id !== id);
    return next.length === current.length ? null : next;
  });
  return result !== null;
}

export function newEntryId(): string {
  return 'fpe_' + Date.now().toString(36) + Math.random().toString(16).slice(2, 8);
}
