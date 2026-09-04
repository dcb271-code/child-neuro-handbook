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

export function memberByName(name: string): Member | undefined {
  return MEMBERS.find((m) => m.name === name);
}
