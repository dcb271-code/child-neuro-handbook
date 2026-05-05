export type Dim1Category =
  | 'epilepsy'
  | 'metabolic'
  | 'genetic-developmental'
  | 'neuromuscular'
  | 'headache'
  | 'behavioral-neurocognitive'
  | 'neuroinfectious'
  | 'demyelinating'
  | 'movement'
  | 'vascular'
  | 'neuro-onc'
  | 'neuroimmunologic'
  | 'neuro-oph-oto'
  | 'trauma'
  | 'psychiatric'
  | 'sleep'
  | 'autonomic'
  | 'normal-development';

export type Dim2Category =
  | 'neuroscience'
  | 'treatment'
  | 'clinical-aspects'
  | 'diagnostic-procedures';

export type Population = 'peds' | 'adult';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type QuestionType = 'recall' | 'application';

export type ModuleId = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const MODULE_IDS: ModuleId[] = [1, 2, 3, 4, 5, 6, 7];

export type Option = {
  text: string;
  isCorrect: boolean;
  rationale: string;
};

export type Question = {
  id: string;
  bank: 'board-review' | 'clerkship';
  type: QuestionType;
  labels: {
    dim1Category: Dim1Category;
    dim2Category: Dim2Category;
    population: Population;
    section: string;
  };
  difficulty: Difficulty;
  clerkshipAppropriate: boolean;
  module: ModuleId;
  dateAdded: string;
  sources: string[];
  learningObjective: string;
  blueprintTopic: string;
  vignette: string | null;
  leadIn: string;
  options: Option[];
};

export const DIM1_LABEL: Record<Dim1Category, string> = {
  epilepsy: 'Epilepsy',
  metabolic: 'Metabolic',
  'genetic-developmental': 'Genetic / Developmental',
  neuromuscular: 'Neuromuscular',
  headache: 'Headache',
  'behavioral-neurocognitive': 'Behavioral / Cognitive',
  neuroinfectious: 'Neuroinfectious',
  demyelinating: 'Demyelinating',
  movement: 'Movement Disorders',
  vascular: 'Vascular',
  'neuro-onc': 'Neuro-oncology',
  neuroimmunologic: 'Neuroimmunologic',
  'neuro-oph-oto': 'Neuro-ophth / -otology',
  trauma: 'Trauma',
  psychiatric: 'Psychiatric',
  sleep: 'Sleep',
  autonomic: 'Autonomic',
  'normal-development': 'Normal Development',
};

export const DIM1_COLOR: Record<Dim1Category, string> = {
  epilepsy: '#7c3aed',
  metabolic: '#4f46e5',
  'genetic-developmental': '#6366f1',
  neuromuscular: '#0d9488',
  headache: '#ea580c',
  'behavioral-neurocognitive': '#db2777',
  neuroinfectious: '#dc2626',
  demyelinating: '#0284c7',
  movement: '#16a34a',
  vascular: '#e11d48',
  'neuro-onc': '#7e22ce',
  neuroimmunologic: '#0369a1',
  'neuro-oph-oto': '#0891b2',
  trauma: '#b91c1c',
  psychiatric: '#9333ea',
  sleep: '#6b7280',
  autonomic: '#475569',
  'normal-development': '#65a30d',
};
