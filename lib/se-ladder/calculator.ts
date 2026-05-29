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
