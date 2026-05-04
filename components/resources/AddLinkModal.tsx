'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AddLinkModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function close() {
    setOpen(false);
    setUrl('');
    setLabel('');
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/resources/links', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url, label }),
      });
      if (res.ok) {
        close();
        router.refresh();
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? 'Failed to add link');
      }
    } catch {
      setError('Network error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-50"
      >
        + Add Link
      </button>
      {open && (
        <div className="resources-modal-backdrop" onClick={close}>
          <div className="resources-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-3">Add a link</h3>
            <form onSubmit={submit} className="space-y-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                required
              />
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Label"
                maxLength={200}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                required
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={close} className="text-sm px-3 py-1.5 text-slate-500">Cancel</button>
                <button type="submit" disabled={busy} className="text-sm px-3 py-1.5 rounded-md bg-indigo-600 text-white disabled:opacity-60">
                  {busy ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
