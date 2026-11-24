/* Write a SHA-256 checksum next to the generated Windows installer. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const filename = `FinLens-${pkg.version}-x64-Setup.exe`;
const installer = path.resolve('release', filename);
if (!fs.existsSync(installer)) {
  throw new Error(`找不到安装包：${installer}`);
}
const hash = crypto.createHash('sha256').update(fs.readFileSync(installer)).digest('hex');
const checksumFile = `${installer}.sha256`;
fs.writeFileSync(checksumFile, `${hash}  ${filename}\n`, 'ascii');
const tempIconDir = path.resolve('release', '.icon-ico');
if (fs.existsSync(tempIconDir)) {
  const releaseDir = path.resolve('release');
  const resolvedTemp = path.resolve(tempIconDir);
  if (!resolvedTemp.startsWith(releaseDir + path.sep)) {
    throw new Error(`拒绝清理越界目录：${resolvedTemp}`);
  }
  fs.rmSync(resolvedTemp, { recursive: true, force: true });
}
console.log(`PASS checksum written: ${checksumFile}`);
