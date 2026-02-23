import indexData from '@/src/data/index.json';

type SectionMeta = {
  name: string;
  slug: string;
  icon: string;
  color: string;
  tocCount: number;
  imageCount: number;
};

const sections = indexData as SectionMeta[];

// Strip Tailwind color classes → return a hex accent for the card's left border
const accentMap: Record<string, string> = {
  epilepsy:                          '#7c3aed',
  development:                       '#2563eb',
  headaches:                         '#ea580c',
  'infectious-disease':              '#dc2626',
  'movement-disorders':              '#16a34a',
  'neuro-exam':                      '#0d9488',
  'neurocritical-care':              '#e11d48',
  'neurogenetics-and-neurometabolics': '#4f46e5',
  'neuro-ophthalmology':             '#0891b2',
  neuroradiology:                    '#475569',
  'other-topics':                    '#6b7280',
  paroxysms:                         '#d97706',
  'pediatric-normal-values':         '#65a30d',
  psychiatry:                        '#db2777',
  sleep:                             '#7c3aed',
  stroke:                            '#b45309',
};

export default function Home() {
  const totalTopics = sections.reduce((s, x) => s + x.tocCount, 0);
  const totalImages = sections.reduce((s, x) => s + x.imageCount, 0);

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-1">
          Clinical Reference
        </h1>
        <p className="text-slate-500 text-sm">
          {sections.length} sections &middot; {totalTopics} topics &middot; {totalImages} figures
        </p>
      </div>

      {/* Section grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {sections.map((s) => {
          const accent = accentMap[s.slug] ?? '#475569';
          return (
            <a
              key={s.slug}
              href={`/${s.slug}/`}
              className="group bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-150 overflow-hidden flex min-h-[60px] active:bg-slate-50"
            >
              {/* Accent bar */}
              <div className="w-1.5 shrink-0 rounded-l-xl" style={{ backgroundColor: accent }} />

              {/* Card body */}
              <div className="flex-1 px-4 sm:px-5 py-3.5 sm:py-4 flex flex-col justify-center">
                <div className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors leading-snug mb-1">
                  {s.name}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>{s.tocCount} topics</span>
                  {s.imageCount > 0 && (
                    <>
                      <span className="text-slate-200">·</span>
                      <span>{s.imageCount} figures</span>
                    </>
                  )}
                </div>
              </div>

              {/* Right arrow */}
              <div className="flex items-center pr-4">
                <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
