import { describe, it, expect } from 'vitest';
import { computeProgress, type Attempt } from '../calculator';
import { redactBoard, assignPseudonyms, pseudonymLetter } from '../privacy';
import { MEMBERS, TEST_MEMBERS } from '@/lib/roster';

let seq = 0;
function attempt(over: Partial<Attempt> = {}): Attempt {
  seq += 1;
  return {
    id: `pa_${seq}`, member: 'Cambri Fox', quiz: 'rite',
    questionId: `q${seq}`, correct: true, createdAt: 1_760_000_000_000, ...over,
  };
}

const pgy2 = MEMBERS.filter((m) => m.pgy === 2).map((m) => m.name);

describe('pseudonymLetter', () => {
  it('counts A, B, C then rolls over', () => {
    expect(pseudonymLetter(0)).toBe('A');
    expect(pseudonymLetter(25)).toBe('Z');
    expect(pseudonymLetter(26)).toBe('AA');
  });
});

describe('assignPseudonyms', () => {
  it('labels everyone in the cohort uniquely', () => {
    const map = assignPseudonyms(pgy2, 2);
    expect(map.size).toBe(pgy2.length);
    expect(new Set(map.values()).size).toBe(pgy2.length);
    for (const v of map.values()) expect(v).toMatch(/^PGY2 · [A-Z]+$/);
  });

  it('is stable across calls', () => {
    expect([...assignPseudonyms(pgy2, 2)]).toEqual([...assignPseudonyms(pgy2, 2)]);
  });

  it('is not simply alphabetical', () => {
    // With three people per year, "first alphabetically is A" would hand the
    // mapping straight back to anyone who has the roster — and the roster ships
    // in the client bundle.
    const alphabetical = [...pgy2].sort();
    const map = assignPseudonyms(pgy2, 2);
    const byLetter = alphabetical.map((n) => map.get(n)!);
    expect(byLetter).not.toEqual(alphabetical.map((_, i) => `PGY2 · ${pseudonymLetter(i)}`));
  });
});

describe('redactBoard', () => {
  const attempts = [
    attempt({ member: 'Cambri Fox', correct: true }),
    attempt({ member: 'Sean Woods', correct: false }),
    attempt({ member: 'Casey Rutledge', correct: true }),
    attempt({ member: 'BrockTest', correct: true }),
  ];
  const raw = computeProgress(attempts);

  it('leaves the board untouched for an admin', () => {
    const out = redactBoard(raw, 'BrockTest', true);
    expect(out).toEqual(raw);
    const names = out.rite.pgys.flatMap((g) => g.members.map((m) => m.name));
    expect(names).toContain('Cambri Fox');
    expect(names).toContain('BrockTest');
  });

  it('shows the viewer their own name and nobody else theirs', () => {
    const out = redactBoard(raw, 'Cambri Fox', false);
    const names = out.rite.pgys.flatMap((g) => g.members.map((m) => m.name));
    expect(names).toContain('Cambri Fox');
    for (const m of MEMBERS) {
      if (m.name === 'Cambri Fox') continue;
      expect(names).not.toContain(m.name);
    }
  });

  it('marks exactly one row as the viewer', () => {
    const out = redactBoard(raw, 'Cambri Fox', false);
    const mine = out.rite.pgys.flatMap((g) => g.members.filter((m) => m.isViewer));
    expect(mine).toHaveLength(1);
    expect(mine[0].name).toBe('Cambri Fox');
  });

  it('keeps other residents\' numbers visible under a pseudonym', () => {
    // The point is hiding whose score is whose, not hiding that scores exist.
    const out = redactBoard(raw, 'Cambri Fox', false);
    const pgy3 = out.rite.pgys.find((g) => g.pgy === 3)!;
    const answered = pgy3.members.filter((m) => m.completed > 0);
    expect(answered).toHaveLength(1);
    expect(answered[0].name).toMatch(/^PGY3 · [A-Z]+$/);
    expect(answered[0].completed).toBe(1);
  });

  it('hides test identities from residents entirely', () => {
    const out = redactBoard(raw, 'Cambri Fox', false);
    const names = out.rite.pgys.flatMap((g) => g.members.map((m) => m.name));
    for (const t of TEST_MEMBERS) expect(names).not.toContain(t.name);
    expect(out.rite.pgys.map((g) => g.pgy)).not.toContain(TEST_MEMBERS[0].pgy);
  });

  it('redacts everyone when no name is selected', () => {
    const out = redactBoard(raw, null, false);
    const names = out.rite.pgys.flatMap((g) => g.members.map((m) => m.name));
    for (const m of MEMBERS) expect(names).not.toContain(m.name);
    expect(out.rite.pgys.flatMap((g) => g.members.filter((m) => m.isViewer))).toHaveLength(0);
  });

  it('preserves resident totals through redaction', () => {
    const out = redactBoard(raw, 'Cambri Fox', false);
    for (const g of out.rite.pgys) {
      const before = raw.rite.pgys.find((x) => x.pgy === g.pgy)!;
      expect(g.completed).toBe(before.completed);
      expect(g.pct).toBe(before.pct);
    }
  });

  it('excludes hidden test attempts from the totals residents see', () => {
    // Otherwise a test run shows up in the programme-wide headline while its
    // row is hidden, so the number cannot be reconciled with the rows.
    const onlyTest = computeProgress([
      attempt({ member: 'BrockTest', quiz: 'rite', correct: true }),
      attempt({ member: 'BrockTest', quiz: 'rite', correct: true }),
    ]);
    expect(onlyTest.rite.completed).toBe(2);

    const resident = redactBoard(onlyTest, 'Cambri Fox', false);
    expect(resident.rite.completed).toBe(0);
    expect(resident.rite.correct).toBe(0);
    expect(resident.rite.pct).toBe(0);

    // The admin still sees them.
    expect(redactBoard(onlyTest, 'BrockTest', true).rite.completed).toBe(2);
  });

  it('keeps every visible row summing to the totals shown', () => {
    const out = redactBoard(raw, 'Cambri Fox', false);
    for (const quiz of Object.values(out)) {
      const rows = quiz.pgys.flatMap((g) => g.members);
      expect(rows.reduce((s, m) => s + m.completed, 0)).toBe(quiz.completed);
      expect(rows.reduce((s, m) => s + m.correct, 0)).toBe(quiz.correct);
    }
  });

  it('redacts every quiz, not just the one being looked at', () => {
    const board = computeProgress([attempt({ member: 'Sean Woods', quiz: 'peds' })]);
    const out = redactBoard(board, 'Cambri Fox', false);
    for (const quiz of Object.values(out)) {
      const names = quiz.pgys.flatMap((g) => g.members.map((m) => m.name));
      expect(names).not.toContain('Sean Woods');
    }
  });
});
