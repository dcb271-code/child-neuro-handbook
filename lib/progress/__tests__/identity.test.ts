import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../identity';
import {
  validatePassword, validatePseudonym, protectedNames, pseudonymMap, findCredential,
  MIN_PASSWORD_LENGTH, MAX_PSEUDONYM_LENGTH, type IdentityRecords,
} from '../identityLimits';
import { signIdentityCookie, readIdentityCookie } from '../identityAuth';
import { signCookie } from '@/lib/resources/auth';
import { signAdminCookie } from '../adminAuth';
import { MEMBERS } from '@/lib/roster';

const SECRET = 'test-secret';

describe('password hashing', () => {
  it('round-trips a password', () => {
    const { salt, hash } = hashPassword('owl-tree');
    expect(verifyPassword('owl-tree', salt, hash)).toBe(true);
    expect(verifyPassword('owl-tre', salt, hash)).toBe(false);
  });

  it('never stores the password itself', () => {
    const { salt, hash } = hashPassword('owl-tree');
    expect(hash).not.toContain('owl');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(salt).toMatch(/^[0-9a-f]{32}$/);
  });

  it('salts, so the same password hashes differently per resident', () => {
    expect(hashPassword('same').hash).not.toBe(hashPassword('same').hash);
  });

  it('refuses empty credentials rather than matching them', () => {
    // An admin reset stores empty salt/hash; that must not verify against ''.
    expect(verifyPassword('', '', '')).toBe(false);
    expect(verifyPassword('anything', '', '')).toBe(false);
  });
});

describe('validatePassword', () => {
  it('allows short memorable passwords but not trivial ones', () => {
    expect(validatePassword('ow')).toMatch(/at least/);
    expect(validatePassword('a'.repeat(MIN_PASSWORD_LENGTH))).toBeNull();
    expect(validatePassword('a'.repeat(500))).toMatch(/too long/);
    expect(validatePassword(42)).toMatch(/must be a string/);
  });
});

describe('validatePseudonym', () => {
  it('accepts an ordinary alias', () => {
    expect(validatePseudonym('Owl')).toBeNull();
    expect(validatePseudonym('  Owl  ')).toBeNull();
  });

  it('rejects empty, overlong and control characters', () => {
    expect(validatePseudonym('   ')).toMatch(/empty/);
    expect(validatePseudonym('x'.repeat(MAX_PSEUDONYM_LENGTH + 1))).toMatch(/or fewer/);
    expect(validatePseudonym(`Ow${String.fromCharCode(9)}l`)).toMatch(/invalid characters/);
    expect(validatePseudonym(`Ow${String.fromCharCode(0)}l`)).toMatch(/invalid characters/);
  });

  it('refuses to impersonate a colleague', () => {
    expect(validatePseudonym(MEMBERS[0].name)).toMatch(/another resident/);
    expect(validatePseudonym(MEMBERS[0].name.toUpperCase())).toMatch(/another resident/);
  });

  it('refuses to mimic a generated cohort label', () => {
    expect(validatePseudonym('PGY3 - Z')).toMatch(/PGY label/);
    expect(validatePseudonym('pgy4')).toMatch(/PGY label/);
  });
});

describe('record helpers', () => {
  const records: IdentityRecords = {
    residents: [
      { name: 'Cambri Fox', salt: 's', hash: 'h', pseudonym: 'Owl', updatedAt: 1 },
      // Alias only, no password — allowed, and must not count as protected.
      { name: 'Sean Woods', salt: '', hash: '', pseudonym: 'Kite', updatedAt: 2 },
    ],
  };

  it('counts only password holders as protected', () => {
    expect(protectedNames(records)).toEqual(['Cambri Fox']);
  });

  it('maps every chosen pseudonym, password or not', () => {
    const m = pseudonymMap(records);
    expect(m.get('Cambri Fox')).toBe('Owl');
    expect(m.get('Sean Woods')).toBe('Kite');
  });

  it('finds by exact name', () => {
    expect(findCredential(records, 'Cambri Fox')?.hash).toBe('h');
    expect(findCredential(records, 'cambri fox')).toBeUndefined();
  });
});

describe('identity cookie', () => {
  it('round-trips the resident name', () => {
    const c = signIdentityCookie('Cambri Fox', Date.now() + 60_000, SECRET);
    expect(readIdentityCookie(c, SECRET)).toBe('Cambri Fox');
  });

  it('rejects an expired cookie', () => {
    const c = signIdentityCookie('Cambri Fox', Date.now() - 1, SECRET);
    expect(readIdentityCookie(c, SECRET)).toBeNull();
  });

  it('cannot be edited to point at another resident', () => {
    const c = signIdentityCookie('Cambri Fox', Date.now() + 60_000, SECRET);
    const sig = c.slice(c.lastIndexOf('.') + 1);
    const forged = Buffer.from(
      JSON.stringify({ n: 'Sean Woods', exp: Date.now() + 60_000 }),
      'utf8',
    ).toString('base64url');
    expect(readIdentityCookie(`${forged}.${sig}`, SECRET)).toBeNull();
  });

  it('rejects cookies minted for other features with the same secret', () => {
    // All three share RESOURCES_COOKIE_SECRET; only the purpose namespacing in
    // each HMAC keeps them from being interchangeable.
    const exp = Date.now() + 60_000;
    expect(readIdentityCookie(signCookie(exp, SECRET), SECRET)).toBeNull();
    expect(readIdentityCookie(signAdminCookie(exp, SECRET), SECRET)).toBeNull();
  });

  it('rejects a wrong secret and malformed values', () => {
    const c = signIdentityCookie('Cambri Fox', Date.now() + 60_000, SECRET);
    expect(readIdentityCookie(c, 'other')).toBeNull();
    for (const v of [undefined, '', 'nope', '.', 'a.b']) {
      expect(readIdentityCookie(v as string | undefined, SECRET)).toBeNull();
    }
  });
});
