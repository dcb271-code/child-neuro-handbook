'use client';

import { useState, useEffect, useRef, useMemo } from 'react';

type TocEntry = { level: number; text: string; id: string };

interface Props {
  toc: TocEntry[];
  accent: string;
}

export default function MobileSubsectionNav({ toc, accent }: Props) {
  const [active, setActive] = useState('');
  const anchorRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Use level-1 entries as pills; fall back to level-2 when there are fewer than 2
  // (e.g. Neuroradiology has only 1 level-1 entry but 15 level-2 entries)
  const pills = useMemo(() => {
    const level1 = toc.filter(t => t.level === 1);
    return level1.length >= 2 ? level1 : toc.filter(t => t.level <= 2);
  }, [toc]);

  // Track which section is currently in view
  useEffect(() => {
    if (!pills.length) return;

    const targets = pills
      .map(p => document.getElementById(p.id))
      .filter((el): el is HTMLElement => el !== null);

    if (!targets.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => (a.target as HTMLElement).offsetTop - (b.target as HTMLElement).offsetTop);
        if (visible.length) setActive(visible[0].target.id);
      },
      // Top offset accounts for: sticky header (56px) + this pill bar (~44px) + buffer
      { rootMargin: '-104px 0px -50% 0px', threshold: 0 }
    );

    targets.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [pills]);

  // Scroll the active pill into the center of the pill bar
  useEffect(() => {
    if (!active) return;
    const el = anchorRefs.current.get(active);
    const container = scrollRef.current;
    if (!el || !container) return;
    const targetLeft = el.offsetLeft - container.clientWidth / 2 + el.offsetWidth / 2;
    container.scrollTo({ left: targetLeft, behavior: 'smooth' });
  }, [active]);

  // Don't render if there's nothing meaningful to navigate (0 or 1 entry)
  if (pills.length < 2) return null;

  return (
    <div className="xl:hidden sticky top-14 z-30 -mx-4 sm:-mx-6 bg-white border-b border-slate-200 shadow-sm">
      <div
        ref={scrollRef}
        className="pill-nav-scroll overflow-x-auto"
        style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2 px-4 sm:px-6 py-2">
          {pills.map(pill => {
            const isActive = active === pill.id;
            return (
              <a
                key={pill.id}
                href={`#${pill.id}`}
                ref={el => {
                  if (el) anchorRefs.current.set(pill.id, el);
                  else anchorRefs.current.delete(pill.id);
                }}
                style={isActive ? { backgroundColor: accent, color: 'white' } : undefined}
                className={[
                  'shrink-0 whitespace-nowrap rounded-full px-3.5 text-xs font-medium leading-none transition-colors',
                  // 44px tall touch target; text is vertically centered inside
                  'flex items-center h-[34px]',
                  isActive
                    ? 'shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 active:bg-slate-300',
                ].join(' ')}
                onClick={() => setActive(pill.id)}
              >
                {pill.text}
              </a>
            );
          })}
          {/* Trailing spacer so the last pill isn't flush against the scroll edge */}
          <div className="shrink-0 w-2" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
