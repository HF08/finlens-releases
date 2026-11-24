import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const pwRequire = createRequire(process.env.PW_BASE || 'C:/Users/NORA/.workbuddy/binaries/node/workspace/');
const { chromium } = pwRequire('playwright-core');
const BASE = process.env.FINLENS_TEST_BASE || 'http://127.0.0.1:8787';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
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
  const fixture = await page.evaluate(() => {
    const article = ARTICLES[0];
    const vocab = article.vocab[0];
    const id = `${article.id}:${vocab.w}`;
    S.words[id] = {
      box: 0,
      due: Date.now() + 86400000,
      right: 1,
      wrong: 0,
      seen: 1,
      added: Date.now(),
      learnedAt: Date.now(),
      lastReviewedAt: Date.now(),
      lastScore: 2,
      reviewEligible: true
    };
    recordWordEvent('word-learned', {
      articleId: article.id,
      wordKey: id,
      word: vocab.w,
      score: 2,
      source: 'test'
    });
    save();
    return {
      word: vocab.w,
      count: todayExportWords().length
    };
  });
  assert.equal(fixture.count, 1);

  await page.locator('.nav-item[data-view="cards"]').click();
  await page.locator('#view-cards').waitFor({ state: 'visible' });
  await page.locator('#btnExportVocab').click();
  await page.locator('#vocabExportModal').waitFor({ state: 'visible' });
  assert.match(await page.locator('#vocabExportSummary').innerText(), /1/);

  const [cardDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#btnExportTodayCards').click()
  ]);
  assert.match(cardDownload.suggestedFilename(), /\.html$/);
  const cardPath = await cardDownload.path();
  const cardHtml = fs.readFileSync(cardPath, 'utf8');
  assert.match(cardHtml, new RegExp(fixture.word, 'i'));
  assert.match(cardHtml, /class="word-card"/);

  const [todayCsvDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#btnExportTodayCsv').click()
  ]);
  const todayCsv = fs.readFileSync(await todayCsvDownload.path(), 'utf8');
  assert.match(todayCsv, new RegExp(fixture.word, 'i'));

  const [allCsvDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#btnExportAllVocabCsv').click()
  ]);
  const allCsv = fs.readFileSync(await allCsvDownload.path(), 'utf8');
  assert.match(allCsv, /"Front","Back","Definition"/);
  assert.deepEqual(errors, []);

  console.log('PASS daily word cards, today CSV and full vocabulary CSV exports');
} finally {
  await context.close();
  await browser.close();
}
