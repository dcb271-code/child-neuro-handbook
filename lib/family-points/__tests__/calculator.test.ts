import { describe, it, expect } from 'vitest';
import {
  validateNewEntry,
  computeLeaderboard,
  entryPoints,
  entriesToCsv,
  type Entry,
} from '../calculator';
import { TEAMS, MEMBERS, TASKS, MONTHS, monthForDate } from '../config';

function entry(partial: Partial<Entry>): Entry {
  return {
    id: 'fpe_test',
    member: 'Cambri Fox',
    taskId: 'lp',
    month: 'July',
    count: 1,
    createdAt: 0,
    ...partial,
  };
}

describe('config integrity', () => {
  it('every member belongs to a real team', () => {
    const teamIds = new Set(TEAMS.map((t) => t.id));
    for (const m of MEMBERS) expect(teamIds.has(m.teamId)).toBe(true);
  });

  it('every team has at least 3 members', () => {
    for (const t of TEAMS) {
      expect(MEMBERS.filter((m) => m.teamId === t.id).length).toBeGreaterThanOrEqual(3);
    }
  });

  it('task ids and member names are unique', () => {
    expect(new Set(TASKS.map((t) => t.id)).size).toBe(TASKS.length);
    expect(new Set(MEMBERS.map((m) => m.name)).size).toBe(MEMBERS.length);
  });

  it('spreadsheet parity: 17 residents, 5 teams, 18 tasks', () => {
    expect(MEMBERS.length).toBe(17);
    expect(TEAMS.length).toBe(5);
    expect(TASKS.length).toBe(18);
  });

  it('monthForDate maps calendar dates into academic-year months', () => {
    expect(monthForDate(new Date(2026, 7, 18))).toBe('August');
    expect(monthForDate(new Date(2027, 0, 5))).toBe('January');
    expect(MONTHS[0]).toBe('July');
    expect(MONTHS[11]).toBe('June');
  });
});

describe('validateNewEntry', () => {
  it('accepts a valid entry', () => {
    expect(validateNewEntry({ member: 'Cambri Fox', taskId: 'lp', month: 'July', count: 2 })).toBeNull();
  });

  it('rejects unknown member, task, and month', () => {
    expect(validateNewEntry({ member: 'Nobody', taskId: 'lp', month: 'July', count: 1 })).toMatch(/member/);
    expect(validateNewEntry({ member: 'Cambri Fox', taskId: 'nope', month: 'July', count: 1 })).toMatch(/task/);
    expect(validateNewEntry({ member: 'Cambri Fox', taskId: 'lp', month: 'Smarch', count: 1 })).toMatch(/month/);
  });

  it('rejects zero, negative, fractional, and huge counts', () => {
    for (const count of [0, -1, 1.5, 100]) {
      expect(validateNewEntry({ member: 'Cambri Fox', taskId: 'lp', month: 'July', count })).toMatch(/count/);
    }
  });

  it('rejects non-objects', () => {
    expect(validateNewEntry(null)).not.toBeNull();
    expect(validateNewEntry('lp')).not.toBeNull();
  });
});

describe('entryPoints', () => {
  it('multiplies task points by count', () => {
    expect(entryPoints({ member: 'Cambri Fox', taskId: 'lp', month: 'July', count: 2 })).toBe(10);
    expect(entryPoints({ member: 'Cambri Fox', taskId: 'chapter', month: 'July', count: 1 })).toBe(75);
  });
});

describe('computeLeaderboard', () => {
  it('returns all five teams with zero totals for an empty log', () => {
    const board = computeLeaderboard([]);
    expect(board.teams.length).toBe(5);
    for (const t of board.teams) expect(t.total).toBe(0);
    expect(board.maxTeamTotal).toBe(1); // avoids divide-by-zero in bar widths
  });

  it('credits points to the right team, month, and member', () => {
    const board = computeLeaderboard([entry({ member: 'Cambri Fox', taskId: 'lp', count: 2, month: 'July' })]);
    const hf = board.teams.find((t) => t.teamId === 'highly-functional')!;
    expect(hf.total).toBe(10);
    expect(hf.byMonth['July']).toBe(10);
    expect(hf.byMonth['August']).toBe(0);
    const cambri = hf.members.find((m) => m.name === 'Cambri Fox')!;
    expect(cambri.total).toBe(10);
    expect(cambri.byTask['lp']).toEqual({ count: 2, points: 10 });
  });

  it('sorts teams by total descending', () => {
    const board = computeLeaderboard([
      entry({ id: 'a', member: 'Sean Woods', taskId: 'chapter', count: 1 }),      // Stroke of Genius +75
      entry({ id: 'b', member: 'Michael Clore', taskId: 'lp', count: 1 }),        // The Narcos +5
    ]);
    expect(board.teams[0].teamId).toBe('stroke-of-genius');
    expect(board.maxTeamTotal).toBe(75);
  });

  it('skips entries referencing removed members or tasks instead of crashing', () => {
    const board = computeLeaderboard([
      entry({ member: 'Graduated Resident' }),
      entry({ taskId: 'retired-task' }),
      entry({ id: 'ok', count: 1 }),
    ]);
    const hf = board.teams.find((t) => t.teamId === 'highly-functional')!;
    expect(hf.total).toBe(5);
  });
});

describe('entriesToCsv', () => {
  it('produces a header plus one row per entry with computed points', () => {
    const csv = entriesToCsv([entry({ count: 2 })]);
    const lines = csv.split('\n');
    expect(lines.length).toBe(2);
    expect(lines[0]).toContain('Team,Member,Task');
    expect(lines[1]).toContain('Highly Functional,Cambri Fox,LP,5,July,2,10');
  });

  it('quotes fields containing commas', () => {
    const csv = entriesToCsv([entry({ taskId: 'other-procedure' })]);
    expect(csv).toContain('"Other procedure (sutures, splints, staples, etc)"');
  });
});
