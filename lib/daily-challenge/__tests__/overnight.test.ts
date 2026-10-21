import { describe, it, expect } from 'vitest';
import { hourInZone, isOvernightBypass } from '../overnight';

// All instants are given in UTC and checked against Eastern wall-clock time.
// January is EST (UTC−5); July is EDT (UTC−4).
const utc = (iso: string) => new Date(iso);

describe('hourInZone', () => {
  it('converts UTC to Eastern standard time', () => {
    expect(hourInZone(utc('2026-01-15T04:00:00Z'))).toBe(23); // 11 pm EST
    expect(hourInZone(utc('2026-01-15T05:00:00Z'))).toBe(0); // midnight EST
    expect(hourInZone(utc('2026-01-15T11:00:00Z'))).toBe(6); // 6 am EST
  });

  it('follows daylight saving time', () => {
    expect(hourInZone(utc('2026-07-15T03:00:00Z'))).toBe(23); // 11 pm EDT
    expect(hourInZone(utc('2026-07-15T10:00:00Z'))).toBe(6); // 6 am EDT
  });
});

describe('isOvernightBypass', () => {
  it('opens at 11:00 pm Eastern', () => {
    expect(isOvernightBypass(utc('2026-01-15T03:59:59Z'))).toBe(false); // 10:59:59 pm EST
    expect(isOvernightBypass(utc('2026-01-15T04:00:00Z'))).toBe(true); // 11:00:00 pm EST
  });

  it('stays open through midnight and until 5:59 am Eastern', () => {
    expect(isOvernightBypass(utc('2026-01-15T05:00:00Z'))).toBe(true); // midnight EST
    expect(isOvernightBypass(utc('2026-01-15T08:30:00Z'))).toBe(true); // 3:30 am EST
    expect(isOvernightBypass(utc('2026-01-15T10:59:59Z'))).toBe(true); // 5:59:59 am EST
  });

  it('closes at 6:00 am Eastern', () => {
    expect(isOvernightBypass(utc('2026-01-15T11:00:00Z'))).toBe(false); // 6:00:00 am EST
    expect(isOvernightBypass(utc('2026-01-15T17:00:00Z'))).toBe(false); // noon EST
  });

  it('uses the same wall-clock hours under daylight saving', () => {
    expect(isOvernightBypass(utc('2026-07-15T02:59:59Z'))).toBe(false); // 10:59:59 pm EDT
    expect(isOvernightBypass(utc('2026-07-15T03:00:00Z'))).toBe(true); // 11:00:00 pm EDT
    expect(isOvernightBypass(utc('2026-07-15T09:59:59Z'))).toBe(true); // 5:59:59 am EDT
    expect(isOvernightBypass(utc('2026-07-15T10:00:00Z'))).toBe(false); // 6:00:00 am EDT
  });
});
