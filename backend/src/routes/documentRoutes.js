const express = require('express');
const multer = require('multer');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const documentController = require('../controllers/documentController');
const { storagePath } = require('../repositories/documentRepository');

const router = express.Router();
const storage = multer.diskStorage({
  destination(req, file, callback) {
    fs.mkdir(storagePath, { recursive: true }, (error) => callback(error, storagePath));
  },
  filename(req, file, callback) {
    callback(null, randomUUID());
  },
});
const upload = multer({ storage, defParamCharset: 'utf8' }).single('file');

router.post('/upload', (req, res, next) => {
  upload(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError || error.message === 'Unexpected end of form' ||
        error.message === 'Multipart: Boundary not found' || error.message === 'Malformed part header') {
      return documentController.sendError(res, 400, 'INVALID_UPLOAD', 'Envio de arquivo inválido.');
    }
    return documentController.sendError(res, 500, 'STORAGE_ERROR', 'Não foi possível armazenar o documento.');
  });
}, documentController.upload);
router.get('/documents', documentController.list);
router.get('/documents/:id/download', documentController.download);

module.exports = router;