/* Verify the generated unsigned Windows installer and its checksum. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const installerName = `FinLens-${pkg.version}-x64-Setup.exe`;
const installer = path.resolve('release', installerName);
const checksumFile = `${installer}.sha256`;

if (!fs.existsSync(installer)) throw new Error(`缺少安装包：${installer}`);
if (!fs.existsSync(checksumFile)) throw new Error(`缺少校验文件：${checksumFile}`);
if (fs.statSync(installer).size < 50 * 1024 * 1024) {
  throw new Error('安装包体积异常，疑似构建不完整');
}

const expectedHash = fs.readFileSync(checksumFile, 'utf8').trim().split(/\s+/)[0];
const actualHash = crypto.createHash('sha256').update(fs.readFileSync(installer)).digest('hex');
if (expectedHash !== actualHash) {
  throw new Error(`SHA-256 不匹配：expected=${expectedHash} actual=${actualHash}`);
}

const latest = yaml.load(fs.readFileSync(path.resolve('release', 'latest.yml'), 'utf8'));
if (latest.version !== pkg.version || latest.path !== installerName) {
  throw new Error(`latest.yml 与当前版本不一致：${latest.version} / ${latest.path}`);
}
const updateConfigPath = path.resolve('release', 'win-unpacked', 'resources', 'app-update.yml');
const updateConfig = yaml.load(fs.readFileSync(updateConfigPath, 'utf8'));
if (updateConfig.provider !== 'github' || updateConfig.owner !== 'HF08' || updateConfig.repo !== 'finlens-releases') {
  throw new Error('打包应用的更新源配置不正确');
}

const quote = value => `'${String(value).replace(/'/g, "''")}'`;
const powershell = path.join(
  process.env.SystemRoot || 'C:\\Windows',
  'System32',
  'WindowsPowerShell',
  'v1.0',
  'powershell.exe'
);
const signature = spawnSync(powershell, [
  '-NoProfile',
  '-NonInteractive',
  '-Command',
  `Import-Module Microsoft.PowerShell.Security -Force; (Get-AuthenticodeSignature ${quote(installer)}).Status.ToString()`
], {
  encoding: 'utf8',
  env: {
    ...process.env,
    PSModulePath: path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'Modules')
  }
});
if (signature.status !== 0) {
  throw new Error(signature.stderr || '无法读取 Authenticode 状态');
}
const signatureStatus = signature.stdout.trim();
if (signatureStatus !== 'NotSigned') {
  throw new Error(`首版必须为未签名测试包，实际状态：${signatureStatus}`);
}

console.log(`PASS unsigned installer and SHA-256: ${installerName}`);
