import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { startFinLensServer } from '../server/server.mjs';

const pwRequire = createRequire(process.env.PW_BASE || 'C:/Users/NORA/.workbuddy/binaries/node/workspace/');
const { chromium } = pwRequire('playwright-core');
const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'finlens-focus-analysis-'));
const dataRoot = path.join(tempRoot, 'data');
const backupDir = path.join(dataRoot, 'backups');
let failAnalysis = false;
let modelServer;
let appServer;
let browser;

const modelHttp = http.createServer((request, response) => {
  if (request.method === 'POST' && request.url === '/control/fail-analysis') {
    failAnalysis = true;
    response.writeHead(204);
    response.end();
    return;
  }
  if (request.method !== 'POST' || request.url !== '/v1/chat/completions') {
    response.writeHead(404);
    response.end();
    return;
  }
  const chunks = [];
  request.on('data', chunk => chunks.push(chunk));
  request.on('end', () => {
    const body = Buffer.concat(chunks).toString('utf8');
    let content;
    if (body.includes('只生成精读解析')) {
      if (failAnalysis) {
        response.writeHead(500, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ error: 'analysis failed intentionally' }));
        return;
      }
      const focus = body.includes('IELTS')
        ? ['IELTS 学术表达', '学术改写与衔接', ['The evidence suggests that...', 'This shift can be attributed to...']]
        : ['TOEFL 学术阅读', '指代与句间关系', ['The former...', 'By contrast...']];
      content = {
        analyses: [{
          index: 0,
          analysis: {
            english: {
              longSentence: '主句说明期限溢价上升，as 从句交代触发条件。',
              grammar: 'as 引导伴随/原因关系，demanded 与 rose 构成语义呼应。',
              expression: focus[2].join(' / ')
            },
            finance: {
              term: 'term premium',
              background: '财政供给与通胀不确定性提高长期债券持有补偿。',
              relevance: '该机制把政策与供给变化连接到长期融资成本。'
            },
            focus: {
              label: focus[0],
              guidance: focus[1],
              recommendations: focus[2]
            }
          }
        }]
      };
    } else if (body.includes('只生成词汇标注')) {
      content = {
        vocab: [{
          w: 'surge',
          ipa: '/sɜːdʒ/',
          pos: 'v.',
          zh: '激增',
          en: 'to increase suddenly',
          forms: ['surges', 'surged', 'surging'],
          formChanges: [
            { label: '第三人称单数', value: 'surges' },
            { label: '过去式 / 过去分词', value: 'surged' },
            { label: '现在分词', value: 'surging' }
          ],
          synonyms: ['rise'],
          exam: ['IELTS'],
          ex: 'Yields surged after the data release.',
          exZh: '数据发布后收益率激增。'
        }]
      };
    } else {
      content = { ok: true };
    }
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({
      choices: [{ message: { content: JSON.stringify(content) }, finish_reason: 'stop' }]
    }));
  });
});

await new Promise(resolve => modelServer = modelHttp.listen(8901, '127.0.0.1', resolve));

const initialAnalysis = {
  english: {
    longSentence: '旧的长难句解析。',
    grammar: '旧的语法解析。',
    expression: '旧表达'
  },
  finance: {
    term: 'term premium',
    background: '旧机制解析。',
    relevance: '旧文章关联。'
  }
};
const initialState = {
  settings: {
    mode: 'intensive',
    zh: 'on',
    vocab: true,
    know: false,
    baseUrl: 'http://127.0.0.1:8901/v1',
    model: 'mock-focus-model',
    apiKey: 'mock-focus-key',
    vocabDetail: 'detail',
    vocabFocus: 'balanced',
    readingDefaultsVersion: 2,
    feedDefaultsVersion: 1,
    ttsDefaultsVersion: 1
  },
  read: {},
  words: {},
  marks: {},
  notes: {},
  summaries: {},
  tutor: {},
  knowledgeTutor: {},
  dictionaries: {},
  knowledgeDetails: {},
  reviewSessions: {},
  knowledgeOverrides: {},
  exportPicks: { initialized: false, articleIds: [], options: {}, analysis: {} },
  exportArchive: [],
  days: [],
  today: { date: new Date().toISOString().slice(0, 10), read: 0, words: 0 },
  custom: [{
    id: 'focus-fixture',
    title: 'Focus Analysis Fixture',
    deck: 'Atomic vocabulary and analysis refresh.',
    source: 'Fixture Wire',
    date: '2026-11-12',
    topic: 'markets',
    level: 'C1',
    paragraphs: [{
      en: 'Yields surged as investors demanded a larger term premium.',
      zh: '随着投资者要求更高的期限溢价，收益率激增。',
      note: '',
      analysis: initialAnalysis
    }],
    vocab: [{
      w: 'surge',
      ipa: '/sɜːdʒ/',
      pos: 'v.',
      zh: '激增',
      en: 'to increase suddenly',
      forms: ['surges', 'surged', 'surging'],
      synonyms: ['rise'],
      exam: ['IELTS'],
      ex: '',
      exZh: ''
    }],
    knowledge: []
  }],
  vocabOverrides: {}
};

try {
  appServer = await startFinLensServer({
    appRoot: path.resolve('.'),
    dataRoot,
    backupDir,
    host: '127.0.0.1',
    port: 0
  });
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  await context.addInitScript(state => {
    localStorage.setItem('finlens.v1', JSON.stringify(state));
    localStorage.setItem('finlens.dataResetVersion', '2026-11-03-feedback-reset-v1');
  }, initialState);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(appServer.url, { waitUntil: 'networkidle' });
  await page.locator('.acard[data-a="focus-fixture"]').click();

  await page.locator('.w[data-v="focus-fixture:surge"]').click();
  const formLine = page.locator('#popover .pop-form');
  assert.equal(await formLine.count(), 1, 'word detail should expose a form-change line');
  const formText = await formLine.innerText();
  assert.match(formText, /词形转换/);
  assert.match(formText, /第三人称单数/);
  assert.match(formText, /surging/);
  await fs.mkdir(path.resolve('tests/shots/feedback-final'), { recursive: true });
  await page.screenshot({
    path: path.resolve('tests/shots/feedback-final/word-form-conversion.png'),
    fullPage: false
  });
  await page.keyboard.press('Escape');

  const beforeFocus = await page.evaluate(() => {
    const base = S.custom.find(article => article.id === 'focus-fixture');
    return JSON.parse(JSON.stringify(base.paragraphs[0].analysis));
  });
  await page.locator('[data-open-learning]').first().click();
  await page.selectOption('#setVocabFocus', 'ielts');
  await page.locator('#settingsModal .modal-head [data-close]').click();
  await page.waitForFunction(() => {
    const override = JSON.parse(localStorage.getItem('finlens.v1') || '{}').vocabOverrides?.['focus-fixture'];
    return override?.focus === 'ielts' && override?.analyses?.length === 1;
  }, null, { timeout: 15000 });

  const focused = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('finlens.v1') || '{}');
    const base = state.custom.find(article => article.id === 'focus-fixture');
    const effective = ARTICLES.find(article => article.id === 'focus-fixture');
    return {
      override: JSON.parse(JSON.stringify(state.vocabOverrides['focus-fixture'])),
      baseAnalysis: JSON.parse(JSON.stringify(base.paragraphs[0].analysis)),
      effectiveAnalysis: JSON.parse(JSON.stringify(effective.paragraphs[0].analysis))
    };
  });
  assert.deepEqual(focused.baseAnalysis, beforeFocus, 'base article analysis should remain untouched');
  assert.equal(focused.effectiveAnalysis.focus?.label, 'IELTS 学术表达');
  assert.equal(focused.effectiveAnalysis.english.longSentence.includes('期限溢价'), true);
  await page.locator('#sideTabs button[data-tab="analysis"]').click();
  assert.equal(await page.locator('.analysis-focus-label').innerText(), 'IELTS 学术表达');
  assert.match(await page.locator('.analysis-block.analysis-focus').innerText(), /学术改写与衔接/);
  await page.screenshot({
    path: path.resolve('tests/shots/feedback-final/focus-analysis-and-forms.png'),
    fullPage: false
  });
  const exportedAnalysis = await page.evaluate(() => {
    S.exportPicks.analysis['focus-fixture'] = [0];
    const article = ARTICLES.find(item => item.id === 'focus-fixture');
    return handoutAnalysisHtml(article, { analysis: true });
  });
  assert.match(exportedAnalysis, /IELTS 学术表达/);
  assert.match(exportedAnalysis, /The evidence suggests that/);

  await new Promise((resolve, reject) => {
    const request = http.request('http://127.0.0.1:8901/control/fail-analysis', { method: 'POST' }, response => {
      response.resume();
      response.on('end', resolve);
    });
    request.on('error', reject);
    request.end();
  });
  const beforeFailure = await page.evaluate(() =>
    JSON.stringify(JSON.parse(localStorage.getItem('finlens.v1') || '{}').vocabOverrides?.['focus-fixture']));
  await page.locator('[data-open-learning]').first().click();
  await page.selectOption('#setVocabFocus', 'toefl');
  await page.locator('#settingsModal .modal-head [data-close]').click();
  await page.waitForFunction(
    () => document.querySelector('#vocabFocusStatus')?.textContent.includes('解析') ||
      document.querySelector('#vocabFocusStatus')?.textContent.includes('失败'),
    null,
    { timeout: 10000 }
  );
  const afterFailure = await page.evaluate(() =>
    JSON.stringify(JSON.parse(localStorage.getItem('finlens.v1') || '{}').vocabOverrides?.['focus-fixture']));
  assert.equal(afterFailure, beforeFailure, 'failed analysis generation must preserve old vocabulary and analysis together');
  assert.deepEqual(errors, []);
} finally {
  if (browser) await browser.close().catch(() => {});
  if (appServer) await appServer.close().catch(() => {});
  await new Promise(resolve => modelServer?.close(resolve));
  await fs.rm(tempRoot, { recursive: true, force: true });
}

console.log('PASS word forms display and focus-specific analysis refresh are atomic');
