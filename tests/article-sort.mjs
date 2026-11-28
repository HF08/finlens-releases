import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const pwRequire = createRequire(process.env.PW_BASE || 'C:/Users/NORA/.workbuddy/binaries/node/workspace/');
const { chromium } = pwRequire('playwright-core');
const BASE = process.env.FINLENS_TEST_BASE || 'http://127.0.0.1:8787';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

try {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelectorAll('#articleList .acard').length >= 5);

  const options = await page.locator('#articleSort option').evaluateAll(nodes =>
    nodes.map(node => node.value));
  assert.ok(options.includes('title-asc'), `missing title-asc: ${options.join(', ')}`);
  assert.ok(options.includes('title-desc'), `missing title-desc: ${options.join(', ')}`);

  const expectedAsc = await page.evaluate(() =>
    ARTICLES.map(article => article.title).sort((left, right) =>
      left.localeCompare(right, 'en', { sensitivity: 'base', numeric: true })));
  await page.selectOption('#articleSort', 'title-asc');
  const ascending = await page.locator('#articleList .acard-title').allTextContents();
  assert.deepEqual(ascending, expectedAsc);

  await page.selectOption('#articleSort', 'title-desc');
  const descending = await page.locator('#articleList .acard-title').allTextContents();
  assert.deepEqual(descending, expectedAsc.slice().reverse());
  console.log('Article title sorting passed');
} finally {
  await browser.close();
}
