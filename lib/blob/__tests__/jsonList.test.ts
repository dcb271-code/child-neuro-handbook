import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';
import type { Attempt } from '@/lib/progress/calculator';
import type { Entry } from '@/lib/family-points/calculator';

// In-memory stand-in for the Blob store. Objects are keyed by pathname; the
// API's ETag is the quoted md5 of the body, as in production. The CDN in
// front of an *overwritten* pathname can lag: `staleReads` makes fetches of
// such a path serve the previous body (and its ETag) that many times.
// Content-addressed copies (`<path>.v/<md5>.json`) are never overwritten and
// so never stale.
type Obj = { body: string; prev: string | null };
const md5 = (s: string) => `"${createHash('md5').update(s).digest('hex')}"`;
const store = vi.hoisted(() => ({
  objs: new Map<string, Obj>(),
  staleReads: 0,
  failFetch: false,
  weakEtags: false, // serve W/"…" validators, as the real CDN does to Node's fetch
  noVersions: false, // simulate a store written before versioned copies existed
}));

vi.mock('@vercel/blob', () => {
  class BlobPreconditionFailedError extends Error {}
  return {
    BlobPreconditionFailedError,
    list: async ({ prefix }: { prefix: string }) => ({
      blobs: [...store.objs.entries()]
        .filter(([p]) => p.startsWith(prefix))
        .map(([p, o]) => ({ pathname: p, url: `https://x.blob/${p}`, etag: md5(o.body) })),
    }),
    put: async (path: string, body: string, opts: { ifMatch?: string; allowOverwrite?: boolean }) => {
      const cur = store.objs.get(path);
      if (opts.allowOverwrite === false && cur) throw new Error('This blob already exists');
      if (opts.ifMatch && opts.ifMatch !== md5(cur?.body ?? '')) throw new BlobPreconditionFailedError();
      if (store.noVersions && path.includes('.v/')) return { etag: md5(body) };
      store.objs.set(path, { body, prev: cur?.body ?? null });
      return { etag: md5(body) };
    },
    del: async (urls: string[]) => {
      for (const u of urls) store.objs.delete(new URL(u).pathname.slice(1));
    },
  };
});

vi.stubGlobal('fetch', async (url: string) => {
  if (store.failFetch) return new Response('boom', { status: 500 });
  const path = new URL(url).pathname.slice(1);
  const obj = store.objs.get(path);
  if (!obj) return new Response('gone', { status: 404 });
  let body = obj.body;
  if (!path.includes('.v/') && store.staleReads > 0 && obj.prev !== null) {
    store.staleReads -= 1;
    body = obj.prev;
  }
  const etag = `${store.weakEtags ? 'W/' : ''}${md5(body)}`;
  return new Response(body, { status: 200, headers: { etag } });
});

const { appendAttempts, readAttempts } = await import('@/lib/progress/store');
const { appendEntries, deleteEntry, readEntries } = await import('@/lib/family-points/store');

const att = (id: string, batch?: string): Attempt => ({
  id, member: 'X', quiz: 'daily', questionId: id, correct: true, createdAt: 0, ...(batch ? { batch } : {}),
});
const entry = (id: string): Entry => ({ id, member: 'X', taskId: 't', month: 'September', count: 1, createdAt: 0 });
const ids = (xs: { id: string }[]) => xs.map((x) => x.id).sort();
const versionPaths = () => [...store.objs.keys()].filter((p) => p.includes('.v/'));

beforeEach(() => {
  store.objs.clear();
  store.staleReads = 0;
  store.failFetch = false;
  store.weakEtags = false;
  store.noVersions = false;
});

describe('progress attempts', () => {
  it('keeps both batches when two submits race', async () => {
    await appendAttempts([att('seed')]);
    await Promise.all([appendAttempts([att('a')]), appendAttempts([att('b')])]);
    expect(ids(await readAttempts())).toEqual(['a', 'b', 'seed']);
  });

  it('keeps both batches when two submits race on an empty store', async () => {
    await Promise.all([appendAttempts([att('a')]), appendAttempts([att('b')])]);
    expect(ids(await readAttempts())).toEqual(['a', 'b']);
  });

  it('does not build on a stale CDN copy', async () => {
    await appendAttempts([att('one')]);
    await appendAttempts([att('two')]);
    store.staleReads = 10; // the overwritten pathname is stuck on ['one'] for good
    await appendAttempts([att('three')]);
    expect(ids(await readAttempts())).toEqual(['one', 'three', 'two']);
  });

  it('throws instead of wiping the log when the read fails', async () => {
    await appendAttempts([att('keep')]);
    store.failFetch = true;
    await expect(appendAttempts([att('new')])).rejects.toThrow();
    store.failFetch = false;
    expect(ids(await readAttempts())).toEqual(['keep']);
  });

  it('drops a retried batch that already landed', async () => {
    await appendAttempts([att('a', 'batch-123456')], 'batch-123456');
    expect(await appendAttempts([att('a2', 'batch-123456')], 'batch-123456')).toBe(0);
    expect(await readAttempts()).toHaveLength(1);
  });
});

describe('versioned copies', () => {
  it('reads the current version even when the CDN never catches up', async () => {
    // Seen in production: minutes after a write, the overwritten pathname
    // still served the previous body with x-vercel-cache HIT.
    await appendEntries([entry('one')]);
    await appendEntries([entry('two')]);
    store.staleReads = 10;
    expect(ids(await readEntries())).toEqual(['one', 'two']);
  });

  it('keeps exactly one immutable copy, of the current version', async () => {
    await appendEntries([entry('a')]);
    await appendEntries([entry('b')]);
    await deleteEntry('a');
    const current = store.objs.get('family-points/entries.json')!.body;
    expect(versionPaths()).toEqual([
      `family-points/entries.json.v/${md5(current).replace(/"/g, '')}.json`,
    ]);
  });

  it('falls back to the overwritten pathname when no copy exists', async () => {
    store.noVersions = true;
    await appendEntries([entry('a')]);
    await appendEntries([entry('b')]);
    expect(versionPaths()).toEqual([]);
    store.staleReads = 1; // first read is stale, the re-fetch is fresh
    expect(ids(await readEntries())).toEqual(['a', 'b']);
  });

  it('still refuses to build on a stale copy in the fallback path', async () => {
    store.noVersions = true;
    await appendEntries([entry('one')]);
    await appendEntries([entry('two')]);
    store.staleReads = 1;
    await appendEntries([entry('three')]);
    expect(ids(await readEntries())).toEqual(['one', 'three', 'two']);
  });
});

describe('etag handling', () => {
  it('writes when the CDN serves a weak validator', async () => {
    // Regression: production rejected every write with "ETag mismatch"
    // because W/"…" was passed through to ifMatch verbatim.
    store.noVersions = true; // force the fallback path, where the header ETag is used
    store.weakEtags = true;
    await appendEntries([entry('a')]);
    await appendEntries([entry('b')]);
    expect(ids(await readEntries())).toEqual(['a', 'b']);
  });

  it('still refuses a stale copy when validators are weak', async () => {
    store.noVersions = true;
    store.weakEtags = true;
    await appendEntries([entry('one')]);
    await appendEntries([entry('two')]);
    store.staleReads = 1;
    await appendEntries([entry('three')]);
    expect(ids(await readEntries())).toEqual(['one', 'three', 'two']);
  });
});

describe('family points entries', () => {
  it('keeps both entries when two submits race', async () => {
    await appendEntries([entry('seed')]);
    await Promise.all([appendEntries([entry('a')]), appendEntries([entry('b')])]);
    expect(ids(await readEntries())).toEqual(['a', 'b', 'seed']);
  });

  it('a delete racing an add loses neither change', async () => {
    await appendEntries([entry('gone'), entry('stay')]);
    const [found] = await Promise.all([deleteEntry('gone'), appendEntries([entry('new')])]);
    expect(found).toBe(true);
    expect(ids(await readEntries())).toEqual(['new', 'stay']);
  });

  it('reports a missing id without writing', async () => {
    await appendEntries([entry('a')]);
    expect(await deleteEntry('nope')).toBe(false);
  });

  it('throws instead of wiping the log when the read fails', async () => {
    await appendEntries([entry('keep')]);
    store.failFetch = true;
    await expect(appendEntries([entry('new')])).rejects.toThrow();
    await expect(deleteEntry('keep')).rejects.toThrow();
    store.failFetch = false;
    expect(ids(await readEntries())).toEqual(['keep']);
  });
});
