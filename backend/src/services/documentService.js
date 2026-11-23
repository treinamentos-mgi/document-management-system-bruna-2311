const { randomUUID } = require('node:crypto');
const documentRepository = require('../repositories/documentRepository');

const owner = process.env.DMS_OWNER_ID?.trim() || 'local-user';

function publicDocument(document) {
  const { storageKey, ...metadata } = document;
  return metadata;
}

async function createDocument(file) {
  try {
    const document = documentRepository.save({
      id: randomUUID(),
      originalName: file.originalname,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      owner,
      storageKey: file.filename,
    });
    return publicDocument(document);
  } catch (error) {
    try {
      await documentRepository.removeFile(file.filename);
    } catch (cleanupError) {
      console.error('Falha ao remover arquivo após erro no registro:', cleanupError);
    }
    throw error;
  }
}

function listDocuments() {
  return documentRepository.findByOwner(owner).map(publicDocument);
}

function findDocument(id) {
  const document = documentRepository.findByIdAndOwner(id, owner);
  if (!document) return null;
  return {
    originalName: document.originalName,
    filePath: documentRepository.getFilePath(document.storageKey),
  };
}

module.exports = { createDocument, listDocuments, findDocument };