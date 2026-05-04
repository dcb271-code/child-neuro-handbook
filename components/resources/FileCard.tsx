'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  pathname: string;
  url: string;
  title: string;
  contentType: string;
  authed: boolean;
};

function iconFor(contentType: string): string {
  if (contentType === 'application/pdf') return '📄';
  if (contentType.startsWith('image/')) return '🖼';
  if (contentType.includes('presentation') || contentType.includes('powerpoint')) return '📊';
  if (contentType.includes('word')) return '📝';
  return '📁';
}

function typeLabel(contentType: string): string {
  if (contentType === 'application/pdf') return 'PDF Document';
  if (contentType.startsWith('image/')) return 'Image';
  if (contentType.includes('presentation') || contentType.includes('powerpoint')) return 'PowerPoint';
  if (contentType.includes('word')) return 'Word Document';
  return 'File';
}

export default function FileCard({ pathname, url, title, contentType, authed }: Props) {
  const router = useRouter();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);

  const isPdf = contentType === 'application/pdf';
  const isImg = contentType.startsWith('image/');
  const previewable = isPdf || isImg;

  async function handleRename() {
    const next = window.prompt('Rename file', title);
    if (next == null) return;
    const trimmed = next.trim();
    if (!trimmed || trimmed === title) return;
    setRenaming(true);
    try {
      const res = await fetch('/api/resources/file', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pathname, title: trimmed }),
      });
      if (res.ok) router.refresh();
      else window.alert('Rename failed');
    } catch {
      window.alert('Network error');
    } finally {
      setRenaming(false);
    }
  }

  return (
    <div className="pathway-card">
      <div className="pathway-card-header">
        <span className="pathway-card-icon">{iconFor(contentType)}</span>
        <div className="pathway-card-info">
          <div className="pathway-card-title">{title}</div>
          <div className="pathway-card-type">{typeLabel(contentType)}</div>
        </div>
      </div>
      <div className="pathway-card-preview">
        {previewable && previewOpen ? (
          isPdf ? (
            <object data={url} type="application/pdf" className="pdf-embed w-full">
              <p className="p-3 text-xs text-slate-500">Preview unavailable.</p>
            </object>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={url} alt={title} className="w-full h-auto" />
          )
        ) : (
          <div className="p-6 text-center text-3xl text-slate-400">{iconFor(contentType)}</div>
        )}
      </div>
      <div className="pathway-card-actions">
        {previewable && (
          <button
            type="button"
            onClick={() => setPreviewOpen((v) => !v)}
            className="pathway-btn pathway-btn-view"
          >
            {previewOpen ? 'Hide Preview' : 'Show Preview'}
          </button>
        )}
        <a href={url} target="_blank" rel="noopener noreferrer" className="pathway-btn pathway-btn-view">
          Open ↗
        </a>
        <a href={url} download className="pathway-btn pathway-btn-download">⬇ Download</a>
        {authed && (
          <button
            type="button"
            onClick={handleRename}
            disabled={renaming}
            className="pathway-btn pathway-btn-view"
          >
            ✏ {renaming ? 'Renaming…' : 'Rename'}
          </button>
        )}
        {authed && (
          <button
            type="button"
            data-resources-delete-file
            data-pathname={pathname}
            className="pathway-btn pathway-btn-delete"
          >
            🗑 Delete
          </button>
        )}
      </div>
    </div>
  );
}
