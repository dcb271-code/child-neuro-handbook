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

/** Diastat (diazepam rectal gel) per-age dosing per the institutional pathway.
    The 28d–1y band has a sub-rule by weight (5–9.9 kg → 2.5 mg, ≥10 kg → 5 mg). */
export function calcDiastatPR(ageBand: AgeBand, weightKg: number): number {
  if (ageBand === '28d-1y') return weightKg < 10 ? 2.5 : 5;
  if (ageBand === '1-5y')   return Math.round(0.5 * weightKg * 10) / 10;
  if (ageBand === '6-11y')  return Math.round(0.3 * weightKg * 10) / 10;
  return Math.round(0.2 * weightKg * 10) / 10;     // ge_12y
}
