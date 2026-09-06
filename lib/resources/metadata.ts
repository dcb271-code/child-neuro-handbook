import { put, list } from '@vercel/blob';
import type { Subsection } from './validation';
// Path helpers moved to paths.ts (importable from client components, which
// cannot pull in the @vercel/blob server SDK above). Re-exported so existing
// callers of these from metadata.ts keep working.
import { slugify, blobPathFor } from './paths';
export { slugify, blobPathFor } from './paths';

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
export const EMPTY_METADATA: Metadata = Object.freeze({ links: [], fileTitles: {} }) as Metadata;

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
  if (!hit) return { links: [], fileTitles: {} };

  // Cache-bust per request. The pathname is stable across overwrites and Blob
  // content URLs are CDN-cached; `uploadedAt` does not reliably change on
  // overwrite, so a stable stamp can pin reads to stale metadata and let the
  // next write clobber links or titles saved in between.
  const bust = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const res = await fetch(`${hit.url}?v=${bust}`, { cache: 'no-store' });
  if (!res.ok) return { links: [], fileTitles: {} };
  try {
    const data = (await res.json()) as Metadata;
    return {
      links: Array.isArray(data?.links) ? data.links : [],
      fileTitles: data?.fileTitles && typeof data.fileTitles === 'object' ? data.fileTitles : {},
    };
  } catch {
    return { links: [], fileTitles: {} };
  }
}

export async function writeMetadata(md: Metadata): Promise<void> {
  await put(METADATA_PATH, JSON.stringify(md), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
  });
}

export function newLinkId(): string {
  // 6 hex chars is enough at this scale
  return 'lnk_' + Math.random().toString(16).slice(2, 8);
}
