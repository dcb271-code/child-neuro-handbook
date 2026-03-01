import { notFound } from 'next/navigation';
import fs from 'fs';
import path from 'path';
import indexData from '@/src/data/index.json';
import TableOfContents from '@/components/TableOfContents';
import MobileSubsectionNav from '@/components/MobileSubsectionNav';
import SectionContent from '@/components/SectionContent';
import ImageLightbox from '@/components/ImageLightbox';

type TocEntry = { level: number; text: string; id: string };

type SectionData = {
  name: string;
  slug: string;
  icon: string;
  color: string;
  toc: TocEntry[];
  html: string;
  imageCount: number;
  chunkCount: number;
};

type IndexEntry = { name: string; slug: string; icon: string; color: string };

const index = indexData as IndexEntry[];

export function generateStaticParams() {
  return index.map(s => ({ section: s.slug }));
}

function getSectionData(slug: string): SectionData | null {
  const p = path.join(process.cwd(), 'src', 'data', `${slug}.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as SectionData;
}

const accentMap: Record<string, string> = {
  epilepsy:                            '#7c3aed',
  development:                         '#2563eb',
  headaches:                           '#ea580c',
  'infectious-disease':                '#dc2626',
  'movement-disorders':                '#16a34a',
  'neuro-exam':                        '#0d9488',
  'neurocritical-care':                '#e11d48',
  'neurogenetics-and-neurometabolics': '#4f46e5',
  neuroimmunology:                     '#0284c7',
  'neuro-ophthalmology':               '#0891b2',
  neuroradiology:                      '#475569',
  'other-topics':                      '#6b7280',
  paroxysms:                           '#d97706',
  'pediatric-normal-values':           '#65a30d',
  psychiatry:                          '#db2777',
  sleep:                               '#7c3aed',
  stroke:                              '#b45309',
  'neuro-on-call':                     '#dc2626',
  neuromuscular:                       '#059669',
};

export default function SectionPage({ params }: { params: { section: string } }) {
  const data = getSectionData(params.section);
  if (!data) notFound();

  const idx  = index.findIndex(s => s.slug === params.section);
  const prev = idx > 0 ? index[idx - 1] : null;
  const next = idx < index.length - 1 ? index[idx + 1] : null;
  const accent = accentMap[params.section] ?? '#475569';

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="text-xs text-slate-400 dark:text-slate-500 mb-4 sm:mb-6 flex items-center gap-1.5 min-h-[44px] sm:min-h-0 py-2 sm:py-0">
        <a href="/" className="hover:text-blue-600 dark:hover:text-blue-400 text-slate-500 dark:text-slate-400 transition-colors py-2 pr-1">Home</a>
        <span>›</span>
        <span className="text-slate-700 dark:text-slate-200 font-medium truncate">{data.name}</span>
      </nav>

      {/* Section title card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-4 overflow-hidden flex">
        <div className="w-1 shrink-0" style={{ backgroundColor: accent }} />
        <div className="px-4 sm:px-6 py-4 sm:py-5">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">{data.name}</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            {data.toc.length} topics
            {data.imageCount > 0 ? ` · ${data.imageCount} figures` : ''}
          </p>
        </div>
      </div>

      {/* Mobile subsection pill nav — sticky below header, hidden on xl+ */}
      <MobileSubsectionNav toc={data.toc} accent={accent} />

      {/* Body: TOC sidebar + content */}
      <div className="flex gap-6 items-start">
        {/* Sticky TOC (desktop only) */}
        {data.toc.length > 0 && (
          <aside className="hidden xl:block w-52 shrink-0 sticky top-20 self-start bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm py-4 max-h-[calc(100vh-6rem)] overflow-y-auto">
            <TableOfContents toc={data.toc} />
          </aside>
        )}

        {/* Main article */}
        <article className="flex-1 min-w-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm px-4 sm:px-8 py-5 sm:py-7">
          <SectionContent html={data.html} />
          <ImageLightbox />

          {/* Prev / Next */}
          <div className="mt-8 sm:mt-10 pt-5 sm:pt-6 border-t border-slate-100 dark:border-slate-700 flex justify-between gap-4 flex-wrap">
            {prev ? (
              <a href={`/${prev.slug}/`}
                className="group flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 transition-colors min-h-[44px]">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <div>
                  <div className="text-xs text-slate-400 dark:text-slate-500">Previous</div>
                  <div className="font-medium group-hover:text-blue-700 dark:group-hover:text-blue-400">{prev.name}</div>
                </div>
              </a>
            ) : <div />}

            {next ? (
              <a href={`/${next.slug}/`}
                className="group flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 transition-colors text-right min-h-[44px]">
                <div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 text-right">Next</div>
                  <div className="font-medium group-hover:text-blue-700 dark:group-hover:text-blue-400">{next.name}</div>
                </div>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            ) : <div />}
          </div>
        </article>
      </div>
    </div>
  );
}
