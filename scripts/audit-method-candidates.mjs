import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const req = createRequire(process.env.PW_BASE || 'C:/Users/NORA/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const backupDir = path.resolve('data/backups');

const candidates = fs.readdirSync(backupDir)
  .filter(name => name.endsWith('.json'))
  .map(name => {
    const filePath = path.join(backupDir, name);
    const state = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return {
      name,
      mtime: fs.statSync(filePath).mtimeMs,
      customCount: Array.isArray(state.custom) ? state.custom.length : 0,
      state
    };
  })
  .sort((left, right) => right.mtime - left.mtime);
const selected = process.env.BACKUP_FILE
  ? candidates.find(item => item.name === process.env.BACKUP_FILE)
  : candidates.find(item => item.customCount >= 5);

if (!selected) throw new Error('No substantive backup found');

const state = selected.state;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext();

await context.addInitScript(({ backup }) => {
  localStorage.setItem('finlens.dataResetVersion', '2026-11-03-feedback-reset-v1');
  localStorage.setItem('finlens.v1', JSON.stringify(backup));
}, { backup: state });

const page = await context.newPage();
await page.goto(`http://127.0.0.1:8787/?audit=${Date.now()}`, { waitUntil: 'networkidle' });

const rows = await page.evaluate(() => ARTICLES.flatMap(article =>
  article.knowledge
    .map(card => ({
      article: article.title,
      term: card.term,
      cardType: card.cardType,
      storedCategory: card.category,
      methodSteps: Array.isArray(card.methodSteps) ? card.methodSteps.length : 0,
      current: classifyKnowledgeCategoryClient(card)
    }))
    .filter(row => row.cardType === 'method' && row.current.category !== 'method')
    .map(row => ({
      article: row.article,
      term: row.term,
      storedCategory: row.storedCategory,
      currentCategory: row.current.category,
      categories: row.current.categories,
      confidence: row.current.confidence,
      methodSteps: row.methodSteps
    }))));

console.log(JSON.stringify({
  backup: selected.name,
  customArticles: selected.customCount,
  count: rows.length,
  rows
}, null, 2));
await browser.close();
