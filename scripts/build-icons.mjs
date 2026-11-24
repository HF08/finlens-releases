/* Build a standard Windows multi-resolution ICO from the source PNG. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createCanvas, loadImage } = require('@napi-rs/canvas');

const sourcePath = path.resolve('desktop', 'assets', 'icon.png');
const targetPath = path.resolve('desktop', 'assets', 'icon.ico');
const sizes = [16, 24, 32, 48, 64, 128, 256];

if (!fs.existsSync(sourcePath)) {
  throw new Error(`缺少图标源文件：${sourcePath}`);
}

const source = await loadImage(sourcePath);
if (source.width < 512 || source.height < 512) {
  throw new Error('图标源文件必须至少为 512×512');
}

const pngFrames = sizes.map(size => {
  const canvas = createCanvas(size, size);
  const context = canvas.getContext('2d');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, 0, 0, size, size);
  return canvas.toBuffer('image/png');
});

const headerSize = 6 + sizes.length * 16;
let offset = headerSize;
const header = Buffer.alloc(headerSize);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);

sizes.forEach((size, index) => {
  const entry = 6 + index * 16;
  const png = pngFrames[index];
  header.writeUInt8(size >= 256 ? 0 : size, entry);
  header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
  header.writeUInt8(0, entry + 2);
  header.writeUInt8(0, entry + 3);
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(png.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += png.length;
});

const output = Buffer.concat([header, ...pngFrames]);
fs.writeFileSync(targetPath, output);
console.log(`PASS built ${targetPath} with ${sizes.length} PNG frames (${output.length} bytes)`);
