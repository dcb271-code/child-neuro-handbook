'use client';

import { useEffect, useState } from 'react';

type TocEntry = { level: number; text: string; id: string };

export default function TableOfContents({ toc }: { toc: TocEntry[] }) {
  const [active, setActive] = useState('');

  useEffect(() => {
    const headings = toc
      .map(t => document.getElementById(t.id))
      .filter((el): el is HTMLElement => el !== null);

    if (!headings.length) return;

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => (a.target as HTMLElement).offsetTop - (b.target as HTMLElement).offsetTop);
        if (visible.length) setActive(visible[0].target.id);
      },
      { rootMargin: '0px 0px -65% 0px', threshold: 0 }
    );

    headings.forEach(h => observer.observe(h));
    return () => observer.disconnect();
  }, [toc]);

  if (!toc.length) return null;

  return (
    <nav aria-label="Table of contents">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2 px-3">
        On this page
      </p>
      <ul className="space-y-0.5">
        {toc.map(item => (
          <li key={item.id} style={{ paddingLeft: `${(item.level - 1) * 10}px` }}>
            <a
              href={`#${item.id}`}
              className={`toc-link ${active === item.id ? 'active' : ''}`}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
