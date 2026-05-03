type Props = {
  id: string;
  url: string;
  label: string;
  authed: boolean;
};

export default function LinkCard({ id, url, label, authed }: Props) {
  return (
    <div className="pathway-card">
      <div className="pathway-card-header">
        <span className="pathway-card-icon">🔗</span>
        <div className="pathway-card-info">
          <div className="pathway-card-title">{label}</div>
          <div className="pathway-card-type">{url}</div>
        </div>
      </div>
      <div className="pathway-card-actions">
        <a href={url} target="_blank" rel="noopener noreferrer" className="pathway-btn pathway-btn-view">
          Open ↗
        </a>
        {authed && (
          <button
            type="button"
            data-resources-delete-link
            data-link-id={id}
            className="pathway-btn pathway-btn-delete"
          >
            🗑 Delete
          </button>
        )}
      </div>
    </div>
  );
}
