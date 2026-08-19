'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LoginModal from '@/components/resources/LoginModal';

export default function AuthBar({ authed }: { authed: boolean }) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  async function logout() {
    try {
      await fetch('/api/resources/logout', { method: 'POST' });
    } catch (err) {
      console.error('[family-points/logout] failed:', err);
    }
    router.refresh();
  }

  return (
    <div className="resources-auth-bar">
      {authed ? (
        <>
          <span className="text-xs text-emerald-700">Logged in</span>
          <button type="button" onClick={logout} className="text-xs text-slate-500 hover:underline ml-3">
            Log out
          </button>
        </>
      ) : (
        <button type="button" onClick={() => setShowModal(true)} className="text-xs text-indigo-700 hover:underline">
          🔒 Log in to enter points
        </button>
      )}
      {showModal && <LoginModal title="Log in to enter points" onClose={() => setShowModal(false)} />}
    </div>
  );
}
