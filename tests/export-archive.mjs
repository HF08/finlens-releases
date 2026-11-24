/* 产出与归档：精读解析选段、PDF 下载和归档记录。 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const req = createRequire(process.env.PW_BASE || 'C:/Users/NORA/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright-core');
const BASE = process.env.FINLENS_TEST_BASE || 'http://127.0.0.1:8787';
const OUT = path.resolve('tests/shots/export-archive');
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const check = (name, condition, extra = '') => {
  results.push({ name, pass: !!condition, extra });
  console.log(`${condition ? 'PASS' : 'FAIL'} ${name}${extra ? ' - ' + extra : ''}`);
};

const pdfResponse = await fetch(`${BASE}/api/pdf`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    name: 'FinLens-test.pdf',
    html: '<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:serif}h1{color:#1d4ed8}</style></head><body><h1>FinLens PDF 测试</h1><p>Generated locally.</p></body></html>'
  })
});
const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
check('PDF endpoint returns a downloadable PDF',
  pdfResponse.status === 200 &&
  /application\/pdf/i.test(pdfResponse.headers.get('content-type') || '') &&
  /attachment/i.test(pdfResponse.headers.get('content-disposition') || '') &&
  pdfBuffer.subarray(0, 5).toString() === '%PDF-',
  `${pdfResponse.status} ${pdfResponse.headers.get('content-type')} ${pdfBuffer.length} bytes`);

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 950 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error') errors.push(message.text());
});

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.locator('#sideTabs button[data-tab="analysis"]').click();
const importButton = page.locator('.analysis-card .analysis-import').first();
check('Reader analysis cards expose an import action', await importButton.count() === 1);
if (await importButton.count()) {
  await importButton.click();
  check('Imported analysis stays visibly selected',
    (await importButton.innerText()).includes('已加入'));
}
check('No JavaScript runtime errors while importing analysis', errors.length === 0, errors.slice(0, 3).join(' | '));

await page.locator('.nav-item[data-view="export"]').click();
await page.locator('#view-export').waitFor({ state: 'visible' });
const exportSummary = await page.locator('#exportAnalysisSummary').innerText();
check('Output view carries imported analysis into the handout setup',
  (await page.locator('.export-analysis-heading').innerText()).includes('精读解析选段') &&
  exportSummary.includes('已选 1'),
  exportSummary);
check('Output view lists analyzed paragraphs with explicit choices',
  await page.locator('#exportAnalysisSummary input[data-export-analysis-pick]').count() >= 1 &&
  exportSummary.includes('第 01 段'),
  exportSummary);
const analysisChoiceCount = await page.locator('#exportAnalysisSummary input[data-export-analysis-pick]').count();
await page.locator('#exportAnalysisSelectAll').check();
check('Analysis selection supports select all',
  await page.locator('#exportAnalysisSummary input[data-export-analysis-pick]:checked').count() === analysisChoiceCount,
  `${analysisChoiceCount} choices`);
await page.locator('#exportAnalysisSelectAll').uncheck();
check('Clearing select all removes all analysis choices',
  await page.locator('#exportAnalysisSummary input[data-export-analysis-pick]:checked').count() === 0);
await page.locator('#exportAnalysisSummary input[data-select-article-analysis]').first().check();
check('Each article supports selecting all of its analysis paragraphs',
  await page.locator('#exportAnalysisSummary input[data-export-analysis-pick]:checked').count() === analysisChoiceCount,
  `${analysisChoiceCount} choices`);
await page.locator('#exportAnalysisSummary input[data-select-article-analysis]').first().uncheck();
check('Per-article select all can clear that article analysis choices',
  await page.locator('#exportAnalysisSummary input[data-export-analysis-pick]:checked').count() === 0);
await page.locator('#exportAnalysisSummary input[data-export-analysis-pick]').first().check();
check('Output view exposes a vocabulary focus choice',
  await page.locator('#exportFocusSelect').count() === 1 &&
  await page.locator('#exportFocusSelect option').count() >= 5);
if (await page.locator('#exportFocusSelect').count()) await page.selectOption('#exportFocusSelect', 'finance');
const selectedExportFocus = await page.evaluate(() => S.exportPicks?.options?.focus || '');
check('Vocabulary focus selection is stored for this handout',
  selectedExportFocus === 'finance',
  selectedExportFocus);
check('Output view offers a direct PDF download',
  (await page.locator('#btnExportPdf').innerText()).includes('下载 PDF'));

const pdfDownloadPromise = page.waitForEvent('download', { timeout: 30000 });
await page.locator('#btnExportPdf').click();
const pdfDownload = await pdfDownloadPromise;
const generatedPdf = path.join(OUT, 'FinLens-handout.pdf');
await pdfDownload.saveAs(generatedPdf);
const generatedBytes = fs.readFileSync(generatedPdf);
check('PDF button downloads a real PDF file',
  generatedBytes.subarray(0, 5).toString() === '%PDF-' && generatedBytes.length > 10000,
  `${generatedBytes.length} bytes`);

const extracted = await page.evaluate(async data => {
  const response = await fetch('/api/document', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'FinLens-handout.pdf', data })
  });
  return response.json();
}, generatedBytes.toString('base64'));
const extractedText = (extracted.paragraphs || []).join('\n');
check('Generated handout contains selected intensive analysis',
  extracted.ok &&
  extractedText.includes('精读解析选段') &&
  extractedText.includes('PARAGRAPH 01'),
  extractedText.slice(0, 260));
check('Generated handout keeps knowledge cards without authority sources',
  extracted.ok &&
  extractedText.includes('知识卡') &&
  !extractedText.includes('权威来源'),
  extractedText.includes('知识卡'));

await page.locator('.export-archive-item').first().waitFor({ state: 'visible' });
check('Successful PDF export is recorded in the archive',
  (await page.locator('.export-archive-item').first().innerText()).includes('PDF'));
await page.reload({ waitUntil: 'networkidle' });
await page.locator('.nav-item[data-view="export"]').click();
check('Export archive survives reload',
  (await page.locator('.export-archive-item').count()) >= 1);

await page.screenshot({ path: path.join(OUT, 'analysis-import.png') });
await context.close();

const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mobilePage = await mobileContext.newPage();
const mobileErrors = [];
mobilePage.on('pageerror', error => mobileErrors.push(error.message));
await mobilePage.goto(BASE, { waitUntil: 'networkidle' });
await mobilePage.locator('.nav-item[data-view="export"]').click();
await mobilePage.locator('#exportList input').first().check();
await mobilePage.locator('#exportAnalysisSummary input[data-export-analysis-pick]').first().waitFor({ state: 'visible' });
const mobileLayout = await mobilePage.evaluate(() => ({
  overflow: document.documentElement.scrollWidth - innerWidth,
  focusVisible: Boolean(document.querySelector('#exportFocusSelect')?.offsetWidth),
  pickerVisible: Boolean(document.querySelector('#exportAnalysisSummary input[data-export-analysis-pick]')?.offsetWidth)
}));
check('Mobile output view exposes focus and analysis choices without horizontal overflow',
  mobileLayout.overflow <= 0 && mobileLayout.focusVisible && mobileLayout.pickerVisible,
  JSON.stringify(mobileLayout));
check('Mobile output view has no JavaScript runtime errors', mobileErrors.length === 0, mobileErrors.slice(0, 3).join(' | '));
await mobilePage.waitForTimeout(2600);
await mobilePage.screenshot({ path: path.join(OUT, 'mobile-export-archive.png'), fullPage: false });
await mobilePage.locator('.export-analysis-heading').scrollIntoViewIfNeeded();
await mobilePage.screenshot({ path: path.join(OUT, 'mobile-analysis-picker.png'), fullPage: false });
await mobileContext.close();
await browser.close();

const failures = results.filter(result => !result.pass);
console.log(`\n=== ${results.length - failures.length}/${results.length} passed ===`);
if (failures.length) process.exitCode = 1;
