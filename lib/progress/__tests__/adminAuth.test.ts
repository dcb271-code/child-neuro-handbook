import { describe, it, expect } from 'vitest';
import { signAdminCookie, verifyAdminCookie } from '../adminAuth';
import { signCookie } from '@/lib/resources/auth';

const SECRET = 'test-secret';

describe('admin cookie', () => {
  it('accepts a cookie it signed', () => {
    expect(verifyAdminCookie(signAdminCookie(Date.now() + 60_000, SECRET), SECRET)).toBe(true);
  });

  it('rejects an expired cookie', () => {
    expect(verifyAdminCookie(signAdminCookie(Date.now() - 1, SECRET), SECRET)).toBe(false);
  });

  it('rejects a cookie signed with another secret', () => {
    expect(verifyAdminCookie(signAdminCookie(Date.now() + 60_000, 'other'), SECRET)).toBe(false);
  });

  it('rejects a resources cookie replayed as an admin cookie', () => {
    // Both features sign with RESOURCES_COOKIE_SECRET, and every resident holds
    // a resources cookie in order to upload files. Without the purpose
    // namespacing in the HMAC, pasting that value into the admin cookie would
    // hand out the by-name board.
    const expiry = Date.now() + 60_000;
    const resourcesCookie = signCookie(expiry, SECRET);
    expect(verifyAdminCookie(resourcesCookie, SECRET)).toBe(false);
    expect(signAdminCookie(expiry, SECRET)).not.toBe(resourcesCookie);
  });

  it('rejects malformed and empty values', () => {
    for (const v of [undefined, '', 'nope', '.', '123.', `${Date.now() + 1000}.zz`]) {
      expect(verifyAdminCookie(v as string | undefined, SECRET)).toBe(false);
    }
  });

  it('rejects a tampered expiry', () => {
    const good = signAdminCookie(Date.now() + 1_000, SECRET);
    const [, sig] = good.split('.');
    expect(verifyAdminCookie(`${Date.now() + 999_000}.${sig}`, SECRET)).toBe(false);
  });
});
