import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  buildMindMapPrompt,
  normalizeMindMap
} from '../server/server.mjs';

const pwRequire = createRequire(process.env.PW_BASE || 'C:/Users/NORA/.workbuddy/binaries/node/workspace/');
const { chromium } = pwRequire('playwright-core');
const BASE = process.env.FINLENS_TEST_BASE || 'http://127.0.0.1:8787';
const OUT = path.resolve('tests/shots');

const prompt = buildMindMapPrompt({
  title: 'Bond market pressure',
  paragraphs: [
    'Fiscal supply increased.',
    'Investors demanded a larger term premium.',
    'Higher yields tightened financial conditions.'
  ]
});
assert.match(prompt, /中心论点/);
assert.match(prompt, /分论点/);
assert.match(prompt, /段落编号/);

const longChildren = Array.from({ length: 50 }, (_, index) => ({
  label: `Node ${index}`,
  children: [{ label: `Nested ${index}`, children: [{ label: 'Deep' }] }]
}));
const normalized = normalizeMindMap({
  title: 'Fixture',
  summary: 'Summary',
  root: {
    label: 'Root',
    kind: 'thesis',
    sourceParagraphs: [1, 1, 2],
    children: longChildren
  }
}, { title: 'Fallback' });
assert.equal(normalized.title, 'Fixture');
assert.equal(normalized.root.label, 'Root');
assert.ok(normalized.nodeCount <= 40);
assert.deepEqual(normalized.root.sourceParagraphs, [1, 2]);

let modelRequests = 0;
const modelServer = http.createServer((request, response) => {
  let raw = '';
  request.on('data', chunk => { raw += chunk; });
  request.on('end', () => {
    if (request.url !== '/v1/chat/completions') {
      response.writeHead(404).end();
      return;
    }
    modelRequests += 1;
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            title: 'Bond market pressure',
            summary: 'Fiscal supply raises term premium and tightens conditions.',
            root: {
              label: 'Higher fiscal supply raises term premium',
              kind: 'thesis',
              sourceParagraphs: [1, 2],
              children: [
                {
                  label: 'More long-dated supply',
                  kind: 'argument',
                  sourceParagraphs: [1],
                  children: [
                    { label: 'Investors require compensation', kind: 'evidence', sourceParagraphs: [2] }
                  ]
                },
                {
                  label: 'Tighter financial conditions',
                  kind: 'implication',
                  sourceParagraphs: [3],
                  children: []
                }
              ]
            }
          })
        }
      }]
    }));
  });
});
await new Promise(resolve => modelServer.listen(0, '127.0.0.1', resolve));
const modelPort = modelServer.address().port;

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));

try {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForFunction(
    () => document.querySelectorAll('#articleList .acard').length >= 5,
    null,
    { timeout: 10000 }
  );
  const articleId = await page.evaluate(port => {
    S.settings.baseUrl = `http://127.0.0.1:${port}/v1`;
    S.settings.apiKey = 'mind-map-test-key';
    S.settings.model = 'mind-map-model';
    save();
    return ARTICLES[0].id;
  }, modelPort);

  await page.locator('#btnMindMap').click();
  await page.locator('#mindMapModal').waitFor({ state: 'visible', timeout: 10000 });
  const mapText = await page.locator('#mindMapCanvas').innerText();
  assert.match(mapText, /Higher fiscal supply/);
  assert.match(mapText, /Tighter financial conditions/);
  assert.ok(modelRequests >= 1);
  await page.locator('.mind-node-box[data-kind="argument"]').first().focus();
  await page.locator('#mindMapHover').waitFor({ state: 'visible' });
  const hoverText = await page.locator('#mindMapHover').innerText();
  assert.match(hoverText, /推理链条/);
  assert.match(hoverText, /相关句子/);
  assert.match(hoverText, /重点单词/);
  assert.match(hoverText, /相关知识/);
  assert.match(hoverText, /Higher fiscal supply/);
  await page.screenshot({ path: path.join(OUT, 'mind-map-v1.png') });
  await page.screenshot({ path: path.join(OUT, 'mind-map-v2.png') });
  await page.screenshot({ path: path.join(OUT, 'mind-map-v3.png') });

  const stored = await page.evaluate(id => {
    const state = JSON.parse(localStorage.getItem('finlens.v1') || '{}');
    return {
      map: state.mindMaps?.[id],
      task: taskCenterSummary().latest
    };
  }, articleId);
  assert.equal(stored.map?.root?.kind, 'thesis');
  assert.equal(stored.task?.type, 'mind-map');
  assert.equal(stored.task?.status, 'success');
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileLayout = await page.evaluate(() => {
    const body = document.querySelector('#mindMapModal .modal-body');
    const rect = body.getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      width: rect.width,
      viewport: window.innerWidth
    };
  });
  assert.ok(mobileLayout.width <= mobileLayout.viewport && mobileLayout.overflow <= 1, JSON.stringify(mobileLayout));

  const requestsBeforeCache = modelRequests;
  await page.locator('#mindMapModal .modal-head [data-close]').click();
  await page.locator('#btnMindMap').click();
  await page.locator('#mindMapModal').waitFor({ state: 'visible' });
  assert.equal(modelRequests, requestsBeforeCache, 'cached maps should not call the model again');
  await page.locator('.mind-node-box[data-kind="argument"]').first().focus();
  await page.locator('#mindMapHover').waitFor({ state: 'visible' });
  await page.locator('#mindMapHover [data-mind-paragraph]').first().click();
  await page.locator('#mindMapModal').waitFor({ state: 'hidden' });
  await page.locator('#view-reader').waitFor({ state: 'visible' });
  await page.waitForFunction(
    () => Boolean(document.querySelector('.para.mind-jump-target')),
    null,
    { timeout: 5000 }
  );
  const jumpTarget = await page.evaluate(() => ({
    paragraph: document.querySelector('.para.mind-jump-target')?.dataset.i || '',
    text: document.querySelector('.para.mind-jump-target .para-en')?.textContent || ''
  }));
  assert.equal(jumpTarget.paragraph, '0');
  assert.match(jumpTarget.text, /inflation/i);
  assert.deepEqual(errors, []);

  console.log('PASS mind map prompt, normalization, generation, cache, task state and rendering');
} finally {
  await context.close();
  await browser.close();
  await new Promise(resolve => modelServer.close(resolve));
}
