const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('finlensDesktop', Object.freeze({
  platform: process.platform,
  version: process.versions.electron
}));
