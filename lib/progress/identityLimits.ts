// Limits, validators and lookups for per-resident progress credentials.
//
// Split out from identity.ts because that file imports node:crypto for hashing,
// and these are needed by a client component (components/identity/
// PrivacyOptions.tsx). Importing the crypto half into the browser bundle fails
// the webpack build outright.

import { MEMBERS } from '@/lib/roster';

export type ResidentCredential = {
  /** Roster name this credential belongs to. */
  name: string;
  salt: string; // hex
  hash: string; // hex
  /** Optional display name shown to other residents in place of a letter. */
  pseudonym?: string;
  updatedAt: number;
};

export type IdentityRecords = {
  residents: ResidentCredential[];
};

export const MIN_PASSWORD_LENGTH = 4;
export const MAX_PASSWORD_LENGTH = 128;
export const MAX_PSEUDONYM_LENGTH = 24;

/** Returns an error message, or null if acceptable. */
export function validatePassword(input: unknown): string | null {
  if (typeof input !== 'string') return 'password must be a string';
  if (input.length < MIN_PASSWORD_LENGTH) {
    return `password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (input.length > MAX_PASSWORD_LENGTH) return 'password is too long';
  return null;
}

/** Returns an error message, or null if acceptable. */
export function validatePseudonym(input: unknown): string | null {
  if (typeof input !== 'string') return 'pseudonym must be a string';
  const trimmed = input.trim();
  if (trimmed.length === 0) return 'pseudonym cannot be empty';
  if (trimmed.length > MAX_PSEUDONYM_LENGTH) {
    return `pseudonym must be ${MAX_PSEUDONYM_LENGTH} characters or fewer`;
  }
  // Control characters would let a pseudonym break the layout it renders into.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) return 'pseudonym contains invalid characters';

  // Don't let someone label themselves as a colleague, or mimic the generated
  // cohort labels and pass their scores off as another cohort's.
  const lower = trimmed.toLowerCase();
  if (MEMBERS.some((m) => m.name.toLowerCase() === lower)) {
    return 'pseudonym cannot be another resident\u2019s name';
  }
  if (/^pgy\s*\d/i.test(trimmed)) return 'pseudonym cannot start with a PGY label';

  return null;
}

export function findCredential(
  records: IdentityRecords,
  name: string,
): ResidentCredential | undefined {
  return records.residents.find((r) => r.name === name);
}

/** Names that require a password to be viewed or logged against. */
export function protectedNames(records: IdentityRecords): string[] {
  return records.residents.filter((r) => r.hash).map((r) => r.name);
}

/** name -> chosen pseudonym, for rows a viewer may not see by name. */
export function pseudonymMap(records: IdentityRecords): Map<string, string> {
  const out = new Map<string, string>();
  for (const r of records.residents) {
    if (r.pseudonym) out.set(r.name, r.pseudonym);
  }
  return out;
}
