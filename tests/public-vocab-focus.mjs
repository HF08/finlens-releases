/* Public vocabulary focus keeps IELTS, TOEFL and finance without exam-level lists. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import {
  VOCAB_FOCUS_GUIDE,
  buildPrompt,
  buildVocabularyPrompt,
  buildCompactVocabularyPrompt
} from '../server/server.mjs';

const pwRequire = createRequire(process.env.PW_BASE || 'C:/Users/NORA/.workbuddy/binaries/node/workspace/');
const { chromium } = pwRequire('playwright-core');
const BASE = process.env.FINLENS_TEST_BASE || 'http://127.0.0.1:8787';

assert.equal(VOCAB_FOCUS_GUIDE.cet4, undefined);
assert.equal(VOCAB_FOCUS_GUIDE.cet6, undefined);
assert.doesNotMatch(
  buildPrompt({ title: 'Fixture', paragraphs: ['Finance article.'], vocabFocus: 'cet4' }),
  /CET-4|CET-6/
);
assert.doesNotMatch(
  buildVocabularyPrompt({ title: 'Fixture', paragraphs: ['Finance article.'], vocabFocus: 'cet6' }),
  /CET4|CET6/
);
assert.doesNotMatch(
  buildCompactVocabularyPrompt('Fixture', 'Finance article.', 'cet4'),
  /CET4|CET6/
);

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));

try {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const options = await page.evaluate(() => ({
    settings: [...document.querySelectorAll('#setVocabFocus option')].map(item => item.value),
    export: [...document.querySelectorAll('#exportFocusSelect option')].map(item => item.value),
    manager: [...document.querySelectorAll('#vocabManageFocus option')].map(item => item.value)
  }));
  for (const values of Object.values(options)) {
    assert.ok(values.includes('ielts'));
    assert.ok(values.includes('toefl'));
    assert.ok(!values.includes('cet4'));
    assert.ok(!values.includes('cet6'));
  }

  const behavior = await page.evaluate(() => {
    const sample = {
      vocab: [
        { w: 'maintain', exam: ['CET4'] },
        { w: 'substantiate', exam: ['CET6'] },
        { w: 'liquidity', exam: ['FINANCE'] }
      ]
    };
    const articleId = ARTICLES[0].id;
    return {
      dataType: typeof window.CET_VOCABULARY_DATA,
      helperType: typeof officialCETLevelFor,
      exams: sanitizeVocabList(sample.vocab).map(item => item.exam),
      fallbackFocus: setVocabularyOverride(articleId, 'cet4', sample.vocab).override?.focus,
      financeExport: exportVocabularyFor(sample, { focus: 'finance' }).map(item => item.w)
    };
  });
  assert.equal(behavior.dataType, 'undefined');
  assert.equal(behavior.helperType, 'undefined');
  assert.deepEqual(behavior.exams, [[], [], ['FINANCE']]);
  assert.equal(behavior.fallbackFocus, 'balanced');
  assert.deepEqual(behavior.financeExport, ['liquidity']);
  assert.deepEqual(errors, []);
} finally {
  await context.close();
  await browser.close();
}

console.log('PASS public vocabulary focus excludes exam-level word lists');
