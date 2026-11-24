/* Electron desktop smoke test using an isolated user-data directory. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const pwRequire = createRequire(process.env.PW_BASE || 'C:/Users/NORA/.workbuddy/binaries/node/workspace/');
const localRequire = createRequire(import.meta.url);
const { _electron: electron } = pwRequire('playwright-core');
const electronPath = localRequire('electron');
const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'finlens-desktop-'));
const dataRoot = path.join(tempRoot, 'data');
const packagedExe = process.env.FINLENS_PACKAGED_EXE ||
  (process.argv.includes('--packaged') ? path.resolve('release', 'win-unpacked', 'FinLens.exe') : '');
let app;

try {
  app = await electron.launch({
    executablePath: packagedExe || electronPath,
    args: packagedExe ? [] : [path.resolve('desktop/main.cjs')],
    env: {
      ...process.env,
      FINLENS_DISABLE_AUTO_UPDATE: '1',
      FINLENS_USER_DATA_DIR: path.join(tempRoot, 'profile'),
      FINLENS_DATA_DIR: dataRoot,
      FINLENS_BACKUP_DIR: path.join(dataRoot, 'backups'),
      FINLENS_DESKTOP_PORT: '0'
    },
    timeout: 45000
  });
  const window = await app.firstWindow({ timeout: 45000 });
  const errors = [];
  window.on('pageerror', error => errors.push(error.message));
  await window.waitForLoadState('domcontentloaded');
  await window.waitForTimeout(500);
  assert.match(await window.title(), /FinLens/i);
  assert.ok(await window.locator('.nav-item[data-view="reader"]').count() >= 1);
  assert.equal(await window.evaluate(() => typeof window.CET_VOCABULARY_DATA), 'undefined');
  await window.locator('.nav-item[data-view="knowledge"]').click();
  await window.locator('.kb-card').first().waitFor({ state: 'visible', timeout: 15000 });
  assert.ok(await window.locator('.kb-card').count() > 0);
  assert.deepEqual(errors, []);
  const serviceOrigin = new URL(window.url()).origin;

  const desktopBeforeHide = await app.evaluate(({ BrowserWindow }) => {
    const windows = BrowserWindow.getAllWindows();
    return {
      windowCount: windows.length,
      visible: windows[0]?.isVisible() || false,
      backgroundThrottling: windows[0]?.webContents.getBackgroundThrottling()
    };
  });
  assert.equal(desktopBeforeHide.windowCount, 1);
  assert.equal(desktopBeforeHide.visible, true);
  assert.equal(desktopBeforeHide.backgroundThrottling, false);

  await app.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.close();
  });
  await new Promise(resolve => setTimeout(resolve, 150));
  const desktopAfterClose = await app.evaluate(({ BrowserWindow }) => {
    const windows = BrowserWindow.getAllWindows();
    return {
      windowCount: windows.length,
      visible: windows[0]?.isVisible() || false,
      destroyed: windows[0]?.isDestroyed() ?? true
    };
  });
  assert.deepEqual(desktopAfterClose, {
    windowCount: 1,
    visible: false,
    destroyed: false
  });
  const health = await fetch(`${serviceOrigin}/api/health`);
  assert.equal(health.ok, true);

  await app.evaluate(({ app }) => {
    app.emit('second-instance', {}, [], process.cwd(), {});
  });
  await new Promise(resolve => setTimeout(resolve, 150));
  const desktopAfterRestore = await app.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0];
    return {
      visible: window?.isVisible() || false
    };
  });
  assert.equal(desktopAfterRestore.visible, true);

  await app.close();
  app = null;

  await assert.doesNotReject(fs.access(path.join(dataRoot, 'backups')));
  await assert.doesNotReject(fs.access(path.join(dataRoot, 'credentials')));
  await assert.doesNotReject(fs.access(path.join(tempRoot, 'logs', 'desktop.log')));
} finally {
  if (app) await app.close().catch(() => {});
  await fs.rm(tempRoot, { recursive: true, force: true });
}

console.log(`PASS ${packagedExe ? 'packaged Windows app' : 'Electron desktop shell'} loads FinLens with isolated user data`);
