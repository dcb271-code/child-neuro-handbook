'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import RenameModal from './RenameModal';

type Props = {
  pathname: string;
  url: string;
  title: string;
  contentType: string;
  authed: boolean;
};

export function fileIdFor(pathname: string): string {
  return 'file-' + pathname.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

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
  const [renameOpen, setRenameOpen] = useState(false);
  const [shared, setShared] = useState(false);

  const isPdf = contentType === 'application/pdf';
  const isImg = contentType.startsWith('image/');
  const previewable = isPdf || isImg;
  const id = fileIdFor(pathname);

  async function handleShare() {
    const link = `${window.location.origin}${window.location.pathname}#${id}`;
    try {
      await navigator.clipboard.writeText(link);
      setShared(true);
      setTimeout(() => setShared(false), 1500);
    } catch {
      window.prompt('Copy this link:', link);
    }
  }

  async function handleRename(newTitle: string) {
    const res = await fetch('/api/resources/file', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pathname, title: newTitle }),
    });
    if (res.ok) {
      setRenameOpen(false);
      router.refresh();
    } else {
      window.alert('Rename failed');
    }
  }

  return (
    <div id={id} className="pathway-card scroll-mt-20">
      <div className="pathway-card-header">
        <span className="pathway-card-icon">{iconFor(contentType)}</span>
        <div className="pathway-card-info">
          <div className="pathway-card-title">{title}</div>
          <div className="pathway-card-type">{typeLabel(contentType)}</div>
        </div>
      </div>
      {previewable && previewOpen && (
        <div className="pathway-card-preview">
          {isPdf ? (
            <object data={url} type="application/pdf" className="pdf-embed w-full">
              <p className="p-3 text-xs text-slate-500">Preview unavailable.</p>
            </object>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={url} alt={title} className="w-full h-auto" />
          )}
        </div>
      )}
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
        <button type="button" onClick={handleShare} className="pathway-btn pathway-btn-view">
          {shared ? '✓ Copied' : '🔗 Share'}
        </button>
        {authed && (
          <button
            type="button"
            onClick={() => setRenameOpen(true)}
            className="pathway-btn pathway-btn-view"
          >
            ✏ Rename
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

      <RenameModal
        open={renameOpen}
        initialTitle={title}
        onClose={() => setRenameOpen(false)}
        onSubmit={handleRename}
      />
    </div>
  );
}
