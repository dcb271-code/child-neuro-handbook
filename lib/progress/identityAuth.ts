// Signed cookie proving "I hold the password for this resident".
//
// Namespaced like adminAuth: it shares RESOURCES_COOKIE_SECRET, so without a
// purpose string in the HMAC a cookie minted for another feature could be
// replayed here. The resident's name sits inside the signed payload, so the
// cookie cannot be edited to point at somebody else.

import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const IDENTITY_COOKIE_NAME = 'progress-identity';
// Long-lived on purpose: the ask was "entered once per resident", so this
// should outlast a rotation block rather than expiring mid-year.
export const IDENTITY_COOKIE_TTL_MS = 180 * 24 * 60 * 60 * 1000; // 180 days

const PURPOSE = 'progress-identity';

function hmacHex(message: string, secret: string): string {
  return createHmac('sha256', secret).update(`${PURPOSE}:${message}`).digest('hex');
}

export function signIdentityCookie(name: string, expiryMs: number, secret: string): string {
  const payload = Buffer.from(JSON.stringify({ n: name, exp: expiryMs }), 'utf8')
    .toString('base64url');
  return `${payload}.${hmacHex(payload, secret)}`;
}

/** The verified resident name carried by this cookie, or null. */
export function readIdentityCookie(value: string | undefined, secret: string): string | null {
  if (!value) return null;
  const dot = value.lastIndexOf('.');
  if (dot < 1) return null;

  const payload = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  if (!/^[0-9a-f]{64}$/.test(sig)) return null;

  const expected = hmacHex(payload, secret);
  if (!timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      n?: unknown;
      exp?: unknown;
    };
    if (typeof parsed.n !== 'string' || typeof parsed.exp !== 'number') return null;
    if (!Number.isFinite(parsed.exp) || parsed.exp <= Date.now()) return null;
    return parsed.n;
  } catch {
    return null;
  }
}

/** Verified resident for the current request, or null. */
export function verifiedResident(): string | null {
  const secret = process.env.RESOURCES_COOKIE_SECRET;
  if (!secret) return null;
  try {
    return readIdentityCookie(cookies().get(IDENTITY_COOKIE_NAME)?.value, secret);
  } catch {
    return null;
  }
}
