'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MAX_FILE_BYTES } from '@/lib/resources/validation';

const ACCEPT = '.pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg';
const MAX_MB_LABEL = `${Math.floor(MAX_FILE_BYTES / (1024 * 1024))} MB`;

export default function UploadDropzone({ subsection }: { subsection: 'conferences' | 'lectures' | 'misc' }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [over, setOver] = useState(false);

  function deriveTitle(name: string): string {
    const noExt = name.replace(/\.[^.]+$/, '');
    return noExt.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  async function upload(file: File) {
    if (progress !== null) return; // already uploading
    setError(null);
    if (file.size > MAX_FILE_BYTES) { setError(`File exceeds ${MAX_MB_LABEL}.`); return; }

    const suggested = deriveTitle(file.name);
    const titleInput = window.prompt('Display title (Cancel to keep the filename):', suggested);
    const title = titleInput === null ? '' : titleInput;

    const fd = new FormData();
    fd.append('file', file);
    fd.append('subsection', subsection);
    if (title.trim()) fd.append('title', title.trim());

    // Progress requires XHR (fetch can't report upload progress reliably yet)
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/resources/upload');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      setProgress(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        router.refresh();
      } else {
        let msg = 'Upload failed';
        try { msg = JSON.parse(xhr.responseText).error || msg; } catch {}
        setError(msg);
      }
    };
    xhr.onerror = () => { setProgress(null); setError('Network error'); };
    setProgress(0);
    xhr.send(fd);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Drop a file or click to browse"
      className={`resources-dropzone ${over ? 'is-over' : ''}`}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) upload(f);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = '';
        }}
      />
      {progress === null ? (
        <>
          <div className="text-sm">⬆ Drop a file here or click to browse</div>
          <div className="text-xs text-slate-400 mt-1">PDF, PPT/PPTX, DOC/DOCX, PNG/JPG · max {MAX_MB_LABEL}</div>
        </>
      ) : (
        <div className="text-sm">Uploading… {progress}%</div>
      )}
      {error && <div className="text-xs text-red-600 mt-2">{error}</div>}
    </div>
  );
}
