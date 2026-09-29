import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Attempt } from '@/lib/progress/calculator';
import type { Entry } from '@/lib/family-points/calculator';

// In-memory stand-in for Blob pathnames with ETag semantics.
type Obj = { body: string; version: number; prev: { body: string; version: number } | null };
const store = vi.hoisted(() => ({
  objs: new Map<string, Obj>(),
  staleReads: 0, // serve the previous body+etag this many times, like a lagging CDN
  failFetch: false,
}));

vi.mock('@vercel/blob', () => {
  class BlobPreconditionFailedError extends Error {}
  return {
    BlobPreconditionFailedError,
    list: async ({ prefix }: { prefix: string }) => ({
      blobs: store.objs.has(prefix) ? [{ pathname: prefix, url: `https://x.blob/${prefix}` }] : [],
    }),
    put: async (path: string, body: string, opts: { ifMatch?: string; allowOverwrite?: boolean }) => {
      const cur = store.objs.get(path);
      if (opts.allowOverwrite === false && cur) throw new Error('This blob already exists');
      if (opts.ifMatch && opts.ifMatch !== `"v${cur?.version}"`) throw new BlobPreconditionFailedError();
      store.objs.set(path, {
        body,
        version: (cur?.version ?? 0) + 1,
        prev: cur ? { body: cur.body, version: cur.version } : null,
      });
      return {};
    },
  };
});

vi.stubGlobal('fetch', async (url: string) => {
  if (store.failFetch) return new Response('boom', { status: 500 });
  const obj = store.objs.get(new URL(url).pathname.slice(1))!;
  let { body, version } = obj;
  if (store.staleReads > 0 && obj.prev) {
    store.staleReads -= 1;
    ({ body, version } = obj.prev);
  }
  return new Response(body, { status: 200, headers: { etag: `"v${version}"` } });
});

const { appendAttempts, readAttempts } = await import('@/lib/progress/store');
const { appendEntries, deleteEntry, readEntries } = await import('@/lib/family-points/store');

const att = (id: string, batch?: string): Attempt => ({
  id, member: 'X', quiz: 'daily', questionId: id, correct: true, createdAt: 0, ...(batch ? { batch } : {}),
});
const entry = (id: string): Entry => ({ id, member: 'X', taskId: 't', month: 'September', count: 1, createdAt: 0 });
const ids = (xs: { id: string }[]) => xs.map((x) => x.id).sort();

beforeEach(() => {
  store.objs.clear();
  store.staleReads = 0;
  store.failFetch = false;
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
    store.staleReads = 1; // next read sees only ['one'] with its old etag
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
