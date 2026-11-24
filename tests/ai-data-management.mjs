/* AI 聊天历史与文章学习数据管理。 */
import { createRequire } from 'node:module';

const req = createRequire(process.env.PW_BASE || 'C:/Users/NORA/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright-core');
const BASE = process.env.FINLENS_TEST_BASE || 'http://127.0.0.1:8787';

const results = [];
const check = (name, condition, extra = '') => {
  results.push({ name, pass: !!condition, extra });
  console.log(`${condition ? 'PASS' : 'FAIL'} ${name}${extra ? ' - ' + extra : ''}`);
};

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error') errors.push(message.text());
});

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.locator('[data-open-learning]').first().click();
const dataEntry = page.locator('#btnOpenAIData');
check('Learning settings expose unified AI and article data management',
  await dataEntry.count() === 1);
if (await dataEntry.count()) await dataEntry.click();
check('Unified data management opens as a dedicated panel',
  await page.locator('#aiDataModal').count() === 1 &&
  (await dataEntry.count() ? await page.locator('#aiDataModal').isVisible() : false));
await page.locator('#aiDataModal .modal-head [data-close]').click();
await page.route('**/api/ask', route => route.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({
    ok: true,
    result: {
      answer: '这句话用于测试知识卡问答历史。',
      originalEvidence: [{ quote: 'Knowledge evidence', interpretation: '原文依据。' }],
      knowledgeBasis: ['知识卡依据'],
      authorityBasis: []
    }
  })
}));
await page.locator('.nav-item[data-view="knowledge"]').click();
await page.locator('.kb-card').first().click();
await page.fill('#knowledgeQuestion', '这张知识卡如何影响当前文章？');
await page.locator('#btnAskKnowledge').click();
await page.locator('#knowledgeDetailContent .knowledge-answer').waitFor({ state: 'visible' });
const storedKnowledgeHistory = await page.evaluate(() =>
  Object.values(S.knowledgeTutor || {}).reduce((sum, group) =>
    sum + (Array.isArray(group.messages) ? group.messages.length : 0), 0));
check('Knowledge-card follow-up is persisted in chat history',
  storedKnowledgeHistory === 1,
  String(storedKnowledgeHistory));
await page.locator('#btnKnowledgeHistory').click();
check('Knowledge-card history expands in place without leaving the card',
  await page.locator('#knowledgeInlineHistory').isVisible() &&
  await page.locator('#knowledgeInlineHistory').innerText().then(text =>
    text.includes('这张知识卡如何影响当前文章？')) &&
  await page.locator('#aiDataModal').isHidden());
await page.locator('#btnKnowledgeHistoryManage').click();
const knowledgeHistoryText = await page.locator('#aiHistoryList').innerText();
check('Knowledge-card history opens in the unified manager',
  await page.locator('#aiDataModal').isVisible() &&
  knowledgeHistoryText.includes('这张知识卡如何影响当前文章？') &&
  knowledgeHistoryText.includes('知识卡'),
  knowledgeHistoryText.slice(0, 220));
const cleanupFixture = await page.evaluate(() => {
  const article = ARTICLES[0];
  S.marks[article.id] = [{
    id: 'test-article-mark',
    type: 'sentence',
    i: 0,
    text: 'A saved sentence.',
    note: 'A saved note.',
    ts: Date.now()
  }];
  S.notes[article.id] = { 0: 'Legacy note.' };
  S.tutor[article.id] = [{
    id: 'test-article-chat',
    q: 'Article question',
    a: 'Article answer',
    createdAt: Date.now()
  }];
  S.read[article.id] = { done: true, ts: Date.now() };
  save();
  renderAIDataManager();
  return { articleId: article.id, title: article.title };
});
await page.locator('#aiDataModal .modal-head [data-close]').click();
await page.locator('.nav-item[data-view="reader"]').click();
await page.locator('#sideTabs button[data-tab="tutor"]').click();
await page.locator('#btnTutorHistory').click();
check('Reader AI synthesis history expands in place',
  await page.locator('#tutorInlineHistory').isVisible() &&
  await page.locator('#tutorInlineHistory').innerText().then(text => text.includes('Article question')) &&
  await page.locator('#aiDataModal').isHidden());
const tutorHistoryAfterAsk = await page.evaluate(() => {
  const ask = document.querySelector('.tutor-ask');
  const history = document.querySelector('#tutorInlineHistory');
  return Boolean(ask && history && (ask.compareDocumentPosition(history) & Node.DOCUMENT_POSITION_FOLLOWING));
});
check('Reader article history appears after the article question controls',
  tutorHistoryAfterAsk);
await page.locator('#btnTutorHistoryManage').click();
const articleHistoryText = await page.locator('#aiHistoryList').innerText();
check('Reader AI summary history opens the same manager in article context',
  await page.locator('#aiDataModal').isVisible() &&
  articleHistoryText.includes('Article question') &&
  articleHistoryText.includes('文章总结') &&
  (await page.locator('#aiDataContext').innerText()).includes(cleanupFixture.title),
  articleHistoryText.slice(0, 180));
await page.waitForTimeout(350);
await page.screenshot({ path: 'tests/shots/ai-data-management.png' });
await page.fill('#aiDataSearch', 'Article question');
const searchedHistoryText = await page.locator('#aiHistoryList').innerText();
check('AI history search filters by question keywords',
  searchedHistoryText.includes('Article question') &&
  !searchedHistoryText.includes('这张知识卡如何影响当前文章？'),
  searchedHistoryText.slice(0, 180));
await page.fill('#aiDataSearch', '');
let cleanupPrompt = '';
page.once('dialog', async dialog => {
  cleanupPrompt = dialog.message();
  await dialog.accept();
});
await page.locator(`[data-clear-article-data="${cleanupFixture.articleId}"]`).click();
await page.waitForFunction(articleId => !S.marks[articleId] && !S.tutor[articleId], cleanupFixture.articleId);
const afterCleanup = await page.evaluate(articleId => ({
  marks: S.marks[articleId] || [],
  notes: S.notes[articleId] || null,
  articleChats: S.tutor[articleId] || [],
  knowledgeChats: Object.values(S.knowledgeTutor || {})
    .filter(group => group.articleId === articleId)
    .reduce((sum, group) => sum + (group.messages || []).length, 0),
  readPreserved: Boolean(S.read[articleId]?.done),
  restorePoints: S.deletedArticleData?.length || 0
}), cleanupFixture.articleId);
check('Article cleanup warns with exact counts and keeps reading progress',
  cleanupPrompt.includes('用户标注 1 条') &&
  cleanupPrompt.includes('文章 AI 问答 1 条') &&
  cleanupPrompt.includes('知识卡问答 1 条') &&
  cleanupPrompt.includes('恢复点') &&
  afterCleanup.marks.length === 0 &&
  !afterCleanup.notes &&
  afterCleanup.articleChats.length === 0 &&
  afterCleanup.knowledgeChats === 0 &&
  afterCleanup.readPreserved &&
  afterCleanup.restorePoints === 1,
  JSON.stringify({ cleanupPrompt, afterCleanup }));
await page.locator('[data-restore-article-data]').first().click();
const afterRestore = await page.evaluate(articleId => ({
  marks: (S.marks[articleId] || []).length,
  notes: Boolean(S.notes[articleId]?.[0]),
  articleChats: (S.tutor[articleId] || []).length,
  knowledgeChats: Object.values(S.knowledgeTutor || {})
    .filter(group => group.articleId === articleId)
    .reduce((sum, group) => sum + (group.messages || []).length, 0),
  restorePoints: S.deletedArticleData?.length || 0
}), cleanupFixture.articleId);
check('Article cleanup can be restored from its automatic recovery point',
  afterRestore.marks === 1 &&
  afterRestore.notes &&
  afterRestore.articleChats === 1 &&
  afterRestore.knowledgeChats === 1 &&
  afterRestore.restorePoints === 0,
  JSON.stringify(afterRestore));
check('Data management has no JavaScript runtime errors',
  errors.length === 0,
  errors.slice(0, 3).join(' | '));

await context.close();

const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mobilePage = await mobileContext.newPage();
const mobileErrors = [];
mobilePage.on('pageerror', error => mobileErrors.push(error.message));
await mobilePage.goto(BASE, { waitUntil: 'networkidle' });
await mobilePage.locator('[data-open-learning]').first().click();
await mobilePage.locator('#btnOpenAIData').click();
const mobileLayout = await mobilePage.evaluate(() => ({
  overflow: document.documentElement.scrollWidth - innerWidth,
  modalVisible: !document.querySelector('#aiDataModal')?.hidden,
  searchVisible: Boolean(document.querySelector('#aiDataSearch')?.offsetWidth),
  articleDataVisible: Boolean(document.querySelector('#articleDataList')?.offsetWidth)
}));
check('AI and article data management fits mobile without horizontal overflow',
  mobileLayout.overflow <= 0 &&
  mobileLayout.modalVisible &&
  mobileLayout.searchVisible &&
  mobileLayout.articleDataVisible &&
  mobileErrors.length === 0,
  JSON.stringify({ mobileLayout, mobileErrors }));
await mobileContext.close();
await browser.close();

const failures = results.filter(result => !result.pass);
console.log(`\n=== ${results.length - failures.length}/${results.length} passed ===`);
if (failures.length) process.exitCode = 1;
