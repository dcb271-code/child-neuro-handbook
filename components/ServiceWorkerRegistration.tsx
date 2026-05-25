'use client';

import { useEffect } from 'react';

// Registers the service worker (public/sw.js) after the page loads. This is what
// makes Android Chrome treat the site as installable — a real standalone app
// instead of a Chrome-badged bookmark shortcut.
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* registration failures are non-fatal — the site still works online */
      });
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register);
      return () => window.removeEventListener('load', register);
    }
  }, []);

  return null;
}
