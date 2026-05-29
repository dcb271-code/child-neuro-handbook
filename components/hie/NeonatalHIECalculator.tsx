'use client';

import { useId, useMemo, useState } from 'react';
import {
  calcSarnat, assessTHEligibility,
  SARNAT_DOMAINS, ACUTE_PERINATAL_EVENTS,
  type SarnatInputs, type SarnatSeverityKey,
  type PHBand, type BDBand, type ApgarBand,
} from '@/lib/hie/calculator';

// ============================================================================
// UI HELPERS
// ============================================================================

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  const labelId = useId();
  return (
    <div className="mb-3" role="group" aria-labelledby={labelId}>
      <span id={labelId} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</span>
      {children}
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{hint}</p>}
    </div>
  );
}

function Select<T extends string>({ value, onChange, options }: {
  value: T;
  onChange: (v: T) => void;
  options: ReadonlyArray<readonly [T, string, number?]>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    >
      {options.map(([v, l, pts]) => (
        <option key={v} value={v}>{l}{pts !== undefined ? ` (${pts} pts)` : ''}</option>
      ))}
    </select>
  );
}

function Toggle<T extends string | boolean>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: ReadonlyArray<readonly [T, string]>;
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
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

// Walk-through criteria row. `ok` colors green/red; `warn` overrides to amber to
// signal a non-blocking caveat (e.g. case-by-case GA, extended-window age).
function CritRow({ ok, warn, label }: { ok: boolean; warn?: boolean; label: string }) {
  const cls = warn
    ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200'
    : ok
      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-900 dark:text-emerald-200'
      : 'bg-rose-50 dark:bg-rose-900/20 text-rose-900 dark:text-rose-200';
  return <div className={`p-2 rounded ${cls}`}>{warn ? '⚠' : ok ? '✓' : '✗'} {label}</div>;
}

function NumberInput({ value, onChange, suffix, min, max }: {
  value: number; onChange: (v: number) => void; suffix?: string; min?: number; max?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        max={max}
        className="w-24 px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {suffix && <span className="text-sm text-slate-600 dark:text-slate-400">{suffix}</span>}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

type Tab = 'sarnat' | 'eligibility' | 'teaching' | 'refs';

export default function NeonatalHIECalculator() {
  const [tab, setTab] = useState<Tab>('sarnat');

  const [sarnat, setSarnat] = useState<SarnatInputs>({
    consciousness: 'normal', spontActivity: 'normal', posture: 'normal',
    tone: 'normal', primitiveReflexes: 'normal', autonomic: 'normal',
    seizures: false,
  });

  const [elig, setElig] = useState<{
    gestationalAge: number; birthWeight: number; ageHours: number;
    ph: PHBand; baseDeficit: BDBand; apgar10: ApgarBand;
    assistedVent10min: boolean; acutePerinatalEvent: boolean; contraindications: boolean;
  }>({
    gestationalAge: 39, birthWeight: 3200, ageHours: 2,
    ph: 'unknown', baseDeficit: 'unknown', apgar10: 'gt_5',
    assistedVent10min: false, acutePerinatalEvent: false, contraindications: false,
  });

  const sarnatResult = useMemo(() => calcSarnat(sarnat), [sarnat]);
  const eligResult   = useMemo(() => assessTHEligibility({
    ...elig, sarnatStage: sarnatResult.stage,
  }), [elig, sarnatResult]);

  return (
    <div className="not-prose text-slate-900 dark:text-slate-100">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Neonatal HIE Assessment</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Modified Sarnat staging and therapeutic-hypothermia eligibility — operationalized to the institutional HIE pathway for resident education and the cooling-eligibility conversation.
        </p>
      </div>

      <div className="flex gap-1 mb-5 border-b border-slate-200 dark:border-slate-700 flex-wrap">
        {([
          ['sarnat', 'Modified Sarnat'],
          ['eligibility', 'TH eligibility'],
          ['teaching', 'Teaching points'],
          ['refs', 'References'],
        ] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
              tab === id
                ? 'border-blue-600 text-blue-700 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >{label}</button>
        ))}
      </div>

      {/* ============================================================ */}
      {/* SARNAT                                                         */}
      {/* ============================================================ */}
      {tab === 'sarnat' && (
        <div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-5 text-xs text-blue-900 dark:text-blue-200">
            <strong>Modified Sarnat staging.</strong> The categorical system used in the major TH trials (NICHD, CoolCap, TOBY). Six neurological domains plus seizures; Stage II (moderate) or III (severe) is the standard cooling threshold.
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wide">
                Neurological exam (6 domains)
              </h4>

              {SARNAT_DOMAINS.map(domain => (
                <Field key={domain.id} label={domain.label}>
                  <Select<SarnatSeverityKey>
                    value={sarnat[domain.id]}
                    onChange={(v) => setSarnat(s => ({ ...s, [domain.id]: v }))}
                    options={domain.options.map(([v, l]) => [v, l] as const)}
                  />
                </Field>
              ))}

              <Field label="Clinical or electrographic seizures" hint="Seizures alone qualify for TH consideration when other HIE features support the diagnosis.">
                <Toggle<boolean>
                  value={sarnat.seizures}
                  onChange={(v) => setSarnat(s => ({ ...s, seizures: v }))}
                  options={[[false, 'No'], [true, 'Yes']]}
                />
              </Field>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wide">
                Sarnat stage
              </h4>

              <div className={`rounded-lg p-4 border-2 mb-4 ${
                sarnatResult.stage === 'normal' ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-200' :
                sarnatResult.stage === 'mild' ? 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-200' :
                sarnatResult.stage === 'moderate' || sarnatResult.stage === 'moderate_severe' ? 'bg-orange-50 border-orange-300 text-orange-900 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-200' :
                'bg-red-50 border-red-300 text-red-900 dark:bg-red-900/20 dark:border-red-700 dark:text-red-200'
              }`}>
                <div className="text-xs uppercase tracking-wide opacity-75">Classification</div>
                <div className="text-base font-semibold mt-1">{sarnatResult.stageLabel}</div>
                <div className="text-xs mt-2 opacity-90">
                  Domains in moderate/severe range: {sarnatResult.moderateOrSevereCount}/6
                  {' · '}Any abnormal domain: {sarnatResult.abnormalCount}/6
                </div>
              </div>

              {sarnatResult.meetsThCriteria && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-3 mb-4">
                  <div className="text-xs uppercase tracking-wide text-blue-700 dark:text-blue-300 font-semibold">
                    Meets encephalopathy threshold for TH
                  </div>
                  <div className="text-xs text-blue-900 dark:text-blue-200 mt-2">
                    Check the &quot;TH eligibility&quot; tab for the full criteria (gestational age, age &lt;6 hours, evidence of perinatal event, no contraindications).
                  </div>
                </div>
              )}

              <details className="bg-slate-50 dark:bg-slate-900/40 rounded-md p-3 text-xs text-slate-700 dark:text-slate-300">
                <summary className="font-semibold cursor-pointer text-slate-800 dark:text-slate-200">
                  How Sarnat staging informs TH decisions
                </summary>
                <div className="mt-3 space-y-2 leading-relaxed">
                  <p>NICHD defined moderate encephalopathy as abnormalities in ≥3 of 6 categories (moderate or severe range), or seizures with at least one moderate/severe finding. Severe was defined by severe findings in multiple categories.</p>
                  <p>Inter-rater reliability of Sarnat is moderate (κ ~0.6–0.7); the main disagreements are at the mild-vs-moderate threshold (right where TH eligibility hinges) and around tone in sedated/intubated infants.</p>
                </div>
              </details>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TH ELIGIBILITY                                                 */}
      {/* ============================================================ */}
      {tab === 'eligibility' && (
        <div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-5 text-xs text-blue-900 dark:text-blue-200">
            <strong>TH eligibility — walk through the criteria.</strong> Two-path logic from the institutional HIE pathway (CoolCap 2005, NICHD 2005, TOBY 2009; AAP Committee on Fetus &amp; Newborn 2014; Zanelli 2026). <strong>Path A</strong> is severe biochemistry alone; <strong>Path B</strong> is the alternative when no gas / intermediate gas — it requires <em>all three</em> sub-criteria. Plus the gates (GA, BW, age) and an encephalopathy threshold pulled from the prior tabs.
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wide">Inclusion gates</h4>

              <Field label="Gestational age" hint="≥36 wks: standard. 35w0d–35w6d: case-by-case per protocol (Faix 2025). <35 wks: cooling not indicated — target strict normothermia.">
                <NumberInput value={elig.gestationalAge} onChange={(v) => setElig(s => ({ ...s, gestationalAge: v }))} suffix="weeks" min={20} max={42} />
              </Field>

              <Field label="Birth weight" hint="Threshold per the institutional pathway: must be >1800 g.">
                <NumberInput value={elig.birthWeight} onChange={(v) => setElig(s => ({ ...s, birthWeight: v }))} suffix="g" min={400} max={6000} />
              </Field>

              <Field label="Age at assessment" hint="≤6 h: standard cooling window. 6–24 h: extended window — may be considered after parental discussion of benefits and risks (Zanelli 2026 AAP clinical report). >24 h: not indicated. Exam can evolve — reassess every 1–2 hours up to 6 HOL.">
                <NumberInput value={elig.ageHours} onChange={(v) => setElig(s => ({ ...s, ageHours: v }))} suffix="hours of life" min={0} max={48} />
              </Field>

              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-5 mb-3 uppercase tracking-wide">
                Path A — Biochemical <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 normal-case">(any one qualifies)</span>
              </h4>

              <Field label="Blood gas pH (cord / ABG / VBG / cap in 1st hour of life)">
                <Select<PHBand>
                  value={elig.ph}
                  onChange={(v) => setElig(s => ({ ...s, ph: v }))}
                  options={[
                    ['unknown', 'No blood gas available'],
                    ['le_7', 'pH ≤ 7.0  (qualifies Path A)'],
                    ['7.01-7.15', 'pH 7.01–7.15  (intermediate → Path B trigger)'],
                    ['gt_7.15', 'pH > 7.15'],
                  ]}
                />
              </Field>

              <Field label="Base deficit (same sample)">
                <Select<BDBand>
                  value={elig.baseDeficit}
                  onChange={(v) => setElig(s => ({ ...s, baseDeficit: v }))}
                  options={[
                    ['unknown', 'No blood gas available'],
                    ['ge_16', 'BD ≥ 16 mmol/L  (qualifies Path A)'],
                    ['10-15.9', 'BD 10–15.9  (intermediate → Path B trigger)'],
                    ['lt_10', 'BD < 10'],
                  ]}
                />
              </Field>

              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-5 mb-3 uppercase tracking-wide">
                Path B — Alternative <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 normal-case">(used when Path A doesn&apos;t apply — needs ALL three)</span>
              </h4>

              <Field label="10-minute Apgar">
                <Select<ApgarBand>
                  value={elig.apgar10}
                  onChange={(v) => setElig(s => ({ ...s, apgar10: v }))}
                  options={[
                    ['gt_5', '>5'],
                    ['le_5', '≤5  (qualifies clinical trigger)'],
                    ['unknown', 'Unknown'],
                  ]}
                />
              </Field>

              <Field label="Assisted ventilation at birth ≥10 minutes" hint="Either alone satisfies the Path B clinical trigger — Apgar ≤5 OR vent ≥10 min.">
                <Toggle<boolean>
                  value={elig.assistedVent10min}
                  onChange={(v) => setElig(s => ({ ...s, assistedVent10min: v }))}
                  options={[[false, 'No'], [true, 'Yes']]}
                />
              </Field>

              <Field label="Acute perinatal sentinel event">
                <Toggle<boolean>
                  value={elig.acutePerinatalEvent}
                  onChange={(v) => setElig(s => ({ ...s, acutePerinatalEvent: v }))}
                  options={[[false, 'No / unclear'], [true, 'Yes']]}
                />
                <details className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                  <summary className="cursor-pointer">Qualifying events (institutional list)</summary>
                  <ul className="mt-1 ml-4 list-disc list-outside space-y-0.5">
                    {ACUTE_PERINATAL_EVENTS.map(e => <li key={e}>{e}</li>)}
                  </ul>
                </details>
              </Field>

              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-5 mb-3 uppercase tracking-wide">Contraindications</h4>

              <Field
                label="Major contraindication present"
                hint="Lethal congenital anomaly, severe active bleeding, severe sepsis, significant head trauma, or family/team decision to forgo TH. Pulmonary hypertension is NOT a contraindication (may be managed with concurrent iNO). ECMO + TH carries elevated ICH risk — weigh case-by-case."
              >
                <Toggle<boolean>
                  value={elig.contraindications}
                  onChange={(v) => setElig(s => ({ ...s, contraindications: v }))}
                  options={[[false, 'None'], [true, 'Yes']]}
                />
              </Field>

              <div className="bg-slate-50 dark:bg-slate-900/40 rounded-md p-3 mt-4 text-xs text-slate-700 dark:text-slate-300">
                <strong>Encephalopathy (from Sarnat tab):</strong>
                <div className="mt-2">Sarnat: <strong>{sarnatResult.stageLabel}</strong></div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wide">TH decision</h4>

              <div className={`rounded-lg p-4 border-2 mb-4 ${
                eligResult.eligible
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-200'
                  : 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-200'
              }`}>
                <div className="text-xs uppercase tracking-wide opacity-75">Recommendation</div>
                <div className="text-lg font-semibold mt-1">
                  {eligResult.eligible ? '✓ Eligible for therapeutic hypothermia' : '✗ Does not meet TH criteria'}
                </div>
                {eligResult.reasons.length > 0 && (
                  <div className="text-xs mt-2 opacity-90">
                    <strong>Why not:</strong>
                    <ul className="list-disc list-inside ml-2 mt-1">
                      {eligResult.reasons.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}
                {eligResult.warnings.length > 0 && (
                  <div className="text-xs mt-2 opacity-90">
                    <strong>Caveats:</strong>
                    <ul className="list-disc list-inside ml-2 mt-1">
                      {eligResult.warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              {/* Walk-through checklist */}
              <div className="space-y-2 text-xs">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400 mt-1">Gates</div>
                <CritRow ok={eligResult.eligibleGA || eligResult.gaCaseByCase}
                  warn={eligResult.gaCaseByCase}
                  label={`GA ${elig.gestationalAge} wks${eligResult.gaCaseByCase ? ' — 35w0d–35w6d (case-by-case)' : eligResult.eligibleGA ? ' — ≥36 wks ✓' : ' — <35 wks (block)'}`} />
                <CritRow ok={eligResult.eligibleBW}
                  label={`Birth weight ${elig.birthWeight} g${eligResult.eligibleBW ? ' — >1800 g ✓' : ' — ≤1800 g (block)'}`} />
                <CritRow ok={eligResult.eligibleAge || eligResult.ageExtendedWindow}
                  warn={eligResult.ageExtendedWindow}
                  label={`Age ${elig.ageHours} h${eligResult.eligibleAge ? ' — within 6-h window ✓' : eligResult.ageExtendedWindow ? ' — 6–24 h extended window' : ' — >24 h (block)'}`} />

                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400 mt-3">Physiologic — Path A</div>
                <CritRow ok={eligResult.criterionA}
                  label={`Path A ${eligResult.criterionA ? `met — ${eligResult.criterionAReason}` : 'not met'}`} />

                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400 mt-3">Physiologic — Path B (needs all three)</div>
                <CritRow ok={eligResult.biochemTriggerForB}
                  label={`Biochem trigger ${eligResult.biochemTriggerForB ? '(no gas, or intermediate pH/BD) ✓' : '✗'}`} />
                <CritRow ok={eligResult.clinicalTriggerForB}
                  label={`Clinical trigger ${eligResult.clinicalTriggerForB ? '(10-min Apgar ≤5 or vent ≥10 min) ✓' : '✗'}`} />
                <CritRow ok={eligResult.sentinelEventForB}
                  label={`Acute perinatal event ${eligResult.sentinelEventForB ? '✓' : '✗'}`} />
                <CritRow ok={eligResult.criterionB}
                  label={`Path B ${eligResult.criterionB ? 'met' : 'not met'}`} />

                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400 mt-3">Encephalopathy & safety</div>
                <CritRow ok={eligResult.encephalopathyMet}
                  label={`Moderate/severe encephalopathy ${eligResult.encephalopathyMet ? '✓' : '✗'} — ${sarnatResult.stageLabel}`} />
                <CritRow ok={!elig.contraindications}
                  label={`No major contraindications ${!elig.contraindications ? '✓' : '✗'}`} />
              </div>

              {eligResult.eligible && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-md p-3 mt-4 text-xs text-blue-900 dark:text-blue-200">
                  <strong>Initiate TH:</strong> goal core temp 33.5°C (whole-body or selective head cooling) × 72 h, then rewarm 0.5°C/h to 36.5°C. Continuous EEG through rewarming. Admission labs: CBC, INR/PTT, CMP, Mg, Phos, blood gas (ABG + lactate), POC glucose q4h × 4 then q8h. Head US to rule out large ICH; brain MRI ~DOL 4 (after rewarming). Treat seizures per neonatal-seizure guideline; trophic feeds at provider discretion. Consult neurology; transfer to a cooling-capable NICU if not already there.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TEACHING                                                       */}
      {/* ============================================================ */}
      {tab === 'teaching' && (
        <div className="max-w-2xl text-sm text-slate-700 dark:text-slate-300 space-y-5 leading-relaxed">

          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-base">What is HIE?</h4>
            <p>Hypoxic-ischemic encephalopathy is brain injury from oxygen/blood-flow deprivation during the perinatal period. Incidence ~1–3/1,000 term live births in high-income countries (5–10× higher in low/middle-income settings). A major cause of acquired neonatal brain injury and of cerebral palsy.</p>
            <p className="mt-2">Two-phase injury: primary energy failure during the acute event (ATP depletion, lactic acidosis, glutamate excitotoxicity), then secondary energy failure 6–48 hours later (mitochondrial dysfunction, oxidative stress, inflammation, apoptosis). Therapeutic hypothermia targets the secondary phase — that&apos;s why the 6-hour window matters.</p>
          </section>

          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-base">Why staging and scoring matter</h4>
            <p>The moderate-severe distinction is the threshold that has consistently shown benefit from TH in the major RCTs. Mild HIE shows less consistent benefit; recent trials (PRIME, COOLPRIME) suggest possible benefit in selected mild cases. Use scoring for TH triage, prognostic communication, longitudinal tracking, and research outcome standardization.</p>
          </section>

          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-base">Why Sarnat, not Thompson</h4>
            <p>The cooling trials (NICHD, CoolCap, TOBY) defined moderate-severe HIE using Sarnat-equivalent staging, and our institutional pathway operationalizes Sarnat (≥3 mod-or-severe domains, or seizures with supportive features). Thompson 1997 was derived in normothermic infants and can <em>undercall</em> sedated/intubated/cooled babies — tone, LOC, suck, and respiration co-suppress under sedation+TH, so the linear sum can read mild-moderate on a clinically severe infant. Some centers still use Thompson for serial bedside trajectory tracking through the first week, but it is not appropriate for TH-eligibility triage and is not used here.</p>
          </section>

          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-base">Key TH eligibility nuances</h4>
            <ul className="space-y-1 list-disc list-inside ml-2">
              <li><strong>Time window.</strong> Strong evidence within 6h. HEAL (6–24h) found no benefit and possible harm — most centers stick to the 6h window outside research protocols.</li>
              <li><strong>Gestational age.</strong> Established for ≥36 weeks. 33–35 weeks under research only (PRESERVE et al.). Contraindicated in extremely preterm infants.</li>
              <li><strong>Perinatal-event criteria are intentionally lenient</strong> to capture all potentially eligible infants — any one of Apgar ≤5 at 10 min, ongoing resus at 10 min, pH ≤7.0, base deficit ≥16, or a sentinel event.</li>
              <li><strong>Mild HIE</strong> (Sarnat I) is not a standard cooling indication; cool selected mild cases only on research protocols.</li>
              <li><strong>Pulmonary hypertension</strong> is not a contraindication and may be managed with concurrent iNO.</li>
            </ul>
          </section>

          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-base">Beyond the score — prognostic indicators</h4>
            <ul className="space-y-1 list-disc list-inside ml-2">
              <li><strong>aEEG / continuous EEG.</strong> Burst-suppression, continuous low voltage, or flat trace in the first 6–24h strongly predict poor outcome. Rapid normalization within 24–48h is reassuring.</li>
              <li><strong>Brain MRI</strong> at day 4–7 (after rewarming): basal ganglia/thalamic = severe acute; watershed = partial-prolonged; mixed = combined. DWI peaks 24–72h. Barkovich classification stratifies imaging-based risk.</li>
              <li><strong>Lactate kinetics.</strong> Time to lactate normalization (TLN, ≤2.5 mmol/L) is emerging as a useful prognostic marker.</li>
              <li><strong>Multi-organ involvement.</strong> AKI, hepatic, cardiac, DIC — each correlates with asphyxia severity and worse outcome.</li>
            </ul>
          </section>

          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-base">Pitfalls</h4>
            <ul className="space-y-1 list-disc list-inside ml-2">
              <li><strong>The exam evolves.</strong> A mild Sarnat at hour 2 can be moderate by hour 6 — reassess frequently.</li>
              <li><strong>Sedation confounds.</strong> Phenobarbital/fentanyl/morphine make tone, LOC, and reflex assessment unreliable.</li>
              <li><strong>Borderline mild-to-moderate cases drive inter-rater disagreement.</strong> When in doubt, err toward cooling — the harm of cooling a mild case is small; the harm of missing TH for a moderate case is large.</li>
              <li><strong>Score ≠ causation.</strong> An encephalopathic newborn doesn&apos;t always have HIE. Consider metabolic disease (UCDs, organic acidemias), neonatal stroke, ICH, sepsis, and rare genetic epilepsies — especially when Apgars were normal with rapid encephalopathy onset.</li>
            </ul>
          </section>
        </div>
      )}

      {/* ============================================================ */}
      {/* REFERENCES                                                     */}
      {/* ============================================================ */}
      {tab === 'refs' && (
        <div className="max-w-2xl text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">References (PubMed format)</h4>
          <ol className="space-y-2 list-decimal list-inside">
            <li>Sarnat HB, Sarnat MS. Neonatal encephalopathy following fetal distress. A clinical and electroencephalographic study. Arch Neurol. 1976;33(10):696-705. PMID: 987769.</li>
            <li>Committee on Fetus and Newborn. Hypothermia and Neonatal Encephalopathy. Pediatrics. 2014;133(6):1146-1150. doi:10.1542/peds.2014-0899.</li>
            <li>Zanelli SA, Wusthoff CJ, Lucke AM, Kaufman DA; Committee on Fetus and Newborn; Section on Neurology. Therapeutic Hypothermia for Neonatal Hypoxic-Ischemic Encephalopathy: Clinical Report. Pediatrics. 2026;157(2):e2025073627. PMID: 41581784.</li>
            <li>Faix RG, Laptook AR, Shankaran S, et al. Whole-Body Hypothermia for Neonatal Encephalopathy in Preterm Infants 33 to 35 Weeks&apos; Gestation: A Randomized Clinical Trial. JAMA Pediatr. 2025;179(4):396-406. doi:10.1001/jamapediatrics.2024.6613.</li>
            <li>Gluckman PD, Wyatt JS, Azzopardi D, et al. Selective head cooling with mild systemic hypothermia after neonatal encephalopathy: multicentre randomised trial (CoolCap). Lancet. 2005;365(9460):663-670. PMID: 15721471.</li>
            <li>Shankaran S, Laptook AR, Ehrenkranz RA, et al. Whole-body hypothermia for neonates with hypoxic-ischemic encephalopathy. N Engl J Med. 2005;353(15):1574-1584. PMID: 16221780.</li>
            <li>Azzopardi DV, Strohm B, Edwards AD, et al. Moderate hypothermia to treat perinatal asphyxial encephalopathy (TOBY). N Engl J Med. 2009;361(14):1349-1358. PMID: 19797281.</li>
            <li>Jacobs SE, Berg M, Hunt R, et al. Cooling for newborns with hypoxic ischaemic encephalopathy. Cochrane Database Syst Rev. 2013;(1):CD003311. PMID: 23440789.</li>
            <li>Laptook AR, Shankaran S, Tyson JE, et al. Effect of Therapeutic Hypothermia Initiated After 6 Hours of Age on Death or Disability Among Newborns With Hypoxic-Ischemic Encephalopathy (HEAL). JAMA. 2017;318(16):1550-1560. PMID: 29067428.</li>
            <li>Edwards AD, Brocklehurst P, Gunn AJ, et al. Neurological outcomes at 18 months of age after moderate hypothermia for perinatal hypoxic ischaemic encephalopathy. BMJ. 2010;340:c363. PMID: 20144981.</li>
            <li>Thoresen M, Hellström-Westas L, Liu X, de Vries LS. Effect of hypothermia on amplitude-integrated electroencephalogram in infants with asphyxia. Pediatrics. 2010;126(1):e131-e139. PMID: 20566612.</li>
            <li>Barkovich AJ, Hajnal BL, Vigneron D, et al. Prediction of neuromotor outcome in perinatal asphyxia: evaluation of MR scoring systems. AJNR Am J Neuroradiol. 1998;19(1):143-149. PMID: 9432172.</li>
            <li>Conway JM, Walsh BH, Boylan GB, Murray DM. Mild hypoxic ischaemic encephalopathy and long term neurodevelopmental outcome — a systematic review. Early Hum Dev. 2018;120:80-87. PMID: 29496329.</li>
            <li>Mrelashvili A, Russ JB, Ferriero DM, Wusthoff CJ. The Sarnat score for neonatal encephalopathy: looking back and moving forward. Pediatr Res. 2020;88(6):824-825. PMID: 32942286.</li>
            <li>Bonifacio SL, Glass HC, Peloquin S, Ferriero DM. A new neurological focus in neonatal intensive care. Nat Rev Neurol. 2011;7(9):485-494. PMID: 21808297.</li>
          </ol>
        </div>
      )}
    </div>
  );
}
