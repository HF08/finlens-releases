import assert from 'node:assert/strict';
import Learning from '../src/learning-events.js';

const at = (year, month, day, hour = 10) => new Date(year, month - 1, day, hour).getTime();

const state = {
  read: {},
  words: {},
  days: [],
  learningEvents: [],
  studyPlans: {}
};
Learning.ensureState(state);
state.studyPlans['2026-11-24'] = Learning.normalizePlan({
  date: '2026-11-24',
  items: [
    { articleId: 'article-a', mode: 'read' },
    { articleId: 'article-b', mode: 'review' },
    { articleId: 'article-b', mode: 'review' }
  ],
  readTarget: 1,
  wordTarget: 2,
  note: 'Plan fixture'
});

Learning.addEvent(state, {
  type: 'article-read',
  articleId: 'article-a',
  ts: at(2026, 11, 24, 9),
  source: 'reader'
});
Learning.addEvent(state, {
  type: 'word-learned',
  articleId: 'article-a',
  wordKey: 'article-a:surge',
  word: 'surge',
  score: 2,
  ts: at(2026, 11, 24, 10),
  source: 'cards'
});
Learning.addEvent(state, {
  type: 'word-reviewed',
  articleId: 'article-a',
  wordKey: 'article-a:surge',
  word: 'surge',
  score: 1,
  ts: at(2026, 11, 24, 11),
  source: 'quiz'
});
Learning.addEvent(state, {
  type: 'article-review',
  articleId: 'article-b',
  ts: at(2026, 11, 23, 9),
  source: 'reader'
});
state.studyPlans['2026-11-18'] = Learning.normalizePlan({
  date: '2026-11-18',
  items: [{ articleId: 'article-b', mode: 'read' }],
  readTarget: 1,
  wordTarget: 1,
  note: 'Completed day fixture'
});
Learning.addEvent(state, {
  type: 'article-read',
  articleId: 'article-b',
  ts: at(2026, 11, 18, 9),
  source: 'reader'
});
Learning.addEvent(state, {
  type: 'word-learned',
  articleId: 'article-b',
  wordKey: 'article-b:alpha',
  word: 'alpha',
  score: 2,
  ts: at(2026, 11, 18, 10),
  source: 'cards'
});

const summary = Learning.summaryForDay(state, '2026-11-24');
assert.equal(summary.readCount, 1);
assert.equal(summary.reviewCount, 0);
assert.equal(summary.words.length, 1, 'daily word list must deduplicate by wordKey');
assert.equal(summary.learnedWords.length, 1);
assert.equal(summary.reviewedWords.length, 1);
assert.equal(summary.plan.items.length, 2, 'duplicate plan items must be removed');
assert.equal(summary.planItems[0].completed, true);
assert.equal(summary.planItems[1].completed, false);
assert.equal(summary.targets.readCompleted, true);
assert.equal(summary.targets.wordsCompleted, false);
assert.deepEqual(Learning.todayWords(state, '2026-11-24').map(item => item.word), ['surge']);

const heatmap = Learning.heatmap(state, '2026-11-24', 4);
assert.equal(heatmap.length, 28);
assert.equal(heatmap.at(-1).date, '2026-11-24');
assert.equal(heatmap.at(-1).count, 2, 'one article plus one distinct word');
assert.equal(heatmap.at(-1).level, 1);
assert.equal(heatmap.at(-1).articleRead, 1);
assert.equal(heatmap.at(-1).wordLearned, 1);
assert.equal(heatmap.at(-1).wordReviewed, 1);

const weekly = Learning.weeklyActivity(state, '2026-11-24', 2);
assert.equal(weekly.length, 2);
assert.equal(weekly[0].weekStart, '2026-11-16');
assert.equal(weekly[0].articleRead, 1);
assert.equal(weekly[0].wordLearned, 1);
assert.equal(weekly[0].targetDays, 1);
assert.equal(weekly[1].weekStart, '2026-11-23');
assert.equal(weekly[1].articleRead, 1);
assert.equal(weekly[1].articleReview, 1);
assert.equal(weekly[1].wordLearned, 1);
assert.equal(weekly[1].wordReviewed, 1);
assert.equal(weekly[1].activeDays, 2);
assert.equal(weekly[1].targetDays, 0);

const activeRate = Learning.activeRateSeries(state, '2026-11-24', 10, 7);
assert.equal(activeRate.length, 10);
assert.equal(activeRate.at(-1).date, '2026-11-24');
assert.equal(activeRate.at(-1).windowStart, '2026-11-18');
assert.equal(activeRate.at(-1).activeDays, 3);
assert.ok(Math.abs(activeRate.at(-1).rate - (3 / 7)) < 1e-9);
assert.equal(activeRate.at(-1).targetDays, 1);
assert.equal(activeRate.at(-1).articleRead, 2);
assert.equal(activeRate.at(-1).articleReview, 1);
assert.equal(activeRate.at(-1).wordLearned, 2);
assert.equal(activeRate.at(-1).wordReviewed, 1);
assert.equal(activeRate.at(-1).dayActive, true);

const legacy = {
  read: {
    'article-a': { done: true, ts: at(2026, 11, 24, 9), reviewCount: 1 }
  },
  words: {
    'article-a:surge': {
      learnedAt: at(2026, 11, 24, 10),
      lastReviewedAt: at(2026, 11, 24, 10),
      right: 1,
      wrong: 0
    }
  },
  days: ['2026-11-22', '2026-11-24'],
  studyPlans: {},
  learningEvents: []
};
Learning.ensureState(legacy);
assert.ok(legacy.learningEvents.some(event => event.type === 'article-read' && event.date === '2026-11-24'));
assert.ok(legacy.learningEvents.some(event => event.type === 'word-learned' && event.wordKey === 'article-a:surge'));
assert.ok(legacy.learningEvents.some(event => event.type === 'legacy-day' && event.date === '2026-11-22'));
assert.ok(!legacy.learningEvents.some(event => event.type === 'legacy-day' && event.date === '2026-11-24'));
assert.equal(Learning.summaryForDay(legacy, '2026-11-24').words.length, 1);

const capped = {
  read: {},
  words: {},
  days: [],
  studyPlans: {},
  learningEvents: Array.from({ length: 5005 }, (_, index) => ({
    type: 'word-reviewed',
    articleId: 'article-a',
    wordKey: `article-a:word-${index}`,
    word: `word-${index}`,
    ts: at(2026, 11, 24, 10)
  }))
};
Learning.ensureState(capped);
assert.equal(capped.learningEvents.length, 5000);

console.log('PASS learning event ledger, daily summaries, plans, heatmap and migration');
