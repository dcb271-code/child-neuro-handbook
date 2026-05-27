'use client';

/* Seizure Recurrence Risk Calculators — UI component.
   1) First unprovoked seizure: Shinnar 1996 PMID: 8692621.
   2) First seizure meta-analysis: Berg/Shinnar 1991 PMID: 2067659.
   3) AAN/AES guideline context: Krumholz 2015 PMID: 25901057.
   4) Febrile seizure recurrence: Berg/Shinnar 1997 PMID: 9111436.
   5) Febrile → epilepsy: Annegers 1987 PMID: 3807992. See About tab for full reference list. */

import { useId, useMemo, useState } from 'react';
import {
  calcFirstSeizure,
  calcFebrileRecurrence,
  calcFutureEpilepsy,
  type FirstSeizureInputs,
  type FebrileRecurrenceInputs,
  type FutureEpilepsyInputs,
} from '@/lib/seizure-risk/calculator';

// ---------- UI helpers ----------
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  // role="group" + aria-labelledby works for BOTH a single <select> and a
  // <Toggle> button-group; a wrapping <label> would only associate one control.
  const labelId = useId();
  return (
    <div className="mb-3" role="group" aria-labelledby={labelId}>
      <span id={labelId} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</span>
      {children}
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

function Toggle<T extends string | boolean>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: [T, string][];
}) {
  return (
    <div className="flex gap-2">
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

function RiskPill({ value, label, color, suffix = '%' }: {
  value: number | string | null; label: string; color: string; suffix?: string;
}) {
  return (
    <div className={`rounded-lg p-3 ${color}`}>
      <div className="text-xs uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-2xl font-semibold mt-1">
        {value == null ? '—' : `${value}${suffix}`}
      </div>
    </div>
  );
}

type Tab = 'first' | 'recur' | 'future' | 'about';

export default function SeizureRiskCalculators() {
  const [tab, setTab] = useState<Tab>('first');

  const [F, setF] = useState<FirstSeizureInputs>({
    etiology: 'idiopathic', eeg: 'normal', nocturnal: false, todds: false, priorFS: false,
  });
  const [R, setR] = useState<FebrileRecurrenceInputs>({
    ageYoung: false, familyHistoryFS: false, lowTemp: false, shortFever: false,
  });
  const [E, setE] = useState<FutureEpilepsyInputs>({
    focal: false, prolongedLevel: 'no', multipleInDay: false, priorAbnormality: false, familyHxEpilepsy: false,
  });

  const firstResult = useMemo(() => calcFirstSeizure(F), [F]);
  const recurResult = useMemo(() => calcFebrileRecurrence(R), [R]);
  const futureResult = useMemo(() => calcFutureEpilepsy(E), [E]);

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      tab === t
        ? 'border-violet-600 text-violet-700 dark:text-violet-400'
        : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
    }`;

  return (
    <div className="not-prose text-slate-900 dark:text-slate-100">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">First Seizure &amp; Febrile Seizure Risk Calculators</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Counseling tools for recurrence risk after a first unprovoked seizure or a first febrile seizure.
        </p>
      </div>

      <div className="flex gap-1 mb-5 border-b border-slate-200 dark:border-slate-700 flex-wrap">
        <button type="button" onClick={() => setTab('first')} className={tabClass('first')}>First unprovoked seizure</button>
        <button type="button" onClick={() => setTab('recur')} className={tabClass('recur')}>Febrile sz: recurrence</button>
        <button type="button" onClick={() => setTab('future')} className={tabClass('future')}>Febrile sz: future epilepsy</button>
        <button type="button" onClick={() => setTab('about')} className={tabClass('about')}>About</button>
      </div>

      {/* TAB 1: FIRST UNPROVOKED SEIZURE */}
      {tab === 'first' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wide">Clinical inputs</h4>

            <Field label="Etiology" hint="Remote symptomatic = pre-existing brain abnormality (prior stroke, CP, TBI, malformation, etc.)">
              <Select value={F.etiology} onChange={(v) => setF((s) => ({ ...s, etiology: v }))}
                options={[['idiopathic', 'Idiopathic / cryptogenic'], ['remoteSymptomatic', 'Remote symptomatic']]} />
            </Field>

            <Field label="EEG findings" hint="Epileptiform = spikes, sharp waves, or generalized spike-wave. For prediction, EEG done when the child is well and afebrile for ≥2 weeks is much more reliable than EEG at presentation (postictal slowing and intercurrent-illness effects are non-specific and resolve).">
              <Select value={F.eeg} onChange={(v) => setF((s) => ({ ...s, eeg: v }))}
                options={[['normal', 'Normal (or non-epileptiform)'], ['abnormal', 'Epileptiform abnormality']]} />
            </Field>

            <Field label="Seizure occurred during sleep">
              <Toggle value={F.nocturnal} onChange={(v) => setF((s) => ({ ...s, nocturnal: v }))} options={[[false, 'No'], [true, 'Yes']]} />
            </Field>

            <Field label="Todd's paresis (post-ictal focal weakness)">
              <Toggle value={F.todds} onChange={(v) => setF((s) => ({ ...s, todds: v }))} options={[[false, 'No'], [true, 'Yes']]} />
            </Field>

            <Field label="Prior febrile seizures">
              <Toggle value={F.priorFS} onChange={(v) => setF((s) => ({ ...s, priorFS: v }))} options={[[false, 'No'], [true, 'Yes']]} />
            </Field>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wide">Recurrence risk</h4>

            <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 rounded-md p-3 mb-3">
              {firstResult.label}
            </div>

            <div className="mb-4">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Without ASM treatment</div>
              <div className="grid grid-cols-2 gap-2">
                <RiskPill label="2-year recurrence" value={firstResult.untreated.r2y}
                  color="bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200" />
                <RiskPill label="5-year recurrence" value={firstResult.untreated.r5y}
                  color="bg-red-50 border border-red-200 text-red-900 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200" />
              </div>
            </div>

            <div className="mb-4">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">With ASM treatment (FIRST/MESS estimate)</div>
              <div className="grid grid-cols-2 gap-2">
                <RiskPill label="2-year recurrence" value={firstResult.treated.r2y}
                  color="bg-emerald-50 border border-emerald-200 text-emerald-900 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-200" />
                <RiskPill label="5-year recurrence" value={firstResult.treated.r5y}
                  color="bg-emerald-50 border border-emerald-200 text-emerald-900 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-200" />
              </div>
            </div>

            {firstResult.epilepsyDx && (
              <div className="bg-red-50 border-2 border-red-300 dark:bg-red-900/20 dark:border-red-700 rounded-lg p-3 mb-4">
                <div className="text-sm font-semibold text-red-900 dark:text-red-200">⚠ Meets ILAE 2014 epilepsy criterion</div>
                <div className="text-xs text-red-800 dark:text-red-300 mt-1">
                  5-year recurrence is ≥60%, so the 10-year risk (the ILAE 2014 threshold) is ≥60% after a single unprovoked seizure with this risk profile → can be classified as epilepsy without waiting for a second seizure.
                </div>
              </div>
            )}

            {firstResult.likelyEpilepsyDx && (
              <div className="bg-amber-50 border-2 border-amber-300 dark:bg-amber-900/20 dark:border-amber-700 rounded-lg p-3 mb-4">
                <div className="text-sm font-semibold text-amber-900 dark:text-amber-200">△ Likely meets ILAE 2014 epilepsy criterion</div>
                <div className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                  5-year recurrence exceeds 50%. The ILAE 2014 threshold is defined on 10-year risk, which this tool doesn&apos;t compute — the 10-year risk for this profile likely reaches ≥60%. Consider whether a single-seizure epilepsy diagnosis applies.
                </div>
              </div>
            )}

            <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/40 rounded-md p-3 space-y-2">
              <p><strong>Counseling points.</strong> ASM treatment after a first seizure roughly halves 2-year recurrence (FIRST trial: 51% → 25%; MESS: similar magnitude), but does <em>not</em> change long-term seizure freedom or remission rates. By 3–5 years, treated and untreated groups converge.</p>
              <p>Most recurrences occur in the first 6–12 months. Among those who recur, ~70% will have a second seizure within a year. Decision to treat balances reduced short-term recurrence against ASM side effects and the social cost (driving, stigma) of an epilepsy label.</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FEBRILE SEIZURE RECURRENCE */}
      {tab === 'recur' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wide">Risk factors (Berg/Shinnar 1997)</h4>

            <Field label="Age &lt;18 months at first febrile seizure">
              <Toggle value={R.ageYoung} onChange={(v) => setR((s) => ({ ...s, ageYoung: v }))} options={[[false, 'No'], [true, 'Yes']]} />
            </Field>

            <Field label="Family history of febrile seizures" hint="First-degree relative (parent or sibling)">
              <Toggle value={R.familyHistoryFS} onChange={(v) => setR((s) => ({ ...s, familyHistoryFS: v }))} options={[[false, 'No'], [true, 'Yes']]} />
            </Field>

            <Field label="Low peak temperature" hint="Peak documented temp &lt;40°C (104°F) — lower threshold = lower seizure threshold">
              <Toggle value={R.lowTemp} onChange={(v) => setR((s) => ({ ...s, lowTemp: v }))} options={[[false, 'No (≥40°C)'], [true, 'Yes (<40°C)']]} />
            </Field>

            <Field label="Short fever-to-seizure interval" hint="Seizure within first hour of recognized fever">
              <Toggle value={R.shortFever} onChange={(v) => setR((s) => ({ ...s, shortFever: v }))} options={[[false, 'No (≥1 hour)'], [true, 'Yes (<1 hour)']]} />
            </Field>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wide">Recurrence risk</h4>

            <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-lg p-4 mb-4">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Risk factors present</div>
              <div className="text-3xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
                {recurResult.rfCount} <span className="text-base text-slate-400 dark:text-slate-500">/ 4</span>
              </div>
            </div>

            <div className={`rounded-lg p-4 border-2 mb-4 ${
              recurResult.rfCount <= 1 ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-200' :
              recurResult.rfCount === 2 ? 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-200' :
              'bg-red-50 border-red-300 text-red-900 dark:bg-red-900/20 dark:border-red-700 dark:text-red-200'
            }`}>
              <div className="text-xs uppercase tracking-wide opacity-75">{recurResult.stratum}</div>
              <div className="text-3xl font-semibold mt-1">~{recurResult.risk}%</div>
              <div className="text-sm mt-1 opacity-90">2-year cumulative recurrence risk</div>
            </div>

            <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/40 rounded-md p-3 space-y-2">
              <p><strong>What we tell families.</strong> Overall recurrence after any first FS is ~30–35% over 2 years, but it ranges from ~14% (no risk factors) to ~75% (all four). Most recurrences happen within 1 year. Risk decreases as the child ages out of the FS-susceptible window (~6 mo to 5 yr).</p>
              <p><strong>Treatment.</strong> Neither prophylactic ASM nor scheduled antipyretics prevent recurrence at clinically meaningful rates. Daily phenobarbital and valproate reduce recurrence but the adverse effect burden outweighs benefit (AAP 2008 guideline, Offringa Cochrane 2021). Rectal diazepam or intranasal midazolam during fever can be considered in selected high-risk children but is not routinely recommended.</p>
              <p><strong>Key reassurance.</strong> Simple FS does <em>not</em> cause brain damage, does not affect cognitive outcome, and does not meaningfully increase mortality risk.</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FUTURE EPILEPSY AFTER FS */}
      {tab === 'future' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wide">Higher-risk complex features</h4>

            <Field label="Focal features" hint="Focal motor activity, focal version, Todd's paresis">
              <Toggle value={E.focal} onChange={(v) => setE((s) => ({ ...s, focal: v }))} options={[[false, 'No'], [true, 'Yes']]} />
            </Field>

            <Field label="Seizure duration" hint="Brief (&lt;15 min) is simple. 15–29 min is complex by duration. ≥30 min is febrile status (FSE) — much higher risk, FEBSTAT-relevant.">
              <Select value={E.prolongedLevel} onChange={(v) => setE((s) => ({ ...s, prolongedLevel: v }))}
                options={[['no', 'Brief (<15 min)'], ['moderate', 'Prolonged 15–29 min (complex)'], ['fse', 'Febrile status epilepticus (≥30 min)']]} />
            </Field>

            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-5 mb-3 uppercase tracking-wide">Recurrence</h4>

            <Field label="Recurrence within same febrile illness" hint="≥2 seizures within 24h. Recent evidence (Sartori 2019, Whitney 2024, Jiang 2026) shows that recurrence alone — without focal or prolonged features — does NOT independently elevate epilepsy risk and approaches simple FS baseline.">
              <Toggle value={E.multipleInDay} onChange={(v) => setE((s) => ({ ...s, multipleInDay: v }))} options={[[false, 'No'], [true, 'Yes']]} />
            </Field>

            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-5 mb-3 uppercase tracking-wide">Other modifiers</h4>

            <Field label="Pre-existing neurodevelopmental abnormality" hint="CP, developmental delay, structural brain abnormality before the FS">
              <Toggle value={E.priorAbnormality} onChange={(v) => setE((s) => ({ ...s, priorAbnormality: v }))} options={[[false, 'No'], [true, 'Yes']]} />
            </Field>

            <Field label="Family history of epilepsy (not just FS)" hint="First-degree relative with afebrile epilepsy">
              <Toggle value={E.familyHxEpilepsy} onChange={(v) => setE((s) => ({ ...s, familyHxEpilepsy: v }))} options={[[false, 'No'], [true, 'Yes']]} />
            </Field>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wide">Risk of future unprovoked seizures</h4>

            <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-lg p-4 mb-4">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Classification</div>
              <div className="text-lg font-medium text-slate-900 dark:text-slate-100 mt-1">{futureResult.stratum}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                {futureResult.fse ? 'Febrile status epilepticus subset' : futureResult.isComplex ? 'Complex febrile seizure' : 'Simple febrile seizure'}
                {futureResult.recurrenceOnly && ' (recurrence-only complex)'}
                {futureResult.higherRiskCount > 0 && ` — ${futureResult.higherRiskCount} higher-risk feature${futureResult.higherRiskCount > 1 ? 's' : ''}`}
              </div>
            </div>

            {futureResult.fse && (
              <div className="bg-purple-50 border-2 border-purple-300 dark:bg-purple-900/20 dark:border-purple-700 rounded-lg p-3 mb-4">
                <div className="text-xs uppercase tracking-wide text-purple-700 dark:text-purple-300 font-semibold">⚠ FEBSTAT-relevant subset</div>
                <div className="text-xs text-purple-900 dark:text-purple-200 mt-2 space-y-1">
                  <p>FSE is associated with acute hippocampal T2 hyperintensity in ~10% of children; 70% of those evolve to radiologic hippocampal sclerosis over 1–10 years (Lewis 2025, FEBSTAT).</p>
                  <p><strong>Consider:</strong> acute brain MRI within days of the event (FEBSTAT protocol), with attention to hippocampal T2 signal. Acute MRI dramatically refines risk — 23% epilepsy at 10 yrs if normal, 71% if T2 hyperintensity is present.</p>
                </div>
              </div>
            )}

            {futureResult.fse && (E.focal || E.multipleInDay) && (
              <div className="bg-rose-50 border-2 border-rose-300 dark:bg-rose-900/20 dark:border-rose-700 rounded-lg p-3 mb-4">
                <div className="text-xs uppercase tracking-wide text-rose-700 dark:text-rose-300 font-semibold">⚠ Consider Dravet syndrome / <em>SCN1A</em></div>
                <div className="text-xs text-rose-900 dark:text-rose-200 mt-2 space-y-1">
                  <p>Hemiclonic FSE — especially with alternating sides between events — is the most characteristic presentation of Dravet syndrome. The classic prodrome is normal early development with onset of prolonged, often hemiclonic, fever- or vaccine-triggered seizures in the first year, evolving to multiple seizure types and developmental slowing by toddlerhood.</p>
                  <p><strong>Suggestive features:</strong> onset &lt;12 months, prolonged/hemiclonic FS, alternating hemiconvulsions, status triggered by hot baths or vaccines, photosensitivity, family history of GEFS+ spectrum, apparent worsening on sodium channel blockers (CBZ, OXC, LTG, PHT).</p>
                  <p>Threshold for <em>SCN1A</em> testing (or epilepsy gene panel) should be low — early diagnosis affects ASM choice substantially (avoid sodium channel blockers; consider stiripentol, fenfluramine, cannabidiol).</p>
                </div>
              </div>
            )}

            <div className={`rounded-lg p-4 border-2 mb-4 ${
              futureResult.adjustedRisk < 5 ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-200' :
              futureResult.adjustedRisk < 15 ? 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-200' :
              'bg-red-50 border-red-300 text-red-900 dark:bg-red-900/20 dark:border-red-700 dark:text-red-200'
            }`}>
              <div className="text-xs uppercase tracking-wide opacity-75">Risk of epilepsy by age 25</div>
              <div className="text-3xl font-semibold mt-1">~{futureResult.adjustedRisk}%</div>
              <div className="text-sm mt-1 opacity-90">vs general population baseline ~1%</div>
            </div>

            <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/40 rounded-md p-3 space-y-2">
              <p><strong>Anchors.</strong> Annegers et al (NEJM 1987, Rochester cohort, n=687) and Nelson/Ellenberg (NCPP 1976/1978) established the framework: simple FS confers ~2-fold increase in lifetime epilepsy risk (~2-3% vs ~1% baseline), with complex features stratifying risk further.</p>
              <p><strong>Recent evidence has refined which complex features matter.</strong> Multivariable analyses (Sartori 2019 DMCN; Whitney 2024 IJP; Jiang 2026 Front Neurol, n=611) show that recurrence within 24h alone — without focal or prolonged features — does NOT independently elevate epilepsy risk. In Jiang's cohort, recurrent vs non-recurrent FS yielded 4.0% vs 1.6% epilepsy at median 39-month follow-up (p=0.218, log-rank NS). MRI yield was 0/56 across the cohort. The "complex" label is doing too much heavy lifting historically — focal features and prolonged duration are the real risk drivers.</p>
              <p><strong>Febrile status epilepticus (FSE).</strong> Updated 10-year FEBSTAT data (Lewis et al, Epilepsia Open 2025, n=199–226) gives a sharper picture: 30% cumulative epilepsy incidence overall, 23% even with a normal acute MRI, and 71% in the ~10% subset with acute hippocampal T2 hyperintensity. Of those with acute T2 signal change, 70% evolved to radiologic hippocampal sclerosis on 1–10 year follow-up MRI — closing the loop on the long-debated FSE → mesial temporal sclerosis → TLE pathway.</p>
              <p><strong>Genetic considerations.</strong> Children with multiple recurrent complex FS, FS persisting beyond age 5, or FS plus other seizure types should prompt consideration of <em>SCN1A</em>-related disorders (GEFS+ spectrum, Dravet syndrome). Early dystonia + valproate-induced encephalopathy + photosensitive myoclonus would push further toward Dravet.</p>
            </div>
          </div>
        </div>
      )}

      {tab === 'about' && (
        <div className="max-w-2xl text-sm text-slate-700 dark:text-slate-300 space-y-4 leading-relaxed">
          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">First unprovoked seizure</h4>
            <p className="mb-2">
              The most useful clinical predictors are etiology (idiopathic
              vs remote symptomatic) and EEG (epileptiform vs not). Shinnar's
              extended pediatric cohort showed ~21% recurrence for the
              lowest-risk group (idiopathic + normal EEG) and ~65% for the
              highest-risk group (remote symptomatic + epileptiform EEG)
              at 5 years. Most recurrences happen in the first year.
            </p>
            <p className="mb-2">
              ILAE's 2014 operational definition allows epilepsy diagnosis
              after a single unprovoked seizure if 10-year recurrence risk
              is ≥60%. This usually requires both remote symptomatic
              etiology and abnormal EEG, or an electroclinical syndrome
              identifiable on first presentation.
            </p>
            <p>
              FIRST (Italian RCT, n=419) and MESS (UK RCT, n=1443) both
              showed that immediate ASM treatment after a first seizure
              roughly halves 2-year recurrence but does not change
              long-term remission (~70% by 3-5 years regardless of
              treatment timing). MESS was the basis for the AAN/AES 2015
              recommendation that immediate treatment "may" be considered,
              with the decision individualized to lifestyle and
              risk-tolerance factors.
            </p>
          </section>

          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Febrile seizures — the framework</h4>
            <p className="mb-2">
              ILAE definition: a seizure occurring with fever (≥38°C) in
              a child 6 months–5 years old, without CNS infection or
              prior afebrile seizures. Prevalence ~2–5% of children in
              the US/Europe, up to 14% in some populations (Guam,
              Japanese). Peak age 18 months.
            </p>
            <p className="mb-2">
              <strong>Simple:</strong> generalized, &lt;15 min, single
              occurrence in 24 hours. Account for ~80% of FS.
            </p>
            <p className="mb-2">
              <strong>Complex:</strong> any of focal features, duration
              ≥15 min, or recurrence within the same febrile illness.
            </p>
            <p>
              <strong>Febrile status epilepticus (FSE):</strong> FS lasting
              ≥30 min. Occurs in 5–9% of children with a first FS and
              accounts for ~25% of pediatric status epilepticus. This is
              the highest-risk subset and is treated as its own stratum in
              this tool because its outcomes differ qualitatively from
              other complex FS (FEBSTAT cohort, Lewis 2025).
            </p>
          </section>

          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">The "complex" features are not equal</h4>
            <p className="mb-2">
              Newer evidence has substantially refined the classical Annegers
              framework. The three complex criteria — focal features, prolonged
              duration, and recurrence within 24h — carry markedly different
              prognostic weights. Recurrence-only complex FS behaves much
              closer to simple FS than to focal or prolonged FS.
            </p>
            <p className="mb-2">
              <strong>Sartori et al (DMCN 2019).</strong> Multivariable
              analysis of 727 children presenting to ED with first-ever
              convulsive seizure: recurrence within 24h did not independently
              predict epilepsy after adjusting for focal features, prolonged
              duration, and prior neurodevelopmental status.
            </p>
            <p className="mb-2">
              <strong>Jiang et al (Front Neurol 2026, n=611).</strong> Direct
              comparison of recurrent vs non-recurrent FS during the same
              febrile illness, with median 39-month follow-up: epilepsy
              developed in 4.0% vs 1.6% (p=0.218, log-rank χ²=0.74, p=0.391;
              HR 1.223, 95% CI 0.770–1.942). MRI yield was 0/56 across the
              full cohort. The PICU subgroup (n=14, all with status or
              ≥2 recurrences AND high illness severity) had 29% epilepsy —
              risk concentrated in prolonged/status, not recurrence per se.
            </p>
            <p className="mb-2">
              <strong>Imaging yield.</strong> Multiple studies (Fletcher 2013,
              Guedj 2017, Kim 2024) show effectively zero yield from routine
              MRI in complex FS where the only complex feature is recurrence.
              The 2011 AAP guideline already endorsed minimal workup for
              simple FS; the practical implication is that recurrence-only
              complex FS warrants similar restraint.
            </p>
            <p>
              <strong>What still genuinely raises risk:</strong> focal features
              (especially hemiclonic), prolonged duration (and especially
              febrile status, ≥30 min), and pre-existing neurodevelopmental
              abnormality. These should still trigger neuroimaging
              consideration and closer follow-up.
            </p>
          </section>

          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Febrile status epilepticus — its own category</h4>
            <p className="mb-2">
              FSE (≥30 min) deserves a stratum of its own. The classical
              Annegers data lumped it with other "prolonged" complex FS,
              but the FEBSTAT cohort has made clear over the past two
              decades that the outcomes diverge sharply.
            </p>
            <p className="mb-2">
              <strong>Lewis et al (Epilepsia Open 2025), 10-year FEBSTAT
              follow-up.</strong> 199–226 children with FSE prospectively
              enrolled and followed up to 10 years:
            </p>
            <ul className="list-disc list-inside space-y-1 mb-2">
              <li>30% cumulative epilepsy incidence overall</li>
              <li>23% epilepsy at 10 years with normal acute MRI</li>
              <li>71% epilepsy at 10 years with acute hippocampal T2 hyperintensity (~10% of subjects)</li>
              <li>70% of those with acute T2 hyperintensity evolved to radiologic hippocampal sclerosis on 1–10 yr follow-up</li>
              <li>Acute EEG focal slowing/attenuation in the temporal region was associated with T2 hyperintensity</li>
            </ul>
            <p>
              Practically, FSE warrants acute brain MRI within days of the
              event (ideally with attention to hippocampal T2 signal) — the
              acute imaging dramatically refines downstream epilepsy risk.
              This is also the population in which the long-debated FSE →
              hippocampal sclerosis → mesial temporal lobe epilepsy
              pathway has now been most clearly documented.
            </p>
          </section>

          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Other risk factors worth noting but not in the calculator</h4>
            <p className="mb-2">
              The model intentionally keeps a small number of inputs to avoid
              false precision. Several additional factors modulate risk and
              deserve clinical attention even though they aren't entered:
            </p>
            <ul className="space-y-2 list-disc list-inside">
              <li>
                <strong>Age at first FS.</strong> Onset before 12 months
                raises both short-term recurrence risk (~50% second FS in
                the first year for &lt;12 mo onset) and the probability
                that the diagnosis is actually a developmental and
                epileptic encephalopathy presenting with fever-triggered
                seizures. Onset before 6 months or after 5 years is
                outside the typical FS window and warrants closer scrutiny.
              </li>
              <li>
                <strong>Specific viral triggers.</strong> Human herpesvirus
                6/7 viremia is overrepresented in prolonged FS and FSE
                (Epstein FEBSTAT subanalysis: HHV-6 in ~30% of FSE).
                Influenza A is a strong predictor of acute-phase
                recurrence (Jiang 2026 OR 3.34, Hara 2007) and tends to
                produce more severe presentations. Roseola (HHV-6) FS
                is classically recognized as a temporally clustered event.
              </li>
              <li>
                <strong>Number of prior FS episodes.</strong> Each
                subsequent FS modestly raises both recurrence risk and
                the probability of future epilepsy diagnosis. A child
                presenting with their fifth FS is qualitatively different
                from one with their first, even if the current event
                meets simple FS criteria.
              </li>
              <li>
                <strong>Postictal Todd's paresis duration.</strong> Brief
                postictal weakness is common and not concerning. Prolonged
                unilateral weakness (&gt;1 hour) raises concern for a
                focal structural lesion, hemiclonic FSE, or HHE-spectrum
                presentation, and should prompt urgent imaging.
              </li>
              <li>
                <strong>Acute EEG focal slowing.</strong> FEBSTAT data
                (Nordli 2012): focal slowing in 24% and focal attenuation
                in 13% within 72 hours of FSE; both correlated with acute
                hippocampal T2 hyperintensity. A normal acute EEG argues
                against acute hippocampal injury and is a useful
                reassurance.
              </li>
            </ul>
          </section>

          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">EEG timing matters more than people realize</h4>
            <p className="mb-2">
              Two distinct sources of non-specific EEG abnormality bedevil
              the acute setting:
            </p>
            <ul className="space-y-1 list-disc list-inside mb-2">
              <li><strong>Postictal effects:</strong> focal or generalized slowing for hours-to-days after a seizure, often resolving completely.</li>
              <li><strong>Intercurrent illness effects:</strong> fever, dehydration, sleep deprivation, and the underlying infection itself can produce slowing and even paroxysmal patterns that are not interictal in any clinically meaningful sense.</li>
            </ul>
            <p className="mb-2">
              For predicting future epilepsy risk after a first unprovoked
              seizure or a complex FS, the most informative EEG is one
              done when the child is well and afebrile for at least two
              weeks. EEG done at the time of presentation is useful for
              detecting ongoing electrographic status or syndrome-specific
              patterns, but its prognostic discriminative value is much
              weaker.
            </p>
            <p>
              The 2011 AAP guideline recommendation against routine EEG
              in simple FS is partly grounded in this — the false-positive
              rate of an acute EEG is high enough that the test more often
              creates anxiety than refines management.
            </p>
          </section>

          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">When to think beyond "just a febrile seizure"</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Recurrent prolonged or focal FS, especially with hemiclonic or alternating-side features</li>
              <li>FS persisting beyond age 5 or starting before 6 months</li>
              <li>Mixed seizure types (afebrile seizures, myoclonus, atypical absence)</li>
              <li>Developmental regression or arrest after seizures begin</li>
              <li>Family history of GEFS+ spectrum or Dravet</li>
              <li>Photosensitivity, pattern-sensitivity, or sensitivity to hot baths/temperature changes</li>
              <li>Status triggered by vaccines or hot water</li>
              <li>Apparent paradoxical worsening on sodium channel blockers (CBZ, OXC, LTG, PHT)</li>
              <li>Pattern suggests GEFS+, Dravet, or another DEE → low threshold for <em>SCN1A</em> and epilepsy gene panel</li>
            </ul>
          </section>

          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Important caveats on the numbers</h4>
            <p className="mb-2">
              These risk estimates are derived from population-based cohorts
              (Rochester, Connecticut, NCPP, UK NCDS) collected mostly between
              the 1970s and 1990s. Modern epilepsy classification (ILAE 2017,
              2022 syndromes), wider availability of MRI, and the gene-test
              era have refined our thinking but the population-level base
              rates remain remarkably stable.
            </p>
            <p>
              The 4-factor Berg/Shinnar model has been validated multiple
              times; the Annegers complex-feature stratification is less
              precisely calibrated and the published risks span a range —
              the figures shown here are central estimates suitable for
              counseling but not for individual prognostic certainty.
            </p>
          </section>

          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">References</h4>
            <ol className="space-y-2 text-xs list-decimal list-inside">
              <li>Shinnar S, Berg AT, Moshe SL, et al. The risk of seizure recurrence after a first unprovoked afebrile seizure in childhood: an extended follow-up. Pediatrics. 1996;98(2 Pt 1):216-225. PMID: 8692621.</li>
              <li>Berg AT, Shinnar S. The risk of seizure recurrence following a first unprovoked seizure: a quantitative review. Neurology. 1991;41(7):965-972. PMID: 2067659.</li>
              <li>Hirtz D, Berg A, Bettis D, et al. Practice parameter: treatment of the child with a first unprovoked seizure: report of the Quality Standards Subcommittee of the American Academy of Neurology and the Practice Committee of the Child Neurology Society. Neurology. 2003;60(2):166-175. PMID: 12552027.</li>
              <li>Krumholz A, Wiebe S, Gronseth GS, et al. Evidence-based guideline: Management of an unprovoked first seizure in adults. Neurology. 2015;84(16):1705-1713. PMID: 25901057.</li>
              <li>Musicco M, Beghi E, Solari A, Viani F. Treatment of first tonic-clonic seizure does not improve the prognosis of epilepsy. First Seizure Trial Group (FIRST Group). Neurology. 1997;49(4):991-998. PMID: 9339678.</li>
              <li>Marson A, Jacoby A, Johnson A, et al. Immediate versus deferred antiepileptic drug treatment for early epilepsy and single seizures: a randomised controlled trial. Lancet. 2005;365(9476):2007-2013. PMID: 15950714.</li>
              <li>Fisher RS, Acevedo C, Arzimanoglou A, et al. ILAE official report: a practical clinical definition of epilepsy. Epilepsia. 2014;55(4):475-482. PMID: 24730690.</li>
              <li>Berg AT, Shinnar S, Darefsky AS, et al. Predictors of recurrent febrile seizures: a prospective cohort study. Arch Pediatr Adolesc Med. 1997;151(4):371-378. PMID: 9111436.</li>
              <li>Annegers JF, Hauser WA, Shirts SB, Kurland LT. Factors prognostic of unprovoked seizures after febrile convulsions. N Engl J Med. 1987;316(9):493-498. PMID: 3807992.</li>
              <li>Nelson KB, Ellenberg JH. Predictors of epilepsy in children who have experienced febrile seizures. N Engl J Med. 1976;295(19):1029-1033. PMID: 972656.</li>
              <li>Verity CM, Greenwood R, Golding J. Long-term intellectual and behavioral outcomes of children with febrile convulsions. N Engl J Med. 1998;338(24):1723-1728. PMID: 9624192.</li>
              <li>Subcommittee on Febrile Seizures, American Academy of Pediatrics. Neurodiagnostic evaluation of the child with a simple febrile seizure. Pediatrics. 2011;127(2):389-394. PMID: 21285335.</li>
              <li>Steering Committee on Quality Improvement and Management, Subcommittee on Febrile Seizures, AAP. Febrile seizures: clinical practice guideline for the long-term management of the child with simple febrile seizures. Pediatrics. 2008;121(6):1281-1286. PMID: 18519501.</li>
              <li>Shinnar S, Hesdorffer DC, Nordli DR Jr, et al. Phenomenology of prolonged febrile seizures: results of the FEBSTAT study. Neurology. 2008;71(3):170-176. PMID: 18525033.</li>
              <li>Shinnar S, Bello JA, Chan S, et al. MRI abnormalities following febrile status epilepticus in children: the FEBSTAT study. Neurology. 2012;79(9):871-877. PMID: 22843278.</li>
              <li>Lewis DV, Nordli DR, Shinnar S, et al. Febrile status epilepticus and epileptogenesis: The FEBSTAT study. Epilepsia Open. 2025;10(4):1140-1158. PMID: 40770931.</li>
              <li>Nordli DR Jr, Moshé SL, Shinnar S, et al. Acute EEG findings in children with febrile status epilepticus: results of the FEBSTAT study. Neurology. 2012;79(22):2180-2186. PMID: 23136262.</li>
              <li>Epstein LG, Shinnar S, Hesdorffer DC, et al. Human herpesvirus 6 and 7 in febrile status epilepticus: the FEBSTAT study. Epilepsia. 2012;53(9):1481-1488. PMID: 22954016.</li>
              <li>Hara K, Tanabe T, Aomatsu T, et al. Febrile seizures associated with influenza A. Brain Dev. 2007;29(1):30-38. PMID: 16859852.</li>
              <li>Brunklaus A, Ellis R, Reavey E, et al. Prognostic, clinical and demographic features in SCN1A mutation-positive Dravet syndrome. Brain. 2012;135(Pt 8):2329-2336. PMID: 22719002.</li>
              <li>Hattori J, Ouchida M, Ono J, et al. A screening test for the prediction of Dravet syndrome before one year of age. Epilepsia. 2008;49(4):626-633. PMID: 18248443.</li>
              <li>Hesdorffer DC, Shinnar S, Lax DN, et al. Risk factors for subsequent febrile seizures in the FEBSTAT study. Epilepsia. 2016;57(7):1042-1047. PMID: 27265870.</li>
              <li>Offringa M, Newton R, Nevitt SJ, Vraka K. Prophylactic drug management for febrile seizures in children. Cochrane Database Syst Rev. 2021;6(6):CD003031. PMID: 34131913.</li>
              <li>Sartori S, Nosadini M, Tessarin G, et al. First-ever convulsive seizures in children presenting to the emergency department: risk factors for seizure recurrence and diagnosis of epilepsy. Dev Med Child Neurol. 2019;61(1):82-90. PMID: 30191957.</li>
              <li>Whitney R, Samanta D, Sharma S, Jain P. Complex febrile seizures: usual and the unusual. Indian J Pediatr. 2025;92(1):44-51. PMID: 39514073.</li>
              <li>Jiang W, Cheng A, Wang J, et al. Early recurrence of febrile seizures during acute illness: risk factors and lack of association with long-term epilepsy in a Pediatric cohort. Front Neurol. 2026;16:1733941. PMID: 41567548.</li>
              <li>Fletcher EM, Sharieff G. Necessity of lumbar puncture in patients presenting with new onset complex febrile seizures. West J Emerg Med. 2013;14(3):206-211. PMID: 23687537.</li>
              <li>Guedj R, Chappuy H, Titomanlio L, et al. Do all children who present with a complex febrile seizure need a lumbar puncture? Ann Emerg Med. 2017;70(1):52-62.e6. PMID: 28259480.</li>
              <li>Ferretti A, Riva A, Fabrizio A, et al. Best practices for the management of febrile seizures in children. Ital J Pediatr. 2024;50(1):95. PMID: 38735928.</li>
            </ol>
          </section>

          <section className="text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-3">
            Decision-support tool only. Individual risk depends on factors
            beyond what any model captures.
          </section>
        </div>
      )}
    </div>
  );
}
