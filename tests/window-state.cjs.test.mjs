/* Desktop window-state persistence. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { readWindowState, writeWindowState } = require('../desktop/window-state.cjs');
const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'finlens-window-'));

try {
  assert.deepEqual(readWindowState(dir), {
    width: 1440,
    height: 900,
    maximized: false
  });
  writeWindowState(dir, { width: 1600, height: 950, x: 40, y: 50, maximized: true });
  assert.deepEqual(readWindowState(dir), {
    width: 1600,
    height: 950,
    x: 40,
    y: 50,
    maximized: true
  });
} finally {
  await fs.rm(dir, { recursive: true, force: true });
}

console.log('PASS desktop window state persists safely');
