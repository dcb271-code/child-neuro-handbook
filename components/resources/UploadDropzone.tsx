'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { upload } from '@vercel/blob/client';
import { MAX_FILE_BYTES } from '@/lib/resources/validation';
import { blobPathFor } from '@/lib/resources/paths';
import RenameModal from './RenameModal';

const ACCEPT = '.pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg';
const MAX_MB_LABEL = `${Math.floor(MAX_FILE_BYTES / (1024 * 1024))} MB`;

function deriveTitle(name: string): string {
  const noExt = name.replace(/\.[^.]+$/, '');
  return noExt.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function UploadDropzone({ subsection }: { subsection: 'conferences' | 'lectures' | 'misc' | 'general' | 'journal' }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [over, setOver] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingTitle, setPendingTitle] = useState('');

  function queue(file: File) {
    if (progress !== null) return; // already uploading
    setError(null);
    if (file.size > MAX_FILE_BYTES) { setError(`File exceeds ${MAX_MB_LABEL}.`); return; }
    setPendingTitle(deriveTitle(file.name));
    setPendingFile(file);
  }

  function cancelPending() {
    setPendingFile(null);
    setPendingTitle('');
  }

  async function startUpload(title: string) {
    if (!pendingFile) return;
    const file = pendingFile;
    setPendingFile(null);
    setPendingTitle('');
    setProgress(0);

    // Straight to Blob storage. The API route only mints a token, so the bytes
    // never pass through a serverless function — which is what used to fail as
    // a bare "Network error" once a file took longer to send than the
    // function's execution budget.
    const pathname = blobPathFor(subsection, file.name);
    try {
      await upload(pathname, file, {
        access: 'public',
        // Trailing slash on purpose: next.config sets trailingSlash, and this URL
        // is also handed to the Blob service, so a 308 mid-exchange is worth avoiding.
        handleUploadUrl: '/api/resources/upload/',
        contentType: file.type,
        multipart: true, // chunks + retries, so a dropped packet is not a lost upload
        onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
      });
    } catch (err) {
      setProgress(null);
      setError(err instanceof Error ? err.message : 'Upload failed');
      return;
    }

    // Title is recorded separately; the upload itself has already succeeded, so
    // a failure here is not worth discarding the file over.
    const trimmed = title.trim();
    if (trimmed) {
      try {
        await fetch('/api/resources/file', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pathname, title: trimmed }),
        });
      } catch (err) {
        console.error('[resources/upload] naming the file failed:', err);
      }
    }

    setProgress(null);
    router.refresh();
  }

  return (
    <>
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
          if (f) queue(f);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) queue(f);
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

      <RenameModal
        open={pendingFile !== null}
        initialTitle={pendingTitle}
        heading="Name file before upload"
        submitLabel="Upload"
        showHelp={false}
        onClose={cancelPending}
        onSubmit={(formatted) => startUpload(formatted)}
      />
    </>
  );
}
