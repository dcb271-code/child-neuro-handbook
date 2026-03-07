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

      {/* Helpful Links — collapsible */}
      <details className="mt-10 sm:mt-12 group/details">
        <summary className="flex items-center gap-2.5 cursor-pointer select-none py-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          <svg className="w-3 h-3 transition-transform details-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-xs font-semibold uppercase tracking-widest">Helpful Links</span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700 ml-2" />
        </summary>
        <div className="pt-3 pb-1 flex flex-wrap gap-x-5 gap-y-1.5">
          {[
            { name: 'Neurogenetics Portal', href: 'https://neurogenetics-portal.vercel.app/' },
            { name: 'Neuromuscular Database', href: 'https://neuromuscular-db.vercel.app/' },
            { name: 'Neurogenetics Curriculum', href: 'https://neurogenetics-curriculum.vercel.app/' },
            { name: 'GeneReviews', href: 'https://www.ncbi.nlm.nih.gov/books/NBK1116/' },
            { name: 'OMIM', href: 'https://omim.org/' },
            { name: 'Child Neurology Society', href: 'https://www.childneurologysociety.org/' },
            { name: 'ILAE', href: 'https://www.ilae.org/' },
            { name: 'Neuromuscular Disease Center', href: 'https://neuromuscular.wustl.edu/' },
            { name: 'Epilepsy Foundation', href: 'https://www.epilepsy.com/' },
            { name: 'NORD', href: 'https://rarediseases.org/' },
            { name: 'Radiopaedia', href: 'https://radiopaedia.org/' },
            { name: 'EEG Atlas (Niedermeyer)', href: 'https://www.learningeeg.com/' },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors py-1"
            >
              {link.name}
              <svg className="w-3 h-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          ))}
        </div>
      </details>
    </div>
    </DailyChallenge>
  );
}
