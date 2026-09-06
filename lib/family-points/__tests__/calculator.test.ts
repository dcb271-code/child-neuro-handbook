import { describe, it, expect } from 'vitest';
import {
  validateNewEntry,
  computeLeaderboard,
  entryPoints,
  entriesToCsv,
  isPending,
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

/** Fixed clock: academic month = March, so July–March are earned and April–June pending. */
const NOW = new Date(2027, 2, 15);

describe('isPending', () => {
  it('treats months after the current academic month as pending', () => {
    expect(isPending('April', NOW)).toBe(true);
    expect(isPending('June', NOW)).toBe(true);
  });

  it('treats the current month and earlier as earned', () => {
    expect(isPending('March', NOW)).toBe(false);
    expect(isPending('July', NOW)).toBe(false);
    expect(isPending('December', NOW)).toBe(false);
  });

  it('holds nothing back in June, the last academic month', () => {
    const june = new Date(2027, 5, 10);
    for (const m of MONTHS) expect(isPending(m, june)).toBe(false);
  });
});

describe('computeLeaderboard', () => {
  it('returns all five teams with zero totals for an empty log', () => {
    const board = computeLeaderboard([], NOW);
    expect(board.teams.length).toBe(5);
    for (const t of board.teams) expect(t.total).toBe(0);
    expect(board.maxTeamTotal).toBe(1); // avoids divide-by-zero in bar widths
  });

  it('credits points to the right team, month, and member', () => {
    const board = computeLeaderboard([entry({ member: 'Cambri Fox', taskId: 'lp', count: 2, month: 'July' })], NOW);
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
    ], NOW);
    expect(board.teams[0].teamId).toBe('stroke-of-genius');
    expect(board.maxTeamTotal).toBe(75);
  });

  it('skips entries referencing removed members or tasks instead of crashing', () => {
    const board = computeLeaderboard([
      entry({ member: 'Graduated Resident' }),
      entry({ taskId: 'retired-task' }),
      entry({ id: 'ok', count: 1 }),
    ], NOW);
    const hf = board.teams.find((t) => t.teamId === 'highly-functional')!;
    expect(hf.total).toBe(5);
  });
});

describe('pending points', () => {
  const future = entry({ member: 'Ellora Amrit', taskId: 'conference-travel', month: 'May', count: 1 });

  it('keeps future-month points out of team and member totals', () => {
    const board = computeLeaderboard([future], NOW);
    const sog = board.teams.find((t) => t.teamId === 'stroke-of-genius')!;
    expect(sog.total).toBe(0);
    expect(sog.pending).toBe(25);
    expect(sog.members.find((m) => m.name === 'Ellora Amrit')!.pending).toBe(25);
    expect(board.pendingTotal).toBe(25);
  });

  it('keeps future points out of the monthly table', () => {
    const board = computeLeaderboard([future], NOW);
    const sog = board.teams.find((t) => t.teamId === 'stroke-of-genius')!;
    expect(sog.byMonth['May']).toBe(0);
  });

  it('counts the same entry once its month arrives', () => {
    const later = new Date(2027, 4, 20); // May
    const board = computeLeaderboard([future], later);
    const sog = board.teams.find((t) => t.teamId === 'stroke-of-genius')!;
    expect(sog.total).toBe(25);
    expect(sog.pending).toBe(0);
    expect(sog.byMonth['May']).toBe(25);
  });

  it('leaves pending points out of a member task breakdown', () => {
    const board = computeLeaderboard([future], NOW);
    const ellora = board.teams
      .flatMap((t) => t.members)
      .find((m) => m.name === 'Ellora Amrit')!;
    expect(Object.keys(ellora.byTask)).toEqual([]);
  });
});

describe('PGY standings', () => {
  it('groups every resident into an ascending cohort', () => {
    const board = computeLeaderboard([], NOW);
    expect(board.pgys.map((g) => g.pgy)).toEqual([1, 2, 3, 4, 5]);
    expect(board.pgys.reduce((s, g) => s + g.members.length, 0)).toBe(MEMBERS.length);
  });

  it('totals a cohort across teams and sorts members by points', () => {
    // Nidhi (PGY5, Stroke of Genius) and Chandler (PGY5, The Narcos)
    const board = computeLeaderboard([
      entry({ id: 'a', member: 'Nidhi Ravishankar', taskId: 'chapter', month: 'July', count: 1 }), // 75
      entry({ id: 'b', member: 'Chandler Lichtefeld', taskId: 'lp', month: 'July', count: 1 }),    // 5
    ], NOW);
    const pgy5 = board.pgys.find((g) => g.pgy === 5)!;
    expect(pgy5.total).toBe(80);
    expect(pgy5.members[0].name).toBe('Nidhi Ravishankar');
  });
});

describe('entriesToCsv', () => {
  it('produces a header plus one row per entry with computed points', () => {
    const csv = entriesToCsv([entry({ count: 2 })], NOW);
    const lines = csv.split('\n');
    expect(lines.length).toBe(2);
    expect(lines[0]).toContain('Team,Member,Task');
    expect(lines[1]).toContain('Highly Functional,Cambri Fox,LP,5,July,2,10,earned');
  });

  it('quotes fields containing commas', () => {
    const csv = entriesToCsv([entry({ taskId: 'other-procedure' })], NOW);
    expect(csv).toContain('"Other procedure (sutures, splints, staples, etc)"');
  });
});

describe('test identities are not Family Points members', () => {
  it('rejects an entry authored by a test identity', () => {
    // Progress tracking accepts BrockTest; the leaderboard must not, since it
    // has no team and the entry would be silently dropped from team totals.
    expect(validateNewEntry({
      member: 'BrockTest', taskId: TASKS[0].id, count: 1, date: '2026-09-06',
    })).toMatch(/unknown member/i);
  });

  it('leaves team rosters at the real roster size', () => {
    const totalOnTeams = TEAMS.reduce(
      (s, t) => s + MEMBERS.filter((m) => m.teamId === t.id).length, 0,
    );
    expect(totalOnTeams).toBe(MEMBERS.length);
    expect(MEMBERS.length).toBe(17);
  });
});
