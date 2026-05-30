'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import {
  recommendStabilization, recommendFirstLine, recommendSecondLine,
  recommendRefractory, recommendSuperRefractory, currentPhase,
  type PatientInputs, type AgeBand, type Flag, type Phase, type GivenLog,
} from '@/lib/se-ladder/calculator';

const ALL_FLAGS: { id: Flag; label: string; hint: string }[] = [
  { id: 'suspected_dravet',    label: 'Suspected Dravet',      hint: 'Sodium-channel blockers can paradoxically worsen seizures' },
  { id: 'polg_mito',           label: 'Known/suspected POLG or mitochondrial', hint: 'Valproate contraindicated' },
  { id: 'cardiac_conduction',  label: 'Cardiac conduction disease', hint: 'Fosphenytoin contraindicated' },
  { id: 'renal',               label: 'Renal impairment',      hint: 'Consider levetiracetam dose reduction' },
  { id: 'on_home_phenobarb',   label: 'On home phenobarbital', hint: "Don't repeat full load" },
  { id: 'on_home_levetiracetam', label: 'On home levetiracetam', hint: 'Still safe to give' },
];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <div className="mb-3" role="group" aria-labelledby={id}>
      <span id={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</span>
      {children}
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{hint}</p>}
    </div>
  );
}

type Tab = 'pathway' | 'dosing' | 'refractory' | 'teaching' | 'refs';

function PhaseCard({ title, time, current, complete, children }: { title: string; time: string; current: boolean; complete: boolean; children: React.ReactNode }) {
  const ring = current ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-900/30' : 'border-slate-200 dark:border-slate-700';
  return (
    <section className={`rounded-lg border-2 p-4 mb-3 bg-white dark:bg-slate-900 ${ring}`}>
      <header className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {complete && <span className="mr-2 text-emerald-600 dark:text-emerald-400">✓</span>}
          {title}
        </h4>
        <span className="text-xs text-slate-500 dark:text-slate-400">{time}</span>
      </header>
      {children}
    </section>
  );
}

function CautionChipView({ c }: { c: { severity: 'contraindicated' | 'caution' | 'note'; text: string } }) {
  const cls = c.severity === 'contraindicated' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200'
            : c.severity === 'caution'        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
            :                                   'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200';
  const icon = c.severity === 'contraindicated' ? '✗' : c.severity === 'caution' ? '⚠' : 'ⓘ';
  return <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded mr-1 mb-1 ${cls}`}>{icon} {c.text}</span>;
}

function DrugSubCard({ rec, given, onToggle }: {
  rec: import('@/lib/se-ladder/calculator').DrugRecommendation;
  given: boolean;
  onToggle: () => void;
}) {
  const contraindicated = rec.cautions.some(c => c.severity === 'contraindicated');
  return (
    <div className={`rounded border p-2.5 mb-2 ${contraindicated ? 'bg-rose-50/40 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800' : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm">
          <strong className="capitalize">{rec.drug}</strong> <span className="text-xs text-slate-500 dark:text-slate-400">· {rec.route}</span>
          {rec.mg > 0 && (
            <span className="ml-2 font-semibold text-blue-700 dark:text-blue-300">
              {rec.mg} mg{rec.hitCap && <span className="ml-1 text-xs text-amber-700 dark:text-amber-300">(at max cap)</span>}
            </span>
          )}
          {rec.mgPerKg && rec.mg > 0 && <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">({rec.mgPerKg} mg/kg)</span>}
          {rec.infusionTime && <div className="text-xs text-slate-600 dark:text-slate-400">{rec.infusionTime}</div>}
          {rec.rate && <div className="text-xs text-slate-600 dark:text-slate-400">Rate: {rec.rate}</div>}
          {rec.note && <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">{rec.note}</div>}
          <div className="mt-1">{rec.cautions.map((c, i) => <CautionChipView key={i} c={c} />)}</div>
        </div>
        <label className="text-xs flex items-center gap-1 shrink-0">
          <input type="checkbox" checked={given} onChange={onToggle} />
          Given
        </label>
      </div>
    </div>
  );
}

function StabilizationCard({ items, complete, onCheck, allChecked }: {
  items: { id: string; label: string; note?: string }[];
  complete: Record<string, boolean>;
  onCheck: (id: string, v: boolean) => void;
  allChecked: boolean;
}) {
  return (
    <ul className="space-y-1.5 text-sm">
      {items.map(it => (
        <li key={it.id} className="flex items-start gap-2">
          <input type="checkbox" checked={!!complete[it.id]} onChange={(e) => onCheck(it.id, e.target.checked)} className="mt-1" />
          <div>
            <span className={complete[it.id] ? 'line-through text-slate-400 dark:text-slate-500' : ''}>{it.label}</span>
            {it.note && <div className="text-xs text-slate-500 dark:text-slate-400">{it.note}</div>}
          </div>
        </li>
      ))}
      {allChecked && <li className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">All stabilization steps complete — advance to first-line benzo.</li>}
    </ul>
  );
}

export default function SEMedLadder() {
  const [tab, setTab] = useState<Tab>('pathway');
  const [weightKg, setWeightKg] = useState(15);
  const [ageBand, setAgeBand] = useState<AgeBand>('1-5y');
  const [ivAccess, setIvAccess] = useState(true);
  const [isNeonate, setIsNeonate] = useState(false);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [given, setGiven] = useState<GivenLog>({});

  const [stabilizationDone, setStabilizationDone] = useState<Record<string, boolean>>({});
  const [drugsGiven, setDrugsGiven] = useState<Record<string, boolean>>({});
  const toggleDrug = (key: string, phaseKey: Phase) => {
    setDrugsGiven(s => ({ ...s, [key]: !s[key] }));
    setGiven(g => ({ ...g, [phaseKey]: true }));   // marking ANY drug in a phase advances
  };
  const drugKey = (phaseKey: string, drug: string, route: string) => `${phaseKey}/${drug}/${route}`;

  const inputs: PatientInputs = { weightKg, ageBand, ivAccess, isNeonate, flags };

  const phase1 = useMemo(() => recommendStabilization(),       []);
  const phase2 = useMemo(() => recommendFirstLine(inputs),     [inputs]);
  const phase3 = useMemo(() => recommendSecondLine(inputs),    [inputs]);
  const phase4 = useMemo(() => recommendRefractory(inputs),    [inputs]);
  const phase5 = useMemo(() => recommendSuperRefractory(inputs), [inputs]);
  const phase: Phase = currentPhase(given);
  const allStabChecked = phase1.every(i => stabilizationDone[i.id]);

  // Auto-mark stabilization phase complete when all 5 checklist items done.
  // useEffect (not useMemo) — this is a side effect, not a derivation.
  useEffect(() => {
    if (allStabChecked && !given.stabilization) setGiven(g => ({ ...g, stabilization: true }));
  }, [allStabChecked, given.stabilization]);

  const toggleFlag = (f: Flag) =>
    setFlags(s => s.includes(f) ? s.filter(x => x !== f) : [...s, f]);

  return (
    <div className="not-prose text-slate-900 dark:text-slate-100">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Status Epilepticus Med Ladder</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Pediatric Convulsive SE (≥28 d). Operationalizes the institutional pathway with weight-based dosing and flag-driven cautions. For super-refractory SE, see the Refractory &amp; weaning tab.
        </p>
      </div>

      {/* Global inputs */}
      <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-md p-3 mb-4 grid sm:grid-cols-2 gap-3">
        <Field label="Weight (kg)">
          <input type="number" value={weightKg} onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0)}
            className="w-24 px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900" />
        </Field>
        <Field label="Age band">
          <select value={ageBand} onChange={(e) => setAgeBand(e.target.value as AgeBand)}
            className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900">
            <option value="28d-1y">28 days – 1 year</option>
            <option value="1-5y">1 – 5 years</option>
            <option value="6-11y">6 – 11 years</option>
            <option value="ge_12y">≥12 years</option>
          </select>
        </Field>
        <Field label="IV access">
          <div className="flex gap-2">
            {[[true,'Yes'],[false,'No']].map(([v,l]) => (
              <button key={String(v)} type="button" onClick={() => setIvAccess(v as boolean)}
                className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${ivAccess === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600'}`}>{l as string}</button>
            ))}
          </div>
        </Field>
        <Field label="Neonate (<28 d)?" hint="Redirects to the neonatal seizure pathway PDF.">
          <input type="checkbox" checked={isNeonate} onChange={(e) => setIsNeonate(e.target.checked)} className="mr-2" />
          <span className="text-sm">Yes</span>
        </Field>
        <div className="sm:col-span-2">
          <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Clinical flags</span>
          <div className="flex flex-wrap gap-2">
            {ALL_FLAGS.map(f => (
              <button key={f.id} type="button" onClick={() => toggleFlag(f.id)} title={f.hint}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${flags.includes(f.id) ? 'bg-amber-500 text-white border-amber-500' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600'}`}>{f.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-5 border-b border-slate-200 dark:border-slate-700 flex-wrap">
        {([
          ['pathway',    'Pathway walker'],
          ['dosing',     'Dosing card'],
          ['refractory', 'Refractory & weaning'],
          ['teaching',   'Teaching'],
          ['refs',       'References'],
        ] as [Tab, string][]).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors ${tab === id ? 'border-blue-600 text-blue-700 dark:text-blue-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab bodies (stubs — filled in subsequent tasks) */}
      {tab === 'pathway' && (
        isNeonate ? (
          <div className="rounded-lg border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4">
            <div className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-1">Neonate (&lt;28 d) — use the Neonatal Seizure Pathway</div>
            <p className="text-xs text-amber-900 dark:text-amber-200">First-line drug, dose, and escalation differ for neonates (phenobarbital is typically 1st-line, etc.).</p>
            <a href="/pdfs/pathways/neonatal-seizure-pathway.pdf" target="_blank" rel="noopener"
               className="inline-block mt-2 text-xs px-2.5 py-1 rounded border border-amber-400 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40">
              Open Neonatal Seizure Pathway PDF →
            </a>
          </div>
        ) : (
          <div data-testid="tab-pathway">
            <PhaseCard title="Phase 1 — Stabilization" time="0–5 min" current={phase === 'stabilization'} complete={!!given.stabilization}>
              <StabilizationCard items={phase1} complete={stabilizationDone}
                onCheck={(id, v) => setStabilizationDone(s => ({ ...s, [id]: v }))} allChecked={allStabChecked} />
            </PhaseCard>

            <PhaseCard title={`Phase 2 — First-line benzo (${ivAccess ? 'IV access' : 'no IV access'})`} time="5–20 min" current={phase === 'first_line'} complete={!!given.first_line}>
              {phase2.map(d => { const k = drugKey('first_line', d.drug, d.route); return <DrugSubCard key={k} rec={d} given={!!drugsGiven[k]} onToggle={() => toggleDrug(k, 'first_line')} />; })}
            </PhaseCard>

            <PhaseCard title="Phase 3 — Second-line ASM" time="20–40 min" current={phase === 'second_line'} complete={!!given.second_line}>
              {phase3.map(d => { const k = drugKey('second_line', d.drug, d.route); return <DrugSubCard key={k} rec={d} given={!!drugsGiven[k]} onToggle={() => toggleDrug(k, 'second_line')} />; })}
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">If still seizing 10–20 min post-load → Phase 4 (refractory).</p>
            </PhaseCard>

            <PhaseCard title="Phase 4 — Refractory SE" time="40–60+ min" current={phase === 'refractory'} complete={!!given.refractory}>
              {phase4.map(d => { const k = drugKey('refractory', d.drug, d.route); return <DrugSubCard key={k} rec={d} given={!!drugsGiven[k]} onToggle={() => toggleDrug(k, 'refractory')} />; })}
              <button type="button" onClick={() => setTab('refractory')}
                className="mt-2 text-xs px-2.5 py-1 rounded border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30">
                See Refractory &amp; weaning tab for full escalation, EEG goals, weaning
              </button>
            </PhaseCard>

            <PhaseCard title="Phase 5 — Super-refractory SE" time=">24 h despite anesthetic" current={phase === 'super_refractory'} complete={!!given.super_refractory}>
              {phase5.map(d => { const k = drugKey('super_refractory', d.drug, d.route); return <DrugSubCard key={k} rec={d} given={!!drugsGiven[k]} onToggle={() => toggleDrug(k, 'super_refractory')} />; })}
            </PhaseCard>

            <div className="rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-3 mt-3 text-xs">
              <strong>Summary:</strong> Patient {weightKg} kg, {ageBand}, {ivAccess ? 'IV access' : 'no IV access'}.{' '}
              {Object.keys(drugsGiven).filter(k => drugsGiven[k]).length === 0
                ? 'Nothing administered yet.'
                : `Given: ${Object.keys(drugsGiven).filter(k => drugsGiven[k]).map(k => k.split('/').slice(1).join(' ')).join('; ')}.`}
              <button type="button" onClick={() => { setDrugsGiven({}); setGiven({}); setStabilizationDone({}); }}
                className="ml-3 px-2 py-0.5 text-[11px] rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">Reset</button>
            </div>
          </div>
        )
      )}
      {tab === 'dosing' && (
        <div className="space-y-4 text-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400">Pre-calculated for {weightKg} kg, {ageBand}, {ivAccess ? 'IV access' : 'no IV access'}. Adjust globals above to recompute.</p>
          {([
            ['Phase 2 — First-line benzo', phase2],
            ['Phase 3 — Second-line ASM',   phase3],
            ['Phase 4 — Refractory',        phase4],
            ['Phase 5 — Super-refractory',  phase5],
          ] as const).map(([label, recs]) => (
            <div key={label}>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">{label}</h4>
              <table className="w-full text-xs border border-slate-200 dark:border-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-900/40">
                  <tr><th className="text-left p-1.5">Drug · route</th><th className="text-left p-1.5">Dose</th><th className="text-left p-1.5">Notes</th></tr>
                </thead>
                <tbody>
                  {recs.map((r, i) => (
                    <tr key={i} className="border-t border-slate-200 dark:border-slate-700">
                      <td className="p-1.5"><span className="capitalize">{r.drug}</span> · {r.route}</td>
                      <td className="p-1.5">{r.mg > 0 ? `${r.mg} mg${r.hitCap ? ' (cap)' : ''}` : '—'}{r.infusionTime && <span className="text-slate-500"> · {r.infusionTime}</span>}{r.rate && <span className="text-slate-500"> · rate: {r.rate}</span>}</td>
                      <td className="p-1.5 text-slate-600 dark:text-slate-400">{r.note} {r.cautions.filter(c => c.severity !== 'note').map((c, j) => <CautionChipView key={j} c={c} />)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          <button type="button" onClick={() => {
            const lines: string[] = [`SE Med Ladder — ${weightKg} kg, ${ageBand}, ${ivAccess ? 'IV+' : 'No IV'}`];
            const blocks: [string, typeof phase2][] = [['1st-line', phase2], ['2nd-line', phase3], ['Refractory', phase4], ['SRSE', phase5]];
            for (const [lbl, recs] of blocks) {
              lines.push(`\n[${lbl}]`);
              for (const r of recs) lines.push(`  ${r.drug} ${r.route}: ${r.mg > 0 ? r.mg + ' mg' : '—'}${r.infusionTime ? ' ' + r.infusionTime : ''}${r.rate ? ' (' + r.rate + ')' : ''}`);
            }
            const text = lines.join('\n');
            if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text);
          }}
            className="text-xs px-2.5 py-1 rounded border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30">
            Copy summary to clipboard
          </button>
        </div>
      )}
      {tab === 'refractory' && (
        <div className="space-y-5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 text-base">Phase 4 — Refractory SE management</h4>
            <p><strong>Midazolam infusion (primary 3rd-line).</strong> Bolus 0.1–0.15 mg/kg over 2 min; start 0.1 mg/kg/hr; rebolus 0.1–0.15 mg/kg and ↑ by 0.1 mg/kg/hr every 15–30 min as needed. Usual switch threshold ≥0.6–1 mg/kg/hr; absolute max 2 mg/kg/hr. Intubate; start continuous EEG.</p>
            <p className="mt-2"><strong>Ketamine infusion (alternative or early adjunct).</strong> Bolus 2 mg/kg over 5 min; start 0.5–1 mg/kg/hr; rebolus 1.5 mg/kg; ↑ by 0.5 mg/kg/hr q30–120 min to a max of 6 mg/kg/hr. Decrease 10–20% if oversuppressed on EEG. Evidence summary populated in Task 21 (WebSearch).</p>
            <p className="mt-2"><strong>EEG goal:</strong> electrographic seizure cessation or agreed burst-suppression pattern (typically 1 burst/10 s). Maintain ≈24 h of electrographic control before weaning. Reassess at least q2h; oversuppression (&lt;1 burst/page) → decrease infusion 10–20%.</p>
          </section>

          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 text-base">Phase 5 — Super-refractory SE management</h4>
            <p><strong>Pentobarbital infusion.</strong> Bolus 2–5 mg/kg over 15 min; start 0.5 mg/kg/hr; rebolus 1–2 mg/kg; ↑ by 0.5 mg/kg/hr to max 5 mg/kg/hr. Goal: burst-suppression on EEG. Reserved for SRSE — used a few times per year. Burden: hemodynamic, immunosuppression, GI dysmotility.</p>
            <p className="mt-2"><strong>FIRES / NORSE adjuncts.</strong> Anakinra (IL-1Ra) per rheum/ICU/Neuro protocol; ketogenic diet initiation; pulse methylprednisolone ± IVIG ± plasma exchange; consider tocilizumab in select FIRES.</p>
            <p className="mt-2"><strong>Anesthetic rotation.</strong> When one anesthetic fails after 24–48 h at therapeutic doses, consider rotating among midazolam / ketamine / propofol / pentobarbital / inhaled isoflurane.</p>
          </section>

          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 text-base">Weaning</h4>
            <p>Typical starting approach after <strong>24–48 h seizure-free</strong> on EEG.</p>
            <ul className="list-disc list-inside ml-2 mt-1 space-y-0.5">
              <li><strong>Midazolam:</strong> decrease by 0.1 mg/kg/hr every 1–3 h.</li>
              <li><strong>Ketamine:</strong> decrease by 1 mg/kg/hr every 1–3 h.</li>
              <li><strong>Pentobarbital:</strong> decrease by 1 mg/kg/hr every 1–3 h.</li>
            </ul>
            <p className="mt-2">If seizures recur during wean, resume the prior tolerated rate and consider adjunctive ASM optimization before re-attempting.</p>
          </section>

          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 text-base">Monitoring</h4>
            <ul className="list-disc list-inside ml-2 space-y-0.5">
              <li><strong>Airway:</strong> intubate if GCS 3–8, poor airway protection, or deep anesthetic dosing needed. Target normocapnia (PaCO₂ 40–45 mmHg).</li>
              <li><strong>Hemodynamics:</strong> maintain age-appropriate normal BP; avoid hypotension. Ensure adequate intravascular volume.</li>
              <li><strong>Labs:</strong> per institutional checklist — CBC, CMP, blood gas + lactate, INR/PTT, Mg/Phos, glucose q4h × 4 then q8h.</li>
            </ul>
          </section>
        </div>
      )}
      {tab === 'teaching' && (
        <div data-testid="tab-teaching" className="max-w-2xl text-sm text-slate-700 dark:text-slate-300 space-y-5 leading-relaxed">
          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-base">ILAE 2015 — t1 / t2 framework</h4>
            <p>Trinka et al. (Epilepsia 2015) operationalized status epilepticus in time: <strong>t1</strong> = when you start treating as SE; <strong>t2</strong> = when long-term consequences (brain injury, pharmacoresistance) become a concern. For convulsive SE, t1 = 5 min and t2 = 30 min. Early treatment matters because pharmacoresistance progresses with each unsuccessful intervention.</p>
          </section>

          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-base">ESETT — three 2nd-line drugs ≈ equivalent</h4>
            <p>Kapur et al. (NEJM 2019) showed fosphenytoin, levetiracetam, and valproate produce seizure cessation in roughly half of patients each. Practical implication: pick by patient features (cautions, contraindications, availability), not by relative efficacy.</p>
          </section>

          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-base">Why levetiracetam often goes first now</h4>
            <p>Cleaner side-effect profile, no cardiac monitoring needed, broad indication (no contraindication in Dravet), ease of administration. Many institutions now default to levetiracetam as 2nd-line first choice. Fosphenytoin remains primary when levetiracetam is contraindicated/unavailable or when sodium-channel mechanism is desired.</p>
          </section>

          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-base">Ketamine&apos;s role in refractory SE</h4>
            <p>NMDA receptor blockade mechanistically complements GABAergic agents (lorazepam/midazolam) — synergy is established preclinically (Niquet 2017, Ann Neurol). Clinical signal favors <strong>earlier rather than later</strong> initiation (Jacobwitz 2022). Consider adding ketamine to or substituting for midazolam in Phase 4 rather than waiting until Phase 5.</p>
          </section>

          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-base">Pentobarbital reserved for SRSE</h4>
            <p>Hemodynamic, immunosuppression, and GI-dysmotility burden plus prolonged ICU stay make pentobarbital a Phase 5 drug — used a few times per year at most. Burst-suppression on EEG is the standard target.</p>
          </section>

          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-base">Non-convulsive and focal SE</h4>
            <p>This tool is calibrated for <em>convulsive</em> SE. Non-convulsive SE requires EEG to detect and a less time-critical pharmacologic escalation. Focal SE with impaired awareness has a different time framework (ILAE t1 = 10 min, t2 &gt; 60 min). Consult neurology / cEEG early.</p>
          </section>

          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-base">FIRES / NORSE</h4>
            <p>Febrile Infection-Related Epilepsy Syndrome (FIRES) and New-Onset Refractory SE (NORSE): suspect in a previously healthy patient with refractory SE preceded by a febrile prodrome (FIRES) or no clear cause (NORSE). Immunotherapy should start early — anakinra + pulse steroids ± IVIG. Ketogenic diet initiation. Hirsch et al. 2018 consensus paper is the standard reference.</p>
          </section>

          <section>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-base">Common pitfalls</h4>
            <ul className="list-disc list-inside ml-2 space-y-0.5">
              <li>Under-dosing benzos (the most common error).</li>
              <li>Not repeating the benzo when the first dose was inadequate.</li>
              <li>Delay from benzo failure to 2nd-line load (target ≤10 min).</li>
              <li>Late ICU consultation / cEEG initiation.</li>
              <li>Persisting on one anesthetic strategy too long when it isn&apos;t working at 24 h.</li>
            </ul>
          </section>
        </div>
      )}
      {tab === 'refs'       && <div data-testid="tab-refs">References — TODO Task 20</div>}
    </div>
  );
}
