'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/resources/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        onClose();
        router.refresh();
      } else if (res.status === 401) {
        setError('Incorrect password');
      } else {
        setError('Something went wrong');
      }
    } catch {
      setError('Network error — check your connection');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="resources-modal-backdrop" onClick={onClose}>
      <div className="resources-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold mb-3">Log in to upload</h3>
        <form onSubmit={submit}>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Shared password"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm mb-2"
          />
          {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="text-sm px-3 py-1.5 text-slate-500">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="text-sm px-3 py-1.5 rounded-md bg-indigo-600 text-white disabled:opacity-60">
              {busy ? 'Checking…' : 'Log in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
