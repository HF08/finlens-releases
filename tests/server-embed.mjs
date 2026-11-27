/* Embedded local service: random loopback port and isolated writable data root. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { startFinLensServer } from '../server/server.mjs';

const appRoot = path.resolve('.');
const dataRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'finlens-embed-'));
const instance = await startFinLensServer({
  appRoot,
  dataRoot,
  backupDir: path.join(dataRoot, 'backups'),
  host: '127.0.0.1',
  port: 0
});

try {
  assert.match(instance.url, /^http:\/\/127\.0\.0\.1:\d+$/);
  const health = await fetch(`${instance.url}/api/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).ok, true);

  const backup = await fetch(`${instance.url}/api/backup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ marker: 'embedded-server-test' })
  });
  assert.equal(backup.status, 200);
  const saved = await backup.json();
  assert.equal(saved.ok, true);

  const files = await fs.readdir(path.join(dataRoot, 'backups'));
  assert.equal(files.length, 1);
  assert.equal(files[0].endsWith('.json'), true);
  await fs.writeFile(
    path.join(dataRoot, 'backups', 'older.json'),
    JSON.stringify({
      custom: [
        { id: 'older-article', title: 'Older imported article', _url: 'https://example.test/older', paragraphs: [] },
        { id: 'shared-article', title: 'Shared imported article', _url: 'https://example.test/shared', paragraphs: [] }
      ]
    }),
    'utf8'
  );
  await fs.writeFile(
    path.join(dataRoot, 'backups', 'newer.json'),
    JSON.stringify({
      custom: [
        { id: 'newer-article', title: 'Newer imported article', _url: 'https://example.test/newer', paragraphs: [] },
        { id: 'shared-article', title: 'Shared imported article', _url: 'https://example.test/shared', paragraphs: [] }
      ]
    }),
    'utf8'
  );
  const recoveredArticles = await fetch(`${instance.url}/api/recovery/articles`);
  assert.equal(recoveredArticles.status, 200);
  const recovered = await recoveredArticles.json();
  assert.deepEqual(
    recovered.articles.map(article => article.id).sort(),
    ['newer-article', 'older-article', 'shared-article']
  );
  await assert.doesNotReject(fs.access(path.join(dataRoot, 'credentials')));
} finally {
  await instance.close();
  await fs.rm(dataRoot, { recursive: true, force: true });
}

console.log('PASS embedded server uses a random loopback port and isolated data root');
