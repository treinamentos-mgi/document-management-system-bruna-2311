const { test } = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

// Teste de fumaça do seed: garante que o app Express foi exportado.
// Novos testes serão adicionados durante os Steps 2, 6 e 7 com auxílio do Copilot.
test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('upload, listagem e download de documentos', async (context) => {
  const server = app.listen(0);
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const storagePath = path.resolve(__dirname, '../storage');
  await fs.mkdir(storagePath, { recursive: true });
  const existingFiles = new Set(await fs.readdir(storagePath));
  const content = Buffer.concat([Buffer.from([0, 255, 128, 10]), Buffer.from(randomUUID())]);
  context.after(async () => {
    const files = await fs.readdir(storagePath);
    for (const filename of files.filter((name) => !existingFiles.has(name))) {
      const filePath = path.join(storagePath, filename);
      const fileContent = await fs.readFile(filePath).catch(() => null);
      if (fileContent && fileContent.equals(content)) await fs.unlink(filePath);
    }
  });

  let response = await fetch(`${baseUrl}/documents`);
  assert.strictEqual(response.status, 200);
  assert.deepStrictEqual(await response.json(), { documents: [] });

  response = await fetch(`${baseUrl}/upload`, { method: 'POST', body: new FormData() });
  assert.strictEqual(response.status, 400);
  assert.strictEqual((await response.json()).error.code, 'FILE_REQUIRED');

  const form = new FormData();
  form.append('file', new Blob([content], { type: 'application/octet-stream' }), 'dados.bin');
  response = await fetch(`${baseUrl}/upload`, { method: 'POST', body: form });
  assert.strictEqual(response.status, 201);
  const { document } = await response.json();
  assert.ok(document.id);
  assert.strictEqual(document.originalName, 'dados.bin');
  assert.strictEqual(document.size, content.length);
  assert.ok(!('storageKey' in document));

  response = await fetch(`${baseUrl}/documents`);
  assert.strictEqual(response.status, 200);
  const { documents } = await response.json();
  assert.deepStrictEqual(documents, [document]);

  response = await fetch(`${baseUrl}/documents/${document.id}/download`);
  assert.strictEqual(response.status, 200);
  assert.match(response.headers.get('content-disposition'), /^attachment;/);
  assert.deepStrictEqual(Buffer.from(await response.arrayBuffer()), content);

  response = await fetch(`${baseUrl}/documents/inexistente/download`);
  assert.strictEqual(response.status, 404);
  assert.strictEqual((await response.json()).error.code, 'DOCUMENT_NOT_FOUND');
});
