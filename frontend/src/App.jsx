import { useEffect, useState } from 'react';
import UploadComponent from './components/UploadComponent';
import DocumentList from './components/DocumentList';
import { listDocuments, uploadDocument } from './services/documentApi';
import './App.css';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    listDocuments().then((items) => {
      if (active) setDocuments(items);
    }).catch((error) => {
      if (active) setListError(error.message || 'Não foi possível carregar os documentos.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [loadAttempt]);

  function retryLoading() {
    setLoading(true);
    setListError('');
    setLoadAttempt((attempt) => attempt + 1);
  }

  async function handleUpload(file) {
    const document = await uploadDocument(file);
    setDocuments((current) => [document, ...current]);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="/" aria-label="Documentos, página inicial">
            <span className="brand-mark" aria-hidden="true">D</span>
            <span>Documentos</span>
          </a>
          <span className="topbar-label">Gestão documental</span>
        </div>
      </header>
      <main className="workspace">
        <div className="page-heading">
          <div>
            <p className="eyebrow">ÁREA DE TRABALHO</p>
            <h1>Meus documentos</h1>
            <p className="subtitle">Seus arquivos em um só lugar.</p>
          </div>
        </div>
        <UploadComponent onUpload={handleUpload} disabled={loading || Boolean(listError)} />
        <section className="documents-section" aria-labelledby="documents-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ACERVO</p>
              <h2 id="documents-title">Arquivos</h2>
            </div>
            {!loading && !listError && <span className="count">{documents.length} {documents.length === 1 ? 'documento' : 'documentos'}</span>}
          </div>
          {loading ? <p className="status" role="status">Carregando documentos...</p> : listError ? (
            <div className="status" role="alert">
              <p>{listError}</p>
              <button className="secondary-button" type="button" onClick={retryLoading}>Tentar novamente</button>
            </div>
          ) : <DocumentList documents={documents} />}
        </section>
      </main>
    </div>
  );
}
