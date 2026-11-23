const API_PREFIX = '/api';

async function request(path, options) {
  const response = await fetch(`${API_PREFIX}${path}`, options);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message || 'Não foi possível concluir a operação.');
  }
  return response;
}

export async function listDocuments() {
  const response = await request('/documents');
  const body = await response.json();
  if (!Array.isArray(body?.documents)) {
    throw new Error('Resposta inválida ao carregar os documentos.');
  }
  return body.documents;
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await request('/upload', { method: 'POST', body: formData });
  const body = await response.json();
  if (!body?.document) {
    throw new Error('Resposta inválida ao enviar o documento.');
  }
  return body.document;
}

export async function downloadDocument(id) {
  const response = await request(`/documents/${encodeURIComponent(id)}/download`);
  return response.blob();
}