import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const pwRequire = createRequire(process.env.PW_BASE || 'C:/Users/NORA/.workbuddy/binaries/node/workspace/');
const { chromium } = pwRequire('playwright-core');
const BASE = process.env.FINLENS_TEST_BASE || 'http://127.0.0.1:8787';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => {
  errors.push(error.message);
  console.error('PAGEERROR', error.message);
});

try {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForFunction(
    () => document.querySelectorAll('#articleList .acard').length >= 5,
    null,
    { timeout: 10000 }
  );
  const created = await page.evaluate(() => {
    const date = FinLensLearningEvents.dateKey();
    const article = ARTICLES[0];
    addPlanItem(date, article.id, 'read');
    saveDayPlan(date, { readTarget: 1, wordTarget: 1, note: 'Calendar fixture' });
    recordArticleEvent('article-read', article.id);
    recordWordEvent('word-learned', {
      articleId: article.id,
      wordKey: `${article.id}:${article.vocab[0].w}`,
      word: article.vocab[0].w,
      score: 2,
      source: 'test'
    });
    return { date, articleId: article.id, day: dayPlanState(date) };
  });

  assert.equal(created.day.plan.items.length, 1);
  assert.equal(created.day.plan.items[0].articleId, created.articleId);
  assert.equal(created.day.summary.readCount, 1);
  assert.equal(created.day.summary.words.length, 1);
  assert.equal(created.day.summary.targets.readCompleted, true);
  assert.equal(created.day.summary.targets.wordsCompleted, true);

  await page.locator('.nav-item[data-view="plan"]').click();
  await page.locator('#view-plan').waitFor({ state: 'visible' });
  assert.match(await page.locator('#planMonthLabel').innerText(), /年/);
  assert.ok(await page.locator('#planCalendarGrid [data-plan-date]').count() >= 28);
  assert.equal(await page.locator('[data-plan-note]').inputValue(), 'Calendar fixture');
  assert.ok(await page.locator('#learningHeatmap .heatmap-cell').count() >= 100);
  const heatmapCellSize = await page.locator('#learningHeatmap .heatmap-cell').first()
    .evaluate(cell => {
      const box = cell.getBoundingClientRect();
      return { width: box.width, height: box.height };
    });
  assert.ok(heatmapCellSize.width >= 15 && heatmapCellSize.height >= 15,
    JSON.stringify(heatmapCellSize));
  assert.equal(await page.locator('#learningActivityBars [data-activity-panel]').count(), 4);
  const weeklyBarCounts = await page.locator('#learningActivityBars [data-activity-panel]')
    .evaluateAll(panels => panels.map(panel => panel.querySelectorAll('.activity-bar').length));
  assert.deepEqual(weeklyBarCounts, [12, 12, 12, 12]);
  assert.equal(await page.locator('#learningActiveRateChart svg').count(), 1);
  assert.equal(await page.locator('#learningActiveRateChart .active-rate-point').count(), 30);
  assert.ok(await page.locator('#learningActiveRateChart .active-rate-target').count() >= 1);
  await page.locator('#learningActivityBand').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'tests/shots/feedback-final/learning-analytics-v57.png' });
  await page.locator('#learningActiveRateBand').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'tests/shots/feedback-final/learning-active-rate-v57.png' });

  await page.reload({ waitUntil: 'networkidle' });
  const persisted = await page.evaluate(date => {
    const day = dayPlanState(date);
    return {
      plan: day.plan,
      summary: {
        readCount: day.summary.readCount,
        wordCount: day.summary.words.length
      }
    };
  }, created.date);
  assert.equal(persisted.plan.note, 'Calendar fixture');
  assert.equal(persisted.summary.readCount, 1);
  assert.equal(persisted.summary.wordCount, 1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.nav-item[data-view="plan"]').click();
  await page.locator('#view-plan').waitFor({ state: 'visible' });
  const mobileLayout = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    calendarVisible: Boolean(document.querySelector('#planCalendarGrid')),
    dayVisible: Boolean(document.querySelector('#planDayBody')),
    heatmapVisible: Boolean(document.querySelector('#learningHeatmap')),
    activityVisible: Boolean(document.querySelector('#learningActivityBars [data-activity-panel]')),
    activeRateVisible: Boolean(document.querySelector('#learningActiveRateChart svg'))
  }));
  assert.ok(mobileLayout.overflow <= 1 && mobileLayout.calendarVisible &&
    mobileLayout.dayVisible && mobileLayout.heatmapVisible &&
    mobileLayout.activityVisible && mobileLayout.activeRateVisible, JSON.stringify(mobileLayout));
  await page.locator('#learningActivityBand').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'tests/shots/feedback-final/learning-analytics-mobile-v57.png' });
  await page.locator('#learningActiveRateBand').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'tests/shots/feedback-final/learning-active-rate-mobile-v57.png' });
  assert.deepEqual(errors, []);

  console.log('PASS learning calendar plans, actual history, targets, heatmap, activity bars and active-rate chart');
} finally {
  await context.close();
  await browser.close();
}
