// Password hashing for per-resident progress credentials. **Server only** —
// imports node:crypto, so never pull this into a client component; use
// identityLimits.ts for constants and validators instead.
//
// Both privacy features are opt-in and independent:
//
//   - A **pseudonym** replaces the generated cohort letter ("PGY3 · B") with
//     something the resident chose. Cosmetic; it changes what others see.
//   - A **password** is the part with teeth. Identity is otherwise just a name
//     picked from a dropdown, so anyone could select a colleague and read that
//     colleague's row. Once a resident sets a password, their name resolves
//     only for a request carrying their verified cookie — see resolveViewer in
//     app/api/progress/attempts/route.ts.
//
// Passwords are deliberately allowed to be short and memorable: the threat is a
// curious colleague, not a credential-stuffing botnet, and a rule that pushes
// people towards a sticky note would be worse. They are still stored as scrypt
// hashes with a per-resident salt, never in clear.

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export * from './identityLimits';

const KEY_LENGTH = 32;

export function hashPassword(
  password: string,
  salt: string = randomBytes(16).toString('hex'),
): { salt: string; hash: string } {
  return { salt, hash: scryptSync(password, salt, KEY_LENGTH).toString('hex') };
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  if (!salt || !hash) return false;
  let expected: Buffer;
  try {
    expected = Buffer.from(hash, 'hex');
  } catch {
    return false;
  }
  if (expected.length !== KEY_LENGTH) return false;
  const candidate = scryptSync(password, salt, KEY_LENGTH);
  return timingSafeEqual(candidate, expected);
}
