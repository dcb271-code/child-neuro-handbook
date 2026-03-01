'use client';

import { useState, useEffect, useCallback } from 'react';

export default function ImageLightbox() {
  const [images, setImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const isOpen = currentIndex >= 0;

  // Collect all images from .doc-content and attach click handlers
  useEffect(() => {
    const container = document.querySelector('.doc-content');
    if (!container) return;

    const imgs = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];
    const srcs = imgs.map(img => img.src).filter(Boolean);
    setImages(srcs);

    // Style images as clickable
    imgs.forEach(img => {
      img.style.cursor = 'zoom-in';
    });

    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== 'IMG') return;
      const src = (target as HTMLImageElement).src;
      const idx = srcs.indexOf(src);
      if (idx >= 0) {
        e.preventDefault();
        setCurrentIndex(idx);
      }
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, []);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const close = useCallback(() => setCurrentIndex(-1), []);
  const prev = useCallback(() => {
    setCurrentIndex(i => (i > 0 ? i - 1 : images.length - 1));
  }, [images.length]);
  const next = useCallback(() => {
    setCurrentIndex(i => (i < images.length - 1 ? i + 1 : 0));
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, close, prev, next]);

  if (!isOpen || images.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      {/* Close button */}
      <button
        onClick={close}
        className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors z-10"
        aria-label="Close lightbox"
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Image counter */}
      {images.length > 1 && (
        <div className="absolute top-4 left-4 text-white/70 text-sm font-medium select-none">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Previous button */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); prev(); }}
          className="absolute left-3 sm:left-6 text-white/60 hover:text-white transition-colors z-10"
          aria-label="Previous image"
          style={{ background: 'none', border: 'none', cursor: 'pointer', top: '50%', transform: 'translateY(-50%)' }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      {/* Image */}
      <img
        src={images[currentIndex]}
        alt=""
        className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg select-none"
        style={{ userSelect: 'none' }}
        draggable={false}
      />

      {/* Next button */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); next(); }}
          className="absolute right-3 sm:right-6 text-white/60 hover:text-white transition-colors z-10"
          aria-label="Next image"
          style={{ background: 'none', border: 'none', cursor: 'pointer', top: '50%', transform: 'translateY(-50%)' }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}
    </div>
  );
}
