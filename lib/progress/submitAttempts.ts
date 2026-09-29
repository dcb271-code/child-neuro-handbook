'use client';

import type { NewAttempt } from './calculator';

const RETRY_DELAYS_MS = [1000, 3000, 8000];

/**
 * Log quiz attempts if (and only if) the resident has opted into tracking.
 * Never throws into the caller — a failed log shouldn't interrupt someone
 * taking a quiz. Resolves true once the server confirms the write.
 *
 * Network failures and 5xx are retried; the batch id lets the server drop a
 * retry whose earlier request did land. `keepalive` lets the request outlive
 * the page, since "Finish" is often followed straight away by navigating off.
 */
export async function submitAttempts(attempts: NewAttempt[]): Promise<boolean> {
  if (attempts.length === 0) return true;
  const batchId = crypto.randomUUID();
  const body = JSON.stringify({ attempts, batchId });

  for (let i = 0; ; i++) {
    try {
      const res = await fetch('/api/progress/attempts/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        keepalive: true,
      });
      if (res.ok) return true;
      // fetch only rejects on network failure, so a 403 or 400 used to vanish
      // without a trace — including "this name is password-protected".
      const detail = await res.json().catch(() => ({}));
      console.error('[progress] submitAttempts rejected:', res.status, detail?.error ?? '');
      if (res.status < 500) return false; // retrying won't change a 4xx
    } catch (err) {
      console.error('[progress] submitAttempts failed:', err);
    }
    if (i >= RETRY_DELAYS_MS.length) return false;
    await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[i]));
  }
}
