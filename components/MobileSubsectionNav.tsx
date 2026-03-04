'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type TocEntry = { level: number; text: string; id: string };

interface Props {
  toc: TocEntry[];
  accent: string;
}

export default function MobileSubsectionNav({ toc, accent }: Props) {
  const [active, setActive] = useState('');
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  // Track which section is currently in view
  useEffect(() => {
    if (!toc.length) return;

    const targets = toc
      .map(t => document.getElementById(t.id))
      .filter((el): el is HTMLElement => el !== null);

    if (!targets.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => (a.target as HTMLElement).offsetTop - (b.target as HTMLElement).offsetTop);
        if (visible.length) setActive(visible[0].target.id);
      },
      { rootMargin: '-104px 0px -50% 0px', threshold: 0 }
    );

    targets.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [toc]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [open]);

  const handleSelect = useCallback((id: string) => {
    setActive(id);
    setOpen(false);
  }, []);

  if (toc.length < 2) return null;

  const activeEntry = toc.find(t => t.id === active);
  const activeLabel = activeEntry?.text ?? 'On this page';

  return (
    <div ref={navRef} className="lg:hidden sticky top-14 z-30 -mx-4 sm:-mx-6">
      {/* Toggle bar */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 sm:px-6 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm text-left min-h-[44px]"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: accent }}
          />
          <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
            {activeLabel}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown TOC */}
      {open && (
        <div className="absolute left-0 right-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-lg max-h-[60vh] overflow-y-auto">
          <nav aria-label="Table of contents" className="py-2">
            <ul className="space-y-0.5">
              {toc.map(item => {
                const isActive = active === item.id;
                return (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      onClick={() => handleSelect(item.id)}
                      className={[
                        'block py-2 px-4 sm:px-6 text-xs transition-colors',
                        isActive
                          ? 'font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-slate-800'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800',
                      ].join(' ')}
                      style={{ paddingLeft: `${(item.level - 1) * 12 + 16}px` }}
                    >
                      {item.level === 1 ? (
                        <span className="font-semibold">{item.text}</span>
                      ) : (
                        item.text
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
}
