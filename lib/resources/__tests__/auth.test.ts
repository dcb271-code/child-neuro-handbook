import { describe, it, expect } from 'vitest';
import { signCookie, verifyCookie } from '../auth';

const SECRET = 'a'.repeat(64); // hex secret in tests

describe('signCookie / verifyCookie', () => {
  it('round-trips a valid cookie', () => {
    const cookie = signCookie(Date.now() + 60_000, SECRET);
    expect(verifyCookie(cookie, SECRET)).toBe(true);
  });

  it('rejects an empty or malformed cookie', () => {
    expect(verifyCookie('', SECRET)).toBe(false);
    expect(verifyCookie('garbage', SECRET)).toBe(false);
    expect(verifyCookie('123.notahash', SECRET)).toBe(false);
  });

  it('rejects a tampered timestamp', () => {
    const cookie = signCookie(Date.now() + 60_000, SECRET);
    const [_ts, sig] = cookie.split('.');
    const tampered = `${Date.now() + 999_999}.${sig}`;
    expect(verifyCookie(tampered, SECRET)).toBe(false);
  });

  it('rejects a tampered signature', () => {
    const cookie = signCookie(Date.now() + 60_000, SECRET);
    const [ts] = cookie.split('.');
    const tampered = `${ts}.${'0'.repeat(64)}`;
    expect(verifyCookie(tampered, SECRET)).toBe(false);
  });

  it('rejects an expired cookie', () => {
    const cookie = signCookie(Date.now() - 1, SECRET);
    expect(verifyCookie(cookie, SECRET)).toBe(false);
  });

  it('rejects a cookie signed with a different secret', () => {
    const cookie = signCookie(Date.now() + 60_000, SECRET);
    expect(verifyCookie(cookie, 'b'.repeat(64))).toBe(false);
  });
});
