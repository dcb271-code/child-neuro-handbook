'use client';

import { useId, useMemo, useState } from 'react';
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

export default function SEMedLadder() {
  const [tab, setTab] = useState<Tab>('pathway');
  const [weightKg, setWeightKg] = useState(15);
  const [ageBand, setAgeBand] = useState<AgeBand>('1-5y');
  const [ivAccess, setIvAccess] = useState(true);
  const [isNeonate, setIsNeonate] = useState(false);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [given, setGiven] = useState<GivenLog>({});

  const inputs: PatientInputs = { weightKg, ageBand, ivAccess, isNeonate, flags };

  const phase1 = useMemo(() => recommendStabilization(),       []);
  const phase2 = useMemo(() => recommendFirstLine(inputs),     [inputs]);
  const phase3 = useMemo(() => recommendSecondLine(inputs),    [inputs]);
  const phase4 = useMemo(() => recommendRefractory(inputs),    [inputs]);
  const phase5 = useMemo(() => recommendSuperRefractory(inputs), [inputs]);
  const phase: Phase = currentPhase(given);

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
      {tab === 'pathway'    && <div data-testid="tab-pathway">Pathway walker — TODO Task 11–16</div>}
      {tab === 'dosing'     && <div data-testid="tab-dosing">Dosing card — TODO Task 17</div>}
      {tab === 'refractory' && <div data-testid="tab-refractory">Refractory &amp; weaning — TODO Task 18</div>}
      {tab === 'teaching'   && <div data-testid="tab-teaching">Teaching — TODO Task 19</div>}
      {tab === 'refs'       && <div data-testid="tab-refs">References — TODO Task 20</div>}

      {/* Silence unused-variable warnings — these are wired in subsequent tasks */}
      <div className="hidden">{phase}{phase1.length}{phase2.length}{phase3.length}{phase4.length}{phase5.length}{given.first_line ? '' : ''}{String(typeof setGiven)}</div>
    </div>
  );
}
