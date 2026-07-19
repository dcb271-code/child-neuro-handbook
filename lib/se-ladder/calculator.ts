/* SE Med Ladder — pure logic, mirrors the structure of lib/hie/calculator.ts.
   Operationalizes the institutional Pediatric Convulsive SE pathway. */

export type AgeBand = '28d-1y' | '1-5y' | '6-11y' | 'ge_12y';
export type Route = 'IV' | 'IM' | 'IN' | 'PR' | 'infusion';
export type Flag =
  | 'suspected_dravet' | 'polg_mito' | 'cardiac_conduction' | 'renal'
  | 'on_home_phenobarb' | 'on_home_levetiracetam';
export type Phase = 'stabilization' | 'first_line' | 'second_line' | 'refractory' | 'super_refractory';

export type PatientInputs = {
  weightKg: number;
  ageBand: AgeBand;
  ivAccess: boolean;
  isNeonate: boolean;
  flags: Flag[];
};

export type Severity = 'contraindicated' | 'caution' | 'note';
export type CautionChip = { severity: Severity; text: string };

export type DrugRecommendation = {
  drug: string;
  route: Route;
  mgPerKg?: number;
  mg: number;
  maxCap: number;
  hitCap: boolean;
  infusionTime?: string;
  rate?: string;
  note?: string;
  cautions: CautionChip[];
  rank: number;
};

/** Dose math with cap: returns clipped mg + whether the cap was hit. */
export function mgFor(mgPerKg: number, weightKg: number, maxCap: number): { mg: number; hitCap: boolean } {
  const raw = mgPerKg * weightKg;
  if (raw > maxCap) return { mg: maxCap, hitCap: true };
  return { mg: Math.round(raw * 10) / 10, hitCap: false };
}


export type StabilizationItem = { id: string; label: string; note?: string };

export function recommendStabilization(): StabilizationItem[] {
  return [
    { id: 'abc',        label: 'ABCs — position airway, supplemental O₂' },
    { id: 'glucose',    label: 'Check glucose; treat if <60 mg/dL' },
    { id: 'iv_io',      label: 'Get IV or IO access' },
    { id: 'labs',       label: 'Send basic labs (CBC, BMP, ammonia, lactate)', note: 'Consider toxicology, blood gas as indicated' },
    { id: 'asm_levels', label: 'Send ASM levels if on chronic ASMs' },
  ];
}

const respCaution: CautionChip = { severity: 'caution', text: 'Watch airway / blood pressure' };

export function recommendFirstLine(p: PatientInputs): DrugRecommendation[] {
  const out: DrugRecommendation[] = [];
  if (p.ivAccess) {
    const loraz = mgFor(0.1, p.weightKg, 4);
    out.push({
      drug: 'lorazepam', route: 'IV', mgPerKg: 0.1, mg: loraz.mg, maxCap: 4, hitCap: loraz.hitCap,
      infusionTime: 'over 2 min', note: 'May repeat once after 3–5 min if still seizing',
      cautions: [respCaution], rank: 1,
    });
    return out;
  }
  // No IV access path. IM is intentionally not offered — this institution uses IN or IV only.
  const midIN = mgFor(0.2, p.weightKg, 10);
  out.push({
    drug: 'midazolam', route: 'IN', mgPerKg: 0.2, mg: midIN.mg, maxCap: 10, hitCap: midIN.hitCap,
    note: '0.1 mg/kg per nostril; use concentrated solution',
    cautions: [respCaution], rank: 1,
  });
  return out;
}

type SecondLineEntry = {
  drug: string; mgPerKg: number; maxCap: number; infusionTime: string;
  baseCautions?: CautionChip[];
};

const SECOND_LINE_TABLE: SecondLineEntry[] = [
  { drug: 'levetiracetam', mgPerKg: 60, maxCap: 4500, infusionTime: 'over 10–15 min',
    baseCautions: [
      { severity: 'note', text: 'Load range 40–60 mg/kg per institutional pathway (60 shown)' },
    ] },
  { drug: 'fosphenytoin',  mgPerKg: 20, maxCap: 1500, infusionTime: 'over 10–15 min',
    baseCautions: [{ severity: 'note', text: 'Consider extra 10 mg PE/kg if no response after 10 min' }] },
  { drug: 'phenobarbital', mgPerKg: 20, maxCap: 1000, infusionTime: 'over 15 min',
    baseCautions: [
      { severity: 'note', text: 'Max infusion rate: 1–2 mg/kg/min' },
      { severity: 'caution', text: 'Respiratory depression and hypotension' },
    ] },
  { drug: 'valproate',     mgPerKg: 40, maxCap: 3000, infusionTime: 'over 10–15 min',
    baseCautions: [
      { severity: 'note', text: 'Max infusion rate: up to ~20 mg/min' },
      { severity: 'note', text: 'Load range 20–40 mg/kg per institutional pathway (40 shown)' },
    ] },
];

export function recommendSecondLine(p: PatientInputs): DrugRecommendation[] {
  return SECOND_LINE_TABLE.map((e, idx) => {
    const { mg, hitCap } = mgFor(e.mgPerKg, p.weightKg, e.maxCap);
    const cautions: CautionChip[] = [...(e.baseCautions ?? [])];

    // Per-drug flag filters
    if (e.drug === 'fosphenytoin') {
      if (p.flags.includes('suspected_dravet')) cautions.push({ severity: 'contraindicated', text: 'Contraindicated: suspected Dravet — sodium-channel blockers can paradoxically worsen' });
      if (p.flags.includes('cardiac_conduction')) cautions.push({ severity: 'contraindicated', text: 'Contraindicated: cardiac conduction disease — risk of arrhythmia' });
    }
    if (e.drug === 'valproate') {
      if (p.flags.includes('polg_mito')) cautions.push({ severity: 'contraindicated', text: 'Contraindicated: known/suspected POLG or mitochondrial disease (hepatotoxicity)' });
      if (p.ageBand === '28d-1y' && !p.flags.includes('polg_mito')) {
        cautions.push({ severity: 'contraindicated', text: 'Avoid in <2 y unless POLG status is known' });
      }
      if (p.ageBand === '1-5y' && !p.flags.includes('polg_mito')) {
        cautions.push({ severity: 'caution', text: 'If patient <2 y of age, avoid unless POLG status is known' });
      }
    }
    if (e.drug === 'levetiracetam' && p.flags.includes('renal')) {
      cautions.push({ severity: 'caution', text: 'Renal impairment: consider dose reduction' });
    }
    if (e.drug === 'levetiracetam' && p.flags.includes('on_home_levetiracetam')) {
      cautions.push({ severity: 'note', text: 'Safe even if on home levetiracetam — give the full load' });
    }
    if (e.drug === 'phenobarbital' && p.flags.includes('on_home_phenobarb')) {
      cautions.push({ severity: 'caution', text: 'Already on home phenobarbital — do not repeat full load' });
    }

    return {
      drug: e.drug, route: 'IV' as Route,
      mgPerKg: e.mgPerKg, mg, maxCap: e.maxCap, hitCap,
      infusionTime: e.infusionTime,
      cautions, rank: idx + 1,
    };
  });
}

export function recommendRefractory(p: PatientInputs): DrugRecommendation[] {
  const midBolus = mgFor(0.15, p.weightKg, 1000);   // 0.1–0.15 mg/kg, no realistic cap
  const ketBolus = mgFor(2, p.weightKg, 1000);
  return [
    {
      drug: 'midazolam', route: 'infusion',
      mgPerKg: 0.15, mg: midBolus.mg, maxCap: 1000, hitCap: false,
      rate: 'start 0.1 mg/kg/hr; ↑ by 0.1 q15–30 min; usual switch ≥0.6–1; absolute max 2 mg/kg/hr',
      note: 'Bolus 0.1–0.15 mg/kg over 2 min; intubate; start continuous EEG. PRIMARY 3rd-line.',
      cautions: [{ severity: 'caution', text: 'Watch BP; tachyphylaxis common with prolonged infusion' }],
      rank: 1,
    },
    {
      drug: 'ketamine', route: 'infusion',
      mgPerKg: 2, mg: ketBolus.mg, maxCap: 1000, hitCap: false,
      rate: 'start 0.5–1 mg/kg/hr; ↑ by 0.5 q30–120 min to max 6 mg/kg/hr',
      note: 'Bolus 2 mg/kg over 5 min. Alternative or early adjunct to midazolam (NMDA blockade complements GABAergic agents; emerging earlier-is-better signal).',
      cautions: [{ severity: 'note', text: 'Consider adding earlier rather than waiting for SRSE' }],
      rank: 2,
    },
  ];
}

export type GivenLog = Partial<Record<Phase, boolean>>;

const PHASE_ORDER: Phase[] = ['stabilization','first_line','second_line','refractory','super_refractory'];

export function currentPhase(given: GivenLog): Phase {
  for (const p of PHASE_ORDER) {
    if (!given[p]) return p;
  }
  return 'super_refractory';
}

export function nextPhase(p: Phase): Phase {
  const i = PHASE_ORDER.indexOf(p);
  return i < 0 || i === PHASE_ORDER.length - 1 ? p : PHASE_ORDER[i + 1];
}

export function recommendSuperRefractory(p: PatientInputs): DrugRecommendation[] {
  const pentoBolus = mgFor(5, p.weightKg, 1000);
  return [
    {
      drug: 'pentobarbital', route: 'infusion',
      mgPerKg: 5, mg: pentoBolus.mg, maxCap: 1000, hitCap: false,
      rate: 'start 0.5 mg/kg/hr; ↑ by 0.5 to max 5 mg/kg/hr',
      note: 'Bolus 2–5 mg/kg over 15 min. Goal: burst-suppression on EEG. Reserved for SRSE (used a few times/year).',
      cautions: [
        { severity: 'caution', text: 'Hemodynamic, immunosuppression, GI dysmotility burden' },
        { severity: 'note',    text: 'Contains sugar alcohol (no ketosis)' },
      ],
      rank: 1,
    },
    {
      drug: 'anakinra', route: 'IV', mg: 0, maxCap: 0, hitCap: false,
      note: 'IL-1Ra. Consider for FIRES/NORSE; typically SC dosing per rheum/ICU/Neuro protocol.',
      cautions: [{ severity: 'note', text: 'Pair with concurrent immunotherapy and supportive care' }],
      rank: 2,
    },
    {
      drug: 'ketogenic_diet', route: 'IV', mg: 0, maxCap: 0, hitCap: false,
      note: 'Consider initiating in SRSE/FIRES; coordinate with dietitian/neurology.',
      cautions: [],
      rank: 3,
    },
    {
      drug: 'immunotherapy', route: 'IV', mg: 0, maxCap: 0, hitCap: false,
      note: 'Pulse methylprednisolone ± IVIG ± plasma exchange; consider tocilizumab in select FIRES.',
      cautions: [],
      rank: 4,
    },
  ];
}
