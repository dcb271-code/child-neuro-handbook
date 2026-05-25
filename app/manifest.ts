import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Child Neurology Handbook',
    short_name: 'Neuro',
    description: 'UofL Neurology Residency — Clinical Reference for Child Neurology',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f2238',
    theme_color: '#1e3a5f',
    icons: [
      { src: '/icon.svg', type: 'image/svg+xml', sizes: 'any' },
      { src: '/icons/icon-192.png', type: 'image/png', sizes: '192x192', purpose: 'any' },
      { src: '/icons/icon-512.png', type: 'image/png', sizes: '512x512', purpose: 'any' },
      { src: '/icons/icon-192.png', type: 'image/png', sizes: '192x192', purpose: 'maskable' },
      { src: '/icons/icon-512.png', type: 'image/png', sizes: '512x512', purpose: 'maskable' },
    ],
  };
}
