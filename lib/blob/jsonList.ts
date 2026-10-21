// A JSON list kept in one Vercel Blob, e.g. { "entries": [...] }. Used by the
// progress attempt log and the Family Points entry log.
//
// Two rules keep writers from destroying each other's data:
//   1. Every write goes through updateJsonList, which only overwrites the blob
//      if it is still the version that was read, and otherwise re-reads and
//      re-applies the change. An unguarded read-modify-write loses whichever
//      of two concurrent writers lands first.
//   2. A read feeding a write throws on failure. readJsonList soft-fails to []
//      for display, which is exactly what must never be written back — it
//      would replace the whole log with just the new items.

import { put, list, BlobPreconditionFailedError } from '@vercel/blob';

type Snapshot<T> = { items: T[]; etag: string | null; exists: boolean };

async function readSnapshot<T>(path: string, key: string): Promise<Snapshot<T>> {
  const { blobs } = await list({ prefix: path });
  const hit = blobs.find((b) => b.pathname === path);
  if (!hit) return { items: [], etag: null, exists: false };
  // The pathname is stable across overwrites and Blob content URLs sit behind
  // a CDN, so a read after a write can return the previous list. `uploadedAt`
  // is NOT a usable version stamp — it does not reliably change on overwrite.
  // A token that is unique per request forces an origin fetch every time.
  // `cache: 'no-store'` alone only bypasses Next's cache, not the CDN's.
  const bust = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const res = await fetch(`${hit.url}?v=${bust}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${path} fetch ${res.status}`);
  const data = (await res.json()) as Record<string, unknown>;
  const items = data?.[key];
  if (!Array.isArray(items)) throw new Error(`${path} malformed`);
  // The ETag comes from the same response as the body (as the SDK's get()
  // does it), so a stale CDN copy carries a stale ETag and the conditional
  // write rejects it instead of clobbering newer data.
  return { items: items as T[], etag: strongEtag(res.headers.get('etag')), exists: true };
}

/**
 * The CDN serves a weak validator (`W/"…"`) to Node's fetch — it negotiates
 * content encoding, and curl gets the strong form for the same object. The
 * Blob API compares `ifMatch` against the strong ETag only, so the weak prefix
 * made every conditional write fail with "ETag mismatch" in production.
 */
export function strongEtag(header: string | null): string | null {
  if (!header) return null;
  return header.replace(/^W\//i, '');
}

/** For display only. Soft-fails to [] — never feed this into a write. */
export async function readJsonList<T>(path: string, key: string): Promise<T[]> {
  try {
    return (await readSnapshot<T>(path, key)).items;
  } catch (err) {
    console.error(`[blob] read ${path} failed:`, err);
    return [];
  }
}

const MAX_TRIES = 6;

function isConflict(err: unknown): boolean {
  if (err instanceof BlobPreconditionFailedError) return true;
  // First-ever write races surface as "already exists" rather than a 412.
  return err instanceof Error && /already exists/i.test(err.message);
}

/**
 * Applies `mutate` to the current list and writes the result, retrying on a
 * concurrent write. `mutate` may run more than once, each time on the latest
 * list, so it must be a pure function of its input. Returning null skips the
 * write (e.g. nothing to delete) and resolves null. Throws if the list can't
 * be read or the retries run out.
 */
export async function updateJsonList<T>(
  path: string,
  key: string,
  mutate: (items: T[]) => T[] | null,
): Promise<T[] | null> {
  for (let attempt = 1; ; attempt++) {
    const snap = await readSnapshot<T>(path, key);
    const next = mutate(snap.items);
    if (next === null) return null;

    try {
      await put(path, JSON.stringify({ [key]: next }), {
        access: 'public',
        addRandomSuffix: false,
        contentType: 'application/json',
        cacheControlMaxAge: 60, // minimum the API allows; the ?v= stamp does the real work
        // No blob yet: create-only, so two first writers can't both win.
        // No ETag from the CDN: fall back to an unconditional overwrite rather
        // than refusing every write.
        ...(snap.exists
          ? { allowOverwrite: true, ...(snap.etag ? { ifMatch: snap.etag } : {}) }
          : { allowOverwrite: false }),
      });
      if (snap.exists && !snap.etag) console.warn(`[blob] no ETag on ${path} read; wrote unconditionally`);
      return next;
    } catch (err) {
      if (!isConflict(err) || attempt >= MAX_TRIES) throw err;
      // Jittered backoff so colliding writers don't re-collide in lockstep.
      await new Promise((r) => setTimeout(r, 50 * attempt + Math.random() * 150));
    }
  }
}
