import { describe, it, expect } from 'vitest';
import { parseNameCookie, NAME_COOKIE } from '../cookie';

describe('parseNameCookie', () => {
  it('reads the name back, decoded', () => {
    expect(parseNameCookie(`${NAME_COOKIE}=Casey%20Rutledge`)).toBe('Casey Rutledge');
  });

  it('finds it among other cookies with spaces around separators', () => {
    const s = `a=1; ${NAME_COOKIE}=Alex%20Voelker-Dunbar ; progress-identity=abc.def`;
    expect(parseNameCookie(s)).toBe('Alex Voelker-Dunbar');
  });

  it('does not match a cookie whose name merely starts the same', () => {
    expect(parseNameCookie(`${NAME_COOKIE}-other=Nope`)).toBeNull();
    expect(parseNameCookie(`x${NAME_COOKIE}=Nope`)).toBeNull();
  });

  it('returns null when absent, empty, or undecodable', () => {
    expect(parseNameCookie('')).toBeNull();
    expect(parseNameCookie(null)).toBeNull();
    expect(parseNameCookie(undefined)).toBeNull();
    expect(parseNameCookie('a=1; b=2')).toBeNull();
    expect(parseNameCookie(`${NAME_COOKIE}=`)).toBeNull();
    expect(parseNameCookie(`${NAME_COOKIE}=%E0%A4%A`)).toBeNull();
  });
});
