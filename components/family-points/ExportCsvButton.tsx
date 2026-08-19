'use client';

import { entriesToCsv, type Entry } from '@/lib/family-points/calculator';

export default function ExportCsvButton({ entries }: { entries: Entry[] }) {
  function download() {
    const csv = entriesToCsv(entries);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'family-points.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={entries.length === 0}
      className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:underline disabled:opacity-40"
    >
      ⬇ Export CSV ({entries.length} {entries.length === 1 ? 'entry' : 'entries'})
    </button>
  );
}
