/* Dictionary source regression checks.
 * Run with: node tests/dictionary.mjs
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const req = createRequire(process.env.PW_BASE || 'C:/Users/NORA/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const APP_PORT = 8802;
const MOCK_PORT = 8896;
const BASE = `http://127.0.0.1:${APP_PORT}`;
const MW_BASE = `http://127.0.0.1:${MOCK_PORT}/api/v3/references/learners/json`;
const OUT = path.resolve('tests/shots');
const FIXTURE_DB = path.join(OUT, 'ecdict-test.sqlite');
fs.mkdirSync(OUT, { recursive: true });
if (fs.existsSync(FIXTURE_DB)) fs.unlinkSync(FIXTURE_DB);
const fixture = new DatabaseSync(FIXTURE_DB);
fixture.exec(`
  CREATE TABLE entries (
    word TEXT PRIMARY KEY COLLATE NOCASE,
    phonetic TEXT,
    translation TEXT,
    definition TEXT,
    pos TEXT,
    exchange TEXT,
    tags TEXT,
    bnc INTEGER,
    frq INTEGER
  ) WITHOUT ROWID
`);
fixture.prepare(`
  INSERT INTO entries (word, phonetic, translation, definition, pos, exchange, tags, bnc, frq)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  'surge',
  'sɜːdʒ',
  'v. 激增；涌动\\nn. 激增；浪涌',
  'to increase suddenly and strongly\\nan upward movement',
  'v:100/n:100',
  'p:surged/d:surged/i:surging/3:surges',
  'cet4 cet6 ky toefl ielts gre',
  4122,
  3196
);
fixture.close();

let lastModelRequest = '';
const mwServer = http.createServer((request, response) => {
  const chunks = [];
  request.on('data', chunk => chunks.push(chunk));
  request.on('end', () => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname === '/v1/chat/completions') {
      lastModelRequest = Buffer.concat(chunks).toString('utf8');
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({
        choices: [{
          message: {
            content: JSON.stringify({
              word: 'surge',
              contextualMeaning: '在本文中指需求快速上升',
              senses: [{ pos: 'v.', definition: 'rise quickly', zh: '激增' }],
              collocations: ['demand surge'],
              usageNote: '财经语境常与 demand、price、yield 搭配。'
            })
          }
        }]
      }));
      return;
    }
    const word = decodeURIComponent(url.pathname.split('/').pop() || '');
    if (!url.pathname.startsWith('/api/v3/references/learners/json/') || url.searchParams.get('key') !== 'test-mw-key') {
      response.writeHead(403, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: 'invalid key' }));
      return;
    }
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify([{
      meta: { id: word, src: 'learners', stems: [word] },
      hwi: { hw: word },
      fl: 'verb',
      shortdef: ['to rise suddenly and by a large amount']
    }]));
  });
});
await new Promise(resolve => mwServer.listen(MOCK_PORT, '127.0.0.1', resolve));

const results = [];
const check = (name, condition, extra = '') => {
  results.push({ name, pass: !!condition, extra });
  console.log(`${condition ? 'PASS' : 'FAIL'} ${name}${extra ? ' - ' + extra : ''}`);
};

const waitForServer = async () => {
  for (let i = 0; i < 60; i++) {
    try {
      const response = await fetch(BASE + '/api/health', { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('FinLens dictionary test server did not start');
};

let server;
let browser;
try {
  server = spawn(process.execPath, ['server/server.mjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(APP_PORT),
      ECDICT_DB: FIXTURE_DB,
      MW_API_BASE: MW_BASE
    },
    stdio: 'ignore'
  });
  await waitForServer();

  const response = await fetch(BASE + '/api/dictionary', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      word: 'surge',
      sentence: 'Electricity demand may surge during the summer.',
      contextMeaning: '激增',
      title: 'Power markets'
    })
  });
  const body = await response.json();
  check('ECDICT provides an offline dictionary result without API keys',
    response.ok && body.ok && body.result?.sources?.ecdict === true,
    `${response.status}: ${body.error || body.result?.sources?.ecdict}`);
  check('ECDICT returns a Chinese meaning for a common finance word',
    (body.result?.senses || []).length === 2 &&
    (body.result?.senses || []).some(sense => String(sense.zh || '').includes('激增')),
    JSON.stringify((body.result?.senses || []).slice(0, 2)));
  check('ECDICT exchange codes become labelled word-form conversions',
    (body.result?.formChanges || []).some(change =>
      change.value === 'surged' && change.label === '过去式 / 过去分词') &&
    (body.result?.formChanges || []).some(change =>
      change.value === 'surging' && change.label === '现在分词'),
    JSON.stringify(body.result?.formChanges || []));

  const authorityResponse = await fetch(BASE + '/api/dictionary', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      word: 'surge',
      sentence: 'Electricity demand may surge during the summer.',
      contextMeaning: '激增',
      title: 'Power markets',
      mwApiKey: 'test-mw-key'
    })
  });
  const authority = await authorityResponse.json();
  check('Merriam-Webster Learner supplies an independent authority result',
    authorityResponse.ok &&
    authority.ok &&
    authority.result?.sources?.authority === true &&
    authority.result?.authority?.source === "Merriam-Webster Learner's",
    `${authorityResponse.status}: ${authority.error || authority.result?.authority?.source}`);
  check('Merriam-Webster definitions are available for display',
    (authority.result?.authority?.definitions || []).some(definition =>
      definition.includes('rise suddenly')),
    JSON.stringify(authority.result?.authority?.definitions || []));

  const modelCombinedResponse = await fetch(BASE + '/api/dictionary', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      word: 'surge',
      sentence: 'Electricity demand may surge during the summer.',
      contextMeaning: '激增',
      baseUrl: `http://127.0.0.1:${MOCK_PORT}/v1`,
      apiKey: 'model-test-key',
      model: 'mock-dictionary-model',
      mwApiKey: 'test-mw-key'
    })
  });
  const modelCombined = await modelCombinedResponse.json();
  check('Model context uses ECDICT but never receives Merriam-Webster content',
    modelCombinedResponse.ok &&
    modelCombined.ok &&
    modelCombined.result?.sources?.ecdict === true &&
    modelCombined.result?.sources?.authority === true &&
    modelCombined.result?.sources?.model === true &&
    lastModelRequest.includes('ECDICT') &&
    lastModelRequest.includes('激增') &&
    !lastModelRequest.includes('rise suddenly'),
    `${modelCombinedResponse.status}: ${modelCombined.error || 'sources separated'}`);

  const authorityOnlyResponse = await fetch(BASE + '/api/dictionary', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      word: 'apple',
      sentence: 'An apple a day keeps the doctor away.',
      contextMeaning: '苹果',
      mwApiKey: 'test-mw-key'
    })
  });
  const authorityOnly = await authorityOnlyResponse.json();
  check('Merriam-Webster works when ECDICT has no matching entry',
    authorityOnlyResponse.ok &&
    authorityOnly.ok &&
    authorityOnly.result?.sources?.ecdict === false &&
    authorityOnly.result?.authority?.definitions?.length > 0,
    `${authorityOnlyResponse.status}: ${authorityOnly.error || 'authority only'}`);

  const badAuthorityResponse = await fetch(BASE + '/api/dictionary', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ word: 'surge', mwApiKey: 'bad-key' })
  });
  const badAuthority = await badAuthorityResponse.json();
  check('Invalid Merriam-Webster credentials fall back to ECDICT',
    badAuthorityResponse.ok &&
    badAuthority.ok &&
    badAuthority.result?.sources?.ecdict === true &&
    !badAuthority.result?.authority &&
    badAuthority.result?.authorityError?.includes('403'),
    `${badAuthorityResponse.status}: ${badAuthority.error || badAuthority.result?.authorityError}`);

  const protectedDictionaryPath = await fetch(BASE + '/data/dictionary/ecdict.csv');
  check('Raw dictionary data is not exposed by the web server',
    protectedDictionaryPath.status === 403,
    String(protectedDictionaryPath.status));
  const encodedDictionaryPath = await fetch(BASE + '/data%2Fdictionary%2Fecdict.sqlite');
  check('Encoded dictionary paths cannot bypass static-file protection',
    encodedDictionaryPath.status === 403,
    String(encodedDictionaryPath.status));

  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1512, height: 950 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(BASE, { waitUntil: 'networkidle' });

  await page.locator('[data-open-engine]').first().click();
  const mwKeyInput = page.locator('#setMwApiKey');
  check('Engine settings expose a Merriam-Webster key field',
    await mwKeyInput.count() === 1);
  if (await mwKeyInput.count()) {
    await mwKeyInput.fill('test-mw-key');
    await mwKeyInput.press('Tab');
  }
  await page.locator('#engineModal [data-close]').last().click();

  await page.locator('#modeSeg button[data-mode="intensive"]').click();
  await page.locator('.para .w').first().click();
  const dictionaryAction = page.locator('#popover [data-p="dict"]');
  check('Dictionary detail action is available after ECDICT integration',
    await dictionaryAction.count() === 1);
  if (await dictionaryAction.count()) {
    await dictionaryAction.click();
    await page.waitForFunction(
      () => document.querySelector('#popover .dict-ecdict-source') ||
        document.querySelector('#popover .dict-authority'),
      null,
      { timeout: 10000 }
    );
  }

  check('Dictionary popover labels the ECDICT source',
    await page.locator('#popover .dict-ecdict-source').count() === 1);
  check('Dictionary popover labels Merriam-Webster Learner’s authority',
    await page.locator('#popover .dict-authority').count() === 1 &&
    (await page.locator('#popover .dict-authority').innerText()).toLowerCase().includes('merriam-webster'));
  const persistedDictionaries = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('finlens.v1') || '{}');
    return JSON.stringify(state.dictionaries || {});
  });
  check('Merriam-Webster authority content is not persisted to localStorage',
    !persistedDictionaries.includes('rise suddenly') &&
    !persistedDictionaries.includes('Merriam-Webster Learner'));
  await page.screenshot({ path: path.resolve('tests/shots/feedback-final/dictionary-sources.png') });
  await page.waitForTimeout(2800);
  await page.locator('.nav-item[data-view="export"]').click();
  await page.locator('#btnExportJson').click();
  await page.waitForFunction(
    () => document.querySelector('#backupStatus')?.textContent.includes('data/backups'),
    null,
    { timeout: 10000 }
  );
  const backupStatus = await page.locator('#backupStatus').innerText();
  const relativeBackup = backupStatus.match(/data\/backups\/[^\s]+\.json/)?.[0] || '';
  const latestBackup = JSON.parse(fs.readFileSync(path.resolve(relativeBackup), 'utf8'));
  check('Backups exclude the Merriam-Webster key and authority content',
    !latestBackup.settings?.mwApiKey &&
    !JSON.stringify(latestBackup).includes('rise suddenly'));
  check('Dictionary browser flow has no JavaScript runtime errors',
    errors.length === 0,
    errors.slice(0, 3).join(' | '));
} finally {
  if (browser) await browser.close();
  if (server && !server.killed) server.kill();
  mwServer.close();
}

const failed = results.filter(result => !result.pass);
console.log(`\n=== ${results.length - failed.length}/${results.length} passed ===`);
if (failed.length) {
  for (const result of failed) console.log(' -', result.name, result.extra);
  process.exitCode = 1;
}
