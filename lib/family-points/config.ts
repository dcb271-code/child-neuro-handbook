// Family Points — teams, roster, and task catalog for the 2026–2027 academic year.
// Seeded from the "Peds Neuro Families Score Tracker" spreadsheet (July 2026).
// Roster/point changes are made here; scores live in Vercel Blob (see store.ts).

export const ACADEMIC_YEAR = '2026–2027';

// Academic-year order. July = 2026 … June = 2027.
export const MONTHS = [
  'July', 'August', 'September', 'October', 'November', 'December',
  'January', 'February', 'March', 'April', 'May', 'June',
] as const;

export type Month = (typeof MONTHS)[number];

export type Team = {
  id: string;
  name: string;
  /** Index into the .fp-c-{n} color classes in globals.css (CVD-validated palette). */
  colorIndex: number;
};

export const TEAMS: Team[] = [
  { id: 'stroke-of-genius',  name: 'Stroke of Genius',  colorIndex: 0 },
  { id: 'connectome-crew',   name: 'Connectome Crew',   colorIndex: 1 },
  { id: 'nucleotide-ninjas', name: 'Nucleotide Ninjas', colorIndex: 2 },
  { id: 'highly-functional', name: 'Highly Functional', colorIndex: 3 },
  { id: 'the-narcos',        name: 'The Narcos',        colorIndex: 4 },
];

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

export type Task = {
  id: string;
  label: string;
  points: number;
};

export const TASKS: Task[] = [
  { id: 'champagne-tap',           label: 'Champagne tap',                                   points: 20 },
  { id: 'lp',                      label: 'LP',                                              points: 5 },
  { id: 'other-procedure',         label: 'Other procedure (sutures, splints, staples, etc)', points: 5 },
  { id: 'instagram-takeover',      label: 'Instagram takeover (>2x in 24h)',                 points: 10 },
  { id: 'meet-and-greet',          label: 'Meet and greet',                                  points: 10 },
  { id: 'wellness-lunch',          label: 'Wellness lunch / mentor meetup (25 each resident)', points: 25 },
  { id: 'program-wellness-event',  label: 'Child Neuro Program wellness event',              points: 5 },
  { id: 'program-wellness-family', label: 'Program wellness event — entire family',          points: 5 },
  { id: 'exercise-wellness',       label: 'Exercise wellness event',                         points: 10 },
  { id: 'board-prep',              label: 'Board prep questions (50 questions)',             points: 5 },
  { id: 'networking',              label: 'Networking meeting',                              points: 10 },
  { id: 'poster',                  label: 'Poster (1st/2nd author)',                         points: 25 },
  { id: 'conference-travel',       label: 'Travel to a conference',                          points: 25 },
  { id: 'paper',                   label: 'Paper (1st/2nd author)',                          points: 50 },
  { id: 'chapter',                 label: 'Published chapter',                               points: 75 },
  { id: 'elective-lecture',        label: 'Electively prepared lecture (not assigned)',      points: 25 },
  { id: 'med-school-teaching',     label: 'Formal medical school teaching (per session)',    points: 5 },
  { id: 'advocacy',                label: 'Advocacy event',                                  points: 10 },
];

export function teamById(id: string): Team | undefined {
  return TEAMS.find((t) => t.id === id);
}

export function memberByName(name: string): Member | undefined {
  return MEMBERS.find((m) => m.name === name);
}

export function taskById(id: string): Task | undefined {
  return TASKS.find((t) => t.id === id);
}

/** The academic-year month that contains the given date. */
export function monthForDate(d: Date): Month {
  const calendarOrder: Month[] = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return calendarOrder[d.getMonth()];
}
