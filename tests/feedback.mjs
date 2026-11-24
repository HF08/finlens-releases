/* Feedback-driven regression checks. Run after implementation:
 * node tests/feedback.mjs
 */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const req = createRequire(process.env.PW_BASE || 'C:/Users/NORA/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const APP_PORT = 8799;
const MOCK_PORT = 8897;
const BASE = `http://127.0.0.1:${APP_PORT}`;
const MOCK = `http://127.0.0.1:${MOCK_PORT}`;
const OUT = path.resolve('tests/shots/feedback');
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const ok = (name, condition, extra = '') => {
  results.push({ name, pass: !!condition, extra });
  console.log(`${condition ? 'PASS' : 'FAIL'} ${name}${extra ? ' - ' + extra : ''}`);
};

const mockArticle = {
  title: 'Uploaded Finance Article',
  deck: 'A complete annotation path for uploaded and WeChat content.',
  level: 'C1',
  topic: 'markets',
  paragraphs: [{
    en: 'The {{term premium}} has risen as investors demand more compensation for holding long-dated government debt.',
    zh: '随着投资者要求为持有长期政府债务获得更多补偿，期限溢价已经上升。',
    note: 'term premium 指长期债券投资者要求的额外风险补偿。',
    analysis: {
      english: {
        longSentence: 'as investors demand ... 是原因状语从句。',
        grammar: '主句使用现在完成时，说明变化持续到当前。',
        expression: 'demand compensation for holding ... 是财经文本中的高频表达。'
      },
      finance: {
        term: 'term premium',
        background: '期限溢价反映长期利率不确定性、财政供给和投资者结构变化。',
        relevance: '它直接影响政府与企业的长期融资成本。'
      }
    }
  }],
  vocab: [{
    w: 'compensation',
    ipa: '/ˌkɒmpenˈseɪʃn/',
    pos: 'n.',
    zh: '补偿；报酬',
    en: 'something given to make up for loss, risk or effort',
    forms: ['compensate', 'compensatory'],
    synonyms: ['recompense', 'payment'],
    exam: ['IELTS', 'TOEFL', 'FINANCE'],
    ex: 'Investors demand compensation for risk.',
    exZh: '投资者要求为风险获得补偿。'
  }],
  knowledge: [{
    term: '期限溢价',
    en: 'Term premium',
    one: '长期债券相对短期债券要求的额外补偿。',
    body: '期限溢价是长端利率的重要组成部分。',
    cases: '财政供给增加时，期限溢价往往上升。',
    related: ['收益率曲线', '久期'],
    match: ['term premium']
  }]
};

const wechatHtml = `<!doctype html><html><head><title>微信公众号测试文章</title></head><body>
<div id="js_content">
<p>The term premium has risen as investors demand more compensation for holding long-dated government debt.</p>
<p>Portfolio managers are rethinking duration risk as fiscal supply increases.</p>
</div></body></html>`;

const mockServer = http.createServer((request, response) => {
  const chunks = [];
  request.on('data', chunk => chunks.push(chunk));
  request.on('end', () => {
    const body = Buffer.concat(chunks).toString('utf8');
    if (request.url === '/wechat/s') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return response.end(wechatHtml);
    }
    if (request.url === '/v1/models') {
      response.writeHead(200, { 'content-type': 'application/json' });
      return response.end(JSON.stringify({ data: [{ id: 'mock-finance-model' }, { id: 'mock-analysis-model' }] }));
    }
    if (request.url === '/v1/chat/completions') {
      let content = mockArticle;
      if (body.includes('FENCED_JSON_TEST')) {
        content = 'Here is the requested result:\n```json\n' + JSON.stringify(mockArticle) + '\n```';
      } else if (body.includes('词典')) {
        content = {
          word: 'term premium',
          contextualMeaning: '本文中指投资者持有长期国债所要求的额外补偿。',
          senses: [
            { pos: 'n.', definition: '长期债券相对于短期限债券的额外收益率补偿', example: 'The term premium rose sharply.' },
            { pos: 'n.', definition: '更广义的风险或等待补偿', example: 'Patience carries a premium.' }
          ],
          collocations: ['demand a premium', 'term premium rise', 'duration risk'],
          usageNote: '不要与 inflation expectation 混为一谈。'
        };
      } else if (body.includes('原文怎么说')) {
        content = {
          answer: '因为投资者要求更高的长期持有补偿。',
          originalEvidence: [{ quote: 'The term premium has risen.', interpretation: '原文直接把上升归因于补偿要求。' }],
          knowledgeBasis: ['期限溢价反映久期、通胀和财政供给的不确定性。'],
          authorityBasis: [{ source: 'Federal Reserve', description: '提供货币政策与利率背景。', url: 'https://www.federalreserve.gov/' }],
          caution: '回答仅基于当前文章。'
        };
      }
      response.writeHead(200, { 'content-type': 'application/json' });
      const messageContent = typeof content === 'string' ? content : JSON.stringify(content);
      return response.end(JSON.stringify({ choices: [{ message: { content: messageContent } }] }));
    }
    if (request.url === '/v1/audio/speech') {
      response.writeHead(200, { 'content-type': 'audio/mpeg' });
      return response.end(Buffer.from('ID3mock-audio'));
    }
    response.writeHead(404, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: 'not found' }));
  });
});
await new Promise(resolve => mockServer.listen(MOCK_PORT, '127.0.0.1', resolve));

const dbPath = path.resolve('tests/shots/feedback/cc-switch-test.db');
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
const credentialDir = path.resolve('tests/shots/feedback/credentials');
fs.rmSync(credentialDir, { recursive: true, force: true });
const db = new DatabaseSync(dbPath);
db.exec(`CREATE TABLE providers (
  id TEXT NOT NULL, app_type TEXT NOT NULL, name TEXT NOT NULL,
  settings_config TEXT NOT NULL, is_current BOOLEAN NOT NULL DEFAULT 0,
  sort_index INTEGER, PRIMARY KEY (id, app_type)
)`);
const providerConfig = {
  auth: { OPENAI_API_KEY: 'cc-switch-test-key' },
  config: `model = "mock-finance-model"\ndisable_response_storage = true\nmodel_provider = "custom"\n\n[model_providers.custom]\nname = "mock"\nbase_url = "${MOCK}/v1"\nwire_api = "responses"\nrequires_openai_auth = true\n`,
  modelCatalog: {
    models: [
      { model: 'mock-finance-model', displayName: 'Mock Finance' },
      { model: 'mock-analysis-model', displayName: 'Mock Analysis' }
    ]
  }
};
db.prepare('INSERT INTO providers (id, app_type, name, settings_config, is_current, sort_index) VALUES (?, ?, ?, ?, ?, ?)')
  .run('fixture-provider', 'codex', 'Fixture Provider', JSON.stringify(providerConfig), 1, 0);
db.close();

const server = spawn(process.execPath, ['server/server.mjs'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(APP_PORT),
    CC_SWITCH_DB: dbPath,
    FINLENS_CREDENTIAL_DIR: credentialDir
  },
  stdio: 'ignore'
});

const waitForServer = async () => {
  for (let i = 0; i < 50; i++) {
    try {
      const response = await fetch(BASE + '/api/health');
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('FinLens test server did not start');
};
await waitForServer();

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({
  viewport: { width: 1512, height: 950 },
  acceptDownloads: true
});
await context.addInitScript(() => {
  window.__spoken = [];
  const synth = {
    cancel() {},
    pause() {},
    resume() {},
    getVoices() { return [{ name: 'Test English', lang: 'en-US', localService: true }]; },
    speak(utterance) { window.__spoken.push(utterance.text); }
  };
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synth });
  window.SpeechSynthesisUtterance = class {
    constructor(text) { this.text = text; }
  };
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error') errors.push(message.text());
});

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(250);

const sources = await page.locator('.acard .src').allInnerTexts();
ok('Built-in corpus uses official Economist articles', sources.length > 0 && sources.every(source => source === 'The Economist'),
  `${sources.length} sources`);
ok('Built-in corpus is finance-focused', (await page.locator('.acard-title').allInnerTexts()).some(title => /inflation|short-sellers|tax/i.test(title)));

ok('Reader defaults to original-text mode', await page.locator('body').getAttribute('data-mode') === 'original');
ok('Original mode is the first mode option', await page.locator('#modeSeg button').first().getAttribute('data-mode') === 'original');
ok('Translation is initially closed', !(await page.locator('.para-zh').first().isVisible()));
await page.locator('#zhSeg button[data-zh="on"]').click();
ok('User can open translation from original mode', await page.locator('.para-zh').first().isVisible());

const analysisTab = page.locator('#sideTabs button[data-tab="analysis"]');
ok('Reader exposes a dedicated intensive-analysis module', await analysisTab.count() === 1);
if (await analysisTab.count()) await analysisTab.click();
ok('Analysis separates English and finance needs',
  await page.locator('.analysis-english').count() > 0 && await page.locator('.analysis-finance').count() > 0);

await page.setViewportSize({ width: 390, height: 844 });
await page.reload({ waitUntil: 'networkidle' });
await page.locator('#modeSeg button[data-mode="intensive"]').click();
await page.evaluate(() => { document.querySelector('#docScroll').scrollTop = 600; });
await page.waitForTimeout(150);
ok('Mobile reader remains scrollable after changing mode',
  await page.locator('#docScroll').evaluate(element => element.scrollTop > 0));
await page.setViewportSize({ width: 1366, height: 768 });
await page.reload({ waitUntil: 'networkidle' });
const desktopDocBox = await page.locator('#docScroll').boundingBox();
if (desktopDocBox) {
  await page.mouse.move(desktopDocBox.x + desktopDocBox.width / 2, desktopDocBox.y + 250);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(150);
}
const desktopScroll = await page.locator('#docScroll').evaluate(element => element.scrollTop);
await page.locator('#modeSeg button[data-mode="intensive"]').click();
await page.mouse.wheel(0, 600);
await page.waitForTimeout(150);
const desktopScrollAfterMode = await page.locator('#docScroll').evaluate(element => element.scrollTop);
ok('Desktop reader scrolls by wheel and keeps scrolling after mode change',
  desktopScroll > 0 && desktopScrollAfterMode > 0,
  `${desktopScroll} -> ${desktopScrollAfterMode}`);
await page.setViewportSize({ width: 1512, height: 950 });
await page.reload({ waitUntil: 'networkidle' });

const learningButton = page.locator('[data-open-learning]').first();
const engineButton = page.locator('[data-open-engine]').first();
ok('Learning plan and engine have separate entry points', await learningButton.count() > 0 && await engineButton.count() > 0);
if (await learningButton.count()) await learningButton.click();
ok('Learning settings do not duplicate engine fields',
  await page.locator('#settingsModal').isVisible() && await page.locator('#settingsModal #setBaseUrl').count() === 0);
if (await page.locator('#settingsModal [data-close]').count()) await page.locator('#settingsModal [data-close]').last().click();

await engineButton.click();
ok('Engine settings open in their own modal', await page.locator('#engineModal').isVisible());
const defaultFeeds = await page.locator('#setCrawlFeeds').inputValue();
ok('Financial RSS sources are configured by default',
  defaultFeeds.includes('federalreserve.gov') && defaultFeeds.includes('bis.org'), `${defaultFeeds.split('\n').length} feeds`);
ok('Economist GitHub import and two fixed feed lists are available in the engine panel',
  await page.locator('#btnImportAwesomeFeeds').count() === 1 &&
  await page.locator('#btnUseFeedPresets').count() === 1 &&
  await page.locator('#btnUseMarketMediaFeeds').count() === 1 &&
  await page.locator('#btnImportFinanceReaderFeeds').count() === 0);
const presets = page.locator('#btnUseFeedPresets');
ok('Engine settings provide tested financial RSS presets', await presets.count() === 1);
if (await presets.count()) {
  await presets.click();
  const feeds = await page.locator('#setCrawlFeeds').inputValue();
  ok('Recommended feeds include official finance sources', feeds.includes('bis.org') && feeds.includes('federalreserve.gov'));
}
const marketMediaPreset = page.locator('#btnUseMarketMediaFeeds');
if (await marketMediaPreset.count()) {
  await marketMediaPreset.click();
  const feeds = (await page.locator('#setCrawlFeeds').inputValue()).split('\n').filter(Boolean);
  ok('Configuration list 2 contains exactly seven verified sources',
    feeds.length === 7 &&
    feeds.some(feed => feed.includes('cnbc.com/id/100003114')) &&
    feeds.some(feed => feed.includes('cnbc.com/id/10000664')) &&
    feeds.some(feed => feed.includes('fortune.com/feed')) &&
    feeds.some(feed => feed.includes('feeds.npr.org/1006')) &&
    feeds.some(feed => feed.includes('fred.stlouisfed.org/blog/rss')) &&
    feeds.some(feed => feed.includes('sec.gov/news/pressreleases.rss')) &&
    feeds.some(feed => feed.includes('ecb.europa.eu/rss/press.html')),
    `${feeds.length} feeds`);
  ok('Configuration list 2 excludes unreliable and stale sources',
    !feeds.some(feed => /seekingalpha|yahoo|nytimes|marketpulse|feeds\.a\.dj\.com|marketwatch|nasdaq\.com\/feed|bis\.org/i.test(feed)));
}

await page.evaluate(({ baseUrl }) => {
  const state = JSON.parse(localStorage.getItem('finlens.v1') || '{}');
  state.settings = {
    ...(state.settings || {}),
    baseUrl,
    model: 'mock-finance-model',
    apiKey: 'legacy-browser-key',
    localCredentialId: ''
  };
  localStorage.setItem('finlens.v1', JSON.stringify(state));
}, { baseUrl: MOCK + '/v1' });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForFunction(() => {
  const settings = JSON.parse(localStorage.getItem('finlens.v1') || '{}').settings || {};
  return settings.apiKey === '' && Boolean(settings.localCredentialId);
}, null, { timeout: 5000 });
const migratedLegacySettings = await page.evaluate(() =>
  JSON.parse(localStorage.getItem('finlens.v1') || '{}').settings || {});
ok('Legacy browser-stored API keys migrate to server credentials and are deleted',
  migratedLegacySettings.apiKey === '' &&
  Boolean(migratedLegacySettings.localCredentialId),
  JSON.stringify({
    apiKey: migratedLegacySettings.apiKey,
    localCredentialId: migratedLegacySettings.localCredentialId
  }));
await page.locator('[data-open-engine]').first().click();
await page.locator('#engineModal').waitFor({ state: 'visible' });
await page.fill('#setBaseUrl', MOCK + '/v1');
await page.fill('#setApiKey', 'feedback-test-key');
await page.locator('#setApiKey').press('Tab');
await page.waitForFunction(() => {
  const settings = JSON.parse(localStorage.getItem('finlens.v1') || '{}').settings || {};
  return Boolean(settings.localCredentialId);
}, null, { timeout: 5000 });
const manualCredentialState = await page.evaluate(() => {
  const settings = JSON.parse(localStorage.getItem('finlens.v1') || '{}').settings || {};
  return {
    apiKey: settings.apiKey,
    localCredentialId: settings.localCredentialId,
    inputValue: document.querySelector('#setApiKey')?.value || ''
  };
});
ok('Manually entered API keys move out of browser storage',
  manualCredentialState.apiKey === '' &&
  Boolean(manualCredentialState.localCredentialId) &&
  manualCredentialState.inputValue === '',
  JSON.stringify(manualCredentialState));
const credentialList = await page.evaluate(async () => {
  const response = await fetch('/api/credentials?automation=1');
  return response.json();
});
ok('Local credential API never exposes stored API keys',
  credentialList.ok &&
  credentialList.credentials.length >= 1 &&
  credentialList.credentials.every(credential =>
    !Object.hasOwn(credential, 'apiKey') &&
    credential.keyConfigured === true));
const credentialFileStatus = (await fetch(BASE + '/data/credentials/credentials.json')).status;
ok('Stored credential files cannot be fetched over the web server',
  credentialFileStatus === 403,
  String(credentialFileStatus));
await page.locator('#btnFetchModels').click();
await page.waitForTimeout(300);
ok('Live model list is fetched from the configured API',
  await page.locator('#modelList option[value="mock-finance-model"]').count() === 1);
await page.locator('#btnTestModel').click();
await page.waitForTimeout(300);
ok('Real model connection test reports success',
  /(连接成功|可用)/.test(await page.locator('#modelStatus').innerText()));
const fencedResult = await page.evaluate(async ({ baseUrl }) => {
  const settings = JSON.parse(localStorage.getItem('finlens.v1') || '{}').settings || {};
  const response = await fetch('/api/annotate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      title: 'FENCED_JSON_TEST',
      paragraphs: ['The term premium has risen as investors demand more compensation for long-dated government debt.'],
      baseUrl,
      localCredentialId: settings.localCredentialId,
      automation: navigator.webdriver === true,
      model: 'mock-finance-model',
    })
  });
  const data = await response.json();
  return { ok: data.ok, paragraphs: data.article?.paragraphs?.length || 0, error: data.error };
}, { baseUrl: MOCK + '/v1' });
ok('Model JSON in code fences is parsed without reporting a false failure',
  fencedResult.ok && fencedResult.paragraphs > 0, fencedResult.error || '');

await page.locator('#btnLoadCcSwitch').click();
await page.waitForTimeout(250);
const providerOption = page.locator('#ccSwitchProviders option').first();
ok('CC Switch provider list is available', await providerOption.count() === 1);
const providerUiDebug = await page.evaluate(() => ({
  value: document.querySelector('#ccSwitchProviders')?.value,
  providers: document.querySelector('#ccSwitchProviders')?._providers,
  status: document.querySelector('#ccSwitchStatus')?.textContent
}));
const publicProviderResponse = await page.evaluate(async () => {
  const response = await fetch('/api/cc-switch');
  return response.json();
});
ok('CC Switch provider list does not expose API keys',
  publicProviderResponse.providers.length >= 1 &&
  publicProviderResponse.providers.every(provider =>
    !Object.hasOwn(provider, 'apiKey') &&
    provider.keyConfigured === true),
  JSON.stringify({ providerUiDebug, providers: publicProviderResponse.providers }));
if (await providerOption.count()) {
  await page.locator('#ccSwitchProviders').selectOption({ index: 0 });
  await page.locator('#btnImportCcSwitch').click();
}
const importStatusDebug = await page.locator('#ccSwitchStatus').innerText();
const importedProvider = await page.evaluate(() => JSON.parse(localStorage.getItem('finlens.v1')).settings);
ok('CC Switch provider imports endpoint, model and provider reference without a key',
  importedProvider.baseUrl === MOCK + '/v1' && importedProvider.model === 'mock-finance-model' &&
  importedProvider.apiKey === '' &&
  importedProvider.ccSwitchProviderId === 'fixture-provider' &&
  importedProvider.ccSwitchAppType === 'codex',
  JSON.stringify({
    importStatus: importStatusDebug,
    baseUrl: importedProvider.baseUrl,
    model: importedProvider.model,
    keyConfigured: Boolean(importedProvider.apiKey),
    providerId: importedProvider.ccSwitchProviderId,
    appType: importedProvider.ccSwitchAppType
  }));
const importedStateText = await page.evaluate(() => localStorage.getItem('finlens.v1'));
ok('CC Switch secret never enters browser storage',
  !importedStateText.includes('cc-switch-test-key'));
ok('CC Switch imports all catalog models without an extra request',
  await page.locator('#modelList option').count() >= 2 &&
  await page.locator('#modelList option[value="mock-analysis-model"]').count() === 1);
ok('CC Switch import updates server-managed credential status immediately',
  (await page.locator('#pingOut').innerText()).includes('托管') &&
  (await page.locator('#modelStatus').innerText()).includes('已载入'),
  `${await page.locator('#pingOut').innerText()} | ${await page.locator('#modelStatus').innerText()}`);
await page.locator('#btnTestModel').click();
await page.waitForTimeout(300);
ok('Model connection uses the CC Switch credential entirely on the server',
  /连接成功/.test(await page.locator('#modelStatus').innerText()));
const providerAnnotation = await page.evaluate(async () => {
  const response = await fetch('/api/annotate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      title: 'PROVIDER_CREDENTIAL_TEST',
      paragraphs: ['The term premium has risen as investors demand more compensation for long-dated government debt.'],
      ccSwitchProviderId: 'fixture-provider',
      ccSwitchAppType: 'codex',
      model: 'mock-finance-model'
    })
  });
  const data = await response.json();
  return { ok: data.ok, paragraphs: data.article?.paragraphs?.length || 0, error: data.error };
});
ok('Annotation uses a server-managed CC Switch credential without a browser key',
  providerAnnotation.ok && providerAnnotation.paragraphs > 0,
  providerAnnotation.error || '');
await page.locator('#engineModal [data-close]').last().click();

if (!(await page.locator('#tglVocab').getAttribute('class')).includes('on')) await page.locator('#tglVocab').click();
const dictionaryButtons = page.locator('.para .w');
if (await dictionaryButtons.count()) await dictionaryButtons.first().click();
ok('Word popover includes the current article context', await page.locator('#popover .pop-context').count() > 0);
const dictionaryAction = page.locator('#popover [data-p="dict"]');
ok('Word popover offers an explicit dictionary action', await dictionaryAction.count() === 1);
if (await dictionaryAction.count()) {
  await dictionaryAction.click();
  await page.waitForTimeout(350);
}
ok('Dictionary detail returns senses and usage guidance',
  await page.locator('#popover .dict-sense').count() >= 2 && (await page.locator('#popover').innerText()).includes('inflation expectation'));
await page.keyboard.press('Escape');
ok('Every vocabulary column exposes dictionary lookup',
  await page.locator('#sideBody .vitem [data-act="dict"]').count() > 0);
await page.locator('.nav-item[data-view="cards"]').click();
if (await page.locator('#btnRefill').count()) await page.locator('#btnRefill').click();
if (await page.locator('#btnOpenAllWords').count()) await page.locator('#btnOpenAllWords').click();
await page.locator('.fc-dict-btn').first().click();
ok('Flashcards use the same context-aware dictionary',
  await page.locator('#popover .pop-context').count() === 1);
await page.keyboard.press('Escape');
await page.locator('#cardModeSeg button[data-cmode="quiz"]').click();
const quizProgressBefore = await page.locator('.fc-ipa').first().innerText();
await page.locator('.quiz-opt').first().click();
await page.waitForTimeout(150);
await page.locator('.quiz-feedback').waitFor({ state: 'visible' });
const quizProgressAfterAnswer = await page.locator('.fc-ipa').first().innerText();
ok('Quiz shows correct or incorrect feedback without auto-skipping',
  await page.locator('.quiz-feedback.good, .quiz-feedback.bad').count() === 1 &&
  quizProgressBefore === quizProgressAfterAnswer);
await page.locator('#btnQuizNext').click();
ok('Quiz advances only after the learner chooses next',
  (await page.locator('.fc-ipa').first().innerText()) !== quizProgressBefore);
await page.locator('#btnReviewHistory').click();
ok('Review-history drawer shows completed quiz records',
  await page.locator('#reviewDrawer').isVisible() && await page.locator('.review-record').count() > 0);
await page.locator('#btnCloseReview').click();

await page.locator('#cardModeSeg button[data-cmode="flash"]').click();
await page.locator('#btnFlashStart').click();
await page.waitForTimeout(2300);
await page.locator('#btnFlashStop').click();
const stoppedFlashWord = await page.locator('.flash-word').innerText();
const stoppedHint = await page.locator('.flash-stopped').innerText();
await page.locator('#btnFlashStart').click();
await page.waitForTimeout(150);
const resumedFlashWord = await page.locator('.flash-word').innerText();
ok('Flash stop retains the interrupted position',
  stoppedFlashWord === resumedFlashWord && stoppedHint.includes('已停在'), `${stoppedFlashWord} -> ${resumedFlashWord}`);
await page.locator('#btnFlashStop').click();

await page.evaluate(() => {
  const state = JSON.parse(localStorage.getItem('finlens.v1'));
  state.settings.ttsEngine = 'browser';
  localStorage.setItem('finlens.v1', JSON.stringify(state));
});
await page.reload({ waitUntil: 'networkidle' });
const ttsButton = page.locator('#btnTts');
ok('Reader exposes usable speech playback controls', await ttsButton.count() === 1 && await page.locator('#ttsAudio').count() === 1);
if (await ttsButton.count()) await ttsButton.click();
await page.waitForTimeout(200);
ok('Speech action starts a real playback or browser voice', await page.evaluate(() => window.__spoken.length > 0));
const audioResponse = await page.evaluate(async ({ baseUrl, apiKey }) => {
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: 'The term premium rose.', baseUrl, apiKey, model: 'tts-1', voice: 'alloy', engine: 'openai' })
  });
  return { status: response.status, type: response.headers.get('content-type'), size: (await response.arrayBuffer()).byteLength };
}, { baseUrl: MOCK + '/v1', apiKey: 'feedback-test-key' });
ok('Server-side speech endpoint returns playable audio',
  audioResponse.status === 200 && audioResponse.type.includes('audio') && audioResponse.size > 0,
  `${audioResponse.status} ${audioResponse.type} ${audioResponse.size}B`);

await page.locator('#btnImport').click();
await page.locator('#importFile').setInputFiles(path.resolve('tests/fixtures/feedback.txt'));
await page.locator('#btnUploadGo').click();
await page.locator('#importModal').waitFor({ state: 'hidden', timeout: 8000 });
ok('TXT document upload enters the learning pipeline', (await page.locator('.doc-title').innerText()).length > 0);

await page.locator('#btnImport').click();
await page.locator('#importFile').setInputFiles(path.resolve('tests/fixtures/feedback.docx'));
await page.locator('#btnUploadGo').click();
await page.locator('#importModal').waitFor({ state: 'hidden', timeout: 8000 });
ok('DOCX document upload extracts text and imports', (await page.locator('.doc-title').innerText()).length > 0);

const pdfFixture = path.resolve('tests/shots/audit-fixed/FinLens-print-final.pdf');
if (fs.existsSync(pdfFixture)) {
  await page.locator('#btnImport').click();
  await page.locator('#importFile').setInputFiles(pdfFixture);
  await page.locator('#btnUploadGo').click();
  await page.locator('#importModal').waitFor({ state: 'hidden', timeout: 12000 });
  ok('PDF document upload extracts and imports searchable text',
    (await page.locator('.doc-title').innerText()).length > 0);
}

await page.locator('#btnImport').click();
await page.fill('#importUrl', MOCK + '/wechat/s');
await page.fill('#importSource', '微信公众号');
await page.locator('#btnImportGo').click();
await page.locator('#importModal').waitFor({ state: 'hidden', timeout: 8000 });
const wechatTitle = await page.locator('.doc-title').innerText();
ok('WeChat article URL fetch and annotation works', wechatTitle.includes('微信公众号'), wechatTitle);
await page.locator('#sideTabs button[data-tab="analysis"]').click();
ok('Imported articles render translated English and finance analysis',
  await page.locator('.para-zh').count() > 0 && await page.locator('.analysis-card').count() > 0);
if (!(await page.locator('#btnDone').innerText()).includes('已完成')) await page.locator('#btnDone').click();
await page.locator('#readFilterSeg button[data-read="read"]').click();
const studiedCount = await page.locator('.acard').count();
const studiedMetaCount = await page.locator('.acard-review').count();
ok('Reviewed and unreviewed articles can be separated',
  studiedCount > 0 && studiedCount === studiedMetaCount, `${studiedCount} studied`);
await page.locator('#readFilterSeg button[data-read="all"]').click();

await page.locator('.nav-item[data-view="export"]').click();
let backupDownloaded = false;
const downloadListener = page.waitForEvent('download', { timeout: 800 }).then(() => { backupDownloaded = true; }).catch(() => {});
await page.locator('#btnExportJson').click();
await downloadListener;
await page.waitForFunction(() => document.querySelector('#backupStatus').textContent.includes('data/backups'), { timeout: 5000 });
ok('Learning backup is written to a local log folder without a download prompt',
  !backupDownloaded && (await page.locator('#backupStatus').innerText()).includes('data/backups'));

const ccResponse = await page.evaluate(async () => {
  const response = await fetch('/api/cc-switch');
  return { status: response.status, cors: response.headers.get('access-control-allow-origin'), body: await response.json() };
});
ok('CC Switch API exposes local providers without wildcard CORS',
  ccResponse.status === 200 &&
  ccResponse.body.providers.length >= 1 &&
  ccResponse.body.providers.every(provider => !Object.hasOwn(provider, 'apiKey')) &&
  !ccResponse.cors);

ok('No JavaScript runtime errors', errors.length === 0, errors.slice(0, 3).join(' | '));

await browser.close();
mockServer.close();
server.kill();

const failed = results.filter(result => !result.pass);
console.log(`\n=== ${results.length - failed.length}/${results.length} passed ===`);
if (failed.length) {
  for (const result of failed) console.log(' -', result.name, result.extra);
  process.exitCode = 1;
}
