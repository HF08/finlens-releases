# FinLens Windows Installer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify an unsigned Windows x64 NSIS installer that runs FinLens locally without requiring a separately installed Node.js runtime.

**Architecture:** Electron starts the existing FinLens HTTP service in its main process on a random loopback port, supplies a per-user writable data directory, and loads the existing Web UI in a hardened BrowserWindow. electron-builder packages the app, built-in ECDICT snapshot, icon, and NSIS per-user installer.

**Tech Stack:** Electron, electron-builder, NSIS, Node.js 22.5+, Playwright Electron, existing FinLens server and frontend.

**Spec:** `docs/superpowers/specs/2026-11-11-windows-installer-design.md`

## Global Constraints

- Product name: `FinLens`
- Metadata publisher/product owner: `FINLENS`
- App ID: `com.finlens.desktop`
- Target platform: Windows x64 only.
- Installer mode: per-user NSIS, no administrator elevation.
- First release is explicitly unsigned; `Get-AuthenticodeSignature` must report `NotSigned`.
- User data root: `%APPDATA%\FinLens`.
- Local service host: `127.0.0.1`, random port.
- The service must never listen on `0.0.0.0`.
- The ECDICT database is bundled read-only; build fails if `data/dictionary/ecdict.sqlite` is missing.
- The repository must never contain credentials, signing secrets, backups, caches, or user data.
- Existing `node server/server.mjs` command-line behavior must keep working on port `8787`.

---

### Task 1: Make the Server Embeddable with an Isolated Data Root

**Files:**
- Modify: `server/server.mjs`
- Create: `tests/server-embed.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `startFinLensServer(options) -> Promise<{ url: string, port: number, close(): Promise<void> }>`
- Options: `{ appRoot?: string, dataRoot?: string, dictionaryPath?: string, host?: string, port?: number }`
- `appRoot` is the read-only application directory.
- `dataRoot` contains `backups/`, `cache/`, `credentials/`, and `tmp/`.

- [ ] **Step 1: Write the failing embedded-server test**

```javascript
/* tests/server-embed.mjs */
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
} finally {
  await instance.close();
  await fs.rm(dataRoot, { recursive: true, force: true });
}

console.log('PASS embedded server uses a random loopback port and isolated data root');
```

- [ ] **Step 2: Run the test to confirm it fails**

Run:

```powershell
node tests/server-embed.mjs
```

Expected: FAIL because `server/server.mjs` has no named `startFinLensServer` export.

- [ ] **Step 3: Refactor server paths and request handler**

In `server/server.mjs`, replace module-level writable-path constants with runtime configuration:

```javascript
const DEFAULT_APP_ROOT = path.resolve(__dirname, '..');
let APP_ROOT = process.env.FINLENS_APP_ROOT
  ? path.resolve(process.env.FINLENS_APP_ROOT)
  : DEFAULT_APP_ROOT;
let DATA_ROOT = process.env.FINLENS_DATA_DIR
  ? path.resolve(process.env.FINLENS_DATA_DIR)
  : path.join(APP_ROOT, 'data');
let ECDICT_DB_PATH = process.env.ECDICT_DB || path.join(DATA_ROOT, 'dictionary', 'ecdict.sqlite');
let BACKUP_DIR = path.resolve(process.env.FINLENS_BACKUP_DIR || path.join(DATA_ROOT, 'backups'));
let CREDENTIAL_DIR = path.resolve(process.env.FINLENS_CREDENTIAL_DIR || path.join(DATA_ROOT, 'credentials'));
let CREDENTIAL_FILE = path.join(CREDENTIAL_DIR, 'credentials.json');

function configureRuntimePaths({ appRoot, dataRoot, dictionaryPath } = {}) {
  if (appRoot) APP_ROOT = path.resolve(appRoot);
  if (dataRoot) DATA_ROOT = path.resolve(dataRoot);
  ECDICT_DB_PATH = path.resolve(dictionaryPath || path.join(DATA_ROOT, 'dictionary', 'ecdict.sqlite'));
  BACKUP_DIR = path.join(DATA_ROOT, 'backups');
  CREDENTIAL_DIR = path.join(DATA_ROOT, 'credentials');
  CREDENTIAL_FILE = path.join(CREDENTIAL_DIR, 'credentials.json');
  fs.mkdirSync(DATA_ROOT, { recursive: true });
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  fs.mkdirSync(CREDENTIAL_DIR, { recursive: true, mode: 0o700 });
}
```

Replace remaining writable `ROOT/data` references with `DATA_ROOT`, including GitHub EPUB cache and PDF temporary files. Replace static-file resolution with `APP_ROOT`.

Extract the existing `http.createServer(async (req, res) => { ... })` callback into:

```javascript
async function handleRequest(req, res) {
  // Existing request-handler body, unchanged except runtime path constants.
}
```

At the bottom, add:

```javascript
export async function startFinLensServer(options = {}) {
  configureRuntimePaths(options);
  const host = options.host || '127.0.0.1';
  const port = Number.isInteger(options.port) ? options.port : Number(process.env.PORT || 8787);
  const server = http.createServer(handleRequest);

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });

  const address = server.address();
  const actualPort = typeof address === 'object' && address ? address.port : port;
  return {
    url: `http://${host}:${actualPort}`,
    port: actualPort,
    close: () => new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    })
  };
}

const isDirectRun = process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  startFinLensServer({ port: Number(process.env.PORT || 8787) })
    .then(instance => {
      console.log(`FinLens 工作台已启动： ${instance.url}`);
      console.log(`引擎 Key：${KEY ? '已通过环境变量配置' : '未配置（离线模式可用，在线标注需在页面设置中填 Key）'}`);
    })
    .catch(error => {
      console.error(error);
      process.exitCode = 1;
    });
}
```

- [ ] **Step 4: Run focused server tests**

Run:

```powershell
node tests/server-embed.mjs
node tests/feedback-v2.mjs
```

Expected: embedded test PASS; existing feedback test remains PASS.

- [ ] **Step 5: Add the test to npm scripts and commit**

Add `node tests/server-embed.mjs` before `node tests/verify.mjs` in `package.json`.

Run:

```powershell
git add server/server.mjs tests/server-embed.mjs package.json
git commit -m "feat: make local service embeddable"
```

---

### Task 2: Add the Electron Application Shell

**Files:**
- Create: `desktop/main.cjs`
- Create: `desktop/preload.cjs`
- Create: `desktop/window-state.cjs`
- Modify: `package.json`
- Create: `tests/window-state.cjs.test.mjs`

**Interfaces:**
- `readWindowState(userDataDir) -> { width, height, x?, y?, maximized }`
- `writeWindowState(userDataDir, state) -> void`
- Electron main dynamically imports `startFinLensServer` from `server/server.mjs`.
- Preload exposes only `window.finlensDesktop = { platform, version }`.

- [ ] **Step 1: Write the failing window-state test**

```javascript
/* tests/window-state.cjs.test.mjs */
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
```

- [ ] **Step 2: Run the test to confirm it fails**

Run:

```powershell
node tests/window-state.cjs.test.mjs
```

Expected: FAIL because `desktop/window-state.cjs` does not exist.

- [ ] **Step 3: Implement window-state helpers**

Implementation requirements:

- State file: `desktop-state.json` under the Electron user data directory.
- Defaults: `1440x900`, not maximized.
- Clamp width to `1100-3840`, height to `720-2160`.
- Ignore malformed JSON and return defaults.
- Write atomically via a temporary file and rename.

- [ ] **Step 4: Implement the Electron main process**

`desktop/main.cjs` must:

```javascript
const { app, BrowserWindow, dialog, shell, session } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
```

- Acquire `app.requestSingleInstanceLock()`.
- Set the app name to `FinLens`.
- Resolve `appRoot` as:
  - development: repository root.
  - packaged: `app.getAppPath()`.
- Resolve `dataRoot`:
  - `process.env.FINLENS_DATA_DIR` when supplied by tests.
  - otherwise `path.join(app.getPath('userData'), 'data')`.
- Resolve dictionary path:
  - development: `data/dictionary/ecdict.sqlite`.
  - packaged: `path.join(process.resourcesPath, 'dictionary', 'ecdict.sqlite')`.
- Dynamically import `server/server.mjs` from `appRoot`.
- Start the service with `{ host: '127.0.0.1', port: 0, appRoot, dataRoot, dictionaryPath }`.
- Create the BrowserWindow only after the health endpoint responds.
- BrowserWindow options:

```javascript
{
  show: false,
  backgroundColor: '#f6f4ee',
  webPreferences: {
    preload: path.join(__dirname, 'preload.cjs'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true
  }
}
```

- Save and restore window state.
- Deny navigation to any URL whose origin differs from the local service.
- Send `window.open` and external `http/https` links to `shell.openExternal`.
- On service startup failure, show a local error page with the data directory and log path.
- On app quit, close the local service before exiting.

- [ ] **Step 5: Implement the minimal preload bridge**

```javascript
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('finlensDesktop', Object.freeze({
  platform: process.platform,
  version: process.versions.electron
}));
```

- [ ] **Step 6: Run focused tests and commit**

Run:

```powershell
node tests/window-state.cjs.test.mjs
node tests/server-embed.mjs
```

Expected: both PASS.

Run:

```powershell
git add desktop tests/window-state.cjs.test.mjs package.json
git commit -m "feat: add Electron desktop shell"
```

---

### Task 3: Add Packaging Configuration, Icon, and Build Resource Checks

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `electron-builder.yml`
- Create: `desktop/assets/icon.png`
- Create: `scripts/check-desktop-resources.mjs`
- Create: `tests/desktop-packaging.mjs`
- Modify: `.gitignore`

**Interfaces:**
- `npm run desktop:check` validates package configuration and bundled resources.
- `npm run desktop:build` runs resource checks and produces an unsigned NSIS installer.

- [ ] **Step 1: Copy the supplied icon into the repository**

Source:

```text
D:\NORA\Documents\2026-11-11-11-58-23\finlens-icon-clean.png
```

Destination:

```text
desktop/assets/icon.png
```

Do not alter the source image. electron-builder will derive Windows icon sizes from the 1024px PNG.

- [ ] **Step 2: Write the failing packaging test**

The test verifies:

- `package.json.main === "desktop/main.cjs"`.
- `build.appId === "com.finlens.desktop"`.
- `build.productName === "FinLens"`.
- `build.win.target` contains `nsis`.
- `build.nsis.perMachine === false`.
- `build.nsis.oneClick === false`.
- `desktop/assets/icon.png` exists and is larger than 10KB.
- `data/dictionary/ecdict.sqlite` exists.
- Test files, screenshots, backups, credentials, caches, and `.env` files are not included in the packaged file list.

- [ ] **Step 3: Run the test to confirm it fails**

Run:

```powershell
node tests/desktop-packaging.mjs
```

Expected: FAIL because the desktop build configuration does not exist.

- [ ] **Step 4: Install Electron build dependencies**

Run:

```powershell
npm install --save-dev electron electron-builder
```

Pin the resolved versions in `package-lock.json`. Confirm the selected Electron runtime reports Node.js `>=22.5` before continuing.

- [ ] **Step 5: Add electron-builder configuration**

`electron-builder.yml` must contain:

```yaml
appId: com.finlens.desktop
productName: FinLens
asar: true
directories:
  output: release
  buildResources: desktop/assets
files:
  - index.html
  - src/**/*
  - server/**/*
  - data/articles.js
  - data/dictionary/*.json
  - data/dictionary/*.md
  - data/dictionary/*.txt
  - desktop/**/*
  - package.json
extraResources:
  - from: data/dictionary/ecdict.sqlite
    to: dictionary/ecdict.sqlite
win:
  target:
    - target: nsis
      arch:
        - x64
  icon: desktop/assets/icon.png
  artifactName: FinLens-${version}-x64-Setup.${ext}
  requestedExecutionLevel: asInvoker
nsis:
  oneClick: false
  perMachine: false
  allowElevation: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
  deleteAppDataOnUninstall: false
```

- [ ] **Step 6: Add resource validation**

`scripts/check-desktop-resources.mjs` must fail with a concrete message when:

- the icon is missing.
- the dictionary SQLite snapshot is missing.
- `package.json` product metadata does not match the spec.
- a forbidden development or secret path is present in the electron-builder configuration.

- [ ] **Step 7: Add scripts and ignore generated output**

Add:

```json
"desktop:dev": "electron .",
"desktop:check": "node scripts/check-desktop-resources.mjs",
"desktop:build": "npm run desktop:check && electron-builder --win nsis --x64",
"desktop:verify": "node tests/desktop-packaging.mjs"
```

Add `release/` to `.gitignore`.

- [ ] **Step 8: Run packaging checks and commit**

Run:

```powershell
npm run desktop:check
node tests/desktop-packaging.mjs
```

Expected: both PASS.

Run:

```powershell
git add package.json package-lock.json electron-builder.yml desktop/assets/icon.png scripts/check-desktop-resources.mjs tests/desktop-packaging.mjs .gitignore
git commit -m "build: configure Windows desktop packaging"
```

---

### Task 4: Add an Electron Smoke Test and Build the Installer

**Files:**
- Create: `tests/desktop-smoke.mjs`
- Modify: `package.json`
- Generated: `release/FinLens-0.1.17-x64-Setup.exe`
- Generated: `release/FinLens-0.1.17-x64-Setup.exe.sha256`

**Interfaces:**
- Test launches Electron with a temporary `FINLENS_DATA_DIR`.
- The application window must load the FinLens knowledge library without JavaScript errors.

- [ ] **Step 1: Write the failing Electron smoke test**

The test must:

```javascript
const { _electron: electron } = require('playwright-core');
```

- Launch `electron` with `desktop/main.cjs`.
- Set `FINLENS_DATA_DIR` to a temporary directory.
- Wait for the first BrowserWindow.
- Assert the title contains `FinLens`.
- Assert the reader navigation contains `阅读台`.
- Navigate to the knowledge view.
- Assert at least one knowledge card renders.
- Assert no page errors.
- Close Electron and verify the temporary data directory contains `data/backups` and `data/credentials`.

- [ ] **Step 2: Run the smoke test before packaging**

Run:

```powershell
node tests/desktop-smoke.mjs
```

Expected: PASS against Electron development mode.

- [ ] **Step 3: Build the unsigned installer**

Run:

```powershell
npm run desktop:build
```

Expected:

- NSIS build exits `0`.
- `release/FinLens-0.1.17-x64-Setup.exe` exists.
- The installer is not zero bytes.

- [ ] **Step 4: Verify the unsigned artifact**

Run:

```powershell
$sig = Get-AuthenticodeSignature 'release\FinLens-0.1.17-x64-Setup.exe'
$sig.Status
```

Expected: `NotSigned`.

Generate checksum:

```powershell
Get-FileHash 'release\FinLens-0.1.17-x64-Setup.exe' -Algorithm SHA256 |
  ForEach-Object { "$($_.Hash.ToLower())  $([IO.Path]::GetFileName($_.Path))" } |
  Set-Content 'release\FinLens-0.1.17-x64-Setup.exe.sha256' -Encoding ascii
```

- [ ] **Step 5: Install and uninstall smoke test**

Run the installer interactively once and verify:

- no administrator elevation prompt.
- app appears in Start menu.
- app launches.
- `%APPDATA%\FinLens\data` exists.
- closing and reopening preserves a test learning state.
- uninstall removes the program but preserves `%APPDATA%\FinLens`.

- [ ] **Step 6: Add smoke test to package scripts and commit**

Add:

```json
"desktop:smoke": "node tests/desktop-smoke.mjs"
```

Run:

```powershell
git add tests/desktop-smoke.mjs package.json
git commit -m "test: verify packaged Electron runtime"
```

---

### Task 5: Update User Documentation and Release Metadata

**Files:**
- Modify: `README.md`
- Modify: `docs/native-app-feasibility.md`
- Create: `docs/windows-installer.md`

**Interfaces:**
- Documentation explains the unsigned warning, data location, upgrade behavior, and build commands.

- [ ] **Step 1: Document installation**

`docs/windows-installer.md` must state:

- Supported platform: Windows 10/11 x64.
- The build is unsigned.
- SmartScreen may show an unknown publisher warning.
- User data lives in `%APPDATA%\FinLens`.
- Uninstall keeps user data.
- PDF requires Microsoft Edge or Google Chrome.
- Online model and research features require network access.

- [ ] **Step 2: Document developer build and release**

Include exact commands:

```powershell
npm install
npm run desktop:check
npm run desktop:smoke
npm run desktop:build
```

Explain that `data/dictionary/ecdict.sqlite` is required and intentionally excluded from source control.

- [ ] **Step 3: Update README**

Add a Windows installer section near the existing quick-start section and link to `docs/windows-installer.md`.

- [ ] **Step 4: Run the complete regression**

Run:

```powershell
npm test
npm run desktop:check
npm run desktop:smoke
```

Expected: all existing suites PASS, desktop checks PASS, Electron smoke PASS.

- [ ] **Step 5: Commit documentation**

Run:

```powershell
git add README.md docs/native-app-feasibility.md docs/windows-installer.md
git commit -m "docs: add Windows installer guide"
```

---

## Final Verification Checklist

- [ ] `npm test` exits `0`.
- [ ] `npm run desktop:check` exits `0`.
- [ ] `npm run desktop:smoke` exits `0`.
- [ ] `npm run desktop:build` produces the NSIS installer.
- [ ] Installer Authenticode status is `NotSigned`.
- [ ] Installer does not request administrator privileges.
- [ ] Launching from Start menu opens FinLens.
- [ ] Local service listens only on `127.0.0.1`.
- [ ] User data is written under `%APPDATA%\FinLens`, not the install directory.
- [ ] Upgrade simulation preserves data.
- [ ] Uninstall preserves data.
- [ ] PDF, Markdown, CSV, model settings, import, vocabulary, knowledge, and archive flows remain usable.
- [ ] SHA-256 checksum is generated.
- [ ] Release notes label the installer “未签名测试版”.
