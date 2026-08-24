// Entry log persistence in Vercel Blob, following the resources metadata pattern.

import { put, list } from '@vercel/blob';
import type { Entry } from './calculator';

export const ENTRIES_PATH = 'family-points/entries.json';

export async function readEntries(): Promise<Entry[]> {
  try {
    // list+fetch pattern — Blob has no direct GET-by-path
    const { blobs } = await list({ prefix: ENTRIES_PATH });
    const hit = blobs.find((b) => b.pathname === ENTRIES_PATH);
    if (!hit) return [];
    // The pathname is stable across overwrites and Blob content URLs are
    // CDN-cached, so a read straight after a write otherwise returns the
    // previous list. `uploadedAt` changes on every put — use it as a version
    // stamp so each revision is a distinct URL. `cache: 'no-store'` alone only
    // bypasses Next's cache, not the CDN's.
    const stamp = hit.uploadedAt ? new Date(hit.uploadedAt).getTime() : Date.now();
    const res = await fetch(`${hit.url}?v=${stamp}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = (await res.json()) as { entries?: Entry[] };
    return Array.isArray(data?.entries) ? data.entries : [];
  } catch (err) {
    console.error('[family-points] readEntries failed:', err);
    return [];
  }
}

export async function writeEntries(entries: Entry[]): Promise<void> {
  await put(ENTRIES_PATH, JSON.stringify({ entries }), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60, // minimum the API allows; the ?v= stamp does the real work
  });
}

export function newEntryId(): string {
  return 'fpe_' + Date.now().toString(36) + Math.random().toString(16).slice(2, 8);
}
