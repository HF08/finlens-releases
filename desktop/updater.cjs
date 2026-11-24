function createUpdateController({
  autoUpdater,
  isPackaged,
  appVersion,
  dialog,
  getWindow,
  log = () => {},
  schedule = setTimeout,
  cancelSchedule = clearTimeout
}) {
  let autoCheckTimer = null;
  let checking = false;
  let manualCheckPending = false;
  let promptOpen = false;
  let disposed = false;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;

  function activeWindow() {
    const window = getWindow?.();
    return window && !window.isDestroyed?.() ? window : null;
  }

  function showMessage(options) {
    const window = activeWindow();
    return window
      ? dialog.showMessageBox(window, options)
      : dialog.showMessageBox(options);
  }

  function setProgress(value) {
    try {
      activeWindow()?.setProgressBar(value);
    } catch {}
  }

  async function handleAvailable(info = {}) {
    if (promptOpen || disposed) return;
    promptOpen = true;
    try {
      const version = String(info.version || '新版本');
      const result = await showMessage({
        type: 'info',
        title: '发现 FinLens 更新',
        message: `FinLens ${version} 已可用`,
        detail: '更新只替换旧版程序，学习数据保存在 %APPDATA%\\FinLens，不会被删除。是否现在下载？',
        buttons: ['下载更新', '稍后'],
        defaultId: 0,
        cancelId: 1,
        noLink: true
      });
      if (result.response === 0) {
        log(`update download started: ${version}`);
        await autoUpdater.downloadUpdate();
      }
    } catch (error) {
      log(`update download failed: ${error?.stack || error}`);
    } finally {
      manualCheckPending = false;
      promptOpen = false;
    }
  }

  async function handleNotAvailable(info = {}) {
    if (!manualCheckPending || disposed) return;
    manualCheckPending = false;
    setProgress(-1);
    try {
      await showMessage({
        type: 'info',
        title: 'FinLens 已是最新版本',
        message: `当前版本：${appVersion}`,
        detail: info.version ? `更新通道最新版本：${info.version}` : '',
        buttons: ['知道了'],
        defaultId: 0,
        noLink: true
      });
    } catch {}
  }

  async function handleDownloaded(info = {}) {
    if (promptOpen || disposed) return;
    promptOpen = true;
    setProgress(-1);
    try {
      const version = String(info.version || '新版本');
      const result = await showMessage({
        type: 'info',
        title: 'FinLens 更新已下载',
        message: `FinLens ${version} 已准备完成`,
        detail: '立即重启会替换旧版程序并保留学习数据；也可以稍后在退出应用时安装。',
        buttons: ['立即重启', '稍后'],
        defaultId: 0,
        cancelId: 1,
        noLink: true
      });
      if (result.response === 0) {
        log(`update install requested: ${version}`);
        autoUpdater.quitAndInstall(false, true);
      }
    } catch (error) {
      log(`update install prompt failed: ${error?.stack || error}`);
    } finally {
      promptOpen = false;
    }
  }

  function handleProgress(info = {}) {
    const percent = Number(info.percent);
    if (!Number.isFinite(percent)) return;
    setProgress(Math.max(0, Math.min(1, percent / 100)));
  }

  async function handleError(error) {
    setProgress(-1);
    log(`update check failed: ${error?.stack || error}`);
    if (!manualCheckPending || disposed) return;
    manualCheckPending = false;
    try {
      await showMessage({
        type: 'error',
        title: '检查更新失败',
        message: '暂时无法连接更新服务',
        detail: String(error?.message || error || '请稍后重试'),
        buttons: ['知道了'],
        defaultId: 0,
        noLink: true
      });
    } catch {}
  }

  async function checkForUpdates({ manual = false } = {}) {
    if (!isPackaged) {
      if (manual && !disposed) {
        try {
          await showMessage({
            type: 'info',
            title: '检查更新',
            message: '开发模式不检查更新，请在安装版应用中使用',
            detail: '请在安装版应用中使用更新功能。',
            buttons: ['知道了'],
            defaultId: 0,
            noLink: true
          });
        } catch {}
      }
      return { status: 'development' };
    }
    if (disposed) return { status: 'disposed' };
    if (checking) return { status: 'checking' };
    manualCheckPending = manualCheckPending || manual;
    checking = true;
    try {
      await autoUpdater.checkForUpdates();
      return { status: 'checking' };
    } catch (error) {
      await handleError(error);
      return { status: 'error', error };
    } finally {
      checking = false;
    }
  }

  function scheduleAutomaticCheck(delayMs = 5000) {
    if (!isPackaged || disposed) return;
    if (autoCheckTimer) cancelSchedule(autoCheckTimer);
    autoCheckTimer = schedule(() => {
      autoCheckTimer = null;
      checkForUpdates({ manual: false }).catch(error => log(`automatic update check failed: ${error?.stack || error}`));
    }, delayMs);
  }

  autoUpdater.on('update-available', handleAvailable);
  autoUpdater.on('update-not-available', handleNotAvailable);
  autoUpdater.on('update-downloaded', handleDownloaded);
  autoUpdater.on('download-progress', handleProgress);
  autoUpdater.on('error', handleError);

  function dispose() {
    disposed = true;
    if (autoCheckTimer) cancelSchedule(autoCheckTimer);
    autoCheckTimer = null;
    autoUpdater.removeListener('update-available', handleAvailable);
    autoUpdater.removeListener('update-not-available', handleNotAvailable);
    autoUpdater.removeListener('update-downloaded', handleDownloaded);
    autoUpdater.removeListener('download-progress', handleProgress);
    autoUpdater.removeListener('error', handleError);
  }

  return {
    checkForUpdates,
    scheduleAutomaticCheck,
    dispose
  };
}

module.exports = { createUpdateController };
