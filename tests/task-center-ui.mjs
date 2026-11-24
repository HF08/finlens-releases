import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const pwRequire = createRequire(process.env.PW_BASE || 'C:/Users/NORA/.workbuddy/binaries/node/workspace/');
const { chromium } = pwRequire('playwright-core');
const BASE = process.env.FINLENS_TEST_BASE || 'http://127.0.0.1:8787';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));

try {
  await page.goto(BASE, { waitUntil: 'networkidle' });

  const created = await page.evaluate(() => {
    const task = startTask('crawl', {
      title: '抓取测试',
      subtitle: 'Fixture feed',
      recovery: ['检查网络连接', '稍后重试']
    });
    updateTaskState(task.id, {
      status: 'running',
      progress: 42,
      step: 'fetch',
      message: '正在读取订阅源'
    });
    return {
      task,
      card: document.querySelector('#engineCard')?.innerText || '',
      summary: taskCenterSummary(),
      hasLegacyProgress: Boolean(document.querySelector('#aiProgressPanel')),
      hasCrawlStatus: Boolean(document.querySelector('#crawlStatus'))
    };
  });

  assert.match(created.card, /任务中心/);
  assert.match(created.card, /42%/);
  assert.equal(created.summary.running, 1);
  assert.equal(created.hasLegacyProgress, false);
  assert.equal(created.hasCrawlStatus, false);

  await page.locator('#engineCard').click();
  await page.locator('#taskCenterModal').waitFor({ state: 'visible', timeout: 5000 });
  assert.match(await page.locator('#taskCenterModal').innerText(), /抓取测试/);
  assert.match(await page.locator('#taskCenterModal').innerText(), /正在读取订阅源/);

  const failed = await page.evaluate(taskId => {
    failTaskState(taskId, 'network down', ['检查网络连接', '稍后重试']);
    renderTaskCenter();
    return {
      summary: taskCenterSummary(),
      card: document.querySelector('#engineCard')?.innerText || ''
    };
  }, created.task.id);
  assert.equal(failed.summary.failed, 1);
  assert.match(failed.card, /1 个失败/);

  await page.locator('#taskCenterModal [data-task-filter="failed"]').click();
  const failedText = await page.locator('#taskCenterModal').innerText();
  assert.match(failedText, /network down/);
  assert.match(failedText, /检查网络连接/);
  assert.match(failedText, /重试/);
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileLayout = await page.evaluate(() => {
    const modal = document.querySelector('#taskCenterModal .modal-body');
    const rect = modal.getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      width: rect.width,
      viewport: window.innerWidth
    };
  });
  assert.ok(mobileLayout.width <= mobileLayout.viewport && mobileLayout.overflow <= 1, JSON.stringify(mobileLayout));
  assert.deepEqual(errors, []);

  console.log('PASS task center summary, modal filters, failure recovery and legacy surface removal');
} finally {
  await context.close();
  await browser.close();
}
