/* Auto-update controller behavior without network or Electron runtime. */
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createUpdateController } = require('../desktop/updater.cjs');

class FakeUpdater extends EventEmitter {
  constructor() {
    super();
    this.autoDownload = true;
    this.autoInstallOnAppQuit = false;
    this.allowPrerelease = true;
    this.checkCalls = 0;
    this.downloadCalls = 0;
    this.quitCalls = [];
  }

  async checkForUpdates() {
    this.checkCalls += 1;
  }

  async downloadUpdate() {
    this.downloadCalls += 1;
  }

  quitAndInstall(...args) {
    this.quitCalls.push(args);
  }
}

const tick = () => new Promise(resolve => setImmediate(resolve));
const responses = [0, 0, 0];
const messages = [];
const progress = [];
const logs = [];
const updater = new FakeUpdater();
const controller = createUpdateController({
  autoUpdater: updater,
  isPackaged: true,
  appVersion: '0.1.17',
  dialog: {
    async showMessageBox(...args) {
      const options = args.at(-1);
      messages.push(options);
      return { response: responses.shift() ?? 1 };
    }
  },
  getWindow: () => ({
    isDestroyed: () => false,
    setProgressBar: value => progress.push(value)
  }),
  log: message => logs.push(message)
});

assert.equal(updater.autoDownload, false);
assert.equal(updater.autoInstallOnAppQuit, true);
assert.equal(updater.allowPrerelease, false);

await controller.checkForUpdates({ manual: true });
assert.equal(updater.checkCalls, 1);

updater.emit('update-available', { version: '0.1.18' });
await tick();
assert.equal(updater.downloadCalls, 1);
assert.match(messages[0].message, /0\.1\.18/);

updater.emit('download-progress', { percent: 42.4 });
assert.equal(progress.at(-1), 0.424);

updater.emit('update-downloaded', { version: '0.1.18' });
await tick();
assert.deepEqual(updater.quitCalls, [[false, true]]);
assert.equal(progress.at(-1), -1);

updater.emit('error', new Error('network unavailable'));
assert.ok(logs.some(line => line.includes('network unavailable')));

const devUpdater = new FakeUpdater();
const devMessages = [];
const devController = createUpdateController({
  autoUpdater: devUpdater,
  isPackaged: false,
  appVersion: '0.1.17',
  dialog: {
    async showMessageBox(...args) {
      const options = args.at(-1);
      devMessages.push(options);
      return { response: 0 };
    }
  },
  getWindow: () => null,
  log: () => {}
});
await devController.checkForUpdates({ manual: true });
assert.equal(devUpdater.checkCalls, 0);
assert.match(devMessages[0].message, /安装版/);

controller.dispose();
devController.dispose();
console.log('PASS desktop updater checks, prompts, downloads and installs');
