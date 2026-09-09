// Admin gate for the progress board — the one path that sees real names.
//
// Deliberately NOT the resources password: every resident has that in order to
// upload files, so reusing it would hand the full board to exactly the people
// it is meant to be hidden from.
//
// The signature is namespaced ("progress-admin:<expiry>") so a cookie minted
// for another feature with the same secret cannot be replayed here. Signing
// reuses RESOURCES_COOKIE_SECRET, so the only new value to configure is
// PROGRESS_ADMIN_PASSWORD.

import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const ADMIN_COOKIE_NAME = 'progress-admin';
export const ADMIN_COOKIE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const PURPOSE = 'progress-admin';

function hmacHex(message: string, secret: string): string {
  return createHmac('sha256', secret).update(`${PURPOSE}:${message}`).digest('hex');
}

export function signAdminCookie(expiryMs: number, secret: string): string {
  const ts = String(expiryMs);
  return `${ts}.${hmacHex(ts, secret)}`;
}

export function verifyAdminCookie(value: string | undefined, secret: string): boolean {
  if (!value) return false;
  const dot = value.indexOf('.');
  if (dot < 1) return false;

  const ts = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  if (!/^\d+$/.test(ts)) return false;
  if (!/^[0-9a-f]{64}$/.test(sig)) return false;

  const expected = hmacHex(ts, secret);
  if (!timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) return false;

  const expiry = Number(ts);
  return Number.isFinite(expiry) && expiry > Date.now();
}

/**
 * Whether this request may see the unredacted board. Fails closed: if either
 * env var is missing, nobody is admin rather than everybody.
 */
export function isProgressAdmin(): boolean {
  const secret = process.env.RESOURCES_COOKIE_SECRET;
  const password = process.env.PROGRESS_ADMIN_PASSWORD;
  if (!secret || !password) return false;
  try {
    return verifyAdminCookie(cookies().get(ADMIN_COOKIE_NAME)?.value, secret);
  } catch {
    return false;
  }
}
