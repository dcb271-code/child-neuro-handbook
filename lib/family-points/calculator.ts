// Pure scoring logic for Family Points. No I/O here — the store and API wrap this.

import {
  MONTHS,
  TEAMS,
  MEMBERS,
  memberByName,
  monthForDate,
  taskById,
  type Month,
} from './config';

/**
 * Points can be logged against a month that has not happened yet — a conference
 * already booked, say. Those are held as "pending" and excluded from standings
 * until their month arrives, so nobody can lead in September on the strength of
 * a trip in April. They convert on their own once the month comes round.
 */
export function isPending(month: Month, now: Date = new Date()): boolean {
  return MONTHS.indexOf(month) > MONTHS.indexOf(monthForDate(now));
}

export type Entry = {
  id: string;
  member: string;
  taskId: string;
  month: Month;
  count: number;
  createdAt: number;
};

export type NewEntry = Pick<Entry, 'member' | 'taskId' | 'month' | 'count'>;

export const MAX_COUNT = 99;

/** Returns an error message, or null if the entry is valid. */
export function validateNewEntry(input: unknown): string | null {
  if (typeof input !== 'object' || input === null) return 'entry must be an object';
  const e = input as Record<string, unknown>;

  if (typeof e.member !== 'string' || !memberByName(e.member)) {
    return `unknown member: ${String(e.member)}`;
  }
  if (typeof e.taskId !== 'string' || !taskById(e.taskId)) {
    return `unknown task: ${String(e.taskId)}`;
  }
  if (typeof e.month !== 'string' || !MONTHS.includes(e.month as Month)) {
    return `invalid month: ${String(e.month)}`;
  }
  if (
    typeof e.count !== 'number' ||
    !Number.isInteger(e.count) ||
    e.count < 1 ||
    e.count > MAX_COUNT
  ) {
    return `count must be an integer between 1 and ${MAX_COUNT}`;
  }
  return null;
}

export function entryPoints(e: NewEntry): number {
  const task = taskById(e.taskId);
  return task ? task.points * e.count : 0;
}

export type MemberStanding = {
  name: string;
  pgy: number;
  total: number;
  /** Points logged against a month that has not arrived yet. */
  pending: number;
  /** taskId → {count, points} for this member's earned tasks. */
  byTask: Record<string, { count: number; points: number }>;
};

export type TeamStanding = {
  teamId: string;
  name: string;
  colorIndex: number;
  total: number;
  pending: number;
  byMonth: Record<Month, number>;
  members: MemberStanding[];
};

/** Residents grouped by training year, so people are only ever shown next to their own cohort. */
export type PgyStanding = {
  pgy: number;
  total: number;
  pending: number;
  members: MemberStanding[]; // sorted by total desc
};

export type Leaderboard = {
  teams: TeamStanding[]; // sorted by total desc, then site order
  maxTeamTotal: number;
  pgys: PgyStanding[]; // ascending by training year
  pendingTotal: number;
};

export function computeLeaderboard(entries: Entry[], now: Date = new Date()): Leaderboard {
  const teamMap = new Map<string, TeamStanding>();
  for (const t of TEAMS) {
    const byMonth = Object.fromEntries(MONTHS.map((m) => [m, 0])) as Record<Month, number>;
    teamMap.set(t.id, {
      teamId: t.id,
      name: t.name,
      colorIndex: t.colorIndex,
      total: 0,
      pending: 0,
      byMonth,
      members: MEMBERS.filter((m) => m.teamId === t.id).map((m) => ({
        name: m.name,
        pgy: m.pgy,
        total: 0,
        pending: 0,
        byTask: {},
      })),
    });
  }

  for (const e of entries) {
    const member = memberByName(e.member);
    const task = taskById(e.taskId);
    if (!member || !task) continue; // roster/task drift — skip rather than crash
    const team = teamMap.get(member.teamId);
    if (!team) continue;

    const points = task.points * e.count;
    const ms = team.members.find((m) => m.name === member.name);

    if (isPending(e.month, now)) {
      team.pending += points;
      if (ms) ms.pending += points;
      continue; // not earned yet: keep it out of totals and the monthly table
    }

    team.total += points;
    if (MONTHS.includes(e.month)) team.byMonth[e.month] += points;

    if (ms) {
      ms.total += points;
      const t = (ms.byTask[e.taskId] ??= { count: 0, points: 0 });
      t.count += e.count;
      t.points += points;
    }
  }

  const teams = [...teamMap.values()].sort((a, b) => b.total - a.total);
  for (const t of teams) t.members.sort((a, b) => b.total - a.total);

  const allMembers = teams.flatMap((t) => t.members);
  const pgys: PgyStanding[] = [...new Set(MEMBERS.map((m) => m.pgy))]
    .sort((a, b) => a - b)
    .map((pgy) => {
      const members = allMembers
        .filter((m) => m.pgy === pgy)
        .sort((a, b) => b.total - a.total);
      return {
        pgy,
        total: members.reduce((s, m) => s + m.total, 0),
        pending: members.reduce((s, m) => s + m.pending, 0),
        members,
      };
    });

  return {
    teams,
    maxTeamTotal: Math.max(1, ...teams.map((t) => t.total)),
    pgys,
    pendingTotal: teams.reduce((s, t) => s + t.pending, 0),
  };
}

/** Flat CSV of the raw entry log, for export back to Excel. */
export function entriesToCsv(entries: Entry[], now: Date = new Date()): string {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = [
    ['Team', 'Member', 'Task', 'Points per task', 'Month', 'Count', 'Points', 'Status', 'Entered'],
    ...entries.map((e) => {
      const member = memberByName(e.member);
      const task = taskById(e.taskId);
      const team = TEAMS.find((t) => t.id === member?.teamId);
      return [
        team?.name ?? '',
        e.member,
        task?.label ?? e.taskId,
        task?.points ?? '',
        e.month,
        e.count,
        entryPoints(e),
        isPending(e.month, now) ? 'pending' : 'earned',
        new Date(e.createdAt).toISOString().slice(0, 10),
      ];
    }),
  ];
  return rows.map((r) => r.map(esc).join(',')).join('\n');
}
