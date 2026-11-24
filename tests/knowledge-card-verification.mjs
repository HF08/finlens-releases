/* 当前文章知识卡联网核验修正回归。 */
import { createRequire } from 'node:module';

const req = createRequire(process.env.PW_BASE || 'C:/Users/NORA/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright-core');
const BASE = process.env.FINLENS_TEST_BASE || 'http://127.0.0.1:8787';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.evaluate(() => {
  const state = JSON.parse(localStorage.getItem('finlens.v1') || '{}');
  state.custom = [{
    id: 'uoweyl8',
    title: "Cathie Wood 'always feels better when the market is worried' — here's why",
    source: 'CNBC',
    date: '2026-11-08',
    topic: 'markets',
    level: 'C1',
    deck: 'Verification fixture',
    paragraphs: [{
      en: 'The market entered correction territory as investors debated AI capex and free cash flow.',
      zh: '市场进入修正区间。',
      note: '',
      analysis: { english: {}, finance: {} }
    }],
    vocab: [],
    knowledge: [
      {
        id: 'uoweyl8k0', term: '投资者情绪', en: 'Investor Sentiment', category: 'background',
        one: '逆向投资是在情绪极端时寻找反向机会。', body: '情绪不是基本面本身。', cardType: 'concept'
      },
      {
        id: 'uoweyl8k2', term: '市场修正', en: 'Market Correction', category: 'finance',
        one: '市场回调。', body: 'ETF通过一级市场申购赎回和二级市场买卖连接净值与市价。', cardType: 'concept'
      },
      {
        id: 'uoweyl8k6', term: 'Wall of Worry', en: 'Wall of Worry', category: 'background',
        one: '市场情绪概念。', body: '牛市通常指主要股指从低点显著上涨，并以 ARK ETF 表现作为案例。', cardType: 'concept'
      },
      {
        id: 'uoweyl8k9', term: 'AI主题交易', en: 'AI trade', category: 'background',
        one: '围绕人工智能相关资产形成的主题性交易。', body: 'AI trade 是围绕 AI 算力、半导体、软件和应用公司的主题交易。', cardType: 'phenomenon'
      },
      {
        id: 'uoweyl8k15', term: '通用目的技术', en: 'General Purpose Technology (GPT)', category: 'background',
        one: '通用目的技术。', body: '在贴现现金流框架中，把未来现金流折现可得到类似久期的指标。', cardType: 'concept'
      },
      {
        id: 'uoweyl8k22', term: 'Bond Investors in Technology Financing', en: 'Bond Investors in Technology Financing',
        category: 'background', one: '债券投资者进入科技融资。', body: '科技公司使用债务融资，债券投资者关注现金流和信用风险。', cardType: 'mechanism'
      },
      {
        id: 'uoweyl8k25', term: '利率对企业融资的敏感性', en: 'Interest-rate sensitivity of corporate borrowing',
        category: 'background', one: '利率影响企业融资。', body: '利率上升提高债务成本、再融资成本和违约风险。', cardType: 'mechanism'
      },
      {
        id: 'uoweyl8k27', term: '高信念持仓', en: 'High-conviction position',
        category: 'background', one: '集中投资。', body: '高信念持仓涉及主动份额、跟踪误差和集中度风险。', cardType: 'concept'
      },
      {
        id: 'uoweyl8k28', term: '加码（加倍下注）', en: 'Double down',
        category: 'background', one: '追加投入。', body: '追加投入放大收益和亏损，并提高组合集中度。', cardType: 'mechanism'
      }
    ]
  }];
  state.settings = { ...(state.settings || {}), readingDefaultsVersion: 2 };
  localStorage.setItem('finlens.v1', JSON.stringify(state));
});
await page.reload({ waitUntil: 'networkidle' });
const cards = await page.evaluate(() => {
  const article = ARTICLES.find(item => item.id === 'uoweyl8');
  return Object.fromEntries(article.knowledge.map(card => [card.id, card]));
});

const results = [];
const check = (name, condition, extra = '') => {
  results.push({ name, pass: !!condition, extra });
  console.log(`${condition ? 'PASS' : 'FAIL'} ${name}${extra ? ' - ' + extra : ''}`);
};

check('Market Correction content and card type are corrected',
  cards.uoweyl8k2?.category === 'finance' &&
  cards.uoweyl8k2?.cardType === 'phenomenon' &&
  /近期高点/.test(cards.uoweyl8k2?.body || '') &&
  !/ETF/.test(cards.uoweyl8k2?.body || '') &&
  !/费率|跟踪误差/.test(JSON.stringify(cards.uoweyl8k2?.indicators || [])) &&
  cards.uoweyl8k2?.methodSteps?.length === 0 &&
  cards.uoweyl8k2?.authority?.source === 'Nasdaq',
  JSON.stringify(cards.uoweyl8k2));
check('Wall of Worry content is replaced with the correct market-sentiment concept',
  cards.uoweyl8k6?.category === 'finance' &&
  /忧虑之墙/.test(cards.uoweyl8k6?.body || '') &&
  !/ARK ETF/.test(cards.uoweyl8k6?.body || ''),
  JSON.stringify(cards.uoweyl8k6));
check('General Purpose Technology content is no longer a DCF explanation',
  cards.uoweyl8k15?.category === 'background' &&
  /下游创新/.test(`${cards.uoweyl8k15?.one || ''} ${cards.uoweyl8k15?.body || ''}`) &&
  !/^在贴现现金流框架中/.test(cards.uoweyl8k15?.body || '') &&
  cards.uoweyl8k15?.methodSteps?.length === 0 &&
  !JSON.stringify(cards.uoweyl8k15?.related || []).includes('贴现现金流'),
  JSON.stringify(cards.uoweyl8k15));
check('Verified market and investment terms receive financial classification',
  cards.uoweyl8k0?.category === 'finance' &&
  cards.uoweyl8k9?.category === 'finance' &&
  cards.uoweyl8k9?.categories?.includes('background') &&
  cards.uoweyl8k22?.category === 'finance' &&
  cards.uoweyl8k25?.category === 'finance' &&
  cards.uoweyl8k27?.category === 'finance' &&
  cards.uoweyl8k28?.category === 'finance',
  JSON.stringify(Object.fromEntries(['uoweyl8k0', 'uoweyl8k9', 'uoweyl8k22', 'uoweyl8k25', 'uoweyl8k27', 'uoweyl8k28']
    .map(key => [key, cards[key]?.category]))));

await context.close();
await browser.close();
const failures = results.filter(item => !item.pass);
console.log(`\n=== ${results.length - failures.length}/${results.length} passed ===`);
if (failures.length) process.exitCode = 1;
