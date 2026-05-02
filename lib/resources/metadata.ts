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
export const EMPTY_METADATA: Metadata = Object.freeze({ links: [], fileTitles: {} }) as Metadata;

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
