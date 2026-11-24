import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { startFinLensServer } from '../server/server.mjs';

const pwRequire = createRequire(process.env.PW_BASE || 'C:/Users/NORA/.workbuddy/binaries/node/workspace/');
const { chromium } = pwRequire('playwright-core');
const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'finlens-legacy-restore-'));
const dataRoot = path.join(tempRoot, 'data');
const backupDir = path.join(dataRoot, 'backups');
let server;
let browser;

const legacyState = {
  settings: {
    vocabFocus: 'finance',
    apiKey: '',
    mwApiKey: ''
  },
  read: {
    'legacy-fixture': { done: true, ts: 1 }
  },
  words: {
    'legacy-fixture:term premium': {
      box: 2,
      due: 0,
      right: 3,
      wrong: 0,
      seen: 3,
      added: 1
    }
  },
  marks: {},
  notes: {},
  summaries: {},
  tutor: {},
  knowledgeTutor: {},
  dictionaries: {},
  knowledgeDetails: {},
  reviewSessions: {},
  knowledgeOverrides: {},
  exportPicks: { initialized: false, articleIds: [], options: {}, analysis: {} },
  exportArchive: [],
  days: ['2026-11-12'],
  today: { date: '2026-11-12', read: 1, words: 3 },
  custom: [{
    id: 'legacy-fixture',
    title: 'Legacy Migration Fixture',
    deck: 'Migrated from a previous FinLens backup.',
    source: 'Legacy Wire',
    date: '2026-11-12',
    topic: 'markets',
    level: 'C1',
    paragraphs: [{
      en: 'Term premium compensation rose as investors demanded more protection against inflation.',
      zh: '随着投资者要求更多通胀保护，期限溢价补偿上升。',
      note: '',
      analysis: {
        english: { longSentence: '', grammar: '', expression: '' },
        finance: { term: 'term premium', background: '', relevance: '' }
      }
    }],
    vocab: [{
      w: 'term premium',
      ipa: '',
      pos: 'n.',
      zh: '期限溢价',
      en: '',
      forms: ['term premiums'],
      synonyms: [],
      exam: ['FINANCE'],
      ex: '',
      exZh: ''
    }],
    knowledge: []
  }],
  vocabOverrides: {}
};

try {
  await fs.mkdir(backupDir, { recursive: true });
  await fs.writeFile(
    path.join(backupDir, 'finlens-2026-11-12T07-30-00-000Z.json'),
    JSON.stringify(legacyState),
    'utf8'
  );
  await fs.writeFile(
    path.join(backupDir, 'finlens-9999-12-31T23-59-59-999Z.json'),
    JSON.stringify({
      settings: {},
      read: {},
      words: {},
      marks: {},
      custom: []
    }),
    'utf8'
  );

  server = await startFinLensServer({
    appRoot: path.resolve('.'),
    dataRoot,
    backupDir,
    allowAutomationRecovery: true,
    host: '127.0.0.1',
    port: 0
  });
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  await context.addInitScript(() => {
    if (!localStorage.getItem('finlens.v1')) {
      localStorage.setItem('finlens.v1', JSON.stringify({
        settings: {},
        read: {},
        words: {},
        marks: {},
        custom: []
      }));
    }
    if (!localStorage.getItem('finlens.dataResetVersion')) {
      localStorage.setItem('finlens.dataResetVersion', '2026-11-03-feedback-reset-v1');
    }
  });
  const page = await context.newPage();
  await page.goto(server.url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => {
    const state = JSON.parse(localStorage.getItem('finlens.v1') || 'null');
    return state?.custom?.some(article => article.id === 'legacy-fixture');
  }, { timeout: 10000 });

  const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('finlens.v1')));
  assert.equal(restored.custom.some(article => article.id === 'legacy-fixture'), true);
  assert.equal(restored.read['legacy-fixture']?.done, true);
  assert.equal(restored.words['legacy-fixture:term premium']?.box, 2);

  const existingContext = await browser.newContext();
  await existingContext.addInitScript(() => {
    localStorage.setItem('finlens.v1', JSON.stringify({
      settings: { vocabFocus: 'ielts' },
      read: { 'current-article': { done: true, ts: 1 } },
      words: { 'current-article:inflation': { box: 1 } },
      marks: {},
      custom: [{
        id: 'current-article',
        title: 'Current User Article',
        paragraphs: [{ en: 'Current user content must be kept.', zh: '', note: '', analysis: {} }],
        vocab: [],
        knowledge: []
      }]
    }));
    localStorage.setItem('finlens.dataResetVersion', '2026-11-03-feedback-reset-v1');
  });
  const existingPage = await existingContext.newPage();
  await existingPage.goto(server.url, { waitUntil: 'networkidle' });
  await existingPage.waitForTimeout(500);
  const preserved = await existingPage.evaluate(() => JSON.parse(localStorage.getItem('finlens.v1')));
  assert.equal(preserved.custom.some(article => article.id === 'current-article'), true);
  assert.equal(preserved.custom.some(article => article.id === 'legacy-fixture'), false);
  await existingContext.close();
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) await server.close().catch(() => {});
  await fs.rm(tempRoot, { recursive: true, force: true });
}

console.log('PASS first launch restores legacy articles and learning progress from the latest backup');
