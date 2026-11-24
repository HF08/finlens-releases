/* 市场修正、循环融资、资本支出与现金流分类回归。 */
import { createRequire } from 'node:module';

const req = createRequire(process.env.PW_BASE || 'C:/Users/NORA/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright-core');
const BASE = process.env.FINLENS_TEST_BASE || 'http://127.0.0.1:8787';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
await page.goto(BASE, { waitUntil: 'networkidle' });

const results = await page.evaluate(() => {
  const cards = [
    {
      key: 'market-correction',
      expected: 'finance',
      card: {
        term: 'Market correction',
        en: 'Market correction',
        category: 'background',
        cardType: 'phenomenon',
        one: '股票市场从近期高点明显回撤。',
        body: '广泛股票指数从近期收盘高点下跌约 10%，反映资产价格、估值和投资者回撤风险。'
      }
    },
    {
      key: 'housing-correction',
      expected: 'background',
      card: {
        term: 'Housing market correction',
        en: 'Housing market correction',
        category: 'finance',
        cardType: 'phenomenon',
        one: '住宅价格从高位回落。',
        body: '这是房地产供需和住房可负担性的调整，不涉及证券或金融资产定价。'
      }
    },
    {
      key: 'circular-financing',
      expected: 'finance',
      expectedSecondary: 'background',
      card: {
        term: 'Circular financing',
        en: 'Circular financing',
        category: 'background',
        cardType: 'mechanism',
        one: '投资、采购和云承诺在关联企业之间形成资金闭环。',
        body: '投资方投资客户，客户承诺采购算力；供应商融资和后续再融资依赖同一闭环中的收入与现金流，形成信用暴露和流动性风险。'
      }
    },
    {
      key: 'accounting-circular',
      expected: 'background',
      card: {
        term: 'Circular accounting entries',
        en: 'Circular accounting entries',
        category: 'finance',
        cardType: 'mechanism',
        one: '资金在内部账户之间循环记账。',
        body: '这是会计分录重分类和内部控制流程，没有融资、债权债务或金融资产暴露。'
      }
    },
    {
      key: 'capex-cash-flow',
      expected: 'finance',
      expectedSecondary: 'background',
      card: {
        term: 'Capital expenditure versus cash flow',
        en: 'Capital expenditure versus cash flow',
        category: 'background',
        cardType: 'mechanism',
        one: '资本支出与经营现金流、自由现金流之间的比较。',
        body: '资本支出扩张挤压经营现金流和自由现金流，扩大融资缺口并降低流动性，最终影响债务与信用风险。'
      }
    },
    {
      key: 'capex-only',
      expected: 'background',
      card: {
        term: 'Capital expenditure',
        en: 'Capital expenditure',
        category: 'finance',
        cardType: 'concept',
        one: '取得或改良长期资产的支出。',
        body: '企业采购设备、建设厂房和基础设施，属于实体资本形成。'
      }
    },
    {
      key: 'capex-cash-flow-method',
      expected: 'finance',
      expectedSecondary: 'method',
      card: {
        term: 'Capital expenditure versus cash flow analysis',
        en: 'Capital expenditure versus cash flow analysis',
        category: 'background',
        cardType: 'method',
        one: '用统一口径比较资本支出与现金流可持续性。',
        body: '分析以公司披露数据、期间和币种为输入，计算经营现金流、自由现金流和融资缺口，并解释结果与适用边界。',
        methodSteps: [
          '统一期间、币种和资本支出口径，并列出假设。',
          '计算经营现金流、自由现金流和融资缺口，进行敏感性检验。'
        ]
      }
    },
    {
      key: 'purchasing-power',
      expected: 'finance',
      card: {
        term: 'Purchasing Power',
        en: 'Purchasing Power',
        category: 'background',
        cardType: 'concept',
        one: '购买力衡量一单位货币能买到的商品与服务。',
        body: '购买力受名义工资、物价、税收和补贴影响；通胀高于名义工资增速时，实际购买力下降。'
      }
    },
    {
      key: 'purchasing-power-measurement',
      expected: 'finance',
      expectedSecondary: 'method',
      card: {
        term: 'Purchasing Power Measurement',
        en: 'Purchasing Power Measurement',
        category: 'background',
        cardType: 'method',
        one: '用价格指数和支出口径衡量一单位货币的实际购买力。',
        body: '分析选择代表性商品篮子、价格数据和基期作为输入，按支出权重计算价格指数，并用名义收入平减得到实际购买力；输出需解释口径、权重变化和适用边界。',
        methodSteps: [
          '确定商品篮子、基期和价格数据来源。',
          '按支出权重计算价格指数，并用其平减名义收入，进行敏感性检验。'
        ]
      }
    }
  ];
  return cards.map(item => ({
    key: item.key,
    expected: item.expected,
    expectedSecondary: item.expectedSecondary || '',
    result: classifyKnowledgeCategoryClient(item.card)
  }));
});

const failures = [];
const check = (name, condition, extra = '') => {
  console.log(`${condition ? 'PASS' : 'FAIL'} ${name}${extra ? ' - ' + extra : ''}`);
  if (!condition) failures.push(name);
};

for (const item of results) {
  check(`${item.key} classified as ${item.expected}`,
    item.result.category === item.expected,
    JSON.stringify(item.result));
  if (item.expectedSecondary) {
    check(`${item.key} cross-listed with ${item.expectedSecondary}`,
      item.result.categories?.includes(item.expectedSecondary),
      JSON.stringify(item.result.categories));
  }
}

await context.close();
await browser.close();
console.log(`\n=== ${results.length + results.filter(item => item.expectedSecondary).length - failures.length}/${results.length + results.filter(item => item.expectedSecondary).length} passed ===`);
if (failures.length) process.exitCode = 1;
