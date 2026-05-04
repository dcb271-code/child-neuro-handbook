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
  const isPdf = contentType === 'application/pdf';
  const isImg = contentType.startsWith('image/');
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
        {isPdf && (
          <object data={url} type="application/pdf" className="pdf-embed w-full">
            <p className="p-3 text-xs text-slate-500">Preview unavailable.</p>
          </object>
        )}
        {isImg && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={url} alt={title} className="w-full h-auto" />
        )}
        {!isPdf && !isImg && (
          <div className="p-6 text-center text-3xl text-slate-400">{iconFor(contentType)}</div>
        )}
      </div>
      <div className="pathway-card-actions">
        <a href={url} target="_blank" rel="noopener noreferrer" className="pathway-btn pathway-btn-view">
          View Full Screen ↗
        </a>
        <a href={url} download className="pathway-btn pathway-btn-download">⬇ Download</a>
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
