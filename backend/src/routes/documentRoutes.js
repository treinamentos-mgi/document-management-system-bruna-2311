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
const maxUploadSizeMb = Number.parseInt(process.env.DMS_MAX_UPLOAD_SIZE_MB || '25', 10);
const maxUploadSize = (Number.isFinite(maxUploadSizeMb) && maxUploadSizeMb > 0
  ? maxUploadSizeMb
  : 25) * 1024 * 1024;
const upload = multer({
  storage,
  defParamCharset: 'utf8',
  limits: {
    fileSize: maxUploadSize,
    files: 1,
  },
}).single('file');

router.post('/upload', (req, res, next) => {
  upload(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return documentController.sendError(res, 413, 'FILE_TOO_LARGE', 'O arquivo excede o tamanho máximo permitido.');
      }
      if (error.code === 'LIMIT_UNEXPECTED_FILE' || error.code === 'LIMIT_PART_COUNT' ||
          error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_FIELD_COUNT') {
        return documentController.sendError(res, 400, 'INVALID_UPLOAD', 'Envio de arquivo inválido.');
      }
    }
    if (error.message === 'Unexpected end of form' ||
        error.message === 'Multipart: Boundary not found' || error.message === 'Malformed part header') {
      return documentController.sendError(res, 400, 'INVALID_UPLOAD', 'Envio de arquivo inválido.');
    }
    return documentController.sendError(res, 500, 'STORAGE_ERROR', 'Não foi possível armazenar o documento.');
  });
}, documentController.upload);
router.get('/documents', documentController.list);
router.get('/documents/:id/download', documentController.download);

module.exports = router;