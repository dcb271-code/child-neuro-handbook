'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteHandlers() {
  const router = useRouter();

  useEffect(() => {
    async function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const fileBtn = target.closest('[data-resources-delete-file]') as HTMLElement | null;
      const linkBtn = target.closest('[data-resources-delete-link]') as HTMLElement | null;

      if (fileBtn) {
        const pathname = fileBtn.dataset.pathname;
        if (!pathname) return;
        if (!window.confirm(`Delete this file?\n\n${pathname}`)) return;
        try {
          const res = await fetch('/api/resources/file', {
            method: 'DELETE',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ pathname }),
          });
          if (res.ok) router.refresh();
          else window.alert('Delete failed');
        } catch {
          window.alert('Network error');
        }
      } else if (linkBtn) {
        const id = linkBtn.dataset.linkId;
        if (!id) return;
        if (!window.confirm('Delete this link?')) return;
        try {
          const res = await fetch('/api/resources/links', {
            method: 'DELETE',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ id }),
          });
          if (res.ok) router.refresh();
          else window.alert('Delete failed');
        } catch {
          window.alert('Network error');
        }
      }
    }

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [router]);

  return null;
}
