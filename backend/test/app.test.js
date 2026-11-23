const { test } = require('node:test');
const assert = require('node:assert');
const { randomUUID } = require('node:crypto');
const { promises: fs } = require('node:fs');
const path = require('node:path');
const app = require('../src/app');
const documentRepository = require('../src/repositories/documentRepository');
const documentService = require('../src/services/documentService');

// Teste de fumaça do seed: garante que o app Express foi exportado.
// Novos testes serão adicionados durante os Steps 2, 6 e 7 com auxílio do Copilot.
test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('upload, listagem, download e erros de documentos', async (context) => {
  const server = app.listen(0);
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const storagePath = path.resolve(__dirname, '../storage');
  await fs.mkdir(storagePath, { recursive: true });
  const existingFiles = new Set(await fs.readdir(storagePath));
  const content = `documento de teste ${randomUUID()}`;
  context.after(async () => {
    const files = await fs.readdir(storagePath);
    for (const filename of files.filter((name) => !existingFiles.has(name))) {
      const filePath = path.join(storagePath, filename);
      if (await fs.readFile(filePath, 'utf8').catch(() => null) === content) {
        await fs.unlink(filePath);
      }
    }
  });

  let response = await fetch(`${baseUrl}/documents`);
  assert.deepStrictEqual(await response.json(), { documents: [] });

  response = await fetch(`${baseUrl}/upload`, { method: 'POST', body: new FormData() });
  assert.strictEqual(response.status, 400);
  assert.strictEqual((await response.json()).error.code, 'FILE_REQUIRED');

  const form = new FormData();
  form.append('file', new Blob([content], { type: 'text/plain' }), 'relatório.txt');
  response = await fetch(`${baseUrl}/upload`, { method: 'POST', body: form });
  assert.strictEqual(response.status, 201);
  const { document } = await response.json();
  assert.strictEqual(document.originalName, 'relatório.txt');
  assert.strictEqual(document.size, Buffer.byteLength(content));
  assert.ok(document.id);
  assert.strictEqual(document.owner, process.env.DMS_OWNER_ID?.trim() || 'local-user');
  assert.ok(!('storageKey' in document));
  assert.ok(!Number.isNaN(Date.parse(document.uploadedAt)));

  const uploadedFiles = (await fs.readdir(storagePath)).filter((name) => !existingFiles.has(name));
  let uploadedPath;
  for (const filename of uploadedFiles) {
    const filePath = path.join(storagePath, filename);
    if (await fs.readFile(filePath, 'utf8').catch(() => null) === content) {
      assert.notStrictEqual(filename, document.originalName);
      assert.notStrictEqual(filename, document.id);
      uploadedPath = filePath;
      break;
    }
  }
  assert.ok(uploadedPath, 'o conteúdo deve estar armazenado no disco');

  response = await fetch(`${baseUrl}/documents`);
  assert.deepStrictEqual(await response.json(), { documents: [document] });

  response = await fetch(`${baseUrl}/documents/${document.id}/download`);
  assert.strictEqual(response.status, 200);
  assert.match(response.headers.get('content-disposition'), /^attachment;/);
  assert.strictEqual(await response.text(), content);

  response = await fetch(`${baseUrl}/documents/inexistente/download`);
  assert.strictEqual(response.status, 404);
  assert.strictEqual((await response.json()).error.code, 'DOCUMENT_NOT_FOUND');

  const invalidForm = new FormData();
  invalidForm.append('outro', new Blob(['inválido']), 'invalido.txt');
  response = await fetch(`${baseUrl}/upload`, { method: 'POST', body: invalidForm });
  assert.strictEqual(response.status, 400);
  assert.strictEqual((await response.json()).error.code, 'INVALID_UPLOAD');

  const duplicateForm = new FormData();
  duplicateForm.append('file', new Blob(['primeiro']), 'primeiro.txt');
  duplicateForm.append('file', new Blob(['segundo']), 'segundo.txt');
  response = await fetch(`${baseUrl}/upload`, { method: 'POST', body: duplicateForm });
  assert.strictEqual(response.status, 400);
  assert.strictEqual((await response.json()).error.code, 'INVALID_UPLOAD');

  response = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'multipart/form-data; boundary=teste' },
    body: '--teste\r\n',
  });
  assert.strictEqual(response.status, 400);
  assert.strictEqual((await response.json()).error.code, 'INVALID_UPLOAD');

  await fs.unlink(uploadedPath);
  response = await fetch(`${baseUrl}/documents/${document.id}/download`);
  assert.strictEqual(response.status, 404);
  assert.strictEqual((await response.json()).error.code, 'FILE_NOT_FOUND');
});

test('remove o arquivo quando o registro dos metadados falha', async (context) => {
  const originalSave = documentRepository.save;
  const originalRemoveFile = documentRepository.removeFile;
  const error = new Error('falha no registro');
  let removedKey;
  documentRepository.save = () => { throw error; };
  documentRepository.removeFile = async (storageKey) => { removedKey = storageKey; };
  context.after(() => {
    documentRepository.save = originalSave;
    documentRepository.removeFile = originalRemoveFile;
  });

  await assert.rejects(documentService.createDocument({
    filename: 'chave-interna',
    originalname: 'teste.txt',
    size: 5,
  }), error);
  assert.strictEqual(removedKey, 'chave-interna');
});

test('bloqueia storage keys fora do diretório permitido', () => {
  assert.throws(() => documentRepository.getFilePath('../../arquivo-secreto'), /inválida/);
  assert.throws(() => documentRepository.getFilePath('/tmp/arquivo-secreto'), /inválida/);

  const validKey = '1c058b5b-6c88-4e19-b8bb-2172f48e76e6';
  assert.strictEqual(documentRepository.getFilePath(validKey), path.resolve(documentRepository.storagePath, validKey));
});

test('rejeita upload maior que o limite configurado', async (context) => {
  const server = app.listen(0);
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const form = new FormData();
  const oversizedContent = new Uint8Array((25 * 1024 * 1024) + 1);
  form.append('file', new Blob([oversizedContent], { type: 'application/octet-stream' }), 'grande.bin');

  const response = await fetch(`${baseUrl}/upload`, { method: 'POST', body: form });
  assert.strictEqual(response.status, 413);
  assert.strictEqual((await response.json()).error.code, 'FILE_TOO_LARGE');
});
