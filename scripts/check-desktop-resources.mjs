/* Validate Windows desktop build inputs before electron-builder runs. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');
const config = yaml.load(fs.readFileSync('electron-builder.yml', 'utf8'));
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const iconPath = path.resolve('desktop', 'assets', 'icon.png');
const icoPath = path.resolve('desktop', 'assets', 'icon.ico');
const dictionaryPath = path.resolve('data', 'dictionary', 'ecdict.sqlite');

if (!fs.existsSync(iconPath)) {
  throw new Error(`缺少 Windows 图标：${iconPath}`);
}
const icon = fs.readFileSync(iconPath);
if (icon.subarray(1, 4).toString() !== 'PNG' || icon.readUInt32BE(16) < 512 || icon.readUInt32BE(20) < 512) {
  throw new Error('Windows 图标必须是至少 512×512 的 PNG');
}
if (!fs.existsSync(icoPath)) {
  throw new Error(`缺少 Windows ICO 图标：${icoPath}`);
}
const ico = fs.readFileSync(icoPath);
if (ico.readUInt16LE(0) !== 0 || ico.readUInt16LE(2) !== 1 || ico.readUInt16LE(4) !== 7) {
  throw new Error('desktop/assets/icon.ico 不是有效的 ICO 文件');
}
if (!fs.existsSync(dictionaryPath)) {
  throw new Error(`缺少离线词典快照：${dictionaryPath}\n请先运行 npm run dictionary:build 或恢复 data/dictionary/ecdict.sqlite`);
}
if (fs.statSync(dictionaryPath).size < 1024 * 1024) {
  throw new Error('离线词典快照过小，疑似未完整构建');
}
if (pkg.main !== 'desktop/main.cjs') {
  throw new Error('package.json 的 main 必须指向 desktop/main.cjs');
}
if (pkg.version !== '0.3.1' || config.appId !== 'com.finlens.desktop' || config.productName !== 'FinLens') {
  throw new Error('桌面应用版本或产品元数据与发布规格不一致');
}
if (!config.extraResources?.some(item => item.from === 'data/dictionary/ecdict.sqlite')) {
  throw new Error('electron-builder 未配置离线词典 extraResources');
}
if (config.nsis?.perMachine !== false || config.nsis?.allowElevation !== false) {
  throw new Error('NSIS 必须按当前用户安装且不请求管理员权限');
}

console.log('PASS desktop resources: PNG/ICO icons, dictionary, metadata and NSIS settings');
