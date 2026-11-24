# Learning Workspace V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persistent learning events, calendar plans, a unified task center, richer vocabulary exports, and AI-generated article mind maps.

**Architecture:** Keep `app.js` as the orchestration/UI layer, but move event and task domain logic into two testable browser/CommonJS modules. The local server owns mind-map prompting and tree normalization. Existing localStorage state is migrated in place without deleting user progress.

**Tech Stack:** Vanilla browser JavaScript, Node 22+, Node HTTP server, localStorage, custom SVG symbols, Playwright browser tests, Node assert tests.

**Spec:** `docs/superpowers/specs/2026-11-24-learning-workspace-v2-design.md`

## Global Constraints

- Do not add a frontend framework or external chart/mind-map dependency.
- Maximum mind-map depth is 4 and maximum node count is 40.
- Each task must reach `success`, `failed`, or `cancelled`; no indefinite `running` state.
- Old events without exact details are represented as `legacy-day`, never fabricated.
- Existing vocabulary SRS state, article props, translations, knowledge cards and marks must remain intact.
- Private build keeps the existing CET options; public build must continue to omit CET features.

---

### Task 1: Learning Event Domain

**Files:**
- Create: `src/learning-events.js`
- Create: `tests/learning-events.mjs`

**Interfaces:**
- Produces: `FinLensLearningEvents.ensureState(state)`
- Produces: `FinLensLearningEvents.addEvent(state, event)`
- Produces: `FinLensLearningEvents.summaryForDay(state, date)`
- Produces: `FinLensLearningEvents.heatmap(state, endDate, weeks)`
- Produces: `FinLensLearningEvents.todayWords(state, date)`
- Produces: `FinLensLearningEvents.normalizePlan(plan)`

- [ ] **Step 1: Write failing tests**

```js
const Learning = require('../src/learning-events.js');
const state = { read: {}, words: {}, days: [], studyPlans: {}, learningEvents: [] };
Learning.addEvent(state, {
  type: 'word-learned', ts: new Date('2026-11-24T10:00:00+08:00').getTime(),
  articleId: 'a', wordKey: 'a:surge', word: 'surge', source: 'cards'
});
assert.equal(Learning.summaryForDay(state, '2026-11-24').words.length, 1);
```

- [ ] **Step 2: Run and verify failure**

Run: `node tests/learning-events.mjs`

Expected: fails because `learning-events.js` does not exist.

- [ ] **Step 3: Implement module**

Use a UMD-style IIFE that exports through `globalThis.FinLensLearningEvents` and `module.exports`. Normalize dates with local calendar fields, cap events at 5000, deduplicate daily word lists by `wordKey`, and backfill only from `read`, `words`, and `days`.

- [ ] **Step 4: Run and verify pass**

Run: `node tests/learning-events.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/learning-events.js tests/learning-events.mjs
git commit -m "feat: add learning event ledger"
```

### Task 2: Task Center Domain

**Files:**
- Create: `src/task-center.js`
- Create: `tests/task-center.mjs`

**Interfaces:**
- Produces: `FinLensTaskCenter.ensureState(state)`
- Produces: `FinLensTaskCenter.createTask(state, input)`
- Produces: `FinLensTaskCenter.updateTask(state, id, patch)`
- Produces: `FinLensTaskCenter.finishTask(state, id, patch)`
- Produces: `FinLensTaskCenter.failTask(state, id, error, recovery)`
- Produces: `FinLensTaskCenter.taskSummary(state)`

- [ ] **Step 1: Write failing tests for lifecycle and cap**

```js
const TaskCenter = require('../src/task-center.js');
const state = {};
TaskCenter.ensureState(state);
const task = TaskCenter.createTask(state, { type: 'crawl', title: '抓取' });
TaskCenter.updateTask(state, task.id, { progress: 50 });
TaskCenter.failTask(state, task.id, 'network down', ['检查网络']);
assert.equal(TaskCenter.taskSummary(state).failed, 1);
```

- [ ] **Step 2: Run and verify failure**

Run: `node tests/task-center.mjs`

Expected: fails because `task-center.js` does not exist.

- [ ] **Step 3: Implement module**

Cap tasks at 100, keep terminal tasks, calculate active/latest/failed summaries, and sanitize error/recovery strings.

- [ ] **Step 4: Run and verify pass**

Run: `node tests/task-center.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/task-center.js tests/task-center.mjs
git commit -m "feat: add persistent task center domain"
```

### Task 3: State Migration and Task Center UI

**Files:**
- Modify: `index.html`
- Modify: `src/app.js`
- Modify: `src/styles.css`
- Modify: `tests/feedback-v2.mjs`
- Modify: `tests/article-management.mjs`
- Create: `tests/task-center-ui.mjs`

**Interfaces:**
- Consumes: `FinLensLearningEvents.ensureState`
- Consumes: `FinLensTaskCenter.createTask/updateTask/finishTask/failTask`
- Produces: `startTask(type, input) -> task`
- Produces: `updateActiveTask(task, patch)`
- Produces: `renderTaskCenter()`
- Produces: `openTaskCenter(filter)`

- [ ] **Step 1: Write failing browser test**

```js
const result = await page.evaluate(() => {
  const task = startTask('crawl', { title: '抓取测试', subtitle: 'Fixture' });
  updateTaskState(task.id, { progress: 42, message: '读取订阅源' });
  return { card: document.querySelector('#engineCard').innerText, summary: taskCenterSummary() };
});
assert.match(result.card, /42%/);
```

- [ ] **Step 2: Run and verify failure**

Run: `node tests/task-center-ui.mjs`

Expected: `startTask` is undefined.

- [ ] **Step 3: Replace progress surfaces**

Remove `#aiProgressPanel`, `#crawlStatus`, `#btnCrawlDetails`, and `#crawlErrors`. Add task-center card/modal markup and wire filters, close, and retry actions. Wrap annotation, focus batch, crawl, summary, and category revalidation in task lifecycle helpers.

- [ ] **Step 4: Run focused tests**

Run: `node tests/task-center-ui.mjs && node tests/article-management.mjs && node tests/feedback-v2.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add index.html src/app.js src/styles.css tests/task-center-ui.mjs tests/article-management.mjs tests/feedback-v2.mjs
git commit -m "feat: unify background progress in task center"
```

### Task 4: Learning Calendar and Plans

**Files:**
- Modify: `index.html`
- Modify: `src/app.js`
- Modify: `src/styles.css`
- Create: `tests/learning-calendar.mjs`

**Interfaces:**
- Consumes: `FinLensLearningEvents.summaryForDay/heatmap`
- Produces: `renderPlanView()`
- Produces: `saveDayPlan(date, patch)`
- Produces: `addPlanItem(date, articleId, mode)`
- Produces: `recordArticleEvent(type, articleId)`
- Produces: `recordWordEvent(type, entry, score, source)`

- [ ] **Step 1: Write failing calendar test**

```js
await page.evaluate(() => {
  addPlanItem(todayStr(), ARTICLES[0].id, 'read');
  recordArticleEvent('article-read', ARTICLES[0].id);
});
const day = await page.evaluate(() => dayPlanState(todayStr()));
assert.equal(day.plan.items.length, 1);
assert.equal(day.summary.completedRead, 1);
```

- [ ] **Step 2: Run and verify failure**

Run: `node tests/learning-calendar.mjs`

Expected: `addPlanItem` is undefined.

- [ ] **Step 3: Implement view and event hooks**

Add navigation, month calendar, selected-day editor, actual history list, targets, notes, and heatmap. Record article/word events from `setRead`, `reviewArticle`, and `rateWord`.

- [ ] **Step 4: Run focused tests**

Run: `node tests/learning-calendar.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add index.html src/app.js src/styles.css tests/learning-calendar.mjs
git commit -m "feat: add learning calendar plans and heatmap"
```

### Task 5: Vocabulary Export

**Files:**
- Modify: `index.html`
- Modify: `src/app.js`
- Modify: `src/styles.css`
- Modify: `tests/verify.mjs`
- Create: `tests/vocab-export.mjs`

**Interfaces:**
- Consumes: `FinLensLearningEvents.todayWords`
- Produces: `openVocabExport()`
- Produces: `exportTodayWordCards()`
- Produces: `exportVocabularyCsv(scope)`

- [ ] **Step 1: Write failing export test**

```js
await page.evaluate(() => recordWordEvent('word-learned', {
  id: 'a:surge', a: ARTICLES[0], v: ARTICLES[0].vocab[0], state: S.words['a:surge']
}, 2, 'cards'));
assert.equal(await page.evaluate(() => todayExportWords().length), 1);
```

- [ ] **Step 2: Run and verify failure**

Run: `node tests/vocab-export.mjs`

Expected: `todayExportWords` is undefined.

- [ ] **Step 3: Implement modal and exports**

Replace direct CSV click with an export modal. Generate self-contained printable HTML cards for today, today CSV, all CSV, and due CSV. Preserve CSV columns from the existing exporter.

- [ ] **Step 4: Run focused tests**

Run: `node tests/vocab-export.mjs && node tests/verify.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add index.html src/app.js src/styles.css tests/vocab-export.mjs tests/verify.mjs
git commit -m "feat: add daily vocabulary card exports"
```

### Task 6: Article Mind Map

**Files:**
- Modify: `server/server.mjs`
- Modify: `index.html`
- Modify: `src/app.js`
- Modify: `src/styles.css`
- Create: `tests/mind-map.mjs`

**Interfaces:**
- Produces: `buildMindMapPrompt(payload)`
- Produces: `normalizeMindMap(value)`
- Endpoint: `POST /api/mind-map`
- Produces: `openMindMap(articleId)`
- Produces: `renderMindMap(map)`

- [ ] **Step 1: Write failing server and browser tests**

```js
const map = normalizeMindMap({ title: 'T', root: { label: 'Root', children: [{ label: 'A' }] } });
assert.equal(map.root.children.length, 1);
const prompt = buildMindMapPrompt({ title: 'T', paragraphs: ['A'] });
assert.match(prompt, /中心论点/);
```

- [ ] **Step 2: Run and verify failure**

Run: `node tests/mind-map.mjs`

Expected: `buildMindMapPrompt` is not exported.

- [ ] **Step 3: Implement endpoint and view**

Validate node count/depth/label length. Add article-foot button and modal tree. Cache successful maps in `S.mindMaps`.

- [ ] **Step 4: Run focused tests**

Run: `node tests/mind-map.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/server.mjs index.html src/app.js src/styles.css tests/mind-map.mjs
git commit -m "feat: add article mind maps"
```

### Task 7: Integration, Documentation, and Mirror

**Files:**
- Modify: `README.md`
- Modify: `CONTEXT.md`
- Modify: `package.json`
- Modify: `src/app.js`
- Modify tests listed in Tasks 1-6

**Interfaces:**
- Consumes all earlier interfaces.
- Produces no new API; verifies the complete workflow.

- [ ] **Step 1: Add new tests to npm test**

Insert tests after desktop updater and before legacy browser tests.

- [ ] **Step 2: Run full suite**

Run: `npm test`

Expected: all suites pass, no E2E JavaScript runtime errors.

- [ ] **Step 3: Update docs**

Document task center, calendar, exports and mind maps in README and CONTEXT.

- [ ] **Step 4: Run diff and status checks**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; only intended files changed.

- [ ] **Step 5: Commit**

```bash
git add README.md CONTEXT.md package.json src/app.js tests
git commit -m "docs: document learning workspace v2"
```

- [ ] **Step 6: Mirror public edition**

Apply the same feature changes to `finlens-public`, preserve the public edition's removal of CET options and word lists, run its full suite, commit and push only after verification.
