// Blob pathname helpers for the resources area.
//
// Deliberately dependency-free: uploads now go straight from the browser to
// Blob storage, so the *client* has to build the pathname and the server has to
// validate it. `metadata.ts` imports the server-only @vercel/blob SDK, so these
// cannot live there without dragging that into the bundle.

import { ALLOWED_SUBSECTIONS, type Subsection } from './validation';

export const RESOURCES_PREFIX = 'resources/';

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

export function blobPathFor(sub: Subsection, originalName: string): string {
  const dot = originalName.lastIndexOf('.');
  const ext = dot > 0 ? originalName.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  const slug = slugify(originalName);
  const ts = Date.now();
  return `${RESOURCES_PREFIX}${sub}/${ts}__${slug}${ext ? `.${ext}` : ''}`;
}

/**
 * Whether a client-supplied pathname is one we're willing to mint an upload
 * token for. The browser now chooses the pathname, so this is the only thing
 * standing between a valid session and a write anywhere in the store —
 * including over `_metadata.json`.
 */
export function isUploadablePath(pathname: string): boolean {
  if (!pathname.startsWith(RESOURCES_PREFIX)) return false;
  if (pathname.includes('..') || pathname.includes('//')) return false;

  const rest = pathname.slice(RESOURCES_PREFIX.length);
  const slash = rest.indexOf('/');
  if (slash <= 0) return false; // must be resources/<subsection>/<file>

  const sub = rest.slice(0, slash);
  const file = rest.slice(slash + 1);
  if (!(ALLOWED_SUBSECTIONS as readonly string[]).includes(sub)) return false;
  if (file.length === 0 || file.includes('/')) return false;

  return true;
}
