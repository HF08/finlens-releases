/* Article interaction and management regression checks. */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const req = createRequire(process.env.PW_BASE || 'C:/Users/NORA/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const APP_PORT = 8803;
const MOCK_ARTICLE_PORT = 8895;
const BASE = `http://127.0.0.1:${APP_PORT}`;
const MOCK_ARTICLE = `http://127.0.0.1:${MOCK_ARTICLE_PORT}/article`;
const OUT = path.resolve('tests/shots/feedback-final');
fs.mkdirSync(OUT, { recursive: true });

const customArticle = {
  id: 'custom-manage',
  title: 'Custom article management fixture',
  deck: 'Checks term fallback and article removal.',
  source: 'FinLens Test',
  date: '2026-11-02',
  topic: 'markets',
  level: 'C1',
  paragraphs: [{
    en: 'The {{Federal Reserve System}} sets policy, tracks activity, while a {{customword}} appears in this paragraph.',
    zh: '',
    note: '',
    analysis: {
      english: { longSentence: '', grammar: '', expression: '' },
      finance: { term: '', background: '', relevance: '' }
    }
  }],
  vocab: [{
    w: 'customword',
    ipa: '/ˈkʌstəm wɜːd/',
    pos: 'n.',
    zh: '测试词',
    en: 'a test word',
    forms: [],
    synonyms: [],
    exam: [],
    ex: '',
    exZh: ''
  }, {
    w: 'policy',
    ipa: '/ˈpɒləsi/',
    pos: 'n.',
    zh: '政策',
    en: 'a plan of action',
    forms: [],
    synonyms: [],
    exam: [],
    ex: '',
    exZh: ''
  }, {
    w: 'activity',
    ipa: '/ækˈtɪvəti/',
    pos: 'n.',
    zh: '活动',
    en: 'work or movement',
    forms: [],
    synonyms: [],
    exam: [],
    ex: '',
    exZh: ''
  }],
  knowledge: [{
    id: 'custom-manage-k1',
    term: 'Federal Reserve System',
    en: 'Federal Reserve System',
    category: 'finance',
    one: '美国的中央银行体系。',
    body: '美联储通过货币政策、监管和支付系统影响金融条件。',
    cases: '',
    methodSteps: [],
    related: ['central bank'],
    match: ['Federal Reserve System']
  }]
};
const secondCustomArticle = {
  ...customArticle,
  id: 'custom-manage-2',
  title: 'Second article management fixture',
  paragraphs: [{
    ...customArticle.paragraphs[0],
    en: 'A second imported paragraph contains another customword.'
  }]
};

const initialState = {
  read: { 'custom-manage': { done: true, progress: 100, reviewCount: 2, ts: Date.now() } },
  words: {
    'custom-manage:policy': {
      w: 'policy', aid: 'custom-manage', due: Date.now() + 86400000,
      box: 2, right: 1, wrong: 0, ts: Date.now()
    }
  },
  marks: { 'custom-manage': [{ i: 0, text: customArticle.paragraphs[0].en }] },
  notes: {},
  summaries: { 'custom-manage': { overview: 'fixture summary' } },
  tutor: { 'custom-manage': [{ q: 'fixture question', a: 'fixture answer' }] },
  dictionaries: { 'custom-manage:customword': { word: 'customword', senses: [] } },
  settings: {
    mode: 'intensive', zh: 'off', vocab: true, know: true,
    readingDefaultsVersion: 2, crawlFeeds: '', crawlFrom: '2026-10-01', crawlTo: '2026-11-02'
  },
  days: [],
  today: { date: '2026-11-02', read: 0, words: 0 },
  lastArticle: 'custom-manage',
  lastCrawlAt: 0,
  custom: [customArticle, secondCustomArticle]
};

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
  throw new Error('FinLens article test server did not start');
};

let server;
let browser;
const articleServer = http.createServer((request, response) => {
  const pathname = new URL(request.url, MOCK_ARTICLE).pathname;
  if (pathname === '/v1/chat/completions') {
    const chunks = [];
    request.on('data', chunk => chunks.push(chunk));
    request.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');
      if (!body.includes('success-model')) {
        response.writeHead(500, { 'content-type': 'application/json' });
        return response.end(JSON.stringify({ error: { message: 'simulated model failure' } }));
      }
      const article = {
        title: 'Re-annotated import fixture',
        deck: 'Annotation retry completed.',
        level: 'C1',
        topic: 'markets',
        suggestedTag: '',
        paragraphs: [{
          en: 'Central banks monitor inflation expectations and financial conditions when they set interest rates.',
          zh: '央行制定利率时会关注通胀预期和金融条件。',
          note: '',
          analysis: {
            english: { longSentence: '', grammar: '', expression: 'monitor conditions' },
            finance: { term: 'interest rates', background: '利率影响融资成本。', relevance: '连接货币政策与金融市场。' }
          }
        }, {
          en: 'Investors compare term premia, liquidity, and credit risk across government and corporate bond markets.',
          zh: '投资者会比较政府债与公司债市场的期限溢价、流动性和信用风险。',
          note: '',
          analysis: {
            english: { longSentence: '', grammar: '', expression: 'compare risk across markets' },
            finance: { term: 'term premium', background: '期限溢价补偿久期风险。', relevance: '影响债券定价。' }
          }
        }],
        vocab: [{
          w: 'term premium', ipa: '/tɜːm ˈpriːmiəm/', pos: 'n.', zh: '期限溢价',
          en: 'extra compensation for holding longer-dated bonds',
          forms: [], synonyms: [], exam: ['FINANCE'], ex: '', exZh: ''
        }],
        knowledge: [{
          term: 'term premium', en: 'Term premium', category: 'finance',
          one: '长期债券投资者要求的额外补偿。',
          body: '期限溢价补偿久期和通胀不确定性。',
          cases: '', methodSteps: [], related: ['duration'], match: ['term premium']
        }]
      };
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(article) } }] }));
    });
    return;
  }
  if (pathname !== '/article' && pathname !== '/model-fail') {
    response.writeHead(404);
    return response.end('not found');
  }
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end(`<!doctype html><html><head><title>Import fallback fixture</title></head><body><article>
    <p>Central banks monitor inflation expectations and financial conditions when they set interest rates.</p>
    <p>Investors compare term premia, liquidity, and credit risk across government and corporate bond markets.</p>
  </article></body></html>`);
});
await new Promise(resolve => articleServer.listen(MOCK_ARTICLE_PORT, '127.0.0.1', resolve));
try {
  server = spawn(process.execPath, ['server/server.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(APP_PORT) },
    stdio: 'ignore'
  });
  await waitForServer();

  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1512, height: 950 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(state => localStorage.setItem('finlens.v1', JSON.stringify(state)), initialState);
  await page.reload({ waitUntil: 'networkidle' });

  const highlightStyles = await page.evaluate(() => {
    const seen = document.querySelector('.w[data-v="custom-manage:policy"]');
    const unseen = document.querySelector('.w[data-v="custom-manage:activity"]');
    const linkedTerm = document.querySelector('.kmark[data-term="Federal Reserve System"]');
    const noCardTerm = [...document.querySelectorAll('.kmark')]
      .find(element => element.dataset.term === 'customword');
    const vocabularyOnly = document.querySelector('.w[data-v="custom-manage:customword"]');
    const style = element => {
      const value = getComputedStyle(element);
      return {
        borderStyle: value.borderBottomStyle,
        borderColor: value.borderBottomColor,
        backgroundImage: value.backgroundImage
      };
    };
    return {
      seen: seen && style(seen),
      unseen: unseen && style(unseen),
      linkedTerm: linkedTerm && style(linkedTerm),
      noCardTerm: noCardTerm && style(noCardTerm),
      vocabularyOnly: vocabularyOnly && style(vocabularyOnly)
    };
  });
  check('Seen and unseen vocabulary retain the same paper-marker color family',
    highlightStyles.seen?.borderStyle === highlightStyles.unseen?.borderStyle &&
    /135,\s*105,\s*56/.test(highlightStyles.seen?.borderColor || '') &&
    /135,\s*105,\s*56/.test(highlightStyles.unseen?.borderColor || ''),
    JSON.stringify({ seen: highlightStyles.seen, unseen: highlightStyles.unseen }));
  check('Linked finance terms use the muted brick-red solid underline',
    highlightStyles.linkedTerm?.borderStyle === 'solid' &&
    /163,\s*93,\s*86/.test(highlightStyles.linkedTerm?.borderColor || ''),
    JSON.stringify(highlightStyles.linkedTerm));
  check('Terms without cards are not rendered as knowledge highlights',
    !highlightStyles.noCardTerm);
  check('Unlinked terms can still retain independent vocabulary highlighting',
    /166,\s*129,\s*66/.test(highlightStyles.vocabularyOnly?.backgroundImage || ''),
    JSON.stringify(highlightStyles.vocabularyOnly));

  const term = page.locator('.para .kmark').filter({ hasText: 'Federal Reserve System' }).first();
  check('Linked finance term is rendered', await term.count() === 1);
  if (await term.count()) {
    await term.click();
    await page.waitForTimeout(120);
  }
  const popover = page.locator('#popover');
  check('Linked finance term opens the matching knowledge popover',
    await popover.isVisible() && (await popover.innerText()).includes('Federal Reserve System'),
    (await popover.innerText().catch(() => '')).slice(0, 160));
  await page.locator('#popover [data-p="more"]').click();
  check('Knowledge popover opens the side knowledge card without leaving the reader',
    await page.locator('#sideBody .kcard.open').count() > 0 &&
    await page.locator('#view-reader').isVisible());
  await page.keyboard.press('Escape');
  const paragraphGeometry = await page.locator('.para').first().evaluate(paragraph => {
    const actions = paragraph.querySelector('.para-ops').getBoundingClientRect();
    const text = paragraph.querySelector('.para-en').getBoundingClientRect();
    return { actionsBottom: actions.bottom, textTop: text.top };
  });
  check('Paragraph actions occupy a reserved gutter above the text',
    paragraphGeometry.actionsBottom <= paragraphGeometry.textTop,
    JSON.stringify(paragraphGeometry));
  await page.keyboard.press('Escape');

  const manageButton = page.locator('#btnManageArticles');
  check('Article management entry is available', await manageButton.count() === 1);
  if (await manageButton.count()) {
    await manageButton.click();
    check('Article management bar opens', await page.locator('#articleManageBar').isVisible());
    const customSelectCount = await page.locator('.acard .acard-select input').count();
    const protectedBuiltInCount = await page.locator('.acard .acard-lock').count();
    check('Imported articles are selectable and built-ins are protected',
      customSelectCount === 2 && protectedBuiltInCount === 5,
      `${customSelectCount} custom / ${protectedBuiltInCount} built-in markers`);
    if (customSelectCount === 2) {
      await page.fill('#articleSearch', 'fixture');
      await page.waitForTimeout(80);
      await page.locator('#btnSelectAllArticles').click();
      check('Select-all targets both imported articles',
        (await page.locator('#articleManageStatus').innerText()).includes('2'));
      await page.screenshot({ path: path.join(OUT, 'article-manage-mode.png') });
      page.once('dialog', dialog => dialog.accept());
      await page.locator('#btnDeleteArticles').click();
      await page.waitForTimeout(250);
      await page.fill('#articleSearch', '');
      await page.waitForTimeout(80);
    }
    const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('finlens.v1') || '{}'));
    check('Deleting an imported article removes its card and source',
      await page.locator('.acard[data-a="custom-manage"]').count() === 0 &&
      await page.locator('.acard[data-a="custom-manage-2"]').count() === 0 &&
      (persisted.custom || []).length === 0);
    check('Deleting an article clears all related learning state',
      !persisted.read?.['custom-manage'] &&
      !Object.keys(persisted.words || {}).some(key => key.startsWith('custom-manage:')) &&
      !persisted.marks?.['custom-manage'] &&
      !persisted.summaries?.['custom-manage'] &&
      !persisted.tutor?.['custom-manage'] &&
      !Object.keys(persisted.dictionaries || {}).some(key => key.startsWith('custom-manage:')));
    check('Deleting the current article selects a safe fallback article',
      (await page.locator('.doc-title').count()) === 1 &&
      (await page.locator('.doc-title').innerText()) !== 'Custom article management fixture',
      await page.locator('.doc-title').innerText());
  }

  await page.locator('.acard').filter({ hasText: "Biden's gas-tax break" }).click();
  await page.waitForTimeout(80);
  const pledged = page.locator('.para .w').filter({ hasText: 'pledged' }).first();
  let overlayBlocked = false;
  try {
    await pledged.click({ timeout: 1200 });
  } catch {
    overlayBlocked = true;
  }
  check('Paragraph actions never intercept a highlighted word',
    !overlayBlocked && await popover.isVisible() && (await popover.innerText()).includes('pledge'),
    overlayBlocked ? 'click intercepted' : (await popover.innerText().catch(() => '')).slice(0, 120));
  check('Article interaction checks have no JavaScript runtime errors',
    errors.length === 0,
    errors.slice(0, 3).join(' | '));

  await page.locator('#btnImport').click();
  await page.fill('#importUrl', MOCK_ARTICLE);
  await page.fill('#importSource', 'Import fallback fixture');
  await page.locator('#btnImportGo').click();
  await page.locator('#importFailure').waitFor({ state: 'visible', timeout: 10000 });
  check('Missing model key shows a concrete import failure and retry options',
    (await page.locator('#importFailure').innerText()).includes('模型密钥') &&
    await page.locator('#btnRetryImport').isVisible() &&
    await page.locator('#btnTestImportModel').isVisible());
  await page.locator('#btnSaveImportRaw').click();
  await page.locator('#importModal').waitFor({ state: 'hidden', timeout: 10000 });
  const importedUrlArticle = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('finlens.v1') || '{}');
    return (state.custom || []).find(article => article._url === 'http://127.0.0.1:8895/article');
  });
  check('User can explicitly save raw text from the import failure panel',
    importedUrlArticle?.title === 'Import fallback fixture' &&
    importedUrlArticle?.paragraphs?.length === 2,
    importedUrlArticle ? `${importedUrlArticle.paragraphs.length} paragraphs` : 'not imported');
  check('Raw imported article exposes annotation retry above the article',
    await page.locator('#annotationRetry').isVisible() &&
    await page.locator('#btnRerunAnnotation').isVisible());
  await page.screenshot({ path: path.join(OUT, 'annotation-retry-v1.png') });
  await page.evaluate(() => {
    S.settings.baseUrl = 'http://127.0.0.1:8895/v1';
    S.settings.apiKey = 'success-key';
    S.settings.model = 'success-model';
    save();
  });
  await page.locator('#btnRerunAnnotation').click();
  await page.waitForFunction(
    () => !document.querySelector('#annotationRetry')?.offsetParent,
    null,
    { timeout: 20000 }
  );
  const reannotatedArticle = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('finlens.v1') || '{}');
    return (state.custom || []).find(article => article._url === 'http://127.0.0.1:8895/article');
  });
  check('Reader annotation retry replaces the raw article with annotated content',
    reannotatedArticle?.title === 'Re-annotated import fixture' &&
    reannotatedArticle?.vocab?.length > 0 &&
    reannotatedArticle?._annotationStatus === 'complete' &&
    await page.locator('#annotationRetry').count() === 0,
    reannotatedArticle ? `${reannotatedArticle.title}; vocab=${reannotatedArticle.vocab?.length}` : 'missing');

  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('finlens.v1') || '{}');
    state.settings = {
      ...(state.settings || {}),
      baseUrl: 'http://127.0.0.1:8895/v1',
      apiKey: 'invalid-model-key',
      model: 'failing-model'
    };
    localStorage.setItem('finlens.v1', JSON.stringify(state));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('#btnImport').click();
  await page.fill('#importUrl', `http://127.0.0.1:${MOCK_ARTICLE_PORT}/model-fail`);
  await page.fill('#importSource', 'Model failure fallback');
  await page.locator('#btnImportGo').click();
  await page.locator('#importFailure').waitFor({ state: 'visible', timeout: 20000 });
  check('Model failure remains in import dialog with the concrete reason',
    (await page.locator('#importFailure').innerText()).includes('500') ||
    (await page.locator('#importFailure').innerText()).includes('上游返回'));
  await page.locator('#btnSaveImportRaw').click();
  await page.locator('#importModal').waitFor({ state: 'hidden', timeout: 20000 });
  const modelFallbackArticle = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('finlens.v1') || '{}');
    return (state.custom || []).find(article => article._url === 'http://127.0.0.1:8895/model-fail');
  });
  check('URL import falls back to raw text when model annotation fails',
    modelFallbackArticle?.title === 'Import fallback fixture' &&
    modelFallbackArticle?.paragraphs?.length === 2,
    modelFallbackArticle ? `${modelFallbackArticle.paragraphs.length} paragraphs` : 'not imported');
  await page.locator('#btnRerunAnnotation').click();
  await page.locator('#annotationRetryError').waitFor({ state: 'visible', timeout: 20000 });
  check('Reader annotation retry keeps raw text and shows the failure reason',
    (await page.locator('#annotationRetryError').innerText()).length > 0 &&
    await page.locator('#btnRerunAnnotation').isEnabled() &&
    (await page.locator('.doc-title').innerText()) === 'Import fallback fixture');

  const beforeDuplicateCount = await page.locator('.acard').count();
  await page.locator('#btnImport').click();
  await page.fill('#importUrl', `http://127.0.0.1:${MOCK_ARTICLE_PORT}/model-fail`);
  await page.locator('#btnImportGo').click();
  await page.locator('#importModal').waitFor({ state: 'hidden', timeout: 10000 });
  const afterDuplicateCount = await page.locator('.acard').count();
  check('Re-importing the same URL opens the existing article without a duplicate',
    afterDuplicateCount === beforeDuplicateCount &&
    (await page.locator('.doc-title').innerText()) === 'Import fallback fixture',
    `${beforeDuplicateCount} -> ${afterDuplicateCount}`);

  const crawlContext = await browser.newContext({ viewport: { width: 1512, height: 950 } });
  const crawlPage = await crawlContext.newPage();
  await crawlPage.route('**/api/feed', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ok: true,
      errors: ['https://example.test/broken-feed.xml: feed timeout'],
      items: [0, 1, 2, 3].map(index => ({
        title: `Crawl candidate ${index + 1}`,
        url: `https://example.test/article-${index + 1}`,
        source: 'Crawl Fixture',
        date: '2026-11-02',
        urlDate: '2026-11-02'
      }))
    })
  }));
  await crawlPage.route('**/api/fetch?url=*', route => {
    const url = new URL(route.request().url());
    const target = url.searchParams.get('url');
    if (/article-[12]$/.test(target)) {
      return route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: 'simulated article body failure' })
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        title: target.split('/').pop(),
        paragraphs: [
          'A sufficiently long article paragraph explains market conditions and policy decisions for investors.',
          'A second paragraph compares liquidity, credit conditions, and inflation expectations across markets.'
        ]
      })
    });
  });
  await crawlPage.goto(BASE, { waitUntil: 'networkidle' });
  await crawlPage.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('finlens.v1') || '{}');
    state.custom = [];
    state.settings = {
      ...(state.settings || {}),
      crawlFeeds: 'https://example.test/feed.xml',
      crawlFrom: '2026-11-01',
      crawlTo: '2026-11-02',
      crawlMaxItems: 2,
      crawlAnnotate: false,
      apiKey: '',
      autoCrawl: false
    };
    localStorage.setItem('finlens.v1', JSON.stringify(state));
  });
  await crawlPage.reload({ waitUntil: 'networkidle' });
  await crawlPage.locator('#btnImport').click();
  await crawlPage.locator('#importModal').waitFor({ state: 'visible' });
  await crawlPage.locator('#btnCrawlNow').click();
  await crawlPage.waitForFunction(
    () => taskCenterSummary().latest?.type === 'crawl' &&
      ['success', 'failed'].includes(taskCenterSummary().latest?.status),
    null,
    { timeout: 10000 }
  );
  const crawlState = await crawlPage.evaluate(() => JSON.parse(localStorage.getItem('finlens.v1') || '{}'));
  check('Crawler continues past failed candidates to fill the import target',
    crawlState.custom?.length === 2 &&
    crawlState.custom.every(article => /article-[34]$/.test(article._url)),
    (crawlState.custom || []).map(article => article._url).join(', '));
  const crawlTask = crawlState.tasks?.find(task => task.type === 'crawl');
  check('Crawler keeps failures in the unified task center',
    crawlTask?.status === 'failed' &&
    /3 项失败/.test(crawlTask.message || '') &&
    crawlTask.recovery?.length >= 3,
    JSON.stringify(crawlTask));
  await crawlPage.locator('#importModal .modal-head [data-close]').click();
  await crawlPage.locator('#engineCard').click();
  await crawlPage.locator('#taskCenterModal [data-task-filter="failed"]').click();
  const detailText = await crawlPage.locator('#taskCenterModal').innerText();
  check('Crawler failure details identify the feed and rejected article bodies',
    detailText.includes('broken-feed.xml') &&
    detailText.includes('Crawl candidate 1') &&
    detailText.includes('Crawl candidate 2'),
    detailText.slice(0, 180));
  await crawlPage.screenshot({ path: path.join(OUT, 'crawl-failure-details.png') });
  await crawlContext.close();
} finally {
  if (browser) await browser.close();
  if (server && !server.killed) server.kill();
  articleServer.close();
}

const failed = results.filter(result => !result.pass);
console.log(`\n=== ${results.length - failed.length}/${results.length} passed ===`);
if (failed.length) {
  for (const result of failed) console.log(' -', result.name, result.extra);
  process.exitCode = 1;
}
