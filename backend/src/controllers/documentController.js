const documentService = require('../services/documentService');

function sendError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

async function upload(req, res) {
  if (!req.file) {
    return sendError(res, 400, 'FILE_REQUIRED', 'Envie um arquivo no campo file.');
  }

  try {
    const document = await documentService.createDocument(req.file);
    return res.status(201).json({ document });
  } catch (error) {
    return sendError(res, 500, 'STORAGE_ERROR', 'Não foi possível armazenar o documento.');
  }
}

function list(req, res) {
  return res.json({ documents: documentService.listDocuments() });
}

function download(req, res) {
  let document;
  try {
    document = documentService.findDocument(req.params.id);
  } catch (error) {
    return sendError(res, 500, 'DOWNLOAD_ERROR', 'Não foi possível baixar o documento.');
  }
  if (!document) {
    return sendError(res, 404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
  }

  return res.download(document.filePath, document.originalName, (error) => {
    if (!error) return;
    if (res.headersSent) {
      res.destroy(error);
      return;
    }
    if (error.code === 'ENOENT') {
      sendError(res, 404, 'FILE_NOT_FOUND', 'Arquivo não encontrado.');
      return;
    }
    sendError(res, 500, 'DOWNLOAD_ERROR', 'Não foi possível baixar o documento.');
  });
}

module.exports = { upload, list, download, sendError };