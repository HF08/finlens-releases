const {
  app,
  BrowserWindow,
  dialog,
  Menu,
  shell,
  Tray
} = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const {
  readWindowState,
  writeWindowState
} = require('./window-state.cjs');
const { migrateLegacyUserData } = require('./data-migration.cjs');
const { createUpdateController } = require('./updater.cjs');

app.setName('FinLens');
if (process.env.FINLENS_USER_DATA_DIR) {
  app.setPath('userData', path.resolve(process.env.FINLENS_USER_DATA_DIR));
}
const DESKTOP_SERVICE_PORT = Number(process.env.FINLENS_DESKTOP_PORT || 47887);

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
}

let mainWindow = null;
let localService = null;
let serviceOrigin = '';
let quitting = false;
let logFile = '';
let updateController = null;
let tray = null;

function appendLog(message) {
  if (!logFile) return;
  try {
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${message}\n`, 'utf8');
  } catch {}
}

function resolveRuntimePaths() {
  const packaged = app.isPackaged;
  const userDataDir = app.getPath('userData');
  const appRoot = packaged ? app.getAppPath() : path.resolve(__dirname, '..');
  const dataRoot = process.env.FINLENS_DATA_DIR
    ? path.resolve(process.env.FINLENS_DATA_DIR)
    : path.join(userDataDir, 'data');
  const dictionaryPath = packaged
    ? path.join(process.resourcesPath, 'dictionary', 'ecdict.sqlite')
    : path.join(appRoot, 'data', 'dictionary', 'ecdict.sqlite');
  logFile = path.join(path.dirname(dataRoot), 'logs', 'desktop.log');
  return { packaged, userDataDir, appRoot, dataRoot, dictionaryPath };
}

async function waitForHealth(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(1500) });
      if (response.ok) return await response.json();
      lastError = new Error(`health HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw lastError || new Error('本地服务启动超时');
}

function startupErrorHtml(error, runtime) {
  const message = String(error?.stack || error?.message || error);
  return `<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<title>FinLens 启动失败</title>
<body style="margin:0;background:#f6f4ee;color:#172033;font:14px/1.7 system-ui,'Segoe UI',sans-serif">
  <main style="max-width:760px;margin:12vh auto;padding:32px;border:1px solid #d8dbe2;border-radius:10px;background:#fff">
    <h1 style="margin:0 0 12px;font-size:24px">FinLens 启动失败</h1>
    <p>本地服务没有成功启动。请关闭应用后重试；如果仍然失败，请把日志文件发给开发者。</p>
    <p><strong>数据目录：</strong><code>${escapeHtml(runtime.dataRoot)}</code></p>
    <p><strong>日志文件：</strong><code>${escapeHtml(logFile)}</code></p>
    <pre style="white-space:pre-wrap;padding:14px;border-radius:8px;background:#f3f4f6;color:#3b4354">${escapeHtml(message)}</pre>
  </main>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function startService(runtime) {
  const serverEntry = path.join(runtime.appRoot, 'server', 'server.mjs');
  const module = await import(pathToFileURL(serverEntry).href);
  if (typeof module.startFinLensServer !== 'function') {
    throw new Error('服务模块缺少 startFinLensServer 导出');
  }
  const instance = await module.startFinLensServer({
    host: '127.0.0.1',
    port: Number.isInteger(DESKTOP_SERVICE_PORT) ? DESKTOP_SERVICE_PORT : 47887,
    appRoot: runtime.appRoot,
    dataRoot: runtime.dataRoot,
    dictionaryPath: runtime.dictionaryPath
  });
  await waitForHealth(instance.url);
  serviceOrigin = new URL(instance.url).origin;
  return instance;
}

function attachWindowStatePersistence(win, userDataDir) {
  let saveTimer = null;
  const scheduleSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveWindowState(win, userDataDir), 250);
  };
  win.on('resize', scheduleSave);
  win.on('move', scheduleSave);
  win.on('maximize', scheduleSave);
  win.on('unmaximize', scheduleSave);
  win.on('close', () => {
    clearTimeout(saveTimer);
    saveWindowState(win, userDataDir);
  });
}

function saveWindowState(win, userDataDir) {
  if (!win || win.isDestroyed()) return;
  const bounds = win.isMaximized() ? win.getNormalBounds() : win.getBounds();
  writeWindowState(userDataDir, {
    ...bounds,
    maximized: win.isMaximized()
  });
}

function installNavigationGuards(win) {
  win.webContents.on('will-navigate', (event, targetUrl) => {
    try {
      if (new URL(targetUrl).origin !== serviceOrigin) {
        event.preventDefault();
        if (/^https?:/i.test(targetUrl)) shell.openExternal(targetUrl);
      }
    } catch {
      event.preventDefault();
    }
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function hideMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide();
}

async function createMainWindow(runtime) {
  const state = readWindowState(runtime.userDataDir);
  const iconPath = path.join(runtime.appRoot, 'desktop', 'assets', 'icon.png');
  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    backgroundColor: '#f6f4ee',
    ...(fs.existsSync(iconPath) ? { icon: iconPath } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false
    }
  });
  if (state.maximized) mainWindow.maximize();
  attachWindowStatePersistence(mainWindow, runtime.userDataDir);
  installNavigationGuards(mainWindow);
  mainWindow.once('ready-to-show', showMainWindow);
  mainWindow.on('close', event => {
    if (quitting) return;
    event.preventDefault();
    hideMainWindow();
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  try {
    localService = await startService(runtime);
    await mainWindow.loadURL(localService.url);
  } catch (error) {
    appendLog(`startup failed: ${error?.stack || error}`);
    await mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(startupErrorHtml(error, runtime))}`);
    mainWindow.show();
  }
}

function createTray(runtime) {
  const iconPath = path.join(runtime.appRoot, 'desktop', 'assets', 'icon.png');
  tray = new Tray(iconPath);
  tray.setToolTip('FinLens 财经精读工作台');
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: '显示 FinLens',
      click: showMainWindow
    },
    {
      label: '隐藏到后台',
      click: hideMainWindow
    },
    { type: 'separator' },
    {
      label: '检查更新',
      click: () => {
        showMainWindow();
        updateController?.checkForUpdates({ manual: true });
      }
    },
    {
      label: '打开数据目录',
      click: () => shell.openPath(path.dirname(runtime.dataRoot))
    },
    { type: 'separator' },
    {
      label: '退出 FinLens',
      click: () => app.quit()
    }
  ]));
  tray.on('click', showMainWindow);
  tray.on('double-click', showMainWindow);
}

function installApplicationMenu(runtime) {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '隐藏到后台',
          click: hideMainWindow
        },
        { role: 'quit', label: '退出 FinLens' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '检查更新',
          click: () => updateController?.checkForUpdates({ manual: true })
        },
        {
          label: '打开数据目录',
          click: () => shell.openPath(path.dirname(runtime.dataRoot))
        }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.on('second-instance', () => {
  showMainWindow();
});

app.whenReady().then(async () => {
  const runtime = resolveRuntimePaths();
  fs.mkdirSync(runtime.dataRoot, { recursive: true });
  const migrated = migrateLegacyUserData({
    appRoot: runtime.appRoot,
    userDataDir: runtime.userDataDir,
    legacyDataDirs: String(process.env.FINLENS_LEGACY_DATA_DIR || '')
      .split(path.delimiter)
      .map(dir => dir.trim())
      .filter(Boolean)
  });
  if (migrated.length) {
    appendLog(`migrated legacy user data files: ${migrated.join(', ')}`);
  }
  appendLog(`starting appRoot=${runtime.appRoot} dataRoot=${runtime.dataRoot}`);
  autoUpdater.logger = {
    info: message => appendLog(`[updater] ${message}`),
    warn: message => appendLog(`[updater:warn] ${message}`),
    error: message => appendLog(`[updater:error] ${message}`),
    debug: message => appendLog(`[updater:debug] ${message}`)
  };
  updateController = createUpdateController({
    autoUpdater,
    isPackaged: app.isPackaged,
    appVersion: app.getVersion(),
    dialog,
    getWindow: () => mainWindow,
    log: appendLog
  });
  installApplicationMenu(runtime);
  createTray(runtime);
  await createMainWindow(runtime);
  if (process.env.FINLENS_DISABLE_AUTO_UPDATE !== '1') {
    updateController.scheduleAutomaticCheck(5000);
  }
});

app.on('window-all-closed', () => {
  if (!tray) app.quit();
});

app.on('before-quit', (event) => {
  updateController?.dispose();
  updateController = null;
  if (!localService || quitting) return;
  event.preventDefault();
  quitting = true;
  localService.close()
    .catch(error => appendLog(`service close failed: ${error?.stack || error}`))
    .finally(() => app.quit());
});

app.on('will-quit', () => {
  if (tray) tray.destroy();
  tray = null;
});

process.on('uncaughtException', error => {
  appendLog(`uncaught exception: ${error?.stack || error}`);
  if (!app.isReady()) {
    dialog.showErrorBox('FinLens 启动失败', String(error?.stack || error));
  }
});
