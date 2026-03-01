'use client';

import { useRef, useEffect } from 'react';

export default function SectionContent({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);

  // After render, find PDF embeds and add fullscreen buttons
  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const pdfEmbeds = container.querySelectorAll('object.pdf-embed');
    pdfEmbeds.forEach((obj) => {
      const parent = obj.parentElement;
      if (!parent || parent.querySelector('.pdf-fullscreen-btn')) return;

      const btn = document.createElement('button');
      btn.className = 'pdf-fullscreen-btn';
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg> Fullscreen`;
      btn.addEventListener('click', () => {
        if (obj.requestFullscreen) {
          obj.requestFullscreen();
        }
      });

      // Insert button after the object element
      obj.after(btn);
    });
  }, [html]);

  return (
    <div
      ref={ref}
      className="doc-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
