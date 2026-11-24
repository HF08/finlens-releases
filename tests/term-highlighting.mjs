/* 知识卡关联术语应能从正文自动识别，而不依赖模型是否写入 {{术语}} 标记。 */
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
const highlightState = await page.evaluate(() => {
  const article = ARTICLES[0];
  openArticle(article.id);
  const plainParagraph = article.paragraphs.find(paragraph =>
    /\binflation\b/i.test(paragraph.en.replace(/\{\{|\}\}/g, '')) &&
    !/\{\{\s*inflation\s*\}\}/i.test(paragraph.en));
  article.knowledge.push({
    id: 'test-auto-kmark',
    term: 'inflation',
    en: 'Inflation',
    category: 'finance',
    categories: ['finance'],
    match: ['inflation', 'consumer prices'],
    one: '测试知识卡。',
    body: '用于验证正文中未显式标记的知识卡术语仍可高亮。',
    cases: ''
  });
  article.knowledge.push({
    id: 'test-ghost-kmark',
    term: 'not-present-term',
    en: 'Not present term',
    category: 'background',
    categories: ['background'],
    match: ['not-present-term'],
    one: '不存在的术语。',
    body: '不应出现在正文高亮中。',
    cases: ''
  });
  article.paragraphs.push({
    en: 'OpenAI researchers used Lean for formal verification of mathematical proofs.',
    zh: '',
    note: '',
    analysis: { english: {}, finance: {} }
  });
  article.paragraphs.push({
    en: '{{OpenAI}} published a separate model announcement.',
    zh: '',
    note: '',
    analysis: { english: {}, finance: {} }
  });
  article.knowledge.push({
    id: 'test-context-entity-kmark',
    term: 'Lean formal verification',
    en: 'Lean formal verification',
    category: 'method',
    categories: ['method'],
    match: ['OpenAI', 'Lean', 'formal verification', '形式化验证'],
    one: '一种形式化验证方法。',
    body: 'OpenAI 使用 Lean 对数学证明进行形式化验证。',
    cases: ''
  });
  S.settings.know = true;
  document.body.dataset.know = 'on';
  renderDoc();
  const contextMarks = [...document.querySelectorAll('.para .kmark[data-k="test-context-entity-kmark"]')]
    .map(mark => ({ term: mark.dataset.term, text: mark.textContent }));
  return {
    plainParagraph: plainParagraph ? plainParagraph.en : '',
    autoMarks: document.querySelectorAll('.para .kmark[data-k="test-auto-kmark"]').length,
    ghostMarks: document.querySelectorAll('.para .kmark[data-k="test-ghost-kmark"]').length,
    contextMarks
  };
});

check('Knowledge-card terms are highlighted without explicit article markers',
  highlightState.autoMarks > 0 && Boolean(highlightState.plainParagraph),
  JSON.stringify(highlightState));
check('Knowledge cards do not create ghost highlights for absent terms',
  highlightState.ghostMarks === 0);
check('Context entities do not become knowledge-card aliases',
  !highlightState.contextMarks.some(mark => /^openai$/i.test(mark.term)),
  JSON.stringify(highlightState.contextMarks));
check('Equivalent subterms still resolve to the knowledge card',
  highlightState.contextMarks.some(mark => /^formal verification$/i.test(mark.term)),
  JSON.stringify(highlightState.contextMarks));
check('Automatic knowledge highlighting has no JavaScript runtime errors',
  errors.length === 0,
  errors.slice(0, 3).join(' | '));

await context.close();
await browser.close();

const failures = results.filter(result => !result.pass);
console.log(`\n=== ${results.length - failures.length}/${results.length} passed ===`);
if (failures.length) process.exitCode = 1;
