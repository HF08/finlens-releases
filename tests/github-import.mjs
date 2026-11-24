/* Live integration check for the awesome-english-ebooks EPUB import.
 * Run with: node tests/github-import.mjs
 */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const req = createRequire(process.env.PW_BASE || 'C:/Users/NORA/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const APP_PORT = 8801;
const BASE = `http://127.0.0.1:${APP_PORT}`;
const OUT = path.resolve('tests/shots/feedback-final');
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const check = (name, condition, extra = '') => {
  results.push({ name, status: condition ? 'pass' : 'fail', extra });
  console.log(`${condition ? 'PASS' : 'FAIL'} ${name}${extra ? ' - ' + extra : ''}`);
};
const skip = (name, extra = '') => {
  results.push({ name, status: 'skip', extra });
  console.log(`SKIP ${name}${extra ? ' - ' + extra : ''}`);
};

const FIXTURE_ISSUE = {
  name: 'te_2026.10.31',
  path: '01_economist/te_2026.10.31',
  type: 'dir'
};
const FIXTURE_EPUB = {
  name: 'TheEconomist.2026.10.31.epub',
  path: '01_economist/te_2026.10.31/TheEconomist.2026.10.31.epub',
  type: 'file'
};
const FIXTURE_ARCHIVE_YEAR = {
  name: '2025',
  path: '01_economist/2025',
  type: 'dir'
};
const FIXTURE_ARCHIVE_ISSUE = {
  name: 'te_2025.12.27',
  path: '01_economist/2025/te_2025.12.27',
  type: 'dir'
};
const FIXTURE_ARCHIVE_EPUB = {
  name: 'TheEconomist.2025.12.27.epub',
  path: '01_economist/2025/te_2025.12.27/TheEconomist.2025.12.27.epub',
  type: 'file'
};
const FIXTURE_PREVIOUS_EPUB = {
  name: 'TheEconomist.2025.12.20.epub',
  path: '01_economist/2025/te_2025.12.27/TheEconomist.2025.12.20.epub',
  type: 'file'
};

const waitForServer = async () => {
  for (let i = 0; i < 60; i++) {
    try {
      const response = await fetch(BASE + '/api/health', { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('FinLens GitHub import test server did not start');
};

let server;
let browser;

try {
  server = spawn(process.execPath, ['server/server.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(APP_PORT) },
    stdio: 'ignore'
  });
  await waitForServer();

  let liveIssues = [];
  try {
    const topResponse = await fetch(BASE + '/api/github-resource?key=awesome', {
      signal: AbortSignal.timeout(30000)
    });
    const root = await topResponse.json();
    liveIssues = (Array.isArray(root.items) ? root.items : [])
      .filter(item => item.type === 'dir' && /^te_\d{4}\.\d{2}\.\d{2}$/i.test(item.name))
      .sort((a, b) => b.name.localeCompare(a.name));
    if (!topResponse.ok || !root.ok) {
      skip('Live GitHub issue directories are available', root.error || String(topResponse.status));
    } else {
      check('Live GitHub issue directories are available', liveIssues.length > 0, `${liveIssues.length} issues`);
    }
  } catch (error) {
    skip('Live GitHub issue directories are available', String(error.message || error));
  }

  const latest = liveIssues[0] || FIXTURE_ISSUE;

  let epub = FIXTURE_EPUB;
  try {
    const listingResponse = await fetch(
      BASE + '/api/github-resource?key=awesome&path=' + encodeURIComponent(latest.path),
      { signal: AbortSignal.timeout(30000) }
    );
    const listing = await listingResponse.json();
    const liveEpub = (Array.isArray(listing.items) ? listing.items : [])
      .find(item => item.type === 'file' && /\.epub$/i.test(item.name));
    if (listingResponse.ok && listing.ok && liveEpub) {
      epub = liveEpub;
      check('Latest issue exposes its EPUB', true, `${latest.name}: ${epub.name}`);
    } else {
      skip('Latest issue exposes its EPUB', listing.error || 'directory response unavailable');
    }
  } catch (error) {
    skip('Latest issue exposes its EPUB', String(error.message || error));
  }

  const parsedResponse = await fetch(
    BASE + '/api/github-epub?path=' + encodeURIComponent(epub?.path || ''),
    { signal: AbortSignal.timeout(130000) }
  );
  const parsed = await parsedResponse.json();
  check('EPUB parses into selectable articles', parsedResponse.ok && parsed.ok && parsed.chapters?.length > 0,
    `${parsed.chapters?.length || 0} articles`);
  if (!parsed.ok || !parsed.chapters?.length) {
    throw new Error(parsed.error || 'EPUB parsing failed');
  }
  check('Parsed articles contain readable paragraphs',
    (parsed.chapters?.[0]?.paragraphs?.length || 0) > 0,
    `${parsed.chapters?.[0]?.title || 'missing'} / ${parsed.chapters?.[0]?.paragraphs?.length || 0} paragraphs`);

  const cacheResponse = await fetch(BASE + '/data/cache/');
  const traversalResponse = await fetch(BASE + '/api/github-epub?path=..%2Fsecret.epub');
  check('EPUB cache is not exposed as static content', cacheResponse.status === 403, String(cacheResponse.status));
  check('EPUB path traversal is rejected', traversalResponse.status === 400, String(traversalResponse.status));

  const financeResponse = await fetch(BASE + '/api/github-resource?key=financeReader', {
    signal: AbortSignal.timeout(30000)
  });
  const finance = await financeResponse.json();
  check('Legacy FinanceReader GitHub resource is disabled',
    financeResponse.status === 400 && /未知 GitHub 资源/.test(finance.error || ''),
    `${financeResponse.status}: ${finance.error || ''}`);

  const nestedEpubResponse = await fetch(
    BASE + '/api/github-epub?path=' + encodeURIComponent(FIXTURE_ARCHIVE_EPUB.path),
    { signal: AbortSignal.timeout(30000) }
  );
  check('Nested archive EPUB path passes validation',
    nestedEpubResponse.status !== 400,
    String(nestedEpubResponse.status));

  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1512, height: 950 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  let requestedArchiveEpub = '';
  await page.route('**/api/github-epub?*', async route => {
    const url = new URL(route.request().url());
    requestedArchiveEpub = url.searchParams.get('path') || '';
    if (requestedArchiveEpub === FIXTURE_ARCHIVE_EPUB.path) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, chapters: parsed.chapters.slice(0, 2) })
      });
      return;
    }
    await route.continue();
  });
  await page.route('**/api/github-resource?*', async route => {
    const url = new URL(route.request().url());
    const requestedPath = url.searchParams.get('path');
    let items;
    if (!requestedPath) items = [latest, FIXTURE_ARCHIVE_YEAR];
    else if (requestedPath === FIXTURE_ARCHIVE_YEAR.path) items = [FIXTURE_ARCHIVE_ISSUE];
    else if (requestedPath === FIXTURE_ARCHIVE_ISSUE.path) items = [FIXTURE_PREVIOUS_EPUB, FIXTURE_ARCHIVE_EPUB];
    else items = [epub];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, items })
    });
  });

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.locator('[data-open-engine]').first().click();
  await page.locator('#engineModal').waitFor({ state: 'visible' });
  await page.locator('#btnImportAwesomeFeeds').click();
  await page.waitForFunction(
    expected => document.querySelectorAll('#awesomeChapterSelect option').length === expected,
    parsed.chapters.length,
    { timeout: 130000 }
  );

  const issueCount = await page.locator('#awesomeIssueSelect option').count();
  const chapterCount = await page.locator('#awesomeChapterSelect option').count();
  check('Browser lists issues and articles for selection',
    issueCount === 2 && chapterCount === parsed.chapters.length,
    `${issueCount} issues / ${chapterCount} articles`);

  const selectedIssue = await page.locator('#awesomeIssueSelect').inputValue();
  check('Browser defaults to the latest issue', selectedIssue === latest.path, latest.name);

  await page.selectOption('#awesomeIssueSelect', FIXTURE_ARCHIVE_ISSUE.path);
  await page.waitForFunction(() => document.querySelectorAll('#awesomeChapterSelect option').length === 2);
  check('Archive issue selects the EPUB matching its date',
    requestedArchiveEpub === FIXTURE_ARCHIVE_EPUB.path,
    requestedArchiveEpub);
  await page.selectOption('#awesomeIssueSelect', latest.path);
  await page.waitForFunction(
    expected => document.querySelectorAll('#awesomeChapterSelect option').length === expected,
    parsed.chapters.length
  );

  await page.locator('#githubAwesomeControls').scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(OUT, 'github-epub-import.png') });

  const selectedChapter = await page.locator('#awesomeChapterSelect option:checked').innerText();
  const selectedTitle = selectedChapter.split(' \u00b7 ')[0];
  await page.locator('#btnImportAwesomeChapter').click();
  await page.locator('#engineModal').waitFor({ state: 'hidden', timeout: 15000 });
  await page.waitForFunction(
    title => document.querySelector('.doc-title')?.textContent.trim() === title,
    selectedTitle,
    { timeout: 15000 }
  );

  const imported = await page.evaluate(title => {
    const state = JSON.parse(localStorage.getItem('finlens.v1') || '{}');
    return (state.custom || []).find(article =>
      article.title === title && article.source === 'The Economist \u00b7 GitHub EPUB'
    );
  }, selectedTitle);
  check('Selected article imports into the reader',
    !!imported && imported.paragraphs?.length > 0 && imported._url?.startsWith('github://01_economist/'),
    `${selectedTitle} / ${imported?.paragraphs?.length || 0} paragraphs`);
  const renderedSource = await page.locator('.k-src').innerText();
  check('Reader shows the GitHub EPUB source',
    renderedSource.toUpperCase() === 'THE ECONOMIST \u00b7 GITHUB EPUB', JSON.stringify(renderedSource));
  check('Import flow has no JavaScript runtime errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  await page.screenshot({ path: path.join(OUT, 'github-epub-reader.png') });
} finally {
  if (browser) await browser.close();
  if (server && !server.killed) server.kill();
}

const failed = results.filter(result => result.status === 'fail');
const skipped = results.filter(result => result.status === 'skip');
const passed = results.filter(result => result.status === 'pass');
console.log(`\n=== ${passed.length}/${results.length - skipped.length} passed, ${skipped.length} skipped ===`);
if (failed.length) {
  for (const result of failed) console.log(' -', result.name, result.extra);
  process.exitCode = 1;
}
