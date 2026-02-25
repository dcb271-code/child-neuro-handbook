'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Fuse, { type FuseResult } from 'fuse.js';

type Chunk = {
  section: string;
  sectionName: string;
  heading: string;
  id: string;
  text: string;
};

let fuseInstance: Fuse<Chunk> | null = null;

async function getFuse(): Promise<Fuse<Chunk>> {
  if (fuseInstance) return fuseInstance;
  const res = await fetch('/search.json');
  const data: Chunk[] = await res.json();
  fuseInstance = new Fuse(data, {
    keys: [
      { name: 'heading',     weight: 3 },
      { name: 'sectionName', weight: 1 },
      { name: 'text',        weight: 1 },
    ],
    threshold: 0.35,
    includeScore: true,
    minMatchCharLength: 2,
  });
  return fuseInstance;
}

export default function GlobalSearch() {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<FuseResult<Chunk>[]>([]);
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef     = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    const fuse = await getFuse();
    setResults(fuse.search(q, { limit: 10 }));
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 180);
    return () => clearTimeout(t);
  }, [query, search]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Input row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(255,255,255,0.20)',
        borderRadius: '8px',
        padding: '6px 12px',
        gap: '8px',
        border: '1px solid rgba(255,255,255,0.28)',
      }}>
        {/* Search icon */}
        <svg width="16" height="16" fill="none" stroke="rgba(147,197,253,1)"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"
          style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="6" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          placeholder="Search topics, drugs, diagnoses…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'white',
            fontSize: '13px',
            minWidth: 0,
          }}
          className="search-input-placeholder"
        />

        {query ? (
          <button
            onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }}
            style={{ color: 'rgba(147,197,253,0.8)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', flexShrink: 0 }}
          >✕</button>
        ) : (
          <kbd style={{
            fontSize: '11px', color: 'rgba(147,197,253,0.7)',
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '4px', padding: '1px 6px', fontFamily: 'monospace', flexShrink: 0,
          }}>/</kbd>
        )}
      </div>

      {/* Dropdown */}
      {open && query.trim().length >= 2 && (
        <div className="search-dropdown" style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          overflow: 'hidden',
          zIndex: 100,
        }}>
          {loading && (
            <div style={{ padding: '12px 16px', fontSize: '12px', color: '#94a3b8' }}>Searching…</div>
          )}
          {!loading && results.length === 0 && (
            <div style={{ padding: '16px', fontSize: '13px', color: '#64748b', textAlign: 'center' }}>
              No results for &quot;{query}&quot;
            </div>
          )}
          {!loading && results.map((r, i) => {
            const item = r.item;
            const href = `/${item.section}/${item.id ? '#' + item.id : ''}`;
            return (
              <a key={i} href={href} onClick={() => { setOpen(false); setQuery(''); }}
                style={{
                  display: 'block',
                  padding: '14px 16px',
                  borderBottom: i < results.length - 1 ? '1px solid #f1f5f9' : 'none',
                  textDecoration: 'none',
                  minHeight: '44px',
                }}>
                <div style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.heading}
                </div>
                <div style={{ fontSize: '11px', color: '#3b82f6', marginTop: '2px' }}>
                  {item.sectionName}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px',
                  display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {item.text.slice(0, 110).replace(/\s+/g, ' ')}
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
