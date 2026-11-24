/* One-time user-data reset regression. */
import { createRequire } from 'node:module';

const req = createRequire(process.env.PW_BASE || 'C:/Users/NORA/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright-core');
const BASE = process.env.FINLENS_TEST_BASE || process.env.FINLENS_BASE || 'http://127.0.0.1:8787';
const RESET_VERSION = '2026-11-03-feedback-reset-v1';

const results = [];
const check = (name, condition, extra = '') => {
  results.push({ name, pass: !!condition, extra });
  console.log(`${condition ? 'PASS' : 'FAIL'} ${name}${extra ? ' - ' + extra : ''}`);
};

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await (await browser.newContext({ viewport: { width: 1512, height: 950 } })).newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.setItem('finlens.v1', JSON.stringify({
      read: { a1: { done: true, progress: 100 } },
      words: { 'a1:surge': { w: 'surge' } },
      marks: { a1: [{ i: 0, text: 'old mark' }] },
      notes: {},
      summaries: { a1: { overview: 'old summary' } },
      tutor: { a1: [{ q: 'old', a: 'old' }] },
      dictionaries: {},
      settings: { apiKey: 'old-secret', crawlFeeds: 'https://old.example/feed.xml' },
      days: ['2026-10-01'],
      today: { date: '2026-10-01', read: 9, words: 9 },
      lastArticle: 'a1',
      lastCrawlAt: 1,
      custom: [{ id: 'old-custom', title: 'Old imported article' }]
    }));
    localStorage.setItem('finlens.dataResetVersion', 'old-version');
  });
  await page.reload({ waitUntil: 'networkidle' });
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('finlens.v1') || 'null'));
  const resetVersion = await page.evaluate(() => localStorage.getItem('finlens.dataResetVersion'));
  check('One-time reset removes all learning and imported articles',
    state && !state.read?.a1 &&
    !Object.keys(state.words || {}).length &&
    !state.marks?.a1 &&
    !state.summaries?.a1 &&
    !state.tutor?.a1 &&
    !(state.custom || []).length,
    JSON.stringify({
      read: state?.read,
      words: Object.keys(state?.words || {}).length,
      custom: state?.custom?.length
    }));
  check('One-time reset restores initial settings without old secrets',
    !state?.settings?.apiKey &&
    state?.settings?.crawlFeeds?.includes('federalreserve.gov') &&
    resetVersion === RESET_VERSION,
    `${resetVersion} / key=${state?.settings?.apiKey || 'empty'}`);
  check('Initial corpus remains available after reset',
    await page.locator('.acard').count() === 5,
    `${await page.locator('.acard').count()} articles`);
} finally {
  await browser.close();
}

const failed = results.filter(result => !result.pass);
console.log(`\n=== ${results.length - failed.length}/${results.length} passed ===`);
if (failed.length) {
  for (const result of failed) console.log(' -', result.name, result.extra);
  process.exitCode = 1;
}
