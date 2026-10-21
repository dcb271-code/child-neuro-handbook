// A JSON list kept in one Vercel Blob, e.g. { "entries": [...] }. Used by the
// progress attempt log and the Family Points entry log.
//
// Three rules keep writers from destroying each other's data or reading junk:
//   1. Every write goes through updateJsonList, which only overwrites the blob
//      if it is still the version that was read, and otherwise re-reads and
//      re-applies the change. An unguarded read-modify-write loses whichever
//      of two concurrent writers lands first.
//   2. A read feeding a write throws on failure. readJsonList soft-fails to []
//      for display, which is exactly what must never be written back — it
//      would replace the whole log with just the new items.
//   3. The body is read from an immutable, content-addressed copy, never from
//      the overwritten pathname. Blob content URLs sit behind a CDN that keeps
//      serving the previous version of an overwritten pathname for minutes —
//      past max-age, with x-vercel-cache HIT — and nothing bypasses it: it
//      normalises query strings (`?v=…`) and Range headers, and `?cache=0` is
//      rejected on a public store. A writer whose reads kept returning the
//      stale copy burned all its retries in about a second and failed with
//      503, and display reads showed old totals. So each write also stores
//      the body at `<path>.v/<md5>.json`, which is never overwritten and so
//      can never be served stale, and reads find the current md5 through the
//      API-served listing (list() does not go through the CDN).

import { put, list, del, BlobPreconditionFailedError } from '@vercel/blob';
import { createHash } from 'node:crypto';

type Snapshot<T> = { items: T[]; etag: string | null; exists: boolean };

const md5 = (s: string) => createHash('md5').update(s).digest('hex');

/** Where the immutable copy of a given version lives. */
const versionPath = (path: string, hash: string) => `${path}.v/${hash}.json`;

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

/** The Blob API's ETag is the quoted md5 of the body for single-part uploads. */
const hashOfEtag = (etag: string | null) => (etag ? etag.replace(/"/g, '') : null);

async function fetchJson<T>(url: string, path: string, key: string) {
  const bust = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const res = await fetch(`${url}?v=${bust}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${path} fetch ${res.status}`);
  const text = await res.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`${path} malformed`);
  }
  const items = data?.[key];
  if (!Array.isArray(items)) throw new Error(`${path} malformed`);
  return { items: items as T[], etag: strongEtag(res.headers.get('etag')), hash: md5(text) };
}

/** How many times to re-fetch the overwritten pathname when its CDN copy is older than the API's version. */
const STALE_REFETCHES = 3;

async function readSnapshot<T>(path: string, key: string): Promise<Snapshot<T>> {
  const { blobs } = await list({ prefix: path });
  const hit = blobs.find((b) => b.pathname === path);
  if (!hit) return { items: [], etag: null, exists: false };

  // The listing comes from the API, not the CDN, so its ETag is the current
  // version. (Older SDK typings omit it; treat it as optional.)
  const current = strongEtag((hit as { etag?: string }).etag ?? null);
  const hash = hashOfEtag(current);

  // Preferred: the immutable copy of exactly the version the API reports.
  const copy = hash ? blobs.find((b) => b.pathname === versionPath(path, hash)) : undefined;
  if (copy) {
    try {
      const got = await fetchJson<T>(copy.url, path, key);
      if (got.hash === hash) return { items: got.items, etag: current, exists: true };
      console.warn(`[blob] ${path}: versioned copy ${hash} did not hash to its name; falling back`);
    } catch (err) {
      console.warn(`[blob] ${path}: versioned copy ${hash} unreadable; falling back:`, err);
    }
  }

  // Fallback (no copy yet — first write after this code shipped — or it was
  // just cleaned up under a concurrent reader): the overwritten pathname. Its
  // CDN copy may be stale; re-fetch a few times while the body's ETag differs
  // from the API's, then return what we have. A display read then shows
  // slightly old data; a write built on it carries the stale ETag and is
  // rejected by the conditional put rather than clobbering the newer version.
  for (let i = 0; ; i++) {
    const got = await fetchJson<T>(hit.url, path, key);
    const stale = current !== null && got.etag !== null && got.etag !== current;
    if (!stale || i >= STALE_REFETCHES) {
      if (stale) console.warn(`[blob] ${path}: CDN copy still stale after ${i + 1} reads`);
      return { items: got.items, etag: got.etag, exists: true };
    }
    await new Promise((r) => setTimeout(r, 150 * (i + 1)));
  }
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

/** Remove immutable copies of superseded versions. Best effort; a reader mid-fetch falls back. */
async function pruneVersions(path: string, keepHash: string): Promise<void> {
  try {
    const { blobs } = await list({ prefix: `${path}.v/` });
    const old = blobs.filter((b) => b.pathname !== versionPath(path, keepHash)).map((b) => b.url);
    if (old.length) await del(old);
  } catch (err) {
    console.warn(`[blob] ${path}: could not prune old versions:`, err);
  }
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

    const body = JSON.stringify({ [key]: next });
    const hash = md5(body);
    const common = { access: 'public', addRandomSuffix: false, contentType: 'application/json' } as const;

    try {
      // The immutable copy goes first so that, the moment the pointer below
      // lands, readers can already fetch exactly that version. Same name means
      // same bytes, so overwriting it is harmless.
      await put(versionPath(path, hash), body, {
        ...common,
        allowOverwrite: true,
        cacheControlMaxAge: 31536000, // content-addressed: safe to cache for good
      });
      const written = await put(path, body, {
        ...common,
        cacheControlMaxAge: 60, // minimum the API allows
        // No blob yet: create-only, so two first writers can't both win.
        // No ETag from the read: fall back to an unconditional overwrite rather
        // than refusing every write.
        ...(snap.exists
          ? { allowOverwrite: true, ...(snap.etag ? { ifMatch: snap.etag } : {}) }
          : { allowOverwrite: false }),
      });
      if (snap.exists && !snap.etag) console.warn(`[blob] no ETag on ${path} read; wrote unconditionally`);
      if (hashOfEtag(strongEtag(written.etag ?? null)) !== hash) {
        // Reads would stop finding the versioned copy and fall back to the
        // CDN path. Still correct, just slower and possibly stale.
        console.warn(`[blob] ${path}: API ETag ${written.etag} is not the body md5; versioned reads disabled`);
      }
      await pruneVersions(path, hash);
      return next;
    } catch (err) {
      if (!isConflict(err) || attempt >= MAX_TRIES) throw err;
      // Jittered backoff so colliding writers don't re-collide in lockstep.
      await new Promise((r) => setTimeout(r, 50 * attempt + Math.random() * 150));
    }
  }
}
