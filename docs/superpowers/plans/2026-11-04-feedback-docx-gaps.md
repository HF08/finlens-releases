# Feedback DOCX Gap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use test-driven-development for every task. Steps use checkbox syntax.

**Goal:** Close only the still-missing requirements in `反馈.docx` without disturbing already implemented import, AI skill, vocabulary and knowledge-category features.

**Architecture:** Keep existing single-page app and local server. Add deterministic content normalization and term-card resolution at existing seams, and promote knowledge detail from a modal to an application view.

**Tech Stack:** Vanilla JS, CSS, Node HTTP server, Playwright regression tests.

**Spec:** `D:\文档\爱好类\工作台\反馈.docx`

## Global Constraints

- Preserve already implemented document upload, AI skill, authority links, knowledge categories and vocabulary-only mode.
- Term and vocabulary modules remain independent.
- Knowledge cards shown in the reader must resolve to an exact card alias; no fallback ghost highlight.
- Knowledge-detail interaction must be a page with a back action, not a small modal.
- Every production change needs a failing Playwright regression first.

---

### Task 1: English article extraction for WeChat

**Files:**
- Modify: `server/server.mjs`
- Test: `tests/feedback-v2.mjs`

**Interfaces:**
- Produces: `extractParagraphs(html) -> { title, paragraphs }` with English-dominant paragraph filtering from `#js_content`.

- [x] Add WeChat fixture containing Chinese preamble, English section text, Chinese ads and unrelated links.
- [x] Assert `/api/fetch` returns only English article paragraphs and no Chinese boilerplate.
- [x] Run `node tests/feedback-v2.mjs` and confirm the new test fails.
- [x] Extract block text from `#js_content`, not only `<p>`.
- [x] Filter candidates by English word count and Latin-letter ratio.
- [x] Re-run the test.

### Task 2: Knowledge-card deduplication and exact term resolution

**Files:**
- Modify: `src/app.js`
- Modify: `server/server.mjs`
- Test: `tests/feedback-v2.mjs`

**Interfaces:**
- Produces: normalized knowledge cards with merged aliases and stable ids.
- Produces: `findKnow(term)` exact alias matching; no substring fallback.

- [x] Add cards with duplicate `term`, English alias and `match` overlap.
- [x] Add a marked term without a matching card and a card whose alias could be incorrectly substring-matched.
- [x] Assert duplicates collapse, no ghost term highlight appears, and clicking a term opens the matching card.
- [x] Run the test and confirm it fails.
- [x] Merge duplicate cards by normalized `term`, `en` and `match` aliases.
- [x] Change term resolution to exact normalized alias matching.
- [x] Render unresolved `{{...}}` terms as plain text with vocabulary highlighting only.
- [x] Re-run the test.

### Task 3: Knowledge detail page with richer evidence structure

**Files:**
- Modify: `index.html`
- Modify: `src/styles.css`
- Modify: `src/app.js`
- Modify: `server/server.mjs`
- Test: `tests/feedback-v2.mjs`

**Interfaces:**
- Produces: `openKnowledgeDetail(id)` switches to `view-knowledge-detail`.
- Produces: `generateKnowledgeDetail()` response with `detail`, `mechanism`, `sources`, `caseStudies`, `methodSteps`, `caution`, `authority`.

- [x] Assert clicking a knowledge card opens `#view-knowledge-detail`, not a modal.
- [x] Assert the page has a visible back button.
- [x] Assert detail generation renders concept, mechanism, authority/source, cases and evidence limitations.
- [x] Run the test and confirm it fails.
- [x] Add a full knowledge-detail view inside the main view system.
- [x] Preserve the return view so Back restores the knowledge library or reader.
- [x] Extend the knowledge-detail prompt and response normalization.
- [x] Render structured sources and case studies without fabricating absent data.
- [x] Re-run the test.

### Task 4: Failure reason placement and diagnostics

**Files:**
- Modify: `index.html`
- Modify: `src/app.js`
- Test: `tests/feedback-v2.mjs`

**Interfaces:**
- Consumes: existing `showImportFailure()` and retry handlers.
- Produces: failure reason panel above the extracted preview with plain-language reason and solution.

- [x] Assert `#importFailure` precedes `#importPreview` in DOM order.
- [x] Assert model/network/quality failures use distinct human-readable titles.
- [x] Run the test and confirm it fails.
- [x] Move the failure panel above the preview.
- [x] Refine failure messages and keep retry actions intact.
- [x] Re-run the test.

### Task 5: Final verification

**Files:**
- Update: `README.md`
- Update: `tests/feedback-2026-11-03-report.md`

- [x] Run `node --check` on changed JS files.
- [x] Run `npm.cmd test`.
- [ ] Run networked `tests/live-resources.mjs` (blocked by service-process network policy in this run; direct GitHub API and Node fetch both returned 200).
- [x] Inspect final knowledge-detail and import-failure screenshots on desktop and mobile.
- [x] Confirm the running service serves the new resource version.
