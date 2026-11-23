const path = require('node:path');
const { promises: fs } = require('node:fs');

const storagePath = path.resolve(__dirname, '../../storage');
const documents = [];

function save(document) {
  documents.push(document);
  return document;
}

function findByOwner(owner) {
  return documents.filter((document) => document.owner === owner).reverse();
}

function findByIdAndOwner(id, owner) {
  return documents.find((document) => document.id === id && document.owner === owner);
}

function getFilePath(storageKey) {
  if (typeof storageKey !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(storageKey)) {
    throw new Error('Chave de armazenamento inválida.');
  }

  const filePath = path.resolve(storagePath, storageKey);
  if (path.dirname(filePath) !== storagePath) {
    throw new Error('Chave de armazenamento fora do diretório permitido.');
  }
  return filePath;
}

function removeFile(storageKey) {
  return fs.unlink(getFilePath(storageKey));
}

module.exports = { storagePath, save, findByOwner, findByIdAndOwner, getFilePath, removeFile };