/* ================= FinLens 工作台 · 应用逻辑 =================
 * 依赖：data/articles.js（ARTICLES / TOPICS）
 * 零框架、零网络依赖；学习记录持久化于 localStorage
 * ========================================================== */

const LS_KEY = 'finlens.v1';
const RESET_VERSION_KEY = 'finlens.dataResetVersion';
const LEGACY_RECOVERY_MARKER_KEY = 'finlens.legacyRecoveryVersion';
const LEGACY_RECOVERY_VERSION = '2026-11-12-backup-v1';
const DATA_RESET_VERSION = '2026-11-03-feedback-reset-v1';
const DAY_MS = 86400000;
const KNOWLEDGE_CATEGORIES = {
  finance: '金融术语',
  background: '背景层',
  method: '分析方法'
};
const KNOWLEDGE_TYPES = {
  concept: '概念类',
  phenomenon: '现象类',
  mechanism: '机制类',
  method: '方法类'
};
const KNOWLEDGE_SOURCE_COVERAGE = [
  ['Federal Reserve', '货币政策与金融稳定', 'https://www.federalreserve.gov/'],
  ['SEC', '证券监管与披露', 'https://www.sec.gov/'],
  ['BIS', '银行、支付与金融稳定', 'https://www.bis.org/'],
  ['IMF', '宏观、财政与金融稳定', 'https://www.imf.org/'],
  ['FINRA', '证券投资者教育与市场行为', 'https://www.finra.org/'],
  ['Nasdaq', '市场词汇与证券交易', 'https://www.nasdaq.com/'],
  ['BEA', '国民账户与资本形成', 'https://www.bea.gov/'],
  ['BLS', '物价、就业与工资', 'https://www.bls.gov/'],
  ['IFRS', '财务报表与现金流量', 'https://www.ifrs.org/'],
  ['AEA', '经济学分类 JEL Codes', 'https://www.aeaweb.org/'],
  ['NBER', '经济学研究分类', 'https://www.nber.org/'],
  ['Crossref / DOI', '学术出版元数据', 'https://www.crossref.org/'],
  ['World Bank', '国际发展指标', 'https://data.worldbank.org/'],
  ['OECD', '经济、财政与就业指标', 'https://data.oecd.org/']
];
const DEFAULT_FINANCIAL_FEEDS = [
  'https://www.federalreserve.gov/feeds/press_all.xml',
  'https://www.bis.org/doclist/all_pressrels.rss',
  'https://www.ecb.europa.eu/rss/press.html',
  'https://www.sec.gov/news/pressreleases.rss',
  'https://www.cnbc.com/id/100003114/device/rss/rss.html'
];
const MARKET_MEDIA_FEEDS = [
  'https://www.cnbc.com/id/100003114/device/rss/rss.html',
  'https://www.cnbc.com/id/10000664/device/rss/rss.html',
  'https://fortune.com/feed/',
  'https://feeds.npr.org/1006/rss.xml',
  'https://www.sec.gov/news/pressreleases.rss',
  'https://www.ecb.europa.eu/rss/press.html',
  'https://fred.stlouisfed.org/blog/rss/'
];
const EXPORT_OPTION_DEFAULTS = {
  zh: true,
  vocab: true,
  know: true,
  analysis: true,
  notes: false,
  focus: 'article'
};
const VOCAB_FOCUS_VALUES = new Set(['balanced', 'ielts', 'toefl', 'finance']);

/* ---------------- 状态 ---------------- */
const DEFAULT_SETTINGS = {
  mode: 'original',       // original | intensive | immersion
  zh: 'off',              // on | hover | off
  vocab: false,
  know: false,
  font: 17,
  deck: 'due',
  vocabFilter: 'all',
  cmode: 'flip',
  engine: 'offline',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  apiKey: '',
  ccSwitchProviderId: '',
  ccSwitchAppType: '',
  localCredentialId: '',
  mwApiKey: '',
  vocabDetail: 'detail',
  vocabFocus: 'balanced',
  crawlFeeds: DEFAULT_FINANCIAL_FEEDS.join('\n'),
  crawlFrom: '',
  crawlTo: '',
  autoCrawl: false,
  crawlIntervalMin: 60,
  crawlMaxItems: 3,
  crawlAnnotate: true,
  articleSort: 'date-desc',
  sideOpen: true,
  researchOnline: true,
  ttsEngine: 'edge',
  ttsModel: 'gpt-4o-mini-tts',
  ttsVoice: 'en-US-AriaNeural',
  readTarget: 1,
  wordTarget: 12
};

let S = null;               // 由 boot() 中的 loadState() 填充
let cur = null;             // 当前文章对象
let curIdx = [];            // 当前文章词汇索引
let sideTab = 'vocab';
let cardQueue = [];
let cardPos = 0;
let cardRevealed = false;
let flashTimer = null;
let flashRevealTimer = null;
let flashRun = 0;
let flashQueue = [];
let flashPos = 0;
let quizState = null;
let quizDeck = [];
let quizPos = 0;
let cardSessionKey = '';
let quizSessionKey = '';
let crawlTimer = null;
let crawlStartTimer = null;
let crawlRunning = false;
let crawlDiagnostics = [];
let currentAudioUrl = null;
let backupTimer = null;
let lastBackupAt = 0;
let backupRunning = false;
let progressTimer = null;
let awesomeChapters = [];
const dictionarySession = new Map();
let articleManageMode = false;
const articleSelection = new Set();
let builtInArticles = [];
let vocabFocusRequestId = 0;
let vocabFocusController = null;
let vocabFocusPreviewState = null;
let vocabFocusPreviewController = null;
let vocabFocusPreviewRequestId = 0;
let bottomReached = false;
let lastImportAttempt = null;
let lastImportFailure = null;
let pendingTextSelection = null;
let selectionActionTimer = null;
let selectionLookupRequestId = 0;
let manualCredentialSavePromise = null;
let aiDataFilter = { source: 'all', q: '', articleId: '', knowledgeId: '' };
const expandedAISessions = new Set();
const expandedInlineAIHistory = new Set();
let categoryRevalidationState = null;
let activeContentFixReview = null;

/* ---------------- 工具 ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const hasServerManagedCredential = () => Boolean(
  S?.settings?.ccSwitchProviderId || S?.settings?.localCredentialId);
const hasCcSwitchCredential = () => Boolean(S?.settings?.ccSwitchProviderId);
const hasEngineCredential = () => Boolean(S?.settings?.apiKey || hasServerManagedCredential());
const modelRequestSettings = (extra = {}) => ({
  baseUrl: S.settings.baseUrl,
  model: S.settings.model,
  apiKey: hasServerManagedCredential() ? '' : S.settings.apiKey,
  ccSwitchProviderId: S.settings.ccSwitchProviderId || '',
  ccSwitchAppType: S.settings.ccSwitchAppType || '',
  localCredentialId: S.settings.localCredentialId || '',
  automation: navigator.webdriver === true,
  ...extra
});
const modelRequestPayload = async (extra = {}) => {
  if (manualCredentialSavePromise) await manualCredentialSavePromise;
  return modelRequestSettings(extra);
};
const esc = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');
const icon = (name, className = '') =>
  `<svg class="ui-icon${className ? ` ${className}` : ''}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
const decodeHtmlTextOnce = (value) => String(value || '')
  .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
    const code = parseInt(hex, 16);
    return Number.isInteger(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : `&#x${hex};`;
  })
  .replace(/&#(\d+);/g, (_, number) => {
    const code = Number(number);
    return Number.isInteger(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : `&#${number};`;
  })
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&apos;|&rsquo;|&lsquo;/gi, "'")
  .replace(/&ldquo;|&rdquo;/gi, '"')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&hellip;/gi, '…')
  .replace(/&mdash;/gi, '—')
  .replace(/&ndash;/gi, '–');
const decodeHtmlText = (value) => {
  let decoded = String(value || '');
  for (let pass = 0; pass < 3; pass += 1) {
    const next = decodeHtmlTextOnce(decoded);
    if (next === decoded) break;
    decoded = next;
  }
  return decoded;
};
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const todayStr = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const wordKey = (aid, w) => `${aid}:${w}`;
const totalWords = (a) => a.paragraphs.reduce((n, p) => n + (p.en.match(/[A-Za-z'-]+/g) || []).length, 0);
const daysAgoStr = (days) => todayStr(new Date(Date.now() - days * DAY_MS));
const stableId = (value) => {
  let hash = 2166136261;
  for (const ch of String(value)) {
    hash ^= ch.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return 'u' + (hash >>> 0).toString(36);
};

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(t._h);
  t._h = setTimeout(() => (t.hidden = true), 2000);
}

const AI_PROGRESS_STEPS = ['clean', 'connect', 'analyze', 'enrich', 'save'];
let aiProgressHideTimer = null;

function beginAIProgress(label = 'AI 标注处理中') {
  if (aiProgressHideTimer) clearTimeout(aiProgressHideTimer);
  $('#aiProgressPanel').hidden = false;
  $('#aiProgressLabel').textContent = label;
  $('#aiProgressPercent').textContent = '0%';
  $('#aiProgressBar').style.width = '0%';
  $$('#aiProgressSteps li').forEach(item => item.className = '');
}

function updateAIProgress(step, percent, message) {
  const index = AI_PROGRESS_STEPS.indexOf(step);
  if (index >= 0) {
    $$('#aiProgressSteps li').forEach((item, itemIndex) => {
      item.classList.toggle('done', itemIndex < index);
      item.classList.toggle('active', itemIndex === index);
    });
  }
  const value = Math.max(0, Math.min(100, Number(percent) || 0));
  $('#aiProgressPercent').textContent = `${value}%`;
  $('#aiProgressBar').style.width = `${value}%`;
  if (message) $('#aiProgressLabel').textContent = message;
}

function finishAIProgress(message = '标注完成') {
  updateAIProgress('save', 100, message);
  $$('#aiProgressSteps li').forEach(item => {
    item.classList.remove('active');
    item.classList.add('done');
  });
  aiProgressHideTimer = setTimeout(() => { $('#aiProgressPanel').hidden = true; }, 900);
}

function failAIProgress(message = '标注失败') {
  $('#aiProgressLabel').textContent = message;
  const active = $('#aiProgressSteps li.active') || $('#aiProgressSteps li:last-child');
  active?.classList.remove('active');
  active?.classList.add('error');
  aiProgressHideTimer = setTimeout(() => { $('#aiProgressPanel').hidden = true; }, 3500);
}

function hideAIProgress() {
  if (aiProgressHideTimer) clearTimeout(aiProgressHideTimer);
  aiProgressHideTimer = null;
  $('#aiProgressPanel').hidden = true;
}

async function requestAnnotationWithProgress(payload, label = 'AI 标注处理中') {
  beginAIProgress(label);
  try {
    const response = await fetch('/api/annotate-stream', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.includes('ndjson') || !response.body) {
      const data = await response.json();
      if (!data.ok) throw new Error(data.error || '标注失败');
      finishAIProgress('标注完成');
      return data.article;
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalArticle = null;
    let streamError = '';
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line);
        if (event.type === 'progress') updateAIProgress(event.step, event.percent, event.message);
        if (event.type === 'result') {
          if (!event.ok) streamError = event.error || '标注失败';
          else finalArticle = event.article;
        }
      }
      if (done) break;
    }
    if (buffer.trim()) {
      const event = JSON.parse(buffer);
      if (event.type === 'result') {
        if (!event.ok) streamError = event.error || '标注失败';
        else finalArticle = event.article;
      }
    }
    if (streamError) throw new Error(streamError);
    if (!finalArticle) throw new Error('模型未返回文章结果');
    finishAIProgress('标注完成');
    return finalArticle;
  } catch (error) {
    failAIProgress(error.message || '标注失败');
    throw error;
  }
}

/* ---------------- 持久化 ---------------- */
function normalizeUserMark(mark = {}, index = 0) {
  const source = mark && typeof mark === 'object' ? mark : {};
  const type = source.type === 'sentence' ? 'sentence' : 'paragraph';
  const text = String(source.text || source.quote || '').trim();
  return {
    ...source,
    id: String(source.id || `legacy-${stableId(`${source.i || 0}:${type}:${text}:${index}`)}`),
    type,
    i: Number.isInteger(source.i) ? source.i : 0,
    text,
    note: String(source.note || ''),
    start: Number.isFinite(source.start) ? source.start : null,
    end: Number.isFinite(source.end) ? source.end : null,
    ts: Number(source.ts) || Date.now()
  };
}

function loadState() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (e) { raw = null; }
  const base = {
    read: {}, words: {}, marks: {}, notes: {}, summaries: {}, tutor: {}, knowledgeTutor: {},
    dictionaries: {}, knowledgeDetails: {}, deletedArticleData: [],
    reviewSessions: {},
    knowledgeOverrides: {},
    knowledgeRevalidationBackups: [],
    knowledgeContentFixBackups: [],
    exportPicks: { initialized: false, articleIds: [], options: { ...EXPORT_OPTION_DEFAULTS }, analysis: {} },
    exportArchive: [],
    settings: { ...DEFAULT_SETTINGS },
    days: [],
    today: { date: todayStr(), read: 0, words: 0 },
    lastArticle: null,
    lastCrawlAt: 0,
    custom: [],
    vocabOverrides: {}
  };
  base.settings.crawlTo = base.settings.crawlTo || todayStr();
  base.settings.crawlFrom = base.settings.crawlFrom || daysAgoStr(30);
  if (!raw) return base;
  const st = { ...base, ...raw, settings: { ...DEFAULT_SETTINGS, ...(raw.settings || {}) } };
  st.marks = st.marks && typeof st.marks === 'object' && !Array.isArray(st.marks)
    ? Object.fromEntries(Object.entries(st.marks).map(([articleId, marks]) => [
        articleId,
        (Array.isArray(marks) ? marks : []).map(normalizeUserMark)
      ]))
    : {};
  if (!st.vocabOverrides || typeof st.vocabOverrides !== 'object' || Array.isArray(st.vocabOverrides)) {
    st.vocabOverrides = {};
  }
  for (const [articleId, override] of Object.entries(st.vocabOverrides)) {
    if (!override || typeof override !== 'object' || (override.focus && !VOCAB_FOCUS_VALUES.has(override.focus))) {
      delete st.vocabOverrides[articleId];
      continue;
    }
    override.vocab = sanitizeVocabList(override.vocab);
  }
  if (!st.reviewSessions || typeof st.reviewSessions !== 'object' || Array.isArray(st.reviewSessions)) {
    st.reviewSessions = {};
  }
  if (!st.knowledgeTutor || typeof st.knowledgeTutor !== 'object' || Array.isArray(st.knowledgeTutor)) {
    st.knowledgeTutor = {};
  }
  if (!st.knowledgeOverrides || typeof st.knowledgeOverrides !== 'object' || Array.isArray(st.knowledgeOverrides)) {
    st.knowledgeOverrides = {};
  }
  st.knowledgeRevalidationBackups = Array.isArray(st.knowledgeRevalidationBackups)
    ? st.knowledgeRevalidationBackups.filter(item => item && typeof item === 'object').slice(0, 20)
    : [];
  st.knowledgeContentFixBackups = Array.isArray(st.knowledgeContentFixBackups)
    ? st.knowledgeContentFixBackups.filter(item => item && typeof item === 'object').slice(0, 20)
    : [];
  st.deletedArticleData = Array.isArray(st.deletedArticleData)
    ? st.deletedArticleData.filter(item => item && typeof item === 'object').slice(0, 20)
    : [];
  if (!st.exportPicks || typeof st.exportPicks !== 'object' || Array.isArray(st.exportPicks)) {
    st.exportPicks = { initialized: false, articleIds: [], options: { ...EXPORT_OPTION_DEFAULTS }, analysis: {} };
  }
  st.exportPicks.initialized = st.exportPicks.initialized === true;
  st.exportPicks.articleIds = Array.isArray(st.exportPicks.articleIds)
    ? [...new Set(st.exportPicks.articleIds.map(String))]
    : [];
  st.exportPicks.options = {
    ...EXPORT_OPTION_DEFAULTS,
    ...(st.exportPicks.options && typeof st.exportPicks.options === 'object' ? st.exportPicks.options : {})
  };
  if (st.exportPicks.options.focus !== 'article' && !VOCAB_FOCUS_VALUES.has(st.exportPicks.options.focus)) {
    st.exportPicks.options.focus = 'article';
  }
  st.exportPicks.analysis = st.exportPicks.analysis && typeof st.exportPicks.analysis === 'object' &&
    !Array.isArray(st.exportPicks.analysis)
    ? Object.fromEntries(Object.entries(st.exportPicks.analysis).map(([articleId, indices]) => [
        articleId,
        [...new Set((Array.isArray(indices) ? indices : []).map(Number).filter(Number.isInteger))]
          .filter(index => index >= 0)
      ]).filter(([, indices]) => indices.length))
    : {};
  st.exportArchive = Array.isArray(st.exportArchive)
    ? st.exportArchive.filter(item => item && typeof item === 'object').slice(0, 30)
    : [];
  const legacyReviewDeck = ['current', 'wrong'].includes(st.settings.deck) ? st.settings.deck : '';
  if (!raw.settings?.vocabFilter) {
    st.settings.vocabFilter = st.settings.deck === 'current'
      ? 'current'
      : st.settings.deck === 'wrong' ? 'wrong' : 'all';
  }
  if (!['all', 'current', 'wrong'].includes(st.settings.vocabFilter)) st.settings.vocabFilter = 'all';
  if (legacyReviewDeck) st.settings.deck = 'all';
  if (!['new', 'due', 'all'].includes(st.settings.deck)) st.settings.deck = 'due';
  if (!VOCAB_FOCUS_VALUES.has(st.settings.vocabFocus)) st.settings.vocabFocus = 'balanced';
  if (!raw.settings || raw.settings.readingDefaultsVersion !== 2) {
    st.settings.mode = 'original';
    st.settings.zh = 'off';
    st.settings.vocab = false;
    st.settings.know = false;
  }
  if (!raw.settings || raw.settings.feedDefaultsVersion !== 1) {
    if (!st.settings.crawlFeeds || /example\.(com|org)|example\.com/.test(st.settings.crawlFeeds)) {
      st.settings.crawlFeeds = DEFAULT_FINANCIAL_FEEDS.join('\n');
    }
    st.settings.feedDefaultsVersion = 1;
  }
  if (!raw.settings || raw.settings.ttsDefaultsVersion !== 1) {
    if (!st.settings.ttsEngine || st.settings.ttsEngine === 'browser') st.settings.ttsEngine = 'edge';
    if (!st.settings.ttsVoice || st.settings.ttsVoice === 'alloy') st.settings.ttsVoice = 'en-US-AriaNeural';
    st.settings.ttsDefaultsVersion = 1;
  }
  st.settings.readingDefaultsVersion = 2;
  st.settings.crawlTo = st.settings.crawlTo || todayStr();
  st.settings.crawlFrom = st.settings.crawlFrom || daysAgoStr(30);
  if (/^http:\/\/(127\.0\.0\.1|localhost):8787\/v1\/?$/.test(st.settings.baseUrl || '')) {
    st.settings.baseUrl = DEFAULT_SETTINGS.baseUrl;
  }
  if (!st.today || st.today.date !== todayStr()) {
    st.today = { date: todayStr(), read: 0, words: 0 };
  }
  return st;
}
function save() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) {}
  scheduleAutoBackup();
}

function applyOneTimeDataReset() {
  try {
    if (localStorage.getItem(RESET_VERSION_KEY) === DATA_RESET_VERSION) return false;
    localStorage.removeItem(LS_KEY);
    localStorage.setItem(RESET_VERSION_KEY, DATA_RESET_VERSION);
    return true;
  } catch {
    return false;
  }
}

async function restoreLegacyBackupIfNeeded() {
  try {
    if (localStorage.getItem(LEGACY_RECOVERY_MARKER_KEY) === LEGACY_RECOVERY_VERSION) {
      return false;
    }
    let current = null;
    try {
      current = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    } catch {}
    const hasLearningContent = current && typeof current === 'object' && (
      (Array.isArray(current.custom) && current.custom.length) ||
      Object.keys(current.words || {}).length ||
      Object.keys(current.read || {}).length ||
      Object.keys(current.marks || {}).length ||
      Object.keys(current.notes || {}).length ||
      Object.keys(current.summaries || {}).length ||
      Object.keys(current.tutor || {}).length ||
      Object.keys(current.knowledgeTutor || {}).length ||
      Object.keys(current.reviewSessions || {}).length ||
      Object.keys(current.vocabOverrides || {}).length ||
      (Array.isArray(current.exportArchive) && current.exportArchive.length)
    );
    if (hasLearningContent) return false;
    const response = await fetch(
      '/api/recovery/latest' + (navigator.webdriver ? '?automation=1' : ''),
      { cache: 'no-store' }
    );
    if (!response.ok) return false;
    const data = await response.json();
    const backup = data?.backup;
    if (!backup || typeof backup !== 'object' || !backup.settings || !backup.words) return false;
    const backupHasLearningContent =
      (Array.isArray(backup.custom) && backup.custom.length) ||
      Object.keys(backup.words || {}).length ||
      Object.keys(backup.read || {}).length ||
      Object.keys(backup.marks || {}).length ||
      Object.keys(backup.summaries || {}).length ||
      Object.keys(backup.tutor || {}).length ||
      Object.keys(backup.knowledgeTutor || {}).length ||
      (Array.isArray(backup.exportArchive) && backup.exportArchive.length);
    if (!backupHasLearningContent) return false;
    const restored = {
      ...backup,
      legacyRecovery: {
        source: String(data.name || ''),
        restoredAt: Date.now()
      },
      settings: {
        ...(backup.settings || {}),
        ...(current?.settings?.apiKey ? { apiKey: current.settings.apiKey } : { apiKey: '' }),
        ...(current?.settings?.mwApiKey ? { mwApiKey: current.settings.mwApiKey } : { mwApiKey: '' }),
        ...(current?.settings?.baseUrl ? { baseUrl: current.settings.baseUrl } : {}),
        ...(current?.settings?.model ? { model: current.settings.model } : {}),
        ccSwitchProviderId: current?.settings?.ccSwitchProviderId || '',
        ccSwitchAppType: current?.settings?.ccSwitchAppType || '',
        localCredentialId: current?.settings?.localCredentialId || ''
      },
      custom: Array.isArray(backup.custom) ? backup.custom : []
    };
    localStorage.setItem(LS_KEY, JSON.stringify(restored));
    localStorage.setItem(LEGACY_RECOVERY_MARKER_KEY, LEGACY_RECOVERY_VERSION);
    return true;
  } catch {
    return false;
  }
}

function touchDay() {
  const d = todayStr();
  if (!S.days.includes(d)) { S.days.push(d); S.days = S.days.slice(-400); }
}
function streak() {
  if (!S.days.length) return 0;
  const set = new Set(S.days);
  let n = 0;
  let d = new Date();
  if (!set.has(todayStr(d))) d = new Date(Date.now() - DAY_MS);
  while (set.has(todayStr(d))) { n++; d = new Date(d.getTime() - DAY_MS); }
  return n;
}

/* ================= 启动 ================= */
async function boot() {
  const didReset = applyOneTimeDataReset();
  const didRestoreLegacyBackup = await restoreLegacyBackupIfNeeded();
  S = loadState();
  builtInArticles = ARTICLES.map(sanitizeArticleFields);
  S.custom = (S.custom || []).map(sanitizeArticleFields);
  ARTICLES.splice(0, ARTICLES.length, ...builtInArticles, ...(S.custom || []));
  applyVocabOverridesInMemory();
  applyKnowledgeCategoryOverrides();
  document.body.dataset.zh = S.settings.zh;
  document.body.dataset.mode = S.settings.mode;
  document.body.dataset.vocab = S.settings.vocab ? 'on' : 'off';
  document.body.dataset.know = S.settings.know ? 'on' : 'off';

  buildTopicSeg('#topicSeg', 'all', (id) => { filter.topic = id; renderList(); });
  buildTopicSeg('#kbTopicSeg', 'all', (id) => { kb.topic = id; renderKB(); });
  wireNav();
  wireReader();
  wireCards();
  wireExport();
  wireSettings();
  wireImport();
  wireKeyboard();

  renderStats();
  renderGoal();

  const start = ARTICLES.find(a => a.id === S.lastArticle) || ARTICLES[0];
  openArticle(start.id);
  renderList();
  renderCards();
  renderKB();
  renderExport();
  syncToolbar();
  syncSidePane();
  checkServer();
  migrateLegacyBrowserCredential();
  paintCrawlStatus();
  scheduleCrawl();
  wireBackupLifecycle();
  if (didReset) toast('历史学习数据已清空，当前使用初始设置');
  if (didRestoreLegacyBackup) toast('检测到旧版学习备份，已自动恢复文章、词汇和学习进度');
}

/* ---------------- 导航 ---------------- */
const VIEW_META = {
  reader:    ['阅读台', '按文章精读，随时查词、核对术语'],
  cards:     ['词汇复习', '按记忆间隔复习卡片、闪现和测验'],
  knowledge: ['金融知识库', '按主题找概念、机制和案例'],
  knowledgeDetail: ['知识详解', '概念、机制、来源和相关案例'],
  export:    ['产出与归档', '整理讲义，保存学习记录']
};
let activeView = 'reader';

function wireNav() {
  $('#nav').addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-item');
    if (!btn) return;
    switchView(btn.dataset.view);
  });
}
function switchView(v) {
  activeView = v;
  const navView = v === 'knowledgeDetail' ? 'knowledge' : v;
  $$('.nav-item').forEach(b => {
    const active = b.dataset.view === navView;
    b.classList.toggle('is-active', active);
    if (active) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  const viewId = v === 'knowledgeDetail' ? 'view-knowledge-detail' : 'view-' + v;
  $$('.view').forEach(s => s.classList.toggle('is-active', s.id === viewId));
  const [t, sub] = VIEW_META[v];
  $('#viewTitle').textContent = t;
  $('#viewSub').textContent = sub;
  if (v === 'cards') renderCards();
  if (v === 'knowledge') renderKB();
  if (v === 'export') { renderExport(); renderArchive(); }
}

/* ---------------- 主题筛选器 ---------------- */
const filter = { topic: 'all', level: 'all', read: 'all', q: '' };
const kb = { topic: 'all', category: 'all', q: '' };

function buildTopicSeg(sel, active, onPick) {
  const el = $(sel);
  el.innerHTML = TOPICS.map(t => `<button data-t="${t.id}" class="${t.id === active ? 'on' : ''}">${t.name}</button>`).join('');
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    [...el.children].forEach(c => c.classList.toggle('on', c === b));
    onPick(b.dataset.t);
  });
}

/* ================= 视图 1：阅读台 ================= */
function isRead(id) { return !!(S.read[id] && S.read[id].done); }
function isStudied(id) {
  const state = S.read[id];
  return !!(state && (state.done || (state.progress || 0) > 0 || (state.reviewCount || 0) > 0));
}

function openArticle(id) {
  cur = ARTICLES.find(a => a.id === id);
  if (!cur) return;
  bottomReached = false;
  resetCardRuntime();
  curIdx = buildVocabIndex(cur);
  S.lastArticle = id;
  save();
  renderDoc();
  renderSide();
  renderList();
  const saved = S.read[id];
  const resumeProgress = saved && !saved.done ? Math.max(0, Math.min(99, saved.progress || 0)) : 0;
  const scroller = $('#docScroll');
  scroller.scrollTop = resumeProgress
    ? Math.round((scroller.scrollHeight - scroller.clientHeight) * resumeProgress / 100)
    : 0;
  bottomReached = scroller.scrollHeight <= scroller.clientHeight + 4;
  syncToolbar();
  syncReadControls();
}

function isCustomArticle(id) {
  return (S.custom || []).some(article => article.id === id);
}

function annotationRetryState(article) {
  if (!article || !isCustomArticle(article.id)) return null;
  if (article._annotationStatus === 'complete') return null;
  if (article._annotationStatus === 'failed') {
    return { error: String(article._annotationError || '') };
  }
  const hasAnnotation = Boolean(
    (article.vocab || []).length ||
    (article.knowledge || []).length ||
    (article.paragraphs || []).some(paragraph =>
      paragraph.zh?.trim() ||
      paragraph.note?.trim() ||
      paragraph.analysis?.english?.longSentence ||
      paragraph.analysis?.finance?.term)
  );
  return hasAnnotation ? null : { error: '' };
}

function buildVocabIndex(a) {
  const out = [];
  a.vocab.forEach(v => {
    const id = wordKey(a.id, v.w);
    const surfaces = new Set([v.w, ...(v.forms || [])]);
    const base = v.w;
    if (!/\s/.test(base)) {
      [base + 's', base + 'es', base + 'ed', base + 'd', base + 'ing'].forEach(s => surfaces.add(s));
      if (/e$/.test(base)) surfaces.add(base.slice(0, -1) + 'ing');
      if (/y$/.test(base)) surfaces.add(base.slice(0, -1) + 'ies');
    } else {
      // 短语：处理首词变形
      const parts = base.split(' ');
      surfaces.add([parts[0] + 's', ...parts.slice(1)].join(' '));
      surfaces.add([parts[0] + 'ed', ...parts.slice(1)].join(' '));
    }
    surfaces.forEach(s => { if (s && s.length > 1) out.push({ s: s.toLowerCase(), id, v }); });
  });
  out.sort((x, y) => y.s.length - x.s.length);
  return out;
}

function markVocab(text) {
  if (!S.settings.vocab || !curIdx.length) return text;
  const pat = curIdx.map(x => escRe(x.s)).join('|');
  const re = new RegExp('\\b(' + pat + ')\\b', 'gi');
  return text.replace(re, (m) => {
    const hit = curIdx.find(x => x.s === m.toLowerCase());
    if (!hit) return m;
    const seen = S.words[hit.id] ? ' seen' : '';
    return `<span class="w${seen}" data-v="${hit.id}">${m}</span>`;
  });
}

function findKnow(term) {
  if (!cur) return null;
  const target = normalizedKnowledgeAlias(term);
  if (!target) return null;
  return cur.knowledge.find(card => knowledgeHighlightAliasSet(card).has(target)) || null;
}

function renderDoc() {
  const a = cur;
  const wc = totalWords(a);
  const mins = Math.max(3, Math.round(wc / 90));
  const read = isRead(a.id);
  const annotationRetry = annotationRetryState(a);
  const knowledgeAliasCards = new Map();
  const normalizeKnowledgeAlias = value => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
  a.knowledge.forEach(card => {
    knowledgeHighlightAliasSet(card).forEach(key => {
      if (!knowledgeAliasCards.has(key)) knowledgeAliasCards.set(key, card);
    });
  });
  const knowledgeAliases = [...knowledgeAliasCards.keys()].sort((x, y) => y.length - x.length);
  const knowledgeAliasPattern = knowledgeAliases.length
    ? new RegExp(
        `(?<![A-Za-z0-9])(${knowledgeAliases.map(alias => escRe(alias).replace(/\s+/g, '\\s+')).join('|')})(?![A-Za-z0-9])`,
        'gi'
      )
    : null;
  const renderKnowledgeAwareText = (text) => {
    if (!S.settings.know || !knowledgeAliasPattern) return markVocab(esc(text));
    return String(text || '').split(knowledgeAliasPattern).map(part => {
      const card = knowledgeAliasCards.get(normalizeKnowledgeAlias(part));
      if (!card) return markVocab(esc(part));
      return `<span class="kmark" data-k="${card.id}" data-term="${esc(part)}">${markVocab(esc(part))}</span>`;
    }).join('');
  };

  const head = `
    ${annotationRetry ? `<div class="annotation-retry" id="annotationRetry">
      <div class="annotation-retry-copy">
        <b>这篇文章的标注还没有完成</b>
        <span>原文已保留，可重新运行翻译、词汇、术语与双模块解析。</span>
        ${annotationRetry.error ? `<small id="annotationRetryError">上次失败：${esc(annotationRetry.error)}</small>` : '<small id="annotationRetryError" hidden></small>'}
      </div>
      <button class="mini-btn annotation-retry-btn" id="btnRerunAnnotation" type="button">${icon('rotate')}<span>重新运行标注</span></button>
    </div>` : ''}
    <div class="doc-head">
      <div class="doc-kicker">
        <span class="k-src">${esc(a.source)}</span><span class="k-dot"></span>
        <span>${a.date}</span><span class="k-dot"></span>
        <span>${a.level}</span><span class="k-dot"></span>
        <span>${wc} words · ${mins} min</span>
      </div>
      <h1 class="doc-title">${esc(a.title)}</h1>
      <p class="doc-deck">${esc(a.deck)}</p>
      <div class="doc-tags">
        ${a.vocab.length ? `<span class="tag tag-vocab"><i></i>生词 ${a.vocab.length}</span>` : ''}
        ${a.knowledge.length ? `<span class="tag tag-term"><i></i>术语卡 ${a.knowledge.length}</span>` : ''}
        ${read ? `<span class="tag">已精读</span>` : ''}
      </div>
    </div>`;

  const paras = a.paragraphs.map((p, i) => {
    const paragraphText = decodeHtmlText(p.en);
    const segs = paragraphText.split(/(\{\{[^}]+\}\})/g);
    const en = segs.map(seg => {
      const m = seg.match(/^\{\{([^}]+)\}\}$/);
      if (m) {
        const term = m[1].trim();
        const k = findKnow(term);
        return S.settings.know && k
          ? `<span class="kmark" data-k="${k.id}" data-term="${esc(term)}">${markVocab(esc(term))}</span>`
          : renderKnowledgeAwareText(term);
      }
      return renderKnowledgeAwareText(seg);
    }).join('');
    const marked = (S.marks[a.id] || []).some(mark => mark.type === 'paragraph' && mark.i === i);
    return `
      <div class="para" data-i="${i}">
        <span class="para-index">${String(i + 1).padStart(2, '0')}</span>
        <div class="para-ops">
          <button class="op-btn op-speak" data-i="${i}" title="朗读本段" aria-label="朗读本段">${icon('play')}</button>
          <button class="op-btn op-mark ${marked ? 'on' : ''}" data-i="${i}" title="${marked ? '取消收藏本段' : '收藏本段'}" aria-label="${marked ? '取消收藏本段' : '收藏本段'}">${icon('star')}</button>
          <button class="op-btn op-copy" data-i="${i}" title="复制原文" aria-label="复制原文">${icon('copy')}</button>
        </div>
        <p class="para-en">${en}</p>
        ${p.zh ? `<p class="para-zh">${esc(decodeHtmlText(p.zh))}</p>` : ''}
        ${p.note ? `<p class="para-note"><b>难点拆解</b>　${esc(decodeHtmlText(p.note))}</p>` : ''}
      </div>`;
  }).join('');

  const foot = `
    <div class="doc-foot">
      <button class="btn" id="btnReadAloud">${icon('volume-2')}<span>全文朗读</span></button>
      <button class="btn ghost" id="btnToCards">${icon('layers')}<span>用本篇生词复习</span></button>
    </div>`;

  $('#doc').innerHTML = head + paras + foot;
  applySentenceMarks(a.id);
  hideSelectionAction();
  syncReadControls();
  $('#btnReadAloud').addEventListener('click', (e) => {
    e.stopPropagation();
    playArticleSpeech();
  });
  $('#btnToCards').addEventListener('click', (e) => {
    e.stopPropagation();
    S.settings.deck = 'all';
    S.settings.vocabFilter = 'current';
    S.settings.cmode = 'flip';
    save();
    syncToolbar();
    resetCardRuntime();
    switchView('cards');
  });
  $('#doc').style.setProperty('--doc-size', S.settings.font + 'px');
  $('#doc').style.setProperty('font-size', S.settings.font + 'px');
  $('#btnRerunAnnotation')?.addEventListener('click', rerunCurrentAnnotation);
}

/* ---- 阅读区交互 ---- */
function wireReader() {
  const doc = $('#doc');
  document.addEventListener('selectionchange', scheduleSelectionAction);
  const markSelectionButton = $('#btnMarkSelection');
  const lookupSelectionButton = $('#btnLookupSelection');
  markSelectionButton.addEventListener('mousedown', event => event.preventDefault());
  markSelectionButton.addEventListener('click', addPendingSentenceMark);
  lookupSelectionButton.addEventListener('mousedown', event => event.preventDefault());
  lookupSelectionButton.addEventListener('click', lookupSelectedWord);

  doc.addEventListener('click', (e) => {
    const sentenceMark = e.target.closest('.sentence-mark');
    if (sentenceMark) {
      openMarkNotes(sentenceMark.dataset.markId);
      return;
    }

    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.toString().trim()) return;

    const w = e.target.closest('.w');
    if (w) return showWordPop(w);

    const km = e.target.closest('.kmark');
    if (km) return showKnowPop(km);

    const op = e.target.closest('.op-btn');
    if (op) {
      const i = +op.dataset.i;
      if (op.classList.contains('op-speak')) speak(cur.paragraphs[i].en);
      if (op.classList.contains('op-copy')) {
        navigator.clipboard?.writeText(cur.paragraphs[i].en.replace(/\{\{|\}\}/g, ''));
        toast('原文已复制');
      }
      if (op.classList.contains('op-mark')) toggleMark(i, op);
      return;
    }
  });

  // 筛选
  $$('#topicSeg').length; // noop guard
  $('#filterLevel').addEventListener('change', (e) => { filter.level = e.target.value; renderList(); });
  $('#articleSort').addEventListener('change', (e) => {
    S.settings.articleSort = e.target.value;
    save();
    renderList();
  });
  $('#readFilterSeg').addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (!button) return;
    filter.read = button.dataset.read;
    $$('#readFilterSeg button').forEach(item => item.classList.toggle('on', item === button));
    renderList();
  });
  $('#articleSearch').addEventListener('input', (e) => { filter.q = e.target.value; renderList(); });
  $('#mobileArticle').addEventListener('change', (e) => openArticle(e.target.value));
  $('#btnShuffle').addEventListener('click', () => {
    const pool = filteredArticles();
    if (!pool.length) return toast('当前筛选下没有文章');
    openArticle(pool[Math.floor(Math.random() * pool.length)].id);
  });
  $('#btnSideToggle').addEventListener('click', () => {
    S.settings.sideOpen = S.settings.sideOpen === false;
    save();
    syncSidePane();
  });
  const toggleArticleManage = (force) => {
    articleManageMode = typeof force === 'boolean' ? force : !articleManageMode;
    if (!articleManageMode) articleSelection.clear();
    renderList();
  };
  $('#btnManageArticles').addEventListener('click', () => toggleArticleManage());
  $('#btnCancelManage').addEventListener('click', () => toggleArticleManage(false));
  $('#btnSelectAllArticles').addEventListener('click', () => {
    const customIds = filteredArticles().filter(article => isCustomArticle(article.id)).map(article => article.id);
    if (customIds.length && customIds.every(id => articleSelection.has(id))) {
      articleSelection.clear();
    } else {
      customIds.forEach(id => articleSelection.add(id));
    }
    renderList();
  });
  $('#btnDeleteArticles').addEventListener('click', deleteSelectedArticles);

  // 工具栏
  $('#modeSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    applyModePreset(b.dataset.mode);
  });
  $('#zhSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    S.settings.zh = b.dataset.zh; save(); syncToolbar();
    document.body.dataset.zh = b.dataset.zh;
  });
  $('#tglVocab').addEventListener('click', () => {
    S.settings.vocab = !S.settings.vocab; save(); syncToolbar();
    document.body.dataset.vocab = S.settings.vocab ? 'on' : 'off';
    renderDoc();
  });
  $('#tglKnow').addEventListener('click', () => {
    S.settings.know = !S.settings.know; save(); syncToolbar();
    document.body.dataset.know = S.settings.know ? 'on' : 'off';
    renderDoc();
  });
  $('#btnTts').addEventListener('click', playArticleSpeech);
  $('#ttsAudio').addEventListener('ended', () => $('#btnTts').classList.remove('is-playing'));
  $('#fontPlus').addEventListener('click', () => setFont(1));
  $('#fontMinus').addEventListener('click', () => setFont(-1));

  // 右栏 tab
  $('#sideTabs').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    sideTab = b.dataset.tab;
    $$('#sideTabs button').forEach(x => x.classList.toggle('on', x === b));
    renderSide();
  });

  // 滚到底部自动标记
  $('#docScroll').addEventListener('scroll', () => {
    const el = $('#docScroll');
    hideSelectionAction();
    if (!cur) return;
    const articleId = cur.id;
    if (progressTimer) clearTimeout(progressTimer);
    progressTimer = setTimeout(() => {
      const progress = Math.min(100, Math.round(el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight) * 100));
      if (progress > 0) {
        const state = S.read[articleId] || (S.read[articleId] = {});
        state.progress = progress;
        state.lastActiveAt = Date.now();
        save();
      }
    }, 600);
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) {
      bottomReached = true;
      syncReadControls();
    }
  });

  $('#btnDone').addEventListener('click', () => {
    if (!cur || $('#btnDone').disabled) return;
    setRead(!isRead(cur.id));
  });
  $('#btnReviewArticle').addEventListener('click', reviewArticle);

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#popover') &&
        !e.target.closest('#selectionToolbar') &&
        !e.target.closest('.w') &&
        !e.target.closest('.kmark')) hidePop();
  });
  window.addEventListener('resize', () => {
    hidePop();
    hideSelectionAction();
  });
}

function setFont(d) {
  S.settings.font = Math.min(23, Math.max(14, S.settings.font + d));
  save();
  $('#doc').style.setProperty('--doc-size', S.settings.font + 'px');
  $('#doc').style.setProperty('font-size', S.settings.font + 'px');
}

function applyModePreset(mode) {
  const presets = {
    original: { zh: 'off', vocab: false, know: false, label: '原文模式：辅助已关闭，可按需开启' },
    intensive: { zh: 'on', vocab: true, know: true, label: '精读模式：译文、词汇与术语已开启' },
    immersion: { zh: 'hover', vocab: true, know: true, label: '沉浸模式：译文悬停显示' }
  };
  const preset = presets[mode] || presets.original;
  S.settings.mode = mode;
  S.settings.zh = preset.zh;
  S.settings.vocab = preset.vocab;
  S.settings.know = preset.know;
  document.body.dataset.mode = mode;
  document.body.dataset.zh = preset.zh;
  document.body.dataset.vocab = preset.vocab ? 'on' : 'off';
  document.body.dataset.know = preset.know ? 'on' : 'off';
  save();
  syncToolbar();
  renderDoc();
  toast(preset.label);
}

function syncToolbar() {
  $$('#modeSeg button').forEach(b => b.classList.toggle('on', b.dataset.mode === S.settings.mode));
  $$('#zhSeg button').forEach(b => b.classList.toggle('on', b.dataset.zh === S.settings.zh));
  $('#tglVocab').classList.toggle('on', S.settings.vocab);
  $('#tglKnow').classList.toggle('on', S.settings.know);
  $$('#deckSeg button').forEach(b => b.classList.toggle('on', b.dataset.deck === S.settings.deck));
  $$('#reviewFilterSeg button').forEach(b =>
    b.classList.toggle('on', b.dataset.reviewFilter === (S.settings.vocabFilter || 'all')));
  $$('#cardModeSeg button').forEach(b => b.classList.toggle('on', b.dataset.cmode === S.settings.cmode));
}

function syncSidePane() {
  const open = S.settings.sideOpen !== false;
  $('.reader-grid').classList.toggle('side-collapsed', !open);
  const button = $('#btnSideToggle');
  if (button) {
    button.classList.toggle('on', open);
    button.innerHTML = icon('panel-right');
    button.title = open ? '收起侧栏' : '展开侧栏';
    button.setAttribute('aria-label', open ? '收起侧栏' : '展开侧栏');
    button.setAttribute('aria-pressed', open ? 'true' : 'false');
  }
}

function newMarkId() {
  return `mark-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function hideSelectionAction() {
  pendingTextSelection = null;
  const toolbar = $('#selectionToolbar');
  if (toolbar) toolbar.hidden = true;
  const lookupButton = $('#btnLookupSelection');
  const markButton = $('#btnMarkSelection');
  if (lookupButton) lookupButton.hidden = true;
  if (markButton) markButton.hidden = true;
}

function parentElement(node) {
  return node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
}

function selectionOverlapsMark(list, start, end) {
  return (list || []).some(mark =>
    mark.type === 'sentence' &&
    Number.isFinite(mark.start) &&
    Number.isFinite(mark.end) &&
    start < mark.end &&
    end > mark.start);
}

function scheduleSelectionAction() {
  if (selectionActionTimer) clearTimeout(selectionActionTimer);
  selectionActionTimer = setTimeout(refreshSelectionAction, 90);
}

function lookupableSelectionWord(text) {
  const word = String(text || '').trim().replace(/’/g, "'");
  return /^[A-Za-z][A-Za-z'-]{0,39}$/.test(word) ? word : '';
}

function sentenceAroundSelection(text, start, end) {
  const before = text.slice(0, start);
  const after = text.slice(end);
  const sentenceStart = Math.max(
    before.lastIndexOf('.'),
    before.lastIndexOf('!'),
    before.lastIndexOf('?')
  ) + 1;
  const endings = ['.', '!', '?']
    .map(mark => after.indexOf(mark))
    .filter(index => index >= 0);
  const sentenceEnd = endings.length ? end + Math.min(...endings) + 1 : text.length;
  return text.slice(sentenceStart, sentenceEnd).replace(/\s+/g, ' ').trim();
}

function refreshSelectionAction() {
  const selection = window.getSelection();
  const toolbar = $('#selectionToolbar');
  const lookupButton = $('#btnLookupSelection');
  const markButton = $('#btnMarkSelection');
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed || !selection.toString().trim()) {
    hideSelectionAction();
    return;
  }
  const range = selection.getRangeAt(0);
  const startElement = parentElement(range.startContainer);
  const endElement = parentElement(range.endContainer);
  const paragraphEn = startElement?.closest('.para-en');
  if (!paragraphEn || !endElement || !paragraphEn.contains(endElement)) {
    hideSelectionAction();
    return;
  }
  const paragraph = paragraphEn.closest('.para');
  if (!paragraph) {
    hideSelectionAction();
    return;
  }
  const index = Number(paragraph.dataset.i);
  const prefix = range.cloneRange();
  prefix.selectNodeContents(paragraphEn);
  prefix.setEnd(range.startContainer, range.startOffset);
  const rawText = range.toString();
  const text = rawText.replace(/\s+/g, ' ').trim();
  const start = prefix.toString().length;
  const end = start + rawText.length;
  const lookupWord = lookupableSelectionWord(text);
  const canMark = (!!lookupWord || text.length >= 3) && text.length <= 500;
  if (!Number.isInteger(index) || (!lookupWord && !canMark)) {
    hideSelectionAction();
    return;
  }
  const marks = S.marks[cur?.id] || [];
  if (selectionOverlapsMark(marks, start, end)) {
    hideSelectionAction();
    return;
  }
  const rect = range.getBoundingClientRect();
  if (!toolbar || !lookupButton || !markButton || (!rect.width && !rect.height)) {
    hideSelectionAction();
    return;
  }
  pendingTextSelection = {
    i: index,
    start,
    end,
    text,
    lookupWord,
    sentence: sentenceAroundSelection(paragraphEn.textContent, start, end),
    rect: {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height
    }
  };
  lookupButton.hidden = !lookupWord;
  markButton.hidden = !canMark;
  toolbar.hidden = false;
  const toolbarRect = toolbar.getBoundingClientRect();
  const left = Math.min(
    window.innerWidth - toolbarRect.width - 12,
    Math.max(12, rect.left + rect.width / 2 - toolbarRect.width / 2)
  );
  const top = rect.top > toolbarRect.height + 16
    ? rect.top - toolbarRect.height - 8
    : rect.bottom + 8;
  toolbar.style.left = `${left}px`;
  toolbar.style.top = `${Math.max(12, top)}px`;
}

function addPendingSentenceMark() {
  if (!pendingTextSelection || !cur) return;
  const list = S.marks[cur.id] || (S.marks[cur.id] = []);
  if (selectionOverlapsMark(list, pendingTextSelection.start, pendingTextSelection.end)) {
    hideSelectionAction();
    return toast('所选文字已有句子标注');
  }
  const mark = {
    id: newMarkId(),
    type: 'sentence',
    ...pendingTextSelection,
    note: '',
    ts: Date.now()
  };
  list.push(mark);
  window.getSelection()?.removeAllRanges();
  hideSelectionAction();
  save();
  renderDoc();
  openMarkNotes(mark.id);
  toast('已加入我的标注');
}

function wrapTextRange(root, start, end, markId) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let offset = 0;
  let node;
  while ((node = walker.nextNode())) {
    const length = node.textContent.length;
    nodes.push({ node, start: offset, end: offset + length });
    offset += length;
  }
  for (const entry of nodes) {
    if (end <= entry.start || start >= entry.end) continue;
    let target = entry.node;
    let localStart = Math.max(0, start - entry.start);
    let localEnd = Math.min(target.textContent.length, end - entry.start);
    if (localStart > 0) {
      target = target.splitText(localStart);
      localEnd -= localStart;
    }
    if (localEnd < target.textContent.length) target.splitText(localEnd);
    const mark = document.createElement('mark');
    mark.className = 'sentence-mark';
    mark.dataset.markId = markId;
    target.parentNode.insertBefore(mark, target);
    mark.appendChild(target);
  }
}

function applySentenceMarks(articleId) {
  const sentenceMarks = (S.marks[articleId] || [])
    .filter(mark => mark.type === 'sentence' && Number.isFinite(mark.start) && Number.isFinite(mark.end))
    .sort((left, right) => right.start - left.start);
  for (const mark of sentenceMarks) {
    const paragraph = $(`.para[data-i="${mark.i}"] .para-en`);
    if (paragraph) wrapTextRange(paragraph, mark.start, mark.end, mark.id);
  }
}

function openMarkNotes(markId) {
  if (!cur) return;
  S.settings.sideOpen = true;
  sideTab = 'notes';
  save();
  syncSidePane();
  $$('#sideTabs button').forEach(button => button.classList.toggle('on', button.dataset.tab === 'notes'));
  renderSide();
  requestAnimationFrame(() => {
    const mark = (S.marks[cur?.id] || []).find(item => item.id === markId);
    if (mark?.type === 'sentence') {
      const highlight = [...document.querySelectorAll('.sentence-mark')]
        .find(element => element.dataset.markId === markId);
      highlight?.scrollIntoView({ block: 'center' });
      highlight?.animate([{ background: '#ffe58a' }, { background: '#fff3bf' }], { duration: 900 });
    }
    document.querySelector(`[data-mark-note="${markId}"]`)?.focus();
  });
}

function removeUserMark(markId) {
  if (!cur) return;
  S.marks[cur.id] = (S.marks[cur.id] || []).filter(mark => mark.id !== markId);
  save();
  renderDoc();
  renderSide();
  toast('标注已删除');
}

function jumpToUserMark(markId) {
  if (!cur) return;
  const mark = (S.marks[cur.id] || []).find(item => item.id === markId);
  if (!mark) return;
  const target = mark.type === 'sentence'
    ? [...document.querySelectorAll('.sentence-mark')].find(element => element.dataset.markId === markId)
    : $(`.para[data-i="${mark.i}"]`);
  if (!target) return;
  target.scrollIntoView({ block: 'center' });
  target.animate([{ background: '#fff3bf' }, { background: 'transparent' }], { duration: 1100 });
}

function toggleMark(i, btn) {
  const list = S.marks[cur.id] || (S.marks[cur.id] = []);
  const k = list.findIndex(mark => mark.type === 'paragraph' && mark.i === i);
  if (k >= 0) { list.splice(k, 1); btn.classList.remove('on'); btn.innerHTML = icon('star'); }
  else {
    list.push({
      id: newMarkId(),
      type: 'paragraph',
      i,
      text: cur.paragraphs[i].en.replace(/\{\{|\}\}/g, ''),
      zh: cur.paragraphs[i].zh,
      note: '',
      ts: Date.now()
    });
    btn.classList.add('on'); btn.innerHTML = icon('star');
    toast('已加入我的标注');
  }
  save();
  renderSide();
}

function setRead(v, auto) {
  if (!S.read[cur.id]) S.read[cur.id] = {};
  const was = S.read[cur.id].done;
  S.read[cur.id].done = v;
  S.read[cur.id].ts = Date.now();
  if (v && !was) {
    S.read[cur.id].reviewCount = S.read[cur.id].reviewCount || 0;
    S.today.read += 1;
    touchDay();
    if (auto) toast('已读完一遍 · 计入今日进度');
  }
  save();
  renderDoc();
  renderList();
  renderStats();
  renderGoal();
  syncReadControls();
}

function syncReadControls() {
  const done = $('#btnDone');
  const review = $('#btnReviewArticle');
  if (!done || !review) return;
  const read = !!cur && isRead(cur.id);
  done.disabled = !cur || (!read && !bottomReached);
  done.innerHTML = `${icon(read ? 'rotate' : 'check')}<span>${read ? '取消已学习' : bottomReached ? '标记已学习' : '读完可标记'}</span>`;
  done.classList.toggle('on', read);
  review.hidden = !read;
}

function reviewArticle() {
  if (!cur) return;
  const state = S.read[cur.id] || (S.read[cur.id] = {});
  state.reviewCount = (state.reviewCount || 0) + 1;
  state.lastReviewAt = Date.now();
  save();
  applyModePreset('intensive');
  $('#docScroll').scrollTop = 0;
  toast(`开始第 ${state.reviewCount} 次复习`);
}

async function updateCurrentArticleFocus() {
  const status = $('#vocabFocusStatus');
  if (!cur) return false;
  if (!hasEngineCredential()) {
    if (status) {
      status.textContent = '未配置模型 Key，无法更新词汇与精读解析；请到 AI 面板导入 CC Switch 或填写 Key';
      status.style.color = 'var(--danger)';
    }
    return false;
  }
  const articleId = cur.id;
  const base = baseArticleById(articleId);
  if (!base) {
    if (status) {
      status.textContent = '当前文章不存在，无法更新词汇与精读解析';
      status.style.color = 'var(--danger)';
    }
    return false;
  }
  const baselineVersion = articleBaselineVersion(base);
  const focusLabel = $('#setVocabFocus option:checked')?.textContent || S.settings.vocabFocus;
  const requestId = ++vocabFocusRequestId;
  vocabFocusController?.abort();
  const controller = new AbortController();
  vocabFocusController = controller;
  if (status) {
    status.textContent = `正在按“${focusLabel}”更新词汇与精读解析…`;
    status.style.color = 'var(--ink-3)';
  }
  try {
    const response = await fetch('/api/focus-refresh', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        ...(await modelRequestPayload()),
        paragraphs: base.paragraphs.map(paragraph => decodeHtmlText(paragraph.en)),
        title: base.title,
        vocabFocus: S.settings.vocabFocus
      })
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || '词汇与精读解析更新失败');
    if (requestId !== vocabFocusRequestId) return false;
    const currentBase = baseArticleById(articleId);
    if (!currentBase || articleBaselineVersion(currentBase) !== baselineVersion) {
      throw new Error('文章内容已变化，请重新切换词汇侧重');
    }
    const vocabulary = sanitizeVocabList(data.vocab);
    if (!vocabulary.length) throw new Error('模型未返回有效词汇，旧词汇保持不变');
    const analyses = sanitizeFocusedAnalyses(data.analyses, base.paragraphs.length);
    if (!analyses.length) throw new Error('模型未返回完整精读解析，旧词汇与旧解析保持不变');
    const { effective } = setVocabularyOverride(
      articleId,
      data.vocabFocus || S.settings.vocabFocus,
      vocabulary,
      analyses
    );
    for (const key of Object.keys(S.dictionaries)) {
      if (key.startsWith(articleId + ':')) delete S.dictionaries[key];
    }
    for (const key of [...dictionarySession.keys()]) {
      if (key.startsWith(articleId + ':')) dictionarySession.delete(key);
    }
    if (cur?.id === articleId) {
      cur = effective;
      curIdx = buildVocabIndex(cur);
    }
    save();
    renderDoc();
    renderSide();
    renderList();
    renderCards();
    renderKB();
    renderExport();
    renderStats();
    if (status) {
      status.textContent = `已按“${focusLabel}”更新 ${effective.vocab.length} 个词汇和 ${base.paragraphs.length} 段精读解析；译文、知识卡与标注未改动`;
      status.style.color = 'var(--teal)';
    }
    toast('已同步更新词汇与精读解析；原文、译文、知识卡和标注保持不变');
    return true;
  } catch (error) {
    if (error?.name === 'AbortError' || requestId !== vocabFocusRequestId) return false;
    if (status) {
      status.textContent = `词汇与精读解析更新失败：${error.message || error}`;
      status.style.color = 'var(--danger)';
    }
    toast(`词汇与精读解析更新失败：${error.message || error}`);
    return false;
  } finally {
    if (requestId === vocabFocusRequestId) vocabFocusController = null;
  }
}

/* ---- 文章列表 ---- */
function filteredArticles() {
  const q = filter.q.trim().toLowerCase();
  return ARTICLES.filter(a => {
    if (filter.topic !== 'all' && a.topic !== filter.topic) return false;
    if (filter.level !== 'all' && a.level !== filter.level) return false;
    if (filter.read === 'unread' && isStudied(a.id)) return false;
    if (filter.read === 'read' && !isStudied(a.id)) return false;
    if (q && ![a.title, a.deck, a.source, a.level, a.suggestedTag, (TOPICS.find(t => t.id === a.topic) || {}).name]
      .join(' ').toLowerCase().includes(q)) return false;
    return true;
  }).sort((a, b) => {
    const mode = S.settings.articleSort || 'date-desc';
    if (mode === 'date-asc') return String(a.date).localeCompare(String(b.date));
    if (mode === 'source-asc') return String(a.source).localeCompare(String(b.source), 'en') || String(b.date).localeCompare(String(a.date));
    if (mode === 'source-desc') return String(b.source).localeCompare(String(a.source), 'en') || String(b.date).localeCompare(String(a.date));
    return String(b.date).localeCompare(String(a.date));
  });
}

function updateArticleManageBar() {
  const customIds = new Set(filteredArticles().filter(article => isCustomArticle(article.id)).map(article => article.id));
  for (const id of articleSelection) {
    if (!customIds.has(id)) articleSelection.delete(id);
  }
  $('#articleManageBar').hidden = !articleManageMode;
  $('#btnManageArticles').textContent = articleManageMode ? '完成' : '管理';
  $('#btnDeleteArticles').disabled = articleSelection.size === 0;
  $('#articleManageStatus').textContent = `已选 ${articleSelection.size} 篇`;
}

function toggleArticleSelection(id) {
  if (!isCustomArticle(id)) return;
  if (articleSelection.has(id)) articleSelection.delete(id);
  else articleSelection.add(id);
  renderList();
}

function renderList() {
  const pool = filteredArticles();
  $('#mobileArticle').innerHTML = ARTICLES.map(a => `<option value="${a.id}">${esc(a.title)}</option>`).join('');
  if (cur) $('#mobileArticle').value = cur.id;
  const topicName = (id) => (TOPICS.find(t => t.id === id) || {}).name || '';
  $('#listCount').textContent = `${pool.length} 篇`;
  $('#articleSort').value = S.settings.articleSort || 'date-desc';
  $('#articleList').innerHTML = pool.map(a => {
    const read = S.read[a.id];
    const started = read && (read.done || (read.progress || 0) > 0);
    const lastSeen = read ? (read.lastActiveAt || read.ts) : 0;
    const learningStatus = read?.done ? '学习已完成' : '学习未完成';
    const learningStatusClass = read?.done ? 'is-done' : started ? 'is-progress' : 'is-pending';
    const custom = isCustomArticle(a.id);
    const selected = articleSelection.has(a.id);
    return `
    <div class="acard ${cur && cur.id === a.id ? 'on' : ''} ${selected ? 'manage-selected' : ''}"
         data-a="${a.id}" role="button" tabindex="0" aria-pressed="${selected}">
      ${articleManageMode ? `<div class="acard-select">
        ${custom
          ? `<label><input type="checkbox" data-select-a="${a.id}" ${selected ? 'checked' : ''}> 选择</label>`
          : '<span class="acard-lock">内置文章 · 只读</span>'}
      </div>` : ''}
      <div class="acard-top">
        <span class="src">${esc(a.source)}</span>
        <span class="lvl">${a.level}</span>
        <span>· ${topicName(a.topic)}</span>
        ${a.topic === 'other' && a.suggestedTag ? `<span class="acard-suggested">建议：${esc(a.suggestedTag)}</span>` : ''}
        ${isRead(a.id) ? '<span class="read-dot" title="已精读"></span>' : ''}
      </div>
      <div class="acard-title">${esc(a.title)}</div>
      <div class="acard-deck">${esc(a.deck)}</div>
      <div class="acard-meta"><span>${a.date}</span><span>${a.vocab.length} 词</span><span>${totalWords(a)} words</span></div>
      <div class="acard-learning-status ${learningStatusClass}">${learningStatus}${!read?.done && started ? ` · ${Math.max(1, read.progress || 1)}%` : ''}</div>
      ${started ? `<div class="acard-review">上次学习 ${new Date(lastSeen || Date.now()).toLocaleDateString('zh-CN')} · 进度 ${read.done ? 100 : read.progress || 0}% · 已复习 ${read.reviewCount || 0} 次 · 点击继续复习</div>` : ''}
    </div>`;
  }).join('') || '<div class="empty-tip">没有符合条件的文章<br>试试放宽筛选</div>';

  $('#articleList').onclick = (e) => {
    const b = e.target.closest('.acard');
    if (!b) return;
    if (e.target.closest('.acard-select')) return;
    if (articleManageMode) toggleArticleSelection(b.dataset.a);
    else openArticle(b.dataset.a);
  };
  $('#articleList').onchange = (e) => {
    const checkbox = e.target.closest('[data-select-a]');
    if (checkbox) toggleArticleSelection(checkbox.dataset.selectA);
  };
  $('#articleList').onkeydown = (e) => {
    if (articleManageMode || (e.key !== 'Enter' && e.key !== ' ')) return;
    if (e.target.closest('input, button, label')) return;
    const b = e.target.closest('.acard');
    if (!b) return;
    e.preventDefault();
    openArticle(b.dataset.a);
  };
  updateArticleManageBar();
}

function deleteSelectedArticles() {
  const ids = [...articleSelection].filter(isCustomArticle);
  if (!ids.length) return;
  if (!confirm(`删除 ${ids.length} 篇导入文章及其阅读记录、生词、标记和解析？此操作不可撤销。`)) return;
  const deletingCurrent = cur && ids.includes(cur.id);
  for (const id of ids) {
    clearVocabularyOverride(id);
    S.custom = (S.custom || []).filter(article => article.id !== id);
    const index = ARTICLES.findIndex(article => article.id === id);
    if (index >= 0) ARTICLES.splice(index, 1);
    delete S.read[id];
    delete S.marks[id];
    delete S.notes[id];
    delete S.summaries[id];
    delete S.tutor[id];
    delete S.vocabOverrides[id];
    Object.entries(S.knowledgeTutor || {}).forEach(([key, group]) => {
      if (group?.articleId === id) delete S.knowledgeTutor[key];
    });
    S.deletedArticleData = (S.deletedArticleData || []).filter(item => item.articleId !== id);
    for (const key of Object.keys(S.words)) {
      if (key.startsWith(id + ':')) delete S.words[key];
    }
    for (const key of Object.keys(S.dictionaries)) {
      if (key.startsWith(id + ':')) delete S.dictionaries[key];
    }
    for (const key of [...dictionarySession.keys()]) {
      if (key.startsWith(id + ':') || key.startsWith(`term:${id}:`)) dictionarySession.delete(key);
    }
    if (S.lastArticle === id) S.lastArticle = null;
  }
  articleSelection.clear();
  articleManageMode = false;
  save();
  renderStats();
  renderCards();
  renderKB();
  renderExport();
  if (deletingCurrent) {
    const next = filteredArticles()[0] || ARTICLES[0];
    if (next) openArticle(next.id);
    else {
      cur = null;
      $('#doc').innerHTML = '<div class="doc-empty">← 从左侧选择一篇文章开始</div>';
      renderList();
      renderSide();
    }
  } else {
    renderList();
  }
  toast(`已删除 ${ids.length} 篇文章`);
}

/* ---- 右栏 ---- */
function renderSide() {
  const body = $('#sideBody');
  const a = cur;
  if (!a) { body.innerHTML = ''; return; }
  body.oninput = null;
  $('#sideVocabN').textContent = a.vocab.length;
  $('#sideKnowN').textContent = a.knowledge.length;
  $('#sideAnalysisN').textContent = a.paragraphs.length;
  $('#sideNoteN').textContent = (S.marks[a.id] || []).length;
  const tutorHistory = S.tutor[a.id] || [];
  $('#sideTutorN').textContent = (S.summaries[a.id] ? 1 : 0) + tutorHistory.length;

  if (sideTab === 'vocab') {
    body.innerHTML = a.vocab.map(v => {
      const id = wordKey(a.id, v.w);
      const st = wordStateForId(id);
      const statusText = !st ? '未收录' : !isLearnedWordState(st) ? '未学习' : dueLabel(st.due);
      const statusClass = !st
        ? 'is-uncollected'
        : !isLearnedWordState(st)
          ? 'is-unlearned'
          : (st.due || 0) <= Date.now() ? 'is-due' : 'is-scheduled';
      const definition = S.dictionaries[id]?.senses?.[0]?.definition || v.en || '';
      return `<div class="vitem" data-v="${id}">
        <div class="vitem-top">
          <span class="vitem-w">${esc(v.w)}</span>
          <span class="vitem-ipa">${esc(v.ipa || '')}</span>
          <span class="vitem-pos">${esc(v.pos || '')}</span>
        </div>
        <div class="vitem-zh">${esc(v.zh)}</div>
        ${definition ? `<div class="vitem-def">${esc(definition)}</div>` : ''}
        <div class="vitem-bar">
          <button class="mini-btn" data-act="add" data-v="${id}">${st ? '已在生词本' : '+ 生词本'}</button>
          <button class="mini-btn" data-act="dict" data-v="${id}">词典</button>
          <button class="mini-btn" data-act="say" data-v="${id}">朗读</button>
          <span class="vitem-status ${statusClass}" title="状态由词汇库学习记录自动计算，不可手动修改">${esc(statusText)}</span>
        </div>
      </div>`;
    }).join('') || '<div class="empty-tip">本篇暂无生词标注</div>';
  }

  if (sideTab === 'know') {
    const grouped = ['finance', 'background', 'method'].map(category => {
      const items = a.knowledge.filter(k => knowledgeCategoriesFor(k).includes(category));
      if (!items.length) return '';
      return `<div class="side-knowledge-group">
        <h4>${esc(KNOWLEDGE_CATEGORIES[category])}</h4>
        ${items.map(k => `
          <div class="kcard" data-k="${k.id}">
            <div class="knowledge-meta-line">${knowledgeCategoryBadges(k)}<span class="knowledge-type-badge">${esc(knowledgeTypeLabel(k.cardType))}</span>${knowledgeVerificationBadge(k)}</div>
            <div class="kcard-term">${esc(k.term)} <em>${esc(k.en || '')}</em></div>
            <div class="kcard-one">${esc(k.one)}</div>
            <div class="kcard-body">${esc(k.body)}
              ${k.cases ? `<div class="kcard-cases"><b>案例</b>　${esc(k.cases)}</div>` : ''}
              ${k.related ? `<div class="kcard-rel">${k.related.map(r => `<span class="rel-tag">${esc(r)}</span>`).join('')}</div>` : ''}
              <div class="inline-actions">
                <button class="mini-btn" data-know-detail="${k.id}">详解与追问</button>
                <button class="mini-btn" data-revalidate-card="${esc(k.id)}" data-aid="${esc(a.id)}">核验分类</button>
              </div>
            </div>
          </div>`).join('')}
      </div>`;
    }).join('');
    body.innerHTML = grouped || '<div class="empty-tip">本篇暂无知识卡</div>';
  }

  if (sideTab === 'analysis') {
    body.innerHTML = a.paragraphs.map((p, i) => {
      const english = p.analysis?.english || {};
      const finance = p.analysis?.finance || {};
      const focus = p.analysis?.focus || {};
      const imported = (S.exportPicks?.analysis?.[a.id] || []).includes(i);
      return `<div class="analysis-card" data-analysis-i="${i}">
        <div class="analysis-head">
          <div class="analysis-head-main">
            <span class="analysis-index">第 ${String(i + 1).padStart(2, '0')} 段</span>
            <span class="analysis-card-title">原文解析</span>
          </div>
          <button class="mini-btn analysis-import ${imported ? 'on' : ''}" data-import-analysis="${i}" type="button">${imported ? '已加入讲义' : '加入讲义'}</button>
        </div>
        <div class="analysis-block analysis-english" data-analysis-kind="english">
          <b>英语层</b>
          ${english.longSentence ? `<p class="analysis-item"><span class="analysis-item-label">长难句</span><span class="analysis-item-text">${esc(english.longSentence)}</span></p>` : ''}
          ${english.grammar ? `<p class="analysis-item"><span class="analysis-item-label">语法逻辑</span><span class="analysis-item-text">${esc(english.grammar)}</span></p>` : ''}
          ${english.expression ? `<p class="analysis-item"><span class="analysis-item-label">表达</span><span class="analysis-item-text">${esc(english.expression)}</span></p>` : ''}
          ${!english.longSentence && !english.grammar && !english.expression && p.note ? `<p class="analysis-item"><span class="analysis-item-label">难点</span><span class="analysis-item-text">${esc(p.note)}</span></p>` : ''}
          ${!english.longSentence && !english.grammar && !english.expression && !p.note ? '<p class="analysis-empty">暂无英语层解析</p>' : ''}
        </div>
        ${(focus.label || focus.guidance || (focus.recommendations || []).length) ? `
        <div class="analysis-block analysis-focus" data-analysis-kind="focus">
          <b><span class="analysis-focus-label">${esc(focus.label || '学习侧重')}</span></b>
          ${focus.guidance ? `<p class="analysis-item"><span class="analysis-item-label">重点</span><span class="analysis-item-text">${esc(focus.guidance)}</span></p>` : ''}
          ${(focus.recommendations || []).length ? `<div class="analysis-recommendation-row">
            <span class="analysis-item-label">推荐表达</span>
            <div class="analysis-recommendations">${focus.recommendations.map(item =>
              `<span>${esc(item)}</span>`).join('')}</div>
          </div>` : ''}
        </div>` : ''}
        <div class="analysis-block analysis-finance" data-analysis-kind="finance">
          <b>金融层</b>
          ${finance.term ? `<p class="analysis-item"><span class="analysis-item-label">术语</span><span class="analysis-item-text">${esc(finance.term)}</span></p>` : ''}
          ${finance.background ? `<p class="analysis-item"><span class="analysis-item-label">背景机制</span><span class="analysis-item-text">${esc(finance.background)}</span></p>` : ''}
          ${finance.relevance ? `<p class="analysis-item"><span class="analysis-item-label">文章关联</span><span class="analysis-item-text">${esc(finance.relevance)}</span></p>` : ''}
          ${!finance.term && !finance.background && !finance.relevance ? '<p class="analysis-item"><span class="analysis-item-label">提示</span><span class="analysis-item-text">在线标注后可生成金融背景与机制分析。</span></p>' : ''}
        </div>
      </div>`;
    }).join('') || '<div class="empty-tip">本篇暂无解析</div>';
  }

  if (sideTab === 'notes') {
    const list = S.marks[a.id] || [];
    body.innerHTML = list.map(m => `
      <div class="mark-item" data-mark-id="${esc(m.id)}" data-mark-type="${esc(m.type || 'paragraph')}">
        <div class="mark-head">
          <span class="mark-kind">${m.type === 'sentence' ? '句子' : '段落'}</span>
          <button class="mark-remove" data-remove-mark="${esc(m.id)}" title="删除标注">×</button>
        </div>
        <p class="mark-quote">${esc(m.text)}</p>
        <button class="mark-jump" data-jump-mark="${esc(m.id)}">第 ${m.i + 1} 段 · 回跳</button>
        <textarea class="mark-note" data-mark-note="${esc(m.id)}" rows="2" placeholder="写下你的笔记…">${esc(m.note || '')}</textarea>
      </div>`).join('') || '<div class="empty-tip">还没有标注<br>收藏整段，或在正文中选中文字添加句子标注</div>';
    body.oninput = (event) => {
      const note = event.target.closest('[data-mark-note]');
      if (!note) return;
      const mark = list.find(item => item.id === note.dataset.markNote);
      if (!mark) return;
      mark.note = note.value;
      save();
    };
    body.querySelectorAll('.mark-item').forEach(el => {
      el.addEventListener('click', event => {
        if (event.target.closest('textarea, button')) return;
        jumpToUserMark(el.dataset.markId);
      });
    });
  }

  if (sideTab === 'tutor') {
    const summary = S.summaries[a.id];
    const tutorHistoryOpen = expandedInlineAIHistory.has(`article:${a.id}`);
    body.innerHTML = `
      <div class="tutor-intro">
        <h4>全文脉络</h4>
        ${summary ? `
          <div class="tutor-summary">
            <p>${esc(summary.overview)}</p>
            ${(summary.sections || []).map(s => `<div class="tutor-sec"><b>${esc(s.heading)}</b><span>${esc(s.summary)}</span></div>`).join('')}
            ${(summary.takeaways || []).length ? `<ul>${summary.takeaways.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
            ${(summary.terms || []).length ? `<div class="tutor-terms">${summary.terms.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
          </div>` : '<p class="hint">按章节提炼文章结构，并保留关键术语。</p>'}
        <button class="btn tiny" id="btnGenerateSummary">${summary ? '重新生成总结' : '生成结构化总结'}</button>
        <p class="test-out" id="tutorStatus">${summary ? '总结已保存到本机' : '需要配置在线 LLM'}</p>
      </div>
      <div class="tutor-ask">
        <textarea id="tutorQuestion" rows="2" placeholder="基于文章提问，例如：期限溢价上升的原因是什么？"></textarea>
        <button class="mini-btn" id="btnTutorAsk">基于文章提问</button>
      </div>
      <button class="mini-btn wide tutor-history-toggle" id="btnTutorHistory">${tutorHistoryOpen ? '收起文章问答历史' : `查看该文章问答历史 ${tutorHistory.length || ''}`}</button>
      ${tutorHistoryOpen ? inlineAIHistoryHtml(
        tutorHistory,
        '文章问答历史',
        'tutorInlineHistory',
        'btnTutorHistoryManage'
      ) : ''}`;
  }

  body.onclick = (e) => {
    if (e.target.id === 'btnTutorHistory') {
      e.stopPropagation();
      const key = `article:${a.id}`;
      if (expandedInlineAIHistory.has(key)) expandedInlineAIHistory.delete(key);
      else expandedInlineAIHistory.add(key);
      renderSide();
      return;
    }
    if (e.target.id === 'btnTutorHistoryManage') {
      e.stopPropagation();
      openAIDataManager({ articleId: a.id });
      return;
    }
    const importAnalysisButton = e.target.closest('[data-import-analysis]');
    if (importAnalysisButton) {
      e.stopPropagation();
      toggleAnalysisImport(a.id, Number(importAnalysisButton.dataset.importAnalysis));
      return;
    }
    const removeMarkButton = e.target.closest('[data-remove-mark]');
    if (removeMarkButton) {
      e.stopPropagation();
      removeUserMark(removeMarkButton.dataset.removeMark);
      return;
    }
    const jumpMarkButton = e.target.closest('[data-jump-mark]');
    if (jumpMarkButton) {
      e.stopPropagation();
      jumpToUserMark(jumpMarkButton.dataset.jumpMark);
      return;
    }
    const knowledgeDetail = e.target.closest('[data-know-detail]');
    if (knowledgeDetail) {
      e.stopPropagation();
      openKnowledgeDetail(knowledgeDetail.dataset.knowDetail);
      return;
    }
    if (e.target.id === 'btnGenerateSummary') {
      e.stopPropagation();
      generateTutorSummary();
      return;
    }
    if (e.target.id === 'btnTutorAsk') {
      e.stopPropagation();
      askTutor();
      return;
    }
    const revalidateCardButton = e.target.closest('[data-revalidate-card]');
    if (revalidateCardButton) {
      e.stopPropagation();
      openCategoryRevalidation({
        articleId: revalidateCardButton.dataset.aid || a.id,
        cardId: revalidateCardButton.dataset.revalidateCard
      });
      return;
    }
    const btn = e.target.closest('.mini-btn');
    if (btn) {
      e.stopPropagation();
      const id = btn.dataset.v;
      const item = a.vocab.find(v => wordKey(a.id, v.w) === id);
      if (btn.dataset.act === 'say') speak(item.w);
      if (btn.dataset.act === 'dict') showWordById(id, btn);
      if (btn.dataset.act === 'add') { ensureWord(id); toast('已加入生词本'); renderSide(); }
      return;
    }
    const kc = e.target.closest('.kcard');
    if (kc) kc.classList.toggle('open');
    const ac = e.target.closest('.analysis-card');
    if (ac) {
      const p = $(`.para[data-i="${ac.dataset.analysisI}"]`);
      if (p) {
        p.scrollIntoView({ block: 'center' });
        p.animate([{ background: '#f2dfda' }, { background: 'transparent' }], { duration: 1100 });
      }
    }
    const vi = e.target.closest('.vitem');
    if (vi) showWordPop(vi);
  };
}

function toggleAnalysisImport(articleId, paragraphIndex) {
  if (!S.exportPicks || typeof S.exportPicks !== 'object') {
    S.exportPicks = { articleIds: [], analysis: {} };
  }
  const selected = new Set(S.exportPicks.analysis[articleId] || []);
  if (selected.has(paragraphIndex)) selected.delete(paragraphIndex);
  else {
    selected.add(paragraphIndex);
    if (!S.exportPicks.articleIds.includes(articleId)) S.exportPicks.articleIds.push(articleId);
  }
  if (selected.size) S.exportPicks.analysis[articleId] = [...selected].sort((a, b) => a - b);
  else delete S.exportPicks.analysis[articleId];
  save();
  renderSide();
  renderExport();
  toast(selected.has(paragraphIndex) ? '已加入精读讲义' : '已从精读讲义移除');
}

async function generateTutorSummary() {
  if (!cur) return;
  const status = $('#tutorStatus');
  if (status) status.textContent = '正在生成全文总结…';
  try {
    const resp = await fetch('/api/summary', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...(await modelRequestPayload()),
        title: cur.title,
        deck: cur.deck,
        paragraphs: cur.paragraphs.map(p => p.en.replace(/\{\{|\}\}/g, '')),
        model: S.settings.model
      })
    });
    const data = await resp.json();
    if (!data.ok) throw new Error(data.error || '总结生成失败');
    S.summaries[cur.id] = data.summary;
    save();
    renderSide();
  } catch (e) {
    if (status) {
      status.textContent = e.message || '总结生成失败';
      status.style.color = 'var(--danger)';
    }
  }
}

async function askTutor() {
  if (!cur) return;
  const input = $('#tutorQuestion');
  const status = $('#tutorStatus');
  const question = input ? input.value.trim() : '';
  if (!question) {
    if (status) status.textContent = '请先输入问题';
    return;
  }
  if (status) status.textContent = '正在根据原文回答…';
  try {
    const resp = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...(await modelRequestPayload()),
        title: cur.title,
        question,
        paragraphs: cur.paragraphs.map(p => p.en.replace(/\{\{|\}\}/g, '')),
        summary: S.summaries[cur.id] || null,
        knowledge: cur.knowledge
      })
    });
    const data = await resp.json();
    if (!data.ok) throw new Error(data.error || '回答失败');
    S.tutor[cur.id] = S.tutor[cur.id] || [];
    S.tutor[cur.id].push({
      id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      q: question,
      a: data.result.answer,
      originalEvidence: data.result.originalEvidence || data.result.evidence || [],
      knowledgeBasis: data.result.knowledgeBasis || [],
      authorityBasis: data.result.authorityBasis || [],
      caution: data.result.caution || '',
      createdAt: Date.now()
    });
    expandedInlineAIHistory.add(`article:${cur.id}`);
    save();
    renderSide();
    const body = $('#sideBody');
    if (body) body.scrollTop = body.scrollHeight;
  } catch (e) {
    if (status) {
      status.textContent = e.message || '回答失败';
      status.style.color = 'var(--danger)';
    }
  }
}

/* ---- 释义浮层 ---- */
function hidePop() {
  selectionLookupRequestId++;
  $('#popover').hidden = true;
}

function placePop(x, y) {
  const p = $('#popover');
  p.hidden = false;
  const r = p.getBoundingClientRect();
  let left = Math.min(x + 12, window.innerWidth - r.width - 14);
  let top = y + 16;
  if (top + r.height > window.innerHeight - 12) top = Math.max(12, y - r.height - 14);
  p.style.left = Math.max(12, left) + 'px';
  p.style.top = top + 'px';
}

function showWordById(id, anchor) {
  const proxy = {
    dataset: { v: id },
    closest: () => null,
    getBoundingClientRect: () => anchor.getBoundingClientRect()
  };
  showWordPop(proxy);
}

function showWordPop(el) {
  const id = el.dataset.v;
  const [aid, word] = id.split(':');
  const a = ARTICLES.find(x => x.id === aid);
  const v = a && a.vocab.find(x => x.w === word);
  if (!v) return;
  const st = wordStateForId(id);
  // 若该词同时是金融术语，浮层内直达知识卡
  const km = el.closest('.kmark');
  const kid = km && km.dataset.k;
  const detailed = S.settings.vocabDetail !== 'brief';
  const sentence = a.paragraphs.find(p => new RegExp(`\\b${escRe(v.w)}\\b`, 'i').test(p.en))?.en.replace(/\{\{|\}\}/g, '') || '';
  const dictionary = dictionarySession.get(id) || S.dictionaries[id];
  const formChanges = detailed ? vocabularyFormChanges(v, dictionary) : [];
  const p = $('#popover');
  p.innerHTML = `
    <div class="pop-word">${esc(v.w)} <span>${esc(v.ipa || '')} ${esc(v.pos || '')}</span></div>
    <div class="pop-zh">${esc(v.zh)}</div>
    <div class="pop-context"><b>当前语境</b>${esc(dictionary?.contextualMeaning || sentence || `本文中按“${v.zh}”理解。`)}</div>
    ${dictionary ? `<div class="dict-sources">
      ${dictionary.sources?.ecdict ? '<span class="dict-ecdict-source">ECDICT 离线</span>' : ''}
      ${dictionary.authority ? '<span class="dict-authority">Merriam-Webster Learner’s 权威</span>' : ''}
      ${dictionary.sources?.model ? '<span class="dict-model-source">模型语境</span>' : ''}
    </div>` : ''}
    ${detailed && v.en ? `<div class="pop-en">${esc(v.en)}</div>` : ''}
    ${detailed && v.synonyms && v.synonyms.length ? `<div class="pop-syn">近义表达：${v.synonyms.map(esc).join(' / ')}</div>` : ''}
    ${formChanges.length ? `<div class="pop-form"><b>词形转换</b>${formChanges.map(change =>
      `<span><i>${esc(change.label)}</i>${esc(change.value)}</span>`).join('')}</div>` : ''}
    ${detailed && v.exam && v.exam.length ? `<div class="pop-exam">${v.exam.map(esc).join(' · ')}</div>` : ''}
    ${detailed && v.ex ? `<div class="pop-ex">${esc(v.ex)}<br>${esc(v.exZh || '')}</div>` : ''}
    ${dictionary ? `
      <div class="dict-detail">
        ${(dictionary.senses || []).map(s => `<div class="dict-sense"><b>${esc(s.pos || '')} ${esc(s.zh || '')}</b><span>${esc(s.definition || '')}</span>${s.example ? `<em>${esc(s.example)}</em>` : ''}</div>`).join('')}
        ${(dictionary.collocations || []).length ? `<div class="dict-colloc">搭配：${dictionary.collocations.map(esc).join(' / ')}</div>` : ''}
        ${dictionary.usageNote ? `<div class="dict-note">${esc(dictionary.usageNote)}</div>` : ''}
      </div>` : ''}
    ${dictionary?.authority ? `
      <div class="dict-authority-detail">
        <b>Merriam-Webster Learner’s 权威释义</b>
        ${(dictionary.authority.definitions || []).map(definition => `<div>${esc(definition)}</div>`).join('')}
        ${(dictionary.authority.examples || []).length ? `<em>${esc(dictionary.authority.examples[0])}</em>` : ''}
      </div>` : ''}
    ${dictionary?.authorityError ? `<div class="dict-note">韦氏权威词典暂不可用：${esc(dictionary.authorityError)}</div>` : ''}
    <div class="pop-foot">
      <button data-p="say">🔊 朗读</button>
      <button data-p="add">${st ? '已在生词本' : '+ 生词本'}</button>
      <button data-p="dict">${dictionary ? '刷新词典详解' : '是否查看词典详解？'}</button>
      ${!detailed && (v.en || v.ex || (v.synonyms && v.synonyms.length) || (v.exam && v.exam.length)) ? '<button data-p="detail">展开详解</button>' : ''}
      ${kid ? `<button data-p="know">金融知识卡</button>` : ''}
      <button data-p="cards">去复习</button>
    </div>`;
  const r = el.getBoundingClientRect();
  placePop(r.left, r.bottom);
  p.onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    e.stopPropagation();
    if (b.dataset.p === 'say') speak(v.w);
    if (b.dataset.p === 'add') { ensureWord(id); showWordPop(el); toast('已加入生词本'); }
    if (b.dataset.p === 'dict') lookupDictionary(id, sentence, v, el);
    if (b.dataset.p === 'detail') { S.settings.vocabDetail = 'detail'; save(); showWordPop(el); }
    if (b.dataset.p === 'know') openKnowCard(kid);
    if (b.dataset.p === 'cards') {
      S.settings.deck = 'all';
      S.settings.vocabFilter = 'all';
      save();
      hidePop();
      switchView('cards');
    }
  };
}

async function lookupDictionary(id, sentence, vocab, el) {
  const pop = $('#popover');
  pop.insertAdjacentHTML('beforeend', '<div class="dict-loading" id="dictLoading">正在结合当前语境查询词典…</div>');
  try {
    const fullResult = await fetchDictionaryResult(vocab.w, sentence, vocab.zh);
    dictionarySession.set(id, fullResult);
    const persisted = JSON.parse(JSON.stringify(fullResult));
    delete persisted.authority;
    delete persisted.authorityError;
    if (persisted.sources) persisted.sources.authority = false;
    S.dictionaries[id] = persisted;
    save();
    showWordPop(el);
  } catch (error) {
    const loading = $('#dictLoading');
    if (loading) {
      loading.textContent = error.message || '词典查询失败';
      loading.classList.add('is-error');
    }
  }
}

async function fetchDictionaryResult(word, sentence, contextMeaning = '') {
  const response = await fetch('/api/dictionary', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      ...(await modelRequestPayload()),
      word,
      sentence,
      contextMeaning,
      title: cur?.title || '',
      mwApiKey: S.settings.mwApiKey
    })
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(response.ok ? '词典返回格式无效' : `词典查询失败（HTTP ${response.status}）`);
  }
  if (!response.ok || !data.ok) throw new Error(data.error || '词典查询失败');
  return data.result;
}

async function lookupSelectedWord(event) {
  event?.preventDefault();
  event?.stopPropagation();
  const selected = pendingTextSelection;
  const word = selected?.lookupWord;
  if (!word || !selected) return;
  const requestId = ++selectionLookupRequestId;
  const sentence = selected.sentence;
  const anchor = { ...selected.rect };
  const vocab = (cur?.vocab || []).find(item =>
    String(item.w || '').toLocaleLowerCase('en-US') === word.toLocaleLowerCase('en-US'));
  hideSelectionAction();
  showSelectionDictionaryPop(word, sentence, anchor, null, true);
  try {
    const result = await fetchDictionaryResult(word, sentence, vocab?.zh || '');
    if (requestId !== selectionLookupRequestId) return;
    showSelectionDictionaryPop(word, sentence, anchor, result);
  } catch (error) {
    if (requestId !== selectionLookupRequestId) return;
    showSelectionDictionaryPop(word, sentence, anchor, null, false, error.message || '词典查询失败');
  }
}

function showSelectionDictionaryPop(word, sentence, anchor, dictionary = null, loading = false, error = '') {
  const p = $('#popover');
  const phonetic = dictionary?.ecdict?.phonetic || '';
  const senses = dictionary?.senses || [];
  p.innerHTML = `
    <div class="pop-word">${esc(dictionary?.word || word)} <span>${esc(phonetic)}</span></div>
    <div class="pop-context">
      <b>当前语境</b>${esc(dictionary?.contextualMeaning || (loading ? '正在结合所选句子判断词义。' : '未找到语境释义。'))}
      ${sentence ? `<small>${esc(sentence)}</small>` : ''}
    </div>
    ${dictionary ? `<div class="dict-sources">
      ${dictionary.sources?.ecdict ? '<span class="dict-ecdict-source">ECDICT 离线</span>' : ''}
      ${dictionary.authority ? '<span class="dict-authority">Merriam-Webster Learner’s 权威</span>' : ''}
      ${dictionary.sources?.model ? '<span class="dict-model-source">模型语境</span>' : ''}
    </div>` : ''}
    ${senses.length ? `<div class="dict-detail">
      ${senses.map(sense => `<div class="dict-sense">
        <b>${esc(sense.pos || '')} ${esc(sense.zh || '')}</b>
        ${sense.definition ? `<span>${esc(sense.definition)}</span>` : ''}
        ${sense.example ? `<em>${esc(sense.example)}</em>` : ''}
      </div>`).join('')}
      ${(dictionary.collocations || []).length ? `<div class="dict-colloc">搭配：${dictionary.collocations.map(esc).join(' / ')}</div>` : ''}
      ${dictionary.usageNote ? `<div class="dict-note">${esc(dictionary.usageNote)}</div>` : ''}
    </div>` : ''}
    ${dictionary?.authority ? `<div class="dict-authority-detail">
      <b>Merriam-Webster Learner’s 权威释义</b>
      ${(dictionary.authority.definitions || []).map(definition => `<div>${esc(definition)}</div>`).join('')}
      ${(dictionary.authority.examples || []).length ? `<em>${esc(dictionary.authority.examples[0])}</em>` : ''}
    </div>` : ''}
    ${dictionary?.authorityError ? `<div class="dict-note">韦氏权威词典暂不可用：${esc(dictionary.authorityError)}</div>` : ''}
    ${loading ? '<div class="dict-loading">正在查询 ECDICT 与在线词典…</div>' : ''}
    ${error ? `<div class="dict-loading is-error">${esc(error)}</div>` : ''}
    <div class="pop-foot">
      <button data-p="selection-say">朗读</button>
      <button data-p="selection-copy">复制单词</button>
    </div>`;
  placePop(anchor.left, anchor.bottom);
  p.onclick = (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    event.stopPropagation();
    if (button.dataset.p === 'selection-say') speak(dictionary?.word || word);
    if (button.dataset.p === 'selection-copy') {
      navigator.clipboard?.writeText(dictionary?.word || word);
      toast('单词已复制');
    }
  };
}

function openKnowCard(kid) {
  sideTab = 'know';
  $$('#sideTabs button').forEach(x => x.classList.toggle('on', x.dataset.tab === 'know'));
  renderSide();
  const card = $(`.kcard[data-k="${kid}"]`);
  if (card) { card.classList.add('open'); card.scrollIntoView({ block: 'center' }); }
  hidePop();
}

function showKnowPop(el) {
  const k = cur.knowledge.find(x => x.id === el.dataset.k);
  const p = $('#popover');
  if (!k) {
    const nestedWord = el.querySelector('.w');
    if (nestedWord) return showWordPop(nestedWord);
    const term = String(el.dataset.term || el.textContent || '').trim();
    const cacheKey = `term:${cur?.id || 'unknown'}:${term.toLowerCase()}`;
    return showTermFallbackPop(el, dictionarySession.get(cacheKey));
  }
  p.innerHTML = `
    <div class="pop-word" style="font-size:13.5px">${esc(k.term)} <span>${esc(k.en || '')}</span></div>
    <div class="pop-en">${esc(k.one)}</div>
    <div class="pop-ex">${esc(k.body.slice(0, 150))}${k.body.length > 150 ? '…' : ''}</div>
    <div class="pop-foot"><button data-p="more">展开完整知识卡</button></div>`;
  const r = el.getBoundingClientRect();
  placePop(r.left, r.bottom);
  p.onclick = (e) => {
    if (e.target.closest('button')) openKnowCard(k.id);
  };
}

function showTermFallbackPop(el, dictionary = null, loading = false, error = '') {
  const term = String(el.dataset.term || el.textContent || '').trim();
  const sentence = cur?.paragraphs
    .map(paragraph => paragraph.en.replace(/\{\{|\}\}/g, ''))
    .find(text => text.toLowerCase().includes(term.toLowerCase())) || '';
  const p = $('#popover');
  p.innerHTML = `
    <div class="pop-word">${esc(term)}</div>
    <div class="pop-context"><b>术语</b>当前文章暂未生成与这个短语关联的知识卡。</div>
    ${dictionary ? `
      <div class="dict-sources">
        ${dictionary.sources?.ecdict ? '<span class="dict-ecdict-source">ECDICT 离线</span>' : ''}
        ${dictionary.authority ? '<span class="dict-authority">Merriam-Webster Learner’s 权威</span>' : ''}
        ${dictionary.sources?.model ? '<span class="dict-model-source">模型语境</span>' : ''}
      </div>
      <div class="dict-detail">
        ${(dictionary.senses || []).map(sense => `<div class="dict-sense"><b>${esc(sense.pos || '')} ${esc(sense.zh || '')}</b><span>${esc(sense.definition || '')}</span></div>`).join('')}
        ${(dictionary.collocations || []).length ? `<div class="dict-colloc">搭配：${dictionary.collocations.map(esc).join(' / ')}</div>` : ''}
        ${dictionary.usageNote ? `<div class="dict-note">${esc(dictionary.usageNote)}</div>` : ''}
      </div>
      ${dictionary.authority ? `<div class="dict-authority-detail">
        <b>Merriam-Webster Learner’s 权威释义</b>
        ${(dictionary.authority.definitions || []).map(definition => `<div>${esc(definition)}</div>`).join('')}
      </div>` : ''}
    ` : ''}
    ${loading ? '<div class="dict-loading">正在查询 ECDICT 与在线词典…</div>' : ''}
    ${error ? `<div class="dict-loading is-error">${esc(error)}</div>` : ''}
    <div class="pop-foot">
      <button data-p="term-dict">${dictionary ? '刷新词典查询' : '查词典解析'}</button>
      <button data-p="copy-term">复制术语</button>
    </div>`;
  const r = el.getBoundingClientRect();
  placePop(r.left, r.bottom);
  p.onclick = async (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    event.stopPropagation();
    if (button.dataset.p === 'copy-term') {
      navigator.clipboard?.writeText(term);
      toast('术语已复制');
    }
    if (button.dataset.p === 'term-dict') {
      await lookupTermDictionary(el, term, sentence);
    }
  };
}

async function lookupTermDictionary(el, term, sentence) {
  showTermFallbackPop(el, null, true);
  const cacheKey = `term:${cur?.id || 'unknown'}:${term.toLowerCase()}`;
  try {
    const response = await fetch('/api/dictionary', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...(await modelRequestPayload()),
        word: term,
        sentence,
        contextMeaning: '',
        title: cur?.title || '',
        mwApiKey: S.settings.mwApiKey
      })
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || '词典查询失败');
    dictionarySession.set(cacheKey, data.result);
    showTermFallbackPop(el, data.result);
  } catch (error) {
    showTermFallbackPop(el, null, false, error.message || '词典查询失败');
  }
}

/* ---- 朗读 ---- */
function stopSpeech() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  const audio = $('#ttsAudio');
  if (audio) {
    audio.pause();
    audio.hidden = true;
  }
  if (currentAudioUrl) {
    URL.revokeObjectURL(currentAudioUrl);
    currentAudioUrl = null;
  }
  $('#btnTts')?.classList.remove('is-playing');
}

function browserVoice() {
  const voices = window.speechSynthesis?.getVoices?.().filter(v => /^en[-_]/i.test(v.lang)) || [];
  return voices.find(v => /Natural|Samantha|Google US English|Microsoft.*English/i.test(v.name)) || voices[0] || null;
}

function speakWithBrowser(text) {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) return reject(new Error('当前浏览器不支持语音朗读'));
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      const voice = browserVoice();
      if (!voice) return reject(new Error('当前浏览器没有可用英语语音，请在引擎设置中启用在线语音'));
      const utterance = new SpeechSynthesisUtterance(String(text).replace(/\{\{|\}\}/g, ''));
      utterance.lang = 'en-US';
      utterance.rate = 0.92;
      utterance.voice = voice;
      utterance.onstart = () => $('#btnTts')?.classList.add('is-playing');
      utterance.onend = () => {
        $('#btnTts')?.classList.remove('is-playing');
        resolve();
      };
      utterance.onerror = event => {
        $('#btnTts')?.classList.remove('is-playing');
        reject(new Error(event.error || '浏览器语音播放失败'));
      };
      window.speechSynthesis.speak(utterance);
    };
    if (window.speechSynthesis.getVoices().length) start();
    else {
      const onVoices = () => {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
        start();
      };
      window.speechSynthesis.addEventListener?.('voiceschanged', onVoices, { once: true });
      setTimeout(onVoices, 1200);
    }
  });
}

async function speakWithServer(text) {
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      ...(await modelRequestPayload({
        model: S.settings.ttsModel,
        voice: S.settings.ttsVoice,
        engine: S.settings.ttsEngine
      })),
      text,
    })
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || '在线语音生成失败');
  }
  const blob = await response.blob();
  const audio = $('#ttsAudio');
  if (!audio) throw new Error('当前页面没有音频播放器');
  if (currentAudioUrl) URL.revokeObjectURL(currentAudioUrl);
  currentAudioUrl = URL.createObjectURL(blob);
  audio.src = currentAudioUrl;
  audio.hidden = false;
  audio.onplay = () => $('#btnTts')?.classList.add('is-playing');
  audio.onended = () => {
    $('#btnTts')?.classList.remove('is-playing');
    if (currentAudioUrl) URL.revokeObjectURL(currentAudioUrl);
    currentAudioUrl = null;
  };
  await audio.play();
  await new Promise(resolve => {
    const done = () => {
      audio.removeEventListener('ended', done);
      audio.removeEventListener('error', done);
      resolve();
    };
    audio.addEventListener('ended', done);
    audio.addEventListener('error', done);
  });
}

async function speak(text) {
  stopSpeech();
  const clean = String(text || '').replace(/\{\{|\}\}/g, '');
  if (!clean.trim()) return;
  const engine = S.settings.ttsEngine || 'edge';
  const useBrowser = () => speakWithBrowser(clean);
  const useServer = () => speakWithServer(clean);
  try {
    if (engine === 'browser') await useBrowser();
    else await useServer();
  } catch (primaryError) {
    try {
      if (engine === 'browser') await useServer();
      else await useBrowser();
    } catch (fallbackError) {
      return toast(fallbackError.message || primaryError.message || '朗读失败');
    }
  }
}

function playArticleSpeech() {
  if (!cur) return;
  if (window.speechSynthesis?.speaking || window.speechSynthesis?.pending || currentAudioUrl) {
    stopSpeech();
    toast('已停止朗读');
    return;
  }
  speak(cur.paragraphs.map(p => p.en).join(' '));
}

/* ================= 生词本 / SRS ================= */
const SRS_DAYS = [0, 1, 3, 7, 16, 35];
function fuzzyReviewDays(box) {
  const currentDays = SRS_DAYS[Math.max(1, Math.min(5, Number(box) || 1))] || 1;
  return Math.max(1, Math.round(currentDays / 2));
}

function reviewIntervalLabel(score, box) {
  if (score === 0) return '10 分钟后';
  if (score === 1) return `${fuzzyReviewDays(box)} 天后`;
  return `${SRS_DAYS[Math.min(5, (Number(box) || 0) + 1)]} 天后`;
}

function isLearnedWordState(state) {
  return Boolean(state && (
    state.reviewEligible ||
    state.learnedAt ||
    state.lastReviewedAt ||
    (state.right || 0) + (state.wrong || 0) > 0
  ));
}

function ensureWord(id) {
  if (!S.words[id]) {
    const key = normalizeVocabularyWord(wordMeta(id).v?.w);
    const existingId = activeWordIds().find(candidate => {
      if (candidate === id) return false;
      return normalizeVocabularyWord(wordMeta(candidate).v?.w) === key;
    });
    S.words[id] = existingId
      ? { ...S.words[existingId], added: Date.now(), seen: Math.max(1, S.words[existingId].seen || 0) }
      : {
          box: 0, due: 0, right: 0, wrong: 0, seen: 1,
          added: Date.now(), learnedAt: 0, reviewEligible: false
        };
    resetCardRuntime();
    save();
  }
  renderStats();
}
function rateWord(id, score) {
  if (!S.words[id]) ensureWord2(id);
  const relatedIds = relatedWordIds(id);
  const w = { ...aggregateWordStates(relatedIds.map(candidate => S.words[candidate])) };
  w.learnedAt = w.learnedAt || Date.now();
  w.reviewEligible = true;
  w.seen = (w.seen || 0) + 1;
  w.lastReviewedAt = Date.now();
  w.lastScore = score;
  if (score === 0) { w.box = 0; w.wrong++; w.due = Date.now() + 10 * 60000; }
  if (score === 1) {
    const intervalDays = fuzzyReviewDays(w.box);
    w.box = Math.max(1, w.box);
    w.right++;
    w.due = Date.now() + intervalDays * DAY_MS;
  }
  if (score === 2) { w.box = Math.min(5, w.box + 1); w.right++; w.due = Date.now() + SRS_DAYS[w.box] * DAY_MS; }
  for (const candidate of relatedIds) {
    S.words[candidate] = { ...S.words[candidate], ...w, added: S.words[candidate].added || Date.now() };
  }
  S.today.words += 1;
  touchDay();
  save();
  renderStats();
  renderGoal();
  renderSide();
}
function ensureWord2(id) {
  S.words[id] = {
    box: 0, due: 0, right: 0, wrong: 0, seen: 0,
    added: Date.now(), learnedAt: 0, reviewEligible: false
  };
  return S.words[id];
}
function dueLabel(ts) {
  const d = ts - Date.now();
  if (d <= 0) return '待复习';
  if (d < 3600000) return `${Math.ceil(d / 60000)} 分钟后`;
  if (d < DAY_MS) return `${Math.ceil(d / 3600000)} 小时后`;
  return `${Math.ceil(d / DAY_MS)} 天后`;
}
function wordMeta(id) {
  const [aid, w] = id.split(':');
  const a = ARTICLES.find(x => x.id === aid);
  return { a, v: a ? a.vocab.find(x => x.w === w) : null };
}

/* ================= 视图 2：闪卡 ================= */
function activeWordIds() {
  return Object.keys(S.words).filter(id => Boolean(wordMeta(id).v));
}

function normalizeVocabularyWord(word) {
  return decodeHtmlText(word || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function relatedWordIds(id) {
  const meta = wordMeta(id);
  const key = normalizeVocabularyWord(meta.v?.w || id.split(':').slice(1).join(':'));
  if (!key) return [id];
  return activeWordIds().filter(candidate => {
    const candidateWord = wordMeta(candidate).v?.w || candidate.split(':').slice(1).join(':');
    return normalizeVocabularyWord(candidateWord) === key;
  });
}

function aggregateWordStates(states) {
  const values = (states || []).filter(Boolean);
  if (!values.length) return { box: 0, due: 0, right: 0, wrong: 0, seen: 0 };
  const learned = values.filter(isLearnedWordState);
  if (!learned.length) {
    return { ...values[0], reviewEligible: false, learnedAt: 0, due: 0 };
  }
  const latest = learned.slice().sort((a, b) => {
    const reviewDiff = (b.lastReviewedAt || 0) - (a.lastReviewedAt || 0);
    return reviewDiff || (b.box || 0) - (a.box || 0);
  })[0];
  return {
    ...latest,
    reviewEligible: true,
    learnedAt: Math.min(...learned.map(state => state.learnedAt || state.added || Date.now())),
    due: Math.min(...learned.map(state => state.due || 0)),
    box: Math.max(...learned.map(state => state.box || 0)),
    right: Math.max(...learned.map(state => state.right || 0)),
    wrong: Math.max(...learned.map(state => state.wrong || 0)),
    seen: Math.max(...learned.map(state => state.seen || 0))
  };
}

function wordStateForId(id) {
  const key = normalizeVocabularyWord(wordMeta(id).v?.w || id.split(':').slice(1).join(':'));
  const states = activeWordIds()
    .filter(candidate => normalizeVocabularyWord(wordMeta(candidate).v?.w) === key)
    .map(candidate => S.words[candidate])
    .filter(Boolean);
  return states.length ? aggregateWordStates(states) : null;
}

function activeVocabularyEntries() {
  const groups = new Map();
  for (const id of activeWordIds()) {
    const meta = wordMeta(id);
    if (!meta.v) continue;
    const key = normalizeVocabularyWord(meta.v.w);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ id, ...meta, state: S.words[id] });
  }
  return [...groups.entries()].map(([key, items]) => {
    const learned = items
      .filter(item => isLearnedWordState(item.state))
      .sort((a, b) => (b.state.lastReviewedAt || 0) - (a.state.lastReviewedAt || 0));
    const chosen = items.find(item => item.a?.id === cur?.id) || learned[0] || items[0];
    return {
      key,
      id: chosen.id,
      v: chosen.v,
      a: chosen.a,
      ids: items.map(item => item.id),
      state: aggregateWordStates(items.map(item => item.state))
    };
  });
}

function reviewFilterValue() {
  return ['all', 'current', 'wrong'].includes(S.settings.vocabFilter)
    ? S.settings.vocabFilter
    : 'all';
}

function deckEntriesFor(mode = S.settings.deck, filter = reviewFilterValue()) {
  let entries = activeVocabularyEntries();
  if (mode === 'new') {
    entries = entries.filter(entry => !isLearnedWordState(entry.state));
  }
  if (mode === 'due') {
    entries = entries.filter(entry => isLearnedWordState(entry.state) && (entry.state.due || 0) <= Date.now());
  }
  if (filter === 'current') {
    entries = cur ? entries.filter(entry => entry.ids.some(id => id.startsWith(cur.id + ':'))) : [];
  }
  if (filter === 'wrong') {
    entries = entries.filter(entry => (entry.state.wrong || 0) > (entry.state.right || 0));
  }
  return entries;
}

function deckList() {
  if (!Object.keys(S.words).length) return [];
  return deckEntriesFor()
    .filter(entry => entry.v)
    .sort((x, y) => {
      const xLearned = isLearnedWordState(x.state);
      const yLearned = isLearnedWordState(y.state);
      if (xLearned !== yLearned) return xLearned ? 1 : -1;
      const xTime = xLearned ? x.state.due || 0 : x.state.added || 0;
      const yTime = yLearned ? y.state.due || 0 : y.state.added || 0;
      return xTime - yTime || x.key.localeCompare(y.key);
    });
}

function reviewSessionScope() {
  return reviewFilterValue() === 'current' ? (cur?.id || 'none') : 'global';
}

function reviewSessionKey(mode = S.settings.cmode) {
  return `${mode}:${S.settings.deck}:${reviewFilterValue()}:${reviewSessionScope()}`;
}

function reviewSessionRuntime(mode) {
  return mode === 'quiz'
    ? { queue: quizDeck, pos: quizPos, key: quizSessionKey }
    : { queue: cardQueue, pos: cardPos, key: cardSessionKey };
}

function setReviewSessionRuntime(mode, queue, pos, key) {
  if (mode === 'quiz') {
    quizDeck = queue;
    quizPos = pos;
    quizSessionKey = key;
  } else {
    cardQueue = queue;
    cardPos = pos;
    cardSessionKey = key;
  }
}

function resolveReviewSessionEntries(keys) {
  const active = new Map(activeVocabularyEntries().map(entry => [entry.key, entry]));
  return (Array.isArray(keys) ? keys : []).map(key => active.get(key)).filter(Boolean);
}

function saveReviewSession(mode) {
  const { queue, pos, key } = reviewSessionRuntime(mode);
  if (!key || !queue.length) return;
  S.reviewSessions[key] = {
    keys: queue.map(entry => entry.key),
    pos: Math.max(0, Math.min(queue.length, Number(pos) || 0)),
    completed: pos >= queue.length,
    updatedAt: Date.now()
  };
  save();
}

function ensureReviewSession(mode) {
  const key = reviewSessionKey(mode);
  const runtime = reviewSessionRuntime(mode);
  if (runtime.key === key) return { queue: runtime.queue, pos: runtime.pos };

  let stored = S.reviewSessions?.[key];
  let queue = null;
  let pos = 0;
  if (stored && Array.isArray(stored.keys)) {
    queue = resolveReviewSessionEntries(stored.keys);
    if (stored.keys.length && !queue.length) {
      delete S.reviewSessions[key];
      stored = null;
      queue = null;
    }
  }
  if (!stored) queue = deckList();
  if (!queue) queue = [];
  if (stored) {
    const previousPos = Math.max(0, Math.min(stored.keys.length, Number(stored.pos) || 0));
    const survivingKeys = new Set(queue.map(entry => entry.key));
    pos = stored.keys.slice(0, previousPos).filter(key => survivingKeys.has(key)).length;
  }
  setReviewSessionRuntime(mode, queue, pos, key);
  saveReviewSession(mode);
  return { queue, pos };
}

function restartReviewRound(mode = S.settings.cmode) {
  if (!['flip', 'quiz'].includes(mode)) return;
  const key = reviewSessionKey(mode);
  if (S.reviewSessions && Object.hasOwn(S.reviewSessions, key)) delete S.reviewSessions[key];
  resetModeRuntime(mode);
  save();
  renderCards();
}

function scoreLabel(score) {
  if (score === 2) return '记住了';
  if (score === 1) return '模糊';
  if (score === 0) return '忘记';
  return '';
}

function updateDeckChrome() {
  const filter = reviewFilterValue();
  const entries = deckEntriesFor('all', filter);
  const newEntries = deckEntriesFor('new', filter);
  const dueEntries = deckEntriesFor('due', filter);
  const dueKeys = new Set(dueEntries.map(entry => entry.key));
  const learnedEntries = entries.filter(entry => isLearnedWordState(entry.state));
  const waitingEntries = learnedEntries.filter(entry => !dueKeys.has(entry.key));
  const counts = {
    new: newEntries.length,
    due: dueEntries.length,
    all: entries.length
  };
  const deckSeg = $('#deckSeg');
  if (deckSeg) deckSeg.hidden = S.settings.cmode === 'flash';
  $$('#deckSeg button').forEach(button => {
    const deck = button.dataset.deck;
    button.dataset.count = String(counts[deck] || 0);
    button.textContent = `${button.textContent.replace(/\s*\(\d+\)$/, '')} (${counts[deck] || 0})`;
  });
  const deck = S.settings.deck || 'due';
  const context = $('#deckContext');
  if (!context) return;
  if (S.settings.cmode === 'flash') {
    const flashEntries = flashQueue.length ? flashQueue : flashDeckList();
    context.textContent = `闪现使用全部 ${flashEntries.length} 个词汇，不受到期和学习状态筛选影响；停止后可在本轮内继续。`;
    return;
  }
  const filterLabel = filter === 'current' ? '本篇生词' : filter === 'wrong' ? '易错词' : '全部词汇';
  const filterNote = filter === 'all' ? '' : ` 当前筛选：${filterLabel}。`;
  if (deck === 'new') {
    context.textContent = `待学习显示尚未开始学习的 ${newEntries.length} 个词。${filterNote}`;
  } else if (deck === 'due') {
    context.textContent = `待复习只显示已学习且已到期的 ${dueEntries.length} 个词；当前范围内另有 ${newEntries.length} 个未学习、${waitingEntries.length} 个已学未到期。${filterNote}`;
  } else if (deck === 'all') {
    context.textContent = `全部词汇共 ${entries.length} 个词，其中未学习 ${newEntries.length} 个、待复习 ${dueEntries.length} 个、已学未到期 ${waitingEntries.length} 个。${filterNote}`;
  } else {
    context.textContent = `全部词汇共 ${entries.length} 个词。${filterNote}`;
  }
}

function flashDeckList() {
  return activeVocabularyEntries().filter(entry => entry.v);
}

function resetCardRuntime() {
  cardQueue = [];
  cardPos = 0;
  cardRevealed = false;
  cardSessionKey = '';
  quizState = null;
  quizDeck = [];
  quizPos = 0;
  quizSessionKey = '';
  flashQueue = [];
  flashPos = 0;
  stopFlash();
}

function resetModeRuntime(mode = S.settings.cmode) {
  if (mode === 'quiz') {
    quizDeck = [];
    quizPos = 0;
    quizState = null;
    quizSessionKey = '';
  } else if (mode === 'flash') {
    flashQueue = [];
    flashPos = 0;
    stopFlash();
  } else {
    cardQueue = [];
    cardPos = 0;
    cardRevealed = false;
    cardSessionKey = '';
  }
}

function wireCards() {
  $('#deckSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    S.settings.deck = b.dataset.deck; save(); syncToolbar();
    resetModeRuntime();
    renderCards();
  });
  $('#reviewFilterSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-review-filter]'); if (!b) return;
    S.settings.vocabFilter = b.dataset.reviewFilter;
    save();
    syncToolbar();
    if (S.settings.cmode !== 'flash') renderCards();
  });
  $('#cardModeSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    S.settings.cmode = b.dataset.cmode; save(); syncToolbar();
    if (S.settings.cmode !== 'flash') stopFlash();
    renderCards();
  });
  $('#btnExportVocabCsv').addEventListener('click', exportVocabCsv);
  $('#btnReviewHistory').addEventListener('click', openReviewHistory);
  $('#btnVocabManage').addEventListener('click', openVocabManage);
  $('#vocabManageModal').addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) {
      clearVocabFocusPreview();
      $('#vocabManageModal').hidden = true;
    }
  });
  $('#btnPreviewVocabFocus').addEventListener('click', generateVocabFocusPreview);
  $('#vocabManageFocus').addEventListener('change', () => clearVocabFocusPreview());
  $('#vocabFocusScopeSeg').addEventListener('click', (e) => {
    const button = e.target.closest('button[data-focus-scope]');
    if (!button) return;
    $$('#vocabFocusScopeSeg button').forEach(item => item.classList.toggle('on', item === button));
    clearVocabFocusPreview();
  });
  $('#vocabArticleList').addEventListener('change', () => clearVocabFocusPreview());
  $('#vocabFocusPreview').addEventListener('click', (e) => {
    if (e.target.id === 'btnApplyVocabFocus') applyVocabFocusPreview();
    if (e.target.id === 'btnCancelVocabFocus') clearVocabFocusPreview('已取消预览');
  });
  $('#vocabReviewFilter').addEventListener('change', renderVocabManageWords);
  $('#btnAddVocabFromArticles').addEventListener('click', addSelectedArticleVocab);
  $('#btnClearSelectedVocab').addEventListener('click', clearSelectedVocab);
  $('#btnClearAllVocab').addEventListener('click', clearAllVocab);
  $('#btnCloseReview').addEventListener('click', closeReviewHistory);
  $('#reviewHistoryBody').addEventListener('click', (e) => {
    const button = e.target.closest('[data-review-word]');
    if (!button) return;
    closeReviewHistory();
    S.settings.deck = 'all';
    S.settings.vocabFilter = 'all';
    S.settings.cmode = 'flip';
    save();
    syncToolbar();
    resetCardRuntime();
    switchView('cards');
    const deck = deckList();
    const index = deck.findIndex(item => item.id === button.dataset.reviewWord);
    cardQueue = deck;
    cardPos = Math.max(0, index);
    cardRevealed = false;
    cardSessionKey = reviewSessionKey('flip');
    saveReviewSession('flip');
    quizState = null;
    renderCards();
  });
  $('#cardsStage').addEventListener('click', (e) => {
    const dictButton = e.target.closest('[data-card-dict]');
    if (dictButton) {
      e.stopPropagation();
      showWordById(dictButton.dataset.cardDict, dictButton);
      return;
    }
    const card = e.target.closest('.flashcard');
    if (card && card.dataset.phase === 'front') {
      cardRevealed = true;
      renderCards({ preserveQueue: true });
      return;
    }
    const rate = e.target.closest('.rate');
    if (rate) {
      const id = cardQueue[cardPos] && cardQueue[cardPos].id;
      if (id) rateWord(id, +rate.dataset.score);
      cardPos++;
      cardRevealed = false;
      saveReviewSession('flip');
      renderCards({ preserveQueue: true });
      return;
    }
    const qopt = e.target.closest('.quiz-opt');
    if (qopt && quizState && !quizState.answered) {
      quizState.answered = true;
      quizState.correct = qopt.dataset.ok === '1';
      quizState.pick = qopt.dataset.i;
      if (quizState.correct) rateWord(quizState.id, 2); else rateWord(quizState.id, 0);
      renderCards({ preserveQueue: true });
      return;
    }
    if (e.target.id === 'btnQuizNext') {
      quizPos++;
      quizState = null;
      saveReviewSession('quiz');
      renderCards({ preserveQueue: true });
      return;
    }
    if (e.target.id === 'btnRestartRound') {
      restartReviewRound(S.settings.cmode === 'quiz' ? 'quiz' : 'flip');
      return;
    }
    if (e.target.id === 'btnFlashStart') startFlash();
    if (e.target.id === 'btnFlashStop') { stopFlash(); renderCards(); }
    if (e.target.id === 'btnRefill') refillDeck();
    if (e.target.id === 'btnOpenAllWords') {
      S.settings.deck = 'all';
      S.settings.vocabFilter = 'all';
      save();
      syncToolbar();
      resetCardRuntime();
      renderCards();
    }
  });
}

function isReviewedWord(id) {
  const word = S.words[id];
  return !!(word && (word.lastReviewedAt || (word.right || 0) + (word.wrong || 0) > 0));
}

function renderVocabManageArticles() {
  $('#vocabArticleList').innerHTML = ARTICLES.filter(article => article.vocab.length).map(article => `
    <label class="vocab-check-item">
      <input type="checkbox" data-vocab-a="${article.id}">
      <span class="vc-main">
        <b>${esc(article.title)}</b>
        <span>${esc(article.source)} · ${article.vocab.length} 个词汇标注</span>
      </span>
    </label>`).join('') || '<div class="empty-tip">当前没有可导入的标注文章</div>';
}

function selectedVocabManageArticleIds() {
  return $$('#vocabArticleList input[data-vocab-a]:checked').map(input => input.dataset.vocabA);
}

function vocabFocusTargetArticles() {
  const scope = $('#vocabFocusScopeSeg button.on')?.dataset.focusScope || 'current';
  let articles = [];
  if (scope === 'current') {
    articles = cur ? [cur] : [];
  } else if (scope === 'selected') {
    const ids = new Set(selectedVocabManageArticleIds());
    articles = ARTICLES.filter(article => ids.has(article.id));
  } else {
    articles = ARTICLES.filter(article => article.paragraphs.length);
  }
  return [...new Map(articles.map(article => [article.id, article])).values()]
    .filter(article => baseArticleById(article.id)?.paragraphs?.length);
}

function clearVocabFocusPreview(message = '') {
  vocabFocusPreviewState = null;
  vocabFocusPreviewController?.abort();
  vocabFocusPreviewController = null;
  const preview = $('#vocabFocusPreview');
  if (preview) {
    preview.hidden = true;
    preview.innerHTML = '';
  }
  const status = $('#vocabFocusManageStatus');
  if (status) {
    status.textContent = message;
    status.style.color = 'var(--ink-3)';
  }
}

function renderVocabFocusPreview(preview) {
  const container = $('#vocabFocusPreview');
  const totals = preview.articles.reduce((sum, article) => ({
    added: sum.added + article.added.length,
    removed: sum.removed + article.removed.length,
    unchanged: sum.unchanged + article.unchanged.length
  }), { added: 0, removed: 0, unchanged: 0 });
  const termLine = (label, terms, cls) => terms.length
    ? `<div class="${cls}"><b>${label}</b>${terms.map(esc).join(' / ')}</div>`
    : '';
  container.innerHTML = `
    <div class="vocab-focus-preview-head">
      <b>${preview.articles.length} 篇文章 · ${esc(preview.focusLabel)}</b>
      <span>词汇新增 ${totals.added} · 移除 ${totals.removed} · 保留 ${totals.unchanged} · 精读解析同步更新</span>
    </div>
    ${preview.articles.map(article => `
      <div class="vocab-focus-preview-item" data-focus-preview-a="${esc(article.id)}">
        <b>${esc(article.title)}</b>
        <div class="vocab-focus-diff">
          ${termLine('新增：', article.added, 'added')}
          ${termLine('移除：', article.removed, 'removed')}
          ${termLine('保留：', article.unchanged.slice(0, 12), 'unchanged')}
        </div>
      </div>`).join('')}
    <div class="vocab-focus-preview-actions">
      <button class="mini-btn" id="btnCancelVocabFocus" type="button">取消预览</button>
      <button class="mini-btn primary" id="btnApplyVocabFocus" type="button">应用变更</button>
    </div>`;
  container.hidden = false;
}

async function generateVocabFocusPreview() {
  if (!hasEngineCredential()) {
    toast('请先配置模型凭据');
    return;
  }
  const focus = $('#vocabManageFocus').value || 'balanced';
  const articles = vocabFocusTargetArticles();
  if (!articles.length) {
    toast('当前范围没有可调整的文章');
    return;
  }
  clearVocabFocusPreview();
  const controller = new AbortController();
  vocabFocusPreviewController = controller;
  const requestId = ++vocabFocusPreviewRequestId;
  const button = $('#btnPreviewVocabFocus');
  const status = $('#vocabFocusManageStatus');
  if (button) button.disabled = true;
  if (status) {
    status.textContent = `正在生成 ${articles.length} 篇文章的词汇差异与解析预览…`;
    status.style.color = 'var(--ink-3)';
  }
  try {
    const previewArticles = [];
    for (let index = 0; index < articles.length; index += 1) {
      const article = articles[index];
      const base = baseArticleById(article.id);
      if (status) status.textContent = `正在分析词汇与解析侧重 ${index + 1}/${articles.length} · ${article.title}`;
      const response = await fetch('/api/focus-refresh', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          ...(await modelRequestPayload()),
          paragraphs: base.paragraphs.map(paragraph => decodeHtmlText(paragraph.en)),
          title: base.title,
          vocabFocus: focus
        })
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.error || `${article.title} 词汇生成失败`);
      const newVocab = sanitizeVocabList(data.vocab);
      if (!newVocab.length) throw new Error(`${article.title} 未返回有效词汇`);
      const newAnalyses = sanitizeFocusedAnalyses(data.analyses, base.paragraphs.length);
      if (!newAnalyses.length) throw new Error(`${article.title} 未返回完整精读解析`);
      const oldMap = new Map(article.vocab.map(item => [normalizeVocabularyWord(item.w), item]));
      const newMap = new Map(newVocab.map(item => [normalizeVocabularyWord(item.w), item]));
      previewArticles.push({
        id: article.id,
        title: article.title,
        oldVocab: article.vocab,
        newVocab,
        newAnalyses,
        added: [...newMap.keys()].filter(key => !oldMap.has(key)),
        removed: [...oldMap.keys()].filter(key => !newMap.has(key)),
        unchanged: [...newMap.keys()].filter(key => oldMap.has(key))
      });
    }
    if (requestId !== vocabFocusPreviewRequestId) return;
    vocabFocusPreviewState = {
      focus,
      focusLabel: $('#vocabManageFocus option:checked')?.textContent || focus,
      articles: previewArticles
    };
    renderVocabFocusPreview(vocabFocusPreviewState);
    if (status) {
      status.textContent = '预览已生成；确认后会同步修改文章词汇与精读解析，原文、译文、知识卡和标注不变。';
      status.style.color = 'var(--teal)';
    }
  } catch (error) {
    if (error?.name === 'AbortError' || requestId !== vocabFocusPreviewRequestId) return;
    clearVocabFocusPreview(`生成预览失败：${error.message || error}`);
    if (status) status.style.color = 'var(--danger)';
  } finally {
    if (requestId === vocabFocusPreviewRequestId) {
      vocabFocusPreviewController = null;
      if (button) button.disabled = false;
    }
  }
}

function applyVocabFocusPreview() {
  const preview = vocabFocusPreviewState;
  if (!preview) return;
  const totalRemoved = preview.articles.reduce((sum, article) => sum + article.removed.length, 0);
  if (!confirm(`将同步更新 ${preview.articles.length} 篇文章的词汇与精读解析，并从词汇库移除 ${totalRemoved} 个被替换词。继续吗？`)) return;
  for (const item of preview.articles) {
    setVocabularyOverride(item.id, preview.focus, item.newVocab, item.newAnalyses);
    for (const key of item.removed) {
      const oldVocab = item.oldVocab.find(vocab => normalizeVocabularyWord(vocab.w) === key);
      if (oldVocab) delete S.words[wordKey(item.id, oldVocab.w)];
    }
    for (const key of item.added) {
      const newVocab = item.newVocab.find(vocab => normalizeVocabularyWord(vocab.w) === key);
      if (newVocab) {
        const id = wordKey(item.id, newVocab.w);
        if (!S.words[id]) ensureWord(id);
      }
    }
    for (const key of Object.keys(S.dictionaries)) {
      if (key.startsWith(item.id + ':')) delete S.dictionaries[key];
    }
    for (const key of [...dictionarySession.keys()]) {
      if (key.startsWith(item.id + ':')) dictionarySession.delete(key);
    }
  }
  S.settings.vocabFocus = preview.focus;
  $('#setVocabFocus').value = preview.focus;
  if (cur) {
    cur = ARTICLES.find(article => article.id === cur.id) || cur;
    curIdx = buildVocabIndex(cur);
  }
  resetCardRuntime();
  save();
  clearVocabFocusPreview(`已应用“${preview.focusLabel}”；词汇与精读解析已同步更新，未变化词汇的学习进度已保留。`);
  renderVocabManageArticles();
  renderVocabManageWords();
  renderDoc();
  renderSide();
  renderList();
  renderCards();
  renderKB();
  renderExport();
  renderStats();
  toast(`已更新 ${preview.articles.length} 篇文章的词汇侧重`);
}

function renderVocabManageWords() {
  const mode = $('#vocabReviewFilter').value || 'all';
  const entries = activeVocabularyEntries().filter(entry => {
    const reviewed = !!(entry.state.lastReviewedAt || (entry.state.right || 0) + (entry.state.wrong || 0) > 0);
    if (mode === 'reviewed') return reviewed;
    if (mode === 'unreviewed') return !reviewed;
    return true;
  });
  $('#vocabWordList').innerHTML = entries.map(entry => {
    const { id, a, v, state } = entry;
    const word = v?.w || id.split(':').slice(1).join(':');
    const dictionary = S.dictionaries[id] || entry.ids.map(candidate => S.dictionaries[candidate]).find(Boolean);
    const definition = dictionary?.senses?.[0]?.definition || v?.en || '';
    const reviewed = !!(state.lastReviewedAt || (state.right || 0) + (state.wrong || 0) > 0);
    const learningStatus = !isLearnedWordState(state) ? '未学习' : reviewed ? '已复习' : '已学习';
    return `<label class="vocab-check-item">
      <input type="checkbox" data-vocab-id="${esc(id)}">
      <span class="vc-main">
        <b>${esc(word)} ${v?.ipa ? `<span>${esc(v.ipa)}</span>` : ''}</b>
        <span>${esc(v?.zh || dictionary?.senses?.[0]?.zh || '')}${a ? ` · ${esc(a.title)}` : ''}</span>
        ${definition ? `<em>${esc(definition)}</em>` : ''}
        <span>${learningStatus}</span>
      </span>
    </label>`;
  }).join('') || '<div class="empty-tip">当前筛选下没有词汇</div>';
}

function openVocabManage() {
  renderVocabManageArticles();
  $('#vocabManageFocus').value = S.settings.vocabFocus || 'balanced';
  $$('#vocabFocusScopeSeg button').forEach(button =>
    button.classList.toggle('on', button.dataset.focusScope === 'current'));
  clearVocabFocusPreview();
  $('#vocabReviewFilter').value = 'all';
  renderVocabManageWords();
  $('#vocabManageModal').hidden = false;
}

function addSelectedArticleVocab() {
  const articleIds = $$('#vocabArticleList input[data-vocab-a]:checked').map(input => input.dataset.vocabA);
  if (!articleIds.length) return toast('请先选择文章');
  const beforeCount = activeVocabularyEntries().length;
  articleIds.forEach(articleId => {
    const article = ARTICLES.find(item => item.id === articleId);
    (article?.vocab || []).forEach(vocab => {
      const id = wordKey(article.id, vocab.w);
      if (!S.words[id]) {
        ensureWord(id);
      }
    });
  });
  const added = Math.max(0, activeVocabularyEntries().length - beforeCount);
  save();
  renderStats();
  renderSide();
  resetCardRuntime();
  renderCards();
  renderVocabManageWords();
  toast(`已加入 ${added} 个新词`);
}

function clearSelectedVocab() {
  const ids = $$('#vocabWordList input[data-vocab-id]:checked').map(input => input.dataset.vocabId);
  if (!ids.length) return toast('请先选择词汇');
  const relatedIds = new Set(ids.flatMap(id => relatedWordIds(id)));
  relatedIds.forEach(id => { delete S.words[id]; });
  save();
  renderStats();
  resetCardRuntime();
  renderCards();
  renderSide();
  renderVocabManageWords();
  toast(`已清除 ${ids.length} 个词`);
}

function clearAllVocab() {
  if (!Object.keys(S.words).length) return toast('生词本已经为空');
  if (!confirm('确定清空全部生词本及其复习记录吗？')) return;
  S.words = {};
  save();
  renderStats();
  renderGoal();
  resetCardRuntime();
  renderCards();
  renderSide();
  renderVocabManageWords();
  toast('生词本已清空');
}

function refillDeck() {
  // 把全部词汇加入生词本并重置到期时间
  ARTICLES.forEach(a => a.vocab.forEach(v => {
    const id = wordKey(a.id, v.w);
    if (!S.words[id]) ensureWord(id);
  }));
  S.settings.deck = 'all';
  S.settings.vocabFilter = 'all';
  resetCardRuntime();
  save(); syncToolbar(); renderStats(); renderCards();
  toast('已将全部内置词汇加入生词本');
}

function renderCards(options = {}) {
  const stage = $('#cardsStage');
  updateDeckChrome();
  let deck;
  let position;
  let sessionMode = 'flip';
  if (S.settings.cmode === 'flash') {
    if (!flashQueue.length) flashQueue = flashDeckList();
    deck = flashQueue;
    position = flashPos;
  } else {
    sessionMode = S.settings.cmode === 'quiz' ? 'quiz' : 'flip';
    const session = ensureReviewSession(sessionMode);
    deck = session.queue;
    position = session.pos;
  }
  if (!Object.keys(S.words).length) {
    stage.innerHTML = `<div class="empty-tip" style="max-width:420px">
      生词本还是空的。<br>在阅读台点击任意带下划线的词，加入生词本后即可开始复习。<br><br>
      <button class="mini-btn" id="btnRefill" style="margin-top:8px">一键载入全部示例词汇（${ARTICLES.reduce((n, a) => n + a.vocab.length, 0)} 个）</button>
    </div>`;
    $('#cardsStats').innerHTML = '';
    return;
  }
  if (!deck.length) {
    const unlearned = activeVocabularyEntries().filter(entry => !isLearnedWordState(entry.state)).length;
    stage.innerHTML = `<div class="empty-tip" style="max-width:420px">
      ${S.settings.deck === 'due' && unlearned
        ? `当前没有到期词。<br>词汇库中还有 ${unlearned} 个未学习词汇，先去学习后再安排复习。`
        : '这个队列暂时空了。<br>换个词库，或等下一批到期的卡片。'}<br><br>
      ${S.settings.deck === 'due' && unlearned
        ? '<button class="mini-btn" id="btnOpenAllWords">去全部词汇学习</button>'
        : '<button class="mini-btn" id="btnRefill">补充全部词汇</button>'}
    </div>`;
    renderCardStats(deck);
    return;
  }
  if (position >= deck.length) {
    stage.innerHTML = `<div class="empty-tip" style="max-width:420px">
      本轮完成 · 共 ${deck.length} 张<br>记忆曲线已为你安排下次复习时间。
      <br><br><button class="mini-btn" id="btnRestartRound">重新开始本轮</button></div>`;
    renderCardStats(deck);
    return;
  }
  const item = deck[position];

  if (S.settings.cmode === 'flash') {
    const flashItem = deck[Math.min(position, deck.length - 1)];
    stage.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
        <div class="flash-word" id="flashWord">${esc(flashItem.v.w)}</div>
        <div class="fc-ipa">${esc(flashItem.v.ipa || '')}</div>
        ${flashPos > 0 ? `<div class="flash-stopped">已停在 ${flashPos + 1} / ${deck.length}，继续会从此处开始</div>` : ''}
        <div class="flash-timer"><i id="flashBar"></i></div>
        <div style="margin-top:16px;display:flex;gap:8px">
          <button class="btn primary" id="btnFlashStart">开始闪现</button>
          <button class="btn ghost" id="btnFlashStop">停止</button>
        </div>
        <p class="hint" style="margin-top:10px">屏幕每 2 秒闪过一个词，看到后在心里说出中文释义，训练反应速度。</p>
      </div>`;
    return;
  }

  if (S.settings.cmode === 'quiz') {
    if (!quizState || quizState.id !== item.id) quizState = makeQuiz(item);
    const q = quizState;
    stage.innerHTML = `
      <div style="width:100%;max-width:440px;display:flex;flex-direction:column;align-items:center;gap:6px">
        <div class="fc-ipa">${quizPos + 1} / ${deck.length} · 选出正确的中文释义</div>
        <div class="fc-word" style="font-size:30px;margin:14px 0 4px">${esc(item.v.w)}</div>
        <div class="fc-ipa">${esc(item.v.ipa || '')}</div>
        <div class="quiz-opts" style="margin-top:18px">
          ${q.opts.map((o, i) => {
            let cls = '';
            if (q.answered) {
              if (o.ok) cls = 'right';
              else if (String(i) === q.pick) cls = 'wrong';
            }
            return `<button class="quiz-opt ${cls}" data-i="${i}" data-ok="${o.ok ? 1 : 0}" ${q.answered ? 'disabled' : ''}>${esc(o.zh)}</button>`;
          }).join('')}
        </div>
        ${q.answered ? `<div class="quiz-feedback ${q.correct ? 'good' : 'bad'}">
          <b>${q.correct ? '回答正确' : '回答错误'}</b>
          <span>正确答案：${esc(item.v.zh)}</span>
          <button class="mini-btn" id="btnQuizNext">下一题</button>
        </div>` : ''}
      </div>`;
    renderCardStats(deck);
    return;
  }

  // 卡片模式
  const wordState = item.state || S.words[item.id];
  const learnedWord = isLearnedWordState(wordState);
  const latestRating = scoreLabel(wordState.lastScore);
  stage.innerHTML = `
    <div class="flashcard" data-phase="${cardRevealed ? 'back' : 'front'}">
      <div class="fc-top"><span>${position + 1} / ${deck.length}</span><span>${wordState.box ? 'BOX ' + wordState.box : 'NEW'}</span></div>
      <div class="fc-review-meta">${learnedWord
        ? `${latestRating ? `上次：${latestRating}` : '已学习'} · 下次：${dueLabel(wordState.due)}`
        : '未学习 · 首次学习后安排复习'}</div>
      <div class="fc-word">${esc(item.v.w)}</div>
      <div class="fc-ipa">${esc(item.v.ipa || '')} · ${esc(item.v.pos || '')}</div>
      ${cardRevealed ? `
        <div class="fc-answer">
          <div class="zh">${esc(item.v.zh)}</div>
          <div class="en">${esc(item.v.en)}</div>
          ${item.v.ex ? `<div class="ex">${esc(item.v.ex)}</div><div class="ex-zh">${esc(item.v.exZh || '')}</div>` : ''}
        </div>` : `<div class="fc-hint">点击卡片显示释义</div>`}
      <button class="mini-btn fc-dict-btn" data-card-dict="${item.id}">词典与语境</button>
    </div>
    ${cardRevealed ? `
      <div class="rate-row">
        <button class="rate r0" data-score="0">忘记<small>${reviewIntervalLabel(0, wordState.box)}</small></button>
        <button class="rate r1" data-score="1">模糊<small>${reviewIntervalLabel(1, wordState.box)}</small></button>
        <button class="rate r2" data-score="2">记住了<small>${reviewIntervalLabel(2, wordState.box)}</small></button>
      </div>` : ''}`;
  renderCardStats(deck);
}

function makeQuiz(item) {
  const others = ARTICLES
    .flatMap(a => a.vocab.filter(v => v.w !== item.v.w))
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  const opts = [{ zh: item.v.zh, ok: true }, ...others.map(v => ({ zh: v.zh, ok: false }))]
    .sort(() => Math.random() - 0.5);
  return { id: item.id, opts, answered: false, pick: null };
}

function startFlash() {
  stopFlash();
  if (!flashQueue.length) flashQueue = flashDeckList();
  const deck = flashQueue;
  const run = ++flashRun;
  let i = Math.min(Math.max(0, flashPos), Math.max(0, deck.length - 1));
  if (!deck.length) return;
  const stage = $('#cardsStage');
  const tick = () => {
    if (run !== flashRun) return;
    if (i >= deck.length) { flashPos = 0; toast('闪现结束'); renderCards(); return; }
    flashPos = i;
    const it = deck[i];
    stage.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center">
        <div class="flash-word">${esc(it.v.w)}</div>
        <div class="fc-ipa">${esc(it.v.ipa || '')}</div>
        <div class="hint" style="margin-top:14px">${i + 1} / ${deck.length}</div>
      </div>`;
    stage.insertAdjacentHTML('beforeend', '<button class="btn ghost" id="btnFlashStop">停止闪现</button>');
    flashRevealTimer = setTimeout(() => {
      if (run !== flashRun) return;
      stage.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center">
          <div class="fc-answer" style="border:none;margin:0;padding:0;text-align:center">
            <div class="zh" style="font-size:26px">${esc(it.v.zh)}</div>
            <div class="en" style="margin-top:6px">${esc(it.v.w)} ${esc(it.v.ipa || '')}</div>
          </div>
          <div class="hint" style="margin-top:14px">${i + 1} / ${deck.length}</div>
        </div>`;
      stage.insertAdjacentHTML('beforeend', '<button class="btn ghost" id="btnFlashStop">停止闪现</button>');
    }, 1100);
    i++;
    flashTimer = setTimeout(tick, 2000);
  };
  tick();
}
function stopFlash() {
  flashRun++;
  if (flashTimer) clearTimeout(flashTimer);
  if (flashRevealTimer) clearTimeout(flashRevealTimer);
  flashTimer = null;
  flashRevealTimer = null;
}

function renderCardStats(deck) {
  const entries = activeVocabularyEntries();
  const due = deckEntriesFor('due', reviewFilterValue()).length;
  const unlearned = entries.filter(entry => !isLearnedWordState(entry.state)).length;
  const mastered = entries.filter(entry => (entry.state.box || 0) >= 3).length;
  const acc = entries.reduce((n, entry) => n + (entry.state.right || 0), 0);
  const tot = entries.reduce((n, entry) => n + (entry.state.right || 0) + (entry.state.wrong || 0), 0);
  $('#cardsStats').innerHTML = `
    <div class="cstat"><b>${entries.length}</b><span>全部词汇</span></div>
    <div class="cstat"><b>${due}</b><span>待复习</span></div>
    <div class="cstat"><b>${unlearned}</b><span>未学习</span></div>
    <div class="cstat"><b>${mastered}</b><span>已掌握</span></div>
    <div class="cstat"><b>${tot ? Math.round(acc / tot * 100) : 0}%</b><span>正确率</span></div>`;
}

function renderReviewHistory() {
  const records = activeVocabularyEntries()
    .filter(item => item.v && item.state.lastReviewedAt)
    .sort((a, b) => (b.state.lastReviewedAt || 0) - (a.state.lastReviewedAt || 0));
  const body = $('#reviewHistoryBody');
  body.innerHTML = records.length ? records.map(item => {
    const score = item.state.lastScore === 2 ? '记住了' : item.state.lastScore === 1 ? '模糊' : '忘记';
    const scoreClass = item.state.lastScore === 2 ? 'good' : item.state.lastScore === 1 ? 'warn' : 'bad';
    return `<div class="review-record">
      <div class="review-record-head"><b>${esc(item.v.w)}</b><span class="${scoreClass}">${score}</span></div>
      <p>${esc(item.v.zh)}</p>
      <small>${new Date(item.state.lastReviewedAt).toLocaleString('zh-CN')} · ${dueLabel(item.state.due)}</small>
      ${item.a ? `<small>${esc(item.a.source)} · ${esc(item.a.title)}</small>` : ''}
      <button class="mini-btn" data-review-word="${item.id}">重新复习</button>
    </div>`;
  }).join('') : '<div class="empty-tip">还没有复习记录。完成一次卡片评分或测验后会显示在这里。</div>';
}

function openReviewHistory() {
  renderReviewHistory();
  $('#reviewDrawer').hidden = false;
}

function closeReviewHistory() {
  $('#reviewDrawer').hidden = true;
}

/* ================= 视图 3：知识库 ================= */
function exportVocabCsv() {
  const deck = activeVocabularyEntries().filter(item => item.v);
  if (!deck.length) return toast('当前词库没有可导出的词汇');
  const cell = (value) => `"${String(value || '').replace(/"/g, '""')}"`;
  const rows = [['Front', 'Back', 'Definition', 'IPA', 'Part of Speech', 'Example', 'Source', 'Tags']];
  deck.forEach(({ v, a }) => {
    const id = wordKey(a?.id || '', v.w);
    const definition = S.dictionaries[id]?.senses?.[0]?.definition || v.en || '';
    rows.push([v.w, v.zh, definition, v.ipa, v.pos, v.ex, a ? `${a.source} / ${a.title}` : '', 'FinLens;finance']);
  });
  const csv = '\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n');
  download(`FinLens-vocab-${todayStr()}.csv`, csv, 'text/csv');
  toast(`已导出 ${deck.length} 个词汇，可用于 Anki / Quizlet`);
}

function allKnowledge() {
  return ARTICLES.flatMap(a => a.knowledge.map(k => {
    const classification = classifyKnowledgeCategoryClient(k);
    return {
      ...k,
      category: classification.category,
      categories: classification.categories,
      categoryReason: classification.reason,
      categoryConfidence: classification.confidence,
      _aid: a.id,
      _src: a.source,
      _title: a.title,
      _topic: a.topic
    };
  }));
}

function filteredKnowledge() {
  const q = kb.q.trim().toLowerCase();
  return allKnowledge().filter(k => {
    if (kb.topic !== 'all' && k._topic !== kb.topic) return false;
    if (kb.category !== 'all' && !knowledgeCategoriesFor(k).includes(kb.category)) return false;
    if (!q) return true;
    return (k.term + k.en + k.one + k.body + (k.match || []).join('')).toLowerCase().includes(q);
  });
}

function knowledgeCategoriesFor(card = {}) {
  const categories = [
    card.category,
    ...(Array.isArray(card.categories) ? card.categories : [])
  ].filter((category, index, values) =>
    Object.hasOwn(KNOWLEDGE_CATEGORIES, category) && values.indexOf(category) === index);
  return categories.length ? categories : ['background'];
}

function knowledgeCategoryBadges(card = {}) {
  return knowledgeCategoriesFor(card)
    .map(category => `<span class="knowledge-category-badge">${esc(KNOWLEDGE_CATEGORIES[category])}</span>`)
    .join('');
}

function knowledgeVerificationBadge(card = {}) {
  return card.categoryLocked
    ? '<span class="knowledge-verification-badge">分类已核验</span>'
    : '<span class="knowledge-verification-badge pending">分类待核验</span>';
}

function renderKB() {
  const list = filteredKnowledge();
  $('#kbGrid').innerHTML = list.map(k => `
    <div class="kb-card" data-kid="${k.id}">
      <div class="knowledge-meta-line">${knowledgeCategoryBadges(k)}<span class="knowledge-type-badge">${esc(knowledgeTypeLabel(k.cardType))}</span>${knowledgeVerificationBadge(k)}${k.suggestedTag ? `<span class="tag">${esc(k.suggestedTag)}</span>` : ''}</div>
      <h3 class="kb-term">${esc(k.term)} <em>${esc(k.en || '')}</em></h3>
      <div class="kb-one">${esc(k.one)}</div>
      <div class="kb-body">${esc(k.body)}</div>
      ${k.cases ? `<div class="kb-cases"><b>案例</b>　${esc(k.cases)}</div>` : ''}
      <div class="inline-actions">
        <button class="mini-btn" data-know-detail="${k.id}">详解 · 权威依据 · AI 追问</button>
        <button class="mini-btn" data-revalidate-card="${esc(k.id)}" data-aid="${esc(k._aid)}">核验分类</button>
      </div>
      <div class="kb-src">${esc(k._src)} ·《${esc(k._title)}》</div>
    </div>`).join('') || '<div class="empty-tip">没有匹配的概念</div>';
}

function revalidationScopeValue() {
  return $('#revalidationScopeSeg button.on')?.dataset.revalidateScope || 'filtered';
}

function renderCategoryRevalidationSources(coverage = KNOWLEDGE_SOURCE_COVERAGE) {
  const container = $('#revalidationSourceCoverage');
  if (!container) return;
  const items = Array.isArray(coverage) && coverage.length
    ? coverage.map(source => Array.isArray(source)
      ? { title: source[0], scope: source[1], url: source[2] }
      : source)
    : [];
  container.innerHTML = items.map(source => `<span class="revalidation-source">
    <a href="${esc(safeExternalUrl(source.url))}" target="_blank" rel="noopener">${esc(source.title || '权威来源')}</a>
    <span>${esc(source.scope || '')}</span>
  </span>`).join('');
}

function openCategoryRevalidation(options = {}) {
  const target = options.articleId && options.cardId
    ? { articleId: options.articleId, cardId: options.cardId }
    : null;
  categoryRevalidationState = {
    scope: 'filtered',
    online: true,
    results: [],
    selected: new Set(),
    coverage: KNOWLEDGE_SOURCE_COVERAGE,
    target
  };
  $$('#revalidationScopeSeg button').forEach(button =>
    button.classList.toggle('on', button.dataset.revalidateScope === 'filtered'));
  $('#revalidationOnline').checked = true;
  $('#revalidationStatus').textContent = target
    ? '当前知识卡核验：生成预览后才会写入分类。'
    : '生成预览后才会写入分类。';
  $('#revalidationStatus').style.color = 'var(--ink-3)';
  $('#revalidationPreview').innerHTML = '<div class="revalidation-empty">选择范围后生成核验预览。</div>';
  $('#btnApplyCategoryRevalidation').disabled = true;
  $('#btnRunCategoryRevalidation').disabled = false;
  $('#btnUndoCategoryRevalidation').hidden = !(S.knowledgeRevalidationBackups || []).length;
  $('#revalidationScopeSeg').hidden = Boolean(target);
  renderCategoryRevalidationSources();
  $('#categoryRevalidationModal').hidden = false;
}

function closeCategoryRevalidation() {
  const modal = $('#categoryRevalidationModal');
  if (modal) modal.hidden = true;
}

function categoryLabel(category) {
  return KNOWLEDGE_CATEGORIES[category] || category || '未分类';
}

function categoryRevalidationCards(scope = revalidationScopeValue()) {
  if (categoryRevalidationState?.target) {
    const target = categoryRevalidationState.target;
    const article = ARTICLES.find(item => item.id === target.articleId);
    const card = article?.knowledge.find(item => item.id === target.cardId);
    if (!card) return [];
    return [{
      id: card.id,
      articleId: article.id,
      articleTitle: article.title,
      term: card.term,
      en: card.en,
      one: card.one,
      body: card.body,
      cases: card.cases,
      category: card.category,
      categories: card.categories,
      cardType: card.cardType,
      classificationReason: card.classificationReason,
      categoryReason: card.categoryReason,
      categoryConfidence: card.categoryConfidence,
      methodSteps: card.methodSteps,
      scenarios: card.scenarios,
      related: card.related,
      match: card.match
    }];
  }
  return (scope === 'all' ? allKnowledge() : filteredKnowledge()).map(card => ({
    id: card.id,
    articleId: card._aid,
    articleTitle: card._title,
    term: card.term,
    en: card.en,
    one: card.one,
    body: card.body,
    cases: card.cases,
    category: card.category,
    categories: card.categories,
    cardType: card.cardType,
    classificationReason: card.classificationReason,
    categoryReason: card.categoryReason,
    categoryConfidence: card.categoryConfidence,
    methodSteps: card.methodSteps,
    scenarios: card.scenarios,
    related: card.related,
    match: card.match
  }));
}

function renderCategoryRevalidationPreview() {
  const state = categoryRevalidationState;
  const container = $('#revalidationPreview');
  if (!container || !state) return;
  if (!state.results.length) {
    container.innerHTML = '<div class="revalidation-empty">还没有核验结果。</div>';
    $('#btnApplyCategoryRevalidation').disabled = true;
    return;
  }
  container.innerHTML = state.results.map(result => {
    const selected = state.selected.has(`${result.articleId}:${result.cardId}`);
    const evidence = result.evidence || {};
    const recommendation = result.recommendation || (result.changed ? 'change' : 'keep');
    const review = result.contentWarnings?.length ||
      result.categoryConfidence < 0.85 ||
      evidence.sufficient === false ||
      recommendation === 'review';
    const statusClass = review ? 'review' : recommendation === 'change' ? 'changed' : '';
    const statusText = review
      ? evidence.sufficient === false ? '证据不足' : '需要人工确认'
      : recommendation === 'change' ? '建议修改' : '保持不变';
    const canApply = result.changed && evidence.sufficient !== false;
    const renderEvidence = (items, emptyText) => (items || []).length
      ? items.map(item => `<span class="revalidation-snippet"><b>${esc(item.source === 'body' ? '正文' : '一句话')}</b>${esc(item.text)}</span>`).join('')
      : `<span class="revalidation-snippet empty">${esc(emptyText)}</span>`;
    const sourceLinks = (result.sources || []).slice(0, 7).map(source => `
      <a class="${source.sourceType === 'live' ? 'live' : ''}" href="${esc(safeExternalUrl(source.url))}" target="_blank" rel="noopener" title="${esc(source.description || '')}">
        ${esc(source.title || source.publisher || '来源')}${source.sourceType === 'live' ? ' · 在线' : ' · 目录'}
      </a>`).join('');
    return `<article class="revalidation-item ${result.changed ? 'changed' : ''} ${review ? 'review' : ''}">
      <input class="revalidation-check" type="checkbox" data-revalidation-pick="${esc(`${result.articleId}:${result.cardId}`)}" ${selected ? 'checked' : ''} ${canApply ? '' : 'disabled'}>
      <div class="revalidation-main">
        <b>${esc(result.term || result.cardId)} <small>${esc(result.en || '')}</small></b>
        <span>${esc(result.articleTitle || '')}</span>
        <div class="revalidation-transition">
          <span class="badge">${esc(categoryLabel(result.current?.category))}${(result.current?.categories || []).length > 1 ? ` · ${result.current.categories.map(categoryLabel).join(' + ')}` : ''}</span>
          <span>→</span>
          <span class="badge suggested">${esc(categoryLabel(result.suggested?.category))}${(result.suggested?.categories || []).length > 1 ? ` · ${result.suggested.categories.map(categoryLabel).join(' + ')}` : ''}</span>
          <span>${esc(result.suggested?.cardType || '')} · ${Math.round((result.categoryConfidence || 0) * 100)}%</span>
        </div>
        <p>${esc(result.categoryReason || '')}</p>
        <div class="revalidation-evidence-list">
          <div class="revalidation-evidence-row">
            <b>主对象证据</b>
            <span>${esc(evidence.mainReason || '未提供主对象判断理由。')}</span>
            <div>${renderEvidence(evidence.main, '未找到足以解释术语本体的正文片段')}</div>
          </div>
          <div class="revalidation-evidence-row">
            <b>独立交叉证据</b>
            <span>${esc(evidence.crossReason || '未提供交叉分类判断理由。')}</span>
            <div>${renderEvidence(evidence.cross, '没有独立的交叉正文证据')}</div>
          </div>
          ${evidence.negative?.length ? `<div class="revalidation-evidence-row negative">
            <b>明确否定证据</b>
            <span>${esc(evidence.negativeReason || '这些片段不会被作为正面分类证据。')}</span>
            <div>${renderEvidence(evidence.negative, '')}</div>
          </div>` : ''}
          <small class="revalidation-source-note">来源目录和检索页面只用于后续核查，不单独构成分类依据。</small>
        </div>
        ${result.contentWarnings?.length ? `<div class="revalidation-warning">
          ${result.contentWarnings.map(esc).join('；')}。分类核验不会自动改写正文。
          ${result.contentFix ? `<button class="mini-btn" type="button" data-review-content-fix="${esc(`${result.articleId}:${result.cardId}`)}">查看建议正文与案例</button>` : '<span>暂无可用建议内容，请配置模型或人工修正。</span>'}
        </div>` : ''}
        <div class="revalidation-evidence">${sourceLinks}</div>
      </div>
      <div class="revalidation-meta"><span class="revalidation-status ${statusClass}">${statusText}</span><span>${esc(result.online === 'verified' ? `${result.verifiedSources || 0} 条在线来源` : result.online === 'unavailable' ? '在线来源不可用' : '目录来源')}</span></div>
    </article>`;
  }).join('');
  $('#btnApplyCategoryRevalidation').disabled = state.selected.size === 0;
}

function openContentFixReview(key) {
  const result = categoryRevalidationState?.results.find(item =>
    `${item.articleId}:${item.cardId}` === key);
  if (!result?.contentFix) {
    toast('当前没有可用的建议正文');
    return;
  }
  activeContentFixReview = { result, key };
  const originalContent = result.originalContent || {
    one: result.one || '',
    body: result.body || '',
    cases: result.cases || ''
  };
  $('#contentFixTitle').textContent = `${result.term || '知识卡'} · 正文与案例核验`;
  $('#contentFixReason').textContent = (result.contentWarnings || []).join('；') || '核验发现正文或案例与术语可能不一致。';
  $('#contentFixOriginal').innerHTML = `<b>${esc(result.term || '')}</b>
    <p>${esc(originalContent.one || '')}</p>
    <p>${esc(originalContent.body || '')}</p>
    ${originalContent.cases ? `<p><strong>案例：</strong>${esc(originalContent.cases)}</p>` : ''}`;
  $('#contentFixSuggested').innerHTML = `<b>${esc(result.term || '')}</b>
    <p>${esc(result.contentFix.one || '')}</p>
    <p>${esc(result.contentFix.body || '')}</p>
    ${result.contentFix.cases ? `<p><strong>案例：</strong>${esc(result.contentFix.cases)}</p>` : ''}`;
  $('#contentFixModal').hidden = false;
}

function closeContentFixReview() {
  activeContentFixReview = null;
  $('#contentFixModal').hidden = true;
}

function applyContentFixReview() {
  const review = activeContentFixReview;
  if (!review?.result?.contentFix) return;
  const { result } = review;
  const article = ARTICLES.find(item => item.id === result.articleId);
  const card = article?.knowledge.find(item => item.id === result.cardId);
  if (!card) return;
  const previous = {
    one: card.one,
    body: card.body,
    cases: card.cases
  };
  S.knowledgeContentFixBackups = [{
    id: `content-fix-${Date.now()}`,
    createdAt: Date.now(),
    articleId: result.articleId,
    cardId: result.cardId,
    previous
  }, ...(S.knowledgeContentFixBackups || [])].slice(0, 20);
  S.knowledgeOverrides[result.articleId] = S.knowledgeOverrides[result.articleId] || {};
  const existing = S.knowledgeOverrides[result.articleId][result.cardId] || {};
  const override = {
    ...existing,
    one: result.contentFix.one,
    body: result.contentFix.body,
    cases: result.contentFix.cases,
    contentFixSource: result.contentFix.source,
    contentFixedAt: Date.now()
  };
  S.knowledgeOverrides[result.articleId][result.cardId] = override;
  Object.assign(card, {
    one: override.one,
    body: override.body,
    cases: override.cases,
    contentFixSource: override.contentFixSource,
    contentFixedAt: override.contentFixedAt
  });
  result.one = override.one;
  result.body = override.body;
  result.cases = override.cases;
  result.contentWarnings = [];
  result.contentFixStatus = 'applied';
  save();
  closeContentFixReview();
  renderKB();
  if (cur) renderSide();
  if (activeKnowledge) renderKnowledgeDetail();
  renderCategoryRevalidationPreview();
  toast('建议正文已应用，可继续核验分类');
}

async function runCategoryRevalidation() {
  if (!categoryRevalidationState) return;
  const button = $('#btnRunCategoryRevalidation');
  const status = $('#revalidationStatus');
  const cards = categoryRevalidationCards();
  if (!cards.length) {
    status.textContent = '当前范围没有知识卡。';
    return;
  }
  const online = $('#revalidationOnline').checked;
  button.disabled = true;
  status.style.color = 'var(--ink-3)';
  status.textContent = `正在按规则核验 ${cards.length} 张知识卡…`;
  try {
    const results = [];
    let coverage = KNOWLEDGE_SOURCE_COVERAGE;
    const credentials = await modelRequestPayload();
    for (let start = 0; start < cards.length; start += 120) {
      status.textContent = `正在核验 ${Math.min(start + 120, cards.length)} / ${cards.length} 张知识卡…`;
      const response = await fetch('/api/revalidate-category', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...credentials, cards: cards.slice(start, start + 120), online })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || '分类核验失败');
      results.push(...(data.results || []));
      if (data.coverage?.length) coverage = data.coverage;
    }
    const defaultSelected = results
      .filter(result =>
        result.recommendation === 'change' &&
        result.evidence?.sufficient === true &&
        result.changed &&
        !result.contentWarnings?.length &&
        result.categoryConfidence >= 0.85)
      .map(result => `${result.articleId}:${result.cardId}`);
    categoryRevalidationState = {
      ...categoryRevalidationState,
      scope: revalidationScopeValue(),
      online,
      results,
      coverage,
      selected: new Set(defaultSelected)
    };
    renderCategoryRevalidationSources(coverage);
    renderCategoryRevalidationPreview();
    const changed = results.filter(result => result.changed).length;
    const review = results.filter(result =>
      result.contentWarnings?.length ||
      result.categoryConfidence < 0.85 ||
      result.evidence?.sufficient === false ||
      result.recommendation === 'review').length;
    status.textContent = `核验完成：${results.length} 张，建议修改 ${changed} 张，需人工确认 ${review} 张。默认只勾选正文证据充分的变化项。`;
    status.style.color = changed || review ? '#7a5312' : 'var(--teal)';
  } catch (error) {
    status.textContent = `核验失败：${error.message || error}`;
    status.style.color = 'var(--danger)';
    categoryRevalidationState.results = [];
    renderCategoryRevalidationPreview();
  } finally {
    button.disabled = false;
  }
}

function applyCategoryRevalidation() {
  const state = categoryRevalidationState;
  if (!state?.selected?.size) return;
  const selected = state.results.filter(result =>
    state.selected.has(`${result.articleId}:${result.cardId}`) &&
    result.changed &&
    result.evidence?.sufficient !== false);
  if (!selected.length) return;
  const backup = {
    id: `category-revalidation-${Date.now()}`,
    createdAt: Date.now(),
    entries: selected.map(result => {
      const article = ARTICLES.find(item => item.id === result.articleId);
      const card = article?.knowledge.find(item => item.id === result.cardId);
      return {
        articleId: result.articleId,
        cardId: result.cardId,
        previousOverride: S.knowledgeOverrides?.[result.articleId]?.[result.cardId] || null,
        previous: card ? {
          category: card.category,
          categories: card.categories,
          cardType: card.cardType,
          categoryReason: card.categoryReason,
          categoryConfidence: card.categoryConfidence,
          categoryLocked: card.categoryLocked === true
        } : null
      };
    })
  };
  for (const result of selected) {
    const article = ARTICLES.find(item => item.id === result.articleId);
    const card = article?.knowledge.find(item => item.id === result.cardId);
    if (!card) continue;
    const existingOverride = S.knowledgeOverrides?.[result.articleId]?.[result.cardId] || {};
    const override = {
      ...existingOverride,
      category: result.suggested.category,
      categories: result.suggested.categories,
      cardType: result.suggested.cardType,
      categoryReason: result.categoryReason,
      categoryConfidence: result.categoryConfidence,
      categoryLocked: true,
      categorySources: result.sources || [],
      categoryVerifiedAt: Date.now()
    };
    S.knowledgeOverrides[result.articleId] = S.knowledgeOverrides[result.articleId] || {};
    S.knowledgeOverrides[result.articleId][result.cardId] = override;
    Object.assign(card, override);
  }
  S.knowledgeRevalidationBackups = [backup, ...(S.knowledgeRevalidationBackups || [])].slice(0, 20);
  save();
  state.selected.clear();
  renderCategoryRevalidationPreview();
  renderKB();
  if (cur) renderSide();
  if (activeKnowledge) renderKnowledgeDetail();
  $('#revalidationStatus').textContent = `已应用 ${selected.length} 张卡片的分类核验结果。`;
  $('#revalidationStatus').style.color = 'var(--teal)';
  $('#btnUndoCategoryRevalidation').hidden = false;
  toast(`已应用 ${selected.length} 张分类变更`);
}

function undoCategoryRevalidation() {
  const backup = (S.knowledgeRevalidationBackups || [])[0];
  if (!backup) return toast('没有可撤销的分类核验');
  for (const entry of backup.entries || []) {
    const article = ARTICLES.find(item => item.id === entry.articleId);
    const card = article?.knowledge.find(item => item.id === entry.cardId);
    if (!card) continue;
    if (entry.previousOverride) {
      S.knowledgeOverrides[entry.articleId][entry.cardId] = entry.previousOverride;
      Object.assign(card, entry.previousOverride, { categoryLocked: true });
    } else {
      if (S.knowledgeOverrides[entry.articleId]) delete S.knowledgeOverrides[entry.articleId][entry.cardId];
      if (entry.previous) Object.assign(card, entry.previous);
    }
  }
  S.knowledgeRevalidationBackups.shift();
  save();
  renderKB();
  if (cur) renderSide();
  if (activeKnowledge) renderKnowledgeDetail();
  $('#btnUndoCategoryRevalidation').hidden = !(S.knowledgeRevalidationBackups || []).length;
  $('#revalidationStatus').textContent = '已撤销上次分类核验。';
  $('#revalidationStatus').style.color = 'var(--ink-3)';
  toast('已撤销上次分类核验');
}

let activeKnowledge = null;
let knowledgeReturnView = 'knowledge';

function defaultKnowledgeAuthority(category) {
  if (category === 'background') {
    return { source: 'International Monetary Fund', description: 'IMF 提供全球经济、财政与金融稳定的官方分析。', url: 'https://www.imf.org/en/Publications' };
  }
  if (category === 'method') {
    return { source: 'Bank for International Settlements', description: 'BIS 提供金融分析、风险度量与市场结构研究。', url: 'https://www.bis.org/' };
  }
  return { source: 'Federal Reserve', description: '提供利率、货币政策与金融市场的一手背景。', url: 'https://www.federalreserve.gov/' };
}

function safeExternalUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return /^https?:$/.test(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function knowledgeTypeLabel(type) {
  return KNOWLEDGE_TYPES[type] || KNOWLEDGE_TYPES.concept;
}

function knowledgeSourceKind(kind) {
  return {
    official: '官方',
    report: '报告',
    paper: '论文',
    book: '书目',
    news: '新闻',
    reference: '参考',
    data: '数据'
  }[kind] || '来源';
}

function knowledgeResearchLabel(research) {
  if (!research) return '详解来源：未生成';
  if (research.status === 'disabled') return '详解来源：未联网';
  if (research.status === 'verified') return `详解来源：已核验 · ${research.verifiedSources || 0} 条`;
  if (research.status === 'unavailable') return '详解来源：核验失败';
  return '详解来源：无结果';
}

function openKnowledgeDetail(id) {
  activeKnowledge = allKnowledge().find(item => item.id === id) || null;
  if (!activeKnowledge) return;
  if (activeView !== 'knowledgeDetail') knowledgeReturnView = activeView;
  renderKnowledgeDetail();
  switchView('knowledgeDetail');
  $('#knowledgeDetailContent').scrollTop = 0;
}

function closeKnowledgeDetail() {
  switchView(knowledgeReturnView === 'knowledgeDetail' ? 'knowledge' : knowledgeReturnView);
}

function renderKnowledgeDetail(answer = null, loading = false) {
  const k = activeKnowledge;
  if (!k) return;
  const chatKey = knowledgeChatKey(k._aid, k.id);
  const savedMessages = S.knowledgeTutor[chatKey]?.messages || [];
  const inlineHistoryOpen = expandedInlineAIHistory.has(`knowledge:${chatKey}`);
  const displayedAnswer = answer || savedMessages[savedMessages.length - 1] || null;
  const detail = S.knowledgeDetails[k.id];
  const authority = k.authority || detail?.authority || defaultKnowledgeAuthority(k.category);
  const sources = Array.isArray(detail?.sources) ? detail.sources : [];
  const caseStudies = Array.isArray(detail?.caseStudies) ? detail.caseStudies : [];
  const cardType = detail?.cardType || k.cardType || (k.category === 'method' ? 'method' : 'concept');
  const research = detail?.research || null;
  const scenarios = Array.isArray(detail?.scenarios) ? detail.scenarios : [];
  const indicators = Array.isArray(detail?.indicators) ? detail.indicators : [];
  $('#knowledgeDetailTitle').textContent = `${k.term} · 详解`;
  $('#knowledgeDetailSub').textContent = `${KNOWLEDGE_CATEGORIES[k.category] || '金融术语'} · ${k._src || k.suggestedTag || '来源知识库'} ·《${k._title || '当前文章'}》`;
  const activeCategories = knowledgeCategoriesFor(k);
  $('#knowledgeDetailContent').innerHTML = `
    <div class="knowledge-detail-hero">
      <div class="knowledge-meta-line">
        <details class="knowledge-category-disclosure" id="knowledgeCategoryDisclosure">
          <summary class="knowledge-category-badge knowledge-category-summary" title="查看领域归类依据">
            <span class="knowledge-category-prefix">领域分类</span>${activeCategories.map(category => esc(KNOWLEDGE_CATEGORIES[category])).join(' · ')}<span class="knowledge-category-caret" aria-hidden="true">⌄</span>
          </summary>
          <div class="knowledge-category-detail" id="knowledgeCategoryDetail">
            <p>${esc(k.categoryReason || '分类由术语本身和文章语境共同判定。')}</p>
            ${k.categoryConfidence ? `<small>置信度 ${Math.round(Number(k.categoryConfidence) * 100)}%</small>` : ''}
            <small>分类核验：${k.categoryLocked ? '已确认，当前规则不会自动覆盖' : '待确认'}</small>
          </div>
        </details>
        <span class="knowledge-type-badge">${esc(knowledgeTypeLabel(cardType))}</span>
        ${knowledgeVerificationBadge(k)}
        <span class="knowledge-research-badge ${research?.status === 'verified' ? 'is-verified' : ''}">${esc(knowledgeResearchLabel(research))}</span>
        <button class="mini-btn" id="btnRevalidateCurrentCard" type="button">核验分类</button>
        ${k.suggestedTag ? `<span class="tag">${esc(k.suggestedTag)}</span>` : ''}
      </div>
      <h3>${esc(k.term)} <em>${esc(k.en || '')}</em></h3>
      <p class="knowledge-one">${esc(k.one)}</p>
    </div>
    <div class="knowledge-detail-section">
      <h4>知识卡类型</h4>
      <p><b>${esc(knowledgeTypeLabel(cardType))}</b>${detail?.classificationReason ? `：${esc(detail.classificationReason)}` : '。'}</p>
    </div>
    <div class="knowledge-detail-section">
      <h4>概念与详细解释</h4>
      <p>${esc(detail?.detail || k.body)}</p>
      ${detail?.mechanism ? `<h4>机制与逻辑</h4><p>${esc(detail.mechanism)}</p>` : ''}
    </div>
    ${scenarios.length || indicators.length ? `<div class="knowledge-detail-section">
      <h4>出现场景与观察指标</h4>
      ${scenarios.length ? `<div class="knowledge-scenario-list">${scenarios.map(item => `<p>${esc(item)}</p>`).join('')}</div>` : ''}
      ${indicators.length ? `<div class="knowledge-indicator-list">${indicators.map(item => `
        <div class="knowledge-indicator">
          <b>${esc(item.name || '指标')}</b>
          ${item.meaning ? `<span>${esc(item.meaning)}</span>` : ''}
          ${item.importance ? `<em>${esc(item.importance)}</em>` : ''}
        </div>`).join('')}</div>` : ''}
    </div>` : ''}
    <div class="knowledge-detail-section">
      <h4>案例与场景</h4>
      ${k.cases ? `<p>${esc(k.cases)}</p>` : ''}
      ${caseStudies.length ? `<div class="knowledge-case-list">${caseStudies.map(item => {
        if (typeof item === 'string') return `<div class="knowledge-case-item"><p>${esc(item)}</p></div>`;
        return `<div class="knowledge-case-item">
          <b>${esc(item.title || '案例')}</b>
          ${item.date || item.location ? `<div class="knowledge-case-meta">${[item.date, item.location].filter(Boolean).map(esc).join(' · ')}</div>` : ''}
          ${item.description ? `<p>${esc(item.description)}</p>` : ''}
          ${item.mechanism ? `<p><strong>机制：</strong>${esc(item.mechanism)}</p>` : ''}
          ${item.impact ? `<p><strong>影响：</strong>${esc(item.impact)}</p>` : ''}
          ${item.sourceTitle ? `<small>${esc(item.sourceTitle)}</small>` : ''}
        </div>`;
      }).join('')}</div>` : ''}
      ${(detail?.examples || []).length ? detail.examples.map(item => `<p>${esc(item)}</p>`).join('') : ''}
      ${!k.cases && !caseStudies.length && !(detail?.examples || []).length ? '<p>暂无可靠的案例材料。</p>' : ''}
    </div>
    ${(detail?.methodSteps || k.methodSteps || []).length ? `<div class="knowledge-detail-section">
      <h4>分析步骤</h4>
      ${(detail?.methodSteps || k.methodSteps).map((item, index) => `<p>${index + 1}. ${esc(item)}</p>`).join('')}
    </div>` : ''}
    <div class="knowledge-detail-section">
      <h4>权威书目与来源</h4>
      <div class="knowledge-authority">${esc(authority.source)}：${esc(authority.description)}<br><a href="${esc(authority.url)}" target="_blank" rel="noopener">${esc(authority.url)}</a></div>
      ${sources.length ? `<div class="knowledge-source-list">${sources.map(item => {
        if (typeof item === 'string') return `<div class="knowledge-source-item">${esc(item)}</div>`;
        const sourceUrl = safeExternalUrl(item.url);
        return `<div class="knowledge-source-item">
          <b>${esc(item.title || item.source || '补充来源')}${item.author ? ` · ${esc(item.author)}` : ''}</b>
          <span class="knowledge-source-meta">${knowledgeSourceKind(item.kind)}${item.publisher ? ` · ${esc(item.publisher)}` : ''}${item.date ? ` · ${esc(item.date)}` : ''}${item.verified ? ' · 已核验' : item.curated ? ' · 官方目录' : ' · 未核验'}</span>
          ${item.description ? `<span>${esc(item.description)}</span>` : ''}
          ${sourceUrl ? `<a href="${esc(sourceUrl)}" target="_blank" rel="noopener">查看来源</a>` : ''}
        </div>`;
      }).join('')}</div>` : ''}
    </div>
    <div class="knowledge-detail-section">
      <h4>证据与限制</h4>
      <p>${esc(detail?.caution || '当前解释基于文章、知识卡与已提供的权威来源；涉及数据和政策判断时应回到原始来源核验。')}</p>
      <p class="knowledge-research-note">${esc(research?.status === 'verified'
        ? `详解来源联网核验：已取得 ${research.verifiedSources || 0} 条可核验来源；官方目录只用于继续检索，不代表已逐条核验具体报告。`
        : research?.status === 'disabled'
          ? '详解来源联网核验：本次未启用联网核验。来源需点击官方入口继续确认。'
          : `详解来源联网核验：本次未取得完整结果${research?.error ? `：${research.error}` : '。'}请将解释视为待核验材料。`)}</p>
    </div>
    <div class="knowledge-detail-section">
      <h4>继续追问这张知识卡</h4>
      <textarea id="knowledgeQuestion" class="import-textarea" rows="3" placeholder="例如：这个机制在当前文章中如何影响长期利率？"></textarea>
      <div class="inline-actions">
        <button class="mini-btn" id="btnGenerateKnowledgeDetail">${detail ? '刷新专业详解' : '生成专业详解'}</button>
        <button class="mini-btn" id="btnAskKnowledge">向 AI 追问</button>
        <button class="mini-btn" id="btnKnowledgeHistory">${inlineHistoryOpen ? '收起问答历史' : `查看该知识卡问答历史 ${savedMessages.length || ''}`}</button>
        <span class="test-out" id="knowledgeAskStatus"></span>
      </div>
      ${loading ? '<div class="dict-loading">正在生成专业详解…</div>' : ''}
      ${inlineHistoryOpen
        ? inlineAIHistoryHtml(savedMessages, '知识卡问答历史', 'knowledgeInlineHistory', 'btnKnowledgeHistoryManage')
        : displayedAnswer ? renderKnowledgeAnswer(displayedAnswer) : ''}
    </div>`;
  $('#btnGenerateKnowledgeDetail').addEventListener('click', generateKnowledgeDetail);
  $('#btnAskKnowledge').addEventListener('click', askKnowledge);
  $('#btnRevalidateCurrentCard').addEventListener('click', () => openCategoryRevalidation({
    articleId: k._aid,
    cardId: k.id
  }));
  $('#btnKnowledgeHistory').addEventListener('click', () => {
    const key = `knowledge:${chatKey}`;
    if (expandedInlineAIHistory.has(key)) expandedInlineAIHistory.delete(key);
    else expandedInlineAIHistory.add(key);
    renderKnowledgeDetail();
  });
  const knowledgeHistoryManage = $('#btnKnowledgeHistoryManage');
  if (knowledgeHistoryManage) {
    knowledgeHistoryManage.addEventListener('click', () => openAIDataManager({
      articleId: k._aid,
      knowledgeId: k.id
    }));
  }
}

function renderKnowledgeAnswer(answer) {
  return `<div class="knowledge-answer">
    <b>直接回答</b><p>${esc(answer.answer || '')}</p>
    ${(answer.originalEvidence || []).length ? `<b>原文依据</b>${answer.originalEvidence.map(item => `<p>“${esc(item.quote || '')}” ${esc(item.interpretation || '')}</p>`).join('')}` : ''}
    ${(answer.knowledgeBasis || []).length ? `<b>知识库依据</b>${answer.knowledgeBasis.map(item => `<p>${esc(item)}</p>`).join('')}` : ''}
    ${(answer.authorityBasis || []).length ? `<b>权威依据</b>${answer.authorityBasis.map(item => `<p>${esc(item.source || '')}：${esc(item.description || '')}${item.url ? ` <a href="${esc(item.url)}" target="_blank" rel="noopener">官网</a>` : ''}</p>`).join('')}` : ''}
  </div>`;
}

async function askKnowledge() {
  const question = $('#knowledgeQuestion')?.value.trim();
  const status = $('#knowledgeAskStatus');
  if (!question) {
    status.textContent = '请先输入问题';
    return;
  }
  const article = ARTICLES.find(item => item.id === activeKnowledge._aid);
  status.textContent = '正在结合原文、知识卡和权威依据回答…';
  try {
    const response = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...(await modelRequestPayload()),
        title: article?.title || activeKnowledge._title,
        question,
        paragraphs: (article?.paragraphs || []).map(item => item.en.replace(/\{\{|\}\}/g, '')),
        knowledge: [{ ...activeKnowledge, body: S.knowledgeDetails[activeKnowledge.id]?.detail || activeKnowledge.body }]
      })
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || '追问失败');
    const key = knowledgeChatKey(activeKnowledge._aid, activeKnowledge.id);
    const group = S.knowledgeTutor[key] || {
      articleId: activeKnowledge._aid,
      knowledgeId: activeKnowledge.id,
      term: activeKnowledge.term,
      termEn: activeKnowledge.en || '',
      messages: []
    };
    group.messages = Array.isArray(group.messages) ? group.messages : [];
    group.messages.push({
      id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      q: question,
      a: data.result.answer || '',
      originalEvidence: data.result.originalEvidence || data.result.evidence || [],
      knowledgeBasis: data.result.knowledgeBasis || [],
      authorityBasis: data.result.authorityBasis || [],
      caution: data.result.caution || '',
      createdAt: Date.now()
    });
    S.knowledgeTutor[key] = group;
    save();
    renderKnowledgeDetail();
    $('#knowledgeQuestion').value = question;
  } catch (error) {
    status.textContent = error.message || '追问失败';
    status.style.color = 'var(--danger)';
  }
}

async function generateKnowledgeDetail() {
  const article = ARTICLES.find(item => item.id === activeKnowledge._aid);
  renderKnowledgeDetail(null, true);
  try {
    const response = await fetch('/api/knowledge', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...(await modelRequestPayload()),
        knowledge: activeKnowledge,
        title: article?.title || activeKnowledge._title,
        paragraphs: (article?.paragraphs || []).map(item => item.en.replace(/\{\{|\}\}/g, '')).slice(0, 12),
        researchOnline: S.settings.researchOnline !== false
      })
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || '详解生成失败');
    S.knowledgeDetails[activeKnowledge.id] = data.result;
    save();
    renderKnowledgeDetail();
  } catch (error) {
    renderKnowledgeDetail();
    $('#knowledgeAskStatus').textContent = error.message || '详解生成失败';
    $('#knowledgeAskStatus').style.color = 'var(--danger)';
  }
}

/* ================= 视图 4：导出 / 归档 ================= */
function wireExport() {
  $('#kbSearch').addEventListener('input', (e) => { kb.q = e.target.value; renderKB(); });
  $('#kbCategorySeg').addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (!button) return;
    kb.category = button.dataset.kcat;
    $$('#kbCategorySeg button').forEach(item => item.classList.toggle('on', item === button));
    renderKB();
  });
  $('#kbGrid').addEventListener('click', (e) => {
    const revalidateCard = e.target.closest('[data-revalidate-card]');
    if (revalidateCard) {
      openCategoryRevalidation({
        articleId: revalidateCard.dataset.aid,
        cardId: revalidateCard.dataset.revalidateCard
      });
      return;
    }
    const detailButton = e.target.closest('[data-know-detail]');
    if (detailButton) {
      openKnowledgeDetail(detailButton.dataset.knowDetail);
      return;
    }
    const card = e.target.closest('.kb-card');
    if (card) openKnowledgeDetail(card.dataset.kid);
  });
  $('#btnKnowledgeBack').addEventListener('click', closeKnowledgeDetail);
  $('#btnRevalidateKnowledgeCategories').addEventListener('click', openCategoryRevalidation);
  $('#categoryRevalidationModal').addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) {
      closeCategoryRevalidation();
      return;
    }
    const reviewContent = e.target.closest('[data-review-content-fix]');
    if (reviewContent) {
      openContentFixReview(reviewContent.dataset.reviewContentFix);
      return;
    }
    const scope = e.target.closest('[data-revalidate-scope]');
    if (scope) {
      $$('#revalidationScopeSeg button').forEach(button => button.classList.toggle('on', button === scope));
      categoryRevalidationState.results = [];
      categoryRevalidationState.selected.clear();
      renderCategoryRevalidationPreview();
      return;
    }
    const pick = e.target.closest('[data-revalidation-pick]');
    if (pick) {
      if (pick.checked) categoryRevalidationState.selected.add(pick.dataset.revalidationPick);
      else categoryRevalidationState.selected.delete(pick.dataset.revalidationPick);
      $('#btnApplyCategoryRevalidation').disabled = categoryRevalidationState.selected.size === 0;
    }
  });
  $('#contentFixModal').addEventListener('click', (e) => {
    if (e.target.closest('[data-close]') || e.target.id === 'btnCancelContentFix') closeContentFixReview();
    if (e.target.id === 'btnApplyContentFix') applyContentFixReview();
  });
  $('#btnRunCategoryRevalidation').addEventListener('click', runCategoryRevalidation);
  $('#btnApplyCategoryRevalidation').addEventListener('click', applyCategoryRevalidation);
  $('#btnUndoCategoryRevalidation').addEventListener('click', undoCategoryRevalidation);

  $('#exportList').addEventListener('change', () => {
    S.exportPicks.initialized = true;
    S.exportPicks.articleIds = $$('#exportList input:checked').map(input => input.value);
    save();
    renderExportSelectionState();
  });
  $('#btnSelectReadExport').addEventListener('click', () => {
    S.exportPicks.initialized = true;
    S.exportPicks.articleIds = ARTICLES.filter(article => isRead(article.id)).map(article => article.id);
    if (!S.exportPicks.articleIds.length) toast('当前还没有已精读文章');
    save();
    renderExport();
  });
  $('#btnClearExportSelection').addEventListener('click', () => {
    S.exportPicks.initialized = true;
    S.exportPicks.articleIds = [];
    save();
    renderExport();
  });
  ['expZh', 'expVocab', 'expKnow', 'expAnalysis', 'expNotes'].forEach(id => {
    $('#' + id).addEventListener('change', () => {
      S.exportPicks.options = readExportOptions();
      save();
    });
  });
  $('#exportFocusSelect').addEventListener('change', (e) => {
    S.exportPicks.options.focus = e.target.value;
    save();
    renderExportSelectionState();
  });
  $('#exportAnalysisSummary').addEventListener('change', (e) => {
    if (e.target.id === 'exportAnalysisSelectAll') {
      const keys = $$('#exportAnalysisSummary input[data-export-analysis-pick]')
        .map(input => input.dataset.exportAnalysisPick);
      setExportAnalysisKeys(keys, e.target.checked);
      return;
    }
    if (e.target.matches('[data-select-article-analysis]')) {
      const group = e.target.closest('.export-analysis-group');
      const keys = group
        ? $$('input[data-export-analysis-pick]', group).map(input => input.dataset.exportAnalysisPick)
        : [];
      setExportAnalysisKeys(keys, e.target.checked);
      return;
    }
    const pick = e.target.closest('[data-export-analysis-pick]');
    if (!pick) return;
    const [articleId, indexText] = String(pick.dataset.exportAnalysisPick || '').split(':');
    toggleAnalysisImport(articleId, Number(indexText));
  });
  $('#btnExportMd').addEventListener('click', exportMarkdown);
  $('#btnExportPdf').addEventListener('click', exportPdf);
  $('#btnExportJson').addEventListener('click', exportBackup);
  $('#exportArchiveList').addEventListener('click', (e) => {
    const button = e.target.closest('[data-regenerate-export]');
    if (!button) return;
    regenerateExport(button.dataset.regenerateExport);
  });
  $('#btnClearExportArchive').addEventListener('click', () => {
    if (!S.exportArchive.length) return;
    if (!confirm('清空全部产出归档记录？已下载的文件不会受影响。')) return;
    S.exportArchive = [];
    save();
    renderExportArchive();
    toast('产出归档记录已清空');
  });
  $('#btnImportData').addEventListener('click', () => $('#backupFile').click());
  $('#backupFile').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const raw = JSON.parse(await file.text());
      if (!raw || typeof raw !== 'object' || !raw.settings || !raw.words) throw new Error('文件结构不完整');
      if (!confirm('恢复学习数据会覆盖当前进度，继续吗？')) return;
      let storedMwKey = '';
      let currentLocalCredentialId = '';
      let currentCcSwitchProviderId = '';
      let currentCcSwitchAppType = '';
      try {
        const storedSettings = JSON.parse(localStorage.getItem(LS_KEY) || '{}').settings || {};
        storedMwKey = storedSettings.mwApiKey || '';
        currentLocalCredentialId = storedSettings.localCredentialId || '';
        currentCcSwitchProviderId = storedSettings.ccSwitchProviderId || '';
        currentCcSwitchAppType = storedSettings.ccSwitchAppType || '';
      } catch (e) {}
      const currentMwKey = storedMwKey || S.settings.mwApiKey || '';
      S = {
        ...loadState(),
        ...raw,
        settings: {
          ...DEFAULT_SETTINGS,
          ...(raw.settings || {}),
          apiKey: '',
          localCredentialId: currentLocalCredentialId,
          ccSwitchProviderId: currentCcSwitchProviderId,
          ccSwitchAppType: currentCcSwitchAppType,
          mwApiKey: currentMwKey
        },
        custom: Array.isArray(raw.custom) ? raw.custom : []
      };
      save();
      location.reload();
    } catch (err) {
      toast('恢复失败：' + (err.message || '文件格式不正确'));
    }
  });
}

function backupPayload() {
  const backup = JSON.parse(JSON.stringify(S));
  backup.settings = { ...(backup.settings || {}), apiKey: '', mwApiKey: '' };
  return backup;
}

function scheduleAutoBackup() {
  if (!S || backupTimer || backupRunning || Date.now() - lastBackupAt < 15000) return;
  backupTimer = setTimeout(() => {
    backupTimer = null;
    saveBackupNow(true);
  }, 2500);
}

async function saveBackupNow(silent = false) {
  if (backupRunning) return;
  backupRunning = true;
  const status = $('#backupStatus');
  if (status && !silent) status.textContent = '正在保存学习日志…';
  try {
    const response = await fetch('/api/backup' + (navigator.webdriver ? '?automation=1' : ''), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(backupPayload())
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || '保存失败');
    lastBackupAt = Date.now();
    if (status) {
      status.textContent = `已自动保存到 ${data.path}`;
      status.style.color = 'var(--teal)';
    }
    if (!silent) {
      const backupName = String(data.path || '学习日志备份.json').split('/').pop();
      recordExport('backup', [], {}, backupName);
      toast('学习日志已保存到 data/backups');
    }
  } catch (error) {
    if (status) {
      status.textContent = `自动保存失败：${error.message || error}`;
      status.style.color = 'var(--danger)';
    }
    if (!silent) toast('学习日志保存失败');
  } finally {
    backupRunning = false;
  }
}

function exportBackup() {
  saveBackupNow(false);
}

function wireBackupLifecycle() {
  if (wireBackupLifecycle.done) return;
  wireBackupLifecycle.done = true;
  scheduleAutoBackup();
  window.addEventListener('beforeunload', () => {
    if (!S) return;
    const blob = new Blob([JSON.stringify(backupPayload())], { type: 'application/json' });
    navigator.sendBeacon('/api/backup' + (navigator.webdriver ? '?automation=1' : ''), blob);
  });
}

function readExportOptions() {
  return {
    zh: $('#expZh').checked,
    vocab: $('#expVocab').checked,
    know: $('#expKnow').checked,
    analysis: $('#expAnalysis').checked,
    notes: $('#expNotes').checked,
    focus: $('#exportFocusSelect').value || 'article'
  };
}

function applyExportOptions(options = S.exportPicks.options) {
  const resolved = { ...EXPORT_OPTION_DEFAULTS, ...(options || {}) };
  $('#expZh').checked = resolved.zh !== false;
  $('#expVocab').checked = resolved.vocab !== false;
  $('#expKnow').checked = resolved.know !== false;
  $('#expAnalysis').checked = resolved.analysis !== false;
  $('#expNotes').checked = resolved.notes === true;
  $('#exportFocusSelect').value = resolved.focus || 'article';
}

function exportFocusFor(article) {
  const focus = S.vocabOverrides?.[article.id]?.focus || S.settings.vocabFocus || 'balanced';
  const labels = {
    balanced: '通用财经词汇',
    ielts: 'IELTS 学术词汇',
    toefl: 'TOEFL 学术词汇',
    finance: '金融术语优先'
  };
  return labels[focus] || labels.balanced;
}

function normalizeVocabularyLookup(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/^[^a-z]+|[^a-z]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeVocabularyExamTag(value) {
  const raw = decodeHtmlText(value || '').trim();
  const compact = raw.replace(/[\s_-]+/g, '').toUpperCase();
  if (compact === 'CET4' || compact === 'CET6') return '';
  return raw.toUpperCase();
}

const EXPORT_FOCUS_LABELS = {
  article: '沿用每篇文章',
  balanced: '通用财经词汇',
  ielts: 'IELTS 学术词汇',
  toefl: 'TOEFL 学术词汇',
  finance: '金融术语优先'
};

function exportVocabularyFor(article, options = S.exportPicks.options) {
  const focus = options?.focus || 'article';
  if (focus === 'article' || focus === 'balanced' || !article.vocab.length) return article.vocab;
  const target = normalizeVocabularyExamTag(focus);
  const matching = article.vocab.filter(vocab =>
    (vocab.exam || []).some(tag => normalizeVocabularyExamTag(tag) === target));
  return matching.length ? matching : article.vocab;
}

function exportVocabularyFocusLabel(article, options = S.exportPicks.options) {
  const focus = options?.focus || 'article';
  return focus === 'article' ? exportFocusFor(article) : EXPORT_FOCUS_LABELS[focus] || EXPORT_FOCUS_LABELS.balanced;
}

function selectedAnalysisEntries(list = selectedArticles()) {
  return list.flatMap(article => (S.exportPicks?.analysis?.[article.id] || [])
    .filter(index => Number.isInteger(index) && article.paragraphs[index])
    .map(index => ({ article, index, paragraph: article.paragraphs[index] })));
}

function setExportAnalysisKeys(keys, select) {
  for (const key of keys || []) {
    const splitAt = key.lastIndexOf(':');
    if (splitAt < 0) continue;
    const articleId = key.slice(0, splitAt);
    const index = Number(key.slice(splitAt + 1));
    if (!Number.isInteger(index)) continue;
    const selected = new Set(S.exportPicks.analysis[articleId] || []);
    if (select) {
      selected.add(index);
      if (!S.exportPicks.articleIds.includes(articleId)) S.exportPicks.articleIds.push(articleId);
    } else {
      selected.delete(index);
    }
    if (selected.size) S.exportPicks.analysis[articleId] = [...selected].sort((a, b) => a - b);
    else delete S.exportPicks.analysis[articleId];
  }
  save();
  renderExport();
}

function renderExport() {
  if (!S.exportPicks.initialized) {
    S.exportPicks.articleIds = ARTICLES.filter(article => isRead(article.id)).map(article => article.id);
    S.exportPicks.initialized = true;
  }
  const knownIds = new Set(ARTICLES.map(article => article.id));
  S.exportPicks.articleIds = S.exportPicks.articleIds.filter(id => knownIds.has(id));
  applyExportOptions();
  $('#exportList').innerHTML = ARTICLES.map(a => `
    <label class="exp-row">
      <input type="checkbox" value="${esc(a.id)}" ${S.exportPicks.articleIds.includes(a.id) ? 'checked' : ''}>
      <span class="et">${esc(a.title)}</span>
      <span class="em">${esc(a.source)} · ${a.level}</span>
    </label>`).join('');
  renderExportSelectionState();
  renderExportArchive();
}

function renderExportSelectionState() {
  const list = selectedArticles();
  const analysis = selectedAnalysisEntries(list);
  const readiness = $('#exportReadiness');
  if (readiness) {
    readiness.innerHTML = `<b>${list.length}</b>篇文章<span>${analysis.length} 个精读解析选段</span>`;
  }
  const focusBadge = $('#exportFocusBadge');
  if (focusBadge) {
    const selectedFocus = S.exportPicks.options.focus || 'article';
    if (!list.length) {
      focusBadge.textContent = '未选择文章';
    } else if (selectedFocus !== 'article') {
      focusBadge.textContent = EXPORT_FOCUS_LABELS[selectedFocus];
    } else {
      const focuses = [...new Set(list.map(exportFocusFor))];
      focusBadge.textContent = focuses.length === 1 ? focuses[0] : '按文章词汇侧重';
    }
  }
  renderExportAnalysisSummary(list, analysis);
}

function renderExportAnalysisSummary(list = selectedArticles(), analysis = selectedAnalysisEntries(list)) {
  const container = $('#exportAnalysisSummary');
  if (!container) return;
  const selected = new Set(analysis.map(item => `${item.article.id}:${item.index}`));
  const groups = list.map(article => ({
    article,
    indices: article.paragraphs
      .map((paragraph, index) => ({
        paragraph,
        index,
        usable: Boolean(
          paragraph.note ||
          paragraph.analysis?.english?.longSentence ||
          paragraph.analysis?.english?.grammar ||
          paragraph.analysis?.english?.expression ||
          paragraph.analysis?.finance?.term ||
          paragraph.analysis?.finance?.background ||
          paragraph.analysis?.finance?.relevance
        )
      }))
      .filter(item => item.usable)
  })).filter(group => group.indices.length);
  if (!groups.length) {
    container.innerHTML = '<div class="export-analysis-empty">所选文章还没有精读解析内容。</div>';
    return;
  }
  const availableCount = groups.reduce((sum, group) => sum + group.indices.length, 0);
  const allSelected = availableCount > 0 && analysis.length === availableCount;
  const partiallySelected = analysis.length > 0 && !allSelected;
  container.innerHTML = `<div class="export-analysis-title">
    <label class="analysis-select-all">
      <input type="checkbox" id="exportAnalysisSelectAll" ${allSelected ? 'checked' : ''}>
      <b>全选</b>
    </label>
    <span>已选 ${analysis.length} / ${availableCount} 段 · 勾选后会进入本次讲义</span>
  </div>` + groups.map(({ article, indices }) => {
    const selectedCount = indices.filter(item => selected.has(`${article.id}:${item.index}`)).length;
    const articleAllSelected = selectedCount === indices.length;
    return `<div class="export-analysis-group" data-export-analysis-group="${esc(article.id)}">
      <div class="export-analysis-group-head">
        <b>${esc(article.title)}</b>
        <label class="analysis-select-article">
          <input type="checkbox" data-select-article-analysis="${esc(article.id)}" ${articleAllSelected ? 'checked' : ''}>
          <span>全选本文</span>
        </label>
        <span>${selectedCount}/${indices.length} 段</span>
      </div>
      <div class="export-analysis-picks">
        ${indices.map(({ paragraph, index }) => {
          const excerpt = decodeHtmlText(paragraph.en).replace(/\{\{|\}\}/g, '').replace(/\s+/g, ' ').trim();
          const summary = paragraph.analysis?.english?.longSentence ||
            paragraph.analysis?.english?.grammar ||
            paragraph.analysis?.finance?.background ||
            paragraph.note ||
            '包含英语层与金融层解析';
          const key = `${article.id}:${index}`;
          return `<label class="analysis-pick-row">
            <input type="checkbox" data-export-analysis-pick="${esc(key)}" ${selected.has(key) ? 'checked' : ''}>
            <span class="analysis-pick-index">${String(index + 1).padStart(2, '0')}</span>
            <span class="analysis-pick-copy">
              <b>第 ${String(index + 1).padStart(2, '0')} 段 · ${esc(excerpt.slice(0, 92))}${excerpt.length > 92 ? '…' : ''}</b>
              <span>${esc(String(summary).slice(0, 110))}${String(summary).length > 110 ? '…' : ''}</span>
            </span>
          </label>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
  const selectAll = $('#exportAnalysisSelectAll');
  if (selectAll) selectAll.indeterminate = partiallySelected;
  $$('#exportAnalysisSummary input[data-select-article-analysis]').forEach(input => {
    const group = input.closest('.export-analysis-group');
    const picks = group ? $$('input[data-export-analysis-pick]', group) : [];
    const checked = picks.filter(pick => pick.checked).length;
    input.indeterminate = checked > 0 && checked < picks.length;
  });
}

function renderArchive() {
  const readIds = Object.keys(S.read).filter(id => S.read[id].done);
  const wIds = Object.keys(S.words);
  const due = wIds.filter(id => (S.words[id].due || 0) <= Date.now()).length;
  const marks = Object.values(S.marks).reduce((n, l) => n + l.length, 0);
  const quiz = wIds.reduce((n, id) => n + (S.words[id].right || 0) + (S.words[id].wrong || 0), 0);

  $('#archiveStats').innerHTML = `
    <div class="as-box"><b>${readIds.length}</b><span>已精读文章</span></div>
    <div class="as-box"><b>${wIds.length}</b><span>生词本</span></div>
    <div class="as-box"><b>${due}</b><span>待复习</span></div>
    <div class="as-box"><b>${marks}</b><span>收藏段落</span></div>
    <div class="as-box"><b>${quiz}</b><span>累计答题</span></div>
    <div class="as-box"><b>${streak()}</b><span>连续学习天数</span></div>`;

  const recent = ARTICLES.filter(a => S.read[a.id] && S.read[a.id].done)
    .sort((x, y) => (S.read[y.id].ts || 0) - (S.read[x.id].ts || 0)).slice(0, 5);
  $('#archiveRecent').innerHTML = recent.map(a => `
    <div class="ar-row"><span class="t">${esc(a.title)}</span>
      <span class="d">${new Date(S.read[a.id].ts || Date.now()).toLocaleDateString('zh-CN')}</span></div>`
  ).join('') || '<div class="empty-tip" style="padding:14px">还没有完成的文章</div>';

  const byTopic = {};
  ARTICLES.forEach(a => {
    byTopic[a.topic] = byTopic[a.topic] || { n: 0, r: 0 };
    byTopic[a.topic].n++;
    if (isRead(a.id)) byTopic[a.topic].r++;
  });
  $('#topicBars').innerHTML = Object.entries(byTopic).map(([t, o]) => {
    const name = (TOPICS.find(x => x.id === t) || {}).name || t;
    const p = Math.round(o.r / o.n * 100);
    return `<div class="tb-row"><span class="n">${name}</span>
      <span class="bar"><i style="width:${p}%"></i></span>
      <span class="p">${o.r}/${o.n}</span></div>`;
  }).join('');
}

function renderExportArchive() {
  const container = $('#exportArchiveList');
  if (!container) return;
  const items = [...(S.exportArchive || [])].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  if (!items.length) {
    container.innerHTML = '<div class="export-archive-empty">还没有产出记录。生成 PDF 或 Markdown 后会在这里留下可重生成的归档。</div>';
    return;
  }
  container.innerHTML = items.slice(0, 12).map(item => {
    const kind = item.kind === 'markdown' ? 'markdown' : item.kind === 'backup' ? 'backup' : 'pdf';
    const typeLabel = kind === 'markdown' ? 'MD' : kind === 'backup' ? 'LOG' : 'PDF';
    const title = item.filename || (kind === 'backup' ? '学习日志备份' : 'FinLens 精读讲义');
    const count = (item.articleIds || []).length;
    const analysisCount = Number(item.analysisCount || 0);
    const created = item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    }) : '';
    const regenerate = kind === 'backup'
      ? ''
      : `<button class="mini-btn" type="button" data-regenerate-export="${esc(item.id)}">重新生成</button>`;
    return `<div class="export-archive-item">
      <span class="export-type ${kind}">${typeLabel}</span>
      <div class="export-archive-main">
        <b>${esc(title)}</b>
        <span>${count} 篇文章${analysisCount ? ` · ${analysisCount} 段解析` : ''}</span>
      </div>
      <span class="export-archive-time">${esc(created)}</span>
      ${regenerate}
    </div>`;
  }).join('');
}

function recordExport(kind, list, options, filename, extra = {}) {
  const item = {
    id: `export-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kind,
    filename,
    articleIds: list.map(article => article.id),
    analysisCount: selectedAnalysisEntries(list).length,
    options: { ...options },
    createdAt: Date.now(),
    ...extra
  };
  S.exportArchive = [item, ...(S.exportArchive || [])].slice(0, 30);
  save();
  renderExportArchive();
  return item;
}

function regenerateExport(exportId) {
  const item = (S.exportArchive || []).find(entry => entry.id === exportId);
  if (!item) return;
  const knownIds = new Set(ARTICLES.map(article => article.id));
  S.exportPicks.initialized = true;
  S.exportPicks.articleIds = (item.articleIds || []).filter(id => knownIds.has(id));
  S.exportPicks.options = { ...EXPORT_OPTION_DEFAULTS, ...(item.options || {}) };
  renderExport();
  if (item.kind === 'markdown') exportMarkdown();
  else exportPdf();
}

function handoutKnowledgeHtml(card) {
  const categories = knowledgeCategoriesFor(card)
    .map(category => `<span class="knowledge-category">${esc(KNOWLEDGE_CATEGORIES[category])}</span>`)
    .join('');
  return `<article class="knowledge-card">
    <div class="knowledge-labels">${categories}<span class="knowledge-type">${esc(knowledgeTypeLabel(card.cardType))}</span></div>
    <h3>${esc(card.term)} <em>${esc(card.en || '')}</em></h3>
    <p class="knowledge-one">${esc(card.one)}</p>
    <p>${esc(card.body)}</p>
    ${card.cases ? `<div class="knowledge-case"><b>案例</b>${esc(card.cases)}</div>` : ''}
  </article>`;
}

function handoutAnalysisHtml(article, options) {
  if (!options.analysis) return '';
  const indices = (S.exportPicks?.analysis?.[article.id] || [])
    .filter(index => article.paragraphs[index])
    .sort((a, b) => a - b);
  if (!indices.length) return '';
  return `<section class="handout-section analysis-section">
    <div class="section-heading"><span>03</span><h2>精读解析选段</h2><small>${indices.length} 段</small></div>
    ${indices.map(index => {
      const paragraph = article.paragraphs[index];
      const english = paragraph.analysis?.english || {};
      const finance = paragraph.analysis?.finance || {};
      const focus = paragraph.analysis?.focus || {};
      const englishRows = [
        ['长难句', english.longSentence],
        ['语法逻辑', english.grammar],
        ['表达', english.expression]
      ].filter(([, value]) => value);
      if (!englishRows.length && paragraph.note) englishRows.push(['难点', paragraph.note]);
      const financeRows = [
        ['术语', finance.term],
        ['背景机制', finance.background],
        ['文章关联', finance.relevance]
      ].filter(([, value]) => value);
      return `<article class="analysis-selection">
        <div class="analysis-selection-head">
          <span>PARAGRAPH ${String(index + 1).padStart(2, '0')}</span>
          <b>第 ${index + 1} 段</b>
        </div>
        <blockquote>${esc(decodeHtmlText(paragraph.en).replace(/\{\{|\}\}/g, ''))}</blockquote>
        <div class="analysis-selection-grid">
          <section class="analysis-column english-column">
            <h4>英语层</h4>
            ${englishRows.map(([label, value]) => `<p><b>${label}</b>${esc(value)}</p>`).join('') || '<p class="muted">暂无英语层解析</p>'}
          </section>
          <section class="analysis-column finance-column">
            <h4>金融层</h4>
            ${financeRows.map(([label, value]) => `<p><b>${label}</b>${esc(value)}</p>`).join('') || '<p class="muted">暂无金融层解析</p>'}
          </section>
        </div>
        ${(focus.label || focus.guidance || (focus.recommendations || []).length) ? `
        <div class="analysis-focus-note">
          <h4>${esc(focus.label || '学习侧重')}</h4>
          ${focus.guidance ? `<p>${esc(focus.guidance)}</p>` : ''}
          ${(focus.recommendations || []).length ? `<div>${focus.recommendations.map(item =>
            `<span>${esc(item)}</span>`).join('')}</div>` : ''}
        </div>` : ''}
      </article>`;
    }).join('')}
  </section>`;
}

function handoutArticleHtml(article, number, options) {
  const notes = S.marks[article.id] || [];
  const vocabulary = exportVocabularyFor(article, options);
  return `<article class="handout-article">
    <header class="article-heading">
      <div class="article-number">${String(number).padStart(2, '0')}</div>
      <div class="article-title-wrap">
        <span class="article-kicker">${esc(article.source)} · ${esc(article.date)}</span>
        <h1>${esc(article.title)}</h1>
        <p>${esc(article.deck || '')}</p>
        <div class="article-meta"><span>${esc(article.level)}</span><span>${totalWords(article)} words</span><span>${exportFocusFor(article)}</span></div>
      </div>
    </header>
    <section class="handout-section">
      <div class="section-heading"><span>01</span><h2>原文与译文</h2><small>${article.paragraphs.length} 段</small></div>
      <div class="paragraph-list">
        ${article.paragraphs.map((paragraph, index) => `<div class="handout-paragraph">
          <span class="paragraph-number">${String(index + 1).padStart(2, '0')}</span>
          <div class="paragraph-copy">
            <p class="paragraph-en">${esc(decodeHtmlText(paragraph.en).replace(/\{\{|\}\}/g, ''))}</p>
            ${options.zh && paragraph.zh ? `<p class="paragraph-zh">${esc(paragraph.zh)}</p>` : ''}
          </div>
        </div>`).join('')}
      </div>
    </section>
    ${handoutAnalysisHtml(article, options)}
    ${options.vocab && vocabulary.length ? `<section class="handout-section vocabulary-section">
      <div class="section-heading"><span>${options.analysis ? '04' : '03'}</span><h2>本篇词汇</h2><small>${esc(exportVocabularyFocusLabel(article, options))}</small></div>
      <table class="vocab-table">
        <thead><tr><th>词汇</th><th>音标 / 词性</th><th>语境释义</th><th>English</th></tr></thead>
        <tbody>${vocabulary.map(vocab => `<tr>
          <td><b>${esc(vocab.w)}</b></td>
          <td>${esc(vocab.ipa || '')}${vocab.pos ? `<br><span>${esc(vocab.pos)}</span>` : ''}</td>
          <td>${esc(vocab.zh)}</td>
          <td>${esc(vocab.en || '')}</td>
        </tr>`).join('')}</tbody>
      </table>
    </section>` : ''}
    ${options.know && article.knowledge.length ? `<section class="handout-section knowledge-section">
      <div class="section-heading"><span>${options.analysis ? '05' : '04'}</span><h2>知识卡</h2><small>${article.knowledge.length} 张</small></div>
      <div class="knowledge-grid">${article.knowledge.map(handoutKnowledgeHtml).join('')}</div>
    </section>` : ''}
    ${options.notes && notes.length ? `<section class="handout-section notes-section">
      <div class="section-heading"><span>${options.analysis ? '06' : '05'}</span><h2>我的标注</h2><small>${notes.length} 条</small></div>
      ${notes.map(mark => `<div class="handout-note">
        <span>${mark.type === 'sentence' ? '句子' : '段落'} · 第 ${mark.i + 1} 段</span>
        <p>${esc(mark.text)}</p>
        ${mark.note ? `<small>${esc(mark.note)}</small>` : ''}
      </div>`).join('')}
    </section>` : ''}
  </article>`;
}

function buildHandoutHtml(list, options, meta = {}) {
  const analysisCount = selectedAnalysisEntries(list).length;
  const contents = list.map((article, index) => `<li>
    <span>${String(index + 1).padStart(2, '0')}</span>
    <b>${esc(article.title)}</b>
    <small>${esc(article.source)} · ${article.level}</small>
  </li>`).join('');
  const optionLabels = [
    options.zh && '逐段译文',
    options.vocab && '本篇词汇',
    options.know && '知识卡',
    options.analysis && analysisCount && `${analysisCount} 段精读解析`,
    options.notes && '我的标注'
  ].filter(Boolean);
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>FinLens 财经外刊精读讲义</title>
<style>
@page { size: A4; margin: 15mm 15mm 17mm; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body {
  margin: 0; color: #211f1d; background: #fbf8f2;
  font: 10pt/1.68 "Noto Sans CJK SC", "Source Han Sans SC", "Microsoft YaHei", sans-serif;
}
h1, h2, h3, h4, p { margin-top: 0; }
.handout-cover {
  min-height: 258mm; display: flex; flex-direction: column;
  break-after: page; padding: 10mm 4mm 3mm;
}
.cover-rule { width: 42mm; height: 4px; background: #b84239; margin-bottom: 16mm; }
.cover-kicker { color: #b84239; font: 700 9pt/1.2 "Courier New", monospace; letter-spacing: .1em; }
.handout-cover h1 { margin: 7mm 0 3mm; color: #211f1d; font: 700 30pt/1.2 Georgia, "Songti SC", serif; letter-spacing: 0; }
.cover-subtitle { max-width: 126mm; margin: 0 0 14mm; color: #5d5650; font-size: 11pt; line-height: 1.8; }
.cover-summary { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid #d8cec1; border-bottom: 1px solid #d8cec1; }
.cover-stat { padding: 5mm 4mm; border-right: 1px solid #e6ddd1; }
.cover-stat:last-child { border-right: 0; }
.cover-stat b { display: block; color: #211f1d; font: 700 20pt/1.2 Georgia, serif; }
.cover-stat span { color: #7c746c; font-size: 8.5pt; }
.cover-contents { margin-top: 13mm; }
.cover-contents h2 { margin-bottom: 5mm; color: #514b46; font-size: 10pt; letter-spacing: .04em; }
.cover-contents ol { list-style: none; padding: 0; margin: 0; }
.cover-contents li { display: grid; grid-template-columns: 12mm minmax(0, 1fr) auto; align-items: baseline; gap: 4mm; padding: 3.2mm 0; border-bottom: 1px solid #e9e1d6; }
.cover-contents li > span { color: #b84239; font: 700 8.5pt "Courier New", monospace; }
.cover-contents li > b { font: 600 10pt Georgia, "Songti SC", serif; }
.cover-contents li > small { color: #7c746c; font-size: 8pt; }
.cover-foot { margin-top: auto; padding-top: 10mm; color: #7c746c; font-size: 8.5pt; display: flex; justify-content: space-between; gap: 10mm; }
.cover-tags { display: flex; flex-wrap: wrap; gap: 2mm; }
.cover-tags span { padding: 1.4mm 2.4mm; border: 1px solid #d8cec1; color: #514b46; background: #f2ebe1; }
.handout-article { break-before: page; }
.article-heading { display: grid; grid-template-columns: 17mm minmax(0, 1fr); gap: 7mm; padding-bottom: 9mm; border-bottom: 2px solid #211f1d; }
.article-number { color: #b84239; font: 700 24pt/1 "Courier New", monospace; }
.article-kicker { color: #7c746c; font: 8pt/1.3 "Courier New", monospace; letter-spacing: .03em; }
.article-title-wrap h1 { margin: 2mm 0; color: #211f1d; font: 700 21pt/1.25 Georgia, "Songti SC", serif; }
.article-title-wrap > p { margin-bottom: 4mm; color: #5d5650; font-size: 9.5pt; }
.article-meta { display: flex; flex-wrap: wrap; gap: 2mm; }
.article-meta span { padding: 1.2mm 2.2mm; background: #f1e9de; color: #514b46; font-size: 8pt; }
.handout-section { margin-top: 10mm; }
.section-heading { display: grid; grid-template-columns: 10mm minmax(0, 1fr) auto; align-items: baseline; gap: 4mm; margin-bottom: 5mm; padding-bottom: 2.5mm; border-bottom: 1px solid #d8cec1; break-after: avoid; }
.section-heading > span { color: #b84239; font: 700 8pt "Courier New", monospace; }
.section-heading h2 { margin: 0; color: #211f1d; font: 700 13pt/1.3 Georgia, "Songti SC", serif; }
.section-heading small { color: #7c746c; font-size: 8pt; }
.paragraph-list { display: flex; flex-direction: column; gap: 5mm; }
.handout-paragraph { display: grid; grid-template-columns: 10mm minmax(0, 1fr); gap: 4mm; break-inside: avoid; }
.paragraph-number { color: #a99d91; font: 8pt/1.5 "Courier New", monospace; }
.paragraph-en { margin-bottom: 2.2mm; color: #211f1d; font: 10.5pt/1.78 Georgia, "Times New Roman", serif; }
.paragraph-zh { margin: 0; padding-left: 4mm; border-left: 2px solid #d8cec1; color: #5d5650; font-size: 9pt; line-height: 1.8; }
.vocab-table { width: 100%; border-collapse: collapse; font-size: 8.5pt; break-inside: auto; }
.vocab-table thead { display: table-header-group; }
.vocab-table th { padding: 2.5mm; background: #211f1d; color: #fff8ef; text-align: left; font-size: 8pt; font-weight: 600; }
.vocab-table td { padding: 2.5mm; border-bottom: 1px solid #e6ddd1; vertical-align: top; line-height: 1.55; }
.vocab-table td b { color: #211f1d; font: 700 10pt Georgia, serif; }
.vocab-table td span { color: #7c746c; }
.analysis-section { break-before: page; }
.analysis-selection { break-inside: avoid; margin-bottom: 6mm; padding: 4.5mm; border: 1px solid #d8cec1; background: #fffaf2; }
.analysis-selection-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2.5mm; color: #b84239; font: 8pt "Courier New", monospace; }
.analysis-selection-head b { color: #514b46; font-weight: 600; }
.analysis-selection blockquote { margin: 0 0 4mm; padding-left: 4mm; border-left: 2px solid #b84239; color: #514b46; font: 9.5pt/1.7 Georgia, serif; }
.analysis-selection-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
.analysis-column { padding: 3mm; border-top: 2px solid #4f5f57; background: #fbf8f2; }
.finance-column { border-top-color: #c48a27; }
.analysis-column h4 { margin-bottom: 2mm; color: #4f5f57; font-size: 9pt; }
.finance-column h4 { color: #8a5b13; }
.analysis-column p { margin-bottom: 2.2mm; color: #514b46; font-size: 8.5pt; line-height: 1.65; }
.analysis-column p b { display: block; margin-bottom: .6mm; color: #211f1d; font-size: 8pt; }
.analysis-column .muted { color: #a99d91; }
.analysis-focus-note { margin-top: 4mm; padding: 3mm; border: 1px solid #d8cec1; background: #f2ebe1; }
.analysis-focus-note h4 { margin-bottom: 1.5mm; color: #4f5f57; font-size: 9pt; }
.analysis-focus-note p { margin-bottom: 2mm; color: #514b46; font-size: 8.5pt; line-height: 1.65; }
.analysis-focus-note div { display: flex; flex-wrap: wrap; gap: 2mm; }
.analysis-focus-note span { padding: 1mm 2mm; border: 1px solid #d8cec1; color: #4f5f57; font-size: 8pt; }
.knowledge-section { break-before: page; }
.knowledge-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
.knowledge-card { break-inside: avoid; padding: 4mm; border: 1px solid #d8cec1; border-top: 2px solid #211f1d; background: #fbf8f2; }
.knowledge-labels { display: flex; flex-wrap: wrap; gap: 1.5mm; margin-bottom: 2.5mm; }
.knowledge-labels span { padding: 1mm 2mm; background: #f2dfda; color: #b84239; font-size: 7.5pt; }
.knowledge-labels .knowledge-type { background: #eee8df; color: #5d5650; }
.knowledge-card h3 { margin-bottom: 2mm; color: #211f1d; font: 700 12pt/1.35 Georgia, "Songti SC", serif; }
.knowledge-card h3 em { color: #7c746c; font: 400 8pt/1.4 "Courier New", monospace; font-style: normal; }
.knowledge-card p { margin-bottom: 2.5mm; color: #514b46; font-size: 8.8pt; line-height: 1.7; }
.knowledge-card .knowledge-one { color: #211f1d; font-weight: 600; }
.knowledge-case { margin-top: 2mm; padding: 2.5mm; background: #f7efe2; color: #73510d; font-size: 8pt; line-height: 1.6; }
.knowledge-case b { display: block; margin-bottom: 1mm; }
.notes-section { break-before: page; }
.handout-note { break-inside: avoid; margin-bottom: 3mm; padding: 3mm 4mm; background: #fffaf2; border-left: 2px solid #c48a27; }
.handout-note span { color: #8a5b13; font-size: 8pt; }
.handout-note p { margin: 1.5mm 0; color: #514b46; font: 9pt/1.65 Georgia, serif; }
.handout-note small { color: #5d5650; font-size: 8pt; }
</style>
</head>
<body>
  <section class="handout-cover">
    <div class="cover-rule"></div>
    <div class="cover-kicker">FINLENS · 精读讲义</div>
    <h1>财经外刊精读讲义</h1>
    <p class="cover-subtitle">从外刊原文到词汇、知识卡与精读解析，形成一份可以反复阅读和检索的学习档案。</p>
    <div class="cover-summary">
      <div class="cover-stat"><b>${list.length}</b><span>精读文章</span></div>
      <div class="cover-stat"><b>${list.reduce((sum, article) => sum + exportVocabularyFor(article, options).length, 0)}</b><span>本篇词汇</span></div>
      <div class="cover-stat"><b>${list.reduce((sum, article) => sum + article.knowledge.length, 0)}</b><span>知识卡</span></div>
    </div>
    <div class="cover-contents">
      <h2>文章目录 / CONTENTS</h2>
      <ol>${contents}</ol>
    </div>
    <div class="cover-foot">
      <span>生成时间：${esc(meta.generatedAt || new Date().toLocaleString('zh-CN'))}</span>
      <div class="cover-tags">${optionLabels.map(label => `<span>${esc(label)}</span>`).join('')}</div>
    </div>
  </section>
  ${list.map((article, index) => handoutArticleHtml(article, index + 1, options)).join('')}
</body>
</html>`;
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 300);
}

function responseFilename(response, fallback) {
  const disposition = response.headers.get('content-disposition') || '';
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try { return decodeURIComponent(encoded); } catch {}
  }
  return disposition.match(/filename="([^"]+)"/i)?.[1] || fallback;
}

async function exportPdf() {
  const list = selectedArticles();
  if (!list.length) return toast('请先勾选至少一篇文章');
  const options = readExportOptions();
  S.exportPicks.options = options;
  const button = $('#btnExportPdf');
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = '正在生成 PDF…';
  try {
    const html = buildHandoutHtml(list, options);
    const response = await fetch('/api/pdf', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: `FinLens-精读讲义-${todayStr()}.pdf`,
        html
      })
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: `PDF 生成失败（HTTP ${response.status}）` }));
      throw new Error(data.error || 'PDF 生成失败');
    }
    const blob = await response.blob();
    const filename = responseFilename(response, `FinLens-精读讲义-${todayStr()}.pdf`);
    downloadBlob(filename, blob);
    recordExport('pdf', list, options, filename);
    toast(`PDF 已生成 · ${list.length} 篇文章`);
  } catch (error) {
    toast(`PDF 下载失败：${error.message || error}`);
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

function selectedArticles() {
  const ids = $$('#exportList input:checked').map(i => i.value);
  return ARTICLES.filter(a => ids.includes(a.id));
}

function exportMarkdown() {
  const list = selectedArticles();
  if (!list.length) return toast('请先勾选至少一篇文章');
  const options = readExportOptions();
  const { zh: withZh, vocab: withVocab, know: withKnow, analysis: withAnalysis, notes: withNotes } = options;
  S.exportPicks.options = options;

  let md = `# FinLens 财经外刊精读讲义\n\n> 导出时间：${new Date().toLocaleString('zh-CN')}　|　篇数：${list.length}\n\n---\n\n`;
  list.forEach(a => {
    md += `## ${a.title}\n\n`;
    md += `**来源**：${a.source}　**日期**：${a.date}　**难度**：${a.level}　**词数**：${totalWords(a)}\n\n`;
    md += `> ${a.deck}\n\n`;
    a.paragraphs.forEach((p, i) => {
      md += `**${String(i + 1).padStart(2, '0')}**\n\n`;
      md += `${p.en.replace(/\{\{|\}\}/g, '')}\n\n`;
      if (withZh) md += `${p.zh}\n\n`;
      if (p.note) md += `> 难点拆解：${p.note}\n\n`;
    });
    if (withAnalysis) {
      const indices = (S.exportPicks?.analysis?.[a.id] || [])
        .filter(index => a.paragraphs[index])
        .sort((x, y) => x - y);
      if (indices.length) {
        md += `### 精读解析选段\n\n`;
        indices.forEach(index => {
          const paragraph = a.paragraphs[index];
          const english = paragraph.analysis?.english || {};
          const finance = paragraph.analysis?.finance || {};
          const focus = paragraph.analysis?.focus || {};
          md += `#### 第 ${String(index + 1).padStart(2, '0')} 段\n\n`;
          md += `> ${decodeHtmlText(paragraph.en).replace(/\{\{|\}\}/g, '')}\n\n`;
          const englishParts = [
            english.longSentence && `长难句：${english.longSentence}`,
            english.grammar && `语法逻辑：${english.grammar}`,
            english.expression && `表达：${english.expression}`,
            paragraph.note && !english.longSentence && !english.grammar && !english.expression
              ? `难点：${paragraph.note}` : ''
          ].filter(Boolean);
          const financeParts = [
            finance.term && `术语：${finance.term}`,
            finance.background && `背景机制：${finance.background}`,
            finance.relevance && `文章关联：${finance.relevance}`
          ].filter(Boolean);
          const focusParts = [
            focus.guidance || '',
            ...(focus.recommendations || []).map(item => `推荐表达：${item}`)
          ].filter(Boolean);
          if (focus.label || focusParts.length) {
            md += `**${focus.label || '学习侧重'}**\n\n${focusParts.join('\n\n')}\n\n`;
          }
          if (englishParts.length) md += `**英语层**\n\n${englishParts.join('\n\n')}\n\n`;
          if (financeParts.length) md += `**金融层**\n\n${financeParts.join('\n\n')}\n\n`;
        });
      }
    }
    if (withVocab) {
      const vocabulary = exportVocabularyFor(a, options);
      md += `### 本篇词汇 · ${exportVocabularyFocusLabel(a, options)}\n\n| 词 | 音标 | 词性 | 中文 | English |\n|---|---|---|---|---|\n`;
      vocabulary.forEach(v => {
        md += `| ${v.w} | ${v.ipa || ''} | ${v.pos || ''} | ${v.zh} | ${(v.en || '').replace(/\|/g, '/')} |\n`;
      });
      md += `\n`;
    }
    if (withKnow) {
      md += `### 知识卡\n\n`;
      a.knowledge.forEach(k => {
        const categories = knowledgeCategoriesFor(k).map(category => KNOWLEDGE_CATEGORIES[category]).join(' / ');
        md += `**${k.term}** <sub>${k.en}</sub> · ${categories}\n\n${k.one}\n\n${k.body}\n\n`;
        if (k.cases) md += `> 案例：${k.cases}\n\n`;
      });
    }
    if (withNotes) {
      const list2 = S.marks[a.id] || [];
      if (list2.length) {
        md += `### 我的标注\n\n`;
        list2.forEach(m => {
          md += `- （${m.type === 'sentence' ? '句子' : '段落'} · 第 ${m.i + 1} 段）${m.text}\n`;
          if (m.note) md += `  - 笔记：${m.note}\n`;
        });
        md += `\n`;
      }
    }
    md += `---\n\n`;
  });
  md += `\n*由 FinLens 财经外刊学习工作台生成*\n`;
  const filename = `FinLens-讲义-${todayStr()}.md`;
  download(filename, md, 'text/markdown');
  recordExport('markdown', list, options, filename);
  toast(`已导出 ${list.length} 篇讲义`);
}

function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 200);
}

/* ================= AI 聊天与文章数据管理 ================= */
function knowledgeChatKey(articleId, knowledgeId) {
  return `${articleId}:${knowledgeId}`;
}

function aiMessageTime(message) {
  return Number(message?.createdAt || message?.ts || 0);
}

function aiMessageId(message, index = 0) {
  return String(message?.id || `ai-${stableId(`${message?.q || ''}:${message?.a || ''}:${aiMessageTime(message)}:${index}`)}`);
}

function allAIChatSessions() {
  const sessions = [];
  Object.entries(S.tutor || {}).forEach(([articleId, messages]) => {
    const list = Array.isArray(messages) ? messages.filter(Boolean) : [];
    if (!list.length) return;
    const article = ARTICLES.find(item => item.id === articleId);
    sessions.push({
      id: `article:${articleId}`,
      type: 'article',
      articleId,
      title: article?.title || '已归档文章',
      subtitle: '文章总结',
      messages: list
    });
  });
  Object.entries(S.knowledgeTutor || {}).forEach(([key, group]) => {
    const messages = Array.isArray(group?.messages) ? group.messages.filter(Boolean) : [];
    if (!messages.length) return;
    const article = ARTICLES.find(item => item.id === group.articleId);
    sessions.push({
      id: `knowledge:${key}`,
      key,
      type: 'knowledge',
      articleId: group.articleId || '',
      knowledgeId: group.knowledgeId || '',
      title: group.term || group.termEn || '知识卡问答',
      subtitle: article?.title || group.articleTitle || '已归档文章',
      messages
    });
  });
  return sessions.sort((left, right) => {
    const lt = Math.max(0, ...left.messages.map(aiMessageTime));
    const rt = Math.max(0, ...right.messages.map(aiMessageTime));
    return rt - lt;
  });
}

function filteredAIChatSessions() {
  const query = aiDataFilter.q.trim().toLowerCase();
  return allAIChatSessions().filter(session => {
    if (aiDataFilter.source !== 'all' && session.type !== aiDataFilter.source) return false;
    if (aiDataFilter.articleId && session.articleId !== aiDataFilter.articleId) return false;
    if (aiDataFilter.knowledgeId && session.knowledgeId !== aiDataFilter.knowledgeId) return false;
    if (!query) return true;
    const haystack = [
      session.title,
      session.subtitle,
      ...session.messages.flatMap(message => [
        message.q || '',
        message.a || '',
        ...(message.knowledgeBasis || []),
        ...(message.originalEvidence || []).map(item => typeof item === 'string' ? item : `${item.quote || ''} ${item.interpretation || ''}`)
      ])
    ].join(' ').toLowerCase();
    return haystack.includes(query);
  });
}

function aiEvidenceSummary(message) {
  const parts = [];
  const original = message.originalEvidence || message.evidence || [];
  if (original.length) {
    parts.push(`原文依据：${original.map(item => typeof item === 'string'
      ? item
      : `${item.quote || ''}${item.interpretation ? ` ${item.interpretation}` : ''}`).join('；')}`);
  }
  if ((message.knowledgeBasis || []).length) parts.push(`知识库依据：${message.knowledgeBasis.join('；')}`);
  if ((message.authorityBasis || []).length) {
    parts.push(`权威依据：${message.authorityBasis.map(item => typeof item === 'string'
      ? item
      : item.source || '').filter(Boolean).join('；')}`);
  }
  return parts.join('\n');
}

function inlineAIHistoryHtml(messages, title, containerId, manageButtonId) {
  const ordered = [...(messages || [])].sort((a, b) => aiMessageTime(b) - aiMessageTime(a));
  if (!ordered.length) {
    return `<div class="inline-ai-history" id="${containerId}">
      <div class="inline-ai-history-head"><b>${esc(title)}</b><span>暂无记录</span></div>
    </div>`;
  }
  return `<div class="inline-ai-history" id="${containerId}">
    <div class="inline-ai-history-head">
      <b>${esc(title)}</b>
      <span>${ordered.length} 条</span>
      <button class="mini-btn" id="${manageButtonId}" type="button">进入数据管理</button>
    </div>
    <div class="inline-ai-history-list">
      ${ordered.map((message, index) => {
        const evidence = aiEvidenceSummary(message);
        return `<article class="inline-ai-message">
          <div class="inline-ai-message-index">${String(index + 1).padStart(2, '0')}</div>
          <div>
            <b>问</b><p>${esc(message.q || '')}</p>
            <b>答</b><p>${esc(message.a || '')}</p>
            ${evidence ? `<small>${esc(evidence)}</small>` : ''}
          </div>
        </article>`;
      }).join('')}
    </div>
  </div>`;
}

function renderAIHistoryMessages(session) {
  return session.messages.map((message, index) => {
    const evidence = aiEvidenceSummary(message);
    return `<div class="ai-session-msg">
      <b>问 ${index + 1}</b>
      <p>${esc(message.q || '')}</p>
      <b>答</b>
      <p>${esc(message.a || '')}</p>
      ${evidence ? `<small>${esc(evidence)}</small>` : ''}
    </div>`;
  }).join('');
}

function renderAIHistoryList() {
  const container = $('#aiHistoryList');
  if (!container) return;
  const sessions = filteredAIChatSessions();
  if (!sessions.length) {
    container.innerHTML = '<div class="ai-history-empty">当前范围内没有聊天记录。</div>';
    return;
  }
  container.innerHTML = sessions.map(session => {
    const latest = [...session.messages].sort((a, b) => aiMessageTime(b) - aiMessageTime(a))[0];
    const expanded = expandedAISessions.has(session.id);
    const latestTime = aiMessageTime(latest);
    return `<article class="ai-session" data-ai-session="${esc(session.id)}">
      <div class="ai-session-head">
        <button class="ai-session-summary" type="button" data-toggle-ai-session="${esc(session.id)}">
          <b>${esc(session.title)}</b>
          <span>${esc(session.subtitle)} · ${esc(latest?.q || '')} · ${session.messages.length} 条</span>
        </button>
        <div class="ai-session-meta">
          <span class="ai-session-type ${session.type}">${session.type === 'knowledge' ? '知识卡' : '文章总结'}</span>
          <span class="ai-session-date">${latestTime ? esc(new Date(latestTime).toLocaleDateString('zh-CN')) : ''}</span>
          <button class="ai-session-delete" type="button" data-delete-ai-session="${esc(session.id)}" title="删除这组记录">×</button>
        </div>
      </div>
      <div class="ai-session-messages" ${expanded ? '' : 'hidden'}>${renderAIHistoryMessages(session)}</div>
    </article>`;
  }).join('');
}

function knowledgeMessageCountForArticle(articleId) {
  return Object.values(S.knowledgeTutor || {})
    .filter(group => group?.articleId === articleId)
    .reduce((sum, group) => sum + (Array.isArray(group.messages) ? group.messages.length : 0), 0);
}

function articleUserDataCounts(articleId) {
  return {
    marks: (S.marks[articleId] || []).length,
    notes: S.notes[articleId] && typeof S.notes[articleId] === 'object'
      ? Object.keys(S.notes[articleId]).length
      : 0,
    articleChats: Array.isArray(S.tutor[articleId]) ? S.tutor[articleId].length : 0,
    knowledgeChats: knowledgeMessageCountForArticle(articleId)
  };
}

function renderArticleDataList() {
  const container = $('#articleDataList');
  if (!container) return;
  container.innerHTML = ARTICLES.map(article => {
    const counts = articleUserDataCounts(article.id);
    const total = counts.marks + counts.notes + counts.articleChats + counts.knowledgeChats;
    return `<div class="article-data-row" data-article-data="${esc(article.id)}">
      <div class="article-data-main">
        <b>${esc(article.title)}</b>
        <span>标注 ${counts.marks} · 笔记 ${counts.notes} · AI 问答 ${counts.articleChats} · 知识卡问答 ${counts.knowledgeChats} · 阅读进度保留</span>
      </div>
      <button class="mini-btn danger" type="button" data-clear-article-data="${esc(article.id)}" ${total ? '' : 'disabled'}>清除相关记录</button>
    </div>`;
  }).join('') || '<div class="article-data-empty">当前没有文章。</div>';
}

function renderArticleRestoreList() {
  const container = $('#articleRestoreList');
  if (!container) return;
  const items = S.deletedArticleData || [];
  if (!items.length) {
    container.innerHTML = '<div class="article-data-empty">暂无删除记录。</div>';
    return;
  }
  container.innerHTML = items.map(item => `<div class="recovery-row">
    <div>
      <b>${esc(item.title || '文章')}</b>
      <span>${new Date(item.deletedAt || Date.now()).toLocaleString('zh-CN')} ·
        标注 ${(item.marks || []).length} · AI 问答 ${(item.articleMessages || []).length} ·
        知识卡问答 ${(item.knowledgeGroups || []).reduce((sum, group) => sum + (group.messages || []).length, 0)}</span>
    </div>
    <button class="mini-btn" type="button" data-restore-article-data="${esc(item.id)}">恢复记录</button>
  </div>`).join('');
}

function renderAIDataContext() {
  const container = $('#aiDataContext');
  if (!container) return;
  const article = ARTICLES.find(item => item.id === aiDataFilter.articleId);
  const knowledgeGroup = aiDataFilter.knowledgeId
    ? Object.values(S.knowledgeTutor || {}).find(group =>
        group.articleId === aiDataFilter.articleId && group.knowledgeId === aiDataFilter.knowledgeId)
    : null;
  if (!aiDataFilter.articleId && !aiDataFilter.knowledgeId) {
    container.hidden = true;
    container.innerHTML = '';
    return;
  }
  const label = knowledgeGroup
    ? `当前知识卡：${knowledgeGroup.term || knowledgeGroup.termEn || '知识卡'} · ${article?.title || ''}`
    : `当前文章：${article?.title || aiDataFilter.articleId}`;
  container.innerHTML = `<span>${esc(label)}</span><button type="button" id="btnClearAIContext">查看全部记录</button>`;
  container.hidden = false;
}

function renderAIDataManager() {
  const modal = $('#aiDataModal');
  if (!modal) return;
  $('#aiDataSearch').value = aiDataFilter.q;
  $$('#aiDataSourceSeg button').forEach(button =>
    button.classList.toggle('on', button.dataset.aiSource === aiDataFilter.source));
  renderAIDataContext();
  renderAIHistoryList();
  renderArticleDataList();
  renderArticleRestoreList();
}

function openAIDataManager(options = {}) {
  aiDataFilter = {
    source: options.knowledgeId ? 'knowledge' : options.articleId ? 'article' : 'all',
    q: '',
    articleId: options.articleId || '',
    knowledgeId: options.knowledgeId || ''
  };
  if (options.knowledgeId && options.articleId) {
    expandedAISessions.add(`knowledge:${knowledgeChatKey(options.articleId, options.knowledgeId)}`);
  }
  if (options.articleId && !options.knowledgeId) {
    expandedAISessions.add(`article:${options.articleId}`);
  }
  $('#settingsModal').hidden = true;
  $('#aiDataModal').hidden = false;
  renderAIDataManager();
}

function closeAIDataManager() {
  const modal = $('#aiDataModal');
  if (modal) modal.hidden = true;
}

function deleteAIChatSession(sessionId) {
  const session = allAIChatSessions().find(item => item.id === sessionId);
  if (!session) return;
  if (!confirm(`删除“${session.title}”的 ${session.messages.length} 条聊天记录？此操作会立即生效。`)) return;
  if (session.type === 'article') delete S.tutor[session.articleId];
  else if (session.key) delete S.knowledgeTutor[session.key];
  expandedAISessions.delete(sessionId);
  save();
  renderAIDataManager();
  if (cur) renderSide();
  toast('聊天记录已删除');
}

function clearAllAIHistory() {
  const total = allAIChatSessions().reduce((sum, session) => sum + session.messages.length, 0);
  if (!total) return toast('当前没有问答记录');
  if (!confirm(`清空全部 ${total} 条问答记录？文章标注和知识卡内容不会受影响。`)) return;
  S.tutor = {};
  S.knowledgeTutor = {};
  expandedAISessions.clear();
  save();
  renderAIDataManager();
  if (cur) renderSide();
  if (activeKnowledge) renderKnowledgeDetail();
  toast('全部问答记录已清空');
}

function mergeAIMessages(existing, incoming) {
  const seen = new Set();
  return [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]
    .filter(Boolean)
    .filter((message, index) => {
      const key = aiMessageId(message, index);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

async function cleanupArticleUserData(articleId) {
  const article = ARTICLES.find(item => item.id === articleId);
  if (!article) return;
  const counts = articleUserDataCounts(articleId);
  const total = counts.marks + counts.notes + counts.articleChats + counts.knowledgeChats;
  if (!total) return toast('这篇文章没有可清除的相关记录');
  const confirmed = confirm(
    `将清除《${article.title}》的：\n` +
    `• 用户标注 ${counts.marks} 条\n` +
    `• 用户笔记 ${counts.notes} 条\n` +
    `• 文章 AI 问答 ${counts.articleChats} 条\n` +
    `• 知识卡问答 ${counts.knowledgeChats} 条\n\n` +
    '阅读进度会保留。删除前会自动建立恢复点。确定继续吗？'
  );
  if (!confirmed) return;

  const knowledgeGroups = Object.entries(S.knowledgeTutor || {})
    .filter(([, group]) => group?.articleId === articleId)
    .map(([key, group]) => ({ key, ...JSON.parse(JSON.stringify(group)) }));
  const snapshot = {
    id: `article-data-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    articleId,
    title: article.title,
    deletedAt: Date.now(),
    marks: JSON.parse(JSON.stringify(S.marks[articleId] || [])),
    notes: JSON.parse(JSON.stringify(S.notes[articleId] || {})),
    articleMessages: JSON.parse(JSON.stringify(S.tutor[articleId] || [])),
    knowledgeGroups
  };
  S.deletedArticleData = [snapshot, ...(S.deletedArticleData || [])].slice(0, 20);
  await saveBackupNow(true);

  delete S.marks[articleId];
  delete S.notes[articleId];
  delete S.tutor[articleId];
  Object.entries(S.knowledgeTutor || {}).forEach(([key, group]) => {
    if (group?.articleId === articleId) delete S.knowledgeTutor[key];
  });
  aiDataFilter = {
    source: aiDataFilter.source === 'knowledge' ? 'all' : aiDataFilter.source,
    q: aiDataFilter.q,
    articleId: '',
    knowledgeId: ''
  };
  save();
  renderAIDataManager();
  if (cur?.id === articleId) {
    renderDoc();
    renderSide();
  }
  toast('文章相关标注与问答已清除，可从“最近删除”恢复');
}

function restoreArticleUserData(snapshotId) {
  const snapshot = (S.deletedArticleData || []).find(item => item.id === snapshotId);
  if (!snapshot) return;
  const articleId = snapshot.articleId;
  const existingMarks = S.marks[articleId] || [];
  const knownMarkIds = new Set(existingMarks.map(mark => mark.id));
  S.marks[articleId] = [
    ...existingMarks,
    ...(snapshot.marks || []).filter(mark => !knownMarkIds.has(mark.id))
  ];
  if (snapshot.notes && typeof snapshot.notes === 'object') {
    S.notes[articleId] = { ...(S.notes[articleId] || {}), ...snapshot.notes };
  }
  if ((snapshot.articleMessages || []).length) {
    S.tutor[articleId] = mergeAIMessages(S.tutor[articleId], snapshot.articleMessages);
  }
  (snapshot.knowledgeGroups || []).forEach(group => {
    const key = group.key || knowledgeChatKey(group.articleId, group.knowledgeId);
    const existing = S.knowledgeTutor[key];
    S.knowledgeTutor[key] = {
      ...(existing || {}),
      ...group,
      key: undefined,
      messages: mergeAIMessages(existing?.messages, group.messages)
    };
  });
  S.deletedArticleData = (S.deletedArticleData || []).filter(item => item.id !== snapshotId);
  save();
  renderAIDataManager();
  if (cur?.id === articleId) {
    renderDoc();
    renderSide();
  }
  if (activeKnowledge?._aid === articleId) renderKnowledgeDetail();
  toast('文章标注与问答记录已恢复');
}

/* ================= 统计 / 目标 ================= */
function renderStats() {
  const readN = Object.keys(S.read).filter(id => S.read[id].done).length;
  const entries = activeVocabularyEntries();
  $('#statArticles').textContent = readN;
  $('#statWords').textContent = entries.length;
  $('#statStreak').textContent = streak();
  const due = deckEntriesFor('due', 'all').length;
  const badge = $('#navDue');
  badge.textContent = due;
  badge.dataset.zero = due ? '0' : '1';
  const articleBadge = $('#navArticles');
  articleBadge.textContent = ARTICLES.length;
  const knowledgeBadge = $('#navKnowledge');
  knowledgeBadge.textContent = allKnowledge().length;
}

function renderGoal() {
  const rt = S.settings.readTarget || 1;
  const wt = S.settings.wordTarget || 12;
  $('#goalRead').textContent = Math.min(S.today.read, 99);
  $('#goalReadTarget').textContent = rt;
  $('#goalWords').textContent = S.today.words;
  $('#goalWordsTarget').textContent = wt;
  $('#barRead').style.width = Math.min(100, S.today.read / rt * 100) + '%';
  $('#barWords').style.width = Math.min(100, S.today.words / wt * 100) + '%';
}

/* ================= 设置 ================= */
async function saveManualCredential(apiKey, options = {}) {
  const key = String(apiKey || '').trim();
  if (!key) throw new Error('请输入 API Key');
  const baseUrl = String(options.baseUrl || S.settings.baseUrl || '').trim();
  const model = String(options.model || S.settings.model || '').trim();
  if (!baseUrl) throw new Error('请先填写 Base URL');
  if (!model) throw new Error('请先填写模型名称');
  const response = await fetch('/api/credentials', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      id: S.settings.localCredentialId || '',
      name: '手动配置',
      baseUrl,
      model,
      apiKey: key,
      automation: navigator.webdriver === true
    })
  });
  const data = await response.json();
  if (!response.ok || !data.ok || !data.credential?.id) {
    throw new Error(data.error || '保存本地模型凭据失败');
  }
  S.settings.baseUrl = data.credential.baseUrl;
  S.settings.model = data.credential.model;
  S.settings.apiKey = '';
  S.settings.localCredentialId = data.credential.id;
  S.settings.ccSwitchProviderId = '';
  S.settings.ccSwitchAppType = '';
  S.settings.engine = 'online';
  save();
  const input = $('#setApiKey');
  if (input) {
    input.value = '';
    input.placeholder = '已由本地服务托管，不写入浏览器';
  }
  const status = $('#modelStatus');
  if (status && !options.silent) {
    status.textContent = '密钥已由本地服务托管，浏览器存储已清空';
    status.style.color = 'var(--teal)';
  }
  paintEngine();
  return data.credential;
}

async function migrateLegacyBrowserCredential() {
  if (!S?.settings?.apiKey) return;
  if (hasCcSwitchCredential()) {
    S.settings.apiKey = '';
    save();
    return;
  }
  try {
    await saveManualCredential(S.settings.apiKey, { silent: true });
  } catch {
    // Keep the legacy value only until the local service is available.
  }
}

function wireSettings() {
  $$('[data-open-learning]').forEach(b => b.addEventListener('click', openLearningSettings));
  $$('[data-open-engine]').forEach(b => b.addEventListener('click', openEngineSettings));
  $('#btnOpenAIData').addEventListener('click', () => openAIDataManager());
  $('#aiDataModal').addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) {
      closeAIDataManager();
      return;
    }
    if (e.target.id === 'btnClearAIContext') {
      aiDataFilter.articleId = '';
      aiDataFilter.knowledgeId = '';
      aiDataFilter.source = 'all';
      renderAIDataManager();
      return;
    }
    const toggle = e.target.closest('[data-toggle-ai-session]');
    if (toggle) {
      const id = toggle.dataset.toggleAiSession;
      if (expandedAISessions.has(id)) expandedAISessions.delete(id);
      else expandedAISessions.add(id);
      renderAIHistoryList();
      return;
    }
    const remove = e.target.closest('[data-delete-ai-session]');
    if (remove) {
      deleteAIChatSession(remove.dataset.deleteAiSession);
      return;
    }
    const clearArticle = e.target.closest('[data-clear-article-data]');
    if (clearArticle) {
      cleanupArticleUserData(clearArticle.dataset.clearArticleData);
      return;
    }
    const restore = e.target.closest('[data-restore-article-data]');
    if (restore) restoreArticleUserData(restore.dataset.restoreArticleData);
  });
  $('#aiDataSearch').addEventListener('input', (e) => {
    aiDataFilter.q = e.target.value;
    renderAIHistoryList();
  });
  $('#aiDataSourceSeg').addEventListener('click', (e) => {
    const button = e.target.closest('button[data-ai-source]');
    if (!button) return;
    aiDataFilter.source = button.dataset.aiSource;
    renderAIDataManager();
  });
  $('#btnClearAllAIHistory').addEventListener('click', clearAllAIHistory);
  $('#settingsModal').addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) $('#settingsModal').hidden = true;
  });
  $('#engineModal').addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) {
      $('#engineModal').hidden = true;
      if (lastImportFailure) $('#importModal').hidden = false;
    }
  });
  $('#editGoal').addEventListener('click', openLearningSettings);

  $('#setReadTarget').addEventListener('change', (e) => {
    S.settings.readTarget = Math.max(1, +e.target.value || 1); save(); renderGoal();
  });
  $('#setWordTarget').addEventListener('change', (e) => {
    S.settings.wordTarget = Math.max(5, +e.target.value || 12); save(); renderGoal();
  });
  $('#setVocabDetail').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    S.settings.vocabDetail = b.dataset.detail;
    save();
    $$('#setVocabDetail button').forEach(x => x.classList.toggle('on', x === b));
  });
  $('#setVocabFocus').addEventListener('change', (e) => {
    const previous = S.settings.vocabFocus;
    S.settings.vocabFocus = e.target.value;
    save();
    if (previous !== e.target.value && cur) updateCurrentArticleFocus();
    else toast('词汇侧重已保存，将在下次导入时生效');
  });
  $('#setResearchOnline').addEventListener('change', (e) => {
    S.settings.researchOnline = e.target.checked;
    save();
    toast(e.target.checked ? '知识详解将联网核验来源' : '知识详解将使用未联网核验模式');
  });
  ['setBaseUrl', 'setModel', 'setApiKey'].forEach(id => {
    $('#' + id).addEventListener('change', async (e) => {
      const key = id === 'setBaseUrl' ? 'baseUrl' : id === 'setModel' ? 'model' : 'apiKey';
      const value = e.target.value.trim();
      if (id === 'setApiKey') {
        if (!value) {
          S.settings.apiKey = '';
          S.settings.localCredentialId = '';
          save();
          paintEngine();
          return;
        }
        try {
          const saveTask = saveManualCredential(value);
          manualCredentialSavePromise = saveTask;
          await saveTask;
        } catch (error) {
          const status = $('#modelStatus');
          if (status) {
            status.textContent = error.message || '保存本地模型凭据失败';
            status.style.color = 'var(--danger)';
          }
        } finally {
          manualCredentialSavePromise = null;
        }
        return;
      }
      S.settings[key] = value;
      if (id === 'setBaseUrl') {
        S.settings.ccSwitchProviderId = '';
        S.settings.ccSwitchAppType = '';
        S.settings.localCredentialId = '';
      }
      S.settings.engine = hasEngineCredential() ? 'online' : 'offline';
      save();
      paintEngine();
    });
  });
  $('#setMwApiKey').addEventListener('change', (e) => {
    S.settings.mwApiKey = e.target.value.trim();
    save();
  });
  $('#modelList').addEventListener('change', (e) => {
    if (!e.target.value) return;
    S.settings.model = e.target.value;
    $('#setModel').value = e.target.value;
    save();
    paintEngine();
  });
  $('#btnFetchModels').addEventListener('click', () => fetchAvailableModels(false));
  $('#btnTestModel').addEventListener('click', () => fetchAvailableModels(true));
  $('#btnLoadCcSwitch').addEventListener('click', loadCcSwitchProviders);
  $('#btnImportCcSwitch').addEventListener('click', importCcSwitchProvider);
  $('#btnImportAwesomeFeeds').addEventListener('click', () => importGithubResource('awesome'));
  $('#awesomeIssueSelect').addEventListener('change', (e) => {
    if (e.target.value) loadAwesomeIssue(e.target.value);
  });
  $('#btnImportAwesomeChapter').addEventListener('click', importAwesomeChapter);
  ['setCrawlFeeds', 'setCrawlFrom', 'setCrawlTo'].forEach(id => {
    $('#' + id).addEventListener('change', (e) => {
      const key = id === 'setCrawlFeeds' ? 'crawlFeeds' : id === 'setCrawlFrom' ? 'crawlFrom' : 'crawlTo';
      S.settings[key] = e.target.value.trim();
      save();
      paintCrawlStatus();
      scheduleCrawl();
    });
  });
  $('#setCrawlIntervalMin').addEventListener('change', (e) => {
    S.settings.crawlIntervalMin = Math.max(30, +e.target.value || 60);
    save();
    scheduleCrawl();
  });
  $('#setCrawlMaxItems').addEventListener('change', (e) => {
    S.settings.crawlMaxItems = Math.min(10, Math.max(1, +e.target.value || 3));
    e.target.value = S.settings.crawlMaxItems;
    save();
  });
  $('#setAutoCrawl').addEventListener('change', (e) => {
    S.settings.autoCrawl = e.target.checked;
    save();
    scheduleCrawl();
  });
  $('#setCrawlAnnotate').addEventListener('change', (e) => {
    S.settings.crawlAnnotate = e.target.checked;
    save();
  });
  ['setTtsEngine', 'setTtsModel', 'setTtsVoice'].forEach(id => {
    const key = id === 'setTtsEngine' ? 'ttsEngine' : id === 'setTtsModel' ? 'ttsModel' : 'ttsVoice';
    $('#' + id).addEventListener('change', (e) => {
      S.settings[key] = e.target.value.trim();
      save();
    });
  });
  $('#btnUseFeedPresets').addEventListener('click', () => {
    S.settings.crawlFeeds = DEFAULT_FINANCIAL_FEEDS.join('\n');
    $('#setCrawlFeeds').value = S.settings.crawlFeeds;
    save();
    paintCrawlStatus();
  });
  $('#btnUseMarketMediaFeeds').addEventListener('click', () => {
    S.settings.crawlFeeds = MARKET_MEDIA_FEEDS.join('\n');
    $('#setCrawlFeeds').value = S.settings.crawlFeeds;
    save();
    paintCrawlStatus();
  });
  $('#btnClearFeeds').addEventListener('click', () => {
    S.settings.crawlFeeds = '';
    $('#setCrawlFeeds').value = '';
    save();
    paintCrawlStatus();
  });
  $('#btnCrawlNow').addEventListener('click', () => runCrawl({ silent: false }));
  $('#btnCrawlDetails').addEventListener('click', () => {
    const panel = $('#crawlErrors');
    panel.hidden = !panel.hidden;
  });
  $('#btnPing').addEventListener('click', checkServer);
  $('#btnReset').addEventListener('click', () => {
    if (!confirm('将清空全部学习记录（精读进度、生词本、标记、设置）。确定继续？')) return;
    localStorage.removeItem(LS_KEY);
    S = loadState();
    location.reload();
  });
  $('#btnHelp').addEventListener('click', () => {
    toast('快捷键：1-4 切换视图 · T 切换译文 · M 切换模式 · V 词汇标注 · K 术语标注');
  });
}

function openLearningSettings() {
  $('#setReadTarget').value = S.settings.readTarget;
  $('#setWordTarget').value = S.settings.wordTarget;
  $('#setVocabFocus').value = S.settings.vocabFocus || 'balanced';
  $$('#setVocabDetail button').forEach(b => b.classList.toggle('on', b.dataset.detail === (S.settings.vocabDetail || 'detail')));
  $('#settingsModal').hidden = false;
}

function openEngineSettings() {
  $('#setResearchOnline').checked = S.settings.researchOnline !== false;
  $('#setBaseUrl').value = S.settings.baseUrl || '';
  $('#setModel').value = S.settings.model || '';
  $('#setApiKey').value = S.settings.apiKey || '';
  $('#setApiKey').placeholder = hasServerManagedCredential()
    ? '由本地服务托管，不写入浏览器'
    : 'sk-...';
  $('#setMwApiKey').value = S.settings.mwApiKey || '';
  $('#setTtsEngine').value = S.settings.ttsEngine || 'browser';
  $('#setTtsModel').value = S.settings.ttsModel || 'gpt-4o-mini-tts';
  $('#setTtsVoice').value = S.settings.ttsVoice || 'alloy';
  $('#setCrawlFeeds').value = S.settings.crawlFeeds || '';
  $('#setCrawlFrom').value = S.settings.crawlFrom || daysAgoStr(30);
  $('#setCrawlTo').value = S.settings.crawlTo || todayStr();
  $('#setAutoCrawl').checked = !!S.settings.autoCrawl;
  $('#setCrawlIntervalMin').value = String(S.settings.crawlIntervalMin || 60);
  $('#setCrawlMaxItems').value = S.settings.crawlMaxItems || 3;
  $('#setCrawlAnnotate').checked = S.settings.crawlAnnotate !== false;
  paintCrawlStatus();
  paintEngine();
  $('#engineModal').hidden = false;
  loadCcSwitchProviders({ silent: true });
}

function paintEngine() {
  const online = !!(hasEngineCredential() && S.settings.model);
  $('#engineName').textContent = online ? '在线模型' : '本地预标注';
  $('#engineDesc').textContent = online
    ? `${S.settings.model} · ${hasServerManagedCredential() ? '密钥由本地服务托管' : '连接可用'}`
    : '内置语料可离线精读，联网后可导入与标注';
  $('#engineDot').classList.toggle('online', online);
}

async function fetchAvailableModels(testOnly) {
  const status = $('#modelStatus');
  status.textContent = testOnly ? '正在测试真实模型连接…' : '正在拉取模型列表…';
  status.style.color = 'var(--ink-3)';
  try {
    if (manualCredentialSavePromise) await manualCredentialSavePromise;
    if (testOnly) {
      const model = $('#setModel').value.trim();
      if (!model) throw new Error('请先选择或填写模型名称');
      const response = await fetch('/api/test-model', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(modelRequestSettings({
          baseUrl: $('#setBaseUrl').value.trim(),
          apiKey: $('#setApiKey').value.trim() || (hasServerManagedCredential() ? '' : S.settings.apiKey),
          model
        }))
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.error || '模型连接失败');
      status.textContent = `连接成功 · ${data.model} · ${data.latencyMs}ms`;
      status.style.color = 'var(--teal)';
      paintEngine();
      return;
    }
    const response = await fetch('/api/models', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(modelRequestSettings({
        baseUrl: $('#setBaseUrl').value.trim(),
        apiKey: $('#setApiKey').value.trim() || (hasServerManagedCredential() ? '' : S.settings.apiKey)
      }))
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || '模型连接失败');
    const select = $('#modelList');
    const current = $('#setModel').value.trim();
    const options = [...data.models];
    if (current && !options.includes(current)) options.unshift(current);
    select.innerHTML = '<option value="">选择已拉取模型</option>' +
      options.map(model => `<option value="${esc(model)}">${esc(model)}${model === current && !data.models.includes(model) ? '（当前配置）' : ''}</option>`).join('');
    if (current) select.value = current;
    else if (data.models.length) {
      select.value = data.models[0];
      $('#setModel').value = data.models[0];
      S.settings.model = data.models[0];
      save();
    }
    status.textContent = `可用 · ${data.models.length} 个模型${current && !data.models.includes(current) ? ' · 保留当前配置' : ''}`;
    status.style.color = 'var(--teal)';
    paintEngine();
  } catch (error) {
    status.textContent = error.message || '连接失败';
    status.style.color = 'var(--danger)';
  }
}

async function loadCcSwitchProviders({ silent = false } = {}) {
  const status = $('#ccSwitchStatus');
  const select = $('#ccSwitchProviders');
  if (!silent) status.textContent = '正在读取本机配置…';
  try {
    let data = null;
    let lastError = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch('/api/cc-switch', { cache: 'no-store' });
        const body = await response.json();
        if (!response.ok || !body.ok || !Array.isArray(body.providers)) {
          const shape = body && typeof body === 'object'
            ? `ok=${String(body.ok)}, providers=${Array.isArray(body.providers) ? 'array' : typeof body.providers}`
            : typeof body;
          throw new Error(body?.error || `读取失败（HTTP ${response.status}，${shape}）`);
        }
        data = body;
        break;
      } catch (error) {
        lastError = error;
        if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 120));
      }
    }
    if (!data) throw lastError || new Error('读取失败');
    select.innerHTML = data.providers.length
      ? data.providers.map((provider, index) => `<option value="${index}">${esc(provider.name)} · ${esc(provider.model || provider.appType)} · ${(provider.models || []).length || 1} 个模型</option>`).join('')
      : '<option value="">没有可导入配置</option>';
    select._providers = data.providers;
    if (data.providers.length) select.value = '0';
    if (data.providers.length && !hasEngineCredential()) {
      status.textContent = `检测到 ${data.providers.length} 个兼容配置，但尚未导入；未导入时只能保存原文`;
      status.style.color = 'var(--amber)';
    } else {
      status.textContent = data.providers.length ? `已找到 ${data.providers.length} 个兼容配置` : '没有兼容配置';
      status.style.color = data.providers.length ? 'var(--teal)' : 'var(--ink-3)';
    }
  } catch (error) {
    select.innerHTML = '<option value="">读取失败</option>';
    status.textContent = error.message || '读取失败';
    status.style.color = 'var(--danger)';
  }
}

function importCcSwitchProvider() {
  const select = $('#ccSwitchProviders');
  const provider = select._providers?.[Number(select.value)];
  const status = $('#ccSwitchStatus');
  if (!provider) {
    status.textContent = '请先选择配置';
    status.style.color = 'var(--danger)';
    return;
  }
  S.settings.baseUrl = provider.baseUrl;
  S.settings.model = provider.model;
  S.settings.apiKey = '';
  S.settings.ccSwitchProviderId = provider.id;
  S.settings.ccSwitchAppType = provider.appType;
  S.settings.localCredentialId = '';
  S.settings.engine = 'online';
  save();
  $('#setBaseUrl').value = provider.baseUrl;
  $('#setModel').value = provider.model;
  $('#setApiKey').value = '';
  $('#setApiKey').placeholder = '由本地服务托管，不写入浏览器';
  const models = [...new Set([provider.model, ...(provider.models || [])].filter(Boolean))];
  $('#modelList').innerHTML = '<option value="">选择 CC Switch 模型</option>' +
    models.map(model => `<option value="${esc(model)}">${esc(model)}</option>`).join('');
  $('#modelList').value = provider.model || models[0] || '';
  status.textContent = `已导入 ${provider.name}`;
  status.style.color = 'var(--teal)';
  const ping = $('#pingOut');
  if (ping) {
    ping.textContent = '在线 · key 由本地服务托管';
    ping.style.color = 'var(--teal)';
  }
  const modelStatus = $('#modelStatus');
  if (modelStatus) {
    modelStatus.textContent = `已载入 ${models.length} 个模型，可继续测试连接`;
    modelStatus.style.color = 'var(--teal)';
  }
  paintEngine();
  if (cur && isCustomArticle(cur.id) && (!cur.vocab.length || !cur.knowledge.length)) {
    toast('已导入供应商；密钥由本地服务托管，不会进入浏览器存储');
  }
}

async function importGithubResource(key) {
  const status = key === 'awesome' ? $('#githubResourceStatus') : $('#crawlStatus');
  const button = $('#btnImportAwesomeFeeds');
  if (button) button.disabled = true;
  if (status) status.textContent = '正在读取 GitHub 资源…';
  try {
    const response = await fetch('/api/github-resource?key=' + encodeURIComponent(key));
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || 'GitHub 读取失败');
    const items = Array.isArray(data.items) ? data.items : [];
    const issuePattern = /^te_\d{4}\.\d{2}\.\d{2}$/i;
    const issues = items
      .filter(item => item.type === 'dir' && issuePattern.test(item.name));
    const archivedYears = items
      .filter(item => item.type === 'dir' && /^\d{4}$/.test(item.name))
      .sort((a, b) => b.name.localeCompare(a.name))
      .slice(0, 3);
    for (const year of archivedYears) {
      const response = await fetch('/api/github-resource?key=awesome&path=' + encodeURIComponent(year.path));
      const listing = await response.json();
      if (!listing.ok) continue;
      issues.push(...(Array.isArray(listing.items) ? listing.items : [])
        .filter(item => item.type === 'dir' && issuePattern.test(item.name)));
    }
    issues.sort((a, b) => b.name.localeCompare(a.name));
    if (!issues.length) throw new Error('仓库中未找到 Economist 期号目录');
    const issueSelect = $('#awesomeIssueSelect');
    issueSelect.innerHTML = issues.map(item => `<option value="${esc(item.path)}">${esc(item.name.replace(/^te_/, ''))}</option>`).join('');
    $('#githubAwesomeControls').hidden = false;
    if (status) {
      status.textContent = `找到 ${issues.length} 个期号，正在读取最新一期…`;
      status.style.color = 'var(--teal)';
    }
    await loadAwesomeIssue(issues[0].path);
  } catch (error) {
    if (status) {
      status.textContent = error.message || 'GitHub 资源读取失败';
      status.style.color = 'var(--danger)';
    }
  } finally {
    if (button) button.disabled = false;
  }
}

async function loadAwesomeIssue(issuePath) {
  const status = $('#githubResourceStatus');
  const chapterSelect = $('#awesomeChapterSelect');
  if (status) status.textContent = '正在查找本期 EPUB…';
  try {
    const listingResponse = await fetch('/api/github-resource?key=awesome&path=' + encodeURIComponent(issuePath));
    const listing = await listingResponse.json();
    if (!listing.ok) throw new Error(listing.error || '期号目录读取失败');
    const issueName = String(issuePath).split('/').pop();
    const issueDate = issueName.match(/^te_(\d{4}\.\d{2}\.\d{2})$/i)?.[1] || '';
    const epubs = (Array.isArray(listing.items) ? listing.items : [])
      .filter(item => item.type === 'file' && /\.epub$/i.test(item.name));
    const epub = epubs.find(item => issueDate && item.name.includes(issueDate)) || epubs[0];
    if (!epub?.path) throw new Error('该期号中没有 EPUB 文件');
    if (status) status.textContent = '正在下载并解析 EPUB…';
    const response = await fetch('/api/github-epub?path=' + encodeURIComponent(epub.path));
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || 'EPUB 解析失败');
    awesomeChapters = (data.chapters || []).filter(chapter => chapter.paragraphs?.length);
    if (!awesomeChapters.length) throw new Error('EPUB 中没有可导入文章');
    chapterSelect.innerHTML = awesomeChapters.map((chapter, index) =>
      `<option value="${index}">${esc(chapter.title)} · ${chapter.paragraphs.length} 段</option>`).join('');
    chapterSelect.value = '0';
    $('#githubAwesomeControls').hidden = false;
    if (status) {
      status.textContent = `已解析 ${awesomeChapters.length} 篇文章，请选择后导入`;
      status.style.color = 'var(--teal)';
    }
  } catch (error) {
    awesomeChapters = [];
    chapterSelect.innerHTML = '';
    if (status) {
      status.textContent = error.message || 'EPUB 解析失败';
      status.style.color = 'var(--danger)';
    }
  }
}

async function importAwesomeChapter() {
  const issuePath = $('#awesomeIssueSelect').value;
  const index = Number($('#awesomeChapterSelect').value || 0);
  const chapter = awesomeChapters[index];
  const status = $('#githubResourceStatus');
  if (!issuePath || !chapter) {
    if (status) status.textContent = '请先加载期号并选择文章';
    return;
  }
  $('#btnImportAwesomeChapter').disabled = true;
  await annotateAndSave(
    { title: chapter.title, paragraphs: chapter.paragraphs, kind: 'document' },
    `github://${issuePath}#${index}`,
    'The Economist · GitHub EPUB',
    status,
    { allowRawMissingKey: true, rawOnFailure: true }
  );
  $('#btnImportAwesomeChapter').disabled = false;
}

async function checkServer() {
  const out = $('#pingOut');
  const base = /^https?:$/.test(location.protocol) ? location.origin : 'http://127.0.0.1:8787';
  try {
    const t0 = performance.now();
    const r = await fetch(base + '/api/health', { method: 'GET' });
    const j = await r.json();
    const ms = Math.round(performance.now() - t0);
    const keyReady = !!(j.hasKey || hasEngineCredential());
    if (out) { out.textContent = `在线 · ${ms}ms · key ${keyReady ? '已配置' : '未配置'}`; out.style.color = 'var(--teal)'; }
    $('#engineDot').classList.add('online');
  } catch (e) {
    if (out) { out.textContent = '未检测到本地服务（离线模式仍可完整使用）'; out.style.color = 'var(--ink-3)'; }
    $('#engineDot').classList.remove('online');
  }
}

function parseCrawlFeeds(value = S.settings.crawlFeeds) {
  return [...new Set(String(value || '').split(/[\n,]+/).map(x => x.trim()).filter(Boolean))];
}

function validateCrawlRange(from, to) {
  const start = new Date(String(from || '') + 'T00:00:00');
  const end = new Date(String(to || '') + 'T00:00:00');
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new Error('请选择有效的起止日期');
  if (start > end) throw new Error('起始日期不能晚于结束日期');
  if (end.getTime() - start.getTime() > 365 * DAY_MS) throw new Error('抓取时间窗最长为一年');
  return { from: String(from), to: String(to) };
}

function setCrawlStatus(text, bad = false) {
  const el = $('#crawlStatus');
  if (!el) return;
  el.textContent = text;
  el.style.color = bad ? 'var(--danger)' : 'var(--ink-3)';
}

function renderCrawlDiagnostics() {
  const button = $('#btnCrawlDetails');
  const panel = $('#crawlErrors');
  if (!button || !panel) return;
  const hasDetails = crawlDiagnostics.length > 0;
  button.hidden = !hasDetails;
  if (!hasDetails) {
    panel.hidden = true;
    panel.innerHTML = '';
    $('#crawlStatus').title = '';
    return;
  }
  $('#crawlStatus').title = crawlDiagnostics.map(item => `${item.type}：${item.message}`).join('\n');
  const groups = new Map();
  crawlDiagnostics.forEach(item => {
    if (!groups.has(item.type)) groups.set(item.type, []);
    groups.get(item.type).push(item.message);
  });
  panel.innerHTML = [...groups.entries()].map(([type, messages]) => `
    <div class="crawl-error-group">
      <b>${esc(type)} · ${messages.length}</b>
      ${messages.map(message => `<div>${esc(message)}</div>`).join('')}
    </div>`).join('');
}

function setCrawlDiagnostics(groups) {
  crawlDiagnostics = [];
  for (const [type, messages] of Object.entries(groups)) {
    for (const message of messages || []) {
      crawlDiagnostics.push({ type, message: String(message) });
    }
  }
  renderCrawlDiagnostics();
}

function paintCrawlStatus() {
  if (crawlRunning) return;
  const feeds = parseCrawlFeeds();
  if (!feeds.length) return setCrawlStatus('尚未配置订阅源');
  if (!S.settings.autoCrawl) return setCrawlStatus(`已配置 ${feeds.length} 个订阅源 · 自动检查未启用`);
  const last = S.lastCrawlAt ? new Date(S.lastCrawlAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '尚未运行';
  setCrawlStatus(`自动检查已启用 · 每 ${S.settings.crawlIntervalMin} 分钟 · 上次 ${last}`);
}

function scheduleCrawl() {
  if (crawlTimer) clearInterval(crawlTimer);
  if (crawlStartTimer) clearTimeout(crawlStartTimer);
  crawlTimer = null;
  crawlStartTimer = null;
  const feeds = parseCrawlFeeds();
  if (!S.settings.autoCrawl || !feeds.length) return paintCrawlStatus();
  const interval = Math.max(30, +S.settings.crawlIntervalMin || 60) * 60000;
  crawlTimer = setInterval(() => runCrawl({ silent: true }), interval);
  const last = +S.lastCrawlAt || 0;
  if (Date.now() - last >= interval) {
    crawlStartTimer = setTimeout(() => {
      crawlStartTimer = null;
      runCrawl({ silent: true });
    }, 1200);
  }
  paintCrawlStatus();
}

async function runCrawl({ silent = false } = {}) {
  if (crawlRunning) return false;
  const feeds = parseCrawlFeeds();
  if (!feeds.length) {
    setCrawlStatus('请先配置至少一个 RSS / Atom 订阅源', true);
    return false;
  }

  let range;
  try {
    range = validateCrawlRange(S.settings.crawlFrom, S.settings.crawlTo);
  } catch (e) {
    setCrawlStatus(e.message, true);
    return false;
  }

  crawlRunning = true;
  const btn = $('#btnCrawlNow');
  if (btn) btn.disabled = true;
  setCrawlDiagnostics({});
  setCrawlStatus('正在读取订阅源…');
  const maxItems = Math.min(10, Math.max(1, +S.settings.crawlMaxItems || 3));
  const sourceErrors = [];
  const articleErrors = [];
  const warnings = [];
  let imported = 0;
  let lastImportedId = null;
  if (S.settings.crawlAnnotate && !hasEngineCredential()) warnings.push('未配置模型凭据，本次仅保存原文');

  try {
    const feedResp = await fetch('/api/feed', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ feeds, from: range.from, to: range.to, limit: Math.min(50, maxItems * 4) })
    });
    const feedData = await feedResp.json();
    if (!feedData.ok) throw new Error(feedData.error || '订阅源读取失败');
    (feedData.errors || []).forEach(error => sourceErrors.push(error));

    const existingUrls = new Set(ARTICLES.map(a => a._url).filter(Boolean));
    const candidates = (feedData.items || []).filter(item => !existingUrls.has(item.url));
    if (!candidates.length) {
      S.lastCrawlAt = Date.now();
      save();
      setCrawlStatus('所选时间窗内没有新的文章');
      if (!silent) toast('所选时间窗内没有新的文章');
      return false;
    }

    const attemptLimit = Math.min(candidates.length, maxItems + 20);
    for (let index = 0; index < attemptLimit && imported < maxItems; index++) {
      const item = candidates[index];
      setCrawlStatus(`抓取 ${imported + 1}/${maxItems} · 尝试 ${index + 1}/${attemptLimit} · ${item.title}`);
      try {
        const pageResp = await fetch('/api/fetch?url=' + encodeURIComponent(item.url));
        const pageData = await pageResp.json();
        if (!pageData.ok) throw new Error(pageData.error || '正文抓取失败');
        let raw = {
          title: item.title || pageData.title,
          deck: item.summary || '',
          level: 'C1',
          topic: 'markets',
          paragraphs: pageData.paragraphs.map(en => ({ en, zh: '', note: '' }))
        };
        if (S.settings.crawlAnnotate && !hasEngineCredential()) {
          raw._annotationStatus = 'failed';
          raw._annotationError = '未配置模型 API Key';
        }

        if (S.settings.crawlAnnotate && hasEngineCredential()) {
          try {
            raw = await requestAnnotationWithProgress({
              ...(await modelRequestPayload()),
              paragraphs: pageData.paragraphs,
              title: item.title || pageData.title,
              vocabFocus: S.settings.vocabFocus
            }, `自动抓取标注 · ${item.title}`);
            raw._annotationStatus = 'complete';
            raw._annotationError = '';
          } catch (error) {
            const message = String(error.message || error || '自动标注失败');
            raw._annotationStatus = 'failed';
            raw._annotationError = message;
            warnings.push(`${item.title}: 标注失败，已保存原文（${message}）`);
          }
        }

        const art = normalizeArticle(raw, item.url, item.source);
        art.title = item.title || art.title;
        art.date = item.date || todayStr();
        if (persistCustom(art)) {
          imported++;
          lastImportedId = art.id;
        }
      } catch (e) {
        articleErrors.push(`${item.title}: ${e.message || e}`);
      }
    }

    S.lastCrawlAt = Date.now();
    save();
    renderList();
    renderKB();
    renderExport();
    if (imported && !silent) {
      switchView('reader');
      openArticle(lastImportedId);
    }
    const errors = [...sourceErrors, ...articleErrors];
    setCrawlDiagnostics({ '订阅源失败': sourceErrors, '正文抓取失败': articleErrors, '处理提示': warnings });
    const errorSuffix = errors.length ? ` · ${errors.length} 项失败` : '';
    const warningSuffix = warnings.length ? ` · ${warnings[0]}` : '';
    setCrawlStatus(`已导入 ${imported} 篇${errorSuffix}${warningSuffix}`, imported < maxItems);
    if (!silent || imported) toast(`自动抓取完成：新增 ${imported} 篇${errorSuffix}${warningSuffix}`);
    return imported > 0;
  } catch (e) {
    setCrawlStatus('抓取失败：' + (e.message || e), true);
    if (!silent) toast('抓取失败：' + (e.message || e));
    return false;
  } finally {
    crawlRunning = false;
    if (btn) btn.disabled = false;
  }
}

/* ================= 导入外刊（内容抓取模块） ================= */
const TOPIC_IDS = ['policy', 'markets', 'corporate', 'fintech', 'em', 'commodity', 'other'];

function clearImportFailure() {
  lastImportFailure = null;
  $('#importFailure').hidden = true;
  $('#importFailureReason').textContent = '';
  $('#importFailureSolutions').innerHTML = '';
}

function importFailureAdvice(error, context) {
  const message = String(error?.message || error || '未知错误');
  if (/API Key|密钥|401|403|unauthorized|invalid.*key/i.test(message)) {
    return {
      title: '模型密钥不可用',
      solutions: ['在 AI 面板读取并导入 CC Switch 配置，或填写可用 API Key', '点击“测试模型连接”确认地址、模型和密钥', '也可以先仅保存原文，之后配置模型再重新导入']
    };
  }
  if (/文章质量校验|正文有效内容不足|连贯|完整文章|明显过短/i.test(message)) {
    return {
      title: '正文质量未通过',
      solutions: ['检查链接是否指向正文页，而不是栏目页、导航页或登录页', '优先粘贴完整正文，或上传 TXT、Markdown、DOCX、PDF', '删除订阅、广告、图注等无关内容后重试']
    };
  }
  if (/未返回学习词汇|未返回知识卡|模型未返回.*(?:词汇|知识卡)/i.test(message)) {
    return {
      title: '模型结果不完整',
      solutions: ['点击“重试导入”，让模型重新生成词汇与知识卡', '点击“测试模型连接”，确认当前模型支持稳定 JSON 输出', '若连续失败，请切换模型或改用兼容 OpenAI 的接口后重试']
    };
  }
  if (/JSON|json|代码块|格式异常|解析失败|finish=/i.test(message)) {
    return {
      title: '模型返回格式异常',
      solutions: ['点击“重试导入”，让模型重新生成结构化结果', '在 AI 面板测试模型连接，确认接口支持 JSON 输出', '若仍失败，请切换为更稳定的模型后重试']
    };
  }
  if (/上游返回\s*(?:4|5)\d\d|模型服务|gateway|upstream/i.test(message)) {
    return {
      title: '模型服务异常',
      solutions: ['稍后点击“重试导入”', '打开 AI 面板检查模型地址、模型名称和配额', '如服务持续返回 5xx，请更换可用模型或服务商']
    };
  }
  if (/超时|timeout|fetch failed|ECONN|ENOTFOUND|网络/i.test(message)) {
    return {
      title: '网络或目标站点异常',
      solutions: ['确认工作台服务可联网，并在浏览器中亲自打开原文链接', '稍后点击“重试导入”', '若站点有付费墙或反爬验证，请粘贴正文或上传文档']
    };
  }
  return {
    title: '导入未完成',
    solutions: ['点击“重试导入”再次执行', '点击“测试模型连接”检查模型配置', '尝试改用粘贴正文或上传文档']
  };
}

function showImportFailure(error, context = {}) {
  const message = String(error?.message || error || '未知错误');
  const advice = importFailureAdvice(error, context);
  lastImportFailure = { ...context, error: message, ...advice };
  $('#importFailureTitle').textContent = advice.title;
  $('#importFailureStage').textContent = context.stage || '导入失败';
  $('#importFailureReason').textContent = message;
  $('#importFailureSolutions').innerHTML = advice.solutions.map(item => `<li>${esc(item)}</li>`).join('');
  $('#btnSaveImportRaw').hidden = !context.extracted;
  $('#importFailure').hidden = false;
  $('#importFailure').scrollIntoView({ block: 'nearest' });
}

function saveRawImportFromFailure() {
  if (!lastImportFailure?.extracted) return;
  const context = lastImportFailure;
  const raw = normalizeArticle({
    title: context.extracted.title,
    deck: '已保存原文；可在配置模型后重新导入生成标注。',
    level: 'C1',
    topic: context.extracted.topic || 'markets',
    paragraphs: context.extracted.paragraphs.map(en => ({ en, zh: '', note: '' })),
    _annotationStatus: 'failed',
    _annotationError: String(context.error || '导入失败')
  }, context.url, context.source);
  const existingIndex = (S.custom || []).findIndex(article => article._url === context.url);
  if (existingIndex >= 0) {
    raw.id = S.custom[existingIndex].id;
    clearVocabularyOverride(raw.id);
    S.custom[existingIndex] = raw;
    const articleIndex = ARTICLES.findIndex(article => article.id === raw.id);
    if (articleIndex >= 0) ARTICLES[articleIndex] = raw;
  } else if (!persistCustom(raw)) {
    return;
  }
  save();
  clearImportFailure();
  closeImportAndOpen(raw, '已保存原文；配置模型后可重新导入生成标注');
}

function retryImportFromFailure() {
  const type = lastImportFailure?.retryType;
  clearImportFailure();
  if (type === 'url') doImport();
  if (type === 'paste') importPastedText();
  if (type === 'document') uploadDocument();
}

function copyImportDiagnostics() {
  const failure = lastImportFailure;
  if (!failure) return;
  const text = [
    `阶段：${failure.stage || '导入'}`,
    `原因：${failure.error}`,
    `地址：${failure.url || '(无)'}`,
    `模型：${S.settings.model || '(未配置)'}`,
    `接口：${S.settings.baseUrl || '(未配置)'}`,
    `密钥：${hasServerManagedCredential() ? '由本地服务托管' : S.settings.apiKey ? '已配置' : '未配置'}`
  ].join('\n');
  navigator.clipboard?.writeText(text);
  toast('诊断信息已复制');
}

function wireImport() {
  $('#btnImport').addEventListener('click', () => {
    $('#importStatus').textContent = '待开始';
    $('#importStatus').style.color = 'var(--ink-3)';
    $('#uploadStatus').textContent = '支持 TXT / Markdown / HTML / DOCX';
    $('#textImportStatus').textContent = '正文仅在本机处理';
    $('#importPreview').innerHTML = '';
    clearImportFailure();
    $('#importModal').hidden = false;
    setTimeout(() => {
      const active = document.activeElement;
      if (!active || active === document.body || active.id === 'btnImport') $('#importUrl').focus();
    }, 60);
  });
  $('#importModal').addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) {
      $('#importModal').hidden = true;
      clearImportFailure();
    }
  });
  $('#btnImportGo').addEventListener('click', doImport);
  $('#btnUploadGo').addEventListener('click', uploadDocument);
  $('#btnImportText').addEventListener('click', importPastedText);
  $('#btnRetryImport').addEventListener('click', retryImportFromFailure);
  $('#btnSaveImportRaw').addEventListener('click', saveRawImportFromFailure);
  $('#btnCopyImportDiagnostics').addEventListener('click', copyImportDiagnostics);
  $('#btnTestImportModel').addEventListener('click', () => {
    $('#importModal').hidden = true;
    openEngineSettings();
    if (hasEngineCredential()) setTimeout(() => fetchAvailableModels(true), 120);
    else {
      const status = $('#modelStatus');
      status.textContent = '请先填写 API Key 或导入 CC Switch 配置，再测试连接';
      status.style.color = 'var(--amber)';
    }
  });
  $('#importUrl').addEventListener('keydown', (e) => { if (e.key === 'Enter') doImport(); });
}

function sanitizeVocabList(value) {
  const decoded = (text) => decodeHtmlText(text || '');
  const decodedList = (list) => Array.isArray(list) ? list.map(item => decoded(item)) : [];
  return (Array.isArray(value) ? value : [])
    .map(vocab => {
      const source = vocab && typeof vocab === 'object' ? vocab : {};
      const exam = decodedList(source.exam).map(normalizeVocabularyExamTag).filter(Boolean);
      const forms = decodedList(source.forms);
      const formKeys = new Set(forms.map(form => form.toLowerCase()));
      return {
        ...source,
        w: decoded(source.w || source.word).trim(),
        ipa: decoded(source.ipa),
        pos: decoded(source.pos),
        zh: decoded(source.zh),
        en: decoded(source.en),
        forms,
        formChanges: (Array.isArray(source.formChanges) ? source.formChanges : [])
          .map(change => ({
            label: decoded(change?.label).trim(),
            value: decoded(change?.value).trim()
          }))
          .filter(change => change.label && change.value &&
            (!formKeys.size || formKeys.has(change.value.toLowerCase()))),
        synonyms: decodedList(source.synonyms),
        exam,
        ex: decoded(source.ex),
        exZh: decoded(source.exZh)
      };
    })
    .filter(vocab => vocab.w);
}

function inferVocabularyFormLabel(base, partOfSpeech, form) {
  const word = String(base || '').toLowerCase();
  const value = String(form || '').toLowerCase();
  const pos = String(partOfSpeech || '').toLowerCase();
  if (!word || !value) return '';
  if (value === `more ${word}`) return '比较级';
  if (value === `most ${word}`) return '最高级';
  if (pos.includes('adj') && /^[a-z-]+er$/.test(value)) return '比较级';
  if (pos.includes('adj') && /^[a-z-]+est$/.test(value)) return '最高级';
  if (pos.includes('n') && (value === `${word}s` || value === `${word}es` ||
      (/y$/.test(word) && value === `${word.slice(0, -1)}ies`))) return '复数';
  if (pos.includes('v') && (value === `${word}s` || value === `${word}es` ||
      (/y$/.test(word) && value === `${word.slice(0, -1)}ies`))) return '第三人称单数';
  if (value === `${word}ed` || value === `${word}d` ||
      (/y$/.test(word) && value === `${word.slice(0, -1)}ied`)) return '过去式 / 过去分词';
  if (value === `${word}ing` || (/e$/.test(word) && value === `${word.slice(0, -1)}ing`)) {
    return '现在分词';
  }
  return '相关词形';
}

function vocabularyFormChanges(vocab, dictionary = null) {
  const byValue = new Map();
  const add = (entry, inferred = false) => {
    const value = decodeHtmlText(entry?.value || '').trim();
    const label = decodeHtmlText(entry?.label || '').trim();
    if (!value || !label) return;
    const key = value.toLowerCase();
    if (!byValue.has(key)) {
      byValue.set(key, { value, labels: new Set([label]), inferred });
      return;
    }
    const current = byValue.get(key);
    current.labels.add(label);
    current.inferred = current.inferred && inferred;
  };
  for (const change of vocab?.formChanges || []) add(change);
  for (const change of dictionary?.formChanges || []) add(change);
  for (const form of vocab?.forms || []) {
    const value = decodeHtmlText(form).trim();
    if (!value || byValue.has(value.toLowerCase())) continue;
    add({ value, label: inferVocabularyFormLabel(vocab.w, vocab.pos, value) }, true);
  }
  return [...byValue.values()].map(change => ({
    value: change.value,
    label: [...change.labels].join(' / ')
  }));
}

function sanitizeParagraphAnalysis(value) {
  const raw = value && typeof value === 'object' ? value : {};
  const english = raw.english && typeof raw.english === 'object' ? raw.english : {};
  const finance = raw.finance && typeof raw.finance === 'object' ? raw.finance : {};
  const focus = raw.focus && typeof raw.focus === 'object' ? raw.focus : {};
  const text = item => decodeHtmlText(item || '').trim();
  return {
    ...raw,
    english: {
      ...english,
      longSentence: text(english.longSentence),
      grammar: text(english.grammar),
      expression: text(english.expression)
    },
    finance: {
      ...finance,
      term: text(finance.term),
      background: text(finance.background),
      relevance: text(finance.relevance)
    },
    focus: {
      ...focus,
      label: text(focus.label),
      guidance: text(focus.guidance),
      recommendations: Array.isArray(focus.recommendations)
        ? focus.recommendations.map(text).filter(Boolean).slice(0, 3)
        : []
    }
  };
}

function sanitizeFocusedAnalyses(value, expectedLength) {
  if (!Array.isArray(value) || value.length !== expectedLength) return [];
  return value.map(item => sanitizeParagraphAnalysis(item));
}

function normalizedKnowledgeAlias(value) {
  return decodeHtmlText(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function classifyKnowledgeCategoryClient(card = {}) {
  if (card.categoryLocked && Object.hasOwn(KNOWLEDGE_CATEGORIES, card.category)) {
    return {
      category: card.category,
      categories: Array.isArray(card.categories) && card.categories.length
        ? card.categories.filter(item => Object.hasOwn(KNOWLEDGE_CATEGORIES, item))
        : [card.category],
      reason: card.categoryReason || '该分类已经过用户确认的分类核验。',
      confidence: Number(card.categoryConfidence) || 0.9
    };
  }
  const term = decodeHtmlText(`${card.term || ''} ${card.en || ''}`).toLowerCase();
  const context = decodeHtmlText([
    card.term,
    card.en,
    card.one,
    card.body,
    card.cases,
    card.classificationReason,
    card.categoryReason,
    ...(Array.isArray(card.methodSteps) ? card.methodSteps : []),
    ...(Array.isArray(card.scenarios) ? card.scenarios : []),
    ...(Array.isArray(card.related) ? card.related : []),
    ...(Array.isArray(card.match) ? card.match : [])
  ].filter(Boolean).join(' ')).toLowerCase();
  const modelCategory = Object.hasOwn(KNOWLEDGE_CATEGORIES, card.category) ? card.category : '';
  const methodSteps = Array.isArray(card.methodSteps) ? card.methodSteps.filter(Boolean) : [];
  const cardType = String(card.cardType || '').trim().toLowerCase();
  const relativeValuationProcedurePattern = /\b(relative valuation|relative pricing|comparables valuation|comparable company analysis)\b|相对估值|相对定价|可比公司估值|可比估值/;
  const revenueManagementFinancePattern = /\b(airline revenue management|revenue management|yield management)\b|航空.*收益管理|航线.*收益管理|收益管理/;
  if (revenueManagementFinancePattern.test(term)) {
    return {
      category: 'finance',
      categories: ['finance'],
      reason: '对象通过需求预测、舱位库存和动态定价配置收益，属于价格与收益管理活动，归入金融术语。',
      confidence: 0.95
    };
  }
  const analysisInfrastructurePattern = /\b(autonomous labs?|self.driving facilities?|automated labs?|laboratory automation|drug discovery(?: pipeline)?|clinical development pipeline|research infrastructure|research platform|computing power|computational infrastructure|ai agents?|autonomous agents?|agentic workflows?|multi.agent systems?|(?:model(?:ing)?|simulation) (?:platform|system|software|tool(?:kit)?|application|engine))\b|自主实验室|自动化实验室|药物研发管线|科研基础设施|算力|AI代理/;
  if (analysisInfrastructurePattern.test(term)) {
    return {
      category: 'background',
      categories: ['background'],
      reason: '对象是科研设施、研发管线、软件平台、执行环境或 AI 工具，本身不构成可迁移的分析方法，归入背景层。',
      confidence: 0.96
    };
  }
  const methodDescription = decodeHtmlText([
    card.one,
    card.body,
    card.classificationReason,
    card.categoryReason,
    ...methodSteps,
    ...(Array.isArray(card.scenarios) ? card.scenarios : [])
  ].filter(Boolean).join(' ')).toLowerCase();
  const pricingEvidenceText = decodeHtmlText([
    card.one,
    card.body,
    card.cases,
    card.classificationReason,
    card.categoryReason
  ].filter(Boolean).join(' ')).toLowerCase();
  const methodEvidence = [
    /analyz|analys|assess|evaluate|estimate|forecast|predict|project|simulate|compare|measure|value|decision|scenario|risk|分析|估计|预测|评估|比较|计量|模拟|决策|情景|风险|估值|核查|检查|判断|识别|追踪|筛选|排序|测算|换算|调查|验证|归因|区分/.test(methodDescription),
    /assum|theory|theoretical|distribution|correlation|parameter|functional form|model specification|rule|initial condition|environment|network|假设|理论|概率分布|相关性|参数|函数关系|模型设定|规则|初始条件|环境|网络|口径|边界|限制|门槛|窗口|样本|误差|偏差|约束|可比性|季节因子|折算/.test(methodDescription),
    /input|data|variable|parameter|exposure|scenario|sample|initial condition|输入|数据|变量|参数|暴露|情景|样本|初始条件|对象|序列|指标|票数|余额|收入|成本|价格|时间|金额|库存|来源|文本|问卷|行业|家庭|资产|负债|销量|销售额/.test(methodDescription),
    /transform|process|estimate|simulat|calculat|comput|regress|discount|project|transmission|time series|monte carlo|training|optimization|equation|iterat|interaction|计算|估计|模拟|回归|折现|传导|处理|训练|优化|方程|迭代|交互|运行|比较|划分|排序|映射|汇总|拆解|调整|剔除|核查|检查|检验|追踪|筛选|预测|控制|区分|交叉验证|换算|反推|评估|判断|考察|定位|识别|补充/.test(methodDescription),
    /output|result|forecast|prediction|projection|confidence interval|\bvar\b|expected loss|estimate|capital adequacy|输出|结果|预测|置信区间|预期损失|资本充足率|估计值|占比|概率|结论|差异|变化|趋势|质量|分数|判断|解释|决策|溢价|价格|收益|增长|下降|排名|分位|风险|回报|季调值|指标|表现/.test(methodDescription),
    /boundary|limitation|uncertain|validation|backtest|out.of.sample|error|condition|invalid|失效|边界|不确定性|校验|验证|样本外|误差|偏差|噪音|口径|样本|可能|不能|覆盖|范围|限制|假设|风险/.test(methodDescription)
  ];
  const methodEvidenceScore = methodEvidence.filter(Boolean).length;
  const hasCompleteMethodProcedure = cardType === 'method' &&
    methodSteps.length >= 2 &&
    methodEvidenceScore >= 5 &&
    methodEvidence[0] && methodEvidence[2] && methodEvidence[3] && methodEvidence[4];
  const methodPattern = /\b(stress test(?:ing)?|scenario analys(?:is|es)|scenario testing|event study|regression analys(?:is|es)|regression model|econometrics?|econometric (?:analysis|model)|dcf|discounted cash flow|value at risk|var|sensitivity analys(?:is|es)|monte carlo (?:simulation|model)|factor model|capm|option pricing model|game theory|ratio analys(?:is|es)|duration analys(?:is|es)|comparative statics|cost.benefit analys(?:is|es)|break.even analys(?:is|es)|valuation model|valuation framework|risk management framework|enterprise risk management|regulatory risk management|compliance risk management|forecasting method|machine learning analysis|statistical learning method|statistical method|quantitative method|decision analysis|multi.criteria analysis|seasonal adjustment|data surprise analysis|job.growth breadth analysis|incremental vote.margin comparison|vote.margin analysis|founder.market fit|venture capital team evaluation|source completeness screening|stated preference survey|wealth quantile analysis|opportunity cost and time allocation|attribution in reported speech|upc.based retail sales tracking|retail sales tracking)\b|基于UPC的零售销售追踪|零售销售追踪/i;
  const normalizedTermNames = [card.term, card.en]
    .map(value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim())
    .filter(Boolean);
  const methodCandidateNamePattern = /^(?:agent based model(?:ing|s)?|multi agent simulation(?:s)?)$/i;
  const hasMethodCandidateName = normalizedTermNames.some(value => methodCandidateNamePattern.test(value));
  const hasNamedMethod = methodPattern.test(term);
  const hasSupportedMethodContext = hasCompleteMethodProcedure;
  const capexCashFlowPattern = /\b(?:capital expenditure|capital expenditures|capex)\b.*\b(?:cash ?flow|ocf|fcf|free cash flow|operating cash flow|financing gap|liquidity|debt|credit)\b|\b(?:cash ?flow|ocf|fcf)\b.*\b(?:capital expenditure|capital expenditures|capex)\b|资本支出.*现金流|资本开支.*现金流/;
  const purchasingPowerPattern = /\bpurchasing power(?!\s+parity)\b|购买力(?!平价)/;
  if (relativeValuationProcedurePattern.test(term)) {
    return hasCompleteMethodProcedure
      ? {
          category: 'finance',
          categories: ['finance', 'method'],
          reason: '对象属于金融估值，同时描述包含可比对象、口径统一、倍数比较、风险检查和适用边界，作为金融内容交叉归入分析方法。',
          confidence: 0.97
        }
      : {
          category: 'finance',
          categories: ['finance'],
          reason: '对象直接比较可比公司、估值倍数或相对价格，主要解释资产相对贵贱；描述不足以还原完整分析程序，因此不交叉归入方法。',
          confidence: 0.95
        };
  }
  if (capexCashFlowPattern.test(term) && hasCompleteMethodProcedure) {
    return {
      category: 'finance',
      categories: ['finance', 'method'],
      reason: '对象同时属于资本支出与现金流分析，并具备可复现的比较、计算和边界说明，主分类金融并交叉分析方法。',
      confidence: 0.93
    };
  }
  if (purchasingPowerPattern.test(term) && hasCompleteMethodProcedure) {
    return {
      category: 'finance',
      categories: ['finance', 'method'],
      reason: '对象首先属于货币购买力与家庭实际收入指标，同时具备完整的价格指数、支出权重和实际值计算程序，金融内容交叉分析方法。',
      confidence: 0.92
    };
  }
  if (hasNamedMethod || (hasMethodCandidateName && hasCompleteMethodProcedure) || hasSupportedMethodContext) {
    return {
      category: 'method',
      categories: ['method'],
      reason: '卡片描述可识别的分析、计量、估值、模拟或检验程序，归入分析方法。',
      confidence: 0.99
    };
  }

  const analyticalModelPattern = /\b(?:(?:scenario|forecasting|risk|climate|valuation|econometric|regression|factor|option pricing|statistical|predictive|projection|credit|market|pricing|analytical|analytics|quantitative|financial|economic|mathematical)\s+models?)\b/i;
  const exactModelNamePattern = /^(?:model|models|modeling|modelling)$/i;
  const analyticalModelCandidate = analyticalModelPattern.test(term) ||
    exactModelNamePattern.test(String(card.term || '').trim()) ||
    exactModelNamePattern.test(String(card.en || '').trim());
  if (analyticalModelCandidate) {
    const hasCompleteModelChain = methodEvidenceScore >= 5 &&
      methodEvidence[0] && methodEvidence[2] && methodEvidence[3] && methodEvidence[4] &&
      methodSteps.length >= 2;
    if (hasCompleteModelChain) {
      return {
        category: 'method',
        categories: ['method'],
        reason: '对象虽以 model 命名，但描述包含分析目的、假设与输入、变换或模拟步骤、输出解释及适用边界，归入分析方法。',
        confidence: 0.96
      };
    }
    return {
      category: 'background',
      categories: ['background'],
      reason: '对象虽以 model 命名，但描述不足以还原假设、输入、处理步骤和输出解释，暂归背景层。',
      confidence: 0.9
    };
  }
  const methodImplementationPattern = /\b(scenario simulation platform|(?:model(?:ing)?|multi.agent simulation|agent.based model(?:ing)?) (?:platform|system|software|tool(?:kit)?|application|engine))\b/i;
  if (methodImplementationPattern.test(term)) {
    return {
      category: 'background',
      categories: ['background'],
      reason: '对象是分析程序的软件、平台或计算实现；实现环境本身不构成分析方法，归入背景层。',
      confidence: 0.95
    };
  }
  const aiSystemToolPattern = /\b(ai agents?|autonomous agents?|agentic workflows?|multi.agent systems?|multi.agent simulation platform|ai agent platform|ai agent framework)\b/i;
  if (aiSystemToolPattern.test(term)) {
    return {
      category: 'background',
      categories: ['background'],
      reason: '对象是 AI 软件系统、代理、执行流程或工具环境，本身不构成可重复的分析方法，归入背景层。',
      confidence: 0.97
    };
  }
  const aiTradeRepricingPattern = /\b(ai[- ]trade[- ]repricing|repricing of (?:the )?ai trade|ai[- ](?:stock|equity|valuation)[- ]repricing)\b/i;
  if (aiTradeRepricingPattern.test(term)) {
    return {
      category: 'background',
      categories: ['background', 'finance'],
      reason: 'AI 技术、竞争或市场情绪变化是外部背景冲击，但其结果表现为 AI 相关资产估值、仓位和市场价格重定价，归入背景层并交叉归入金融术语。',
      confidence: 0.96
    };
  }
  const financialRecoveryPattern = /\b(recovery rate|recovery amount|loss given default|lgd|non.performing asset recovery|debt recovery|loan recovery)\b|不良资产处置|不良资产回收|不良贷款回收|不良贷款清收|债权回收|现金清收|抵押物处置/i;
  if (financialRecoveryPattern.test(term)) {
    return {
      category: 'finance',
      categories: ['finance'],
      reason: '对象涉及不良资产、债权回收或违约后回收指标，属于信用风险管理和金融资产处置，归入金融术语。',
      confidence: 0.97
    };
  }
  const judicialEnforcementPattern = /限制高消费|高消费限制|限制消费措施|限制消费令|失信被执行人|纳入失信被执行人名单|可执行资产|可供执行财产|被执行人财产|责任财产/;
  if (judicialEnforcementPattern.test(term)) {
    return {
      category: 'background',
      categories: ['background'],
      reason: '对象属于人民法院民事执行、财产查控或失信惩戒制度，金融影响是法律执行后果，不构成金融本体，归入背景层。',
      confidence: 0.97
    };
  }
  const genericAssetRecoveryPattern = /\b(asset recovery)\b|资产回收/;
  if (genericAssetRecoveryPattern.test(term)) {
    return {
      category: 'background',
      categories: ['background'],
      reason: '未限定为不良资产或债权回收的资产回收首先属于资产处置与追偿机制，暂归背景层，不构成分析方法。',
      confidence: 0.9
    };
  }
  const financialCorporateTransactionPattern = /\b(?:strategic acquisition|merger|takeover|self.funding|bootstrap financing)\b|战略收购|并购交易|收购交易|敌意收购|自筹资金|自筹融资/i;
  if (financialCorporateTransactionPattern.test(term)) {
    return {
      category: 'finance',
      categories: ['finance'],
      reason: '对象涉及企业控制权交易、并购、资金结构或融资来源，属于公司金融活动，归入金融术语。',
      confidence: 0.97
    };
  }
  const consumerBiomedBusinessPattern = /电解质补水|补水需求|补水趋势|饮料品类|品类扩张|品类颠覆|消费需求|消费趋势|消费者趋势|首席执行官|行政总裁|市场细分|产品差异化|品牌资产|品牌相关性|复购买家率|复购率|消费品增长战略|\bchief executive officer\b|\bchief executive\b|\bceo\b|\bglp.1(?:\s+receptor agonist)?\b|receptor agonist|drug class|therapeutic class|pharmaceutical drug|beverage category|category disruption|category expansion|consumer demand|consumer trend|hydration demand|electrolyte hydration|market segmentation|product differentiation|brand equity|brand relevance|repeat buyer rate|repeat purchase rate|repurchase rate|consumer staples growth strategy|market share leadership|generational marketing|broader appeal/i;
  if (consumerBiomedBusinessPattern.test(term)) {
    return {
      category: 'background',
      categories: ['background'],
      reason: '对象属于消费趋势、产品品类、医药或生物科技、企业经营或高级管理角色，不是融资、估值、金融资产或金融风险计量，归入背景层。',
      confidence: 0.96
    };
  }
  const negotiationLeveragePattern = /\b(bargaining power|negotiating power|bargaining leverage|negotiating leverage|negotiation leverage|leverage in (?:a )?(?:negotiation|bargaining)|bargaining chips?|negotiating chips?|negotiation chips?|negotiating cards?)\b|谈判筹码|谈判杠杆|谈判力|谈判优势|议价能力|议价权/;
  if (negotiationLeveragePattern.test(term)) {
    return {
      category: 'background',
      categories: ['background'],
      reason: '对象描述谈判、议价、组织关系或政策博弈中的相对影响力；“leverage”在这里是谈判杠杆，不是财务杠杆或金融工具，归入背景层。',
      confidence: 0.97
    };
  }
  const jointlyControlledEquityStakePattern = /\bjointly controlled equity (?:stake|interest|holding)\b|共同控制的?(?:股权|股份|权益)/i;
  if (jointlyControlledEquityStakePattern.test(term)) {
    return {
      category: 'finance',
      categories: ['finance', 'background'],
      reason: '主解释对象是上市公司或其他企业的股权资产，经济收益、投票、出售和处分权会影响减持、控制权、披露与估值；共同信托、婚姻或治理安排是背景维度，因此金融为主并交叉背景。',
      confidence: 0.96
    };
  }
  const divorceAssetDivisionPattern = /\bdivorce (?:asset|property) division|division of (?:marital|community) property|marital property division\b|离婚(?:财产|资产)分割|夫妻共同财产分割|婚姻财产分割/;
  if (divorceAssetDivisionPattern.test(term)) {
    const positiveDivisionContext = context
      .replace(/(?:不涉及|不包含|没有|无需|并非|而不是|不构成)[^。；;！？\n]{0,180}/gi, ' ')
      .replace(/\b(?:without|does not|doesn't|did not|no)\b[^.!?]{0,180}/gi, ' ');
    const financialDivisionEvidence = /\b(financial assets?|securities?|stocks?|shares?|equity|business interests?|valuation|market value|liquidity|tax|debt|portfolio|pension|brokerage|bank accounts?|trust assets?)\b|金融资产|证券|股票|股份|股权|企业权益|估值|流动性|税务|债务|投资组合|养老金|银行账户|信托资产/.test(positiveDivisionContext);
    return financialDivisionEvidence
      ? {
          category: 'background',
          categories: ['background', 'finance'],
          reason: '主解释对象是婚姻财产制下确定财产归属与分配的法律机制；本案同时涉及证券或企业权益的估值、流动性、控制权和税务，金融关系独立成立，因此背景为主并交叉金融。',
          confidence: 0.94
        }
      : {
          category: 'background',
          categories: ['background'],
          reason: '主解释对象是婚姻财产制下确定财产归属与分配的法律机制；没有可识别的金融资产定价、融资、风险转移或估值关系，保留背景层。',
          confidence: 0.91
        };
  }
  const financialLawPattern = /\b(financial law|banking law|securities law|insurance law|insolvency law|bankruptcy law|investor protection|deposit insurance|financial compliance|securities litigation)\b/i;
  if (financialLawPattern.test(term)) {
    return {
      category: 'background',
      categories: ['background', 'finance'],
      reason: '术语属于法律规则或司法约束，但直接规范金融交易、机构与投资者关系，归入背景层并交叉归入金融术语。',
      confidence: 0.98
    };
  }
  const financialRiskExposurePattern = /\b(financial risk|financial risk control|financial risk management|market risk|market risk control|credit risk|credit risk control|interest rate risk|liquidity risk|liquidity risk control|solvency risk|counterparty risk|underwriting risk|insurance risk|currency risk|foreign exchange risk|bank operational risk|banking operational risk|financial institution operational risk|regulatory capital risk|capital adequacy risk)\b/i;
  if (financialRiskExposurePattern.test(term)) {
    return {
      category: 'finance',
      categories: ['finance'],
      reason: '术语直接描述可计量的金融暴露、金融损失或风险转移机制，归入金融术语。',
      confidence: 0.98
    };
  }
  const marketCorrectionPattern = /\b(?:stock|equity)?\s*market correction\b|股市修正|市场修正/;
  if (marketCorrectionPattern.test(term)) {
    const nonFinancialMarket = /\b(housing|property|real estate|commodity|industrial|inventory|supply chain)\b|房地产|楼市|商品市场|产业|库存/.test(`${term} ${context}`);
    if (nonFinancialMarket) {
      return {
        category: 'background',
        categories: ['background'],
        reason: '术语虽然使用 correction，但主解释对象是房地产、商品、产业或库存价格调整，没有股票、证券或其他金融资产定价关系，归入背景层。',
        confidence: 0.86
      };
    }
    return {
      category: 'finance',
      categories: hasCompleteMethodProcedure ? ['finance', 'method'] : ['finance'],
      reason: '对象是股票、证券或金融资产价格从近期高点回撤的市场现象，归入金融术语；回撤计算本身仅在具备完整程序时交叉方法。',
      confidence: hasCompleteMethodProcedure ? 0.88 : 0.97
    };
  }
  const circularFinancingPattern = /\bcircular financing\b|循环融资|资金闭环/;
  if (circularFinancingPattern.test(term)) {
    const circularFinanceEvidence = /\b(invest|investment|procurement|purchase|cloud|compute|supplier finance|receivable|payable|cash flow|financing|equity|debt|credit|liquidity|refinancing)\b|投资|采购|云|算力|供应商融资|应收|应付|现金流|融资|股权|债务|信用|流动性|再融资/.test(context);
    const circularClosureEvidence = /\b(circular|loop|mutual|interdependent|recycle|round.trip)\b|闭环|循环|相互依赖|回流|往返/.test(context);
    if (circularFinanceEvidence && circularClosureEvidence) {
      return {
        category: 'finance',
        categories: ['finance', 'background'],
        reason: '投资、采购、云承诺或供应商融资在关联主体之间形成实质资金闭环，并影响现金流、融资或信用暴露；金融关系为主，产业与技术背景交叉。',
        confidence: 0.89
      };
    }
  }
  if (capexCashFlowPattern.test(term)) {
    return {
      category: 'finance',
      categories: hasCompleteMethodProcedure ? ['finance', 'method'] : ['finance', 'background'],
      reason: hasCompleteMethodProcedure
        ? '对象同时属于资本支出与现金流分析，并具备可复现的比较、计算和边界说明，主分类金融并交叉分析方法。'
        : '主解释对象已从实体采购转为资本支出对经营现金流、自由现金流、融资缺口或流动性的影响；金融关系为主，实体投资背景交叉。',
      confidence: hasCompleteMethodProcedure ? 0.93 : 0.91
    };
  }
  if (purchasingPowerPattern.test(term)) {
    return {
      category: 'finance',
      categories: ['finance'],
      reason: '购买力衡量货币单位能够购买的实际商品与服务，并连接名义收入、物价和家庭实际财务能力，归入金融指标。',
      confidence: 0.94
    };
  }

  const financialPolicyPattern = /\b(monetary policy|fiscal policy|tax policy|financial policy|financial regulation|banking regulation|prudential policy|macroprudential|regulatory capital|capital requirement|financial supervision|deposit protection)\b/i;
  if (financialPolicyPattern.test(term)) {
    return {
      category: 'finance',
      categories: ['finance', 'background'],
      reason: '术语涉及金融政策、监管规则或资本约束，归入金融术语并交叉归入背景层。',
      confidence: 0.98
    };
  }
  const policyToolPattern = /\b(value-added tax reduction|vat reduction|tax cut|tax reduction|fuel[- ]levy cut|consumer subsidy|price cap)\b/i;
  if (policyToolPattern.test(term)) {
    return {
      category: 'background',
      categories: ['background', 'finance'],
      reason: '术语首先是面向消费者或产业的政策工具，同时通过价格、税收或资金成本产生金融传导，归入背景层并交叉归入金融术语。',
      confidence: 0.96
    };
  }
  const fintechPattern = /\b(fintech|financial technology|financial innovation|digital finance|open banking|digital payment|payment system|payment infrastructure|algorithmic trading|high-frequency trading|robo.?advis\w*|digital currency|central bank digital currency|cbdc|stablecoin|crypto ?currency|crypto ?asset|digital asset)\b/i;
  if (fintechPattern.test(term)) {
    return {
      category: 'finance',
      categories: ['finance', 'background'],
      reason: '术语描述金融服务的数字化机制或技术化业务形态，归入金融术语并交叉归入背景层。',
      confidence: 0.98
    };
  }
  const realEconomyPattern = /\b(electrification(?: pathway| target)?s?|energy transition|equipment investment|business investment|capital expenditure|capex|grid(?: and storage)? investment|grid expansion|power grid|electricity access|electricity demand|electricity infrastructure|energy efficiency|energy security|energy import (?:dependency|intensity|spending)|avoided fuel import savings?|fuel import|manufacturing capacity|industrial capacity|production capacity|factory|plant construction|infrastructure investment|infrastructure|construction|equipment|machinery|heat pump|electric vehicle|charging infrastructure|battery storage|storage capacity|supply chain|industrial process|technology adoption|relative price effect|policy.market complementarity|market signals? and incentive structures?|incentive structure|state intervention|permitting and regulatory reform|climate plans?|conference of the parties|\bcop\b|paris agreement)\b/i;
  if (realEconomyPattern.test(term)) {
    return {
      category: 'background',
      categories: ['background'],
      reason: '概念主要描述实体产业、基础设施、能源转型、技术采用或经营行动；即使正文提到资金成本，主要解释对象仍不是金融资产或金融关系，归入背景层。',
      confidence: 0.97
    };
  }
  const externalRiskPremiumPattern = /\b(?:(?:geo)?political|regulatory|policy|election|sanctions?|war|armed conflict|climate|transition|energy security|trade)\s+(?:risk\s+|uncertainty\s+)?premium\b|地缘政治风险溢价|政治风险溢价|监管风险溢价|政策风险溢价|选举风险溢价|制裁风险溢价|战争风险溢价|气候风险溢价/;
  if (externalRiskPremiumPattern.test(term)) {
    const hasPricingEvidence = /\b(?:expected return|required return|return|yield|spread|discount rate|cost of capital|insurance (?:price|premium)|asset pricing|valuation)\b|预期收益|要求回报|收益率|回报率|利差|折现率|资本成本|保险价格|保险费用|资产定价|估值/.test(pricingEvidenceText);
    if (!hasPricingEvidence) {
      return {
        category: 'background',
        categories: ['background'],
        reason: '术语名称指向外部条件，但描述没有给出收益率、利差、折现率、资本成本或保险价格等可识别定价证据；交叉关系未独立成立，归入背景层。',
        confidence: 0.84
      };
    }
    return {
      category: 'finance',
      categories: ['finance', 'background'],
      reason: '卡片主要解释地缘政治、政治或监管条件如何转化为收益率、利差、折现率或保险价格中的补偿；金融定价为主，风险来源背景交叉归入背景层。',
      confidence: 0.96
    };
  }
  const pricedFinancialPattern = /\b(risk premium|term premium|equity risk premium|liquidity premium|insurance premium|insurance premium financing|premium financing acquisition|acquisition financing|leveraged acquisition|credit spread|yield spread|bid.ask spread|yield|modified duration|macaulay duration|effective duration|bond duration|portfolio duration|duration risk|duration gap|convexity|volatility|delta|beta|cost of capital|exchange rate|interest rate|asset price|equity price|business valuation|company valuation|equity valuation|asset valuation|valuation multiple|enterprise value|equity value|underwriting|actuarial|annuity|reinsurance|portfolio|asset allocation|hedging|financial risk management|capital structure|capital budgeting|payback period|concessional capital|blended finance|project finance|loan guarantee|working capital|corporate finance|money supply|money market|monetary aggregate|fiat money|保费融资|保费资金融资|融资收购|收购融资)\b/i;
  const chineseFinancialArrangementPattern = /(保费融资|保费资金融资|融资收购|收购融资)/;
  if (pricedFinancialPattern.test(term) || chineseFinancialArrangementPattern.test(term)) {
    return {
      category: 'finance',
      categories: ['finance'],
      reason: '术语涉及货币、公司财务、估值、保险、投资、风险管理或被定价计量的金融概念，归入金融术语。',
      confidence: 0.98
    };
  }
  const backgroundPattern = /\b(political risk|geopolitical risk|political instability|election risk|policy uncertainty|regulatory risk|regulatory environment|compliance risk|legal risk|policy risk|strategic risk|reputational risk|operational risk|risk control|sanctions?|trade war|industrial policy|industrial structure|industry structure|supply chain|supply bottleneck|value chain|industrial capacity|political economy|institution|institutional context|history|historical context|law|legal|judicial|judiciary|court|litigation|constitution|statute|regulation|regulatory framework|policy framework|legal framework|institutional framework|business model|operating model|business strategy|corporate strategy|market structure|procurement|health equity|health inequity|health inequalit(?:y|ies)|health disparit(?:y|ies)|social determinants of health|public health|healthcare access|health care access|universal health coverage|health policy|women.?s health funding|health research funding|medical research funding|biomedical research funding|research funding gap|science funding gap|public health funding|unemployment duration|duration of unemployment|unemployment spell|long-term unemployment|job search duration|ai agents?|autonomous agents?|agentic workflows?|multi.agent systems?|computing power|gpu (?:cluster|capacity)|computational infrastructure|scientific computing|drug discovery(?: pipeline)?|clinical development pipeline|biomedical research pipeline|automated labs?|autonomous lab(?:oratory)?|self.driving lab(?:oratory)?|lab(?:oratory)? automation|ai.for.science (?:stack|platform|toolkit)|ai (?:tool|toolkit|platform)|foundation model|large language model|machine learning platform|research infrastructure|research platform|scenario simulation platform|model(?:ing)? (?:platform|system|software|tool(?:kit)?|application|engine)|environmental valuation|valuation of environmental|technology|technological|cyber|encryption|data privacy|algorithm|military|defen[cs]e|armed forces|national security)\b/i;
  if (backgroundPattern.test(term) || (modelCategory === 'background' && backgroundPattern.test(context))) {
    return {
      category: 'background',
      categories: ['background'],
      reason: '术语主要指政治、地缘、政策制度或历史背景，归入背景层。',
      confidence: 0.96
    };
  }
  const financePattern = /\b(interest rate risk|policy rate|credit spread|term premium|risk premium|liquidity|modified duration|macaulay duration|effective duration|bond duration|portfolio duration|duration risk|duration gap|convexity|bond|stock|debt|loan|credit|default|derivative|option|futures?|swap|balance sheet|cash flow|capital adequacy|leverage|bank|banking|central bank|currency|exchange rate|inflation expectations?|inflation risk|yield curve|asset|sovereign risk|country risk|real wages?|wage growth|fiscal surplus|bracket creep|debt-service cost|debt service cost|tax pass-through|tax incidence|tax burden|insurance|health insurance|healthcare finance|health care finance|medical financing|insurance claim|equity financing|equity capital|equity market|equity markets|equity security|equity securities|shareholders.? equity|stockholders.? equity|return on equity|corporate financing gap|refinancing gap|funding liquidity gap|investment fund|hedge fund|mutual fund|pension fund|sovereign wealth fund|private equity|venture capital|fund management|brokerage|financial market|financial instrument|financial risk|market risk|credit risk|liquidity risk|solvency|concessional capital|payback period|cost of capital|loan guarantee|project finance|securitisation tranche|securitization tranche|structured finance|credit facility|capital call|short.selling|short interest|short squeeze|asymmetric payoff)\b/i;
  if (financePattern.test(term)) {
    return {
      category: 'finance',
      categories: ['finance'],
      reason: '术语涉及金融工具、指标、机构或金融风险传导，归入金融术语。',
      confidence: 0.94
    };
  }
  if (modelCategory === 'background') {
    return {
      category: 'background',
      categories: ['background'],
      reason: '模型提示为背景层，且正文没有提供金融本体或完整分析程序的正面证据，保留背景分类。',
      confidence: 0.78
    };
  }
  return {
    category: 'background',
    categories: ['background'],
    reason: modelCategory
      ? `模型原分类为 ${modelCategory}，但术语本体和描述缺少足够的金融对象或完整方法程序证据；按默认背景层处理。`
      : '未识别到明确的金融工具或分析方法特征，保守归入背景层。',
    confidence: modelCategory ? 0.7 : 0.5
  };
}

function knowledgeAliasSet(card) {
  return new Set([card.term, card.en, ...(card.match || [])]
    .map(normalizedKnowledgeAlias)
    .filter(Boolean));
}

const KNOWLEDGE_HIGHLIGHT_GENERIC_TOKENS = new Set([
  'analysis', 'data', 'finance', 'financial', 'framework', 'market', 'method',
  'model', 'policy', 'risk', 'service', 'system', 'tool'
]);

function knowledgeHighlightTokens(value) {
  return normalizedKnowledgeAlias(value)
    .split(' ')
    .filter(token => token && !KNOWLEDGE_HIGHLIGHT_GENERIC_TOKENS.has(token));
}

function isEquivalentKnowledgeAlias(alias, card) {
  const target = normalizedKnowledgeAlias(alias);
  const canonical = [card.term, card.en].map(normalizedKnowledgeAlias).filter(Boolean);
  if (!target || !canonical.length) return false;
  if (canonical.includes(target)) return true;

  const targetTokens = knowledgeHighlightTokens(alias);
  const canonicalTokens = new Set(knowledgeHighlightTokens([card.term, card.en].filter(Boolean).join(' ')));
  if (!targetTokens.length || !canonicalTokens.size) return false;

  const shared = targetTokens.filter(token => canonicalTokens.has(token));
  if (!shared.length) {
    const chineseAlias = /[\u3400-\u9fff]/.test(target);
    return chineseAlias && target.length >= 2 &&
      canonical.some(value => value.includes(target));
  }
  if (targetTokens.length === 1) return false;
  return shared.length / targetTokens.length >= 0.5;
}

function knowledgeHighlightAliasSet(card) {
  return new Set([
    card.term,
    card.en,
    ...(card.match || []).filter(alias => isEquivalentKnowledgeAlias(alias, card))
  ].map(normalizedKnowledgeAlias).filter(Boolean));
}

function mergeKnowledgeCardData(target, incoming) {
  const longer = (left, right) => String(right || '').length > String(left || '').length ? right : left;
  const unique = (left, right) => [...new Set([...(left || []), ...(right || [])].filter(Boolean))];
  const merged = {
    ...target,
    term: target.term || incoming.term,
    en: target.en || incoming.en,
    one: longer(target.one, incoming.one),
    body: longer(target.body, incoming.body),
    cases: longer(target.cases, incoming.cases),
    category: target.category === 'finance' || incoming.category === 'finance'
      ? 'finance'
      : target.category || incoming.category,
    cardType: target.cardType || incoming.cardType,
    classificationReason: longer(target.classificationReason, incoming.classificationReason),
    scenarios: unique(target.scenarios, incoming.scenarios),
    indicators: [...(target.indicators || []), ...(incoming.indicators || [])],
    suggestedTag: target.suggestedTag || incoming.suggestedTag,
    methodSteps: unique(target.methodSteps, incoming.methodSteps),
    related: unique(target.related, incoming.related),
    match: unique(target.match, incoming.match),
    authority: target.authority || incoming.authority
  };
  const classification = classifyKnowledgeCategoryClient(merged);
  return {
    ...merged,
    category: classification.category,
    categories: classification.categories,
    categoryReason: classification.reason,
    categoryConfidence: classification.confidence
  };
}

function dedupeKnowledgeCards(cards) {
  const merged = [];
  for (const card of cards || []) {
    const aliases = knowledgeAliasSet(card);
    const existingIndex = merged.findIndex(existing => {
      const existingAliases = knowledgeAliasSet(existing);
      return [...aliases].some(alias => existingAliases.has(alias));
    });
    if (existingIndex < 0) merged.push(card);
    else merged[existingIndex] = mergeKnowledgeCardData(merged[existingIndex], card);
  }
  return merged;
}

function articleBaselineVersion(article) {
  return stableId(JSON.stringify({
    title: article.title,
    deck: article.deck,
    source: article.source,
    date: article.date,
    topic: article.topic,
    level: article.level,
    paragraphs: article.paragraphs,
    knowledge: article.knowledge
  }));
}

function baseArticleById(articleId) {
  return (S.custom || []).find(article => article.id === articleId) ||
    builtInArticles.find(article => article.id === articleId) ||
    ARTICLES.find(article => article.id === articleId);
}

function effectiveArticleForBase(base) {
  if (!base) return null;
  const override = S.vocabOverrides?.[base.id];
  const vocab = sanitizeVocabList(override?.vocab);
  if (!override || !vocab.length) return base;
  if (override.baselineVersion && override.baselineVersion !== articleBaselineVersion(base)) return base;
  const analyses = sanitizeFocusedAnalyses(override.analyses, base.paragraphs.length);
  const paragraphs = analyses.length
    ? base.paragraphs.map((paragraph, index) => ({
        ...paragraph,
        analysis: analyses[index]
      }))
    : base.paragraphs;
  return { ...base, paragraphs, vocab };
}

function replaceArticleInMemory(article) {
  if (!article?.id) return;
  const index = ARTICLES.findIndex(item => item.id === article.id);
  if (index >= 0) ARTICLES[index] = article;
  else ARTICLES.push(article);
}

function applyVocabOverridesInMemory() {
  for (let index = 0; index < ARTICLES.length; index += 1) {
    const articleId = ARTICLES[index].id;
    const base = baseArticleById(articleId);
    ARTICLES[index] = effectiveArticleForBase(base) || ARTICLES[index];
  }
}

function applyKnowledgeCategoryOverrides() {
  for (const article of ARTICLES) {
    const overrides = S.knowledgeOverrides?.[article.id] || {};
    article.knowledge = (article.knowledge || []).map(card => {
      const override = overrides[card.id];
      return override ? { ...card, ...override, categoryLocked: override.categoryLocked === true } : card;
    });
  }
}

function setVocabularyOverride(articleId, vocabFocus, vocab, analyses = []) {
  const base = baseArticleById(articleId);
  if (!base) throw new Error('当前文章不存在，无法更新词汇');
  const cleanVocab = sanitizeVocabList(vocab);
  if (!cleanVocab.length) throw new Error('模型未返回有效词汇，旧词汇保持不变');
  const cleanAnalyses = sanitizeFocusedAnalyses(analyses, base.paragraphs.length);
  if (analyses?.length && !cleanAnalyses.length) {
    throw new Error('精读解析缺少段落或格式无效，旧词汇与旧解析保持不变');
  }
  const override = {
    focus: VOCAB_FOCUS_VALUES.has(vocabFocus) ? vocabFocus : 'balanced',
    vocab: cleanVocab,
    ...(cleanAnalyses.length ? { analyses: cleanAnalyses } : {}),
    baselineVersion: articleBaselineVersion(base),
    updatedAt: Date.now()
  };
  S.vocabOverrides[articleId] = override;
  const effective = {
    ...base,
    vocab: cleanVocab,
    ...(cleanAnalyses.length ? {
      paragraphs: base.paragraphs.map((paragraph, index) => ({
        ...paragraph,
        analysis: cleanAnalyses[index]
      }))
    } : {})
  };
  replaceArticleInMemory(effective);
  resetCardRuntime();
  return { base, override, effective };
}

function clearVocabularyOverride(articleId) {
  if (!articleId || !S.vocabOverrides) return;
  delete S.vocabOverrides[articleId];
}

function normalizeArticle(raw, url, srcName) {
  const id = stableId(url);
  return sanitizeArticleFields({
    id,
    title: raw.title || '未命名文章',
    deck: raw.deck || '',
    source: (srcName || '').trim() || '自定义导入',
    date: todayStr(),
    topic: TOPIC_IDS.includes(raw.topic) ? raw.topic : 'markets',
    suggestedTag: String(raw.suggestedTag || ''),
    level: ['B2', 'C1', 'C2'].includes(raw.level) ? raw.level : 'C1',
    paragraphs: raw.paragraphs || [],
    vocab: raw.vocab || [],
    knowledge: (raw.knowledge || [])
      .map((k, i) => {
        const classification = classifyKnowledgeCategoryClient(k);
        return {
          ...k,
          id: `${id}k${i}`, term: k.term || '', en: k.en || '', one: k.one || '',
          body: k.body || '', cases: k.cases || '',
          category: classification.category,
          categories: classification.categories,
          categoryReason: classification.reason,
          categoryConfidence: classification.confidence,
          cardType: Object.hasOwn(KNOWLEDGE_TYPES, k.cardType) ? k.cardType : (classification.category === 'method' ? 'method' : 'concept'),
          classificationReason: k.classificationReason || '',
          scenarios: Array.isArray(k.scenarios) ? k.scenarios : [],
          indicators: Array.isArray(k.indicators) ? k.indicators : [],
          suggestedTag: k.suggestedTag || '',
          methodSteps: Array.isArray(k.methodSteps) ? k.methodSteps : [],
          authority: k.authority && k.authority.url ? {
            source: String(k.authority.source || ''),
            description: String(k.authority.description || ''),
            url: String(k.authority.url || '')
          } : null,
          related: Array.isArray(k.related) ? k.related : [],
          match: Array.isArray(k.match) ? k.match : []
        };
      })
      .filter(k => k.term),
    _url: url,
    _annotationStatus: String(raw._annotationStatus || ''),
    _annotationError: String(raw._annotationError || ''),
    official: !!raw.official
  });
}

function sanitizeArticleFields(article) {
  const raw = article && typeof article === 'object' ? article : {};
  const decoded = (value) => decodeHtmlText(value || '');
  const decodedList = (value) => Array.isArray(value) ? value.map(item => decoded(item)) : [];
  return {
    ...raw,
    id: String(raw.id || ''),
    title: decoded(raw.title).slice(0, 140),
    deck: decoded(raw.deck),
    source: decoded(raw.source).trim(),
    suggestedTag: decoded(raw.suggestedTag),
    paragraphs: (Array.isArray(raw.paragraphs) ? raw.paragraphs : [])
      .map(paragraph => {
        const source = paragraph && typeof paragraph === 'object' ? paragraph : {};
        return {
          ...source,
          en: decoded(source.en).trim(),
          zh: decoded(source.zh).trim(),
          note: decoded(source.note),
          analysis: sanitizeParagraphAnalysis(source.analysis)
        };
      })
      .filter(paragraph => paragraph.en),
    vocab: sanitizeVocabList(raw.vocab),
    knowledge: dedupeKnowledgeCards((Array.isArray(raw.knowledge) ? raw.knowledge : [])
      .map(knowledge => {
        const source = knowledge && typeof knowledge === 'object' ? knowledge : {};
        const normalized = {
          ...source,
          id: decoded(source.id),
          term: decoded(source.term).trim(),
          en: decoded(source.en),
          one: decoded(source.one),
          body: decoded(source.body),
          cases: decoded(source.cases),
          cardType: Object.hasOwn(KNOWLEDGE_TYPES, source.cardType) ? source.cardType : (source.category === 'method' ? 'method' : 'concept'),
          classificationReason: decoded(source.classificationReason),
          scenarios: decodedList(source.scenarios),
          indicators: (Array.isArray(source.indicators) ? source.indicators : []).map(item => ({
            name: decoded(item?.name),
            meaning: decoded(item?.meaning),
            importance: decoded(item?.importance)
          })).filter(item => item.name),
          suggestedTag: decoded(source.suggestedTag),
          methodSteps: decodedList(source.methodSteps),
          related: decodedList(source.related),
          match: decodedList(source.match),
          authority: source.authority ? {
            ...source.authority,
            source: decoded(source.authority.source),
            description: decoded(source.authority.description),
            url: String(source.authority.url || '')
          } : null
        };
        const correction = window.VERIFIED_KNOWLEDGE_CORRECTIONS?.[raw.id]?.[normalized.id];
        const verified = correction ? {
          ...normalized,
          ...correction,
          categoryLocked: Boolean(correction.category),
          term: decoded(correction.term || normalized.term).trim(),
          en: decoded(correction.en || normalized.en),
          one: decoded(correction.one || normalized.one),
          body: decoded(correction.body || normalized.body),
          categories: Array.isArray(correction.categories) ? correction.categories : normalized.categories,
          cardType: Object.hasOwn(KNOWLEDGE_TYPES, correction.cardType) ? correction.cardType : normalized.cardType
        } : normalized;
        const classification = correction?.category ? {
          category: correction.category,
          categories: Array.isArray(correction.categories) ? correction.categories : [correction.category],
          reason: decoded(correction.categoryReason),
          confidence: Number(correction.categoryConfidence) || normalized.categoryConfidence || 0.9
        } : classifyKnowledgeCategoryClient(verified);
        return {
          ...verified,
          category: classification.category,
          categories: classification.categories,
          categoryReason: classification.reason,
          categoryConfidence: classification.confidence
        };
      })
      .filter(knowledge => knowledge.term && (knowledge.one || knowledge.body)))
  };
}

function persistCustom(art) {
  if (art._url && ARTICLES.some(x => x._url === art._url)) return false;
  clearVocabularyOverride(art.id);
  S.custom = S.custom || [];
  S.custom.unshift(art);
  S.custom = S.custom.slice(0, 30);
  if (!ARTICLES.some(x => x.id === art.id)) ARTICLES.push(art);
  save();
  renderStats();
  return true;
}

function openExistingImportedArticle(url) {
  const existing = ARTICLES.find(article => article._url === url);
  if (!existing) return false;
  hideAIProgress();
  $('#importModal').hidden = true;
  $('#engineModal').hidden = true;
  switchView('reader');
  openArticle(existing.id);
  toast('这篇内容已导入，已打开原文');
  return true;
}

function persistOrReplaceCustom(art, url) {
  const existingIndex = (S.custom || []).findIndex(article => article._url === url);
  if (existingIndex < 0) return persistCustom(art);
  const existing = S.custom[existingIndex];
  art.id = existing.id;
  clearVocabularyOverride(existing.id);
  S.custom[existingIndex] = art;
  const articleIndex = ARTICLES.findIndex(article => article.id === existing.id);
  if (articleIndex >= 0) ARTICLES[articleIndex] = art;
  else ARTICLES.push(art);
  save();
  renderStats();
  return true;
}

const IMPORT_BOILERPLATE_SENTENCE = [
  /confidential news tip/i,
  /we want to hear from you/i,
  /delivered to your inbox/i,
  /more info about our products and services/i,
  /real-time snapshot|data is delayed at least \d+ minutes/i,
  /stock quotes,? and market data|business and financial news,? stock quotes/i,
  /download (?:our|the) app|available on the app store|google play/i,
  /subscribe (?:now|today)|subscribe to (?:our|the) newsletter|follow us for more|sign up for (?:our|the) newsletter|newsletter sign.?up/i,
  /^sign up (?:today )?for (?:the|our|a) [^.!?]{0,80}newsletter[.!?]?$/i,
  /all rights reserved|privacy policy|cookie policy|terms of (?:use|service)/i,
  /image (?:source|caption)|getty images|photograph:/i,
  /advertisement|sponsored content/i,
  /免责声明|版权归|点击关注|点击蓝字|扫码关注|订阅我们|推荐阅读|阅读原文|商务合作|广告合作|设为星标|责任编辑|校对[:：]|原标题[:：]/i
];

function cleanImportedText(text) {
  const normalized = decodeHtmlText(String(text || ''))
    .replace(/â€™|â€˜|ãƒâ€™|Ã¢â‚¬â„¢/gi, "'")
    .replace(/â€œ|â€|ãƒâ€œ|Ã¢â‚¬Å“|Ã¢â‚¬Â/gi, '"')
    .replace(/â€”|ãƒâ€”|Ã¢â‚¬â€/gi, '—')
    .replace(/â€“|ãƒâ€“|Ã¢â‚¬â€œ/gi, '–')
    .replace(/Â|Ã‚/g, '')
    .replace(/\uFFFD/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ')
    .replace(/\u00a0/g, ' ');
  const sentences = normalized.match(/[^.!?。！？]+[.!?。！？]+(?:["')\]]+)?|[^.!?。！？]+$/g) || [];
  return sentences
    .map(sentence => sentence.trim())
    .filter(Boolean)
    .filter(sentence => !IMPORT_BOILERPLATE_SENTENCE.some(pattern => pattern.test(sentence)))
    .join(' ')
    .replace(/\b(?:Share|Print|Email)\s+(?=(?:The|This|Today|Federal|Official|Statement|Press|Washington)\b)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanImportedParagraphs(paragraphs) {
  const seen = new Set();
  const clean = (paragraphs || [])
    .map(cleanImportedText)
    .filter(Boolean)
    .filter(text => {
      const key = text.slice(0, 90).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  const words = clean.join(' ').match(/[A-Za-z0-9'-]+/g) || [];
  if (clean.length < 2 || words.length < 25) {
    throw new Error(`正文有效内容不足：仅识别到 ${clean.length} 段、${words.length} 个词，请改用完整正文或文档`);
  }
  return clean;
}

async function rerunCurrentAnnotation() {
  const article = cur;
  if (!article || !annotationRetryState(article)) return;
  const button = $('#btnRerunAnnotation');
  const errorBox = $('#annotationRetryError');
  const setRetryError = (message) => {
    if (!errorBox) return;
    errorBox.hidden = !message;
    errorBox.textContent = message ? `上次失败：${message}` : '';
  };
  if (!hasEngineCredential()) {
    const message = '请先在 AI 设置中配置可用的模型和 API Key';
    setRetryError(message);
    toast(message);
    return;
  }
  if (button) {
    button.disabled = true;
    button.textContent = '正在重新运行…';
  }
  setRetryError('');
  try {
    const result = await requestAnnotationWithProgress({
      ...(await modelRequestPayload()),
      paragraphs: article.paragraphs.map(paragraph => paragraph.en),
      title: article.title,
      vocabFocus: S.settings.vocabFocus
    }, `重新标注 · ${article.title}`);
    const next = normalizeArticle(result, article._url || `article://${article.id}`, article.source);
    next.id = article.id;
    next.date = article.date;
    next.topic = article.topic || next.topic;
    next.source = article.source || next.source;
    next._url = article._url || next._url;
    next._annotationStatus = 'complete';
    next._annotationError = '';
    if (!next.paragraphs.length) throw new Error('模型返回内容缺少段落');
    if (!persistOrReplaceCustom(next, next._url)) throw new Error('保存标注结果失败');
    openArticle(next.id);
    renderSide();
    renderList();
    toast(`标注完成 · ${next.vocab.length} 词 / ${next.knowledge.length} 张知识卡`);
  } catch (error) {
    const message = String(error.message || error || '重新标注失败');
    article._annotationStatus = 'failed';
    article._annotationError = message;
    const custom = (S.custom || []).find(item => item.id === article.id);
    if (custom) {
      custom._annotationStatus = 'failed';
      custom._annotationError = message;
    }
    const inMemory = ARTICLES.find(item => item.id === article.id);
    if (inMemory) {
      inMemory._annotationStatus = 'failed';
      inMemory._annotationError = message;
    }
    save();
    if (cur?.id === article.id) renderDoc();
    toast(`重新标注失败：${message}`);
  }
}

function closeImportAndOpen(art, message) {
  clearImportFailure();
  hideAIProgress();
  $('#importModal').hidden = true;
  $('#engineModal').hidden = true;
  switchView('reader');
  openArticle(art.id);
  toast(message);
}

async function annotateAndSave(extracted, url, source, status, options = {}) {
  const setStatus = (text, bad = false) => {
    if (!status) return;
    status.textContent = text;
    status.style.color = bad ? 'var(--danger)' : 'var(--ink-3)';
  };
  try {
    extracted = { ...extracted, paragraphs: cleanImportedParagraphs(extracted.paragraphs) };
  } catch (error) {
    setStatus(error.message, true);
    if (options.onFailure) options.onFailure(error, { extracted, url, source });
    return false;
  }
  const rawArticle = (annotationError = '') => normalizeArticle({
    title: extracted.title,
    deck: extracted.kind === 'wechat' ? '微信公众号导入，已完成正文提取。' : '已保存原文，可稍后启用模型完成精读解析。',
    level: 'C1',
    topic: 'markets',
    paragraphs: extracted.paragraphs.map(en => ({ en, zh: '', note: '' })),
    _annotationStatus: 'failed',
    _annotationError: annotationError
  }, url, source);

  if (!hasEngineCredential() && options.allowRawMissingKey) {
    const art = rawArticle('未配置模型 API Key');
    if (!persistOrReplaceCustom(art, url)) {
      openExistingImportedArticle(url);
      return false;
    }
    closeImportAndOpen(art, '已保存原文；配置模型后可重新生成翻译、词汇和双模块解析');
    return true;
  }

  setStatus('调用模型生成翻译、词汇与英语/金融双模块解析…');
  try {
    const article = await requestAnnotationWithProgress({
        ...(await modelRequestPayload()),
        paragraphs: extracted.paragraphs,
        title: extracted.title,
        vocabFocus: S.settings.vocabFocus
    }, `导入标注 · ${extracted.title}`);
    const art = normalizeArticle(article, url, source);
    art._annotationStatus = 'complete';
    art._annotationError = '';
    if (extracted.kind && extracted.kind !== 'article' && extracted.title) art.title = extracted.title;
    if (!art.paragraphs.length) throw new Error('返回内容缺少段落');
    if (!persistOrReplaceCustom(art, url)) {
      openExistingImportedArticle(url);
      return false;
    }
    closeImportAndOpen(art, `已导入《${art.title}》· ${art.vocab.length} 词 / ${art.knowledge.length} 张知识卡`);
    return true;
  } catch (error) {
    setStatus('标注失败：' + (error.message || error), true);
    if (options.rawOnFailure) {
      const art = rawArticle(String(error.message || error || '模型标注失败'));
      if (persistOrReplaceCustom(art, url)) closeImportAndOpen(art, '模型标注失败，已先导入原文，之后可继续学习');
      return false;
    }
    if (options.onFailure) {
      options.onFailure(error, { extracted, url, source });
      return false;
    }
    $('#importPreview').insertAdjacentHTML('beforeend',
      `<div class="inline-actions import-fallback">
        <button class="btn" id="btnImportRaw">仅保存原文，稍后标注</button>
      </div>`);
    const rawButton = $('#btnImportRaw');
    if (rawButton) rawButton.onclick = () => {
      const art = rawArticle(String(error.message || error || '模型标注失败'));
      if (!persistOrReplaceCustom(art, url)) {
        setStatus('该文章已存在，无需重复导入', true);
        return;
      }
      closeImportAndOpen(art, '已保存原文，可稍后重新标注');
    };
    return false;
  }
}

async function uploadDocument() {
  const file = $('#importFile').files?.[0];
  const status = $('#uploadStatus');
  const button = $('#btnUploadGo');
  if (!file) {
    status.textContent = '请先选择文档';
    status.style.color = 'var(--danger)';
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    status.textContent = '文件不能超过 8MB';
    status.style.color = 'var(--danger)';
    return;
  }
  button.disabled = true;
  status.textContent = '正在解析文档…';
  lastImportAttempt = { type: 'document' };
  clearImportFailure();
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    const response = await fetch('/api/document', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: file.name, data: btoa(binary) })
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || '文档解析失败');
    const fingerprint = `${file.name}:${file.size}:${data.paragraphs[0]?.slice(0, 40)}`;
    await annotateAndSave(
      { title: data.title, paragraphs: data.paragraphs, kind: 'document' },
      'upload://' + stableId(fingerprint),
      $('#importSource').value.trim() || file.name,
      status,
      {
        allowRawMissingKey: false,
        onFailure: (error, context) => showImportFailure(error, {
          ...context,
          stage: 'AI 标注',
          retryType: 'document'
        })
      }
    );
  } catch (error) {
    status.textContent = error.message || '文档解析失败';
    status.style.color = 'var(--danger)';
    showImportFailure(error, { stage: '文档解析', retryType: 'document', source: file.name });
  } finally {
    button.disabled = false;
  }
}

async function importPastedText() {
  const text = $('#importText').value.trim();
  const status = $('#textImportStatus');
  if (!text) {
    status.textContent = '请先粘贴正文';
    status.style.color = 'var(--danger)';
    return;
  }
  const paragraphs = text.split(/\n\s*\n/).map(part => part.replace(/\s+/g, ' ').trim()).filter(part => part.length > 20);
  if (!paragraphs.length) {
    status.textContent = '正文过短，至少需要一个完整段落';
    status.style.color = 'var(--danger)';
    return;
  }
  const url = 'paste://' + stableId(`${paragraphs[0]}:${paragraphs.at(-1)}:${paragraphs.length}`);
  lastImportAttempt = { type: 'paste' };
  clearImportFailure();
  await annotateAndSave(
    { title: $('#importSource').value.trim() || '粘贴文章', paragraphs, kind: 'paste' },
    url,
    $('#importSource').value,
    status,
    {
      allowRawMissingKey: false,
      onFailure: (error, context) => showImportFailure(error, {
        ...context,
        stage: 'AI 标注',
        retryType: 'paste'
      })
    }
  );
}

async function doImport() {
  const url = $('#importUrl').value.trim();
  const status = $('#importStatus');
  if (!/^https?:\/\//i.test(url)) { status.textContent = '请填写完整的 http(s) 链接'; status.style.color = 'var(--danger)'; return; }
  if (openExistingImportedArticle(url)) return;
  lastImportAttempt = { type: 'url' };
  clearImportFailure();

  const btn = $('#btnImportGo');
  btn.disabled = true;
  const setSt = (t, bad) => { status.textContent = t; status.style.color = bad ? 'var(--danger)' : 'var(--ink-3)'; };
  setSt('抓取正文…');

  let extracted = null;
  try {
    const r = await fetch('/api/fetch?url=' + encodeURIComponent(url));
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || '抓取失败');
    extracted = j;
    const wc = j.paragraphs.join(' ').split(/\s+/).length;
    $('#importPreview').innerHTML = `<div class="import-pv">
      <b>${esc(j.title || '(无标题)')}</b>
      <span>已提取 ${j.paragraphs.length} 段 · 约 ${wc} 词${j.kind === 'wechat' ? ' · 微信公众号' : ''}</span>
      <p>${esc(j.paragraphs[0].slice(0, 180))}…</p></div>`;
  } catch (e) {
    setSt('抓取失败：' + e.message + '。可改用上传文档或直接粘贴正文。', true);
    showImportFailure(e, { stage: '正文抓取', retryType: 'url', url });
    btn.disabled = false;
    return;
  }

  await annotateAndSave(
    extracted,
    url,
    $('#importSource').value,
    status,
    {
      allowRawMissingKey: false,
      onFailure: (error, context) => showImportFailure(error, {
        ...context,
        stage: 'AI 标注',
        retryType: 'url'
      })
    }
  );
  btn.disabled = false;
}

/* ================= 快捷键 ================= */
function wireKeyboard() {
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'escape') {
      hidePop();
      hideSelectionAction();
      $('#settingsModal').hidden = true;
      $('#engineModal').hidden = true;
      $('#importModal').hidden = true;
      clearImportFailure();
      stopFlash();
      stopSpeech();
      if (activeView === 'knowledgeDetail') closeKnowledgeDetail();
      if (S.settings.cmode === 'flash' && activeView === 'cards') renderCards();
      return;
    }
    if (e.target.matches('input, textarea, select')) return;
    if (['1', '2', '3', '4'].includes(k)) {
      switchView(['reader', 'cards', 'knowledge', 'export'][+k - 1]);
    }
    if (k === 't') {
      const order = ['on', 'hover', 'off'];
      S.settings.zh = order[(order.indexOf(S.settings.zh) + 1) % 3];
      document.body.dataset.zh = S.settings.zh; save(); syncToolbar();
      toast('译文：' + { on: '对照显示', hover: '悬停显示', off: '关闭' }[S.settings.zh]);
    }
    if (k === 'm') {
      const order = ['original', 'intensive', 'immersion'];
      applyModePreset(order[(order.indexOf(S.settings.mode) + 1) % 3]);
    }
    if (k === 'v') { S.settings.vocab = !S.settings.vocab; document.body.dataset.vocab = S.settings.vocab ? 'on' : 'off'; save(); syncToolbar(); renderDoc(); }
    if (k === 'k') { S.settings.know = !S.settings.know; document.body.dataset.know = S.settings.know ? 'on' : 'off'; save(); syncToolbar(); renderDoc(); }
  });
}

/* ================= 启动 ================= */
document.addEventListener('DOMContentLoaded', () => {
  boot().catch(error => console.error('FinLens boot failed:', error));
});
