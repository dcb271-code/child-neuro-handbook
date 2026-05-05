'use client';

import { useEffect, useMemo, useState } from 'react';

const ARTICLES = new Set(['a', 'an', 'the']);

export function applyNamingConvention(title: string, authors: string, year: string): string {
  const words = title
    .trim()
    .split(/\s+/)
    .filter((w) => w && !ARTICLES.has(w.toLowerCase()))
    .slice(0, 10);
  const base = words.join(' ');
  const metaParts = [authors.trim(), year.trim()].filter(Boolean);
  return metaParts.length ? `${base} (${metaParts.join(' ')})` : base;
}

type Props = {
  open: boolean;
  initialTitle: string;
  heading?: string;
  submitLabel?: string;
  showHelp?: boolean;
  onClose: () => void;
  onSubmit: (newTitle: string) => Promise<void> | void;
};

export default function RenameModal({
  open,
  initialTitle,
  heading = 'Rename file',
  submitLabel = 'Save',
  showHelp = true,
  onClose,
  onSubmit,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [authors, setAuthors] = useState('');
  const [year, setYear] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const m = initialTitle.match(/^(.*?)\s*\(([^()]+)\s+(\d{4})\)\s*$/);
    if (m) {
      setTitle(m[1]);
      setAuthors(m[2]);
      setYear(m[3]);
    } else {
      setTitle(initialTitle);
      setAuthors('');
      setYear('');
    }
  }, [open, initialTitle]);

  const preview = useMemo(() => applyNamingConvention(title, authors, year), [title, authors, year]);

  if (!open) return null;

  async function submit() {
    const formatted = applyNamingConvention(title, authors, year);
    if (!formatted) return;
    setBusy(true);
    try {
      await onSubmit(formatted);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-lg bg-white dark:bg-slate-800 p-5 shadow-xl"
      >
        <h2 className={`text-base font-semibold text-slate-900 dark:text-white ${showHelp ? 'mb-1' : 'mb-4'}`}>
          {heading}
        </h2>
        {showHelp && (
          <p className="text-xs text-slate-500 mb-4">
            First 10 words of the title (articles dropped), then optionally <code>(Author Year)</code>.
          </p>
        )}

        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white mb-3"
          autoFocus
        />

        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Author(s)</label>
            <input
              type="text"
              value={authors}
              onChange={(e) => setAuthors(e.target.value)}
              placeholder="Smith"
              className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Year</label>
            <input
              type="text"
              inputMode="numeric"
              value={year}
              onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="2024"
              className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 mb-4">
          <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-0.5">Preview</div>
          <div className="text-sm text-slate-800 dark:text-slate-100 break-words">
            {preview || <span className="text-slate-400 italic">(empty)</span>}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-3 py-1.5 text-sm rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || !preview}
            className="px-3 py-1.5 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? 'Saving…' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
