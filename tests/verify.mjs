/* 端到端冒烟验证：node tests/verify.mjs */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const req = createRequire(process.env.PW_BASE || 'C:/Users/NORA/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const BASE = process.env.FINLENS_TEST_BASE || 'http://127.0.0.1:8787';
const OUT = path.resolve('tests/shots');
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const ok = (name, cond, extra = '') => {
  results.push({ name, pass: !!cond, extra });
  console.log(`${cond ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`);
};

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1512, height: 950 }, deviceScaleFactor: 2, acceptDownloads: true });
const page = await ctx.newPage();

const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);

/* 1. 基础渲染 */
ok('页面标题', (await page.title()).includes('FinLens'));
ok('文章列表渲染', (await page.locator('.acard').count()) === 5, `${await page.locator('.acard').count()} 篇`);
ok('正文段落渲染', (await page.locator('.para').count()) === 5);
ok('默认以原文模式打开', await page.locator('body').getAttribute('data-mode') === 'original');
ok('默认译文关闭', !(await page.locator('.para-zh').first().isVisible()));
await page.locator('#modeSeg button[data-mode="intensive"]').click();
await page.waitForTimeout(150);
ok('生词高亮生效', (await page.locator('.para .w').count()) >= 7, `${await page.locator('.para .w').count()} 处`);
ok('金融术语高亮生效', (await page.locator('.para .kmark').count()) >= 1, `${await page.locator('.para .kmark').count()} 处`);
ok('译文默认显示', await page.locator('.para-zh').first().isVisible());
await page.screenshot({ path: `${OUT}/01-reader.png`, fullPage: false });

await page.locator('#sideTabs button[data-tab="analysis"]').click();
await page.waitForTimeout(150);
const analysisLayout = await page.evaluate(() => {
  const first = document.querySelector('.analysis-card');
  return {
    count: document.querySelectorAll('.analysis-card').length,
    title: first?.querySelector('.analysis-card-title')?.textContent?.trim() || '',
    kinds: [...(first?.querySelectorAll('.analysis-block') || [])]
      .map(block => block.dataset.analysisKind),
    itemLabels: [...(first?.querySelectorAll('.analysis-item-label') || [])]
      .map(label => label.textContent.trim())
  };
});
ok('精读解析按段落和层级分区',
  analysisLayout.count === 5 &&
  analysisLayout.title === '原文解析' &&
  analysisLayout.kinds.includes('english') &&
  analysisLayout.kinds.includes('finance') &&
  analysisLayout.itemLabels.includes('长难句'),
  JSON.stringify(analysisLayout));
await page.screenshot({ path: `${OUT}/03-analysis-blocks.png`, fullPage: false });

/* 2. 点词查义 */
await page.locator('.para .w').first().click();
await page.waitForTimeout(250);
const popVisible = await page.locator('#popover').isVisible();
ok('点击生词弹出释义', popVisible, popVisible ? (await page.locator('.pop-word').innerText()).replace(/\n/g, ' ') : '');
await page.screenshot({ path: `${OUT}/02-popover.png` });
ok('释义含音标与中文', (await page.locator('#popover').innerText()).includes('/'));

/* 3. 加入生词本 */
await page.locator('#popover button[data-p="add"]').click();
await page.waitForTimeout(200);
const wordCount = await page.locator('#statWords').innerText();
ok('加入生词本后计数增加', wordCount === '1', `statWords=${wordCount}`);
await page.keyboard.press('Escape');

/* 4. 术语知识浮层 */
await page.locator('.para .kmark').first().click();
await page.waitForTimeout(250);
ok('点击术语弹出释义浮层', await page.locator('#popover').isVisible());
await page.locator('#popover button[data-p="more"]').click();
await page.waitForTimeout(300);
ok('术语可联动展开知识卡', (await page.locator('.kcard.open').count()) > 0, `${await page.locator('.kcard.open').count()} 张展开`);
await page.screenshot({ path: `${OUT}/03-knowledge-inline.png` });

/* 5. 模式切换 */
await page.locator('#zhSeg button[data-zh="off"]').click();
await page.waitForTimeout(150);
ok('译文关闭生效', !(await page.locator('.para-zh').first().isVisible()));
await page.locator('#modeSeg button[data-mode="original"]').click();
await page.waitForTimeout(200);
ok('原文模式隐藏辅助解析', !(await page.locator('.para-note').first().isVisible()));
await page.screenshot({ path: `${OUT}/04-original-mode.png` });
await page.locator('#modeSeg button[data-mode="intensive"]').click();
await page.locator('#zhSeg button[data-zh="on"]').click();

/* 6. 标记已读 */
await page.locator('#docScroll').evaluate(el => { el.scrollTop = el.scrollHeight; });
await page.waitForTimeout(700);
if (!(await page.locator('#btnDone').innerText()).includes('已完成')) await page.locator('#btnDone').click();
await page.waitForTimeout(300);
const readN = await page.locator('#statArticles').innerText();
ok('标记精读并计数', readN === '1', `statArticles=${readN}`);
const goalRead = await page.locator('#goalRead').innerText();
ok('今日目标进度更新', goalRead === '1', `goalRead=${goalRead}`);

/* 7. 筛选 */
await page.locator('#topicSeg button[data-t="policy"]').click();
await page.waitForTimeout(200);
ok('主题筛选生效', (await page.locator('.acard').count()) === 3, `${await page.locator('.acard').count()} 篇`);
await page.locator('#topicSeg button[data-t="all"]').click();

/* 8. 闪卡视图 */
await page.locator('.nav-item[data-view="cards"]').click();
await page.waitForTimeout(300);
ok('闪卡视图打开', await page.locator('#view-cards').isVisible());
ok('未学习词不进入待复习', await page.locator('#btnOpenAllWords').isVisible());
await page.locator('#btnOpenAllWords').click();
await page.waitForTimeout(200);
await page.locator('#cardsStage').click();
await page.waitForTimeout(300);
ok('卡片翻转显示释义', await page.locator('.fc-answer').count() > 0);
await page.screenshot({ path: `${OUT}/05-cards.png` });
await page.locator('.rate[data-score="2"]').click();
await page.waitForTimeout(300);
ok('评分后队列推进', (await page.locator('.cards-stats').innerText()).includes('正确率'));

/* 9. 测验模式 */
await page.locator('#deckSeg button[data-deck="all"]').click();
await page.waitForTimeout(250);
await page.locator('#cardModeSeg button[data-cmode="quiz"]').click();
await page.waitForTimeout(300);
ok('测验模式渲染选项', (await page.locator('.quiz-opt').count()) === 4, `${await page.locator('.quiz-opt').count()} 项`);
await page.screenshot({ path: `${OUT}/06-quiz.png` });
await page.locator('#cardModeSeg button[data-cmode="flip"]').click();

/* 10. 知识库 */
await page.locator('.nav-item[data-view="knowledge"]').click();
await page.waitForTimeout(300);
const kbN = await page.locator('.kb-card').count();
ok('知识库渲染', kbN >= 10, `${kbN} 张知识卡`);
await page.fill('#kbSearch', '通胀');
await page.waitForTimeout(300);
ok('知识库搜索生效', (await page.locator('.kb-card').count()) >= 1, `命中 ${await page.locator('.kb-card').count()}`);
await page.fill('#kbSearch', '');
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT}/07-knowledge-base.png` });

/* 11. 导出 */
await page.locator('.nav-item[data-view="export"]').click();
await page.waitForTimeout(300);
ok('归档统计渲染', (await page.locator('.as-box').count()) === 6);
await page.screenshot({ path: `${OUT}/08-export.png` });
const boxes = page.locator('#exportList input[type=checkbox]');
if (!(await boxes.first().isChecked())) await boxes.first().check();
const dl = page.waitForEvent('download', { timeout: 5000 });
await page.locator('#btnExportMd').click();
const d = await dl;
const pth = await d.path();
const md = fs.readFileSync(pth, 'utf8');
fs.writeFileSync(`${OUT}/sample-handout.md`, md);
ok('Markdown 讲义下载', md.includes('# FinLens') && md.includes('本篇词汇'), `${(md.length / 1024).toFixed(1)} KB`);
ok('讲义含译文与知识卡', md.includes('知识卡') && md.includes('实际工资'));

/* 12. 持久化 */
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(400);
ok('刷新后学习记录保留', (await page.locator('#statArticles').innerText()) === '1' && (await page.locator('#statWords').innerText()) === '1');

/* 13. 另一篇文章（C2）渲染 */
await page.locator('.acard').nth(2).click();
await page.waitForTimeout(300);
ok('切换文章正常', (await page.locator('.doc-title').innerText()).length > 5, await page.locator('.doc-title').innerText());
ok('长单词高亮无破词', !(await page.locator('.para-en').first().innerText()).includes('{{'));

/* 14. 设置面板 */
await page.locator('button[data-open-engine]').first().click();
await page.waitForTimeout(300);
ok('引擎面板打开', await page.locator('#engineModal').isVisible());
await page.screenshot({ path: `${OUT}/09-settings.png` });
await page.locator('#btnPing').click();
await page.waitForTimeout(700);
const pingTxt = await page.locator('#pingOut').innerText();
ok('本地服务连通检测', pingTxt.includes('在线'), pingTxt);
await page.keyboard.press('Escape');

/* 15. 内容抓取模块（本地 fixture 服务，验证真实 HTTP 抓取 + 正文抽取 + 标注降级） */
const http = await import('node:http');
const FIXTURE = `<!DOCTYPE html><html><head><title>Test Fixture · Bond Market Weekly</title>
<style>.x{color:red}</style><script>var a=1;</script></head><body>
<nav>Home | Markets | Opinion</nav>
<p>Official websites use .gov A .gov website belongs to an official government organization in the United States and must not be treated as article content.</p>
<div id="article">
<p>The term premium on ten-year government debt has risen for a third consecutive month, according to dealers surveyed this week.</p>
<p>Investors say the move reflects a reassessment of fiscal supply rather than any change in the expected path of policy rates.</p>
<p>Pension funds have reduced their share of the buyer base, leaving more price-sensitive holders at the margin of the market.</p>
</div>
<footer>© fixture</footer></body></html>`;
const fx = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(FIXTURE);
});
await new Promise(r => fx.listen(8899, '127.0.0.1', r));

const fetched = await page.evaluate(async () => {
  const r = await fetch('/api/fetch?url=' + encodeURIComponent('http://127.0.0.1:8899/a.html'));
  return r.json();
});
ok('抓取接口可用', fetched.ok === true, `提取 ${fetched.paragraphs ? fetched.paragraphs.length : 0} 段`);
ok('正文抽取去除脚本、导航与站点提示', fetched.ok && fetched.paragraphs.length === 3 &&
  !JSON.stringify(fetched).includes('var a=1') && !JSON.stringify(fetched).includes('Official websites use .gov'),
  fetched.title || '');
ok('抓取可识别标题', (fetched.title || '').includes('Test Fixture'));

await page.locator('.nav-item[data-view="reader"]').click();
await page.locator('#btnImport').click();
await page.waitForTimeout(300);
ok('导入弹窗打开', await page.locator('#importModal').isVisible());
await page.fill('#importUrl', 'http://127.0.0.1:8899/a.html');
await page.fill('#importSource', 'Fixture Weekly');
await page.locator('#btnImportGo').click();
await page.locator('#importFailure').waitFor({ state: 'visible', timeout: 6000 });
const importFailureText = await page.locator('#importFailure').innerText();
ok('无 Key 时导入失败留在弹窗并说明原因',
  importFailureText.includes('模型密钥不可用') && importFailureText.includes('缺少 API Key'));
ok('导入失败提供重试、测试与仅保存原文入口',
  await page.locator('#btnRetryImport').isVisible() &&
  await page.locator('#btnTestImportModel').isVisible() &&
  await page.locator('#btnSaveImportRaw').isVisible());
await page.screenshot({ path: `${OUT}/11-import.png` });
await page.locator('#btnSaveImportRaw').click();
await page.locator('#importModal').waitFor({ state: 'hidden', timeout: 6000 });
ok('用户可确认失败后仅保存原文', await page.locator('#importModal').isHidden());
const impTitle = await page.locator('.doc-title').innerText();
ok('降级导入的文章可正常阅读', impTitle.length > 5, impTitle);
const cardN = await page.locator('.acard').count();
ok('导入文章进入列表', cardN === 6, `${cardN} 篇`);
fx.close();

/* 16. 窄屏 */
await page.setViewportSize({ width: 1280, height: 860 });
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/10-1280.png` });

// 缺 Key 的 400 属于预期错误分支，不计入异常
/* 17. Regression checks for learning-output and configuration edge cases */
const regression = async (fn) => {
  const p = await ctx.newPage();
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(200);
  try {
    await fn(p);
  } finally {
    await p.close();
  }
};

await regression(async (p) => {
  const hasSearch = await p.locator('#articleSearch').count() === 1;
  if (hasSearch) await p.fill('#articleSearch', 'inflation');
  const count = hasSearch ? await p.locator('.acard').count() : 0;
  ok('Reader keyword search filters the timeline', hasSearch && count === 1, `${count} results`);
});

await regression(async (p) => {
  const refill = p.locator('#btnRefill');
  await p.locator('.nav-item[data-view="cards"]').click();
  if (await refill.count()) await refill.click();
  await p.locator('#cardModeSeg button[data-cmode="flash"]').click();
  await p.locator('#btnFlashStart').click();
  await p.waitForTimeout(100);
  ok('Flash mode keeps a visible stop control', await p.locator('#btnFlashStop').isVisible());
  await p.locator('#btnFlashStop').click();
  await p.waitForTimeout(1300);
  ok('Flash mode stops without a stale reveal', await p.locator('#btnFlashStart').isVisible());
});

await regression(async (p) => {
  await p.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('finlens.v1') || '{}');
    s.settings = { ...(s.settings || {}), apiKey: 'regression-secret' };
    localStorage.setItem('finlens.v1', JSON.stringify(s));
  });
  await p.reload({ waitUntil: 'networkidle' });
  await p.locator('.nav-item[data-view="export"]').click();
  let downloaded = false;
  await p.waitForEvent('download', { timeout: 600 }).then(() => { downloaded = true; }).catch(() => {});
  await p.locator('#btnExportJson').click();
  await p.waitForFunction(() => document.querySelector('#backupStatus').textContent.includes('data/backups'), { timeout: 5000 });
  const backupStatus = await p.locator('#backupStatus').innerText();
  const relative = backupStatus.match(/data\/backups\/[^\s]+\.json/)?.[0];
  const file = relative ? path.resolve(relative) : '';
  ok('Learning backup writes a local log and excludes API key',
    !downloaded &&
    !!file &&
    relative.includes('/automation-tests/') &&
    fs.existsSync(file) &&
    !fs.readFileSync(file, 'utf8').includes('regression-secret'),
    backupStatus);
});

await regression(async (p) => {
  await p.locator('.nav-item[data-view="export"]').click();
  await p.locator('#exportList input').nth(0).check();
  await p.locator('#exportList input').nth(1).check();
  const pdfDownloadPromise = p.waitForEvent('download', { timeout: 30000 });
  await p.locator('#btnExportPdf').click();
  const pdfDownload = await pdfDownloadPromise;
  const pdfFile = await pdfDownload.path();
  const pdfBytes = fs.readFileSync(pdfFile);
  ok('PDF handout downloads directly with every selected article',
    pdfBytes.subarray(0, 5).toString() === '%PDF-' && pdfBytes.length > 10000,
    `${pdfBytes.length} bytes`);
});

await regression(async (p) => {
  await p.locator('.nav-item[data-view="cards"]').click();
  const refill = p.locator('#btnRefill');
  if (await refill.count()) await refill.click();
  const visible = await p.locator('#btnExportVocab').isVisible();
  if (visible) await p.locator('#btnExportVocab').click();
  const modalVisible = visible && await p.locator('#vocabExportModal').isVisible();
  const downloadPromise = modalVisible ? p.waitForEvent('download') : null;
  if (modalVisible) await p.locator('#btnExportAllVocabCsv').click();
  const download = modalVisible ? await downloadPromise : null;
  let csv = '';
  if (download) {
    const file = path.join(OUT, 'regression-vocab.csv');
    await download.saveAs(file);
    csv = fs.readFileSync(file, 'utf8');
  }
  ok('Vocabulary CSV export is available', visible && modalVisible && csv.includes('Front') && csv.includes('surge'));
});

await regression(async (p) => {
  await p.locator('.nav-item[data-view="export"]').click();
  ok('Learning backup can be restored', await p.locator('#backupFile').count() === 1);
  const file = path.join(OUT, 'restore-fixture.json');
  fs.writeFileSync(file, JSON.stringify({
    settings: { apiKey: 'backup-key' },
    read: { a1: { done: true, ts: Date.now() } },
    words: { 'a1:comatose': { box: 1, due: 0, right: 1, wrong: 0, seen: 1, added: Date.now() } }
  }));
  await p.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('finlens.v1') || '{}');
    s.settings = {
      ...(s.settings || {}),
      apiKey: '',
      localCredentialId: 'keep-credential-id'
    };
    localStorage.setItem('finlens.v1', JSON.stringify(s));
  });
  p.once('dialog', dialog => dialog.accept());
  const navigation = p.waitForNavigation({ waitUntil: 'networkidle' });
  await p.locator('#backupFile').setInputFiles(file);
  await navigation;
  const restored = await p.evaluate(() => JSON.parse(localStorage.getItem('finlens.v1')));
  ok('Restore preserves progress and the current server credential reference',
    restored.read.a1.done &&
    restored.words['a1:comatose'] &&
    restored.settings.apiKey === '' &&
    restored.settings.localCredentialId === 'keep-credential-id');
});

await regression(async (p) => {
  await p.setViewportSize({ width: 390, height: 844 });
  await p.reload({ waitUntil: 'networkidle' });
  const box = await p.locator('.tb-left').boundingBox();
  ok('Mobile header stays inside its toolbar', box && box.y >= 0 && box.y + box.height <= 61,
    box ? `y=${box.y.toFixed(1)} h=${box.height.toFixed(1)}` : 'missing');
  const visible = await p.locator('#mobileArticle').isVisible();
  if (visible) await p.locator('#mobileArticle').selectOption({ index: 2 });
  const title = visible ? await p.locator('.doc-title').innerText() : '';
  ok('Mobile reader can switch articles', visible && title.length > 5, title);
  await p.locator('button.mobile-import-btn[data-open-import]').click();
  await p.locator('#importModal').waitFor({ state: 'visible' });
  await p.locator('#importModal .modal-scroll').evaluate(el => el.scrollTop = el.scrollHeight);
  const fromBox = await p.locator('#setCrawlFrom').boundingBox();
  const toBox = await p.locator('#setCrawlTo').boundingBox();
  ok('Mobile crawler dates remain readable', fromBox && toBox && fromBox.width >= 130 && toBox.width >= 130,
    fromBox && toBox ? `${Math.round(fromBox.width)}px / ${Math.round(toBox.width)}px` : 'missing');
});

await regression(async (p) => {
  await p.locator('[data-open-engine]').first().click();
  await p.locator('#setApiKey').focus();
  await p.keyboard.press('Escape');
  ok('Escape closes engine settings from an input', !(await p.locator('#engineModal').isVisible()));
});

await regression(async (p) => {
  await p.locator('[data-open-engine]').first().click();
  const baseUrl = await p.locator('#setBaseUrl').inputValue();
  ok('Default LLM endpoint is not the local app server', !baseUrl.includes('127.0.0.1'), baseUrl);
});

await regression(async (p) => {
  await p.locator('[data-open-engine]').first().click();
  await p.fill('#setApiKey', 'browser-side-key');
  await p.locator('#setApiKey').press('Tab');
  await p.locator('#btnPing').click();
  await p.waitForTimeout(300);
  const text = await p.locator('#pingOut').innerText();
  ok('Engine status recognizes a server-managed key', text.includes('已配置'), text);
});

/* 18. Crawler, feed parsing and complete OpenAI-compatible import path */
const MOCK_API = 'http://127.0.0.1:8898';
const mockArticle = {
  title: 'API Import Smoke',
  deck: 'A complete API annotation smoke test.',
  level: 'C1',
  topic: 'markets',
  paragraphs: [
    {
      en: 'The {{term premium}} has risen as investors demand more compensation for holding long-dated government debt.',
      zh: '随着投资者要求为持有长期政府债务获得更多补偿，期限溢价已经上升。',
      note: 'term premium：长期债券投资者要求的额外补偿。'
    }
  ],
  vocab: [
    {
      w: 'term premium',
      ipa: '/tɜːm ˈpriːmiəm/',
      pos: 'n.',
      zh: '期限溢价',
      en: 'extra yield demanded for holding a longer-dated bond',
      forms: ['term premiums'],
      synonyms: ['long-term risk compensation'],
      exam: ['IELTS', 'FINANCE'],
      ex: 'The term premium rose sharply.',
      exZh: '期限溢价大幅上升。'
    }
  ],
  knowledge: [
    {
      term: '期限溢价',
      en: 'Term premium',
      one: '长期债券相对短期债券要求的额外补偿。',
      body: '期限溢价反映投资者对利率路径、通胀和财政供给不确定性的定价。',
      cases: '美国长端收益率快速上行时，期限溢价往往同步重估。',
      related: ['收益率曲线', '久期'],
      match: ['term premium']
    }
  ]
};
const articleHtml = (title) => `<!DOCTYPE html><html><head><title>${title}</title></head><body>
<nav>Fixture navigation</nav>
<p>The term premium has risen as investors demand more compensation for holding long-dated government debt during a period of persistent fiscal uncertainty.</p>
<p>Portfolio managers say the change reflects a reassessment of policy rates, inflation risk and the supply of government bonds rather than a single data release.</p>
<footer>Fixture footer</footer></body></html>`;
const dateAgo = (days) => new Date(Date.now() - days * 86400000);
const dateOnly = (d) => d.toISOString().slice(0, 10);
const feedXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Mock Finance Wire</title>
<item><title>New Article A</title><link>${MOCK_API}/api-one.html</link><pubDate>${dateAgo(1).toUTCString()}</pubDate><description>Fresh finance article A</description></item>
<item><title>New Article B</title><link>${MOCK_API}/api-two.html</link><pubDate>${dateAgo(120).toUTCString()}</pubDate><description>Fresh finance article B</description></item>
<item><title>Old Article</title><link>${MOCK_API}/old.html</link><pubDate>${dateAgo(400).toUTCString()}</pubDate><description>Old finance article</description></item>
</channel></rss>`;
const apiHits = [];
const mock = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/v1/chat/completions') {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');
      apiHits.push({ path: req.url, auth: req.headers.authorization, body });
      let content = mockArticle;
      if (body.includes('结构化摘要')) {
        content = {
          overview: '文章解释了期限溢价上升与财政供给之间的关系。',
          sections: [{ heading: '市场背景', summary: '长期国债投资者要求更高补偿。' }],
          takeaways: ['关注长端利率', '区分通胀预期与期限溢价'],
          terms: ['term premium']
        };
      } else if (body.includes('原文怎么说')) {
        content = {
          answer: '因为投资者要求更高的长期持有补偿。',
          originalEvidence: [{ quote: 'The term premium has risen.', interpretation: '原文直接说明补偿要求上升。' }],
          knowledgeBasis: ['期限溢价反映久期、通胀和财政供给的不确定性。'],
          authorityBasis: [{ source: 'Federal Reserve', description: '提供利率与货币政策背景。', url: 'https://www.federalreserve.gov/' }],
          caution: '回答仅基于当前文章。'
        };
      }
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }));
    });
    return;
  }
  if (req.url === '/feed.xml') {
    res.writeHead(200, { 'content-type': 'application/rss+xml; charset=utf-8' });
    return res.end(feedXml);
  }
  if (['/api-one.html', '/api-two.html', '/old.html'].includes(req.url)) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(articleHtml(req.url));
  }
  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('not found');
});
await new Promise(r => mock.listen(8898, '127.0.0.1', r));

const isolated = async (fn) => {
  const c = await browser.newContext({ viewport: { width: 1512, height: 950 }, acceptDownloads: true });
  const p = await c.newPage();
  try {
    await p.goto(BASE, { waitUntil: 'networkidle' });
    await p.waitForTimeout(200);
    await fn(p);
  } finally {
    await c.close();
  }
};

await isolated(async (p) => {
  await p.locator('#tglVocab').click();
  await p.locator('[data-open-learning]').first().click();
  const brief = p.locator('#setVocabDetail button[data-detail="brief"]');
  const detail = p.locator('#setVocabDetail button[data-detail="detail"]');
  const available = await brief.count() === 1 && await detail.count() === 1;
  if (available) {
    await brief.click();
    await p.locator('#settingsModal [data-close]').last().click();
    await p.locator('.para .w').first().click();
  }
  const briefHasEnglish = await p.locator('#popover .pop-en').count() > 0;
  ok('Vocabulary detail can start in concise mode', available && !briefHasEnglish);
  if (available) {
    await p.locator('[data-open-learning]').first().click();
    await detail.click();
    await p.locator('#settingsModal [data-close]').last().click();
    await p.locator('.para .w').first().click();
  }
  ok('Vocabulary detail can switch to full mode', available && await p.locator('#popover .pop-en').count() > 0);
});

await isolated(async (p) => {
  await p.locator('[data-open-learning]').first().click();
  await p.selectOption('#setVocabFocus', 'ielts');
  await p.locator('#settingsModal [data-close]').last().click();
  await p.locator('[data-open-engine]').first().click();
  await p.fill('#setBaseUrl', MOCK_API + '/v1');
  await p.locator('#setBaseUrl').press('Tab');
  await p.fill('#setModel', 'mock-finance-model');
  await p.locator('#setModel').press('Tab');
  await p.fill('#setApiKey', 'mock-key');
  await p.locator('#setApiKey').press('Tab');
  await p.locator('#engineModal [data-close]').last().click();
  await p.locator('#btnImport').click();
  await p.fill('#importUrl', MOCK_API + '/api-one.html');
  await p.fill('#importSource', 'Mock Finance Wire');
  await p.locator('#btnImportGo').click();
  await p.locator('#importModal').waitFor({ state: 'hidden', timeout: 10000 });
  const title = await p.locator('.doc-title').innerText();
  const hit = apiHits.find(x => x.auth === 'Bearer mock-key');
  ok('OpenAI-compatible annotation completes end to end', title === 'API Import Smoke' && !!hit, title);
  ok('API request carries model, article context and vocabulary focus',
    !!hit && hit.body.includes('mock-finance-model') && hit.body.includes('term premium') && hit.body.includes('IELTS'));
  await p.locator('#modeSeg button[data-mode="intensive"]').click();
  ok('API-imported article renders translated vocabulary', await p.locator('.para .w').count() > 0 && await p.locator('.kmark').count() > 0);
  await p.locator('#btnImport').click();
  await p.fill('#importUrl', MOCK_API + '/api-one.html');
  await p.locator('#btnImportGo').click();
  await p.locator('#importModal').waitFor({ state: 'hidden', timeout: 5000 });
  const customCount = await p.evaluate(() => JSON.parse(localStorage.getItem('finlens.v1')).custom.length);
  ok('Duplicate article imports open the existing article', customCount === 1 && await p.locator('#importModal').isHidden());
  await p.locator('#sideTabs button[data-tab="tutor"]').click();
  const summaryButton = p.locator('#btnGenerateSummary');
  const hasTutor = await summaryButton.count() === 1;
  if (hasTutor) await summaryButton.click();
  const summaryReady = hasTutor && await p.locator('.tutor-summary').waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
  ok('Article summary is generated from the LLM API', summaryReady &&
    (await p.locator('.tutor-summary').innerText()).includes('期限溢价上升'));
  if (summaryReady) {
    await p.fill('#tutorQuestion', 'Why did the term premium rise?');
    await p.locator('#btnTutorAsk').click();
  }
  const answerReady = summaryReady && await p.locator('.inline-ai-message').last().waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
  const answerText = answerReady ? await p.locator('.inline-ai-message').last().innerText() : '';
  ok('Article follow-up question returns a grounded answer', answerReady &&
    answerText.includes('长期持有补偿') && answerText.includes('原文依据') &&
    answerText.includes('知识库依据') && answerText.includes('权威依据'));
  const skillHit = apiHits.find(item => item.body.includes('结构化摘要'));
  ok('LLM requests use the dedicated finance teaching skill',
    !!skillHit && skillHit.body.includes('财经英语导师') && skillHit.body.includes('传导渠道'));
});

await isolated(async (p) => {
  const result = await p.evaluate(async ({ feed, from, to }) => {
    const r = await fetch('/api/feed', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ feeds: [feed], from, to, limit: 10 })
    });
    const text = await r.text();
    let body = {};
    try { body = JSON.parse(text); } catch (e) {}
    return { status: r.status, body };
  }, { feed: MOCK_API + '/feed.xml', from: dateOnly(dateAgo(180)), to: dateOnly(new Date()) });
  const urls = result.body.items ? result.body.items.map(x => x.url) : [];
  ok('Feed API parses RSS and filters the selected date window',
    result.status === 200 && urls.length === 2 && urls.every(x => !x.includes('old')), urls.join(', '));

  const invalid = await p.evaluate(async ({ feed, from, to }) => {
    const r = await fetch('/api/feed', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ feeds: [feed], from, to, limit: 10 })
    });
    return r.status;
  }, { feed: MOCK_API + '/feed.xml', from: dateOnly(dateAgo(420)), to: dateOnly(new Date()) });
  ok('Feed API rejects a window longer than one year', invalid === 400, `status=${invalid}`);

  const failedFeed = await p.evaluate(async ({ feed, from, to }) => {
    const r = await fetch('/api/feed', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ feeds: [feed], from, to, limit: 10 })
    });
    const body = await r.json();
    return { status: r.status, ok: body.ok, error: body.error || '' };
  }, { feed: MOCK_API + '/missing-feed.xml', from: dateOnly(dateAgo(30)), to: dateOnly(new Date()) });
  ok('Feed API surfaces a total subscription failure', failedFeed.status === 400 && !failedFeed.ok && failedFeed.error);
});

await isolated(async (p) => {
  await p.locator('#btnImport').click();
  await p.locator('#importModal').waitFor({ state: 'visible' });
  const fields = ['#setCrawlFeeds', '#setCrawlFrom', '#setCrawlTo', '#setAutoCrawl', '#setCrawlIntervalMin', '#btnCrawlNow'];
  const visible = await Promise.all(fields.map(sel => p.locator(sel).isVisible()));
  ok('Crawler controls expose feeds, dates, automation and manual refresh',
    visible.every(Boolean), fields.filter((_, i) => !visible[i]).join(', '));
});

await isolated(async (p) => {
  const config = {
    baseUrl: MOCK_API + '/v1',
    model: 'mock-finance-model',
    apiKey: 'mock-key',
    crawlFeeds: MOCK_API + '/feed.xml',
    crawlFrom: dateOnly(dateAgo(180)),
    crawlTo: dateOnly(new Date()),
    autoCrawl: true,
    crawlIntervalMin: 30,
    crawlMaxItems: 2,
    crawlAnnotate: true
  };
  await p.evaluate((settings) => {
    localStorage.setItem('finlens.v1', JSON.stringify({
      settings,
      custom: [],
      read: {},
      words: {},
      marks: {},
      notes: {},
      days: [],
      lastCrawlAt: 0
    }));
  }, config);
  await p.reload({ waitUntil: 'networkidle' });
  let imported = 0;
  try {
    await p.waitForFunction(() => {
      const raw = JSON.parse(localStorage.getItem('finlens.v1') || '{}');
      return Array.isArray(raw.custom) && raw.custom.length === 2;
    }, { timeout: 15000 });
    imported = await p.evaluate(() => JSON.parse(localStorage.getItem('finlens.v1')).custom.length);
  } catch (e) {}
  const custom = imported ? await p.evaluate(() => JSON.parse(localStorage.getItem('finlens.v1')).custom) : [];
  const titles = custom.map(x => x.title);
  ok('Automatic crawl imports new articles without pasting each URL',
    imported === 2 && titles.includes('New Article A') && titles.includes('New Article B') && custom.every(x => x.vocab.length > 0),
    titles.join(', '));
});

mock.close();

const realErrors = errors.filter(e => !/status of 400 \(Bad Request\)/.test(e));
ok('无 JS 运行时错误', realErrors.length === 0, realErrors.slice(0, 3).join(' | '));

await browser.close();

const fail = results.filter(r => !r.pass);
console.log(`\n=== ${results.length - fail.length}/${results.length} 通过 ===`);
if (fail.length) { console.log('失败项：'); fail.forEach(f => console.log(' -', f.name, f.extra)); process.exit(1); }
