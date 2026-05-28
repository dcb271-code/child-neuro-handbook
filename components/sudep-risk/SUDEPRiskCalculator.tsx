'use client';

import { useId, useMemo, useState } from 'react';
import {
  calcPedSUDEP,
  calcSUDEP7,
  calcSUDEP3,
  type PedSUDEPInputs,
  type SUDEP7Inputs,
  type SUDEP3Inputs,
} from '@/lib/sudep-risk/calculator';

// ============================================================================
// SEVERE EARLY-ONSET DEE PRESETS
// Single source of truth for the three behaviors that key off this syndrome
// class: the typical-presentation preset applied on selection, the neutral
// reset applied when switching away, and the breakdown explanatory note.
// Adding a syndrome here updates all three at once.
// ============================================================================

const SEVERE_DEE_SYNDROMES = ['dravet', 'severe_dee', 'lgs'];
const isSevereDEE = (s: string) => SEVERE_DEE_SYNDROMES.includes(s);
// Human-readable class label, shared by the field hint and the breakdown note
// so the two phrasings cannot drift apart.
const SEVERE_DEE_CLASS_LABEL =
  'the severe early-onset epilepsies — infantile-onset DEE (Dravet, severe infantile DEE) and refractory childhood DEE (LGS)';
// Applied when a severe DEE is selected: these children present with frequent
// nocturnal GTCS and are near-universally closely monitored, so the headline
// reflects the monitored cohort (Donnan 2023 ~4.4) not the general one
// (Cooper 2016 ~9.3). NEUTRAL_PRESET restores the defaults when switching away
// so the monitored discount never leaks onto another syndrome (e.g. an
// independent adolescent with drug-resistant focal epilepsy).
const SEVERE_DEE_PRESET = { gtcFrequency: 'frequent', nocturnal: true, supervision: 'shared' } as const;
const NEUTRAL_PRESET = { gtcFrequency: 'rare', nocturnal: false, supervision: 'partial' } as const;

// ============================================================================
// MODIFIABLE RISK FACTORS — for the SUDEP conversation
// ============================================================================

const MODIFIABLE_FACTORS = [
  {
    id: 'gtc_control',
    title: 'Pursue GTCS freedom',
    teaching: 'GTCS frequency is the dominant SUDEP risk factor across every published cohort. Even without complete seizure freedom, reducing GTCS frequency from weekly to rare reduces estimated risk roughly 5-fold.',
    actions: 'Optimize ASM regimen (right drug for syndrome — avoid sodium channel blockers in Dravet/MAE; consider rufinamide for LGS atonic seizures); pursue epilepsy surgery evaluation in DRE candidates (Sperling 2016 showed SUDEP rate ~5/1000py pre-surgery dropping to ~1/1000py post-surgical seizure freedom); consider VNS/RNS/DBS or dietary therapy where indicated.',
    evidence: 'Sveinsson 2020: OR 27 for ≥1 GTCS vs none. Tomson 2025: 36× rate difference between TCS-free and TCS-having past year. Hesdorffer 2011 combined analysis.'
  },
  {
    id: 'adherence',
    title: 'Reinforce ASM adherence',
    teaching: 'Nonadherence approximately doubles SUDEP risk and frequently precipitates nocturnal breakthrough GTCS. Adolescents and young adults are the highest-risk demographic for nonadherence.',
    actions: 'Prefer once-daily regimens when therapeutically equivalent. Use blister packs, smartphone reminder apps, family check-ins. Address barriers (cost, side effects, denial). Therapeutic drug monitoring when adherence is suspect.',
    evidence: 'Faught 2008: 3-fold mortality risk with poor adherence. Hesdorffer 2012 combined analysis.'
  },
  {
    id: 'supervision',
    title: 'Establish nocturnal supervision',
    teaching: 'Most SUDEP occurs at night, unwitnessed, in bed. Bedroom sharing reduces SUDEP risk by approximately half — the single most modifiable intervention. In the Swedish Tomson 2025 data, sharing a bedroom dropped incidence into the lowest-risk stratum even with other risk factors present.',
    actions: 'Recommend shared bedroom for those with nocturnal GTCS. If sharing is not possible/acceptable, layered alternatives: audio baby monitors, video monitors, bed-motion sensors (Emfit, EpiMonitor), wearables with seizure detection (FDA-cleared: Empatica EmbracePlus, NightWatch, SmartWatch Inspyre). None replace co-sleeping but each adds layered surveillance.',
    evidence: 'Langan 2005 case-control: HR ~0.4. van der Lende 2018 Neurology: nocturnal supervision protective across care settings. Sveinsson 2020: OR 67 for nocturnal GTCS + living alone vs no GTCS.'
  },
  {
    id: 'prone_position',
    title: 'Counsel against prone sleep position',
    teaching: 'Prone position has been associated with SUDEP, paralleling the SIDS prone-position association. Mechanistically, prone position impairs airway recovery during postictal hypoventilation.',
    actions: 'Counsel supine or lateral sleep position. Anti-suffocation pillows are marketed but lack rigorous trial evidence. In high-risk patients, consider whether to involve a pediatric pulmonologist for postictal apnea risk assessment.',
    evidence: 'Liebenthal 2015 meta-analysis: 70% of witnessed SUDEP cases were prone. Effect is largest in young adults.'
  },
  {
    id: 'cardiac_eval',
    title: 'Cardiac evaluation when channelopathy implicated',
    teaching: 'Brain-heart channelopathy overlap means the same gene (e.g., KCNQ1, KCNH2, SCN5A) can cause both epilepsy and cardiac arrhythmia. In LQTS-spectrum patients, postictal sympathetic surge may unmask an arrhythmic substrate. The death mechanism is then mixed — postictal central apnea (MORTEMUS) plus an arrhythmogenic primer.',
    actions: '12-lead EKG at baseline; calculate QTc (Bazett or Fridericia; men >450 ms / women >460 ms is borderline, >480 ms prolonged). Holter or extended monitoring if borderline. Cardiology referral with attention to channelopathy. Review concurrent QT-prolonging medications.',
    evidence: 'Bagnall 2016 Ann Neurol: 30% of SUDEP postmortems have arrhythmia gene variants. Anderson 2014: 30% of LQTS patients report seizures. Auerbach 2013 (KCNH2-LQT and epilepsy).'
  },
  {
    id: 'avoid_triggers',
    title: 'Identify and avoid personal seizure triggers',
    teaching: 'Reducing seizure burden through trigger avoidance lowers SUDEP risk because the proximal SUDEP mechanism (MORTEMUS data) is a GTCS itself.',
    actions: 'Sleep hygiene (critical in JME and adolescents). Limit alcohol (adolescents). Photic precautions in photosensitive epilepsy. For Dravet specifically: avoid hot baths/fever (rapid antipyretic management; pool/bath supervision), avoid sodium channel blockers (CBZ, OXC, LTG, PHT — paradoxical worsening).',
    evidence: 'Established by syndrome-specific guidelines. Trigger avoidance reduces seizure frequency, which mediates SUDEP risk.'
  },
  {
    id: 'discussion',
    title: 'Have the SUDEP conversation',
    teaching: 'Most families want to know about SUDEP and prefer to hear about it from the clinician rather than from online searches or the death of another patient\'s child. AAN/AES 2017 Level B: "Clinicians should discuss with patients with epilepsy and their families the small individual risk of SUDEP."',
    actions: 'Time the conversation to the relationship and the patient\'s risk profile. For a child with new-onset uncomplicated focal epilepsy, brief mention with contextual reassurance. For a child with Dravet or DRE, structured discussion involving modifiable factors. Revisit periodically — risk is not static. Pediatric advocacy groups (Dravet Syndrome Foundation, NORSE Institute, SUDEP Action) are excellent resources for families.',
    evidence: 'AAN/AES 2017 (Harden et al). Tonberg 2015: bereaved family surveys consistently report wanting to have known earlier.'
  }
];

// ============================================================================
// UI HELPERS
// ============================================================================

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  // role="group" + aria-labelledby works for a <select> and for a Toggle button-group alike.
  const labelId = useId();
  return (
    <div className="mb-3" role="group" aria-labelledby={labelId}>
      <span id={labelId} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</span>
      {children}
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{hint}</p>}
    </div>
  );
}

function Toggle<T extends string | boolean>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: [T, string][];
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map(([v, l]) => (
        <button
          key={String(v)}
          type="button"
          onClick={() => onChange(v)}
          className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
            value === v
              ? 'bg-violet-600 text-white border-violet-600'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function Select<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: [T, string][];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
    >
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

// Honest display: ~2 significant figures (no false precision like "4.59").
// Uncertainty is carried by the plausible range + evidence chip, not by decimals.
function fmtRate(x: number): string {
  if (x >= 10) return String(Math.round(x));
  if (x >= 1) return (Math.round(x * 10) / 10).toString();
  if (x >= 0.1) return (Math.round(x * 100) / 100).toString();
  return (Math.round(x * 1000) / 1000).toString();
}
const EVIDENCE_LABEL: Record<'strong' | 'moderate' | 'limited', { text: string; cls: string }> = {
  strong:   { text: 'strong evidence',             cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' },
  moderate: { text: 'moderate evidence',           cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  limited:  { text: 'limited evidence · wide range', cls: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

type Tab = 'pediatric' | 'sudep3' | 'sudep7' | 'modifiable' | 'teaching' | 'refs';

export default function SUDEPRiskCalculator() {
  const [tab, setTab] = useState<Tab>('pediatric');

  const [P, setP] = useState<PedSUDEPInputs>({
    syndrome: 'controlled',
    geneticEtiology: 'none',
    gtcFrequency: 'rare',
    nocturnal: false,
    supervision: 'partial',
    adherence: 'good',
    duration: 'short',
  });

  const [S7, setS7] = useState<SUDEP7Inputs>({
    gtcMore3: false, gtc1plus: false, anySzPastYear: false,
    sz50plus: false, dur30plus: false, asm3plus: false, idDD: false,
  });

  const [S3, setS3] = useState<SUDEP3Inputs>({
    gtcsPastYear: false, anySzPastYear: false, idDD: false,
  });

  const [done, setDone] = useState<Record<string, boolean>>({});

  const pResult = useMemo(() => calcPedSUDEP(P), [P]);
  const s7Result = useMemo(() => calcSUDEP7(S7), [S7]);
  const s3Result = useMemo(() => calcSUDEP3(S3), [S3]);

  return (
    <div className="not-prose text-slate-900 dark:text-slate-100">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          SUDEP Risk Assessment
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Evidence-anchored framework for pediatric SUDEP risk stratification
          and counseling. Designed for neurology resident education.
        </p>
      </div>

      <div className="flex gap-1 mb-5 border-b border-slate-200 dark:border-slate-700 flex-wrap">
        {([
          ['pediatric', 'Pediatric risk context'],
          ['sudep3', 'SUDEP-3'],
          ['sudep7', 'SUDEP-7 v2.0'],
          ['modifiable', 'Modifiable factors'],
          ['teaching', 'Teaching points'],
          ['refs', 'References'],
        ] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
              tab === id
                ? 'border-violet-600 text-violet-700 dark:text-violet-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ============================================================ */}
      {/* PEDIATRIC RISK CONTEXT                                          */}
      {/* ============================================================ */}
      {tab === 'pediatric' && (
        <div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-5 text-xs text-blue-900 dark:text-blue-200">
            <strong>How this is calibrated.</strong> Baseline rates are
            syndrome-specific values from published pediatric cohorts.
            Multipliers are derived from the published odds ratios for each
            risk factor and applied multiplicatively. The model is
            calibrated to reproduce the 350-fold spread in absolute SUDEP
            incidence documented in Tomson 2025 (Neurology).
            <br /><br />
            <strong>About the low end.</strong> Rather than enforcing a
            single numerical floor, the display uses two thresholds that
            reflect how well the underlying literature can resolve very low
            rates: results below 0.05/1000py (the lowest stratum
            empirically observed by Tomson 2025; 95% CI 0.02–0.12) are
            shown as <em>≤0.05</em>; results below 0.01/1000py are shown
            as <em>&lt;0.01</em>. SUDEP risk in epilepsy is never zero —
            cases have been reported in SeLECTS (Verducci 2020) and in
            patients without antecedent GTCS (Sveinsson 2020: OR 1.15 for
            non-GTCS-only seizures, NS). But the literature genuinely
            cannot distinguish rates this low from each other, and
            displaying a precise decimal would overstate certainty.
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wide">
                Inputs
              </h4>

              <Field
                label="Epilepsy syndrome / classification"
                hint="The dominant baseline rate. Syndrome captures the prior probability of refractoriness, ID, GTCS pattern, and channelopathy mechanism."
              >
                <Select
                  value={P.syndrome}
                  onChange={(v) => setP((s) => {
                    // Selecting a severe early-onset DEE presets the typical
                    // presentation (frequent nocturnal GTCS) AND shared/monitored
                    // supervision (see SEVERE_DEE_PRESET). Switching away from a
                    // DEE restores the neutral defaults (NEUTRAL_PRESET) so the
                    // monitored discount and the frequent/nocturnal preset never
                    // leak onto another syndrome. Switching between two non-DEE
                    // syndromes preserves whatever the clinician has entered.
                    const next = { ...s, syndrome: v };
                    if (isSevereDEE(v)) return { ...next, ...SEVERE_DEE_PRESET };
                    if (isSevereDEE(s.syndrome)) return { ...next, ...NEUTRAL_PRESET };
                    return next;
                  })}
                  options={[
                    ['selflimited', 'Self-limited (SeLECTS, CAE, JAE, etc.)'],
                    ['newonset', 'New-onset / single seizure'],
                    ['controlled', 'Controlled epilepsy (general pediatric)'],
                    ['gefs_mild', 'GEFS+ / mild genetic epilepsy (normal intelligence)'],
                    ['focal_dre', 'Drug-resistant focal epilepsy'],
                    ['gen_dre', 'Drug-resistant generalized epilepsy'],
                    ['other_dee', 'Other genetic DEE (non-Dravet, non-LGS)'],
                    ['severe_dee', 'Severe early-infantile / non-Dravet DEE'],
                    ['lgs', 'Lennox-Gastaut syndrome'],
                    ['dravet', 'Dravet syndrome']
                  ]}
                />
              </Field>

              <Field
                label="Genetic etiology (if known)"
                hint="A selected gene multiplies the syndrome baseline. SCN1A is the strongest modifier (×1.4) plus a 0.5/1000py floor on the final estimate — a pathogenic variant always raises risk and favorable modifiers can't pull it below 0.5. Every other gene is capped at or below SCN1A (established channelopathies ×1.3; generic etiologies less). The multipliers are bounded so no gene-on-phenotype exceeds Dravet. On 'Dravet' or 'Severe early-infantile / non-Dravet DEE' the baseline already assumes the channelopathy, so the gene does NOT multiply further — choose those phenotypes for a severe presentation. KCNQ1/KCNH2/SCN5A/SCN1B flag for cardiac evaluation due to brain-heart channelopathy overlap (the flag, not a larger multiplier, carries that arrhythmic concern)."
              >
                <Select
                  value={P.geneticEtiology}
                  onChange={(v) => setP((s) => ({ ...s, geneticEtiology: v }))}
                  options={[
                    ['none', 'None identified / not tested'],
                    ['scn1a', 'SCN1A'],
                    ['sudep_gene', 'Established SUDEP gene (SCN2A, SCN8A, STXBP1, KCNT1, Dup15q, DEPDC5)'],
                    ['cardiac', 'Cardiac-overlap channelopathy (KCNQ1/KCNH2, SCN5A, SCN1B)'],
                    ['other_chan', 'Other channelopathy (KCNB1, GABRB3, CACNA1A, etc.)'],
                    ['other_ge', 'Other genetic etiology']
                  ]}
                />
              </Field>

              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-5 mb-3 uppercase tracking-wide">
                Clinical risk factors
              </h4>

              <Field
                label="GTCS frequency (past year)"
                hint="The single most important predictor. Sveinsson 2020: OR 27 for ≥1 GTCS; OR ~1.15 (NS) for exclusively non-GTCS — meaning the SUDEP signal is almost entirely concentrated in GTCS-having patients."
              >
                <Select
                  value={P.gtcFrequency}
                  onChange={(v) => setP((s) => ({ ...s, gtcFrequency: v }))}
                  options={[
                    ['never', 'Never had a GTCS'],
                    ['none_pastyear', 'No GTCS in past year (well-controlled)'],
                    ['rare', '1–2 GTCS per year (rare)'],
                    ['frequent', '≥3 GTCS per year (frequent)'],
                    ['very_frequent', 'Weekly+ GTCS / >50 sz/month']
                  ]}
                />
              </Field>

              <Field
                label="Nocturnal seizures"
                hint="Most SUDEP occurs in sleep. MORTEMUS: postictal cardiorespiratory arrest after a GTCS, central in origin."
              >
                <Toggle<boolean>
                  value={P.nocturnal}
                  onChange={(v) => setP((s) => ({ ...s, nocturnal: v }))}
                  options={[[false, 'No nocturnal seizures'], [true, 'Yes — nocturnal seizures occur']]}
                />
              </Field>

              <Field
                label="Nighttime supervision"
                hint={`The single most modifiable factor, on a 3-level scale. Shared bedroom / active monitoring is protective (Langan 2005, HR ~0.4); a separate room with only intermittent checks (baby cam, periodic checks) is the neutral reference — the typical pediatric situation; sleeping alone and unwitnessed is high-risk (Sveinsson 2020, adult living-alone data, OR ~5). For ${SEVERE_DEE_CLASS_LABEL}, this defaults to monitored, because those children are near-universally closely supervised; every other epilepsy defaults to the neutral reference, since supervision varies (e.g. an otherwise-independent adolescent with drug-resistant focal epilepsy). Adjust to the individual patient.`}
              >
                <Toggle<string>
                  value={P.supervision}
                  onChange={(v) => setP((s) => ({ ...s, supervision: v as PedSUDEPInputs['supervision'] }))}
                  options={[
                    ['shared', 'Shared / actively monitored'],
                    ['partial', 'Separate room, intermittent'],
                    ['alone', 'Alone / unmonitored']
                  ]}
                />
              </Field>

              <Field
                label="ASM adherence"
                hint="Nonadherence approximately doubles SUDEP risk. Especially important in adolescents and young adults."
              >
                <Toggle<string>
                  value={P.adherence}
                  onChange={(v) => setP((s) => ({ ...s, adherence: v as PedSUDEPInputs['adherence'] }))}
                  options={[['good', 'Adherent'], ['poor', 'Nonadherent / inconsistent']]}
                />
              </Field>

              <Field label="Epilepsy duration" hint="Modest cumulative effect across pediatric literature.">
                <Select
                  value={P.duration}
                  onChange={(v) => setP((s) => ({ ...s, duration: v }))}
                  options={[
                    ['short', '<5 years'],
                    ['medium', '5–15 years'],
                    ['long', '>15 years']
                  ]}
                />
              </Field>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wide">
                Estimated risk
              </h4>

              <div className={`rounded-lg p-4 border-2 mb-4 ${
                ['Extremely low', 'Very low', 'Low'].includes(pResult.tier) ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-200' :
                pResult.tier === 'Moderate' ? 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-200' :
                pResult.tier === 'High' ? 'bg-orange-50 border-orange-300 text-orange-900 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-200' :
                'bg-red-50 border-red-300 text-red-900 dark:bg-red-900/20 dark:border-red-700 dark:text-red-200'
              }`}>
                <div className="text-xs uppercase tracking-wide opacity-75">{pResult.tier} risk</div>
                <div className="text-3xl font-semibold mt-1">
                  {pResult.belowDetection ? pResult.displayString : `≈${fmtRate(pResult.displayRate)}`}
                  <span className="text-base font-normal opacity-75"> per 1000 person-years</span>
                </div>
                {!pResult.belowDetection && (
                  <div className="text-sm mt-1 opacity-90">
                    plausible range {fmtRate(pResult.ciLow)}–{fmtRate(pResult.ciHigh)} per 1000py
                  </div>
                )}
                <div className="mt-2">
                  <span className={`inline-block text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${EVIDENCE_LABEL[pResult.evidence].cls}`}>
                    {EVIDENCE_LABEL[pResult.evidence].text}
                  </span>
                </div>
                <div className="text-sm mt-2 opacity-90 space-y-0.5">
                  <div>≈ {pResult.annualPrefix}{pResult.annualPercent.toFixed(3)}% annual risk</div>
                  <div>≈ {pResult.annualPrefix}{pResult.tenYearPercent.toFixed(2)}% 10-year cumulative</div>
                  {!pResult.belowDetection && (
                    <div className="opacity-75 mt-1">
                      {pResult.relativeToControlled < 1
                        ? `${(1/pResult.relativeToControlled).toFixed(1)}× lower`
                        : `${pResult.relativeToControlled.toFixed(1)}× higher`} than general pediatric epilepsy baseline (0.2/1000py)
                    </div>
                  )}
                </div>
                {pResult.displayLevel === 'detection_limit' && (
                  <div className="text-xs mt-2 opacity-75 italic">
                    At or below the empirical detection limit (Tomson 2025 lowest stratum 0.05/1000py, 95% CI 0.02–0.12). The literature cannot reliably distinguish rates this low; the true rate may be substantially lower. Risk is not zero — SUDEP has been reported in self-limited syndromes and in patients without antecedent GTCS, just rarely.
                  </div>
                )}
                {pResult.displayLevel === 'lowest_plausible' && (
                  <div className="text-xs mt-2 opacity-75 italic">
                    Below what the SUDEP literature can resolve. Risk is very low but not zero — case reports exist in apparently low-risk profiles. Treat as essentially baseline risk for the favorable management profile.
                  </div>
                )}
                {pResult.ceilinged && (
                  <div className="text-xs mt-2 opacity-75 italic">
                    In the model&apos;s saturating range: above ~7/1000py, additional risk factors yield progressively smaller increments, approaching a ceiling near 15/1000py. This ceiling is deliberate — clean pediatric syndrome rates essentially never exceed ~10 (Dravet 4.4–9.3; pediatric DEE 2.8), so the model reserves ~15 for the maximally-stacked profile rather than extrapolating. Literature has reported rates as high as ~18/1000py in select, heavily risk-stratified strata (Tomson 2025: lives alone + nonadherent + nocturnal TCS + ≥1 TCS; Cooper&apos;s Dravet 95% CI reaches 19.5), but those are not pediatric syndrome point estimates and the model does not project to them. The tail is genuinely uncertain — these events are rare and SUDEP is never zero — so the displayed value is compressed, not extrapolated upward.
                  </div>
                )}
              </div>

              {pResult.cardiacFlag && (
                <div className="bg-rose-50 border-2 border-rose-300 dark:bg-rose-900/20 dark:border-rose-700 rounded-lg p-3 mb-4">
                  <div className="text-xs uppercase tracking-wide text-rose-700 dark:text-rose-300 font-semibold">
                    ⚠ Cardiac evaluation indicated
                  </div>
                  <div className="text-xs text-rose-900 dark:text-rose-200 mt-2 space-y-1">
                    <p>
                      This gene causes both epilepsy and primary cardiac
                      arrhythmia syndromes. Postictal sympathetic surge can
                      unmask an arrhythmic substrate.
                    </p>
                    <p className="mt-1">
                      <strong>Action:</strong> baseline 12-lead EKG; calculate
                      QTc (men &gt;450, women &gt;460 ms borderline;
                      &gt;480 ms prolonged). Holter if borderline. Cardiology
                      consultation. Review concurrent QT-prolonging medications.
                    </p>
                  </div>
                </div>
              )}

              <details className="bg-slate-50 dark:bg-slate-900/40 rounded-md p-3 mb-3 text-xs text-slate-700 dark:text-slate-300">
                <summary className="font-semibold cursor-pointer text-slate-800 dark:text-slate-200">
                  Show calculation breakdown
                </summary>
                <div className="mt-3 space-y-2">
                  <div>
                    <strong>Syndrome baseline:</strong> {pResult.syndrome.rate}/1000py — {pResult.syndrome.label}
                    <div className="text-slate-500 dark:text-slate-400 mt-0.5 italic">{pResult.syndrome.description}</div>
                    <div className="text-slate-400 dark:text-slate-500 mt-0.5 text-[10px]">Source: {pResult.syndrome.source}</div>
                  </div>

                  {pResult.syndromeFloorApplied && (
                    <div>
                      <strong>Syndrome floor:</strong> held at {pResult.floorApplied.toFixed(2)}/1000py — {pResult.floorIsRemission
                        ? `reduced from the active floor of ${pResult.syndrome.floor?.toFixed(1)} because the patient is seizure-free, but a high-mortality ${pResult.syndrome.label} retains meaningful SUDEP risk even after a GTCS-free year — the channelopathy substrate persists and remission can be fragile.`
                        : `active-disease ${pResult.syndrome.label} retains substantial SUDEP risk regardless of favorable modifiers. Seizure-freedom reduces this to a lower remission floor, but not to zero.`}
                    </div>
                  )}

                  {P.geneticEtiology !== 'none' && (() => {
                    // Reflect the EFFECTIVE multiplier actually applied: the gene is
                    // suppressed ("trumped") on Dravet/severe-DEE, where the phenotype
                    // already assumes the channelopathy. Floor-type genes (SCN1A) also
                    // append the final-rate floor status.
                    const em = pResult.effectiveGeneMult;
                    const trumped = em === 1 && pResult.genetic.mult !== 1;
                    const multPart = em !== 1
                      ? `${em}× channelopathy multiplier`
                      : trumped
                        ? 'no multiplier — phenotype already assumes the channelopathy'
                        : 'no multiplier';
                    const fr = pResult.genetic.floorRate?.toFixed(2);
                    const floorPart = pResult.geneticFloorBinding
                      ? `held at the ${pResult.floorApplied.toFixed(2)}/1000py floor${pResult.floorIsRemission ? ' (reduced for seizure-freedom)' : ''}`
                      : `${fr}/1000py floor not binding`;
                    return (
                      <div>
                        <strong>Genetic modifier:</strong> {pResult.geneticFloorApplied
                          ? `${multPart}; ${floorPart}`
                          : multPart}
                        <div className="text-slate-500 dark:text-slate-400 mt-0.5 italic">{pResult.genetic.note}</div>
                      </div>
                    );
                  })()}

                  <div>
                    <strong>GTCS frequency:</strong> {pResult.gtc.mult}× — {pResult.gtc.label}
                    <div className="text-slate-500 dark:text-slate-400 mt-0.5 italic">{pResult.gtc.note}</div>
                  </div>

                  {P.nocturnal && (
                    <div>
                      <strong>Nocturnal seizures:</strong> {pResult.nocturnal.mult}×
                      <div className="text-slate-500 dark:text-slate-400 mt-0.5 italic">{pResult.nocturnal.note}</div>
                    </div>
                  )}

                  <div>
                    <strong>Supervision:</strong> {pResult.supervision.mult}× ({P.supervision === 'shared' ? 'shared / monitored' : P.supervision === 'partial' ? 'separate / intermittent' : 'alone / unmonitored'})
                    <div className="text-slate-500 dark:text-slate-400 mt-0.5 italic">{pResult.supervision.note}</div>
                    {P.supervision === 'shared' && isSevereDEE(P.syndrome) && (
                      <div className="text-slate-400 dark:text-slate-500 mt-0.5 text-[10px]">
                        {`Preset to monitored for this syndrome. This is a class rule, not Dravet-specific: ${SEVERE_DEE_CLASS_LABEL} are near-universally closely supervised, so the headline reflects the monitored (Donnan-type) cohort rather than the general (Cooper-type) one. Change the selection above if this child sleeps unmonitored.`}
                      </div>
                    )}
                  </div>

                  {P.adherence === 'poor' && (
                    <div>
                      <strong>Nonadherence:</strong> {pResult.adherence.mult}×
                      <div className="text-slate-500 dark:text-slate-400 mt-0.5 italic">{pResult.adherence.note}</div>
                    </div>
                  )}

                  {P.duration !== 'short' && (
                    <div>
                      <strong>Duration:</strong> {pResult.duration.mult}×
                      <div className="text-slate-500 dark:text-slate-400 mt-0.5 italic">{pResult.duration.note}</div>
                    </div>
                  )}

                  <div className="border-t border-slate-300 dark:border-slate-600 pt-2 mt-2">
                    <strong>Raw computed rate:</strong> {pResult.rawRate.toFixed(3)}/1000py
                    {pResult.displayLevel === 'detection_limit' && ' (below detection limit — displayed as ≤0.05)'}
                    {pResult.displayLevel === 'lowest_plausible' && ' (below resolvable threshold — displayed as <0.01)'}
                    {pResult.ceilinged && ' (in the saturating range — displayed value compressed toward the ~15/1000py ceiling)'}
                  </div>
                </div>
              </details>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 text-xs text-blue-900 dark:text-blue-200">
                <strong>Calibration anchors:</strong>
                <ul className="mt-1 space-y-0.5 list-disc list-inside">
                  <li>Tomson 2025 lowest: 0.05/1000py (shared bedroom + adherent + no TCS past year)</li>
                  <li>Tomson 2025 highest: 18.1/1000py (alone + nonadherent + nocturnal TCS + ≥1 TCS)</li>
                  <li>Pediatric DEE overall (Donnan 2023): 2.8/1000py</li>
                  <li>Dravet syndrome: 4.4–9.3/1000py (Donnan 2023, Cooper 2016)</li>
                  <li>Pediatric DRE: 1.1–1.5/1000py (Donner 2018, Keller 2018)</li>
                  <li>General pediatric epilepsy: 0.22/1000py (AAN/AES 2017)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SUDEP-3                                                         */}
      {/* ============================================================ */}
      {tab === 'sudep3' && (
        <div>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 mb-5 text-xs text-amber-900 dark:text-amber-200">
            <strong>Resident note.</strong> SUDEP-3 is the newest SUDEP
            risk inventory (2024) and the simplest — just three items.
            In a head-to-head comparison it outperformed the older
            SUDEP-7 at distinguishing patients who died of SUDEP from
            living controls. Each additional point on the score
            corresponds to roughly triple the SUDEP risk. However, it
            was derived in a small adult cohort (28 SUDEP cases at one
            center) with <strong>no pediatric validation</strong>. Use
            it to organize counseling, not as a quantitative individual
            prediction. A low score does not rule out SUDEP risk in a
            child with seizures.
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wide">
                3 items (max 4 points)
              </h4>

              <Field label="≥1 generalized tonic-clonic seizure in the past year (1 pt)">
                <Toggle<boolean>
                  value={S3.gtcsPastYear}
                  onChange={(v) => setS3((s) => ({ ...s, gtcsPastYear: v }))}
                  options={[[false, 'No'], [true, 'Yes']]}
                />
              </Field>

              <Field label="≥1 seizure of any type in the past year (1 pt)">
                <Toggle<boolean>
                  value={S3.anySzPastYear}
                  onChange={(v) => setS3((s) => ({ ...s, anySzPastYear: v }))}
                  options={[[false, 'No'], [true, 'Yes']]}
                />
              </Field>

              <Field label="Intellectual disability — IQ &lt;70 or untestable (2 pts)">
                <Toggle<boolean>
                  value={S3.idDD}
                  onChange={(v) => setS3((s) => ({ ...s, idDD: v }))}
                  options={[[false, 'No'], [true, 'Yes']]}
                />
              </Field>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wide">
                Score
              </h4>

              <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-lg p-5 mb-4">
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Total</div>
                <div className="text-4xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
                  {s3Result.score} <span className="text-lg text-slate-400 dark:text-slate-500">/ {s3Result.max}</span>
                </div>
              </div>

              <div className={`rounded-lg p-4 border-2 mb-4 ${
                s3Result.score === 0 ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-200' :
                s3Result.score <= 2 ? 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-200' :
                'bg-red-50 border-red-300 text-red-900 dark:bg-red-900/20 dark:border-red-700 dark:text-red-200'
              }`}>
                <div className="text-xs uppercase tracking-wide opacity-75">Stratum</div>
                <div className="text-xl font-semibold mt-1">{s3Result.stratum}</div>
                <div className="text-sm mt-2 opacity-90">{s3Result.oddsInterp}</div>
              </div>

              <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/40 rounded-md p-3 space-y-3">
                <div>
                  <strong className="text-slate-900 dark:text-slate-100">What the score means clinically</strong>
                  <p className="mt-1">
                    Each additional point on SUDEP-3 corresponds to roughly
                    triple the SUDEP risk of a patient with one less point.
                    A patient scoring 0 (no seizures in the past year, no
                    intellectual disability) is the lowest-risk category;
                    a patient scoring 3 or 4 sits in the highest-risk
                    category and warrants the most aggressive SUDEP
                    counseling and modifiable-factor intervention.
                  </p>
                </div>

                <div>
                  <strong className="text-slate-900 dark:text-slate-100">How well the score performs</strong>
                  <p className="mt-1">
                    When tested in the derivation cohort, a cutoff of 3
                    correctly identified about <strong>57%</strong> of
                    patients who ultimately died of SUDEP and correctly
                    classified about <strong>75%</strong> of living
                    controls as not high-risk. In plain terms: it misses
                    a meaningful fraction of patients who will die of
                    SUDEP (so a low score does NOT confer reassurance),
                    but a high score does meaningfully select for elevated
                    risk. <em>This is why it should be used as a counseling
                    organizer, not as a way to rule out SUDEP risk.</em>
                  </p>
                </div>

                <div>
                  <strong className="text-slate-900 dark:text-slate-100">Why it beat SUDEP-7</strong>
                  <p className="mt-1">
                    In head-to-head comparison, SUDEP-3 was more accurate
                    than SUDEP-7 at distinguishing SUDEP cases from
                    controls. The signal in the data is concentrated in
                    a few factors (GTCS, any seizure, ID), and adding
                    more items diluted rather than refined the prediction.
                  </p>
                </div>

                <div>
                  <strong className="text-slate-900 dark:text-slate-100">Limitations</strong>
                  <p className="mt-1">
                    Single retrospective adult cohort (median age 31–32),
                    derived from 28 SUDEP cases at one center. <strong>No
                    pediatric validation.</strong> The score does not
                    capture nocturnal seizures, polypharmacy, or
                    duration — all of which matter clinically. Use it
                    to structure conversation, not to make probabilistic
                    claims to a family.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SUDEP-7                                                         */}
      {/* ============================================================ */}
      {tab === 'sudep7' && (
        <div>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 mb-5 text-xs text-amber-900 dark:text-amber-200">
            <strong>Resident note.</strong> SUDEP-7 v2.0 is the classical
            SUDEP risk inventory and remains widely cited — most adult
            epileptology faculty will know it by name. When subsequent
            studies tried to verify it, however, the score did not
            reliably distinguish patients who died of SUDEP from those
            who didn&apos;t, and it didn&apos;t add useful information beyond
            simply asking about GTCS frequency. Several items reflect
            epilepsy severity rather than independent SUDEP risk, and
            the 30-year-duration item rarely applies in pediatrics.
            Use this score primarily to recognize the historical
            framework and to organize a SUDEP discussion. For modern
            counseling, the Pediatric risk context tab and the
            Modifiable factors checklist are more useful.
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wide">
                7 items (effective max 10 points)
              </h4>

              <Field label="1. More than 3 tonic-clonic seizures in last year (2 pts)" hint="Frequent generalized convulsions are the strongest documented SUDEP risk factor. In Walczak's original cohort, patients with >3 GTCS/year had about 8× the SUDEP risk of those without.">
                <Toggle<boolean> value={S7.gtcMore3} onChange={(v) => setS7((s) => ({ ...s, gtcMore3: v }))} options={[[false, 'No'], [true, 'Yes']]} />
              </Field>

              <Field label="2. ≥1 tonic-clonic seizure in last year (1 pt)" hint="Even a single GTCS in the past year roughly doubles SUDEP risk. Scored 0 if item 1 is yes (to prevent double-counting overlapping items).">
                <Toggle<boolean> value={S7.gtc1plus} onChange={(v) => setS7((s) => ({ ...s, gtc1plus: v }))} options={[[false, 'No'], [true, 'Yes']]} />
              </Field>

              <Field label="3. ≥1 seizure of any type in last 12 months (1 pt)" hint="Any active seizure activity in the past year — not just convulsions — confers approximately 2–5× the SUDEP risk vs no seizures. Scored 0 if item 4 is yes.">
                <Toggle<boolean> value={S7.anySzPastYear} onChange={(v) => setS7((s) => ({ ...s, anySzPastYear: v }))} options={[[false, 'No'], [true, 'Yes']]} />
              </Field>

              <Field label="4. >50 seizures of any type per month (2 pts)" hint="Very high seizure burden — patients with >50 seizures/month had roughly 12× the SUDEP risk in the original cohort. This burden alone justifies aggressive treatment optimization regardless of other factors.">
                <Toggle<boolean> value={S7.sz50plus} onChange={(v) => setS7((s) => ({ ...s, sz50plus: v }))} options={[[false, 'No'], [true, 'Yes']]} />
              </Field>

              <Field label="5. Duration of epilepsy ≥30 years (3 pts)" hint="Long-standing epilepsy carries the highest weighted score in SUDEP-7 (~14× risk), but in pediatric and adolescent populations this item is rarely applicable. A teenager with epilepsy onset before age 5 still wouldn't qualify until well into adulthood.">
                <Toggle<boolean> value={S7.dur30plus} onChange={(v) => setS7((s) => ({ ...s, dur30plus: v }))} options={[[false, 'No'], [true, 'Yes']]} />
              </Field>

              <Field label="6. Concurrent use of ≥3 ASMs (1 pt)" hint="Polypharmacy was associated with ~4× SUDEP risk in the original analysis, but a follow-up combined analysis (Hesdorffer 2012) found that this likely reflects underlying epilepsy severity rather than an independent risk from the medications themselves.">
                <Toggle<boolean> value={S7.asm3plus} onChange={(v) => setS7((s) => ({ ...s, asm3plus: v }))} options={[[false, 'No'], [true, 'Yes']]} />
              </Field>

              <Field label="7. Intellectual disability — IQ &lt;70 (2 pts)" hint="Intellectual disability is associated with ~5× SUDEP risk and is common in pediatric DEE cohorts (Donnan 2023: nearly all SUDEP cases occurred in patients with ID).">
                <Toggle<boolean> value={S7.idDD} onChange={(v) => setS7((s) => ({ ...s, idDD: v }))} options={[[false, 'No'], [true, 'Yes']]} />
              </Field>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wide">Score</h4>

              <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-lg p-5 mb-4">
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Total</div>
                <div className="text-4xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
                  {s7Result.total} <span className="text-lg text-slate-400 dark:text-slate-500">/ {s7Result.max}</span>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400 mt-2">{s7Result.quartile}</div>
              </div>

              <div className={`rounded-lg p-4 border-2 mb-4 ${
                s7Result.total <= 1 ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-200' :
                s7Result.total <= 4 ? 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-200' :
                'bg-red-50 border-red-300 text-red-900 dark:bg-red-900/20 dark:border-red-700 dark:text-red-200'
              }`}>
                <div className="text-xs uppercase tracking-wide opacity-75">Interpretation</div>
                <div className="text-sm mt-2 opacity-90">{s7Result.interpretation}</div>
              </div>

              <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/40 rounded-md p-3 space-y-3">
                <div>
                  <strong className="text-slate-900 dark:text-slate-100">Where the score came from</strong>
                  <p className="mt-1">
                    Walczak and colleagues followed nearly 4,600 patients
                    with epilepsy prospectively in the 1990s. They identified
                    which clinical features were associated with SUDEP and
                    assigned point values weighted by the strength of each
                    association. DeGiorgio&apos;s group revised the scoring in
                    2015 to prevent double-counting overlapping items.
                  </p>
                </div>

                <div>
                  <strong className="text-slate-900 dark:text-slate-100">What higher scores reflect biologically</strong>
                  <p className="mt-1">
                    Higher SUDEP-7 scores correlate with two objective
                    measurements that hint at the underlying pathophysiology:
                  </p>
                  <ul className="mt-1 ml-4 list-disc list-outside space-y-1">
                    <li>
                      <strong>Cardiac autonomic dysfunction</strong> —
                      patients in the highest score quartile show degrees
                      of nervous-system dysregulation of heart rate
                      comparable to those in heart failure cohorts. This is
                      a marker of how severely the autonomic nervous
                      system has been impacted by chronic uncontrolled epilepsy.
                    </li>
                    <li>
                      <strong>Postictal EEG suppression</strong> — the
                      transient flatlining of brain activity after a
                      generalized convulsion. Profound suppression has
                      been observed during witnessed SUDEP events and is
                      a candidate biomarker for the postictal cardiorespiratory
                      collapse mechanism captured by MORTEMUS.
                    </li>
                  </ul>
                  <p className="mt-1">
                    The clinical takeaway: higher scores aren&apos;t just
                    bookkeeping — they reflect measurable biological
                    derangement consistent with what we know about how
                    SUDEP happens.
                  </p>
                </div>

                <div>
                  <strong className="text-slate-900 dark:text-slate-100">Why this score has fallen out of favor</strong>
                  <p className="mt-1">
                    When other groups tried to validate SUDEP-7 in their own
                    cohorts, the score did not reliably distinguish
                    patients who died of SUDEP from those who didn&apos;t.
                    A separate analysis showed that the score added little
                    predictive value beyond simply asking about generalized
                    tonic-clonic seizure frequency. Several items
                    (≥3 ASMs, ≥30 years duration) probably reflect
                    epilepsy severity rather than independent SUDEP risk.
                  </p>
                </div>

                <div>
                  <strong className="text-slate-900 dark:text-slate-100">Pediatric applicability</strong>
                  <p className="mt-1">
                    Limited. The 30-year duration item is rarely applicable
                    in children. The intellectual disability item is more
                    prevalent in pediatric DEE cohorts and may inflate
                    scores. The postictal EEG suppression correlation has
                    been replicated in children but in only one small
                    study (n=37). Use SUDEP-7 in pediatrics primarily for
                    historical context and to structure conversation —
                    not as a quantitative individual prediction.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODIFIABLE FACTORS                                              */}
      {/* ============================================================ */}
      {tab === 'modifiable' && (
        <div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg p-3 mb-5 text-xs text-emerald-900 dark:text-emerald-200">
            <strong>The point.</strong> SUDEP risk scoring is most useful
            when it drives intervention. These are the actionable elements
            of a SUDEP discussion — work through them as a structured
            checklist with the family, and document the conversation.
          </div>

          <div className="space-y-3">
            {MODIFIABLE_FACTORS.map((f) => (
              <div key={f.id} className={`border rounded-lg p-4 transition-colors ${
                done[f.id]
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700'
                  : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600'
              }`}>
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setDone((s) => ({ ...s, [f.id]: !s[f.id] }))}
                    className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      done[f.id]
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-white dark:bg-slate-900 border-slate-400 dark:border-slate-500 hover:border-slate-600 dark:hover:border-slate-400'
                    }`}
                    aria-label={`Mark "${f.title}" as done`}
                  >
                    {done[f.id] && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{f.title}</h4>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                      <strong>Why it matters:</strong> {f.teaching}
                    </p>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                      <strong>What to do:</strong> {f.actions}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic">
                      Evidence: {f.evidence}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TEACHING POINTS                                                 */}
      {/* ============================================================ */}
      {tab === 'teaching' && (
        <div className="max-w-2xl text-sm text-slate-700 dark:text-slate-300 space-y-5 leading-relaxed">

          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-base">Definition (Nashef 2012)</h4>
            <p>
              <strong>SUDEP:</strong> sudden, unexpected, witnessed or unwitnessed, non-traumatic, non-drowning death in a person with epilepsy, with or without evidence of a seizure, and excluding documented status epilepticus, in whom postmortem examination does not reveal a structural or toxicological cause.
            </p>
            <p className="mt-2">
              <strong>Categories:</strong> definite (autopsy-confirmed); definite plus (definite + comorbid condition that could have contributed but didn&apos;t independently cause death); probable (clinical SUDEP without autopsy); possible (insufficient information); near-SUDEP (cardiorespiratory arrest with successful resuscitation, surviving &gt;1 hour).
            </p>
          </section>

          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-base">Mechanism — MORTEMUS (Ryvlin 2013)</h4>
            <p>
              The closest direct observations of SUDEP come from the MORTEMUS study, which captured 16 SUDEP cases on EMU monitoring. In every case, the terminal sequence was:
            </p>
            <ol className="list-decimal list-inside mt-2 space-y-0.5 ml-2">
              <li>Generalized tonic-clonic seizure</li>
              <li>Postictal generalized EEG suppression (often)</li>
              <li>Tachypnea, then apnea (central, not obstructive)</li>
              <li>Bradycardia</li>
              <li>Terminal asystole</li>
            </ol>
            <p className="mt-2">
              This established that SUDEP is fundamentally a brainstem-mediated cardiorespiratory collapse — postictal central apnea, not primary cardiac arrhythmia. Prone position contributes by impairing recovery breathing. Serotonergic and adenosinergic dysregulation are candidate neurochemical substrates (Buchanan 2015, Richerson 2016).
            </p>
            <p className="mt-2 italic">
              Important corollary: this is why GTCS — not seizures in general — drive SUDEP risk. And why nocturnal supervision works: someone witnessing the seizure can reposition the patient and provide stimulation/airway support during the critical postictal window.
            </p>
          </section>

          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-base">Incidence — pediatric vs adult</h4>
            <p>
              The historical teaching that SUDEP is rare in children has been substantially revised. The AAN/AES 2017 pooled estimate of 0.22 per 1000py in children may underestimate recent pediatric capture-recapture studies (Donner 2018 Pediatr Neurol, Keller 2018 Neurology) finding rates of 1.11–1.45 per 1000py — comparable to adult rates.
            </p>
            <p className="mt-2">
              Long-term mortality follow-up of childhood-onset epilepsy (Sillanpaa-Shinnar 2010 NEJM, 245 children followed 40 years) found 7% cumulative SUDEP risk by age 40, with risk concentrated almost entirely in those who failed to achieve sustained terminal remission.
            </p>
          </section>

          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-base">The 350-fold spread — Tomson 2025</h4>
            <p>
              The most important recent paper for clinical counseling is Tomson et al, Neurology 2025, which used Swedish nationwide data to calculate <em>absolute</em> SUDEP incidence rates by combinations of risk factors. The spread:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
              <li>Lowest: 5 per 100,000py (95% CI 2–12) — shared bedroom + no TCS past year + adherent ASM</li>
              <li>Highest: 1,808 per 100,000py (95% CI 594–5,504) — living alone + nonadherent + nocturnal TCS + ≥1 TCS past year</li>
            </ul>
            <p className="mt-2">
              A 350-fold difference based on modifiable factors. This is the framing that gives the SUDEP conversation traction with families: most of the risk is modulated by things they can influence.
            </p>
          </section>

          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-base">The dominant risk factor: GTCS</h4>
            <p>
              Across every cohort studied, GTCS frequency is the dominant SUDEP risk factor:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-0.5 ml-2">
              <li>Sveinsson 2020: OR 26.8 for ≥1 GTCS vs 0; OR 1.15 (NS) for exclusively non-GTCS seizures</li>
              <li>Walczak 2001: OR 8.1 for &gt;3 GTCS/year; OR 11.5 for &gt;50 sz/month</li>
              <li>Hesdorffer 2011 (combined analysis, 4 case-control studies): graded dose-response</li>
            </ul>
            <p className="mt-2">
              This is mechanistically coherent with MORTEMUS — if SUDEP fundamentally follows a GTCS, then GTCS frequency × probability-of-fatal-postictal-event-per-GTCS = SUDEP rate.
            </p>
          </section>

          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-base">Genetic SUDEP — which genes</h4>
            <p>
              Donnan 2023 Neurology (n=510 genetic DEEs) provides the cleanest pediatric data. SUDEP occurred only in patients with pathogenic variants in:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-0.5 ml-2">
              <li><em>SCN1A</em> (Dravet and non-Dravet): 15/218 (6.9%)</li>
              <li><em>SCN2A</em>: 1/15 (6.7%)</li>
              <li><em>SCN8A</em>: 2/22 (9.1%)</li>
              <li><em>STXBP1</em>: 1/17 (5.9%)</li>
            </ul>
            <p className="mt-2">
              No SUDEP in their cohort: <em>SYNGAP1, NEXMIF, PCDH19, CHD2, GRIN2A, KCNT1, KCNQ2, Angelman</em>. Some of these (especially <em>KCNT1</em>-EIMFS in larger series, Kuchenbuch 2019: 17% SUDEP) carry SUDEP risk that may be undercounted by Donnan&apos;s sample size.
            </p>
            <p className="mt-2">
              <strong>Brain-heart channelopathy overlap.</strong> <em>KCNQ1</em>, <em>KCNH2</em>, <em>SCN5A</em>, <em>SCN1B</em> are causative in long QT and Brugada syndromes but also produce epilepsy. ~30% of LQTS patients report seizures (Anderson 2014). In these patients, the death mechanism may have a cardiac arrhythmic component on top of MORTEMUS-style central apnea. Baseline EKG is warranted.
            </p>
          </section>

          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-base">Why the SUDEP-7 has fallen out of favor</h4>
            <p>
              SUDEP-7 was a major step forward when DeGiorgio&apos;s group published it in 2011 — the first systematic inventory based on prospective cohort data. But:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-0.5 ml-2">
              <li>Odom 2018 (n=16 SUDEP cases vs 48 controls): no difference in SUDEP-7 scores</li>
              <li>Nei 2024: SUDEP-7 didn&apos;t improve prediction over simple GTCS frequency</li>
              <li>Several items (≥30 years duration, ≥3 ASMs) probably reflect epilepsy severity rather than independent SUDEP risk</li>
              <li>Limited pediatric validation; the duration criterion is rarely met in children</li>
            </ul>
            <p className="mt-2">
              SUDEP-3 (Nei 2024) is simpler and outperforms SUDEP-7, but is itself based on a single retrospective adult cohort. The current honest position is that no SUDEP score is adequately validated for clinical individual-level prediction.
            </p>
          </section>

          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-base">How to use risk tools clinically</h4>
            <p>
              Treat risk scores as <em>conversation organizers</em>, not as quantitative predictions. The clinical value isn&apos;t in producing a number, it&apos;s in:
            </p>
            <ol className="list-decimal list-inside mt-2 space-y-0.5 ml-2">
              <li>Ensuring you systematically ask about every modifiable factor</li>
              <li>Calibrating the SUDEP discussion intensity to actual risk magnitude</li>
              <li>Documenting that the discussion happened</li>
              <li>Identifying patients where additional intervention (surgery referral, nocturnal monitoring, cardiac evaluation) is justified</li>
            </ol>
          </section>

          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-base">The SUDEP conversation — when and how</h4>
            <p>
              AAN/AES 2017 (Level B): &quot;Clinicians should discuss with patients with epilepsy and their families the small individual risk of SUDEP.&quot; Surveys of bereaved families consistently report wanting to have been told. Surveys of clinicians consistently report discomfort initiating the conversation. The discrepancy is the problem.
            </p>
            <p className="mt-2">
              Pediatric considerations: families of children with Dravet, LGS, or other DEE often know about SUDEP from advocacy groups (Dravet Syndrome Foundation, NORSE Institute) before the clinician brings it up. Avoidance erodes trust. For a child with new-onset uncomplicated focal epilepsy, brief mention with quantitative reassurance (vastly less than other childhood risks) is appropriate. For a child with active GTCS or DEE, structured discussion with modifiable factor focus is essential.
            </p>
          </section>
        </div>
      )}

      {/* ============================================================ */}
      {/* REFERENCES                                                      */}
      {/* ============================================================ */}
      {tab === 'refs' && (
        <div className="max-w-2xl text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">References (PubMed format)</h4>
          <ol className="space-y-2 list-decimal list-inside">
            <li>Nashef L, So EL, Ryvlin P, Tomson T. Unifying the definitions of sudden unexpected death in epilepsy. Epilepsia. 2012;53(2):227-233. PMID: 22191982.</li>
            <li>Ryvlin P, Nashef L, Lhatoo SD, et al. Incidence and mechanisms of cardiorespiratory arrests in epilepsy monitoring units (MORTEMUS): a retrospective study. Lancet Neurol. 2013;12(10):966-977. PMID: 24012372.</li>
            <li>Harden C, Tomson T, Gloss D, et al. Practice guideline summary: Sudden unexpected death in epilepsy incidence rates and risk factors: Report of the AAN and the AES. Neurology. 2017;88(17):1674-1680. PMID: 28438841.</li>
            <li>Walczak TS, Leppik IE, D&apos;Amelio M, et al. Incidence and risk factors in sudden unexpected death in epilepsy: a prospective cohort study. Neurology. 2001;56(4):519-525. PMID: 11222798.</li>
            <li>Hesdorffer DC, Tomson T, Benn E, et al. Combined analysis of risk factors for SUDEP. Epilepsia. 2011;52(6):1150-1159. PMID: 21671925.</li>
            <li>Sveinsson O, Andersson T, Mattsson P, Carlsson S, Tomson T. Clinical risk factors in SUDEP: A nationwide population-based case-control study. Neurology. 2020;94(4):e419-e429. PMID: 31831600.</li>
            <li>Tomson T, Andersson T, Carlsson S, Sveinsson O. Influence of Risk Factor Combinations on Incidence Rates of SUDEP: A Population-Based Study. Neurology. 2025;104(5):e213372. PMID: 39908470.</li>
            <li>Sveinsson O, Andersson T, Carlsson S, Tomson T. The incidence of SUDEP: A nationwide population-based cohort study. Neurology. 2017;89(2):170-177. PMID: 28592455.</li>
            <li>Langan Y, Nashef L, Sander JW. Case-control study of SUDEP. Neurology. 2005;64(7):1131-1133. PMID: 15824334.</li>
            <li>van der Lende M, Hesdorffer DC, Sander JW, Thijs RD. Nocturnal supervision and SUDEP risk at different epilepsy care settings. Neurology. 2018;91(16):e1508-e1518. PMID: 30258020.</li>
            <li>Liebenthal JA, Wu S, Rose S, Ebersole JS, Tao JX. Association of prone position with sudden unexpected death in epilepsy. Neurology. 2015;84(7):703-709. PMID: 25609764.</li>
            <li>DeGiorgio CM, Miller P, Meymandi S, et al. RMSSD, a measure of vagus-mediated heart rate variability, is associated with risk factors for SUDEP: the SUDEP-7 Inventory. Epilepsy Behav. 2010;19(1):78-81. PMID: 20667792.</li>
            <li>Novak JL, Miller PR, Markovic D, Meymandi SK, DeGiorgio CM. Risk Assessment for Sudden Death in Epilepsy: The SUDEP-7 Inventory. Front Neurol. 2015;6:252. PMID: 26696953.</li>
            <li>Moseley BD, So E, Wirrell EC, et al. Characteristics of postictal generalized EEG suppression in children. Epilepsy Res. 2013;106(1-2):123-127. PMID: 23787191.</li>
            <li>Odom N, Bateman LM. Sudden unexpected death in epilepsy, periictal physiology, and the SUDEP-7 Inventory. Epilepsia. 2018;59(10):e157-e160. PMID: 30159901.</li>
            <li>Nei M, Sperling MR, Mintzer S, Ho RT. SUDEP-3 Inventory: Validation in a retrospective cohort study. Epilepsy Behav. 2024;160:110002. PMID: 39213701.</li>
            <li>Donner EJ, Camfield P, Brooks L, et al. Understanding death in children with epilepsy. Pediatr Neurol. 2017;70:7-15. PMID: 28335953.</li>
            <li>Keller AE, Whitney R, Li SA, Pollanen MS, Donner EJ. Incidence of sudden unexpected death in epilepsy in children is similar to adults. Neurology. 2018;91(2):e107-e111. PMID: 29884734.</li>
            <li>Sillanpää M, Shinnar S. Long-term mortality in childhood-onset epilepsy. N Engl J Med. 2010;363(26):2522-2529. PMID: 21175314.</li>
            <li>Berg AT, Nickels K, Wirrell EC, et al. Mortality risks in new-onset childhood epilepsy. Pediatrics. 2013;132(1):124-131. PMID: 23753097.</li>
            <li>Cooper MS, Mcintosh A, Crompton DE, et al. Mortality in Dravet syndrome. Epilepsy Res. 2016;128:43-47. PMID: 27810515.</li>
            <li>Donnan AM, Schneider AL, Russ-Hall S, Churilov L, Scheffer IE. Rates of Status Epilepticus and Sudden Unexplained Death in Epilepsy in People With Genetic Developmental and Epileptic Encephalopathies. Neurology. 2023;100(16):e1712-e1722. PMID: 36750385.</li>
            <li>Sullivan J, Wirrell EC, Knupp KG, et al. A systematic literature review on the global epidemiology of Dravet syndrome and Lennox-Gastaut syndrome. Epilepsia. 2024;65(5):1240-1263. PMID: 38329198.</li>
            <li>Bagnall RD, Crompton DE, Petrovski S, et al. Exome-based analysis of cardiac arrhythmia, respiratory control, and epilepsy genes in sudden unexpected death in epilepsy. Ann Neurol. 2016;79(4):522-534. PMID: 26704558.</li>
            <li>Anderson JH, Bos JM, Cascino GD, Ackerman MJ. Prevalence and spectrum of electroencephalogram-identified epileptiform activity among patients with long QT syndrome. Heart Rhythm. 2014;11(1):53-57. PMID: 24095109.</li>
            <li>Auerbach DS, McNitt S, Gross RA, Zareba W, Dirksen RT, Moss AJ. Genetic biomarkers for the risk of seizures in long QT syndrome. Neurology. 2016;87(16):1660-1668. PMID: 27466474.</li>
            <li>Nascimento FA, Borlot F, Cossette P, Minassian BA, Andrade DM. Two definite cases of sudden unexpected death in epilepsy in a family with a DEPDC5 mutation. Neurol Genet. 2015;1(4):e28. PMID: 27066574.</li>
            <li>Veeramah KR, O&apos;Brien JE, Meisler MH, et al. De novo pathogenic SCN8A mutation identified by whole-genome sequencing of a family quartet affected by infantile epileptic encephalopathy and SUDEP. Am J Hum Genet. 2012;90(3):502-510. PMID: 22365152.</li>
            <li>Kuchenbuch M, Barcia G, Chemaly N, et al. KCNT1 epilepsy with migrating focal seizures shows a temporal sequence with poor outcome, high mortality and SUDEP. Brain. 2019;142(10):2996-3008. PMID: 31532509.</li>
            <li>Hesdorffer DC, Tomson T, Benn E, et al. Do antiepileptic drugs or generalized tonic-clonic seizure frequency increase SUDEP risk? A combined analysis. Epilepsia. 2012;53(2):249-252. PMID: 22191685.</li>
            <li>Faught E, Duh MS, Weiner JR, Guérin A, Cunnington MC. Nonadherence to antiepileptic drugs and increased mortality. Neurology. 2008;71(20):1572-1578. PMID: 18981368.</li>
            <li>Tonberg A, Harden J, McLellan A, Chin RFM, Duncan S. A qualitative study of the reactions of young adults with epilepsy to SUDEP disclosure, perceptions of risks, views on the timing of disclosure, and behavioural change. Epilepsy Behav. 2015;42:98-106. PMID: 25506794.</li>
            <li>Maguire MJ, Jackson CF, Marson AG, Nevitt SJ. Treatments for the prevention of Sudden Unexpected Death in Epilepsy (SUDEP). Cochrane Database Syst Rev. 2020;4:CD011792. PMID: 32352572.</li>
            <li>Kløvgaard M, Lynge TH, Tsiropoulos I, et al. Epilepsy-related mortality in children and young adults in Denmark. Neurology. 2022;98(3):e213-e224. PMID: 34795050.</li>
            <li>Verducci C, Friedman D, Donner E, et al. SUDEP classification: discordances between forensic investigators and epileptologists. Epilepsia. 2020;61(8):e89-e94. PMID: 32683693.</li>
          </ol>
        </div>
      )}
    </div>
  );
}
