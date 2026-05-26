'use client';

import { useMemo, useState } from 'react';
import {
  calcLamberink,
  calcDai,
  type LamberinkInputs,
  type DaiInputs,
  type RiskValue,
} from '@/lib/asm-withdrawal/calculator';

// ---------- UI helpers ----------
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-3">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

function NumInput({ value, onChange, min, max, step = 1 }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
    />
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

function RiskPill({ value, label, color }: { value: RiskValue; label: string; color: string }) {
  return (
    <div className={`rounded-lg p-3 border ${color}`}>
      <div className="text-xs uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-2xl font-semibold mt-1">
        {value === null || value === undefined ? '—' : `${value}%`}
      </div>
    </div>
  );
}

type Tab = 'lamberink' | 'dai' | 'about';

export default function ASMWithdrawalCalculator() {
  const [tab, setTab] = useState<Tab>('lamberink');

  const [L, setL] = useState<LamberinkInputs>({
    duration: 2, ttr: 2, naed: 1, ageonset: 5,
    sex: 'male', famhist: 'no', histfeb: 'no', nseizures: '0-9',
    benign: 'no', delay: 'no', focal: 'no', eeg: 'normal',
  });

  const [D, setD] = useState<DaiInputs>({
    ageOnsetD: '<10', durationD: '<3', eegStart: 'normal', eegAfter: 'normal',
    febrile: 'no', intellectual: 'no', motor: 'no', nASM: '1', focalOnly: 'no',
  });

  const lamberinkResult = useMemo(() => calcLamberink(L), [L]);
  const daiResult = useMemo(() => calcDai(D), [D]);

  const setL_ = <K extends keyof LamberinkInputs>(k: K) => (v: LamberinkInputs[K]) =>
    setL((s) => ({ ...s, [k]: v }));
  const setD_ = <K extends keyof DaiInputs>(k: K) => (v: DaiInputs[K]) =>
    setD((s) => ({ ...s, [k]: v }));

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      tab === t
        ? 'border-violet-600 text-violet-700 dark:text-violet-400'
        : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
    }`;

  return (
    <div className="not-prose text-slate-900 dark:text-slate-100">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">ASM Withdrawal Risk Calculator</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Individualized estimates of seizure recurrence and sustained seizure freedom after weaning antiseizure medication.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-5 border-b border-slate-200 dark:border-slate-700">
        <button onClick={() => setTab('lamberink')} className={tabClass('lamberink')}>Lamberink 2017 (peds + adults)</button>
        <button onClick={() => setTab('dai')} className={tabClass('dai')}>Dai 2025 (peds only)</button>
        <button onClick={() => setTab('about')} className={tabClass('about')}>About / caveats</button>
      </div>

      {tab === 'lamberink' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wide">Clinical inputs</h4>

            <Field label="Epilepsy duration before remission (years)" hint="From first seizure to onset of sustained remission">
              <NumInput value={L.duration} onChange={setL_('duration')} min={0} max={40} />
            </Field>
            <Field label="Seizure-free interval before withdrawal (years)" hint="Years from last seizure to start of taper">
              <NumInput value={L.ttr} onChange={setL_('ttr')} min={0} max={24} />
            </Field>
            <Field label="Age at seizure onset (years)">
              <NumInput value={L.ageonset} onChange={setL_('ageonset')} min={0} max={80} />
            </Field>
            <Field label="Number of ASMs before withdrawal" hint="Long-term outcome only">
              <NumInput value={L.naed} onChange={setL_('naed')} min={0} max={9} />
            </Field>
            <Field label="Sex">
              <Select value={L.sex} onChange={setL_('sex')} options={[['male','Male'],['female','Female']]} />
            </Field>
            <Field label="History of febrile seizures">
              <Select value={L.histfeb} onChange={setL_('histfeb')} options={[['no','No'],['yes','Yes']]} />
            </Field>
            <Field label="Family history of epilepsy" hint="1st or 2nd degree relative">
              <Select value={L.famhist} onChange={setL_('famhist')} options={[['no','No'],['yes','Yes']]} />
            </Field>
            <Field label="≥10 seizures before remission">
              <Select value={L.nseizures} onChange={setL_('nseizures')} options={[['0-9','No (0–9)'],['10+','Yes (≥10)']]} />
            </Field>
            <Field label="Self-limiting epilepsy syndrome" hint="e.g., SeLECTS, CAE, Panayiotopoulos">
              <Select value={L.benign} onChange={setL_('benign')} options={[['no','No'],['yes','Yes']]} />
            </Field>
            <Field label="Developmental delay / IQ <70">
              <Select value={L.delay} onChange={setL_('delay')} options={[['no','No'],['yes','Yes']]} />
            </Field>
            <Field label="Focal seizures present">
              <Select value={L.focal} onChange={setL_('focal')} options={[['no','No'],['yes','Yes']]} />
            </Field>
            <Field label="EEG before withdrawal">
              <Select value={L.eeg} onChange={setL_('eeg')} options={[['normal','Normal'],['notdone','Not performed'],['epileptiform','Epileptiform abnormality']]} />
            </Field>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wide">Predicted outcomes</h4>
            {lamberinkResult ? (
              <>
                <div className="grid grid-cols-1 gap-3 mb-4">
                  <RiskPill label="2-year recurrence risk" value={lamberinkResult.risk2y}
                    color="bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200" />
                  <RiskPill label="5-year recurrence risk" value={lamberinkResult.risk5y}
                    color="bg-red-50 border-red-200 text-red-900 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200" />
                  <RiskPill label="10-year sustained seizure freedom" value={lamberinkResult.riskLong}
                    color="bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-200" />
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 rounded-md p-3 space-y-1">
                  <div>Recurrence score: <span className="font-mono">{lamberinkResult.scoreRec}</span></div>
                  <div>Long-term score: <span className="font-mono">{lamberinkResult.scoreLong}</span></div>
                </div>
                <div className="mt-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  <p className="mb-2">
                    <strong>Interpretation.</strong> Each year of additional seizure freedom reduces relapse risk; the conventional 2-year threshold is an artificial cutoff. Of patients who relapse, ~80% regain seizure control after restarting medication. Refractoriness after withdrawal has not been convincingly demonstrated to be caused by withdrawal itself.
                  </p>
                  <p>
                    Discrimination is moderate (c-stat 0.65 for recurrence, 0.71 for long-term). External validations have shown overprediction in some cohorts — see About tab.
                  </p>
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-500 dark:text-slate-400">Check input values.</div>
            )}
          </div>
        </div>
      )}

      {tab === 'dai' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wide">Clinical inputs</h4>
            <Field label="Age at first seizure">
              <Select value={D.ageOnsetD} onChange={setD_('ageOnsetD')} options={[['<10','<10 years (0 pts)'],['10+','≥10 years (2 pts)']]} />
            </Field>
            <Field label="Duration of epilepsy">
              <Select value={D.durationD} onChange={setD_('durationD')} options={[['<3','<3 years (0 pts)'],['3+','≥3 years (2 pts)']]} />
            </Field>
            <Field label="EEG at start of ASM tapering">
              <Select value={D.eegStart} onChange={setD_('eegStart')} options={[['normal','Normal (0 pts)'],['abnormal','Abnormal (2 pts)']]} />
            </Field>
            <Field label="EEG after ASM tapering" hint="Highest individual predictor (AUC ≈0.79)">
              <Select value={D.eegAfter} onChange={setD_('eegAfter')} options={[['normal','Normal (0 pts)'],['abnormal','Abnormal (3 pts)']]} />
            </Field>
            <Field label="History of febrile seizures">
              <Select value={D.febrile} onChange={setD_('febrile')} options={[['no','No (0 pts)'],['yes','Yes (2 pts)']]} />
            </Field>
            <Field label="Intellectual disability">
              <Select value={D.intellectual} onChange={setD_('intellectual')} options={[['no','No (0 pts)'],['yes','Yes (2 pts)']]} />
            </Field>
            <Field label="Abnormal neuro exam or motor deficit">
              <Select value={D.motor} onChange={setD_('motor')} options={[['no','No (0 pts)'],['yes','Yes (1 pt)']]} />
            </Field>
            <Field label="Total number of ASMs used historically">
              <Select value={D.nASM} onChange={setD_('nASM')} options={[['1','1 (0 pts)'],['2+','≥2 (2 pts)']]} />
            </Field>
            <Field label="Only focal-onset seizures">
              <Select value={D.focalOnly} onChange={setD_('focalOnly')} options={[['no','No / other (0 pts)'],['yes','Only focal (1 pt)']]} />
            </Field>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wide">Risk score</h4>
            <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-lg p-5 mb-4">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Total score</div>
              <div className="text-4xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
                {daiResult.score} <span className="text-lg text-slate-400 dark:text-slate-500">/ {daiResult.maxScore}</span>
              </div>
            </div>
            <div className={`rounded-lg p-4 border-2 ${
              daiResult.stratum === 'Low' ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-200' :
              daiResult.stratum === 'Moderate' ? 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-200' :
              'bg-red-50 border-red-300 text-red-900 dark:bg-red-900/20 dark:border-red-700 dark:text-red-200'
            }`}>
              <div className="text-xs uppercase tracking-wide opacity-75">Risk stratum</div>
              <div className="text-xl font-semibold mt-1">{daiResult.stratum} risk</div>
              <div className="text-sm mt-2">Relative risk vs low-risk group: {daiResult.rr}</div>
              <div className="text-sm mt-2 opacity-90">{daiResult.interp}</div>
            </div>
            <div className="mt-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <p className="mb-2"><strong>Strata.</strong> Low ≤3, Moderate 4–6, High ≥7. Cutoff 4 corresponds to a 31.7% recurrence probability (95% CI 25.7–37.7) in the validation cohort.</p>
              <p className="mb-2"><strong>Note.</strong> Seizure-free interval was not retained in this pediatric meta-analysis (lost significance in pooled analysis), although a minimum 2 years remains clinically advisable. EEG after tapering carries the most predictive weight.</p>
              <p>Derivation 4,080 children across 26 cohorts; validation in 341 Chinese children: AUC 0.85, sensitivity 0.74, specificity 0.82. External validation outside Asia not yet published.</p>
            </div>
          </div>
        </div>
      )}

      {tab === 'about' && (
        <div className="max-w-2xl text-sm text-slate-700 dark:text-slate-300 space-y-4 leading-relaxed">
          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">When to use which</h4>
            <p>Lamberink applies broadly (children and adults, medical cohorts; does <em>not</em> apply post-resective surgery — use the TimeToStop nomogram for that). Dai is pediatric-specific and adds post-taper EEG as a strong, dynamic input.</p>
          </section>
          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Discordance worth knowing</h4>
            <ul className="space-y-1.5 list-disc list-inside">
              <li><strong>Seizure-free interval:</strong> Lamberink retains it; Dai dropped it (NS on pediatric meta-analysis). Both groups still recommend ≥2 years clinically.</li>
              <li><strong>Age at onset:</strong> Lamberink finds U-shaped risk; Dai finds onset ≥10 years confers higher recurrence (likely reflecting fewer self-limited syndromes in older-onset pediatric epilepsy).</li>
              <li><strong>Number of historical seizures:</strong> Significant in Lamberink, dropped in Dai (cited unreliability of parental recall).</li>
              <li><strong>Sex / family history:</strong> Predict long-term outcome in Lamberink; not significant in Dai&apos;s pediatric pool.</li>
            </ul>
          </section>
          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Validation caveats</h4>
            <p className="mb-2">The Lamberink model has been externally validated multiple times with mixed results: it has overpredicted relapse risk in at least two external cohorts and showed poor calibration in a third (Lin et al. and others, summarized in Hakeem et al. medRxiv 2022). Adjusted c-statistic is 0.65 (recurrence), suggesting modest individual-level discrimination despite good population-level fit.</p>
            <p>The Dai 2025 model shows higher AUC (0.85) but has only been validated in a single Chinese cohort. Generalizability to other populations is unconfirmed.</p>
          </section>
          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Background numbers</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Pooled relapse rate after withdrawal: ~34% (Lamberink 2015 meta-analysis); 46% in the IPD cohort (higher, reflecting RCT-heavy mix).</li>
              <li>Of relapsers, ~80% regain seizure control on reinstated ASM at short-term follow-up; this proportion rises to ~88% with &gt;15 years follow-up.</li>
              <li>In the MRC trial, 2-year relapse was 41% (withdrawal) vs 22% (continued ASM).</li>
              <li>In peds (Dai cohort): 83% of relapses occur within 2 years of withdrawal.</li>
            </ul>
          </section>
          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">References</h4>
            <ol className="space-y-2 text-xs list-decimal list-inside">
              <li>Lamberink HJ, Otte WM, Geerts AT, et al. Individualised prediction model of seizure recurrence and long-term outcomes after withdrawal of antiepileptic drugs in seizure-free patients: a systematic review and individual participant data meta-analysis. Lancet Neurol. 2017;16(7):523-531. PMID: 28483337.</li>
              <li>Dai K, Tang D, Bao L, et al. Development and validation of a predictive model for seizure recurrence following discontinuation of antiseizure medication in children with epilepsy. eClinicalMedicine. 2025;82:103154. PMID: 40134561.</li>
              <li>Lamberink HJ, Boshuisen K, Otte WM, et al. Individualized prediction of seizure relapse and outcomes following antiepileptic drug withdrawal after pediatric epilepsy surgery. Epilepsia. 2018;59(3):e28-e33. PMID: 29446447.</li>
              <li>Gloss D, Pargeon K, Pack A, et al. Antiseizure medication withdrawal in seizure-free patients: practice advisory update summary. Neurology. 2021;97(23):1072-1081. PMID: 34873018.</li>
              <li>MRC AED Withdrawal Study Group. Randomised study of antiepileptic drug withdrawal in patients in remission. Lancet. 1991;337(8751):1175-1180. PMID: 1673736.</li>
              <li>Lossius MI, Hessen E, Mowinckel P, et al. Consequences of antiepileptic drug withdrawal: a randomized, double-blind study (Akershus study). Epilepsia. 2008;49(3):455-463. PMID: 17888074.</li>
            </ol>
          </section>
          <section className="text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-3">
            Lamberink point tables ported from the official UMC Utrecht implementation (github.com/wmotte/epilepsypredictiontools, Apache-2.0). This tool is decision-support and does not replace clinical judgment.
          </section>
        </div>
      )}
    </div>
  );
}
