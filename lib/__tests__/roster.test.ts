import { describe, it, expect } from 'vitest';
import {
  MEMBERS, TEST_MEMBERS, IDENTITIES, TEST_PGY,
  memberByName, identityByName, pgyLabel, comparePgy,
} from '@/lib/roster';

describe('roster / test identity separation', () => {
  it('keeps test identities out of the real roster', () => {
    // MEMBERS drives Family Points team rosters and PGY standings, so a test
    // account in it would appear on the leaderboard.
    expect(MEMBERS.map((m) => m.name)).not.toContain('BrockTest');
    expect(MEMBERS).toHaveLength(17);
  });

  it('offers test identities in the picker', () => {
    expect(IDENTITIES.map((m) => m.name)).toContain('BrockTest');
    expect(IDENTITIES).toHaveLength(MEMBERS.length + TEST_MEMBERS.length);
  });

  it('resolves a test identity only through identityByName', () => {
    // Family Points validates entries with memberByName; if that resolved a
    // test name, the entry would pass validation and then vanish for having
    // no team.
    expect(memberByName('BrockTest')).toBeUndefined();
    expect(identityByName('BrockTest')).toBeDefined();
    expect(identityByName('BrockTest')!.pgy).toBe(TEST_PGY);
  });

  it('still resolves real residents through both', () => {
    expect(memberByName('Cambri Fox')).toBeDefined();
    expect(identityByName('Cambri Fox')!.pgy).toBe(2);
  });

  it('does not collide with a real training year', () => {
    expect(MEMBERS.map((m) => m.pgy)).not.toContain(TEST_PGY);
  });

  it('labels the test group as Test, not PGY0', () => {
    expect(pgyLabel(TEST_PGY)).toBe('Test');
    expect(pgyLabel(3)).toBe('PGY3');
  });
});

describe('comparePgy', () => {
  it('sorts the test group last, not first', () => {
    const order = [TEST_PGY, 3, 1, 5, 2, 4].sort(comparePgy);
    expect(order).toEqual([1, 2, 3, 4, 5, TEST_PGY]);
  });

  it('leaves real years in ascending order', () => {
    expect([5, 1, 3].sort(comparePgy)).toEqual([1, 3, 5]);
  });
});
