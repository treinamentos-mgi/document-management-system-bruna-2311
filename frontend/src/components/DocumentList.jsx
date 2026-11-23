import DownloadButton from './DownloadButton';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' });

export default function DocumentList({ documents }) {
  if (documents.length === 0) {
    return <p className="empty-state">Nenhum documento por aqui ainda.</p>;
  }

  return (
    <ul className="document-list">
      {documents.map((document) => (
        <li className="document-row" key={document.id}>
          <span className="document-mark" aria-hidden="true">DOC</span>
          <div className="document-details">
            <span className="document-name">{document.originalName}</span>
            <span className="document-meta">{formatSize(document.size)} <span aria-hidden="true">·</span> {dateFormatter.format(new Date(document.uploadedAt))}</span>
          </div>
          <DownloadButton document={document} />
        </li>
      ))}
    </ul>
  );
}