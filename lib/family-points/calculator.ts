// Pure scoring logic for Family Points. No I/O here — the store and API wrap this.

import {
  MONTHS,
  TEAMS,
  MEMBERS,
  memberByName,
  taskById,
  type Month,
} from './config';

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
  /** taskId → {count, points} for this member's logged tasks. */
  byTask: Record<string, { count: number; points: number }>;
};

export type TeamStanding = {
  teamId: string;
  name: string;
  colorIndex: number;
  total: number;
  byMonth: Record<Month, number>;
  members: MemberStanding[];
};

export type Leaderboard = {
  teams: TeamStanding[]; // sorted by total desc, then site order
  maxTeamTotal: number;
};

export function computeLeaderboard(entries: Entry[]): Leaderboard {
  const teamMap = new Map<string, TeamStanding>();
  for (const t of TEAMS) {
    const byMonth = Object.fromEntries(MONTHS.map((m) => [m, 0])) as Record<Month, number>;
    teamMap.set(t.id, {
      teamId: t.id,
      name: t.name,
      colorIndex: t.colorIndex,
      total: 0,
      byMonth,
      members: MEMBERS.filter((m) => m.teamId === t.id).map((m) => ({
        name: m.name,
        pgy: m.pgy,
        total: 0,
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
    team.total += points;
    if (MONTHS.includes(e.month)) team.byMonth[e.month] += points;

    const ms = team.members.find((m) => m.name === member.name);
    if (ms) {
      ms.total += points;
      const t = (ms.byTask[e.taskId] ??= { count: 0, points: 0 });
      t.count += e.count;
      t.points += points;
    }
  }

  const teams = [...teamMap.values()].sort((a, b) => b.total - a.total);
  for (const t of teams) t.members.sort((a, b) => b.total - a.total);

  return { teams, maxTeamTotal: Math.max(1, ...teams.map((t) => t.total)) };
}

/** Flat CSV of the raw entry log, for export back to Excel. */
export function entriesToCsv(entries: Entry[]): string {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = [
    ['Team', 'Member', 'Task', 'Points per task', 'Month', 'Count', 'Points', 'Entered'],
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
        new Date(e.createdAt).toISOString().slice(0, 10),
      ];
    }),
  ];
  return rows.map((r) => r.map(esc).join(',')).join('\n');
}
