'use client';

import type { NewAttempt } from './calculator';

/**
 * Fire-and-forget: log quiz attempts if (and only if) the resident has opted
 * into tracking. Never blocks or throws into the caller — a failed log
 * shouldn't interrupt someone taking a quiz.
 */
export function submitAttempts(attempts: NewAttempt[]): void {
  if (attempts.length === 0) return;
  fetch('/api/progress/attempts/', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ attempts }),
  })
    .then(async (res) => {
      // fetch only rejects on network failure, so a 403 or 400 used to vanish
      // without a trace — including "this name is password-protected", which
      // is now a reachable outcome.
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        console.error('[progress] submitAttempts rejected:', res.status, detail?.error ?? '');
      }
    })
    .catch((err) => {
      console.error('[progress] submitAttempts failed:', err);
    });
}
