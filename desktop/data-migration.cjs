const fs = require('node:fs');
const path = require('node:path');

function copyMissing(source, target, copied) {
  if (!fs.existsSync(source)) return;
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    fs.mkdirSync(target, { recursive: true });
    for (const name of fs.readdirSync(source)) {
      copyMissing(path.join(source, name), path.join(target, name), copied);
    }
    return;
  }
  if (fs.existsSync(target)) return;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
  copied.push(target);
}

function migrateLegacyUserData({ appRoot, userDataDir, legacyDataDirs = [] }) {
  if (!appRoot || !userDataDir) return [];
  const targetData = path.resolve(userDataDir, 'data');
  const sourceDataDirs = [
    path.resolve(appRoot, 'data'),
    ...legacyDataDirs.filter(Boolean).map(dir => path.resolve(dir))
  ];
  const copied = [];
  for (const sourceData of [...new Set(sourceDataDirs)]) {
    if (sourceData.toLowerCase() === targetData.toLowerCase()) continue;
    for (const name of ['backups', 'credentials']) {
      copyMissing(path.join(sourceData, name), path.join(targetData, name), copied);
    }
  }
  return copied;
}

module.exports = { migrateLegacyUserData };
