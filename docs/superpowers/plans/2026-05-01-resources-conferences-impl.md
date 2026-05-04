# Resources & Conferences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Resources & Conferences" section to the handbook so authorized users can upload and curate teaching files (PDFs, slide decks, Word docs, images) and external links directly through the browser.

**Architecture:** Convert the site from `output: 'export'` to a hosted Next.js app on Vercel so we can run API routes. Store uploads in Vercel Blob, gate writes with a shared password + HMAC-signed cookie, and persist External Links + custom file titles in a single `_metadata.json` blob. Public reads happen via the page's server component; mutations go through `/api/resources/*` routes.

**Tech Stack:** Next.js 14 (server + client components, route handlers), TypeScript, Tailwind, `@vercel/blob` SDK, Node `crypto` for HMAC, `vitest` for unit tests.

**Source spec:** `docs/superpowers/specs/2026-04-29-resources-conferences-design.md` — implement to that spec; this plan only re-states what the engineer needs to act on.

---

## File Structure

**New files**

| File | Responsibility |
|---|---|
| `lib/resources/validation.ts` | Pure validators: MIME allowlist, size, subsection, URL, label/title |
| `lib/resources/auth.ts` | `signCookie()`, `verifyCookie()`, `requireAuth()` — HMAC sign/verify of `<expiry>.<sig>` |
| `lib/resources/metadata.ts` | `slugify()`, `resolveTitle()`, `readMetadata()`, `writeMetadata()` |
| `lib/resources/__tests__/validation.test.ts` | Unit tests |
| `lib/resources/__tests__/auth.test.ts` | Unit tests |
| `lib/resources/__tests__/metadata.test.ts` | Unit tests for `slugify`, `resolveTitle` |
| `app/api/resources/auth/route.ts` | `POST` — verify password, set cookie |
| `app/api/resources/logout/route.ts` | `POST` — clear cookie |
| `app/api/resources/upload/route.ts` | `POST` — multipart upload to Blob |
| `app/api/resources/file/route.ts` | `DELETE` — remove file blob + scrub `fileTitles` entry |
| `app/api/resources/links/route.ts` | `POST` (add) + `DELETE` (remove) — mutate `_metadata.json` `links` |
| `app/resources/page.tsx` | Server component — list blobs, read metadata, render four subsections |
| `components/resources/AuthBar.tsx` | Server component — renders login / logout state |
| `components/resources/LoginModal.tsx` | Client — password modal |
| `components/resources/UploadDropzone.tsx` | Client — drag/drop + browse + title prompt + progress |
| `components/resources/AddLinkModal.tsx` | Client — link URL + label modal |
| `components/resources/FileCard.tsx` | Server component — preview + actions; delete button only if `authed` |
| `components/resources/LinkCard.tsx` | Server component — link card; delete button only if `authed` |

**Modified files**

| File | Change |
|---|---|
| `next.config.mjs` | Remove `output: 'export'` |
| `package.json` | Add `@vercel/blob`; add `vitest` (devDep); add `test` and `test:run` scripts |
| `app/page.tsx` | Insert horizontal Resources feature card; add `'resources'` to `accentMap` |
| `app/globals.css` | Add styles for `.resources-dropzone`, `.resources-modal`, `.resources-auth-bar` |

**Testing approach (pragmatic deviation from full TDD):** This codebase has zero existing test infrastructure. We add `vitest` and use TDD only for the security-sensitive pure functions in `lib/resources/` (validation, auth HMAC, slug/title). API routes and UI components are verified by manual smoke tests against `next dev` — code blocks for those tasks include the curl commands and click-paths to run. This trade-off keeps the high-risk logic covered without bolting a full React/route test stack onto a previously test-free repo.

---

## Phase 0 — Setup

### Task 0.1: Add vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Add dev dependency and test scripts**

Edit `package.json` — under `devDependencies` add `"vitest": "^2.1.0"`, and under `scripts` add:

```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 2: Install**

Run: `npm install`
Expected: lockfile updates, `node_modules/vitest` exists.

- [ ] **Step 3: Create vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

- [ ] **Step 4: Verify the runner starts**

Run: `npm run test:run`
Expected: exits 0 with "No test files found" (no tests yet).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "Add vitest for resources lib unit tests"
```

---

### Task 0.2: Drop static export, add @vercel/blob

**Files:**
- Modify: `next.config.mjs`
- Modify: `package.json`

- [ ] **Step 1: Remove the `output: 'export'` line**

Edit `next.config.mjs` so it reads:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
```

- [ ] **Step 2: Add @vercel/blob**

Run: `npm install @vercel/blob`
Expected: `@vercel/blob` appears in `dependencies`.

- [ ] **Step 3: Verify dev build works**

Run: `npm run dev`
Open `http://localhost:3000/`. Click into 3 random sections (e.g., epilepsy, neuromuscular, paroxysms) and confirm they render. Stop the dev server.

- [ ] **Step 4: Verify production build works**

Run: `npm run build`
Expected: build succeeds, no static-export errors. (You should now see `.next/` output, not `out/`.)

- [ ] **Step 5: Commit**

```bash
git add next.config.mjs package.json package-lock.json
git commit -m "Drop static export, add @vercel/blob for Resources section"
```

- [ ] **Step 6: MANUAL CHECKPOINT — deploy preview**

This is the riskiest single change in the plan because it converts every page from pre-rendered HTML to SSR. Push the commit and let Vercel build a preview deploy:

```bash
git push origin <branch>
```

Then in the Vercel dashboard, open the preview URL and:

1. Visit the homepage — confirm it renders with all sections
2. Click into 3 different content sections — confirm content + images load
3. Open `/pathways/` — confirm PDFs embed
4. Open `/neuro-on-call/` — confirm xlsx-derived table renders
5. Test global search — confirm it still works

If any page is broken, **stop and debug before continuing**. Likely culprits: paths that assumed `/out/` static-export semantics, or a page that depended on `next export` behavior.

---

## Phase 1 — Pure libraries (TDD)

### Task 1.1: Validation library

**Files:**
- Create: `lib/resources/validation.ts`
- Test: `lib/resources/__tests__/validation.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/resources/__tests__/validation.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  ALLOWED_MIME,
  ALLOWED_SUBSECTIONS,
  MAX_FILE_BYTES,
  validateMime,
  validateSize,
  validateSubsection,
  validateUrl,
  validateShortString,
} from '../validation';

describe('validateMime', () => {
  it('accepts every MIME in the allowlist', () => {
    for (const m of ALLOWED_MIME) {
      expect(validateMime(m)).toBe(true);
    }
  });
  it('rejects video, html, and unknown types', () => {
    expect(validateMime('video/mp4')).toBe(false);
    expect(validateMime('text/html')).toBe(false);
    expect(validateMime('application/octet-stream')).toBe(false);
    expect(validateMime('')).toBe(false);
  });
});

describe('validateSize', () => {
  it('accepts files at or below the limit', () => {
    expect(validateSize(0)).toBe(true);
    expect(validateSize(MAX_FILE_BYTES)).toBe(true);
  });
  it('rejects files over the limit', () => {
    expect(validateSize(MAX_FILE_BYTES + 1)).toBe(false);
  });
});

describe('validateSubsection', () => {
  it('accepts each known subsection', () => {
    for (const s of ALLOWED_SUBSECTIONS) {
      expect(validateSubsection(s)).toBe(true);
    }
  });
  it('rejects unknown values', () => {
    expect(validateSubsection('admin')).toBe(false);
    expect(validateSubsection('Conferences')).toBe(false); // case sensitive
    expect(validateSubsection('')).toBe(false);
  });
});

describe('validateUrl', () => {
  it('accepts http and https URLs', () => {
    expect(validateUrl('http://example.org')).toBe(true);
    expect(validateUrl('https://example.org/path?q=1')).toBe(true);
  });
  it('rejects other schemes and garbage', () => {
    expect(validateUrl('javascript:alert(1)')).toBe(false);
    expect(validateUrl('ftp://example.org')).toBe(false);
    expect(validateUrl('not a url')).toBe(false);
    expect(validateUrl('')).toBe(false);
  });
});

describe('validateShortString', () => {
  it('accepts strings up to 200 chars', () => {
    expect(validateShortString('hello')).toBe(true);
    expect(validateShortString('x'.repeat(200))).toBe(true);
  });
  it('rejects empty, too-long, or newline-bearing strings', () => {
    expect(validateShortString('')).toBe(false);
    expect(validateShortString('x'.repeat(201))).toBe(false);
    expect(validateShortString('one\ntwo')).toBe(false);
    expect(validateShortString('one\rtwo')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `npm run test:run`
Expected: all tests fail with "Cannot find module '../validation'".

- [ ] **Step 3: Implement the validators**

Create `lib/resources/validation.ts`:

```ts
export const ALLOWED_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
] as const;

export const ALLOWED_SUBSECTIONS = ['conferences', 'lectures', 'misc'] as const;
export type Subsection = (typeof ALLOWED_SUBSECTIONS)[number];

export const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

export function validateMime(mime: string): boolean {
  return (ALLOWED_MIME as readonly string[]).includes(mime);
}

export function validateSize(bytes: number): boolean {
  return bytes >= 0 && bytes <= MAX_FILE_BYTES;
}

export function validateSubsection(s: string): s is Subsection {
  return (ALLOWED_SUBSECTIONS as readonly string[]).includes(s);
}

export function validateUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateShortString(s: string): boolean {
  if (typeof s !== 'string') return false;
  if (s.length === 0 || s.length > 200) return false;
  if (/[\r\n]/.test(s)) return false;
  return true;
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm run test:run`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/resources/validation.ts lib/resources/__tests__/validation.test.ts
git commit -m "Add resources validation library with MIME/size/URL/subsection checks"
```

---

### Task 1.2: Auth library (HMAC cookie)

**Files:**
- Create: `lib/resources/auth.ts`
- Test: `lib/resources/__tests__/auth.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/resources/__tests__/auth.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { signCookie, verifyCookie } from '../auth';

const SECRET = 'a'.repeat(64); // hex secret in tests

describe('signCookie / verifyCookie', () => {
  it('round-trips a valid cookie', () => {
    const cookie = signCookie(Date.now() + 60_000, SECRET);
    expect(verifyCookie(cookie, SECRET)).toBe(true);
  });

  it('rejects an empty or malformed cookie', () => {
    expect(verifyCookie('', SECRET)).toBe(false);
    expect(verifyCookie('garbage', SECRET)).toBe(false);
    expect(verifyCookie('123.notahash', SECRET)).toBe(false);
  });

  it('rejects a tampered timestamp', () => {
    const cookie = signCookie(Date.now() + 60_000, SECRET);
    const [_ts, sig] = cookie.split('.');
    const tampered = `${Date.now() + 999_999}.${sig}`;
    expect(verifyCookie(tampered, SECRET)).toBe(false);
  });

  it('rejects a tampered signature', () => {
    const cookie = signCookie(Date.now() + 60_000, SECRET);
    const [ts] = cookie.split('.');
    const tampered = `${ts}.${'0'.repeat(64)}`;
    expect(verifyCookie(tampered, SECRET)).toBe(false);
  });

  it('rejects an expired cookie', () => {
    const cookie = signCookie(Date.now() - 1, SECRET);
    expect(verifyCookie(cookie, SECRET)).toBe(false);
  });

  it('rejects a cookie signed with a different secret', () => {
    const cookie = signCookie(Date.now() + 60_000, SECRET);
    expect(verifyCookie(cookie, 'b'.repeat(64))).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `npm run test:run`
Expected: failures on missing `../auth` module.

- [ ] **Step 3: Implement signing and verification**

Create `lib/resources/auth.ts`:

```ts
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const COOKIE_NAME = 'resources-auth';
export const COOKIE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function hmacHex(message: string, secret: string): string {
  return createHmac('sha256', secret).update(message).digest('hex');
}

export function signCookie(expiryMs: number, secret: string): string {
  const ts = String(expiryMs);
  return `${ts}.${hmacHex(ts, secret)}`;
}

export function verifyCookie(value: string | undefined, secret: string): boolean {
  if (!value) return false;
  const dot = value.indexOf('.');
  if (dot < 1) return false;

  const ts = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  if (!/^\d+$/.test(ts)) return false;
  if (!/^[0-9a-f]{64}$/.test(sig)) return false;

  const expected = hmacHex(ts, secret);
  // Both are 64-char hex strings — timingSafeEqual is safe here.
  const ok = timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
  if (!ok) return false;

  const expiry = Number(ts);
  if (!Number.isFinite(expiry) || expiry <= Date.now()) return false;

  return true;
}

/**
 * Read the cookie from the current request and return whether the caller is authed.
 * Throws if RESOURCES_COOKIE_SECRET is unset (caller should treat as 500).
 */
export function isAuthed(): boolean {
  const secret = process.env.RESOURCES_COOKIE_SECRET;
  if (!secret) throw new Error('RESOURCES_COOKIE_SECRET is not set');
  const c = cookies().get(COOKIE_NAME)?.value;
  return verifyCookie(c, secret);
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm run test:run`
Expected: all auth tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/resources/auth.ts lib/resources/__tests__/auth.test.ts
git commit -m "Add HMAC-signed cookie auth for resources writes"
```

---

### Task 1.3: Metadata library — slug + title resolution

**Files:**
- Create: `lib/resources/metadata.ts`
- Test: `lib/resources/__tests__/metadata.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/resources/__tests__/metadata.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { slugify, resolveTitle, type Metadata } from '../metadata';

describe('slugify', () => {
  it('lowercases and replaces non-alphanumerics with hyphens', () => {
    expect(slugify('Epilepsy Crash Course (Apr 2026).pdf'))
      .toBe('epilepsy-crash-course-apr-2026');
  });
  it('collapses repeated separators and trims', () => {
    expect(slugify('---foo___bar  baz.pptx')).toBe('foo-bar-baz');
  });
  it('handles names with no extension', () => {
    expect(slugify('My Notes')).toBe('my-notes');
  });
  it('returns "file" for input that slugifies to empty', () => {
    expect(slugify('!!!.pdf')).toBe('file');
    expect(slugify('')).toBe('file');
  });
});

describe('resolveTitle', () => {
  const md: Metadata = {
    links: [],
    fileTitles: {
      'resources/conferences/123__epilepsy-crash-course.pdf': 'Epilepsy Crash Course (Apr 2026)',
    },
  };

  it('uses fileTitles when present', () => {
    expect(
      resolveTitle('resources/conferences/123__epilepsy-crash-course.pdf', md),
    ).toBe('Epilepsy Crash Course (Apr 2026)');
  });

  it('derives a title-cased label from the slug when no override exists', () => {
    expect(resolveTitle('resources/lectures/456__hie-management.pdf', md))
      .toBe('Hie Management');
  });

  it('handles a missing slug part by falling back to the basename', () => {
    expect(resolveTitle('resources/misc/789.pdf', md)).toBe('789');
  });
});
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `npm run test:run`
Expected: failures on missing `../metadata`.

- [ ] **Step 3: Implement slug + title resolution**

Create `lib/resources/metadata.ts`:

```ts
import { put, list } from '@vercel/blob';
import type { Subsection } from './validation';

export type LinkRecord = {
  id: string;
  url: string;
  label: string;
  addedAt: number;
};

export type Metadata = {
  links: LinkRecord[];
  fileTitles: Record<string, string>;
};

export const METADATA_PATH = 'resources/_metadata.json';
export const EMPTY_METADATA: Metadata = { links: [], fileTitles: {} };

export function slugify(name: string): string {
  // Drop the extension if present
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;

  const cleaned = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return cleaned || 'file';
}

export function resolveTitle(pathname: string, md: Metadata): string {
  const override = md.fileTitles[pathname];
  if (override) return override;

  // Filename-only portion of the pathname
  const last = pathname.split('/').pop() ?? pathname;
  // Strip extension
  const noExt = last.replace(/\.[^.]+$/, '');
  // Slug part is after `__` (the timestamp prefix)
  const sepIdx = noExt.indexOf('__');
  const slugPart = sepIdx >= 0 ? noExt.slice(sepIdx + 2) : noExt;

  return slugPart
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ') || noExt;
}

export async function readMetadata(): Promise<Metadata> {
  // Find the metadata blob (list+fetch pattern — Blob has no direct GET-by-path)
  const { blobs } = await list({ prefix: METADATA_PATH });
  const hit = blobs.find((b) => b.pathname === METADATA_PATH);
  if (!hit) return { ...EMPTY_METADATA };

  const res = await fetch(hit.url, { cache: 'no-store' });
  if (!res.ok) return { ...EMPTY_METADATA };
  try {
    const data = (await res.json()) as Metadata;
    return {
      links: Array.isArray(data?.links) ? data.links : [],
      fileTitles: data?.fileTitles && typeof data.fileTitles === 'object' ? data.fileTitles : {},
    };
  } catch {
    return { ...EMPTY_METADATA };
  }
}

export async function writeMetadata(md: Metadata): Promise<void> {
  await put(METADATA_PATH, JSON.stringify(md), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  });
}

export function blobPathFor(sub: Subsection, originalName: string): string {
  const dot = originalName.lastIndexOf('.');
  const ext = dot > 0 ? originalName.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  const slug = slugify(originalName);
  const ts = Date.now();
  return `resources/${sub}/${ts}__${slug}${ext ? `.${ext}` : ''}`;
}

export function newLinkId(): string {
  // 6 hex chars is enough at this scale
  return 'lnk_' + Math.random().toString(16).slice(2, 8);
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm run test:run`
Expected: all metadata tests pass. (`readMetadata` / `writeMetadata` are not unit-tested — they're thin wrappers over Vercel Blob and are exercised via API smoke tests in Phase 2.)

- [ ] **Step 5: Commit**

```bash
git add lib/resources/metadata.ts lib/resources/__tests__/metadata.test.ts
git commit -m "Add metadata library: slugify, title resolution, blob path, read/write"
```

---

## Phase 2 — API routes

> Vercel Blob requires `BLOB_READ_WRITE_TOKEN`. For local dev against a real Blob store, set it in `.env.local`. Without it, route handlers will throw on first call — catch this in manual testing and treat as expected until env is provisioned.

### Task 2.1: Auth + logout routes

**Files:**
- Create: `app/api/resources/auth/route.ts`
- Create: `app/api/resources/logout/route.ts`

- [ ] **Step 1: Implement the auth route**

Create `app/api/resources/auth/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { signCookie, COOKIE_NAME, COOKIE_TTL_MS } from '@/lib/resources/auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const password = process.env.RESOURCES_PASSWORD;
  const secret = process.env.RESOURCES_COOKIE_SECRET;
  if (!password || !secret) {
    return NextResponse.json({ error: 'server misconfigured' }, { status: 500 });
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  if (body?.password !== password) {
    return NextResponse.json({ error: 'incorrect password' }, { status: 401 });
  }

  const expiry = Date.now() + COOKIE_TTL_MS;
  const value = signCookie(expiry, secret);

  cookies().set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(COOKIE_TTL_MS / 1000),
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Implement the logout route**

Create `app/api/resources/logout/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_NAME } from '@/lib/resources/auth';

export const runtime = 'nodejs';

export async function POST() {
  cookies().delete(COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Smoke-test locally**

Set `RESOURCES_PASSWORD=test` and `RESOURCES_COOKIE_SECRET=$(openssl rand -hex 32)` in `.env.local`, then run `npm run dev`. In another terminal:

```bash
# Wrong password → 401
curl -i -X POST http://localhost:3000/api/resources/auth \
  -H 'content-type: application/json' \
  -d '{"password":"wrong"}'

# Right password → 200 + Set-Cookie header
curl -i -X POST http://localhost:3000/api/resources/auth \
  -H 'content-type: application/json' \
  -d '{"password":"test"}'

# Logout → 200, clears cookie
curl -i -X POST http://localhost:3000/api/resources/logout
```

Expected: status codes match comments; the success response includes `Set-Cookie: resources-auth=...`.

- [ ] **Step 4: Commit**

```bash
git add app/api/resources/auth/route.ts app/api/resources/logout/route.ts
git commit -m "Add /api/resources/auth and /logout routes"
```

---

### Task 2.2: Upload route

**Files:**
- Create: `app/api/resources/upload/route.ts`

- [ ] **Step 1: Implement the upload route**

Create `app/api/resources/upload/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { isAuthed } from '@/lib/resources/auth';
import {
  validateMime,
  validateSize,
  validateSubsection,
  validateShortString,
  type Subsection,
} from '@/lib/resources/validation';
import {
  blobPathFor,
  readMetadata,
  writeMetadata,
} from '@/lib/resources/metadata';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!isAuthed()) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get('file');
  const subsection = String(form.get('subsection') ?? '');
  const titleRaw = form.get('title');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'missing file' }, { status: 400 });
  }
  if (!validateSubsection(subsection)) {
    return NextResponse.json({ error: 'invalid subsection' }, { status: 400 });
  }
  if (!validateMime(file.type)) {
    return NextResponse.json({ error: 'unsupported file type' }, { status: 400 });
  }
  if (!validateSize(file.size)) {
    return NextResponse.json({ error: 'file too large' }, { status: 400 });
  }

  const sub = subsection as Subsection;
  const pathname = blobPathFor(sub, file.name);

  // Upload first; only mutate metadata if upload succeeded.
  let url: string;
  try {
    const result = await put(pathname, file, {
      access: 'public',
      addRandomSuffix: false,
      contentType: file.type,
      contentDisposition: `inline; filename="${file.name.replace(/"/g, '')}"`,
    });
    url = result.url;
  } catch (err) {
    return NextResponse.json({ error: 'upload failed' }, { status: 500 });
  }

  let title: string | undefined;
  if (typeof titleRaw === 'string' && titleRaw.trim() !== '') {
    if (!validateShortString(titleRaw)) {
      return NextResponse.json({ error: 'invalid title' }, { status: 400 });
    }
    title = titleRaw;
    const md = await readMetadata();
    md.fileTitles[pathname] = title;
    await writeMetadata(md);
  }

  return NextResponse.json({ pathname, url, title });
}
```

- [ ] **Step 2: Smoke-test the upload route locally**

With `npm run dev` running and a valid auth cookie:

```bash
# Auth first, save cookie jar
curl -c /tmp/rcj -X POST http://localhost:3000/api/resources/auth \
  -H 'content-type: application/json' -d '{"password":"test"}'

# Upload a small PDF (substitute a real path)
curl -b /tmp/rcj -X POST http://localhost:3000/api/resources/upload \
  -F "file=@/path/to/test.pdf;type=application/pdf" \
  -F "subsection=conferences" \
  -F "title=Smoke Test PDF"
```

Expected: 200 with `{pathname, url, title}`. Visit the returned `url` — file downloads/inlines.
Try with `subsection=foo` → expect 400. Try without auth (no `-b /tmp/rcj`) → expect 401.

- [ ] **Step 3: Commit**

```bash
git add app/api/resources/upload/route.ts
git commit -m "Add /api/resources/upload route with MIME/size validation"
```

---

### Task 2.3: File delete route

**Files:**
- Create: `app/api/resources/file/route.ts`

- [ ] **Step 1: Implement the delete route**

Create `app/api/resources/file/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { isAuthed } from '@/lib/resources/auth';
import { readMetadata, writeMetadata } from '@/lib/resources/metadata';

export const runtime = 'nodejs';

export async function DELETE(req: Request) {
  if (!isAuthed()) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { pathname?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const pathname = body?.pathname;
  if (typeof pathname !== 'string' || !pathname.startsWith('resources/')) {
    return NextResponse.json({ error: 'invalid pathname' }, { status: 400 });
  }
  // Never let the client delete _metadata.json directly through this route
  if (pathname === 'resources/_metadata.json') {
    return NextResponse.json({ error: 'forbidden' }, { status: 400 });
  }

  try {
    await del(pathname);
  } catch (err) {
    return NextResponse.json({ error: 'delete failed' }, { status: 500 });
  }

  const md = await readMetadata();
  if (md.fileTitles[pathname]) {
    delete md.fileTitles[pathname];
    await writeMetadata(md);
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Smoke-test using the pathname returned in Task 2.2**

```bash
curl -b /tmp/rcj -X DELETE http://localhost:3000/api/resources/file \
  -H 'content-type: application/json' \
  -d '{"pathname":"resources/conferences/<paste-from-upload-response>"}'
```

Expected: `{ok: true}`. Visit the prior `url` — should be 404.
Try without auth → 401. Try with `pathname="../etc/passwd"` → 400.

- [ ] **Step 3: Commit**

```bash
git add app/api/resources/file/route.ts
git commit -m "Add /api/resources/file DELETE route"
```

---

### Task 2.4: Links routes (POST + DELETE)

**Files:**
- Create: `app/api/resources/links/route.ts`

- [ ] **Step 1: Implement POST and DELETE handlers**

Create `app/api/resources/links/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/resources/auth';
import { validateUrl, validateShortString } from '@/lib/resources/validation';
import { readMetadata, writeMetadata, newLinkId } from '@/lib/resources/metadata';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!isAuthed()) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { url?: string; label?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const url = String(body?.url ?? '');
  const label = String(body?.label ?? '');

  if (!validateUrl(url)) {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 });
  }
  if (!validateShortString(label)) {
    return NextResponse.json({ error: 'invalid label' }, { status: 400 });
  }

  const md = await readMetadata();
  const link = { id: newLinkId(), url, label, addedAt: Date.now() };
  md.links.push(link);
  await writeMetadata(md);

  return NextResponse.json(link);
}

export async function DELETE(req: Request) {
  if (!isAuthed()) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { id?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const id = body?.id;
  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'missing id' }, { status: 400 });
  }

  const md = await readMetadata();
  const before = md.links.length;
  md.links = md.links.filter((l) => l.id !== id);
  if (md.links.length === before) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  await writeMetadata(md);

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Smoke-test**

```bash
# Add
curl -b /tmp/rcj -X POST http://localhost:3000/api/resources/links \
  -H 'content-type: application/json' \
  -d '{"url":"https://example.org/peds-curriculum","label":"AAN Peds Neuro Curriculum"}'
# Capture the returned `id`, then delete:
curl -b /tmp/rcj -X DELETE http://localhost:3000/api/resources/links \
  -H 'content-type: application/json' \
  -d '{"id":"<paste id>"}'
```

Expected: POST returns the new link; DELETE returns `{ok: true}`. Bad URL → 400. Missing auth → 401.

- [ ] **Step 3: Commit**

```bash
git add app/api/resources/links/route.ts
git commit -m "Add /api/resources/links POST and DELETE routes"
```

---

## Phase 3 — UI

### Task 3.1: Resources page (server component) + read-only cards

**Files:**
- Create: `app/resources/page.tsx`
- Create: `components/resources/FileCard.tsx`
- Create: `components/resources/LinkCard.tsx`

This task ships the page in a read-only state — no auth bar, no upload, no delete buttons yet. That gives us a working URL to wire the rest of the UI into.

- [ ] **Step 1: Create FileCard**

Create `components/resources/FileCard.tsx`:

```tsx
type Props = {
  pathname: string;
  url: string;
  title: string;
  contentType: string;
  authed: boolean;
};

function iconFor(contentType: string): string {
  if (contentType === 'application/pdf') return '📄';
  if (contentType.startsWith('image/')) return '🖼';
  if (contentType.includes('presentation') || contentType.includes('powerpoint')) return '📊';
  if (contentType.includes('word')) return '📝';
  return '📁';
}

function typeLabel(contentType: string): string {
  if (contentType === 'application/pdf') return 'PDF Document';
  if (contentType.startsWith('image/')) return 'Image';
  if (contentType.includes('presentation') || contentType.includes('powerpoint')) return 'PowerPoint';
  if (contentType.includes('word')) return 'Word Document';
  return 'File';
}

export default function FileCard({ pathname, url, title, contentType, authed }: Props) {
  const isPdf = contentType === 'application/pdf';
  const isImg = contentType.startsWith('image/');
  return (
    <div className="pathway-card">
      <div className="pathway-card-header">
        <span className="pathway-card-icon">{iconFor(contentType)}</span>
        <div className="pathway-card-info">
          <div className="pathway-card-title">{title}</div>
          <div className="pathway-card-type">{typeLabel(contentType)}</div>
        </div>
      </div>
      <div className="pathway-card-preview">
        {isPdf && (
          <object data={url} type="application/pdf" className="pdf-embed w-full">
            <p className="p-3 text-xs text-slate-500">Preview unavailable.</p>
          </object>
        )}
        {isImg && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={title} className="w-full h-auto" />
        )}
        {!isPdf && !isImg && (
          <div className="p-6 text-center text-3xl text-slate-400">{iconFor(contentType)}</div>
        )}
      </div>
      <div className="pathway-card-actions">
        <a href={url} target="_blank" rel="noopener noreferrer" className="pathway-btn pathway-btn-view">
          View Full Screen ↗
        </a>
        <a href={url} download className="pathway-btn pathway-btn-view">⬇ Download</a>
        {authed && (
          <button
            type="button"
            data-resources-delete-file
            data-pathname={pathname}
            className="pathway-btn pathway-btn-delete"
          >
            🗑 Delete
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create LinkCard**

Create `components/resources/LinkCard.tsx`:

```tsx
type Props = {
  id: string;
  url: string;
  label: string;
  authed: boolean;
};

export default function LinkCard({ id, url, label, authed }: Props) {
  return (
    <div className="pathway-card">
      <div className="pathway-card-header">
        <span className="pathway-card-icon">🔗</span>
        <div className="pathway-card-info">
          <div className="pathway-card-title">{label}</div>
          <div className="pathway-card-type">{url}</div>
        </div>
      </div>
      <div className="pathway-card-actions">
        <a href={url} target="_blank" rel="noopener noreferrer" className="pathway-btn pathway-btn-view">
          Open ↗
        </a>
        {authed && (
          <button
            type="button"
            data-resources-delete-link
            data-link-id={id}
            className="pathway-btn pathway-btn-delete"
          >
            🗑 Delete
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create the Resources page**

Create `app/resources/page.tsx`:

```tsx
import { list } from '@vercel/blob';
import { readMetadata, resolveTitle } from '@/lib/resources/metadata';
import { isAuthed } from '@/lib/resources/auth';
import FileCard from '@/components/resources/FileCard';
import LinkCard from '@/components/resources/LinkCard';
import type { Subsection } from '@/lib/resources/validation';

export const dynamic = 'force-dynamic';

type FileRow = { pathname: string; url: string; title: string; contentType: string; uploadedAt: number };

async function listSubsection(sub: Subsection, fileTitles: Record<string, string>): Promise<FileRow[]> {
  const { blobs } = await list({ prefix: `resources/${sub}/` });
  return blobs
    .map((b) => ({
      pathname: b.pathname,
      url: b.url,
      title: resolveTitle(b.pathname, { links: [], fileTitles }),
      contentType: b.contentType ?? 'application/octet-stream',
      uploadedAt: b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0,
    }))
    .sort((a, b) => b.uploadedAt - a.uploadedAt);
}

const SUBSECTIONS: Array<{
  key: Subsection | 'links';
  title: string;
  blurb: string;
  color: string;
  icon: string;
}> = [
  { key: 'conferences', title: 'Conferences',                 blurb: 'Slide decks and handouts', color: '#7c3aed', icon: '🎓' },
  { key: 'lectures',    title: 'Lectures / Teaching Files',   blurb: 'Teaching slides and handouts', color: '#059669', icon: '📚' },
  { key: 'links',       title: 'External Links',              blurb: 'Curated outside resources',color: '#2563eb', icon: '🔗' },
  { key: 'misc',        title: 'Misc Files',                  blurb: 'Everything else',          color: '#475569', icon: '📁' },
];

export default async function ResourcesPage() {
  const authed = (() => { try { return isAuthed(); } catch { return false; } })();
  const md = await readMetadata();

  const [conferences, lectures, misc] = await Promise.all([
    listSubsection('conferences', md.fileTitles),
    listSubsection('lectures', md.fileTitles),
    listSubsection('misc', md.fileTitles),
  ]);

  const filesBySub: Record<'conferences' | 'lectures' | 'misc', FileRow[]> = {
    conferences, lectures, misc,
  };

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">
          Resources & Conferences
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Lectures, slides, external links, and other shared files.
        </p>
      </div>

      {/* AuthBar slot — wired in Task 3.2 */}

      {SUBSECTIONS.map((s) => (
        <section key={s.key} className="mb-10">
          <h2
            className="flex items-center gap-2 text-base sm:text-lg font-semibold mb-3 px-3 py-2 rounded-md"
            style={{ backgroundColor: `${s.color}15`, color: s.color }}
          >
            <span>{s.icon}</span>
            <span>{s.title}</span>
            <span className="text-xs font-normal text-slate-500 ml-2">{s.blurb}</span>
          </h2>

          {s.key === 'links' ? (
            <div className="pathway-grid">
              {md.links.length === 0 && <p className="text-sm text-slate-400">No links yet.</p>}
              {md.links.map((l) => (
                <LinkCard key={l.id} id={l.id} url={l.url} label={l.label} authed={authed} />
              ))}
            </div>
          ) : (
            <div className="pathway-grid">
              {filesBySub[s.key].length === 0 && <p className="text-sm text-slate-400">No files yet.</p>}
              {filesBySub[s.key].map((f) => (
                <FileCard
                  key={f.pathname}
                  pathname={f.pathname}
                  url={f.url}
                  title={f.title}
                  contentType={f.contentType}
                  authed={authed}
                />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Smoke-test the page**

Run `npm run dev`, visit `http://localhost:3000/resources/`. Expected:

- Page loads with the four subsection banners
- Each section shows "No files yet" / "No links yet" (or, if you uploaded in Phase 2 testing, those items appear)
- File cards render PDFs as embeds and have View / Download buttons
- No delete buttons (because no auth cookie / `authed` is false)

- [ ] **Step 5: Commit**

```bash
git add app/resources/page.tsx components/resources/FileCard.tsx components/resources/LinkCard.tsx
git commit -m "Add Resources page with read-only file and link cards"
```

---

### Task 3.2: AuthBar + LoginModal

**Files:**
- Create: `components/resources/AuthBar.tsx`
- Create: `components/resources/LoginModal.tsx`
- Modify: `app/resources/page.tsx`

- [ ] **Step 1: Create LoginModal (client component)**

Create `components/resources/LoginModal.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch('/api/resources/auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) {
      onClose();
      router.refresh();
    } else if (res.status === 401) {
      setError('Incorrect password');
    } else {
      setError('Something went wrong');
    }
  }

  return (
    <div className="resources-modal-backdrop" onClick={onClose}>
      <div className="resources-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold mb-3">Log in to upload</h3>
        <form onSubmit={submit}>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Shared password"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm mb-2"
          />
          {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="text-sm px-3 py-1.5 text-slate-500">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="text-sm px-3 py-1.5 rounded-md bg-indigo-600 text-white disabled:opacity-60">
              {busy ? 'Checking…' : 'Log in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create AuthBar (client component, owns the modal toggle)**

Create `components/resources/AuthBar.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LoginModal from './LoginModal';

export default function AuthBar({ authed }: { authed: boolean }) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  async function logout() {
    await fetch('/api/resources/logout', { method: 'POST' });
    router.refresh();
  }

  return (
    <div className="resources-auth-bar">
      {authed ? (
        <>
          <span className="text-xs text-emerald-700">✓ Logged in</span>
          <button type="button" onClick={logout} className="text-xs text-slate-500 hover:underline ml-3">
            Log out
          </button>
        </>
      ) : (
        <button type="button" onClick={() => setShowModal(true)} className="text-xs text-indigo-700 hover:underline">
          🔒 Log in to upload
        </button>
      )}
      {showModal && <LoginModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
```

- [ ] **Step 3: Wire AuthBar into the page**

Edit `app/resources/page.tsx`. Add an import:

```tsx
import AuthBar from '@/components/resources/AuthBar';
```

Replace the `{/* AuthBar slot — wired in Task 3.2 */}` comment with:

```tsx
<AuthBar authed={authed} />
```

- [ ] **Step 4: Smoke-test**

Reload `/resources/`. Expected: "🔒 Log in to upload" link in the auth bar. Click it → modal appears. Wrong password → "Incorrect password". Right password (matches `RESOURCES_PASSWORD` in `.env.local`) → modal closes, page refreshes, bar now reads "✓ Logged in · Log out". Click "Log out" → reverts. Browser DevTools → Application → Cookies should show `resources-auth` set to `<expiry>.<sig>`, `httpOnly`, `secure`.

- [ ] **Step 5: Commit**

```bash
git add components/resources/AuthBar.tsx components/resources/LoginModal.tsx app/resources/page.tsx
git commit -m "Wire login/logout for Resources page"
```

---

### Task 3.3: UploadDropzone

**Files:**
- Create: `components/resources/UploadDropzone.tsx`
- Modify: `app/resources/page.tsx`

- [ ] **Step 1: Create UploadDropzone**

Create `components/resources/UploadDropzone.tsx`:

```tsx
'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const ACCEPT = '.pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg';
const MAX_BYTES = 25 * 1024 * 1024;

export default function UploadDropzone({ subsection }: { subsection: 'conferences' | 'lectures' | 'misc' }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [over, setOver] = useState(false);

  function deriveTitle(name: string): string {
    const noExt = name.replace(/\.[^.]+$/, '');
    return noExt.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  async function upload(file: File) {
    setError(null);
    if (file.size > MAX_BYTES) { setError('File exceeds 25 MB.'); return; }

    const suggested = deriveTitle(file.name);
    const titleInput = window.prompt('Display title (Cancel to keep the filename):', suggested);
    const title = titleInput === null ? '' : titleInput;

    const fd = new FormData();
    fd.append('file', file);
    fd.append('subsection', subsection);
    if (title.trim()) fd.append('title', title.trim());

    // Progress requires XHR (fetch can't report upload progress reliably yet)
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/resources/upload');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      setProgress(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        router.refresh();
      } else {
        let msg = 'Upload failed';
        try { msg = JSON.parse(xhr.responseText).error || msg; } catch {}
        setError(msg);
      }
    };
    xhr.onerror = () => { setProgress(null); setError('Network error'); };
    setProgress(0);
    xhr.send(fd);
  }

  return (
    <div
      className={`resources-dropzone ${over ? 'is-over' : ''}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) upload(f);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = '';
        }}
      />
      {progress === null ? (
        <>
          <div className="text-sm">⬆ Drop a file here or click to browse</div>
          <div className="text-xs text-slate-400 mt-1">PDF, PPT/PPTX, DOC/DOCX, PNG/JPG · max 25 MB</div>
        </>
      ) : (
        <div className="text-sm">Uploading… {progress}%</div>
      )}
      {error && <div className="text-xs text-red-600 mt-2">{error}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Render dropzones for the file subsections**

In `app/resources/page.tsx`, import:

```tsx
import UploadDropzone from '@/components/resources/UploadDropzone';
```

Inside the `SUBSECTIONS.map(...)` block, after the file `pathway-grid` div (i.e., the non-`'links'` branch), add:

```tsx
{authed && s.key !== 'links' && (
  <UploadDropzone subsection={s.key} />
)}
```

(Place it inside the `else` branch so it appears below the file grid.)

- [ ] **Step 3: Smoke-test**

While logged in: drop a PDF onto the Conferences dropzone. Watch progress. After completion the new card appears in the grid. While logged out: dropzone should not be rendered. Try a 30 MB file → "File exceeds 25 MB." Try a `.txt` (won't pass the file picker `accept`; if dropped, server returns 400 → "unsupported file type").

- [ ] **Step 4: Commit**

```bash
git add components/resources/UploadDropzone.tsx app/resources/page.tsx
git commit -m "Add upload dropzone for Conferences/Lectures/Misc"
```

---

### Task 3.4: AddLinkModal + delete handlers

**Files:**
- Create: `components/resources/AddLinkModal.tsx`
- Create: `components/resources/DeleteHandlers.tsx`
- Modify: `app/resources/page.tsx`

- [ ] **Step 1: Create AddLinkModal**

Create `components/resources/AddLinkModal.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AddLinkModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function close() {
    setOpen(false);
    setUrl('');
    setLabel('');
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch('/api/resources/links', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url, label }),
    });
    setBusy(false);
    if (res.ok) {
      close();
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body?.error ?? 'Failed to add link');
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-50"
      >
        + Add Link
      </button>
      {open && (
        <div className="resources-modal-backdrop" onClick={close}>
          <div className="resources-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-3">Add a link</h3>
            <form onSubmit={submit} className="space-y-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                required
              />
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Label"
                maxLength={200}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                required
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={close} className="text-sm px-3 py-1.5 text-slate-500">Cancel</button>
                <button type="submit" disabled={busy} className="text-sm px-3 py-1.5 rounded-md bg-indigo-600 text-white disabled:opacity-60">
                  {busy ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Create the DeleteHandlers client component**

The FileCard / LinkCard delete buttons are server-rendered with `data-*` attributes. A single client component delegates click events for both. Create `components/resources/DeleteHandlers.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteHandlers() {
  const router = useRouter();

  useEffect(() => {
    async function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const fileBtn = target.closest('[data-resources-delete-file]') as HTMLElement | null;
      const linkBtn = target.closest('[data-resources-delete-link]') as HTMLElement | null;

      if (fileBtn) {
        const pathname = fileBtn.dataset.pathname;
        if (!pathname) return;
        if (!window.confirm(`Delete this file?\n\n${pathname}`)) return;
        const res = await fetch('/api/resources/file', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ pathname }),
        });
        if (res.ok) router.refresh();
        else window.alert('Delete failed');
      } else if (linkBtn) {
        const id = linkBtn.dataset.linkId;
        if (!id) return;
        if (!window.confirm('Delete this link?')) return;
        const res = await fetch('/api/resources/links', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id }),
        });
        if (res.ok) router.refresh();
        else window.alert('Delete failed');
      }
    }

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [router]);

  return null;
}
```

- [ ] **Step 3: Render Add Link button + DeleteHandlers from the page**

In `app/resources/page.tsx`:

```tsx
import AddLinkModal from '@/components/resources/AddLinkModal';
import DeleteHandlers from '@/components/resources/DeleteHandlers';
```

Inside the External Links section (the `s.key === 'links'` branch), after the `pathway-grid` div, add:

```tsx
{authed && <div className="mt-3"><AddLinkModal /></div>}
```

At the very top of the page's returned JSX (just under `<div>`), add:

```tsx
{authed && <DeleteHandlers />}
```

- [ ] **Step 4: Smoke-test**

While logged in:

- Click "+ Add Link" → fill URL + label → Save → new LinkCard appears
- Click 🗑 on a LinkCard → confirm → it disappears
- Click 🗑 on a FileCard → confirm → it disappears (and `_metadata.json` `fileTitles` for that pathname is gone — verify by reading metadata API result, or just by re-uploading and confirming the title isn't carried over)

While logged out: no "+ Add Link" button, no 🗑 buttons.

- [ ] **Step 5: Commit**

```bash
git add components/resources/AddLinkModal.tsx components/resources/DeleteHandlers.tsx app/resources/page.tsx
git commit -m "Add link creation modal and delete handlers for Resources"
```

---

### Task 3.5: Styling

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Append resources-specific styles**

Append the following to the end of `app/globals.css`:

```css
/* ── Resources section ── */
.resources-auth-bar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 0.75rem;
}

.resources-dropzone {
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
  color: #475569;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  background: #f8fafc;
  margin-top: 0.75rem;
}
.resources-dropzone:hover,
.resources-dropzone.is-over {
  background: #eef2ff;
  border-color: #6366f1;
  color: #1e293b;
}
.dark .resources-dropzone {
  background: #0f172a;
  border-color: #334155;
  color: #94a3b8;
}
.dark .resources-dropzone:hover,
.dark .resources-dropzone.is-over {
  background: #1e1b4b;
  border-color: #818cf8;
  color: #e2e8f0;
}

.resources-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 1rem;
}
.resources-modal {
  background: #ffffff;
  border-radius: 12px;
  padding: 1.25rem;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.18);
}
.dark .resources-modal {
  background: #1e293b;
  color: #e2e8f0;
}

.pathway-btn-delete {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}
.pathway-btn-delete:hover {
  background: #fee2e2;
}
.dark .pathway-btn-delete {
  background: #450a0a;
  color: #fca5a5;
  border-color: #7f1d1d;
}
```

- [ ] **Step 2: Smoke-test**

Reload `/resources/`. Visual check: dropzone is dashed and shaded, hover dims indigo. Login modal centers on a dim backdrop. Delete buttons are red-tinted. Dark mode works for all three.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "Add styles for Resources dropzone, modals, and delete buttons"
```

---

### Task 3.6: Homepage feature card

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add `'resources'` to accentMap and insert the feature card**

In `app/page.tsx`, add this entry to `accentMap`:

```ts
'resources': '#4f46e5',
```

Then insert this block **between** the closing `</div>` of the section grid (line ~148) and the `<details>` Helpful Links block (line ~151):

```tsx
{/* Resources & Conferences — featured card */}
<a
  href="/resources/"
  className="group mt-3 sm:mt-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/80 hover:shadow-md transition-all duration-200 overflow-hidden flex min-h-[56px]"
>
  <div className="w-1 shrink-0" style={{ backgroundColor: '#4f46e5' }} />
  <div className="flex-1 flex items-center gap-4 px-4 sm:px-5 py-3">
    <div className="flex-1 min-w-0">
      <div className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors text-sm sm:text-base">
        Resources & Conferences
      </div>
      <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
        Lectures &middot; slides &middot; external links &middot; files
      </div>
    </div>
    <svg className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 transition-colors shrink-0"
      fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  </div>
</a>
```

- [ ] **Step 2: Smoke-test**

Visit `http://localhost:3000/`. The new "Resources & Conferences" card sits above Helpful Links, with an indigo accent stripe. Click it → lands on `/resources/`.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "Add Resources & Conferences feature card to homepage"
```

---

## Phase 4 — Final smoke + production rollout

### Task 4.1: End-to-end smoke test in dev

- [ ] **Step 1: Run the runner one more time**

Run: `npm run test:run`
Expected: all unit tests pass.

- [ ] **Step 2: Run a production build**

Run: `npm run build`
Expected: builds cleanly. No TypeScript or static-export errors.

- [ ] **Step 3: Manual click-through in dev**

Run `npm run dev`. Touching every flow:

1. Homepage → Resources card → `/resources/`
2. Log in (correct password) → cookie present, "✓ Logged in" shown
3. Upload a PDF to Conferences → progress → card appears, PDF previews
4. Refresh page — card persists
5. Add a link → it appears in External Links
6. Delete the file you just uploaded → it disappears
7. Delete the link → it disappears
8. Log out → all upload/delete affordances disappear; existing public cards still visible

If any step fails, fix and re-test before continuing.

---

### Task 4.2: Vercel rollout — provisioning checkpoint (USER ACTION)

These steps are performed by the user in the Vercel dashboard, not by code edits.

- [ ] **Step 1: Create a Vercel Blob store**

Vercel dashboard → project → Storage → Create Database → Blob. This auto-injects `BLOB_READ_WRITE_TOKEN` into the project's environment.

- [ ] **Step 2: Set the two env vars**

In Vercel project settings → Environment Variables, add for **Production** and **Preview**:

- `RESOURCES_PASSWORD` — pick a memorable shared password
- `RESOURCES_COOKIE_SECRET` — generate with `openssl rand -hex 32` and paste the value

Hit "Save". Vercel will redeploy automatically.

- [ ] **Step 3: Smoke-test the production deployment**

Open the production URL. Repeat the click-through from Task 4.1 Step 3. Confirm cookie sets `secure; httpOnly` (it must, because `secure: true` is hardcoded).

- [ ] **Step 4: (Optional) push and create PR**

If working on a branch:

```bash
git push origin <branch>
gh pr create --title "Add Resources & Conferences section" --body "Implements docs/superpowers/specs/2026-04-29-resources-conferences-design.md"
```

---

## Spec coverage check

| Spec section | Implemented in |
|---|---|
| §1 Goal — four subsections + feature card | Tasks 3.1, 3.6 |
| §2.1 Drop static export | Task 0.2 |
| §2.2 Vercel Blob storage | Task 0.2 (dep), Task 4.2 (provision) |
| §2.3 Auth: shared password + signed cookie | Tasks 1.2, 2.1, 3.2 |
| §3.1 File pathnames `resources/<sub>/<ts>__<slug>.<ext>` | `blobPathFor` (Task 1.3) |
| §3.2 `_metadata.json` shape | `Metadata` type (Task 1.3) |
| §3.3 Title resolution | `resolveTitle` (Task 1.3) |
| §4.1 Homepage feature card | Task 3.6 |
| §4.2 Resources page layout | Tasks 3.1, 3.2, 3.3, 3.4 |
| §4.3 File card | Task 3.1 |
| §4.4 External link card | Task 3.1 |
| §4.5 Drop zone with title prompt | Task 3.3 |
| §4.6 Add link modal | Task 3.4 |
| §4.7 Login modal | Task 3.2 |
| §5 API surface | Tasks 2.1–2.4 |
| §6 Validation rules | Task 1.1 (rules), enforced in Tasks 2.2–2.4 |
| §7 Failure modes | Covered in each route's error returns |
| §8 Components / files affected | Matches plan File Structure section |
| §9 Out of scope | Honored — no recordings, no per-user accounts, no rate limiting, no versioning |
| §10 Migration / rollout | Task 4.2 |
