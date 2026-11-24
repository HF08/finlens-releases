/* Windows desktop packaging configuration and resources. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const config = yaml.load(fs.readFileSync('electron-builder.yml', 'utf8'));
const icon = fs.readFileSync(path.join('desktop', 'assets', 'icon.png'));
const ico = fs.readFileSync(path.join('desktop', 'assets', 'icon.ico'));
const dictionary = path.resolve('data', 'dictionary', 'ecdict.sqlite');

assert.equal(pkg.main, 'desktop/main.cjs');
assert.equal(pkg.author, 'FINLENS');
assert.match(pkg.description, /FinLens/);
assert.ok(pkg.dependencies['electron-updater']);
assert.equal(pkg.scripts['desktop:dev'], 'electron .');
assert.equal(config.appId, 'com.finlens.desktop');
assert.equal(config.productName, 'FinLens');
assert.equal(config.asar, true);
assert.equal(config.publish.provider, 'github');
assert.equal(config.publish.owner, 'HF08');
assert.equal(config.publish.repo, 'finlens-releases');
assert.equal(config.win.target[0].target, 'nsis');
assert.equal(config.win.target[0].arch[0], 'x64');
assert.equal(config.nsis.oneClick, false);
assert.equal(config.nsis.perMachine, false);
assert.equal(config.nsis.allowElevation, false);
assert.equal(config.nsis.deleteAppDataOnUninstall, false);
assert.equal(config.win.icon, 'desktop/assets/icon.ico');
assert.equal(config.win.artifactName, 'FinLens-${version}-${arch}-Setup.${ext}');
assert.ok(Array.isArray(config.files));
assert.ok(!config.files.some(item => /tests|shots|backups|credentials|\.env/i.test(item)));
assert.ok(config.extraResources.some(item => item.from === 'data/dictionary/ecdict.sqlite'));
assert.equal(icon.subarray(1, 4).toString(), 'PNG');
assert.equal(icon.readUInt32BE(16), 1024);
assert.equal(icon.readUInt32BE(20), 1024);
assert.equal(ico.readUInt16LE(0), 0);
assert.equal(ico.readUInt16LE(2), 1);
assert.equal(ico.readUInt16LE(4), 7);
for (let index = 0; index < 7; index += 1) {
  const entry = 6 + index * 16;
  const length = ico.readUInt32LE(entry + 8);
  const offset = ico.readUInt32LE(entry + 12);
  assert.equal(ico.subarray(offset, offset + 8).toString('hex'), '89504e470d0a1a0a');
  assert.ok(length > 0 && offset + length <= ico.length);
}
assert.ok(fs.existsSync(dictionary));
assert.ok(fs.statSync(dictionary).size > 1024 * 1024);
assert.match(fs.readFileSync('.gitignore', 'utf8'), /^release\/$/m);
assert.ok(fs.existsSync('desktop/main.cjs'));

console.log('PASS Windows packaging configuration and resources');
