import { useState } from 'react';
import { downloadDocument } from '../services/documentApi';

export default function DownloadButton({ document }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  async function handleDownload() {
    setDownloading(true);
    setError('');
    try {
      const blob = await downloadDocument(document.id);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.originalName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError.message || 'Não foi possível baixar o documento.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="download-action">
      <button className="secondary-button" type="button" onClick={handleDownload} disabled={downloading} aria-label={`Baixar ${document.originalName}`}>
        {downloading ? 'Baixando...' : 'Baixar'}
      </button>
      {error && <span className="error-message" role="alert">{error}</span>}
    </div>
  );
}