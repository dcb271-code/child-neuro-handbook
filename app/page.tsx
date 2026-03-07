import indexData from '@/src/data/index.json';
import DailyChallenge from '@/components/DailyChallenge';

type SectionMeta = {
  name: string;
  slug: string;
  icon: string;
  color: string;
  tocCount: number;
  imageCount: number;
};

const sections = indexData as SectionMeta[];

const accentMap: Record<string, string> = {
  epilepsy:                          '#7c3aed',
  development:                       '#2563eb',
  headaches:                         '#ea580c',
  'infectious-disease':              '#dc2626',
  'movement-disorders':              '#16a34a',
  'neuro-exam':                      '#0d9488',
  'neurocritical-care':              '#e11d48',
  'neurogenetics-and-neurometabolics': '#4f46e5',
  neuroimmunology:                   '#0284c7',
  'neuro-ophthalmology':             '#0891b2',
  neuroradiology:                    '#475569',
  'other-topics':                    '#6b7280',
  paroxysms:                         '#d97706',
  'pediatric-normal-values':         '#65a30d',
  psychiatry:                        '#db2777',
  sleep:                             '#7c3aed',
  stroke:                            '#b45309',
  pathways:                          '#a21caf',
  'neuro-on-call':                   '#dc2626',
  neuromuscular:                     '#059669',
};

/** Convert a hex accent colour → a very-low-opacity background tint (≈5%). */
function accentTint(hex: string): string {
  // Append 0D (≈5% opacity) as an 8-digit hex colour
  return `${hex}0D`;
}

export default function Home() {
  const totalTopics = sections.reduce((s, x) => s + x.tocCount, 0);
  const totalImages = sections.reduce((s, x) => s + x.imageCount, 0);

  return (
    <DailyChallenge>
    <div>
      {/* Page header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">
          UofL Child Neuro Handbook
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          {sections.length} sections &middot; {totalTopics} topics &middot; {totalImages} figures
        </p>
      </div>

      {/* Section grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* On-Call quick access — first card, spans full width on mobile */}
        <a
          href="/neuro-on-call/"
          className="group sm:col-span-2 lg:col-span-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/80 hover:shadow-md transition-all duration-200 overflow-hidden flex min-h-[56px]"
        >
          <div className="w-1 shrink-0 bg-red-500 dark:bg-red-600" />
          <div className="flex-1 flex items-center gap-4 px-4 sm:px-5 py-3">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors text-sm sm:text-base">
                Neuro On-Call
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Seizure meds &middot; febrile seizures &middot; LVO escalation
              </div>
            </div>
            <svg className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-red-400 transition-colors shrink-0"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </a>

        {/* NCH Pathways — featured card */}
        <a
          href="/pathways/"
          className="group sm:col-span-2 lg:col-span-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/80 hover:shadow-md transition-all duration-200 overflow-hidden flex min-h-[56px]"
        >
          <div className="w-1 shrink-0" style={{ backgroundColor: '#a21caf' }} />
          <div className="flex-1 flex items-center gap-4 px-4 sm:px-5 py-3">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-fuchsia-700 dark:group-hover:text-fuchsia-400 transition-colors text-sm sm:text-base">
                NCH Pathways
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Status epilepticus &middot; stroke &middot; HIE &middot; status migrainosus
              </div>
            </div>
            <svg className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-fuchsia-400 transition-colors shrink-0"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </a>

        {sections.filter(s => s.slug !== 'neuro-on-call' && s.slug !== 'pathways').map((s) => {
          const accent = accentMap[s.slug] ?? '#475569';
          return (
            <a
              key={s.slug}
              href={`/${s.slug}/`}
              className="group home-card rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-lg transition-all duration-200 overflow-hidden flex min-h-[60px] active:opacity-90"
              style={{ '--accent-tint': accentTint(accent) } as React.CSSProperties}
            >
              {/* 4 px accent pill — floated inset with rounded ends */}
              <div
                className="shrink-0 rounded-full my-3 mx-2"
                style={{ width: '4px', backgroundColor: accent }}
              />

              {/* Card body */}
              <div className="flex-1 px-3 sm:px-4 py-3.5 sm:py-4 flex flex-col justify-center">
                <div className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors leading-snug mb-1">
                  {s.name}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                  <span>{s.tocCount} topics</span>
                  {s.imageCount > 0 && (
                    <>
                      <span className="text-slate-200 dark:text-slate-600">·</span>
                      <span>{s.imageCount} figures</span>
                    </>
                  )}
                </div>
              </div>

              {/* Right arrow */}
              <div className="flex items-center pr-4">
                <svg className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-400 transition-colors"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </a>
          );
        })}
      </div>

      {/* Helpful Links */}
      <div className="mt-10 sm:mt-12">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
          Helpful Links
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { name: 'Neurogenetics Portal', desc: 'Gene-phenotype search for neurogenetic conditions', href: 'https://neurogenetics-portal.vercel.app/', color: '#4f46e5' },
            { name: 'Neuromuscular Database', desc: 'Searchable neuromuscular disease reference', href: 'https://neuromuscular-db.vercel.app/', color: '#059669' },
            { name: 'Neurogenetics Curriculum', desc: 'Structured neurogenetics learning modules', href: 'https://neurogenetics-curriculum.vercel.app/', color: '#7c3aed' },
            { name: 'GeneReviews', desc: 'Expert-authored genetic condition summaries', href: 'https://www.ncbi.nlm.nih.gov/books/NBK1116/', color: '#0284c7' },
            { name: 'OMIM', desc: 'Comprehensive catalog of human genes and genetic disorders', href: 'https://omim.org/', color: '#b45309' },
            { name: 'Child Neurology Society', desc: 'Practice resources, guidelines, and education', href: 'https://www.childneurologysociety.org/', color: '#0d9488' },
            { name: 'ILAE', desc: 'Epilepsy classification, definitions, and treatment guidelines', href: 'https://www.ilae.org/', color: '#dc2626' },
            { name: 'Neuromuscular Disease Center', desc: 'Washington University comprehensive NM reference', href: 'https://neuromuscular.wustl.edu/', color: '#ea580c' },
            { name: 'Epilepsy Foundation', desc: 'Patient and family resources, toolkits, and education', href: 'https://www.epilepsy.com/', color: '#16a34a' },
            { name: 'NORD', desc: 'Rare disease database with clinical summaries', href: 'https://rarediseases.org/', color: '#db2777' },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/80 hover:shadow-md transition-all duration-200 overflow-hidden flex min-h-[56px]"
            >
              <div
                className="w-1 shrink-0 rounded-full my-3 mx-2"
                style={{ backgroundColor: link.color }}
              />
              <div className="flex-1 px-3 sm:px-4 py-3 flex flex-col justify-center">
                <div className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors text-sm leading-snug">
                  {link.name}
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {link.desc}
                </div>
              </div>
              <div className="flex items-center pr-3">
                <svg className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
    </DailyChallenge>
  );
}
