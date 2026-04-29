# Resources & Conferences Section — Design Spec

**Date:** 2026-04-29
**Status:** Approved, awaiting implementation plan
**Scope:** New homepage feature card + new `/resources/` page with authenticated in-browser file uploads.

---

## 1. Goal

Add a "Resources & Conferences" section to the handbook that lets authorized users (residents, attendings) upload and curate teaching materials — PDFs, slide decks, Word docs, images — and external links, directly through the browser. Mirror the visual pattern of the existing NCH Pathways feature card on the homepage; mirror the page layout pattern of the Pathways subsection page.

The section is divided into four subsections:

1. **Conferences** — slide decks and handouts from conferences (no recordings)
2. **Lectures / Teaching Files**
3. **External Links**
4. **Misc Files**

## 2. Architectural decisions

### 2.1 Drop static export

The site currently builds with `output: 'export'` (pure static). To support uploads we need server runtime, so we **remove `output: 'export'`** from `next.config` and let Next.js run as a normal Next.js app on Vercel.

Practical effect: every existing page still server-renders and serves cached at the edge (visually identical to today). The change unlocks API routes for the Resources page.

### 2.2 Storage: Vercel Blob

Files live in Vercel Blob, accessed with `BLOB_READ_WRITE_TOKEN` (auto-provisioned by Vercel when the Blob store is created).

Cost: free tier covers the expected scale (1 GB storage / 10 GB bandwidth per month).

### 2.3 Auth: shared password + signed cookie

One shared password gates all writes. Reads are public.

- `RESOURCES_PASSWORD` (env var) — the password
- `RESOURCES_COOKIE_SECRET` (env var) — 32-byte random string for HMAC signing
- Cookie: `resources-auth = <expiryTimestamp>.<HMAC-SHA256(expiryTimestamp, COOKIE_SECRET)>`
- Cookie flags: `httpOnly`, `secure`, `sameSite=lax`, `path=/`
- TTL: 30 days

Why HMAC the cookie instead of storing the password in it: if the cookie leaks, the password itself doesn't walk out.

No rate limiting (small known audience behind a password).

## 3. Data model

### 3.1 Files

Stored as Vercel Blobs with pathnames that encode subsection + upload time + slug:

```
resources/conferences/<timestamp_ms>__<slug>.<ext>
resources/lectures/<timestamp_ms>__<slug>.<ext>
resources/misc/<timestamp_ms>__<slug>.<ext>
```

- `<timestamp_ms>` — `Date.now()` at upload, gives stable sort + collision avoidance
- `<slug>` — original filename, lowercased, non-`[a-z0-9-]` chars replaced with `-`, collapsed
- Original filename preserved as the Blob's `contentDisposition` so downloads keep the human name

Listing a subsection = one `list({ prefix: 'resources/<sub>/' })` call.

### 3.2 Metadata blob

A single JSON blob at `resources/_metadata.json` holds External Links and any custom display titles for files:

```json
{
  "links": [
    {
      "id": "lnk_8f3a2c",
      "url": "https://example.org/peds-neuro-curriculum",
      "label": "AAN Peds Neuro Curriculum",
      "addedAt": 1745890234567
    }
  ],
  "fileTitles": {
    "resources/conferences/1745890234567__epilepsy-crash-course.pdf": "Epilepsy Crash Course (Apr 2026)"
  }
}
```

- `links[]` — full record per External Link.
- `fileTitles{}` — sparse map: only files with a user-supplied title appear here. All other files derive a title from the prettified slug.

Mutation pattern: read JSON → mutate → `put()` overwrite with `addRandomSuffix: false, allowOverwrite: true`. Last-write-wins is acceptable at this scale.

If `_metadata.json` doesn't exist yet (first write ever), treat as `{ links: [], fileTitles: {} }`.

### 3.3 Title resolution (read path)

For each file blob:

1. If `fileTitles[pathname]` exists → use it
2. Else: take the slug part of the pathname, replace `-` with space, title-case → "Epilepsy Crash Course"

## 4. UI

### 4.1 Homepage (`app/page.tsx`)

Insert one new horizontal feature card between the existing section grid (after the closing `</div>` of the grid) and the Helpful Links `<details>` block. Same shape as the Pathways card:

- Full-width across breakpoints (`sm:col-span-2 lg:col-span-3` — but it lives outside the grid, so just `w-full`)
- Indigo accent stripe (`#4f46e5`)
- Title: "Resources & Conferences"
- Subtitle: "Lectures · slides · external links · files"
- Right chevron, hover states matching siblings

Add `'resources': '#4f46e5'` to `accentMap` for consistency even though the homepage card is hardcoded (so any future search/index integration picks up the color).

### 4.2 `/resources/` page (`app/resources/page.tsx`)

Server component. On each request:

1. List Blobs under `resources/conferences/`, `resources/lectures/`, `resources/misc/`
2. Read `resources/_metadata.json` (or default if absent)
3. Render

Layout, top to bottom:

1. **Page header** — `<h1>Resources & Conferences</h1>` + one-line description
2. **Auth bar** — small, right-aligned. Either "🔒 Log in to upload" button (opens password modal) or "✓ Logged in · Log out" link. Authentication state is derived server-side from cookie presence + signature validity.
3. **Four subsection blocks** in this order: Conferences, Lectures / Teaching Files, External Links, Misc Files. Each block:
   - **Themed h2 banner** (icon + title + one-line description), inline-styled like Pathways banners:
     - Conferences — `#7c3aed` (purple), 🎓
     - Lectures / Teaching Files — `#059669` (emerald), 📚
     - External Links — `#2563eb` (blue), 🔗
     - Misc Files — `#475569` (slate), 📁
   - **Card grid** of existing items (reuse `.pathway-grid` / `.pathway-card` CSS classes from `globals.css`)
   - **Action zone** below the grid, only rendered when authed:
     - File subsections: drag-and-drop area with "or click to browse" fallback
     - External Links: `+ Add Link` button → modal

No left TOC sidebar, no `MobileSubsectionNav`. Resources is a tool page, not a content page.

### 4.3 File card

Reuses `.pathway-card` markup. Shows:

- Icon (📄 for PDFs/Word, 📊 for PPT, 🖼 for images)
- Title (resolved per §3.3)
- Type label ("PDF Document", "PowerPoint", "Word Document", "Image")
- Preview: `<object>` PDF embed for PDFs; image inline for PNG/JPG; generic icon block for PPT/DOC
- Action buttons: "View Full Screen ↗" and "⬇ Download"
- **When authed:** small "🗑 Delete" button bottom-right with a `confirm()` dialog

### 4.4 External Link card

Tighter than file cards:

- Label as the headline
- URL shown smaller below
- Open-in-new icon
- **When authed:** delete button

### 4.5 Drop zone

```
┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│                                                       │
│       ⬆  Drop a file here or click to browse         │
│       PDF, PPT/PPTX, DOC/DOCX, PNG/JPG · max 25 MB   │
│                                                       │
└─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

Flow: drop or pick → optional title prompt (modal with one text field, prefilled with derived title, "Skip" or "Save") → progress bar → POST to `/api/resources/upload` → on success, `router.refresh()` to re-render the server component with the new item.

### 4.6 Add Link modal

Two fields:

- URL (required, must parse + http/https scheme)
- Label (required, ≤ 200 chars)

Submit → POST `/api/resources/links` → `router.refresh()`.

### 4.7 Login modal

Single password field. Submit → POST `/api/resources/auth`. On 200, modal closes and `router.refresh()` re-renders with the auth-gated UI visible.

## 5. API surface

All routes live under `app/api/resources/`.

| Method & path | Auth | Body | Behavior |
|---|---|---|---|
| `POST /api/resources/auth` | none | `{ password }` | Compare to `RESOURCES_PASSWORD`. If match, set signed cookie. Else 401. |
| `POST /api/resources/logout` | none | — | Clear cookie. |
| `POST /api/resources/upload` | cookie | multipart: `file`, `subsection`, optional `title` | Validate type+size+subsection. Slug filename. `put()` to Blob. If title provided, update `_metadata.json` `fileTitles`. Return `{ pathname, url, title }`. |
| `DELETE /api/resources/file` | cookie | `{ pathname }` | Call Blob `del(pathname)`. Remove any `fileTitles[pathname]` entry. |
| `POST /api/resources/links` | cookie | `{ url, label }` | Validate URL + label. Append `{id, url, label, addedAt}` to `_metadata.json` `links`. Return new link. |
| `DELETE /api/resources/links` | cookie | `{ id }` | Remove link from `_metadata.json`. |

Public reads happen via the page's server component, not an API route.

## 6. Validation rules (server-enforced)

- **MIME allowlist**: `application/pdf`, `application/vnd.openxmlformats-officedocument.presentationml.presentation`, `application/vnd.ms-powerpoint`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `image/png`, `image/jpeg`
- **Max file size**: 25 MB
- **Subsection allowlist**: `conferences`, `lectures`, `misc`
- **URL**: must parse via `new URL()`, scheme must be `http` or `https`
- **Strings** (label, title): ≤ 200 chars, newlines stripped

Client also enforces type/size pre-upload for fast feedback, but server is the source of truth.

## 7. Failure modes

| Case | Handling |
|---|---|
| Wrong password | 401, modal shows "Incorrect password" |
| File too large / wrong MIME | 400 with specific reason |
| Blob `put()` fails | Roll back any `_metadata.json` mutation; 500 with generic message |
| `_metadata.json` missing | Treat as `{links:[], fileTitles:{}}` |
| Concurrent metadata writes | Last-write-wins (acceptable at scale) |
| `RESOURCES_PASSWORD` unset | Server returns 500 on auth attempt; admin must set env var |

## 8. Components / files affected

**New files:**

- `app/resources/page.tsx` — server component, the Resources page
- `app/api/resources/auth/route.ts`
- `app/api/resources/logout/route.ts`
- `app/api/resources/upload/route.ts`
- `app/api/resources/file/route.ts` (DELETE)
- `app/api/resources/links/route.ts` (POST + DELETE)
- `lib/resources/auth.ts` — `verifyCookie()`, `signCookie()`, `requireAuth()` helpers
- `lib/resources/metadata.ts` — `readMetadata()`, `writeMetadata()`, `slugify()`, `resolveTitle()`
- `lib/resources/validation.ts` — MIME, size, subsection, URL checks
- `components/resources/AuthBar.tsx`
- `components/resources/LoginModal.tsx`
- `components/resources/UploadDropzone.tsx`
- `components/resources/AddLinkModal.tsx`
- `components/resources/FileCard.tsx`
- `components/resources/LinkCard.tsx`

**Modified files:**

- `app/page.tsx` — insert horizontal feature card; add `'resources'` entry to `accentMap`
- `next.config.js` — remove `output: 'export'`
- `app/globals.css` — add any new styles for drop zone, modals, auth bar (reusing `.pathway-card` / `.pathway-grid` where possible)
- `package.json` — add `@vercel/blob`

**Env vars (set in Vercel dashboard):**

- `RESOURCES_PASSWORD`
- `RESOURCES_COOKIE_SECRET`
- `BLOB_READ_WRITE_TOKEN` (auto, when Blob store provisioned)

## 9. Out of scope (explicit non-goals)

- Recordings (video) — explicitly excluded by user
- Per-user accounts / who-uploaded-what tracking
- File rename / re-categorization (delete and re-upload instead)
- Folder hierarchy within subsections
- Search across uploaded resources (could add to global search index later)
- Mobile drag-drop polish — click-to-browse is the primary path on mobile
- Versioning / replace-in-place — uploading a same-named file produces a new blob (different timestamp prefix)
- Email notifications, audit log
- Rate limiting

## 10. Migration / rollout

- No data migration (greenfield section).
- First deploy after `output: 'export'` is removed will be the first non-static deploy. Verify all existing pages still render correctly on Vercel.
- After deploy: provision Vercel Blob store from dashboard, set `RESOURCES_PASSWORD` and `RESOURCES_COOKIE_SECRET`. Page is functional but empty until first upload.
