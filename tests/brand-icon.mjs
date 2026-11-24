/* Brand icon is shared by the app shell and browser tab. */
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const iconPath = 'src/assets/finlens-icon.png';
const markPath = 'src/assets/finlens-mark.png';
const icon = fs.readFileSync(iconPath);
const mark = fs.readFileSync(markPath);

assert.match(html, new RegExp(`rel="icon"[^>]+${iconPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
assert.match(html, new RegExp(`class="brand-mark"[^>]+${markPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
assert.equal(icon.subarray(1, 4).toString(), 'PNG');
assert.equal(icon.readUInt32BE(16), 128);
assert.equal(icon.readUInt32BE(20), 128);
assert.ok(icon.length < 64 * 1024);
assert.equal(mark.subarray(1, 4).toString(), 'PNG');
assert.equal(mark.readUInt32BE(16), 96);
assert.equal(mark.readUInt32BE(20), 96);
assert.ok(mark.length < 32 * 1024);

console.log('PASS FinLens brand icon is shared by the rail and favicon');
