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
  return path.join(storagePath, storageKey);
}

function removeFile(storageKey) {
  return fs.unlink(getFilePath(storageKey));
}

module.exports = { storagePath, save, findByOwner, findByIdAndOwner, getFilePath, removeFile };