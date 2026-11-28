(function initLearningEvents(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FinLensLearningEvents = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function learningEventsFactory() {
  const MAX_EVENTS = 5000;
  const MIGRATION_VERSION = 1;
  const EVENT_TYPES = new Set([
    'article-read',
    'article-review',
    'word-learned',
    'word-reviewed',
    'legacy-day'
  ]);

  const pad = (value) => String(value).padStart(2, '0');

  function dateKey(value = Date.now()) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return dateKey(Date.now());
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function validDateKey(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
  }

  function dateFromKey(value) {
    if (!validDateKey(value)) return null;
    const [year, month, day] = String(value).split('-').map(Number);
    const date = new Date(year, month - 1, day, 12);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return date;
  }

  function shiftDateKey(value, days) {
    const date = dateFromKey(value) || new Date();
    date.setDate(date.getDate() + Number(days || 0));
    return dateKey(date);
  }

  function createId(prefix = 'evt') {
    if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function normalizeEvent(input = {}) {
    const type = String(input.type || '').trim();
    if (!EVENT_TYPES.has(type)) return null;
    const numericTs = Number(input.ts);
    const ts = Number.isFinite(numericTs) && numericTs > 0 ? numericTs : Date.now();
    const date = validDateKey(input.date) ? input.date : dateKey(ts);
    const score = [0, 1, 2].includes(Number(input.score)) ? Number(input.score) : null;
    return {
      id: String(input.id || createId('evt')),
      date,
      ts,
      type,
      articleId: String(input.articleId || ''),
      wordKey: String(input.wordKey || ''),
      word: String(input.word || ''),
      score,
      source: String(input.source || 'reader'),
      legacyCount: Math.max(0, Number(input.legacyCount) || 0)
    };
  }

  function ensureState(state) {
    if (!state || typeof state !== 'object') return state;
    state.learningEvents = Array.isArray(state.learningEvents)
      ? state.learningEvents.map(normalizeEvent).filter(Boolean).slice(-MAX_EVENTS)
      : [];
    state.studyPlans = state.studyPlans && typeof state.studyPlans === 'object' && !Array.isArray(state.studyPlans)
      ? Object.fromEntries(Object.entries(state.studyPlans)
          .map(([date, plan]) => [date, normalizePlan({ ...(plan || {}), date: plan?.date || date })])
          .filter(([, plan]) => plan))
      : {};
    if (state.learningEventMigrationVersion !== MIGRATION_VERSION) {
      backfillLegacyState(state);
      state.learningEventMigrationVersion = MIGRATION_VERSION;
    }
    state.learningEvents.sort((left, right) => left.ts - right.ts);
    if (state.learningEvents.length > MAX_EVENTS) state.learningEvents = state.learningEvents.slice(-MAX_EVENTS);
    return state;
  }

  function pushEvent(state, event) {
    const normalized = normalizeEvent(event);
    if (!normalized) return null;
    state.learningEvents.push(normalized);
    if (state.learningEvents.length > MAX_EVENTS) {
      state.learningEvents = state.learningEvents.slice(-MAX_EVENTS);
    }
    return normalized;
  }

  function addEvent(state, event) {
    ensureState(state);
    return pushEvent(state, event);
  }

  function backfillLegacyState(state) {
    const existing = new Set(state.learningEvents.map(event =>
      `${event.type}|${event.date}|${event.articleId}|${event.wordKey}`));
    const addLegacy = (event) => {
      const normalized = normalizeEvent({ ...event, source: 'migration', id: createId('legacy') });
      if (!normalized) return;
      const key = `${normalized.type}|${normalized.date}|${normalized.articleId}|${normalized.wordKey}`;
      if (existing.has(key)) return;
      existing.add(key);
      state.learningEvents.push(normalized);
    };

    for (const [articleId, read] of Object.entries(state.read || {})) {
      if (!read || typeof read !== 'object') continue;
      const readTs = Number(read.lastActiveAt || read.ts);
      if (read.done && Number.isFinite(readTs) && readTs > 0) {
        addLegacy({ type: 'article-read', articleId, ts: readTs });
      }
      const reviewTs = Number(read.lastReviewAt);
      if ((read.reviewCount || 0) > 0 && Number.isFinite(reviewTs) && reviewTs > 0) {
        addLegacy({ type: 'article-review', articleId, ts: reviewTs });
      }
    }

    for (const [wordKey, wordState] of Object.entries(state.words || {})) {
      if (!wordState || typeof wordState !== 'object') continue;
      const reviewedAt = Number(wordState.lastReviewedAt);
      if (!Number.isFinite(reviewedAt) || reviewedAt <= 0) continue;
      const learnedAt = Number(wordState.learnedAt);
      const firstLearning = Number.isFinite(learnedAt) && learnedAt > 0 &&
        dateKey(learnedAt) === dateKey(reviewedAt) &&
        (wordState.right || 0) + (wordState.wrong || 0) <= 1;
      const colon = wordKey.indexOf(':');
      addLegacy({
        type: firstLearning ? 'word-learned' : 'word-reviewed',
        articleId: colon >= 0 ? wordKey.slice(0, colon) : '',
        wordKey,
        word: colon >= 0 ? wordKey.slice(colon + 1) : wordKey,
        score: Number.isFinite(Number(wordState.lastScore)) ? Number(wordState.lastScore) : null,
        ts: reviewedAt
      });
    }

    const eventDates = new Set(state.learningEvents.map(event => event.date));
    for (const day of Array.isArray(state.days) ? state.days : []) {
      if (!validDateKey(day) || eventDates.has(day)) continue;
      addLegacy({ type: 'legacy-day', date: day, ts: (dateFromKey(day)?.getTime() || Date.now()), legacyCount: 1 });
      eventDates.add(day);
    }
  }

  function normalizePlan(input = {}) {
    const date = String(input.date || '').trim();
    if (!validDateKey(date) || !dateFromKey(date)) return null;
    const seen = new Set();
    const items = (Array.isArray(input.items) ? input.items : [])
      .map(item => ({
        articleId: String(item?.articleId || '').trim(),
        mode: item?.mode === 'review' ? 'review' : 'read'
      }))
      .filter(item => {
        const key = `${item.articleId}|${item.mode}`;
        if (!item.articleId || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    return {
      date,
      items,
      readTarget: Math.max(1, Math.min(20, Number(input.readTarget) || 1)),
      wordTarget: Math.max(0, Math.min(500, Number(input.wordTarget) || 12)),
      note: String(input.note || '').trim().slice(0, 500),
      createdAt: Number(input.createdAt) || Date.now(),
      updatedAt: Number(input.updatedAt) || Date.now()
    };
  }

  function summaryForDay(state, date) {
    if (!validDateKey(date)) throw new Error('summaryForDay requires YYYY-MM-DD');
    ensureState(state);
    const events = state.learningEvents.filter(event => event.date === date);
    const articleReads = new Map();
    const articleReviews = new Map();
    const words = new Map();

    for (const event of events) {
      if (event.type === 'article-read' && event.articleId && !articleReads.has(event.articleId)) {
        articleReads.set(event.articleId, event);
      }
      if (event.type === 'article-review' && event.articleId && !articleReviews.has(event.articleId)) {
        articleReviews.set(event.articleId, event);
      }
      if (event.type === 'word-learned' || event.type === 'word-reviewed') {
        const key = event.wordKey || `${event.articleId}:${event.word}`;
        const previous = words.get(key) || {
          wordKey: key,
          articleId: event.articleId,
          word: event.word,
          score: null,
          ts: 0,
          types: new Set()
        };
        previous.word = event.word || previous.word;
        previous.articleId = event.articleId || previous.articleId;
        previous.score = event.score ?? previous.score;
        previous.ts = Math.max(previous.ts, event.ts);
        previous.types.add(event.type);
        words.set(key, previous);
      }
    }

    const wordList = [...words.values()]
      .map(item => ({ ...item, types: [...item.types] }))
      .sort((left, right) => right.ts - left.ts);
    const learnedWords = wordList.filter(item => item.types.includes('word-learned'));
    const reviewedWords = wordList.filter(item => item.types.includes('word-reviewed'));
    const legacyCount = events
      .filter(event => event.type === 'legacy-day')
      .reduce((total, event) => total + Math.max(1, event.legacyCount), 0);
    const plan = normalizePlan(state.studyPlans?.[date] || {
      date,
      items: [],
      readTarget: 1,
      wordTarget: 12
    });
    const planItems = plan.items.map(item => ({
      ...item,
      completed: item.mode === 'review'
        ? articleReviews.has(item.articleId)
        : articleReads.has(item.articleId)
    }));
    return {
      date,
      events,
      articlesRead: [...articleReads.keys()],
      articlesReviewed: [...articleReviews.keys()],
      readCount: articleReads.size,
      reviewCount: articleReviews.size,
      words: wordList,
      learnedWords,
      reviewedWords,
      legacyCount,
      plan,
      planItems,
      targets: {
        readCompleted: articleReads.size >= plan.readTarget,
        wordsCompleted: wordList.length >= plan.wordTarget
      },
      completed: planItems.every(item => item.completed) &&
        articleReads.size >= plan.readTarget &&
        wordList.length >= plan.wordTarget
    };
  }

  function heatmap(state, endDate = dateKey(), weeks = 26) {
    const normalizedEnd = validDateKey(endDate) ? endDate : dateKey();
    const span = Math.max(1, Math.min(52, Number(weeks) || 26)) * 7;
    const cells = [];
    const start = shiftDateKey(normalizedEnd, -(span - 1));
    for (let index = 0; index < span; index += 1) {
      const date = shiftDateKey(start, index);
      const summary = summaryForDay(state, date);
      const count = summary.readCount + summary.reviewCount + summary.words.length + summary.legacyCount;
      const level = count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : count <= 9 ? 3 : 4;
      cells.push({
        date,
        count,
        level,
        events: summary.events.length,
        words: summary.words.length,
        articles: summary.readCount + summary.reviewCount,
        articleRead: summary.readCount,
        articleReview: summary.reviewCount,
        wordLearned: summary.learnedWords.length,
        wordReviewed: summary.reviewedWords.length,
        targetCompleted: summary.completed,
        legacy: summary.legacyCount > 0
      });
    }
    return cells;
  }

  function weeklyActivity(state, endDate = dateKey(), weeks = 12) {
    const normalizedEnd = validDateKey(endDate) ? endDate : dateKey();
    const count = Math.max(1, Math.min(52, Number(weeks) || 12));
    const end = dateFromKey(normalizedEnd) || new Date();
    const latestWeekStart = shiftDateKey(normalizedEnd, -((end.getDay() + 6) % 7));
    const firstWeekStart = shiftDateKey(latestWeekStart, -(count - 1) * 7);
    const result = [];
    for (let weekIndex = 0; weekIndex < count; weekIndex += 1) {
      const weekStart = shiftDateKey(firstWeekStart, weekIndex * 7);
      const weekEnd = shiftDateKey(weekStart, 6);
      const totals = {
        articleRead: 0,
        articleReview: 0,
        wordLearned: 0,
        wordReviewed: 0,
        activeDays: 0,
        targetDays: 0
      };
      for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
        const summary = summaryForDay(state, shiftDateKey(weekStart, dayIndex));
        totals.articleRead += summary.readCount;
        totals.articleReview += summary.reviewCount;
        totals.wordLearned += summary.learnedWords.length;
        totals.wordReviewed += summary.reviewedWords.length;
        if (summary.events.length || summary.legacyCount) totals.activeDays += 1;
        if (summary.completed) totals.targetDays += 1;
      }
      result.push({
        weekStart,
        weekEnd,
        isCurrent: weekStart === latestWeekStart,
        ...totals
      });
    }
    return result;
  }

  function activeRateSeries(state, endDate = dateKey(), days = 30, windowDays = 7) {
    const normalizedEnd = validDateKey(endDate) ? endDate : dateKey();
    const count = Math.max(1, Math.min(365, Number(days) || 30));
    const windowSize = Math.max(1, Math.min(30, Number(windowDays) || 7));
    const firstDate = shiftDateKey(normalizedEnd, -(count - 1));
    const cache = new Map();
    const summaryAt = (date) => {
      if (!cache.has(date)) cache.set(date, summaryForDay(state, date));
      return cache.get(date);
    };
    const result = [];
    for (let index = 0; index < count; index += 1) {
      const date = shiftDateKey(firstDate, index);
      const daySummary = summaryAt(date);
      const totals = {
        activeDays: 0,
        targetDays: 0,
        articleRead: 0,
        articleReview: 0,
        wordLearned: 0,
        wordReviewed: 0
      };
      for (let offset = 0; offset < windowSize; offset += 1) {
        const summary = summaryAt(shiftDateKey(date, -(windowSize - 1) + offset));
        if (summary.events.length || summary.legacyCount) totals.activeDays += 1;
        if (summary.completed) totals.targetDays += 1;
        totals.articleRead += summary.readCount;
        totals.articleReview += summary.reviewCount;
        totals.wordLearned += summary.learnedWords.length;
        totals.wordReviewed += summary.reviewedWords.length;
      }
      result.push({
        date,
        windowStart: shiftDateKey(date, -(windowSize - 1)),
        windowEnd: date,
        rate: totals.activeDays / windowSize,
        dayActive: daySummary.events.length > 0 || daySummary.legacyCount > 0,
        targetCompleted: daySummary.completed,
        dayArticles: daySummary.readCount + daySummary.reviewCount,
        dayWords: daySummary.words.length,
        ...totals
      });
    }
    return result;
  }

  function todayWords(state, date = dateKey()) {
    return summaryForDay(state, date).words;
  }

  return {
    MAX_EVENTS,
    MIGRATION_VERSION,
    dateKey,
    shiftDateKey,
    normalizeEvent,
    normalizePlan,
    ensureState,
    addEvent,
    summaryForDay,
    heatmap,
    weeklyActivity,
    activeRateSeries,
    todayWords
  };
});
