// Service worker for the Child Neurology Handbook PWA.
// Strategy: "cache-as-you-go".
//   - Page navigations: network-first, fall back to cache (fresh when online,
//     still opens when offline if you've visited the page before).
//   - Static assets / data / images: stale-while-revalidate (instant from cache,
//     refreshed in the background so redeploys propagate).
// Bump VERSION to force-clear old caches after a deploy with changed strategy.
const VERSION = 'v1';
const PAGE_CACHE = `pages-${VERSION}`;
const ASSET_CACHE = `assets-${VERSION}`;

// Minimal shell pre-cached on install so the app opens offline right away.
const APP_SHELL = ['/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PAGE_CACHE).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // skip cross-origin (fonts, etc.)
  if (url.pathname.startsWith('/api/')) return; // never cache dynamic API/auth routes

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

// Fresh page when online; cached page (or homepage shell) when offline.
async function networkFirst(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    const shell = await cache.match('/');
    if (shell) return shell;
    throw err;
  }
}

// Serve cache immediately, update it in the background.
async function staleWhileRevalidate(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || network;
}
