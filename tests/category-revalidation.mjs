/* 领域分类重新核验：规则、来源覆盖、预览、应用与撤销。 */
import { createRequire } from 'node:module';

const req = createRequire(process.env.PW_BASE || 'C:/Users/NORA/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright-core');
const BASE = process.env.FINLENS_TEST_BASE || 'http://127.0.0.1:8787';
const results = [];
const check = (name, condition, extra = '') => {
  results.push({ name, pass: !!condition, extra });
  console.log(`${condition ? 'PASS' : 'FAIL'} ${name}${extra ? ' - ' + extra : ''}`);
};

const apiResponse = await fetch(`${BASE}/api/revalidate-category`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    online: false,
    cards: [
      {
        id: 'rv-market', articleId: 'a', articleTitle: 'Fixture', term: 'Market correction',
        en: 'Market correction', category: 'background', cardType: 'concept',
        one: '市场修正。', body: 'ETF 通过一级市场申购赎回连接净值与市价。'
      },
      {
        id: 'rv-power', articleId: 'a', articleTitle: 'Fixture', term: 'Purchasing Power',
        en: 'Purchasing Power', category: 'background', cardType: 'concept',
        one: '购买力衡量一单位货币能购买的商品与服务。',
        body: '通胀高于名义工资增速时，实际购买力下降。'
      },
      {
        id: 'rv-electrification', articleId: 'a', articleTitle: 'Fixture', term: 'electrification',
        en: 'Electrification', category: 'finance', cardType: 'phenomenon',
        one: '终端用能转向电力。', body: '电网和储能需要扩容。'
      },
      {
        id: 'rv-joint-equity', articleId: 'a', articleTitle: 'Fixture',
        term: 'jointly controlled equity stake', en: 'Jointly controlled equity stake',
        category: 'background', cardType: 'concept',
        one: '共同控制的上市公司股权把经济收益、投票权和处分限制分布在配偶与信托之间。',
        body: '该股权是上市公司权益资产。信托和共同受托安排改变谁可以投票、出售和处分股份，并影响减持预期、控制权、披露和估值。'
      },
      {
        id: 'rv-divorce-finance', articleId: 'a', articleTitle: 'Fixture',
        term: 'divorce asset division', en: 'Divorce asset division',
        category: 'finance', cardType: 'mechanism',
        one: '离婚财产分割依据婚姻财产制和信托条款确定财产归属，再处理相关资产。',
        body: '信托持有的上市公司股份是否属于夫妻财产取决于婚姻财产制和信托条款；股份分割还涉及估值、流动性、控制权和税务。'
      },
      {
        id: 'rv-marital-background', articleId: 'a', articleTitle: 'Fixture',
        term: 'marital property division', en: 'Marital property division',
        category: 'finance', cardType: 'mechanism',
        one: '法院依据婚姻财产规则确定非金融财产的归属和分配。',
        body: '住房和家庭用品依据婚姻财产制度分配，不涉及证券估值、流动性、控制权、融资或风险转移。'
      },
      {
        id: 'rv-insufficient', articleId: 'a', articleTitle: 'Fixture',
        term: 'market correction', en: 'Market correction',
        category: 'background', cardType: 'concept',
        one: '', body: ''
      }
    ]
  })
});
const apiData = await apiResponse.json();
const byId = Object.fromEntries((apiData.results || []).map(item => [item.cardId, item]));
check('Category revalidation endpoint returns preview results',
  apiResponse.status === 200 && apiData.ok && apiData.results?.length === 7,
  `${apiResponse.status} ${(apiData.results || []).length}`);
check('Category revalidation corrects known finance terms',
  byId['rv-market']?.suggested?.category === 'finance' &&
  byId['rv-power']?.suggested?.category === 'finance' &&
  byId['rv-electrification']?.suggested?.category === 'background' &&
  byId['rv-joint-equity']?.suggested?.category === 'finance' &&
  byId['rv-divorce-finance']?.suggested?.category === 'background' &&
  byId['rv-marital-background']?.suggested?.category === 'background',
  JSON.stringify(byId));
check('Category revalidation proposes the correct cross-listed categories',
  JSON.stringify(byId['rv-joint-equity']?.suggested?.categories) === JSON.stringify(['finance', 'background']) &&
  JSON.stringify(byId['rv-divorce-finance']?.suggested?.categories) === JSON.stringify(['background', 'finance']) &&
  JSON.stringify(byId['rv-marital-background']?.suggested?.categories) === JSON.stringify(['background']),
  JSON.stringify({
    joint: byId['rv-joint-equity']?.suggested,
    divorce: byId['rv-divorce-finance']?.suggested,
    marital: byId['rv-marital-background']?.suggested
  }));
check('Category revalidation separates main-object, cross-domain, and negative evidence snippets',
  byId['rv-divorce-finance']?.evidence?.main?.some(item => item.text.includes('婚姻财产制')) &&
  byId['rv-divorce-finance']?.evidence?.cross?.some(item => item.text.includes('估值')) &&
  byId['rv-marital-background']?.evidence?.negative?.some(item => item.text.includes('不涉及证券估值')) &&
  byId['rv-divorce-finance']?.evidence?.mainReason &&
  byId['rv-divorce-finance']?.evidence?.crossReason,
  JSON.stringify({
    divorce: byId['rv-divorce-finance']?.evidence,
    marital: byId['rv-marital-background']?.evidence
  }));
check('Category revalidation does not turn keyword-only changes into suggestions',
  byId['rv-insufficient']?.suggested?.category === 'background' &&
  byId['rv-insufficient']?.changed === false &&
  byId['rv-insufficient']?.recommendation === 'keep' &&
  byId['rv-insufficient']?.evidence?.sufficient === false &&
  byId['rv-insufficient']?.categoryConfidence <= 0.65,
  JSON.stringify(byId['rv-insufficient']));
check('Category revalidation labels source directories as research entry points rather than proof',
  byId['rv-divorce-finance']?.evidence?.sourcePolicy === 'research-entry-points-only',
  JSON.stringify(byId['rv-divorce-finance']?.evidence?.sourcePolicy));
check('Category revalidation flags known content mismatch without rewriting it',
  byId['rv-market']?.contentWarnings?.some(message => message.includes('ETF')) &&
  byId['rv-market']?.contentFix?.body?.includes('近期高点') &&
  !byId['rv-market']?.contentFix?.body?.includes('ETF通过一级市场'),
  JSON.stringify({ warnings: byId['rv-market']?.contentWarnings, fix: byId['rv-market']?.contentFix }));
check('Category revalidation returns the complete original card content for comparison',
  byId['rv-market']?.originalContent?.body?.includes('ETF 通过一级市场申购赎回'),
  JSON.stringify(byId['rv-market']?.originalContent));
check('Category revalidation exposes authoritative source coverage',
  (apiData.coverage || []).some(source => source.key === 'sec') &&
  (apiData.coverage || []).some(source => source.key === 'bls') &&
  (apiData.coverage || []).some(source => source.key === 'ifrs') &&
  (apiData.coverage || []).some(source => source.key === 'crossref'),
  (apiData.coverage || []).map(source => source.key).join(', '));
check('Market correction preview cites a relevant registry source',
  byId['rv-market']?.sources?.some(source => source.key === 'nasdaq'),
  JSON.stringify(byId['rv-market']?.sources?.map(source => source.key)));
const caseApiResponse = await fetch(`${BASE}/api/revalidate-category`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    online: false,
    cards: [{
      id: 'rv-case',
      articleId: 'a',
      articleTitle: 'Fixture',
      term: 'operational transformation',
      en: 'Operational transformation',
      category: 'finance',
      cardType: 'concept',
      one: 'Operational transformation is a change in internal workflows and production processes.',
      body: 'Teams redesign internal workflow and production processes without describing a financial asset, financing relationship, or complete analysis method.',
      cases: 'Nominal wages rose 5% and consumer prices rose 7%, so real wages necessarily fell 2%. The change was followed by a wider credit spread.'
    }]
  })
});
const caseApiData = await caseApiResponse.json();
const caseResult = (caseApiData.results || [])[0];
check('Case text cannot change the card category',
  caseResult?.suggested?.category === 'background',
  JSON.stringify(caseResult?.suggested));
check('Revalidation flags unsupported numeric cases without a source or assumption label',
  caseResult?.contentWarnings?.some(message => message.includes('具体百分比')),
  JSON.stringify(caseResult?.contentWarnings));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.locator('.nav-item[data-view="knowledge"]').click();
check('Each knowledge card exposes an in-card category verification action',
  await page.locator('[data-revalidate-card]').count() > 0);
await page.locator('[data-revalidate-card]').first().click();
check('In-card verification opens the same revalidation flow scoped to one card',
  await page.locator('#categoryRevalidationModal').isVisible() &&
  await page.locator('#revalidationScopeSeg').isHidden());
await page.locator('#categoryRevalidationModal .modal-head [data-close]').click();
await page.locator('[data-know-detail]').first().click();
check('Knowledge detail separates classification status from detail-source verification',
  (await page.locator('.knowledge-research-badge').first().innerText()).includes('详解来源') &&
  (await page.locator('.knowledge-verification-badge').first().innerText()).includes('分类') &&
  await page.locator('#btnRevalidateCurrentCard').count() === 1);
await page.locator('#btnRevalidateCurrentCard').click();
check('Knowledge detail can launch in-card category verification',
  await page.locator('#categoryRevalidationModal').isVisible() &&
  await page.locator('#revalidationScopeSeg').isHidden());
await page.locator('#categoryRevalidationModal .modal-head [data-close]').click();
await page.locator('#btnKnowledgeBack').click();
await page.locator('#btnRevalidateKnowledgeCategories').click();
check('Knowledge base exposes a category revalidation modal',
  await page.locator('#categoryRevalidationModal').isVisible() &&
  (await page.locator('#revalidationSourceCoverage').innerText()).includes('SEC') &&
  (await page.locator('#revalidationSourceCoverage').innerText()).includes('Crossref'));
const fixture = await page.evaluate(() => {
  const card = filteredKnowledge()[0];
  return {
    articleId: card._aid,
    cardId: card.id,
    term: card.term,
    articleTitle: card._title
  };
});
await page.route('**/api/revalidate-category', route => route.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({
    ok: true,
    coverage: [
      { key: 'sec', title: 'SEC', scope: '证券监管与披露', url: 'https://www.sec.gov/', kind: 'official' }
    ],
    results: [{
      articleId: fixture.articleId,
      articleTitle: fixture.articleTitle,
      cardId: fixture.cardId,
      term: fixture.term,
      originalContent: {
        one: 'ETF 的一句话说明。',
        body: 'ETF 当前正文：通过一级市场申购赎回连接净值与市价。',
        cases: 'ETF 当前案例。'
      },
      current: { category: 'background', categories: ['background'], cardType: 'concept' },
      suggested: { category: 'finance', categories: ['finance'], cardType: 'concept' },
      categoryReason: '规则核验后属于金融指标。',
      categoryConfidence: 0.96,
      changed: true,
      recommendation: 'change',
      evidence: {
        main: [{ source: 'one', text: 'ETF 跟踪净值与市价。' }],
        cross: [{ source: 'body', text: '申购赎回影响流动性与定价。' }],
        negative: [],
        sufficient: true,
        mainReason: '一句话直接解释金融资产定价对象。',
        crossReason: '正文独立说明流动性与定价关系。',
        negativeReason: '',
        recommendation: 'change',
        sourcePolicy: 'research-entry-points-only'
      },
      contentWarnings: [],
      sources: [{ key: 'sec', title: 'SEC', url: 'https://www.sec.gov/', sourceType: 'registry' }],
      online: 'registry',
      verifiedSources: 0
    }]
  })
}));
await page.locator('#btnRunCategoryRevalidation').click();
await page.locator('[data-revalidation-pick]').waitFor({ state: 'visible' });
check('Category revalidation preview defaults to explicit changes',
  await page.locator('[data-revalidation-pick]:checked').count() === 1 &&
  (await page.locator('#revalidationPreview').innerText()).includes('建议修改') &&
  (await page.locator('#revalidationPreview').innerText()).includes('ETF 跟踪净值与市价') &&
  (await page.locator('#revalidationPreview').innerText()).includes('正文独立说明流动性'));
await page.locator('#btnApplyCategoryRevalidation').click();
const applied = await page.evaluate(({ articleId, cardId }) => ({
  override: S.knowledgeOverrides?.[articleId]?.[cardId] || null,
  category: ARTICLES.find(article => article.id === articleId)?.knowledge
    .find(card => card.id === cardId)?.category,
  backups: S.knowledgeRevalidationBackups?.length || 0
}), fixture);
check('Category revalidation applies and persists a classified override',
  applied.override?.category === 'finance' &&
  applied.override?.categoryLocked === true &&
  applied.category === 'finance' &&
  applied.backups === 1,
  JSON.stringify(applied));
await page.locator('#btnUndoCategoryRevalidation').click();
const undone = await page.evaluate(({ articleId, cardId }) => ({
  override: S.knowledgeOverrides?.[articleId]?.[cardId] || null,
  backups: S.knowledgeRevalidationBackups?.length || 0
}), fixture);
check('Category revalidation can undo its last applied change',
  !undone.override && undone.backups === 0,
  JSON.stringify(undone));
await page.unroute('**/api/revalidate-category');
await page.route('**/api/revalidate-category', route => route.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({
    ok: true,
    coverage: [{ key: 'sec', title: 'SEC', scope: '证券监管与披露', url: 'https://www.sec.gov/', kind: 'official' }],
    results: [{
      articleId: fixture.articleId,
      articleTitle: fixture.articleTitle,
      cardId: fixture.cardId,
      term: fixture.term,
      originalContent: {
        one: 'ETF 的一句话说明。',
        body: 'ETF 当前正文：通过一级市场申购赎回连接净值与市价。',
        cases: 'ETF 当前案例。'
      },
      current: { category: 'background', categories: ['background'], cardType: 'concept' },
      suggested: { category: 'background', categories: ['background'], cardType: 'concept' },
      categoryReason: '正文没有足够证据支持金融本体。',
      categoryConfidence: 0.65,
      changed: false,
      recommendation: 'keep',
      evidence: {
        main: [],
        cross: [],
        negative: [],
        sufficient: false,
        mainReason: '未找到足以解释术语本体的正文证据。',
        crossReason: '没有提出交叉分类。',
        negativeReason: '',
        recommendation: 'keep',
        sourcePolicy: 'research-entry-points-only'
      },
      contentWarnings: [],
      sources: [],
      online: 'registry',
      verifiedSources: 0
    }]
  })
}));
await page.locator('#btnRunCategoryRevalidation').click();
await page.locator('#revalidationPreview').getByText('证据不足').waitFor({ state: 'visible' });
check('Insufficient category evidence remains unselected and visible in preview',
  await page.locator('[data-revalidation-pick]:checked').count() === 0 &&
  (await page.locator('#revalidationPreview').innerText()).includes('未找到足以解释术语本体的正文证据'));
await page.unroute('**/api/revalidate-category');
await page.route('**/api/revalidate-category', route => route.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({
    ok: true,
    coverage: [{ key: 'sec', title: 'SEC', scope: '证券监管与披露', url: 'https://www.sec.gov/', kind: 'official' }],
    results: [{
      articleId: fixture.articleId,
      articleTitle: fixture.articleTitle,
      cardId: fixture.cardId,
      term: fixture.term,
      originalContent: {
        one: 'ETF 的一句话说明。',
        body: 'ETF 当前正文：通过一级市场申购赎回连接净值与市价。',
        cases: 'ETF 当前案例。'
      },
      current: { category: 'background', categories: ['background'], cardType: 'concept' },
      suggested: { category: 'finance', categories: ['finance'], cardType: 'concept' },
      categoryReason: '规则核验后属于金融指标。',
      categoryConfidence: 0.96,
      changed: true,
      recommendation: 'review',
      evidence: {
        main: [{ source: 'one', text: 'ETF 跟踪净值与市价。' }],
        cross: [],
        negative: [],
        sufficient: true,
        mainReason: '一句话直接解释金融资产定价对象。',
        crossReason: '没有提出交叉分类。',
        negativeReason: '',
        recommendation: 'review',
        sourcePolicy: 'research-entry-points-only'
      },
      contentWarnings: ['正文与术语明显错配'],
      contentFix: {
        one: '核验后的一句话解释。',
        body: '核验后的专业正文，用户确认前不会写入。',
        cases: '核验后的案例。',
        source: 'verified-draft'
      },
      sources: [{ key: 'sec', title: 'SEC', url: 'https://www.sec.gov/', sourceType: 'registry' }],
      online: 'registry',
      verifiedSources: 0
    }]
  })
}));
await page.locator('#btnRunCategoryRevalidation').click();
await page.locator('[data-review-content-fix]').waitFor({ state: 'visible' });
check('Mismatched content is not selected automatically and offers a review window',
  await page.locator('[data-revalidation-pick]:checked').count() === 0 &&
  (await page.locator('#revalidationPreview').innerText()).includes('不会自动改写正文') &&
  (await page.locator('#revalidationPreview').innerText()).includes('查看建议正文与案例'));
await page.locator('[data-review-content-fix]').click();
check('Suggested card content opens in a separate confirmation window',
  await page.locator('#contentFixModal').isVisible() &&
  (await page.locator('#contentFixTitle').innerText()).includes('正文与案例核验') &&
  (await page.locator('#contentFixSuggested').innerText()).includes('用户确认前不会写入') &&
  (await page.locator('#contentFixOriginal').innerText()).includes('ETF 当前正文') &&
  await page.locator('#contentFixModal .modal-body').evaluate(el => el.getBoundingClientRect().width >= 700));
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(80);
const mobileContentFix = await page.evaluate(() => ({
  overflow: document.documentElement.scrollWidth - window.innerWidth,
  columns: getComputedStyle(document.querySelector('.content-fix-grid')).gridTemplateColumns,
  width: document.querySelector('#contentFixModal .modal-body').getBoundingClientRect().width
}));
check('Content confirmation window stays readable and single-column on mobile',
  mobileContentFix.overflow === 0 &&
  mobileContentFix.columns.split(' ').length === 1 &&
  mobileContentFix.width <= 350,
  JSON.stringify(mobileContentFix));
await page.setViewportSize({ width: 1440, height: 900 });
await page.waitForTimeout(80);
await page.locator('#btnApplyContentFix').click();
const fixedContent = await page.evaluate(({ articleId, cardId }) => {
  const card = ARTICLES.find(article => article.id === articleId)?.knowledge.find(item => item.id === cardId);
  return {
    one: card?.one,
    body: card?.body,
    override: S.knowledgeOverrides?.[articleId]?.[cardId] || null,
    backups: S.knowledgeContentFixBackups?.length || 0
  };
}, fixture);
check('Confirmed content fix updates the card and is persisted separately from classification',
  fixedContent.body === '核验后的专业正文，用户确认前不会写入。' &&
  fixedContent.override?.contentFixSource === 'verified-draft' &&
  fixedContent.backups === 1 &&
  !fixedContent.override?.category,
  JSON.stringify(fixedContent));
check('Category revalidation UI has no JavaScript runtime errors',
  errors.length === 0,
  errors.slice(0, 3).join(' | '));

await context.close();
await browser.close();
const failures = results.filter(result => !result.pass);
console.log(`\n=== ${results.length - failures.length}/${results.length} passed ===`);
if (failures.length) process.exitCode = 1;
