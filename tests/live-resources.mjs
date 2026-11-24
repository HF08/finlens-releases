/* Live browser check against a running, network-enabled FinLens service.
 * Run with: node tests/live-resources.mjs
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const req = createRequire(process.env.PW_BASE || 'C:/Users/NORA/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const BASE = process.env.FINLENS_BASE || 'http://127.0.0.1:8787';
const OUT = path.resolve('tests/shots/feedback-final');
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const check = (name, condition, extra = '') => {
  results.push({ name, pass: !!condition, extra });
  console.log(`${condition ? 'PASS' : 'FAIL'} ${name}${extra ? ' - ' + extra : ''}`);
};

const health = await fetch(BASE + '/api/health', { signal: AbortSignal.timeout(5000) });
check('Running FinLens service is reachable', health.ok, `${health.status} ${BASE}`);

const dictionaryWords = ['surge', 'premium', 'inflation', 'yield', 'liquidity'];
const dictionaryChecks = [];
for (const word of dictionaryWords) {
  const response = await fetch(BASE + '/api/dictionary', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ word, contextMeaning: '' }),
    signal: AbortSignal.timeout(10000)
  });
  const body = await response.json();
  dictionaryChecks.push({
    word,
    ok: response.ok && body.ok && body.result?.sources?.ecdict === true && body.result?.senses?.length > 0
  });
}
check('Installed ECDICT database resolves finance vocabulary offline',
  dictionaryChecks.every(item => item.ok),
  dictionaryChecks.map(item => `${item.word}:${item.ok ? 'ok' : 'missing'}`).join(', '));

const to = new Date();
const from = new Date(to.getTime() - 364 * 86400000);
const fmt = date => date.toISOString().slice(0, 10);
const sampleFeeds = [
  'https://www.cnbc.com/id/100003114/device/rss/rss.html',
  'https://www.cnbc.com/id/10000664/device/rss/rss.html',
  'https://fortune.com/feed/',
  'https://feeds.npr.org/1006/rss.xml',
  'https://fred.stlouisfed.org/blog/rss/',
  'https://www.sec.gov/news/pressreleases.rss',
  'https://www.ecb.europa.eu/rss/press.html'
];
const feedResponse = await fetch(BASE + '/api/feed', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ feeds: sampleFeeds, from: fmt(from), to: fmt(to), limit: 10 }),
  signal: AbortSignal.timeout(60000)
});
const feed = await feedResponse.json();
check('Configuration list 2 all seven RSS feeds are fetchable',
  feedResponse.ok && feed.ok && (feed.errors || []).length === 0,
  `${feedResponse.status} / ${feed.items?.length || 0} items / ${feed.errors?.length || 0} errors`);

const importChecks = [];
for (const feedUrl of sampleFeeds) {
  try {
    const oneFeedResponse = await fetch(BASE + '/api/feed', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ feeds: [feedUrl], from: fmt(from), to: fmt(to), limit: 1 }),
      signal: AbortSignal.timeout(45000)
    });
    const oneFeed = await oneFeedResponse.json();
    const item = oneFeed.items?.[0];
    if (!item?.url) throw new Error(oneFeed.error || (oneFeed.errors || [])[0] || '没有候选文章');
    const pageResponse = await fetch(BASE + '/api/fetch?url=' + encodeURIComponent(item.url), {
      signal: AbortSignal.timeout(45000)
    });
    const page = await pageResponse.json();
    const words = (page.paragraphs || []).join(' ').match(/[A-Za-z][A-Za-z'-]*/g)?.length || 0;
    importChecks.push({
      feedUrl,
      title: item.title,
      ok: pageResponse.ok && page.ok === true && (page.paragraphs || []).length >= 2 && words >= 25,
      paragraphs: page.paragraphs?.length || 0,
      words,
      error: page.error || ''
    });
  } catch (error) {
    importChecks.push({
      feedUrl,
      title: '',
      ok: false,
      paragraphs: 0,
      words: 0,
      error: String(error?.message || error)
    });
  }
}
check('Configuration list 2 latest article bodies are importable',
  importChecks.every(item => item.ok),
  importChecks.map(item =>
    `${new URL(item.feedUrl).hostname}:${item.ok ? 'ok' : `fail(${item.error})`}`).join(' | '));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1512, height: 950 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.locator('[data-open-engine]').first().click();
  await page.locator('#engineModal').waitFor({ state: 'visible' });

  await page.locator('#btnImportAwesomeFeeds').click();
  await page.waitForFunction(() => {
    const issueCount = document.querySelectorAll('#awesomeIssueSelect option').length;
    const chapterCount = document.querySelectorAll('#awesomeChapterSelect option').length;
    return issueCount >= 40 && chapterCount > 0;
  }, null, { timeout: 130000 });

  const issueCount = await page.locator('#awesomeIssueSelect option').count();
  const chapterCount = await page.locator('#awesomeChapterSelect option').count();
  const latestIssue = await page.locator('#awesomeIssueSelect').inputValue();
  check('Awesome loads current and archived Economist issues',
    issueCount >= 90 && /^01_economist\/(?:\d{4}\/)?te_\d{4}\.\d{2}\.\d{2}$/.test(latestIssue),
    `${issueCount} issues / latest ${latestIssue}`);
  check('Latest Economist EPUB exposes selectable articles',
    chapterCount >= 50,
    `${chapterCount} articles`);

  await page.locator('#btnUseMarketMediaFeeds').click();
  const configuredFeeds = (await page.locator('#setCrawlFeeds').inputValue()).split('\n').filter(Boolean);
  check('Configuration list 2 replaces the subscription list with seven verified feeds',
    configuredFeeds.length === 7 &&
    configuredFeeds.some(feed => feed.includes('cnbc.com/id/100003114')) &&
    configuredFeeds.some(feed => feed.includes('sec.gov/news/pressreleases.rss')) &&
    configuredFeeds.some(feed => feed.includes('ecb.europa.eu/rss/press.html')) &&
    configuredFeeds.some(feed => feed.includes('fred.stlouisfed.org/blog/rss')) &&
    !configuredFeeds.some(feed => /seekingalpha|yahoo|nytimes|marketpulse|marketwatch|nasdaq\.com\/feed|RSSMarketsMain/i.test(feed)),
    `${configuredFeeds.length} feeds`);

  await page.locator('#githubAwesomeControls').scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(OUT, 'github-and-feeds-live.png') });
  check('Live resource flow has no JavaScript runtime errors',
    errors.length === 0,
    errors.slice(0, 3).join(' | '));
} finally {
  await browser.close();
}

const failed = results.filter(result => !result.pass);
console.log(`\n=== ${results.length - failed.length}/${results.length} passed ===`);
if (failed.length) {
  for (const result of failed) console.log(' -', result.name, result.extra);
  process.exitCode = 1;
}
