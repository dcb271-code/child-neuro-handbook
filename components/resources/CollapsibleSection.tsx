'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type Props = {
  title: string;
  blurb: string;
  color: string;
  count: number;
  children: ReactNode;
};

export default function CollapsibleSection({ title, blurb, color, count, children }: Props) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, []);

  return (
    <details
      ref={ref}
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="mb-4"
    >
      <summary
        className="flex items-center gap-2 text-base sm:text-lg font-semibold px-3 py-2 rounded-md cursor-pointer select-none"
        style={{ backgroundColor: `${color}15`, color }}
      >
        <svg
          className="details-arrow w-4 h-4 flex-shrink-0 transition-transform"
          style={{ color }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span>{title}</span>
        <span className="text-xs font-normal text-slate-500 ml-1">({count})</span>
        <span className="text-xs font-normal text-slate-500 ml-2 hidden sm:inline">{blurb}</span>
      </summary>
      <div className="mt-3">{open ? children : null}</div>
    </details>
  );
}
