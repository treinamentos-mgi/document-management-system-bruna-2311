import { useState } from 'react';

export default function UploadComponent({ onUpload, disabled }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file || uploading) return;
    const form = event.currentTarget;
    setUploading(true);
    setError('');
    setMessage('');
    try {
      await onUpload(file);
      form.reset();
      setFile(null);
      setMessage('Documento enviado com sucesso.');
    } catch (uploadError) {
      setError(uploadError.message || 'Não foi possível enviar o documento.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="upload-section" aria-labelledby="upload-title">
      <div className="upload-intro">
        <p className="eyebrow">NOVO DOCUMENTO</p>
        <h2 id="upload-title">Adicionar arquivo</h2>
        <p>Selecione um arquivo para guardar no seu acervo.</p>
      </div>
      <form className="upload-form" onSubmit={handleSubmit}>
        <label className="file-label" htmlFor="document-file">Arquivo</label>
        <div className="upload-controls">
          <input id="document-file" type="file" onChange={(event) => { setFile(event.target.files[0] || null); setMessage(''); setError(''); }} disabled={uploading || disabled} />
          <button className="primary-button" type="submit" disabled={!file || uploading || disabled}>
            {uploading ? 'Enviando...' : 'Enviar arquivo'}
          </button>
        </div>
        {message && <p className="success-message" role="status">{message}</p>}
        {error && <p className="error-message" role="alert">{error}</p>}
      </form>
    </section>
  );
}