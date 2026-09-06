// The residency roster — shared across Family Points and quiz-progress
// tracking. Single source of truth for who's in the program and what PGY
// year they're in; team assignment lives here too since Family Points needs
// it, but non-team features (like progress) only need name + pgy.

export type Member = {
  name: string;
  pgy: number;
  teamId: string;
};

export const MEMBERS: Member[] = [
  { name: 'Sean Woods',              pgy: 2, teamId: 'stroke-of-genius' },
  { name: 'Ellora Amrit',            pgy: 3, teamId: 'stroke-of-genius' },
  { name: 'Nidhi Ravishankar',       pgy: 5, teamId: 'stroke-of-genius' },
  { name: 'Bhoomi Bagadia',          pgy: 1, teamId: 'connectome-crew' },
  { name: 'Tasneem Karim',           pgy: 2, teamId: 'connectome-crew' },
  { name: 'Alex Voelker-Dunbar',     pgy: 3, teamId: 'connectome-crew' },
  { name: 'Khushbu Patel',           pgy: 5, teamId: 'connectome-crew' },
  { name: 'Arundhati Negi',          pgy: 1, teamId: 'nucleotide-ninjas' },
  { name: 'Casey Rutledge',          pgy: 3, teamId: 'nucleotide-ninjas' },
  { name: 'Gabriella Tison-Brandon', pgy: 4, teamId: 'nucleotide-ninjas' },
  { name: 'Grae McCarty',            pgy: 1, teamId: 'highly-functional' },
  { name: 'Cambri Fox',              pgy: 2, teamId: 'highly-functional' },
  { name: 'Charles Benton',          pgy: 4, teamId: 'highly-functional' },
  { name: 'Hana Danieli',            pgy: 5, teamId: 'highly-functional' },
  { name: 'Michael Clore',           pgy: 1, teamId: 'the-narcos' },
  { name: 'Rozena Nandedwalla',      pgy: 4, teamId: 'the-narcos' },
  { name: 'Chandler Lichtefeld',     pgy: 5, teamId: 'the-narcos' },
];

/**
 * Test identities. Selectable in the progress picker so the tracking can be
 * exercised end to end without impersonating a resident, but deliberately
 * *outside* `MEMBERS` — anything in that list joins a Family Points team and
 * shows up on the leaderboard.
 */
export type TestIdentity = { name: string; pgy: number };

/** PGY slot for test identities, so they get their own group instead of skewing a real cohort. */
export const TEST_PGY = 0;

export const TEST_MEMBERS: TestIdentity[] = [
  { name: 'BrockTest', pgy: TEST_PGY },
];

/** Anyone who may pick a name for quiz-progress tracking. */
export type Identity = { name: string; pgy: number };

export const IDENTITIES: Identity[] = [...MEMBERS, ...TEST_MEMBERS];

/**
 * Sort training years for display. TEST_PGY is numerically lowest but belongs
 * at the end — a test account should never head the list a resident picks from.
 */
export function comparePgy(a: number, b: number): number {
  if (a === TEST_PGY) return 1;
  if (b === TEST_PGY) return -1;
  return a - b;
}

/** Display label for a training year — test identities are not a "PGY0". */
export function pgyLabel(pgy: number): string {
  return pgy === TEST_PGY ? 'Test' : `PGY${pgy}`;
}

/**
 * Roster lookup. Stays limited to real residents on purpose: Family Points
 * validates entries through this, so widening it would let test entries into
 * the leaderboard (where they'd then be dropped for having no team).
 * Progress tracking uses `identityByName` instead.
 */
export function memberByName(name: string): Member | undefined {
  return MEMBERS.find((m) => m.name === name);
}

/** Lookup across residents *and* test identities, for progress tracking. */
export function identityByName(name: string): Identity | undefined {
  return IDENTITIES.find((m) => m.name === name);
}
