/* Legacy install-local data is copied into the per-user data directory. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { migrateLegacyUserData } = require('../desktop/data-migration.cjs');
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'finlens-migrate-'));
const appRoot = path.join(root, 'old-install');
const userDataDir = path.join(root, 'profile');
const legacyDataDir = path.join(root, 'legacy-project');

try {
  await fs.mkdir(path.join(appRoot, 'data', 'backups'), { recursive: true });
  await fs.mkdir(path.join(appRoot, 'data', 'credentials'), { recursive: true });
  await fs.mkdir(path.join(appRoot, 'data', 'dictionary'), { recursive: true });
  await fs.mkdir(path.join(legacyDataDir, 'backups'), { recursive: true });
  await fs.writeFile(path.join(appRoot, 'data', 'backups', 'old.json'), '{"old":true}');
  await fs.writeFile(path.join(appRoot, 'data', 'credentials', 'credentials.json'), '{"credential":"old"}');
  await fs.writeFile(path.join(appRoot, 'data', 'dictionary', 'ecdict.sqlite'), 'not-copied');
  await fs.writeFile(path.join(legacyDataDir, 'backups', 'project-backup.json'), '{"project":true}');
  await fs.mkdir(path.join(userDataDir, 'data', 'backups'), { recursive: true });
  await fs.writeFile(path.join(userDataDir, 'data', 'backups', 'current.json'), '{"current":true}');

  const copied = migrateLegacyUserData({ appRoot, userDataDir, legacyDataDirs: [legacyDataDir] });
  assert.equal(copied.length, 3);
  assert.equal(await fs.readFile(path.join(userDataDir, 'data', 'backups', 'old.json'), 'utf8'), '{"old":true}');
  assert.equal(await fs.readFile(path.join(userDataDir, 'data', 'backups', 'project-backup.json'), 'utf8'), '{"project":true}');
  assert.equal(await fs.readFile(path.join(userDataDir, 'data', 'backups', 'current.json'), 'utf8'), '{"current":true}');
  assert.equal(await fs.readFile(path.join(userDataDir, 'data', 'credentials', 'credentials.json'), 'utf8'), '{"credential":"old"}');
  await assert.rejects(fs.access(path.join(userDataDir, 'data', 'dictionary', 'ecdict.sqlite')));
} finally {
  await fs.rm(root, { recursive: true, force: true });
}

console.log('PASS legacy backups and credentials migrate without overwriting current data');
