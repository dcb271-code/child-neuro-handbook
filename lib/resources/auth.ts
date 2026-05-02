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
