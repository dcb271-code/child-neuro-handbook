# SUDEP Calculator — SCN1A Genotype/Phenotype Axis Reorganization

**Date:** 2026-05-26
**Status:** Approved design (pre-implementation)
**Scope:** Pediatric SUDEP risk model only (`lib/sudep-risk/calculator.ts` + `components/sudep-risk/SUDEPRiskCalculator.tsx`). SUDEP-7 and SUDEP-3 are untouched.

## Problem

The pediatric model is `phenotypeBaseline × geneMult × clinicalMults`. Today there is a single SCN1A genetic option, `scn1a_nondravet`, with a **×3.5 multiplier** applied on top of whatever syndrome baseline is selected, plus a special-case that **suppresses** the gene effect for the Dravet syndrome baseline (which already bakes in SCN1A).

Two problems result:

1. **Ordering anomaly.** Holding clinical factors constant, a non-Dravet syndrome carrying SCN1A out-ranks Dravet itself:
   - Drug-resistant focal + SCN1A = `1.20 × 3.5 = 4.20` effective baseline → **10.71/1000py (Very high)**
   - Dravet (SCN1A suppressed) = `1.80` baseline → **4.59/1000py (High)**

   Dravet — the archetypal highest-SUDEP syndrome — comes out *below* focal/generalized DRE / LGS whenever those carry SCN1A. The ×3.5 rides whichever syndrome baseline it is paired with, producing clinically implausible absolutes for unusual pairings (SCN1A is not focal-DRE biology).

2. **Conflation of the SCN1A spectrum.** The single `scn1a_nondravet` option lumps together two very different patients: a **severe non-Dravet SCN1A DEE** (genuinely high risk) and a **GEFS+ / mild SCN1A patient with normal intelligence** (benign end). Both receive the ×3.5, over-estimating the mild end.

### Evidence reviewed

- **Donnan 2023 (PMID 36750385):** DEE-only cohort. SUDEP proportion was higher in *non-Dravet* SCN1A DEE (3/15, 27%) than Dravet-SCN1A (12/203, 5.9%) — **but** this is a per-patient proportion in n=15 (3 deaths), which the authors explicitly caution is too small to estimate reliably, and is **not** an incidence rate. The only Dravet *rate* reported is 4.4/1000py (95% CI 2.3–7.8). The cohort never included mild GEFS+ / normal-IQ phenotypes.
- **Cooper 2016 (PMID 27810515):** Dravet SUDEP 9.32/1000py (95% CI 4.46–19.45) — the highest documented syndrome-specific rate in the literature.
- **SCN1A spectrum** (GeneReviews "SCN1A Seizure Disorders"; Frontiers systematic review PMC8739186): SCN1A spans simple febrile seizures → GEFS+ (mild end) → Dravet → severe DEE; SUDEP is "significantly higher in Dravet than the milder GEFS+ phenotype."
- **Gain-of-function "beyond Dravet" entity** (Sadleir/Berecki, Brain 2022 / Ann Neurol 2019): a distinct, *more severe* non-Dravet SCN1A entity (neonatal onset, arthrogryposis, hyperkinetic movement disorder, profound impairment; variants cluster differently, OR 17.8) genuinely exists — supporting "severe non-Dravet SCN1A DEE belongs at/above Dravet" on **severity** grounds, though no SUDEP *rate* exists for it.

**Conclusion:** A strict "non-Dravet SCN1A DEE > Dravet" ordering cannot be corroborated by more than one source and rests on a proportion, not a rate. What *is* robustly supported (multiple sources): severe SCN1A DEE and Dravet both sit at the top; GEFS+/mild SCN1A sits far below.

## Design

**Core idea (chosen approach):** SCN1A is the one gene that clinically spans the full severity spectrum, so **severity moves to the phenotype axis** and the SCN1A gene option stops being a large multiplier. Other DEE genes (SCN2A, SCN8A, STXBP1, KCNT1, DEPDC5, cardiac genes, etc.) are monomorphically severe — they keep their existing multiplier semantics, **unchanged**. This is an SCN1A-focused change, not a full recalibration.

SCN1A becomes a pure **floor** on the effective baseline: a pathogenic SCN1A variant is never benign, so selecting it guarantees a minimum risk level regardless of the chosen phenotype — and because that floor sits *above* the gene-agnostic GEFS+ baseline, adding SCN1A to a GEFS+ patient raises their risk.

### 1. Phenotype/syndrome axis (two new options, ▲)

| Phenotype | baseline | notes |
|---|---|---|
| Self-limited (SeLECTS, CAE, JAE) | 0.10 | unchanged |
| New-onset / single seizure | 0.20 | unchanged |
| Controlled epilepsy | 0.40 | unchanged |
| ▲ **GEFS+ / mild genetic epilepsy (normal intelligence)** | **0.15** | mild genetic epilepsy, normal cognition, gene unknown / non-SCN1A |
| Drug-resistant focal | 1.20 | unchanged |
| Drug-resistant generalized | 1.20 | unchanged |
| Other genetic DEE (mixed) | 0.80 | unchanged |
| ▲ **Severe early-infantile / non-Dravet DEE** | **1.90** | label: "(e.g., non-Dravet SCN1A-type, profound impairment)"; marginally above Dravet |
| Lennox-Gastaut syndrome | 1.20 | unchanged |
| Dravet syndrome | 1.80 | unchanged |

### 2. Genetic axis

- Replace `scn1a_nondravet` (`mult: 3.5`) with **`scn1a`**: `mult: 1.0`, **`floorBaseline: 0.25`**, `cardiacFlag: false`.
- All other genetic options unchanged.
- The SCN1A floor (**0.25**) is deliberately set **above** the GEFS+ phenotype baseline (0.15) — this is the "GEFS+-with-SCN1A" level. Invariant: **`SCN1A floor > GEFS+ baseline`** (so SCN1A always adds risk to a GEFS+ patient).

### 3. Computation (`calcPedSUDEP`)

Add an optional field to `GeneticModifier`:

```ts
export type GeneticModifier = { mult: number; note: string; cardiacFlag?: boolean; floorBaseline?: number };
```

Replace the syndrome×gene combination logic:

```ts
// effective baseline: a floor-gene (SCN1A) raises the baseline to its floor;
// otherwise the syndrome baseline stands.
const effectiveBaseline = gen.floorBaseline != null
  ? Math.max(synd.rate, gen.floorBaseline)
  : synd.rate;

// a floor-gene does not also multiply (no double counting); other genes multiply.
const effectiveGeneMult = gen.floorBaseline != null ? 1.0 : gen.mult;

const raw = effectiveBaseline * effectiveGeneMult * gtc.mult * noct.mult *
            sup.mult * adh.mult * dur.mult;
```

**Delete** the entire `if (syndrome === 'dravet' && …) effectiveGeneMult = 1.0` suppression branch — moot once SCN1A is a floor.

### 4. Result type changes (`PedSUDEPResult`)

- **Remove:** `geneticSuppressedForDravet`.
- **Add:** `geneticFloorApplied: boolean` (true when the selected gene is a floor-gene), `geneticFloorBinding: boolean` (true when the floor actually raised the baseline, i.e. `floorBaseline > synd.rate`).
- `geneticApplied` keeps meaning "a non-`none` gene is selected."

### 5. Behavior verification (standard profile: frequent GTC / nocturnal / shared / good adherence / medium duration → clinical product ×2.55)

| Profile | effective baseline | rate/1000py | tier |
|---|---|---|---|
| Severe non-Dravet DEE + SCN1A | max(1.90, 0.25) = 1.90 | **4.85** | High |
| Dravet (+SCN1A) | max(1.80, 0.25) = 1.80 | **4.59** | High |
| Focal / Gen DRE / LGS + SCN1A | max(1.20, 0.25) = 1.20 | 3.06 | High |
| GEFS+/mild + SCN1A | max(0.15, 0.25) = 0.25 | 0.64 | Low |
| GEFS+/mild, gene = none | 0.15 | 0.38 | Low |
| Self-limited + SCN1A | max(0.10, 0.25) = 0.25 | 0.64 | Low |

Guarantees:
- `severe-DEE (4.85) > Dravet (4.59) > focal/gen/LGS+SCN1A (3.06) > GEFS+/mild+SCN1A (0.64)` — your ordering, **structural**.
- **GEFS+ + SCN1A (0.64) > GEFS+ alone (0.38)** — SCN1A adds ~1.7× to the mild end.
- The 10.71 artifact is gone (nothing multiplies a syndrome baseline by 3.5).
- Dravet output unchanged at 4.59 (no double-count).

### 6. UI changes (`SUDEPRiskCalculator.tsx`)

- Add the two new options to the syndrome `<Select>` (GEFS+/mild after "Controlled"; Severe non-Dravet DEE after "Other genetic DEE").
- Relabel the genetic option `scn1a_nondravet` → value `scn1a`, label **"SCN1A"**.
- Rewrite the "Genetic modifier" results line (currently shows "1.0× (suppressed — already in Dravet baseline)"): show e.g. *"SCN1A — sets a risk floor at the GEFS+/mild-with-SCN1A level (0.25); phenotype determines severity"*, and indicate when the floor is **binding** (raised the baseline) vs inert.
- Update the genetic-field `hint` — drop the "SCN1A in Dravet is suppressed" language; describe the floor behavior instead.

### 7. Methods / citations (`calculator.ts` header + SCN1A note)

- Update the SCN1A note to explain the floor rationale: SCN1A spans febrile→GEFS+→Dravet→severe DEE (GeneReviews); pathogenic SCN1A is never benign, so it floors risk at the GEFS+-with-SCN1A level; severity above that is set by the selected phenotype.
- Add an explicit **caveat** on the new "Severe non-Dravet DEE" phenotype: its placement at/above Dravet rests on Donnan 2023's small-sample *proportion* (3/15) plus the GOF "more severe entity" literature (Sadleir/Berecki) — **not** a head-to-head incidence rate. The marginal +0.10 over Dravet encodes this prior conservatively.

## Testing (`lib/sudep-risk/__tests__/calculator.test.ts`)

Add/adjust cases:
1. **Ordering:** with a fixed clinical profile, assert `rate(severe-DEE + SCN1A) > rate(Dravet) > rate(focal-DRE + SCN1A) > rate(GEFS+ + SCN1A)`.
2. **SCN1A adds risk to GEFS+:** `rate(GEFS+ + SCN1A) > rate(GEFS+, none)`.
3. **Floor binding:** `effective baseline(self-limited + SCN1A) == 0.25`; `geneticFloorBinding == true`.
4. **Floor inert on severe phenotypes:** `rate(Dravet + SCN1A) == rate(Dravet, none) == 4.59`; `geneticFloorBinding == false`.
5. **Regression:** `rate(focal-DRE + SCN1A)` is **no longer 10.71** (now 3.06 on the standard profile).
6. **Invariant guard:** assert `SCN1A.floorBaseline > GEFS+ baseline` so the calibration can't silently drift into "SCN1A adds nothing to GEFS+."
7. Existing non-SCN1A gene tests (SCN2A, SCN8A, cardiac flags) still pass unchanged.

## Out of scope

- Recalibrating other genes' multipliers (SCN2A/SCN8A/STXBP1/etc.) — they remain multipliers.
- Recalibrating any existing syndrome baseline.
- SUDEP-7 / SUDEP-3 components.
- The edge case "severe-DEE phenotype paired with a *different* high-mult gene (e.g., SCN8A ×3.0 → 6.0 baseline)": acceptable, handled by the existing 30/1000py ceiling; noted in methods, not specially cased.

## Open calibration knobs (approved values)

- GEFS+/mild baseline = **0.15**
- SCN1A floor = **0.25** (≈1.7× gene effect on the mild end; must remain > GEFS+ baseline)
- Severe non-Dravet DEE = **1.90** (vs Dravet 1.80)
