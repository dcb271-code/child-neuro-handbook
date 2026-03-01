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
    <div>
      {/* Page header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-1">
          UofL Child Neuro Handbook
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
              className="group rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-200 overflow-hidden flex min-h-[60px] active:opacity-90"
              style={{ backgroundColor: accentTint(accent) }}
            >
              {/* 4 px accent pill — floated inset with rounded ends */}
              <div
                className="shrink-0 rounded-full my-3 mx-2"
                style={{ width: '4px', backgroundColor: accent }}
              />

              {/* Card body */}
              <div className="flex-1 px-3 sm:px-4 py-3.5 sm:py-4 flex flex-col justify-center">
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
