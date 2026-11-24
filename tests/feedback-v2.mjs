/* 2026-11-03 feedback regression suite. */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const req = createRequire(process.env.PW_BASE || 'C:/Users/NORA/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright-core');
const APP_PORT = 8804;
const CONTENT_PORT = 8894;
const BASE = `http://127.0.0.1:${APP_PORT}`;
const CONTENT = `http://127.0.0.1:${CONTENT_PORT}`;
const OUT = path.resolve('tests/shots/feedback-final');
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const check = (name, condition, extra = '') => {
  results.push({ name, pass: !!condition, extra });
  console.log(`${condition ? 'PASS' : 'FAIL'} ${name}${extra ? ' - ' + extra : ''}`);
};

const article = (id, title, source, date, topic) => ({
  id, title, source, date, topic, level: 'C1',
  deck: `${title} deck`,
  paragraphs: Array.from({ length: 12 }, (_, index) => ({
    en: `Paragraph ${index + 1}. A sufficiently long finance paragraph explains inflation, liquidity, and interest rates for investors.`,
    zh: '',
    note: '',
    analysis: {
      english: { longSentence: '', grammar: '', expression: '' },
      finance: { term: '', background: '', relevance: '' }
    }
  })),
  vocab: [{
    w: 'liquidity', ipa: '/lɪˈkwɪdəti/', pos: 'n.', zh: '流动性',
    en: 'the ability to buy or sell assets quickly without a large price change',
    forms: [], synonyms: [], exam: ['FINANCE'], ex: '', exZh: ''
  }],
  knowledge: []
});
const seedArticles = [
  article('fb-a', 'Older Alpha', 'Source Z', '2026-09-01', 'other'),
  article('fb-b', 'Newest Beta', 'Source A', '2026-11-01', 'markets'),
  article('fb-c', 'Middle Gamma', 'Source M', '2026-10-01', 'policy')
];
seedArticles[0].suggestedTag = '政治与制度';
seedArticles[1].knowledge = [
  {
    id: 'fb-b-k-finance', term: 'term premium', en: 'Term premium', category: 'finance',
    one: '长期债券投资者要求的额外补偿。', body: '期限溢价反映久期、通胀和财政供给的不确定性。',
    cases: '财政供给上升时，期限溢价可能走高。', related: ['收益率曲线'], match: ['term premium'],
    authority: { source: 'Federal Reserve', description: '提供利率与货币政策的一手资料。', url: 'https://www.federalreserve.gov/' }
  },
  {
    id: 'fb-b-k-background', term: 'fiscal supply', en: 'Fiscal supply', category: 'background',
    one: '政府债券发行增加会影响市场供需。', body: '财政融资规模与债券供给会改变投资者对久期的承接能力。',
    cases: '', related: ['财政政策'], match: ['fiscal supply']
  },
  {
    id: 'fb-b-k-method', term: 'duration analysis', en: 'Duration analysis', category: 'method',
    one: '用久期衡量债券价格对利率变化的敏感度。', body: '久期分析把现金流时点、利率变动和价格敏感性联系起来。',
    cases: '', related: ['利率风险'], match: ['duration']
  }
];
seedArticles[1].knowledge.push({
  id: 'fb-b-k-finance-duplicate',
  term: '期限溢价',
  en: 'Term premium',
  category: 'finance',
  one: '重复别名卡片：长期债券投资者要求的额外补偿。',
  body: '这张重复卡片通过英文别名与 term premium 指向同一概念，系统应合并并保留更完整解释。',
  cases: '长期债券供给增加时，期限溢价可能上升。',
  related: ['收益率曲线', '久期风险'],
  match: ['term premium', '期限溢价']
});
seedArticles[1].knowledge.push({
  id: 'fb-b-k-incomplete',
  term: 'incomplete card',
  en: '',
  category: 'finance',
  one: '',
  body: '',
  cases: '',
  methodSteps: [],
  related: [],
  match: []
});
seedArticles[1].paragraphs[0] = {
  ...seedArticles[1].paragraphs[0],
  en: 'A larger {{term premium}} and {{term premium uncertainty}} can affect bond prices, while {{unlinked term}} has no matching knowledge card in this article.'
};
seedArticles[2].knowledge = [
  {
    id: 'fb-c-k-financial-law', term: 'financial law', en: 'Financial law', category: 'background',
    categories: ['background', 'finance'],
    one: '规范金融交易、机构与市场行为的法律规则。',
    body: '金融法律覆盖证券发行、银行监管、破产清偿和投资者保护，并直接影响金融合约的可执行性与风险分配。',
    cases: '', methodSteps: [], related: ['banking regulation'], match: ['financial law']
  },
  {
    id: 'fb-c-k-fintech', term: 'fintech', en: 'FinTech', category: 'finance',
    categories: ['finance', 'background'],
    one: '以数字技术提供或改造金融服务的业务形态。',
    body: '金融科技涵盖数字支付、网络借贷、智能投顾和开放银行，既改变金融服务的成本结构，也带来数据、算法与监管边界问题。',
    cases: '', methodSteps: [], related: ['digital payments'], match: ['fintech']
  },
  {
    id: 'fb-c-k-judicial', term: 'judicial review', en: 'Judicial review', category: 'background',
    categories: ['background'],
    one: '法院审查行政行为合法性的司法程序。',
    body: '司法审查关注公共机构行为是否超越法定权限、遵循程序并符合法律要求。',
    cases: '', methodSteps: [], related: ['administrative law'], match: ['judicial review']
  },
  {
    id: 'fb-c-k-electrification', term: 'electrification', en: 'Electrification', category: 'finance',
    categories: ['finance'],
    one: '把交通、供暖和工业终端用能从燃烧燃料转向用电。',
    body: '电气化改变终端能源结构，需要电网、储能、设备和许可同步推进。',
    cases: '', methodSteps: [], related: ['energy transition'], match: ['electrification']
  },
  {
    id: 'fb-c-k-grid-investment', term: 'grid and storage investment', en: 'Grid and storage investment', category: 'finance',
    categories: ['finance'],
    one: '电网和储能设施的实体扩容支出。',
    body: '电网与储能投资形成能源基础设施能力，属于产业与能源转型背景。',
    cases: '', methodSteps: [], related: ['power grid'], match: ['grid investment']
  },
  {
    id: 'fb-c-k-concessional', term: 'concessional capital', en: 'Concessional capital', category: 'background',
    categories: ['background'],
    one: '低于市场价格的优惠融资。',
    body: '优惠资本通过较低利率、赠款或担保降低项目资本成本与风险溢价。',
    cases: '', methodSteps: [], related: ['loan guarantee'], match: ['concessional capital']
  }
];
seedArticles.push({
  ...article('fb-raw', 'Raw article needing annotation', 'Source Raw', '2026-11-02', 'markets'),
  deck: 'Baseline deck that must never change.',
  paragraphs: [{
    en: 'Bond investors demanded a larger {{term premium}} as fiscal supply increased and inflation uncertainty remained elevated.',
    zh: '财政供给增加且通胀不确定性上升时，债券投资者要求更高的期限溢价。',
    note: '基线难点解析，不应被词汇侧重修改。',
    analysis: {
      english: { longSentence: '基线长难句解析。', grammar: '基线语法解析。', expression: 'baseline expression' },
      finance: { term: 'term premium', background: '基线金融背景。', relevance: '基线文章关联。' }
    }
  }, {
    en: 'The central bank monitored duration, liquidity conditions while investors reassessed the path of policy rates.',
    zh: '央行关注流动性状况，投资者则重新评估政策利率路径。',
    note: '第二段基线解析。',
    analysis: {
      english: { longSentence: '第二段长难句解析。', grammar: '第二段语法解析。', expression: 'policy path' },
      finance: { term: 'liquidity', background: '第二段金融背景。', relevance: '第二段文章关联。' }
    }
  }],
  vocab: [{
    w: 'baselineword', ipa: '/ˈbeɪslaɪn/', pos: 'n.', zh: '基线词',
    en: 'a baseline vocabulary item', forms: [], synonyms: [], exam: ['FINANCE'], ex: '', exZh: ''
  }],
  knowledge: [{
    id: 'fb-raw-k1', term: 'term premium', en: 'Term premium', category: 'finance',
    one: '基线知识卡。', body: '基线知识卡正文不得被词汇侧重修改。', cases: '',
    methodSteps: [], related: [], match: ['term premium']
  }]
});

const waitForServer = async () => {
  for (let i = 0; i < 60; i++) {
    try {
      const response = await fetch(BASE + '/api/health', { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('FinLens feedback server did not start');
};

let server;
let browser;
let lastModelBody = '';
const modelBodies = [];
const contentServer = http.createServer((request, response) => {
  if (request.method === 'POST' && request.url === '/v1/chat/completions') {
    const chunks = [];
    request.on('data', chunk => chunks.push(chunk));
    request.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');
      lastModelBody = body;
      modelBodies.push(body);
      let content;
      if (body.includes('First-chunk quality marker')) {
        const firstChunk = body.includes('First-chunk quality marker');
        content = {
          quality: !firstChunk,
          qualityReason: firstChunk ? '该分段以订阅导航开头，正文只有片段，缺少完整文章结构。' : '',
          title: 'Complete multi-chunk article',
          deck: 'Chunk quality regression fixture',
          level: 'C1',
          topic: 'markets',
          paragraphs: [{
            en: firstChunk
              ? 'Golden State Valkyries star Gabby Williams discussed political and cultural issues in the WNBA.'
              : 'Williams said athletes embrace their platform and expect the wider social debate to continue.',
            zh: firstChunk ? '第一段译文。' : '第二段译文。',
            note: '',
            analysis: { english: {}, finance: {}, focus: {} }
          }],
          vocab: [{
            w: 'platform',
            ipa: '/ˈplætfɔːm/',
            pos: 'n.',
            zh: '平台',
            en: 'a position or opportunity for expression',
            forms: ['platforms'],
            synonyms: [],
            exam: ['IELTS'],
            ex: '',
            exZh: ''
          }],
          knowledge: [{
            term: 'public platform',
            en: 'Public platform',
            category: 'background',
            one: '公众人物表达社会议题的渠道。',
            body: '该概念描述公众表达空间，不属于金融本体。'
          }]
        };
      } else if (body.includes('只生成精读解析')) {
        const indices = [...new Set([...body.matchAll(/\[(\d+)\]/g)].map(match => Number(match[1])))]
          .filter(Number.isInteger);
        const focus = body.includes('IELTS 学术表达')
          ? {
              label: 'IELTS 学术表达',
              guidance: '关注学术改写、论证衔接和可迁移表达。',
              recommendations: ['The evidence suggests that...', 'This can be attributed to...']
            }
          : body.includes('TOEFL 学术阅读')
            ? {
                label: 'TOEFL 学术阅读',
                guidance: '关注指代、句间关系和摘要表达。',
                recommendations: ['The former...', 'By contrast...']
              }
            : body.includes('金融层推理')
              ? {
                  label: '金融层推理',
                  guidance: '重点解释金融机制、估值或风险含义。',
                  recommendations: []
                }
              : {
                  label: '通用精读',
                  guidance: '英语层与金融层保持平衡。',
                  recommendations: ['This shift reflects...']
                };
        content = {
          analyses: indices.map(index => ({
            index,
            analysis: {
              english: {
                longSentence: `第 ${index + 1} 段的主干、从句和逻辑关系已按侧重拆解。`,
                grammar: '说明指代、时态、逻辑连接和句间关系。',
                expression: focus.recommendations.join(' / ')
              },
              finance: {
                term: 'term premium',
                background: '金融机制在侧重更新后得到更清晰的解释。',
                relevance: '该机制连接当前段落与文章论点。'
              },
              focus
            }
          }))
        };
      } else if (body.includes('只生成词汇标注')) {
        const word = body.includes('TOEFL 学术阅读高频词汇')
          ? 'academic term'
          : body.includes('IELTS 学术阅读高频词汇')
            ? 'duration'
            : 'policy rate';
        content = {
          vocab: [
            {
              w: word,
              ipa: '/ˈvəʊkæbjələri/',
              pos: 'n.',
              zh: '侧重测试词汇',
              en: 'a vocabulary item generated for the selected focus',
              forms: [],
              synonyms: [],
              exam: [body.includes('TOEFL') ? 'TOEFL' : body.includes('IELTS') ? 'IELTS' : 'FINANCE'],
              ex: 'The vocabulary focus changed without rewriting the article.',
              exZh: '词汇侧重变化不应重写文章。'
            },
            {
              w: 'liquidity',
              ipa: '/lɪˈkwɪdəti/',
              pos: 'n.',
              zh: '流动性',
              en: 'the ability to buy or sell assets quickly without a large price change',
              forms: [],
              synonyms: ['market depth'],
              exam: ['FINANCE'],
              ex: 'Liquidity remained stable during the review.',
              exZh: '复查期间流动性保持稳定。'
            },
            {
              w: 'surge',
              ipa: '/sɜːdʒ/',
              pos: 'n.',
              zh: '激增',
              en: 'a sudden large increase',
              forms: [],
              synonyms: ['increase'],
              exam: ['FINANCE'],
              ex: 'Prices can surge during stress.',
              exZh: '压力时期价格可能激增。'
            }
          ]
        };
      } else if (body.includes('INCOHERENT_QUALITY_TEST')) {
        content = { quality: false, qualityReason: '正文前后不连贯，缺少完整文章结构' };
      } else if (body.includes('EMPTY_ANNOTATION_TEST')) {
        content = {
          quality: true,
          qualityReason: '',
          title: 'Empty annotation fixture',
          deck: '',
          level: 'C1',
          topic: 'markets',
          paragraphs: [{
            en: 'The bond market remained calm while investors waited for new economic data.',
            zh: '投资者等待新的经济数据时，债券市场保持平静。',
            note: '',
            analysis: { english: {}, finance: {} }
          }],
          vocab: [],
          knowledge: []
        };
      } else if (body.includes('QUALITY_FALSE_ACCEPT_TEST')) {
        content = {
          quality: false,
          qualityReason: '文本段落连贯、逻辑清晰，可作精读语料；仅标题包含网页控件说明。',
          title: 'Quality false but complete annotation',
          deck: '模型质量标记与说明矛盾时的兼容性测试。',
          level: 'C1',
          topic: 'policy',
          paragraphs: [{
            en: 'The central bank kept its policy rate unchanged and said inflation risks still required careful monitoring.',
            zh: '央行维持政策利率不变，并表示仍需密切关注通胀风险。',
            note: '',
            analysis: {
              english: { longSentence: '主干为 kept ... and said ...。', grammar: '并列谓语。', expression: 'keep rates unchanged' },
              finance: { term: 'policy rate', background: '政策利率是货币政策的主要工具。', relevance: '决定市场利率的基准。' }
            }
          }],
          vocab: [{
            w: 'policy rate', ipa: '/ˈpɒləsi reɪt/', pos: 'n.', zh: '政策利率',
            en: 'the interest rate set by a central bank', forms: [], synonyms: ['key rate'], exam: ['FINANCE'],
            ex: 'The policy rate was left unchanged.', exZh: '政策利率维持不变。'
          }],
          knowledge: [{
            term: 'policy rate', en: 'Policy rate', category: 'finance',
            one: '央行用于引导市场利率的核心利率。',
            body: '政策利率通过银行融资成本、资产价格和预期渠道影响总需求与通胀。',
            cases: '', methodSteps: [], related: ['transmission mechanism'], match: ['policy rate']
          }]
        };
      } else if (body.includes('CATEGORY_BOUNDARY_TEST')) {
        content = {
          quality: true,
          qualityReason: '',
          title: 'Knowledge category boundary fixture',
          deck: 'Boundary test',
          level: 'C1',
          topic: 'policy',
          paragraphs: [{
            en: 'Political risk and geopolitical risk can affect credit spreads, while stress testing helps assess financial stability.',
            zh: '政治风险和地缘风险会影响信用利差，压力测试可用于评估金融稳定。',
            note: '',
            analysis: { english: {}, finance: {} }
          }],
          vocab: [{
            w: 'political risk', ipa: '/pəˈlɪtɪkəl rɪsk/', pos: 'n.', zh: '政治风险',
            en: 'the risk of political events affecting economic outcomes',
            forms: [], synonyms: [], exam: ['FINANCE'], ex: '', exZh: ''
          }],
          knowledge: [
            { term: 'political risk', en: 'Political risk', category: 'finance', one: '政治事件带来的不确定性。', body: '选举、政策变化和政治不稳定会影响经济与资产价格。' },
            { term: 'geopolitical risk', en: 'Geopolitical risk', category: 'finance', one: '地缘政治冲突带来的不确定性。', body: '战争、制裁和国际关系紧张会影响贸易与市场。' },
            { term: 'bargaining power', en: 'Bargaining power', category: 'finance', one: '谈判一方影响交易条件的能力。', body: '谈判力来自替代方案、时间压力、信息与组织能力。' },
            { term: 'negotiating leverage', en: 'Negotiating leverage', category: 'finance', one: '谈判中用于争取条件优势的筹码。', body: '谈判杠杆描述双方在协议条件上的相对影响力，不是财务杠杆。' },
            { term: 'financial leverage', en: 'Financial leverage', category: 'background', one: '债务融资放大的资本结构暴露。', body: '财务杠杆通过债务与权益比例放大股东收益和违约风险。' },
            { term: 'geopolitical risk premium', en: 'Geopolitical risk premium', category: 'background', one: '投资者为地缘政治风险要求的额外补偿。', body: '地缘政治风险溢价是投资者持有受战争、制裁或国际冲突影响资产时要求的定价补偿，反映在预期收益和折现率中。' },
            { term: 'regulatory risk premium', en: 'Regulatory risk premium', category: 'finance', one: '监管不确定性对应的定价补偿。', body: '当监管变化被投资者定价时，会表现为更高的预期收益、利差或折现率。' },
            { term: 'equity risk premium', en: 'Equity risk premium', category: 'background', one: '股票相对无风险利率的预期超额回报。', body: '股权风险溢价是股票市场估值与资产配置中的核心金融指标。' },
            { term: 'credit spread', en: 'Credit spread', category: 'background', one: '信用债与无风险利率的利差。', body: '信用利差反映违约风险和风险补偿。' },
            { term: 'stress testing', en: 'Stress testing', category: 'finance', one: '检验极端情景下金融体系承受能力的方法。', body: '压力测试通过情景假设评估损失和资本充足性。' },
            { term: 'political risk premium', en: 'Political risk premium', category: 'background', one: '投资者为政治不确定性要求的额外补偿。', body: '政治风险溢价是金融资产定价中的风险补偿组成部分。' },
            { term: 'real wages', en: 'Real wages', category: 'background', one: '扣除物价后的工资。', body: '实际工资是衡量购买力和通胀传导的统计指标。' },
            { term: 'supply bottleneck', en: 'Supply bottleneck', category: 'finance', one: '产业供给能力受限。', body: '供给瓶颈来自产业链、产能和运输约束。' },
            { term: 'financial law', en: 'Financial law', category: 'finance', one: '规范金融交易与机构行为的法律。', body: '金融法律约束证券发行、银行经营和投资者保护。' },
            { term: 'banking regulation', en: 'Banking regulation', category: 'background', one: '约束银行资本、流动性与经营行为的监管规则。', body: '银行监管通过资本充足率、流动性要求和监督检查控制系统性风险。' },
            { term: 'fintech', en: 'FinTech', category: 'background', one: '技术驱动的金融服务。', body: '金融科技包括数字支付、网络借贷、智能投顾和开放银行。' },
            { term: 'judicial review', en: 'Judicial review', category: 'finance', one: '法院审查行政行为合法性的程序。', body: '司法审查判断公共机构行为是否合法，不直接构成金融定价概念。' },
            { term: 'corporate finance', en: 'Corporate finance', category: 'background', one: '企业融资、投资和资本结构决策。', body: '公司财务研究企业如何在股权与债务之间配置资本，并评估投资项目。' },
            { term: 'insurance underwriting', en: 'Insurance underwriting', category: 'background', one: '保险人评估并承担风险的过程。', body: '承保通过风险分类、定价和准备金安排管理保险组合。' },
            {
              term: 'jointly controlled equity stake',
              en: 'Jointly controlled equity stake',
              category: 'background',
              one: '共同控制的上市公司股权把经济收益、投票权和处分限制分布在配偶与信托之间。',
              body: '该股权是英伟达这类上市公司的权益资产。共同信托或 LLC 改变谁可以投票、出售和处分股份，并影响减持预期、控制权、披露和估值；信托治理与婚姻财产制度是金融股权关系的背景维度。'
            },
            {
              term: 'divorce asset division',
              en: 'Divorce asset division',
              category: 'finance',
              one: '离婚财产分割首先依据婚姻财产制和信托条款确定财产归属，再处理相关资产的估值、转移与税务。',
              body: '共同财产制与分别财产制处理不同；信托持有的英伟达股份是否属于夫妻财产，要看设立时间、资金来源、受益人、可撤销性和法院裁量。股份分割还涉及估值、流动性、控制权和税务。'
            }
          ]
        };
      } else if (body.includes('METHOD_EVIDENCE_AUDIT_TEST')) {
        content = {
          quality: true,
          qualityReason: '',
          title: 'Method evidence audit fixture',
          deck: 'Method evidence audit',
          level: 'C1',
          topic: 'markets',
          paragraphs: [{
            en: 'Complete analytical procedures should be separated from financial valuation objects and operating tools.',
            zh: '完整分析程序应与金融估值对象和经营工具区分。',
            note: '',
            analysis: { english: {}, finance: {} }
          }],
          vocab: [{
            w: 'valuation', ipa: '/ˌvæljuˈeɪʃən/', pos: 'n.', zh: '估值',
            en: 'the process of estimating value', forms: [], synonyms: [], exam: ['FINANCE'], ex: '', exZh: ''
          }],
          knowledge: [
            {
              term: 'founder-market fit', en: 'Founder-market fit', category: 'background', cardType: 'method',
              one: '判断创始人经历与目标市场问题是否匹配。',
              body: '先核查创始人是否亲历问题、理解支付方与监管，再用获客和单位经济性数据验证。边界是个人叙事不能替代经营数据。',
              methodSteps: ['核查创始人经历', '理解支付方与监管', '比较获客与单位经济性', '说明叙事证据的边界']
            },
            {
              term: 'venture capital team evaluation', en: 'Venture capital team evaluation', category: 'finance', cardType: 'method',
              one: '按问题理解、监管约束和执行记录评估创业团队。',
              body: '该程序把问题理解、监管导航和市场约束作为输入，比较团队执行记录并形成投资判断；边界是主观评估不能替代财务与法律尽调。',
              methodSteps: ['识别核心问题', '核查监管约束', '比较团队执行记录', '说明尽调边界']
            },
            {
              term: 'incremental vote-margin comparison', en: 'Incremental vote-margin comparison', category: 'background', cardType: 'method',
              one: '比较两个时点的累计票差与新增票数。',
              body: '先记录两个时点的累计票数和票差，再计算变化并结合县或选区来源判断净倾向；误差来自批次混合，不能替代最终计票。',
              methodSteps: ['记录票数与票差', '计算票差变化', '结合选区和批次来源', '说明外推误差']
            },
            {
              term: 'seasonal adjustment', en: 'Seasonal adjustment', category: 'background', cardType: 'method',
              one: '剔除重复季节模式，使月度数据可比较。',
              body: '输入原始月度序列，用历史数据估计季节因子，从序列中剔除季节成分并输出季调值；仍需结合修订、趋势和一次性冲击解释结果。',
              methodSteps: ['读取原始月度序列', '估计季节因子', '剔除季节成分', '结合修订与趋势解释']
            },
            {
              term: 'data surprise analysis', en: 'Data surprise analysis', category: 'background', cardType: 'method',
              one: '比较实际值与一致预期，判断新信息的边际影响。',
              body: '先确认一致预期口径并计算差异，再检查前值修正和分项广度，最后映射到政策预期；单月噪音和提前定价限制解释力。',
              methodSteps: ['确认预期口径', '计算实际与预期差异', '检查修正和分项', '映射政策预期', '说明噪音边界']
            },
            {
              term: 'job-growth breadth analysis', en: 'Job-growth breadth analysis', category: 'background', cardType: 'method',
              one: '用行业扩散度和月度均值判断就业增长质量。',
              body: '读取分行业新增就业，计算正增长行业占比，再比较单月与三个月均值并交叉验证失业率；季节性和基准修正可能造成误差。',
              methodSteps: ['读取分行业数据', '计算扩散度', '比较月度均值', '交叉验证失业率', '说明季节误差']
            },
            {
              term: 'source completeness screening', en: 'Source completeness screening', category: 'background', cardType: 'method',
              one: '在精读前检查来源与正文是否完整。',
              body: '先检查导航和下载声明，再核对连续正文与段落边界，随后判断输出质量并标记正文缺失；不能把标题或链接当作事实依据。',
              methodSteps: ['识别导航和链接', '核对正文完整性', '检查段落连贯性', '输出质量标记', '说明缺失边界']
            },
            {
              term: 'new-item count vs sales value', en: 'New-item count vs sales value', category: 'background', cardType: 'method',
              one: '区分新品数量增长与销售额增长。',
              body: '先确认指标是数量还是金额，再核对销售门槛、时间窗口和基数，最后比较结果；相关性不能直接解释为因果。',
              methodSteps: ['确认指标口径', '核对门槛与窗口', '检查基数和金额', '区分相关与因果']
            },
            {
              term: 'UPC-based retail sales tracking', en: 'UPC-based retail sales tracking', category: 'background', cardType: 'method',
              one: '用零售终端 UPC 扫描汇总销量和销售额。',
              body: '采集 POS 扫描数据，用 UPC 映射产品和品类，再汇总销售额并结合销量拆解增长；渠道覆盖和促销处理会影响结果。',
              methodSteps: ['采集POS数据', '映射UPC品类', '汇总销售额', '拆解销量与价格', '说明覆盖边界']
            },
            {
              term: 'consumer trend evidence verification', en: 'Consumer trend evidence verification', category: 'background', cardType: 'method',
              one: '用销量、渗透率和复购数据检验消费趋势。',
              body: '先识别趋势判断的限定程度，再寻找量化指标、确认时间窗口和基准，最后区分真实需求与营销噪音；缺少数据时只能作为假设。',
              methodSteps: ['识别判断限定', '寻找量化指标', '确认时间窗口', '区分需求与营销噪音', '输出验证结论']
            },
            {
              term: 'stated preference survey', en: 'Stated preference survey', category: 'background', cardType: 'method',
              one: '通过抽样问卷收集陈述意愿和态度。',
              body: '先确认样本框和问题措辞，再报告比例、误差和时间，最后区分意愿与实际行为；社会期望偏差会影响结果。',
              methodSteps: ['确认样本框', '核对问题措辞', '报告比例与误差', '区分意愿与行为']
            },
            {
              term: 'wealth quantile analysis', en: 'Wealth quantile analysis', category: 'background', cardType: 'method',
              one: '按家庭净资产排序并比较不同分位。',
              body: '先确定对象与年龄组，再按净资产排序、划分分位并计算目标占比，最后比较时期变化；样本和财富估值口径会影响结果。',
              methodSteps: ['确定对象和年龄组', '按净资产排序', '划分财富分位', '计算分位占比', '说明估值口径']
            },
            {
              term: 'opportunity cost and time allocation', en: 'Opportunity cost and time allocation', category: 'background', cardType: 'method',
              one: '比较不同时间用途的边际收益和机会成本。',
              body: '先界定时间与金钱资源，再列出用途、估计边际收益和成本，比较净收益并考虑制度约束；结果依赖估计口径和约束假设。',
              methodSteps: ['界定稀缺资源', '列可用用途', '估计边际收益与成本', '比较净收益', '说明约束边界']
            },
            {
              term: 'attribution in reported speech', en: 'Attribution in reported speech', category: 'background', cardType: 'method',
              one: '通过引号和报道动词区分主张与事实。',
              body: '先识别引号边界和 reporting verb，再判断话语责任，最后与独立证据核对；引述断言不能直接视为已核实事实。',
              methodSteps: ['识别引号边界', '定位报道动词', '判断话语责任', '核对独立证据']
            },
            {
              term: 'personal narrative vs fundamentals', en: 'Personal narrative vs fundamentals', category: 'background', cardType: 'method',
              one: '把创始人叙事与收入、现金流等基本面证据分开。',
              body: '先识别个人叙事，再补充收入、毛利、渠道和复购数据，最后比较叙事与经营表现；缺少财务数据时不能推断因果关系。',
              methodSteps: ['识别个人叙事', '补充经营数据', '比较叙事与基本面', '说明数据边界']
            },
            {
              term: 'relative valuation', en: 'Relative valuation', category: 'background', cardType: 'method',
              one: '用可比公司和估值倍数判断相对贵贱。',
              body: '选择可比对象、统一会计口径并比较市盈率和企业价值倍数，同时检查增长和风险差异；结果依赖可比性和盈利周期。',
              methodSteps: ['选择可比对象', '统一会计口径', '比较估值倍数', '检查增长风险']
            },
            {
              term: '相对估值', en: 'Relative valuation', category: 'background', cardType: 'method',
              one: '用可比对象衡量资产是否相对昂贵或便宜。',
              body: '比较市盈率、EV/EBITDA 和市销率，并核对盈利周期与风险差异；估值结果依赖可比性和会计口径。',
              methodSteps: ['选择可比对象', '统一口径', '比较倍数', '检查风险差异']
            },
            {
              term: 'airline revenue management', en: 'Airline revenue management', category: 'background', cardType: 'method',
              one: '航司通过需求预测、舱位控制和动态定价配置收入。',
              body: '预测航线需求，划分票价等级并控制奖励座位库存，再动态调整价格；目标是提高每个航班的收益。',
              methodSteps: ['预测需求', '划分票价等级', '控制奖励库存', '动态调整价格']
            },
            {
              term: 'autonomous laboratory', en: 'Autonomous laboratory', category: 'method', cardType: 'method',
              one: '自主实验室是自动化科研设施。',
              body: '机器人、传感器和模型协同执行实验，属于科研基础设施而非可迁移分析方法。',
              methodSteps: ['连接设备', '执行实验', '采集数据', '人工复核']
            },
            {
              term: 'drug discovery pipeline', en: 'Drug discovery pipeline', category: 'method', cardType: 'method',
              one: '药物研发管线是产业研发流程。',
              body: '从靶点发现到临床开发的项目流程属于生物医药产业组织，不是通用分析程序。',
              methodSteps: ['靶点发现', '候选筛选', '临床前研究', '临床开发']
            },
            {
              term: 'incentive compatibility', en: 'Incentive compatibility', category: 'method', cardType: 'method',
              one: '激励相容是制度设计概念。',
              body: '它说明个体理性选择如何与集体目标一致，属于机制与制度概念，不是可迁移分析程序。',
              methodSteps: ['识别目标', '检查偏离', '调整约束']
            },
            {
              term: 'ad hoc policymaking', en: 'Ad hoc policymaking', category: 'method', cardType: 'method',
              one: '临时决策方式是政策运行特征。',
              body: '它描述缺少长期框架的决策风格，属于政治与制度背景。',
              methodSteps: ['识别目标', '区分临时措施', '评估协调成本']
            },
            {
              term: 'agenda setting', en: 'Agenda setting', category: 'method', cardType: 'method',
              one: '议程设置是政治或媒体主体影响注意力配置的机制。',
              body: '主体通过议题排序和资源分配影响公众关注，属于政治传播机制而非可迁移分析方法。',
              methodSteps: ['识别主体', '列出议题', '观察资源分配', '比较注意力变化']
            }
          ]
        };
      } else if (body.includes('INDUSTRY_BOUNDARY_TEST')) {
        content = {
          quality: true,
          qualityReason: '',
          title: 'Finance and industry boundary fixture',
          deck: 'Industry boundary test',
          level: 'C1',
          topic: 'commodity',
          paragraphs: [{
            en: 'Electrification requires equipment investment, grid and storage investment, and better electricity access.',
            zh: '电气化需要设备投资、电网与储能投资，以及更好的电力可及性。',
            note: '',
            analysis: { english: {}, finance: {} }
          }],
          vocab: [{
            w: 'electrification', ipa: '/ɪˌlektrɪfɪˈkeɪʃən/', pos: 'n.', zh: '电气化',
            en: 'the process of replacing fuel use with electricity',
            forms: [], synonyms: [], exam: ['FINANCE'], ex: '', exZh: ''
          }],
          knowledge: [
            { term: 'electrification', en: 'Electrification', category: 'finance', one: '终端用能转向电力。', body: '交通、供暖和工业设备改为用电，需要电网和储能扩容。' },
            { term: 'equipment investment', en: 'Equipment investment', category: 'finance', one: '购买设备的实体资本支出。', body: '企业采购机器、车辆和生产设备属于实体投资。' },
            { term: 'grid and storage investment', en: 'Grid and storage investment', category: 'finance', one: '电网和储能设施扩容。', body: '输电线路、变压器和储能设施形成能源基础设施。' },
            { term: 'electricity access', en: 'Electricity access', category: 'finance', one: '获得可靠电力的条件。', body: '电力可及性取决于电网延伸、离网系统和可负担资费。' },
            { term: 'avoided fuel import savings', en: 'Avoided fuel import savings', category: 'finance', one: '减少燃料进口形成的节省。', body: '节省来自进口账单下降，而不是金融资产交易。' },
            { term: 'energy import spending as a share of GDP', en: 'Energy import spending as a share of GDP', category: 'finance', one: '能源进口支出占经济规模的比例。', body: '这是外部部门与能源安全的宏观指标。' },
            { term: 'relative price effect', en: 'Relative price effect', category: 'finance', one: '相对价格变化改变选择。', body: '电价和气价对比影响家庭采用热泵的速度。' },
            { term: 'policy-market complementarity', en: 'Policy-market complementarity', category: 'method', one: '政策与市场各自处理不同问题。', body: '公共品、外部性和协调失灵需要政策处理。' },
            { term: 'market signals and incentive structures', en: 'Market signals and incentive structures', category: 'finance', one: '信号和激励影响产业参与。', body: '稳定政策框架和激励结构影响企业投资。' },
            { term: 'payback period', en: 'Payback period', category: 'background', one: '累计净现金流回收初始支出的时间。', body: '回收期是资本预算中的投资评价指标。' },
            { term: 'concessional capital', en: 'Concessional capital', category: 'background', one: '低于市场价格的优惠融资。', body: '优惠贷款和担保降低项目资本成本。' },
            { term: 'value-added tax reduction', en: 'Value-added tax reduction', category: 'finance', one: '下调增值税。', body: '税收优惠降低消费者含税价格和前期资金压力。' },
            { term: 'cost of capital', en: 'Cost of capital', category: 'background', one: '企业融资所需的最低回报。', body: '资本成本由债务成本、股权成本和资本结构共同决定。' },
            { term: 'loan guarantee', en: 'Loan guarantee', category: 'background', one: '第三方承诺在违约时偿还贷款。', body: '担保把部分信用风险转移给担保方并降低借款成本。' },
            { term: 'regulatory framework', en: 'Regulatory framework', category: 'method', one: '规范市场参与者行为的监管制度。', body: '监管框架由法律、规则、监督机构和执法程序组成。' },
            { term: 'business model', en: 'Business model', category: 'method', one: '企业创造和获取价值的经营方式。', body: '商业模式描述客户、产品、渠道、成本和收入来源。' },
            { term: 'DCF', en: 'Discounted cash flow', category: 'finance', one: '把未来现金流折现为企业价值。', body: 'DCF 使用预测现金流、终值和折现率进行估值。' },
            { term: 'cost-benefit analysis', en: 'Cost-benefit analysis', category: 'background', one: '比较项目收益与成本的评估方法。', body: '成本收益分析将未来影响货币化并进行贴现比较。' },
            { term: 'climate model', en: 'Climate model', category: 'method', one: '模拟气候系统响应的科学模型。', body: '气候模型基于物理过程和排放情景预测温度与极端事件。' },
            { term: 'climate scenario analysis', en: 'Climate scenario analysis', category: 'background', one: '比较不同排放与政策情景下的气候风险。', body: '该分析程序设定情景假设，比较结果并评估不确定性。' },
            { term: 'computing power', en: 'Computing power', category: 'method', one: '训练和运行计算任务所需的算力。', body: '算力是 AI 研究与应用的基础设施资源。' },
            { term: 'drug discovery pipeline', en: 'Drug discovery pipeline', category: 'method', one: '从靶点发现到临床开发的研发流程。', body: '药物研发管线属于生物医药产业流程。' },
            { term: 'automated labs', en: 'Automated labs', category: 'method', one: '由自动化设备执行实验的实验室系统。', body: '自动化实验室提高实验吞吐并减少人工操作。' },
            { term: 'autonomous laboratory', en: 'Autonomous laboratory', category: 'method', one: '能够自主规划并执行实验的实验室平台。', body: '自主实验室整合机器人、传感器与算法工具。' },
            { term: 'AI-for-science stack', en: 'AI-for-science stack', category: 'method', one: '用于科学研究的 AI 软件与基础设施组合。', body: '该技术栈包括模型、数据平台和计算工具。' },
            { term: 'research infrastructure', en: 'Research infrastructure', category: 'method', one: '支撑科研活动的设备、数据与计算设施。', body: '科研基础设施是开展研究的技术条件。' },
            { term: 'scenario model', en: 'Scenario model', category: 'method', one: '执行情景模拟的计算模型。', body: '情景模型是情景分析所使用的软件工具。' },
            { term: 'forecasting model', en: 'Forecasting model', category: 'method', one: '生成预测结果的具体模型。', body: '预测模型通常依赖数据和算法实现。' },
            { term: 'risk model', en: 'Risk model', category: 'method', one: '估算风险指标的具体模型工具。', body: '风险模型可以执行压力测试或风险计量。' },
            { term: 'forecasting method', en: 'Forecasting method', category: 'background', one: '形成预测的分析程序。', body: '预测方法规定假设、输入、估计和误差评价。' },
            { term: 'health equity', en: 'Health equity', category: 'finance', one: '消除不公平且可避免的健康差异。', body: '健康公平受社会、经济、政治、法律和医疗可及性影响。' },
            { term: 'health inequality', en: 'Health inequality', category: 'finance', one: '不同群体之间的健康差异。', body: '健康不平等可由收入、教育、地域和公共服务差异形成。' },
            { term: 'health insurance', en: 'Health insurance', category: 'background', one: '为医疗费用提供风险分担的保险合同。', body: '健康保险通过保费、免赔额、共付和赔付安排转移医疗费用风险。' },
            { term: 'equity financing', en: 'Equity financing', category: 'background', one: '通过发行股权筹集资金。', body: '股权融资出售所有权份额，不形成偿还义务。' },
            { term: 'unemployment duration', en: 'Unemployment duration', category: 'finance', one: '失业者持续未就业的时间。', body: '失业持续时间反映劳动力市场匹配效率和失业保险环境。' },
            { term: 'duration of unemployment', en: 'Duration of unemployment', category: 'finance', one: '一段失业状态持续的长度。', body: '该指标用于分析长期失业和求职匹配。' },
            { term: 'long-term unemployment', en: 'Long-term unemployment', category: 'finance', one: '失业持续超过既定期限的人群。', body: '长期失业会带来技能退化和劳动参与率下降。' },
            { term: 'modified duration', en: 'Modified duration', category: 'background', one: '债券价格对利率变化的敏感度。', body: '修正久期衡量收益率变动一个单位时债券价格的百分比变化。' },
            { term: 'bond duration', en: 'Bond duration', category: 'background', one: '固定收益证券的利率敏感性指标。', body: '债券久期同时与到期时间、票息和现金流分布有关。' },
            { term: 'duration gap', en: 'Duration gap', category: 'background', one: '资产与负债久期的差额。', body: '久期缺口用于衡量金融机构的利率风险暴露。' },
            { term: "women's health funding gap", en: "Women's health funding gap", category: 'finance', one: '女性健康研究与医疗服务投入不足的差距。', body: '该缺口涉及研究优先级、公共卫生资源配置和健康公平。' },
            { term: 'health research funding gap', en: 'Health research funding gap', category: 'finance', one: '健康研究资源配置不足。', body: '资金缺口会影响研究覆盖、疾病预防和公共健康干预。' },
            { term: 'medical research funding gap', en: 'Medical research funding gap', category: 'finance', one: '医学研究投入不足。', body: '医学研究资金缺口属于科学与卫生政策问题。' },
            { term: 'corporate financing gap', en: 'Corporate financing gap', category: 'background', one: '企业投资需求与可用融资之间的差额。', body: '企业融资缺口需要通过债务、股权或内部现金弥补。' },
            { term: 'refinancing gap', en: 'Refinancing gap', category: 'background', one: '到期债务与可再融资资金之间的差额。', body: '再融资缺口直接影响企业流动性和违约风险。' },
            { term: 'regulatory risk', en: 'Regulatory risk', category: 'finance', one: '监管规则变化带来的不确定性。', body: '监管变化会影响企业合规成本和经营计划。' },
            { term: 'compliance risk', en: 'Compliance risk', category: 'finance', one: '违反法律、监管或内部规则的风险。', body: '合规风险属于治理和法律环境的一部分。' },
            { term: 'legal risk', en: 'Legal risk', category: 'finance', one: '法律争议或规则不确定性带来的风险。', body: '法律风险来自合同、诉讼和制度变化。' },
            { term: 'operational risk', en: 'Operational risk', category: 'finance', one: '流程、人员和系统故障造成损失的风险。', body: '一般运营风险并不自动构成金融市场风险。' },
            { term: 'market risk', en: 'Market risk', category: 'background', one: '市场价格变化造成金融损失的风险。', body: '市场风险来自利率、汇率、股价和商品价格变化。' },
            { term: 'credit risk', en: 'Credit risk', category: 'background', one: '交易对手违约造成损失的风险。', body: '信用风险影响贷款、债券和衍生品敞口。' },
            { term: 'bank operational risk', en: 'Bank operational risk', category: 'background', one: '银行内部流程、人员或系统失败的风险。', body: '银行操作风险是监管资本框架中的金融风险类别。' },
            { term: 'regulatory capital risk', en: 'Regulatory capital risk', category: 'background', one: '监管资本不足或资本要求变化的风险。', body: '监管资本风险直接影响金融机构的资本充足与融资能力。' },
            { term: 'financial risk management', en: 'Financial risk management', category: 'background', one: '识别、计量和控制金融风险。', body: '金融风险管理覆盖市场、信用、流动性和偿付能力风险。' },
            { term: 'enterprise risk management', en: 'Enterprise risk management', category: 'background', one: '统筹战略、合规、运营与报告风险的管理框架。', body: 'ERM 将风险管理与战略和绩效结合。' },
            { term: 'market correction', en: 'Market correction', category: 'background', cardType: 'phenomenon', one: '股票市场从近期高点明显回撤。', body: '广泛股票指数从近期高点下跌约 10%，反映资产价格、估值和投资者回撤风险。' },
            { term: 'housing market correction', en: 'Housing market correction', category: 'finance', cardType: 'phenomenon', one: '住宅价格从高位回落。', body: '这是房地产供需和住房可负担性的调整，不涉及证券或金融资产定价。' },
            { term: 'circular financing', en: 'Circular financing', category: 'background', cardType: 'mechanism', one: '投资、采购和云承诺在关联企业之间形成资金闭环。', body: '投资方投资客户，客户承诺采购算力；供应商融资和后续再融资依赖同一闭环中的收入与现金流，形成信用暴露和流动性风险。' },
            { term: 'circular accounting entries', en: 'Circular accounting entries', category: 'finance', cardType: 'mechanism', one: '资金在内部账户之间循环记账。', body: '这是会计分录重分类和内部控制流程，没有融资、债权债务或金融资产暴露。' },
            { term: 'capital expenditure versus cash flow', en: 'Capital expenditure versus cash flow', category: 'background', cardType: 'mechanism', one: '资本支出与经营现金流、自由现金流之间的比较。', body: '资本支出扩张挤压经营现金流和自由现金流，扩大融资缺口并降低流动性，最终影响债务与信用风险。' },
            { term: 'capital expenditure', en: 'Capital expenditure', category: 'finance', cardType: 'concept', one: '取得或改良长期资产的支出。', body: '企业采购设备、建设厂房和基础设施，属于实体资本形成。' },
            { term: 'purchasing power', en: 'Purchasing Power', category: 'background', cardType: 'concept', one: '购买力衡量一单位货币能买到的实际商品与服务。', body: '购买力受名义工资、物价、税收和补贴共同影响；通胀高于名义工资增速时，实际购买力下降。' }
          ]
        };
      } else if (body.includes('MODEL_METHOD_BOUNDARY_TEST')) {
        content = {
          quality: true,
          qualityReason: '',
          title: 'Analytical model boundary fixture',
          deck: 'Model versus method boundary test',
          level: 'C1',
          topic: 'markets',
          paragraphs: [{
            en: 'Scenario, forecasting and risk models can support financial decisions when their assumptions and outputs are documented.',
            zh: '情景、预测和风险模型只有在假设与输出得到说明时，才能支持金融决策。',
            note: '',
            analysis: { english: {}, finance: {} }
          }],
          vocab: [{
            w: 'scenario', ipa: '/səˈnɑːriəʊ/', pos: 'n.', zh: '情景',
            en: 'a possible sequence of future events',
            forms: [], synonyms: [], exam: ['FINANCE'], ex: '', exZh: ''
          }],
          knowledge: [
            {
              term: 'scenario model', en: 'Scenario model', category: 'background',
              one: '比较政策与市场情景下金融结果的分析模型。',
              body: '模型先设定增长、利率和政策路径假设，再读取宏观输入，通过资产负债表与传导方程计算各情景下的资本充足率，并将结果用于风险限额判断。',
              methodSteps: ['设定情景假设与政策路径', '读取宏观和资产负债表输入', '按传导方程计算各情景结果', '比较资本充足率并解释不确定性边界']
            },
            {
              term: 'forecasting model', en: 'Forecasting model', category: 'background',
              one: '从历史数据生成通胀预测并评价误差的分析程序。',
              body: '模型以滞后通胀、工资和利率为输入，使用时间序列估计参数，输出未来通胀路径与置信区间，并按样本外误差和适用条件解释预测可靠性。',
              methodSteps: ['选择变量与样本', '估计时间序列参数', '生成预测和置信区间', '用样本外误差评价模型边界']
            },
            {
              term: 'risk model', en: 'Risk model', category: 'background',
              one: '把风险因子与损失分布连接起来的风险计量程序。',
              body: '模型以风险暴露、波动率和相关性为输入，通过历史模拟或蒙特卡洛方法生成损失分布，输出 VaR 和预期损失，并用于限额与资本决策；同时列明分布假设和失效条件。',
              methodSteps: ['读取风险暴露与市场因子', '设定波动率和相关性假设', '模拟损益分布', '输出 VaR 与预期损失并校验边界']
            },
            {
              term: 'model', en: 'Model', category: 'method',
              one: '一个模型。',
              body: '这是一个模型，用于生成结果。',
              methodSteps: []
            },
            {
              term: 'scenario simulation platform', en: 'Scenario simulation platform', category: 'method',
              one: '运行情景模拟任务的软件平台。',
              body: '该平台提供计算资源、任务调度和结果存储，不包含分析假设或推断规则。',
              methodSteps: []
            }
          ]
        };
      } else if (body.includes('AI_MECHANISM_BOUNDARY_TEST')) {
        content = {
          quality: true,
          qualityReason: '',
          title: 'AI and financial mechanism boundary fixture',
          deck: 'AI tools, market repricing and financing mechanisms',
          level: 'C1',
          topic: 'markets',
          paragraphs: [{
            en: 'AI agents can execute tasks, while a turn in AI sentiment can reprice financial assets and acquisition financing can transmit risk.',
            zh: 'AI agents 可以执行任务，AI 情绪逆转可以重定价金融资产，收购融资会传导风险。',
            note: '',
            analysis: { english: {}, finance: {} }
          }],
          vocab: [{
            w: 'repricing', ipa: '/ˌriːˈpraɪsɪŋ/', pos: 'n.', zh: '重新定价',
            en: 'a change in the price or valuation of an asset',
            forms: [], synonyms: [], exam: ['FINANCE'], ex: '', exZh: ''
          }],
          knowledge: [
            {
              term: 'AI agents', en: 'AI agents', category: 'method', cardType: 'concept',
              one: '能够感知输入并执行任务的自主软件系统。',
              body: 'AI agents 组合语言模型、工具调用、记忆和执行环境，是技术系统而非可重复的分析方法。',
              methodSteps: []
            },
            {
              term: 'agentic workflow', en: 'Agentic workflow', category: 'method', cardType: 'concept',
              one: '由自主代理编排工具和任务的执行流程。',
              body: '该工作流规定代理如何调用工具、检查结果并继续执行，属于技术流程。',
              methodSteps: ['接收任务', '调用工具', '检查结果']
            },
            {
              term: 'multi-agent system', en: 'Multi-agent system', category: 'method', cardType: 'concept',
              one: '多个软件代理协作完成任务的系统。',
              body: '系统由代理、消息传递和协调机制组成，属于软件基础设施。',
              methodSteps: []
            },
            {
              term: 'AI trade repricing', en: 'AI trade repricing', category: 'method', cardType: 'phenomenon',
              one: 'AI 技术、竞争或市场情绪变化引发 AI 主题资产估值重定价。',
              body: '外部 AI 进展改变投资者对增长、资本开支和估值的预期，进而引发 AI 相关股票、仓位和风险溢价的重新定价。',
              methodSteps: []
            },
            {
              term: 'agent-based modeling', en: 'Agent-based modeling', category: 'background', cardType: 'method',
              one: '通过定义主体行为与交互规则模拟系统结果的分析程序。',
              body: '模型设定异质主体、行为规则、网络环境和随机扰动，运行迭代模拟，输出系统性结果，并用情景比较和敏感性分析验证边界。',
              methodSteps: ['定义主体、状态和行为规则', '设定交互网络与初始条件', '迭代运行模拟', '比较输出并校验边界']
            },
            {
              term: 'multi-agent simulation', en: 'Multi-agent simulation', category: 'background', cardType: 'method',
              one: '用多个交互代理执行情景模拟的分析方法。',
              body: '模拟以代理参数、交互规则和政策情景为输入，通过多轮迭代生成分布结果，并依据输出评价系统稳定性和适用条件。',
              methodSteps: ['设定代理参数与交互规则', '输入政策情景', '迭代模拟并记录状态', '评估分布结果和适用边界']
            },
            {
              term: 'multi-agent simulation platform', en: 'Multi-agent simulation platform', category: 'method', cardType: 'concept',
              one: '运行多代理模拟任务的软件平台。',
              body: '平台提供任务调度、计算资源和结果存储，不定义分析假设或推断规则。',
              methodSteps: []
            },
            {
              term: 'insurance premium financing acquisition', en: 'Insurance premium financing acquisition', category: 'method', cardType: 'mechanism',
              one: '通过债务融资收购保费融资机构的交易。',
              body: '收购方以债务支付股权对价，再用目标公司的保费融资利息收入覆盖债务成本；估值模型用于测算退出回报，但主体仍是融资收购机制。',
              methodSteps: ['确定收购对价与资金来源', '安排债务和担保结构', '以目标现金流覆盖融资成本']
            },
            {
              term: 'acquisition financing', en: 'Acquisition financing', category: 'method', cardType: 'mechanism',
              one: '为收购交易安排债务、股权或混合融资。',
              body: '融资结构决定收购方现金流、杠杆和风险分担；风险管理和估值分析用于交易判断，但不能把融资活动本身改归分析方法。',
              methodSteps: ['确定交易资金需求', '安排债务与股权结构', '评估偿债来源和风险分担']
            },
            {
              term: '保费资金融资收购', en: 'Premium financing acquisition', category: 'method', cardType: 'mechanism',
              one: '围绕保险保费融资业务开展的收购与融资安排。',
              body: '收购方安排债务资金取得目标公司权益，并以保费融资业务的现金流偿付融资成本；该过程说明传导机制，但交易本身不是分析方法。',
              methodSteps: ['确定收购对价', '安排债务融资', '评估目标现金流覆盖']
            },
            {
              term: '限制高消费', en: 'Restriction on high consumption', category: 'finance', cardType: 'mechanism',
              one: '人民法院对未履行给付义务的被执行人采取的消费限制措施。',
              body: '该措施限制飞机、列车软卧、星级酒店、不动产等非生活或经营必需消费，属于民事执行程序。',
              methodSteps: []
            },
            {
              term: '失信被执行人', en: 'Dishonest judgment debtor', category: 'finance', cardType: 'concept',
              one: '法院依法纳入失信名单并实施信用惩戒的被执行人。',
              body: '该身份来自执行程序中的法定失信情形，不是金融工具或金融机构。',
              methodSteps: []
            },
            {
              term: '可执行资产', en: 'Executable assets', category: 'finance', cardType: 'concept',
              one: '可依法采取执行措施的被执行人财产。',
              body: '正文应更严谨地使用可供执行财产或被执行人财产；可执行性属于司法执行状态。',
              methodSteps: []
            },
            {
              term: '可供执行财产', en: 'Available enforcement property', category: 'finance', cardType: 'concept',
              one: '权属清晰且依法可以控制的被执行人财产。',
              body: '法院对可供执行财产采取查封、扣押、冻结、拍卖和变卖措施。',
              methodSteps: []
            },
            {
              term: '资产回收', en: 'Asset recovery', category: 'finance', cardType: 'mechanism',
              one: '通过处置财产或追偿实现资产回收。',
              body: '在司法执行语境中，资产回收依赖查封、拍卖和分配；在不良资产语境中则属于金融清收。',
              methodSteps: ['查明财产', '处置财产', '实现债权']
            },
            {
              term: '不良资产回收', en: 'Non-performing asset recovery', category: 'background', cardType: 'mechanism',
              one: '通过清收、处置和重组回收不良资产价值。',
              body: '银行以现金清收、抵押物处置和债务重组回收不良贷款，并计算回收率和损失。',
              methodSteps: ['识别不良资产', '执行清收或处置', '回收现金并计算损失']
            },
            {
              term: 'recovery rate', en: 'Recovery rate', category: 'background', cardType: 'concept',
              one: '违约后能够回收的金额占暴露金额的比例。',
              body: '回收率用于信用风险计量，并与违约损失率共同反映损失程度。',
              methodSteps: []
            }
          ]
        };
      } else if (body.includes('CONSUMER_BIOMED_BOUNDARY_TEST')) {
        content = {
          quality: true,
          qualityReason: '',
          title: 'Consumer and biomedical boundary fixture',
          deck: 'Consumer trends, business roles and drug classes',
          level: 'C1',
          topic: 'corporate',
          paragraphs: [{
            en: 'Electrolyte hydration trends, category disruption, GLP-1 receptor agonists, CEOs and beverage category expansion are transforming consumer markets.',
            zh: '电解质补水趋势、品类颠覆、GLP-1 受体激动剂、首席执行官和饮料品类扩张正在改变消费市场。',
            note: '',
            analysis: { english: {}, finance: {} }
          }],
          vocab: [{
            w: 'hydration', ipa: '/haɪˈdreɪʃ(ə)n/', pos: 'n.', zh: '补水',
            en: 'the process of supplying water to the body',
            forms: [], synonyms: [], exam: ['IELTS'], ex: '', exZh: ''
          }],
          knowledge: [
            {
              term: '电解质补水趋势', en: 'Electrolyte hydration trend', category: 'finance', cardType: 'phenomenon',
              one: '消费者对含电解质补水产品需求上升的消费趋势。',
              body: '饮料品牌通过运动补水、日常补水和功能性配方扩展产品线，属于消费品与消费文化背景。',
              methodSteps: []
            },
            {
              term: '品类颠覆', en: 'Category disruption', category: 'finance', cardType: 'phenomenon',
              one: '新品牌或新产品形态改变既有商品品类竞争格局。',
              body: '新进入者通过配方、定位和渠道改变消费者选择，属于产业组织与企业战略背景。',
              methodSteps: []
            },
            {
              term: 'GLP-1 receptor agonist', en: 'GLP-1 receptor agonist', category: 'finance', cardType: 'concept',
              one: '作用于 GLP-1 受体的一类代谢与糖尿病药物。',
              body: '该药物类别涉及受体机制、临床适应症和减重效果，属于医药与生物科技背景。',
              methodSteps: []
            },
            {
              term: '首席执行官', en: 'Chief executive officer', category: 'finance', cardType: 'concept',
              one: '负责企业整体经营管理和战略执行的高级管理人员。',
              body: '首席执行官属于公司治理和管理角色，不是金融工具或金融指标。',
              methodSteps: []
            },
            {
              term: '补水需求', en: 'Hydration demand', category: 'finance', cardType: 'concept',
              one: '消费者对补水产品的需求。',
              body: '补水需求受运动、健康意识和气候等因素影响，属于消费需求背景。',
              methodSteps: []
            },
            {
              term: '饮料品类扩张', en: 'Beverage category expansion', category: 'finance', cardType: 'mechanism',
              one: '饮料企业进入或扩展新的产品品类。',
              body: '企业从碳酸饮料扩展到功能饮料、电解质饮料和健康饮品，属于消费品产业与企业经营。',
              methodSteps: []
            },
            {
              term: 'market segmentation', en: 'Market segmentation', category: 'finance', cardType: 'concept',
              one: '按人群、场景和需求划分市场。',
              body: '品牌用不同产品定位覆盖运动补水和日常补水等细分市场，属于营销与经营策略。',
              methodSteps: []
            },
            {
              term: 'Product differentiation', en: 'Product differentiation', category: 'finance', cardType: 'concept',
              one: '通过配方、成分和定位区分产品。',
              body: '产品差异化降低直接价格竞争，属于产品与品牌策略。',
              methodSteps: []
            },
            {
              term: '品牌资产', en: 'Brand equity', category: 'finance', cardType: 'concept',
              one: '品牌带来的认知、忠诚和定价能力。',
              body: '品牌资产通过消费者认知和渠道谈判体现，属于营销与无形资产。',
              methodSteps: []
            },
            {
              term: '品牌相关性', en: 'Brand relevance', category: 'finance', cardType: 'concept',
              one: '品牌在消费者购买决策中仍有意义的程度。',
              body: '品牌相关性下降会影响需求和定价能力，属于营销概念。',
              methodSteps: []
            },
            {
              term: '复购买家率', en: 'Repeat buyer rate', category: 'finance', cardType: 'concept',
              one: '一定时间内重复购买产品的买家占比。',
              body: '复购买家率用于衡量消费者留存和产品吸引力，属于商业经营指标。',
              methodSteps: []
            },
            {
              term: 'Consumer staples growth strategy', en: 'Consumer staples growth strategy', category: 'finance', cardType: 'mechanism',
              one: '消费品公司通过新品类和渠道寻找增长。',
              body: '成熟公司利用品牌和分销进入高增长细分品类，属于企业经营战略。',
              methodSteps: ['识别增长品类', '评估品牌渠道协同', '跟踪份额和利润率']
            },
            {
              term: 'Strategic acquisition', en: 'Strategic acquisition', category: 'background', cardType: 'concept',
              one: '产业买方为协同效应收购公司。',
              body: '战略收购通过支付对价取得控制权并整合渠道、品牌或供应链，属于并购交易。',
              methodSteps: []
            },
            {
              term: 'Self-funding (bootstrapping)', en: 'Self-funding / bootstrapping', category: 'background', cardType: 'concept',
              one: '创始人使用自有资金和经营现金流支持企业。',
              body: '自筹资金不引入外部股权，涉及资金来源、控制权和融资约束。',
              methodSteps: []
            },
            {
              term: 'fragrance layering trend', en: 'Fragrance layering trend', category: 'finance', cardType: 'phenomenon',
              one: '消费者叠加使用不同香氛产品的消费趋势。',
              body: '消费者通过叠喷香水、身体喷雾和香氛护理形成个性化气味，属于消费文化与产品趋势。',
              methodSteps: []
            },
            {
              term: 'microbiome skin care', en: 'Microbiome skin care', category: 'finance', cardType: 'concept',
              one: '围绕皮肤微生物群开发的护肤产品类别。',
              body: '该品类涉及皮肤菌群、配方和临床测试，属于生物科技与消费品背景。',
              methodSteps: []
            },
            {
              term: 'securitisation tranche', en: 'Securitisation tranche', category: 'background', cardType: 'concept',
              one: '资产证券化产品中按偿付顺序和风险划分的份额。',
              body: '不同 tranche 承担不同优先级、损失分配和信用风险，属于结构性融资工具。',
              methodSteps: []
            }
          ]
        };
      } else if (body.includes('结构化精读语料')) {
        content = {
          quality: true,
          qualityReason: '',
          title: 'Raw article needing annotation',
          deck: 'Annotated fallback fixture.',
          level: 'C1',
          topic: 'markets',
          paragraphs: [{
            en: 'A sufficiently long finance paragraph explains inflation, liquidity, and interest rates for investors.',
            zh: '投资者关注通胀、流动性与利率。',
            note: '',
            analysis: {
              english: {
                longSentence: 'The investor&#x27;s duration decision shapes the result.',
                grammar: '',
                expression: 'Price &amp; liquidity'
              },
              finance: { term: 'liquidity', background: 'Market liquidity conditions.', relevance: 'Bond pricing.' }
            }
          }],
          vocab: [{
            w: 'liquidity', ipa: '/lɪˈkwɪdəti/', pos: 'n.', zh: '流动性',
            en: 'the ability to trade quickly without a large price change',
            forms: [], synonyms: [], exam: ['FINANCE'],
            ex: 'It&amp;#x27;s easier to trade when liquidity &amp; depth are strong.',
            exZh: '流动性和深度充足时交易更容易。'
          }],
          knowledge: [{
            term: 'market liquidity', en: 'Market liquidity', category: 'finance',
            one: 'The market&#x27;s ability to absorb orders without a large price move.',
            body: '流动性影响交易成本和价格冲击。',
            cases: '', methodSteps: [], related: [], match: ['liquidity']
          }]
        };
      } else if (body.includes('扩展下面这张知识卡')) {
        content = {
          cardType: 'phenomenon',
          classificationReason: '期限溢价上升是市场现象，需要通过发行供给、久期承接和风险补偿来解释。',
          detail: '财政供给增加会提高投资者承接久期的要求，并可能推高期限溢价。',
          mechanism: '政府增加长期债券发行后，市场需要更高的期限补偿来吸收新增久期供给，并通过收益率曲线影响融资成本。',
          examples: ['政府扩大长期债券发行时，市场需要更高补偿吸收供给。'],
          scenarios: ['财政赤字扩大且长期国债发行集中增加', '通胀不确定性上升、投资者要求更高风险补偿'],
          indicators: [{
            name: '期限溢价',
            meaning: '投资者持有长期债券相对短端利率要求的额外补偿。',
            importance: '用于判断长期融资成本、期限结构与市场风险偏好。'
          }],
          sources: [{
            title: 'IMF Fiscal Monitor',
            author: 'International Monetary Fund',
            description: '讨论财政政策、公共债务与金融市场条件之间的关系。',
            url: 'https://www.imf.org/en/Publications/FM',
            kind: 'official',
            publisher: 'International Monetary Fund',
            date: '2025-04-01',
            verified: true
          }, {
            title: 'Model invented source',
            author: 'Unknown',
            description: 'This URL must not survive source normalization.',
            url: 'https://example.invalid/invented',
            kind: 'news'
          }],
          caseStudies: [{
            title: '长期国债供给上升与期限溢价',
            date: '2023-10-01',
            location: 'United States',
            description: '财政部扩大长期国债发行，市场对新增久期供给的承接能力下降。',
            mechanism: '投资者需要更高期限溢价承接新增久期供给。',
            impact: '长期融资成本上升，并对估值形成压力。',
            sourceTitle: 'Reuters market coverage'
          }],
          methodSteps: ['识别财政供给变化', '评估投资者久期承接能力', '观察期限溢价反应'],
          authorityKey: 'imf',
          caution: '期限溢价还受通胀预期、政策路径和全球避险需求影响。'
        };
      } else {
        content = {
          answer: '财政供给扩大可能提高期限溢价，但还要结合货币政策和避险需求判断。',
          originalEvidence: [{ quote: 'Bond investors are demanding a larger term premium.', interpretation: '原文直接指出投资者要求更高期限补偿。' }],
          knowledgeBasis: ['财政供给与久期承接能力会影响长期债券定价。'],
          authorityBasis: [{ source: 'IMF', description: '提供全球财政与金融稳定背景。', url: 'https://www.imf.org/' }],
          caution: '不能仅凭单一因素推断未来收益率。'
        };
      }
      const send = () => {
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }));
      };
      if (body.includes('结构化精读语料')) setTimeout(send, 700);
      else send();
    });
    return;
  }
  if (request.url.startsWith('/research/gdelt')) {
    response.writeHead(200, { 'content-type': 'application/json' });
    return response.end(JSON.stringify({
      articles: [{
        title: 'Treasury supply tests demand for long-dated debt',
        url: 'https://www.reuters.com/markets/rates-bonds/treasury-supply-test-2025-10-30/',
        seendate: '20251030T120000Z',
        domain: 'reuters.com',
        language: 'English',
        sourcecountry: 'United States'
      }]
    }));
  }
  if (request.url.startsWith('/research/crossref')) {
    response.writeHead(200, { 'content-type': 'application/json' });
    return response.end(JSON.stringify({
      message: {
        items: [{
          title: ['Term premia and fiscal supply: evidence from sovereign bond markets'],
          author: [{ family: 'Example' }],
          published: { 'date-parts': [[2024, 5, 1]] },
          URL: 'https://doi.org/10.1234/finlens.test',
          'container-title': ['Journal of Financial Economics'],
          type: 'journal-article'
        }]
      }
    }));
  }
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  if (request.url === '/wechat' || request.url === '/wechat-retry') {
    return response.end(`<!doctype html><html><head><title>WeChat fixture</title></head><body>
      <div id="js_content">
        <p>The government&amp;#x27;s new fiscal plan surprised investors and changed expectations for long-term interest rates.</p>
        <p>Subscribe to our newsletter and follow us for more market updates.</p>
        <p>Image source: Getty Images</p>
        <p>Bond investors are demanding a larger term premium as fiscal supply and inflation uncertainty increase.</p>
        <p>免责声明：本文不构成任何投资建议，版权归原作者所有。</p>
      </div></body></html>`);
  }
  if (request.url === '/share') {
    return response.end(`<!doctype html><html><head><title>Share control fixture</title></head><body><article>
      <p>For release at 2:00 p.m. EDT Share The Federal Open Market Committee approved the following statement for release by a 10 - 2 vote.</p>
      <p>The Committee decided to maintain the target range for the federal funds rate in support of its dual mandate and said it would monitor incoming data carefully.</p>
      <p>Economic activity is expanding at a strong pace while inflation remains elevated and the labour market continues to change gradually.</p>
    </article></body></html>`);
  }
  if (request.url === '/boilerplate') {
    return response.end(`<!doctype html><html><head><title>Boilerplate cleanup fixture</title></head><body><article>
      <p>Investors who subscribe to the view that inflation will remain persistent are demanding higher compensation for holding long-dated debt.</p>
      <p>The Federal Reserve kept policy restrictive while officials assessed whether slower wage growth and tighter credit conditions would bring inflation back toward target. Got a confidential news tip? We want to hear from you. Get this delivered to your inbox, and more info about our products and services. Data is a real-time snapshot *Data is delayed at least 15 minutes. Global Business and Financial News, Stock Quotes, and Market Data and Analysis.</p>
      <aside class="market-data">Download our app for real-time quotes and breaking news.</aside>
    </article></body></html>`);
  }
  if (request.url === '/cnbc-newsletter') {
    return response.end(`<!doctype html><html><head><title>WNBA Finals MVP Gabby Williams</title></head><body><article>
      <p>Sign up today for the CNBC Sport Newsletter</p>
      <p>First-chunk quality marker. Golden State Valkyries star Gabby Williams doesn't expect the political and cultural issues swirling around the WNBA to go away anytime soon.</p>
      <p>Fresh off the Valkyries' first championship and winning the Finals MVP award, Williams spoke with CNBC about the league's place in those conversations and its broader social role.</p>
      <p>Williams said that she and many fellow athletes understand that playing professional basketball has brought them a larger platform and a responsibility to speak about public issues.</p>
      <p>She pointed to players' past involvement in political and social causes and said she expects athletes to continue using their visibility to address issues that matter to their communities.</p>
      <p>Williams also described how the Valkyries' home arena helped her feel welcome and gave her the confidence to perform during her first season with the team.</p>
    </article></body></html>`);
  }
  if (request.url === '/wechat-rich') {
    return response.end(`<!doctype html><html><head><title>微信公众号英文文章</title></head><body>
      <div id="js_content">
        <p>欢迎阅读本期财经英语精读，点击蓝字关注公众号并设为星标。</p>
        <p>推荐阅读：如何快速提高英语听力 | 免责声明：本文不构成投资建议。</p>
        <section>The Federal Open Market Committee said inflation remains elevated and that future decisions will depend on incoming employment and price data.</section>
        <section><span>Bond investors demanded a larger term premium as fiscal supply increased and uncertainty around the policy path remained elevated.</span></section>
        <p>广告合作请联系后台，阅读原文查看更多课程。</p>
      </div>
    </body></html>`);
  }
  response.end(`<!doctype html><html><head><title>Too short</title></head><body><article>
    <p>A short note about markets without enough substantive content for a study article.</p>
  </article></body></html>`);
});
await new Promise(resolve => contentServer.listen(CONTENT_PORT, '127.0.0.1', resolve));
try {
  server = spawn(process.execPath, ['server/server.mjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(APP_PORT),
      GDELT_API_BASE: CONTENT + '/research/gdelt',
      CROSSREF_API_BASE: CONTENT + '/research/crossref',
      FINLENS_BACKUP_DIR: path.resolve('data/backups/feedback-v2-tests')
    },
    stdio: 'ignore'
  });
  await waitForServer();
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1512, height: 950 } })).newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' &&
        !message.text().includes('502 (Bad Gateway)') &&
        !message.text().includes('400 (Bad Request)')) errors.push(message.text());
  });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(payload => {
    const articles = payload.articles;
    const state = JSON.parse(localStorage.getItem('finlens.v1') || '{}');
    state.custom = articles;
    state.read = {};
    state.words = {};
    state.marks = {};
    state.summaries = {};
    state.tutor = {};
    state.dictionaries = {};
    state.settings = {
      ...(state.settings || {}),
      mode: 'intensive', zh: 'off', vocab: true, know: true,
      readingDefaultsVersion: 2, articleSort: 'date-desc', sideOpen: true,
      baseUrl: payload.baseUrl, apiKey: 'feedback-v2-key', model: 'feedback-v2-model'
    };
    state.lastArticle = articles[0].id;
    localStorage.setItem('finlens.v1', JSON.stringify(state));
  }, { articles: seedArticles, baseUrl: CONTENT + '/v1' });
  await page.reload({ waitUntil: 'networkidle' });
  const backupProbe = await page.evaluate(async () => {
    const response = await fetch('/api/backup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ settings: {}, words: {}, custom: [], probe: 'feedback-v2' })
    });
    return response.json();
  });
  check('Feedback tests keep backups outside user backup files',
    backupProbe.ok && /^data\/backups\/feedback-v2-tests\//.test(backupProbe.path || ''),
    JSON.stringify(backupProbe));

  const wechatResult = await page.evaluate(async url => {
    const response = await fetch('/api/fetch?url=' + encodeURIComponent(url));
    return { status: response.status, body: await response.json() };
  }, CONTENT + '/wechat');
  const wechatText = JSON.stringify(wechatResult.body);
  check('WeChat extraction removes subscription and image-caption noise',
    wechatResult.body.ok &&
    wechatResult.body.kind === 'wechat' &&
    wechatResult.body.paragraphs.length === 2 &&
    !/Subscribe|Image source|免责声明|版权归/.test(wechatText),
    wechatText.slice(0, 220));
  check('WeChat extraction decodes numeric HTML entities before learning',
    wechatResult.body.ok &&
    wechatText.includes("government's") &&
    !wechatText.includes('&#x27;') &&
    !wechatText.includes('&amp;'),
    wechatText.slice(0, 160));
  const richWechatResult = await page.evaluate(async url => {
    const response = await fetch('/api/fetch?url=' + encodeURIComponent(url));
    return { status: response.status, body: await response.json() };
  }, CONTENT + '/wechat-rich');
  const richWechatText = JSON.stringify(richWechatResult.body);
  check('WeChat extraction selects English article blocks and rejects Chinese boilerplate',
    richWechatResult.body.ok &&
    richWechatResult.body.paragraphs.length === 2 &&
    richWechatResult.body.paragraphs.every(paragraph => /[A-Za-z]/.test(paragraph)) &&
    !/欢迎阅读|推荐阅读|点击蓝字|广告合作|阅读原文/.test(richWechatText),
    richWechatText.slice(0, 300));
  const shortResult = await page.evaluate(async url => {
    const response = await fetch('/api/fetch?url=' + encodeURIComponent(url));
    return { status: response.status, body: await response.json() };
  }, CONTENT + '/short');
  check('Obviously low-quality short articles are rejected before learning',
    !shortResult.body.ok && /正文|内容|过短/.test(shortResult.body.error || ''),
    `${shortResult.status}: ${shortResult.body.error}`);
  await page.locator('#btnImport').click();
  await page.locator('#importModal').waitFor({ state: 'visible' });
  const singleParagraph = 'A single pasted paragraph mentions markets and inflation but does not contain enough structure or substance to become a study article.';
  await page.evaluate(value => {
    const input = document.querySelector('#importText');
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, singleParagraph);
  await page.locator('#btnImportText').click();
  check('Pasted one-paragraph content is rejected before entering the learning library',
    (await page.locator('#textImportStatus').innerText()).includes('正文有效内容不足'),
    await page.locator('#textImportStatus').innerText());
  await page.locator('#importModal .modal-head [data-close]').click();
  const qualityCheck = await page.evaluate(async ({ baseUrl }) => {
    const response = await fetch('/api/annotate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'INCOHERENT_QUALITY_TEST',
        paragraphs: [
          'INCOHERENT_QUALITY_TEST first unrelated fragment with several words.',
          'A second unrelated fragment with no shared topic or article structure.'
        ],
        baseUrl,
        apiKey: 'feedback-v2-key',
        model: 'feedback-v2-model'
      })
    });
    const text = await response.text();
    let body = {};
    try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 200) }; }
    return { status: response.status, body };
  }, { baseUrl: CONTENT + '/v1' });
  check('AI quality gate rejects incoherent articles before annotation output',
    qualityCheck.status === 400 && /连贯|完整文章|质量/.test(qualityCheck.body.error || ''),
    `${qualityCheck.status}: ${qualityCheck.body.error}`);
  const incompleteCheck = await page.evaluate(async ({ baseUrl }) => {
    const response = await fetch('/api/annotate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'EMPTY_ANNOTATION_TEST',
        paragraphs: [
          'The bond market remained calm while investors waited for new economic data.',
          'Traders monitored inflation expectations and the next central-bank guidance.'
        ],
        baseUrl,
        apiKey: 'feedback-v2-key',
        model: 'feedback-v2-model'
      })
    });
    return { status: response.status, body: await response.json() };
  }, { baseUrl: CONTENT + '/v1' });
  check('Incomplete annotation output is rejected instead of saving empty cards',
    incompleteCheck.status === 400 &&
    /词汇|知识卡/.test(incompleteCheck.body.error || ''),
    `${incompleteCheck.status}: ${incompleteCheck.body.error}`);
  const qualityFalseCheck = await page.evaluate(async ({ baseUrl }) => {
    const response = await fetch('/api/annotate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'QUALITY_FALSE_ACCEPT_TEST',
        paragraphs: [
          'The central bank kept its policy rate unchanged and said inflation risks still required careful monitoring.',
          'Policymakers also reviewed employment conditions and the pace of credit growth before announcing their next decision.'
        ],
        baseUrl,
        apiKey: 'feedback-v2-key',
        model: 'feedback-v2-model',
        vocabFocus: 'finance'
      })
    });
    const text = await response.text();
    let body = {};
    try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 200) }; }
    return { status: response.status, body };
  }, { baseUrl: CONTENT + '/v1' });
  check('Contradictory model quality flag does not discard complete annotations',
    qualityFalseCheck.status === 200 &&
    qualityFalseCheck.body.article?.vocab?.length > 0 &&
    qualityFalseCheck.body.article?.knowledge?.length > 0,
    `${qualityFalseCheck.status}: vocab=${qualityFalseCheck.body.article?.vocab?.length || 0}, knowledge=${qualityFalseCheck.body.article?.knowledge?.length || 0}`);
  check('Knowledge annotation prompt requests card type, scenarios and observable indicators',
    lastModelBody.includes('cardType') &&
    lastModelBody.includes('scenarios') &&
    lastModelBody.includes('indicators') &&
    lastModelBody.includes('concept|phenomenon|mechanism|method') &&
    lastModelBody.includes('electrification') &&
    lastModelBody.includes('equipment investment') &&
    lastModelBody.includes('business model') &&
    lastModelBody.includes('health equity') &&
    lastModelBody.includes('unemployment duration') &&
    lastModelBody.includes("women's health funding gap") &&
    lastModelBody.includes('regulatory risk') &&
    lastModelBody.includes('enterprise risk management') &&
    lastModelBody.includes('computing power') &&
    lastModelBody.includes('autonomous laboratory') &&
    lastModelBody.includes('scenario model') &&
    lastModelBody.includes('完整分析链') &&
    lastModelBody.includes('AI agents') &&
    lastModelBody.includes('AI trade repricing') &&
    lastModelBody.includes('机制本身不等于分析方法') &&
    lastModelBody.includes('可执行资产') &&
    lastModelBody.includes('资产回收') &&
    lastModelBody.includes('recovery rate') &&
    lastModelBody.includes('电解质补水趋势') &&
    lastModelBody.includes('品类颠覆') &&
    lastModelBody.includes('GLP-1 receptor agonist') &&
    lastModelBody.includes('首席执行官') &&
    lastModelBody.includes('品牌资产') &&
    lastModelBody.includes('复购买家率') &&
    lastModelBody.includes('谈判筹码') &&
    lastModelBody.includes('negotiating leverage') &&
    lastModelBody.includes('婚姻财产与共同控制股权配对规则') &&
    lastModelBody.includes('divorce asset division') &&
    lastModelBody.includes('jointly controlled equity stake') &&
    lastModelBody.includes('geopolitical risk premium') &&
    lastModelBody.includes('外部条件型风险溢价') &&
    lastModelBody.includes('equity risk premium') &&
    lastModelBody.includes('相对估值') &&
    lastModelBody.includes('金融 + 方法交叉') &&
    lastModelBody.includes('seasonal adjustment') &&
    lastModelBody.includes('data surprise analysis') &&
    lastModelBody.includes('正面金融本体证据') &&
    lastModelBody.includes('默认归 background') &&
    lastModelBody.includes('案例字段（cases）规则') &&
    lastModelBody.includes('无法核验时宁可留空') &&
    lastModelBody.includes('假设') &&
    lastModelBody.includes('示例计算') &&
    lastModelBody.includes('百分点') &&
    lastModelBody.includes('案例不参与 category 判断'));
  const categoryCheck = await page.evaluate(async ({ baseUrl }) => {
    const response = await fetch('/api/annotate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'CATEGORY_BOUNDARY_TEST',
        paragraphs: [
          'Political risk and geopolitical risk can affect credit spreads, while stress testing helps assess financial stability.',
          'A political risk premium is a priced component of financial asset returns.'
        ],
        baseUrl,
        apiKey: 'feedback-v2-key',
        model: 'feedback-v2-model',
        vocabFocus: 'finance'
      })
    });
    return { status: response.status, body: await response.json() };
  }, { baseUrl: CONTENT + '/v1' });
  const categoryCards = categoryCheck.body.article?.knowledge || [];
  const categoryByTerm = Object.fromEntries(categoryCards.map(card => [card.term, {
    category: card.category,
    categories: card.categories,
    reason: card.categoryReason,
    confidence: card.categoryConfidence
  }]));
  check('Knowledge categories override model mistakes using professional boundaries',
    categoryCheck.status === 200 &&
    categoryByTerm['political risk']?.category === 'background' &&
    categoryByTerm['geopolitical risk']?.category === 'background' &&
    categoryByTerm['bargaining power']?.category === 'background' &&
    JSON.stringify(categoryByTerm['bargaining power']?.categories) === JSON.stringify(['background']) &&
    categoryByTerm['negotiating leverage']?.category === 'background' &&
    JSON.stringify(categoryByTerm['negotiating leverage']?.categories) === JSON.stringify(['background']) &&
    categoryByTerm['financial leverage']?.category === 'finance' &&
    JSON.stringify(categoryByTerm['financial leverage']?.categories) === JSON.stringify(['finance']) &&
    categoryByTerm['geopolitical risk premium']?.category === 'finance' &&
    JSON.stringify(categoryByTerm['geopolitical risk premium']?.categories) === JSON.stringify(['finance', 'background']) &&
    categoryByTerm['regulatory risk premium']?.category === 'finance' &&
    JSON.stringify(categoryByTerm['regulatory risk premium']?.categories) === JSON.stringify(['finance', 'background']) &&
    categoryByTerm['equity risk premium']?.category === 'finance' &&
    JSON.stringify(categoryByTerm['equity risk premium']?.categories) === JSON.stringify(['finance']) &&
    categoryByTerm['credit spread']?.category === 'finance' &&
    categoryByTerm['stress testing']?.category === 'method' &&
    categoryByTerm['political risk premium']?.category === 'finance' &&
    JSON.stringify(categoryByTerm['political risk premium']?.categories) === JSON.stringify(['finance', 'background']) &&
    categoryByTerm['real wages']?.category === 'finance' &&
    categoryByTerm['supply bottleneck']?.category === 'background' &&
    categoryByTerm['financial law']?.category === 'background' &&
    JSON.stringify(categoryByTerm['financial law']?.categories) === JSON.stringify(['background', 'finance']) &&
    categoryByTerm['banking regulation']?.category === 'finance' &&
    JSON.stringify(categoryByTerm['banking regulation']?.categories) === JSON.stringify(['finance', 'background']) &&
    categoryByTerm['fintech']?.category === 'finance' &&
    JSON.stringify(categoryByTerm['fintech']?.categories) === JSON.stringify(['finance', 'background']) &&
    categoryByTerm['judicial review']?.category === 'background' &&
    JSON.stringify(categoryByTerm['judicial review']?.categories) === JSON.stringify(['background']) &&
    categoryByTerm['corporate finance']?.category === 'finance' &&
    categoryByTerm['insurance underwriting']?.category === 'finance' &&
    categoryByTerm['jointly controlled equity stake']?.category === 'finance' &&
    JSON.stringify(categoryByTerm['jointly controlled equity stake']?.categories) === JSON.stringify(['finance', 'background']) &&
    categoryByTerm['divorce asset division']?.category === 'background' &&
    JSON.stringify(categoryByTerm['divorce asset division']?.categories) === JSON.stringify(['background', 'finance']) &&
    categoryCards.every(card => card.categoryReason && card.categoryConfidence > 0),
    JSON.stringify(categoryByTerm));
  const clientCategoryCheck = await page.evaluate(() => {
    const fixtures = [
      { term: 'political risk', model: 'finance', expected: 'background' },
      { term: 'geopolitical risk', model: 'finance', expected: 'background' },
      { term: 'bargaining power', model: 'finance', expected: 'background', categories: ['background'] },
      { term: 'negotiating leverage', model: 'finance', expected: 'background', categories: ['background'] },
      { term: '谈判筹码', model: 'finance', expected: 'background', categories: ['background'] },
      { term: 'financial leverage', model: 'background', expected: 'finance', categories: ['finance'] },
      {
        term: 'geopolitical risk premium',
        model: 'background',
        expected: 'finance',
        categories: ['finance', 'background'],
        body: '投资者持有受战争、制裁或国际冲突影响资产时要求更高的预期收益和折现率。'
      },
      {
        term: 'political risk premium',
        model: 'background',
        expected: 'finance',
        categories: ['finance', 'background'],
        body: '政治不确定性被计入投资者要求的收益率和资产定价补偿。'
      },
      {
        term: 'regulatory risk premium',
        model: 'background',
        expected: 'finance',
        categories: ['finance', 'background'],
        body: '监管变化被投资者定价为更高的利差、预期收益或折现率。'
      },
      {
        term: 'policy risk premium',
        model: 'finance',
        expected: 'background',
        categories: ['background'],
        body: '政策不确定性会影响企业信心，但没有给出可识别的定价对象。'
      },
      { term: 'equity risk premium', model: 'background', expected: 'finance', categories: ['finance'] },
      { term: 'credit spread', model: 'background', expected: 'finance' },
      { term: 'stress testing', model: 'finance', expected: 'method' },
      { term: 'real wages', model: 'background', expected: 'finance' },
      { term: 'supply bottleneck', model: 'finance', expected: 'background', categories: ['background'] },
      { term: 'financial law', model: 'finance', expected: 'background', categories: ['background', 'finance'] },
      { term: 'banking regulation', model: 'background', expected: 'finance', categories: ['finance', 'background'] },
      { term: 'fintech', model: 'background', expected: 'finance', categories: ['finance', 'background'] },
      { term: 'judicial review', model: 'finance', expected: 'background', categories: ['background'] },
      { term: 'corporate finance', model: 'background', expected: 'finance', categories: ['finance'] },
      { term: 'insurance underwriting', model: 'background', expected: 'finance', categories: ['finance'] },
      {
        term: 'jointly controlled equity stake',
        model: 'background',
        expected: 'finance',
        categories: ['finance', 'background'],
        body: '该股权是上市公司权益资产。共同信托或 LLC 改变谁可以投票、出售和处分股份，并影响减持预期、控制权、披露和估值。'
      },
      {
        term: 'divorce asset division',
        model: 'finance',
        expected: 'background',
        categories: ['background', 'finance'],
        body: '离婚财产分割依据婚姻财产制和信托条款确定财产归属，并处理信托持有的上市公司股份估值、流动性、控制权和税务。'
      },
      {
        term: 'marital property division',
        model: 'finance',
        expected: 'background',
        categories: ['background'],
        body: '法院依据婚姻财产规则确定住房和家庭用品等非金融财产的归属和分配，不涉及证券估值、流动性、控制权、融资或风险转移。'
      }
    ];
    return fixtures.map(item => {
      try {
        const result = classifyKnowledgeCategoryClient({
          term: item.term,
          en: item.term,
          category: item.model,
          one: item.one || item.term,
          body: item.body || item.term
        });
        return { term: item.term, expected: item.expected, ...result };
      } catch (error) {
        return { term: item.term, expected: item.expected, category: '', error: String(error.message || error) };
      }
    });
  });
  check('Client-side category validation also blocks stale or cached misclassification',
    clientCategoryCheck.every(item => item.category === item.expected),
    JSON.stringify(clientCategoryCheck));
  check('Client-side classification exposes cross-listed categories',
    JSON.stringify(clientCategoryCheck.find(item => item.term === 'financial law')?.categories) === JSON.stringify(['background', 'finance']) &&
    JSON.stringify(clientCategoryCheck.find(item => item.term === 'banking regulation')?.categories) === JSON.stringify(['finance', 'background']) &&
    JSON.stringify(clientCategoryCheck.find(item => item.term === 'fintech')?.categories) === JSON.stringify(['finance', 'background']) &&
    JSON.stringify(clientCategoryCheck.find(item => item.term === 'jointly controlled equity stake')?.categories) === JSON.stringify(['finance', 'background']) &&
    JSON.stringify(clientCategoryCheck.find(item => item.term === 'divorce asset division')?.categories) === JSON.stringify(['background', 'finance']) &&
    JSON.stringify(clientCategoryCheck.find(item => item.term === 'marital property division')?.categories) === JSON.stringify(['background']) &&
    JSON.stringify(clientCategoryCheck.find(item => item.term === 'geopolitical risk premium')?.categories) === JSON.stringify(['finance', 'background']) &&
    JSON.stringify(clientCategoryCheck.find(item => item.term === 'policy risk premium')?.categories) === JSON.stringify(['background']) &&
    JSON.stringify(clientCategoryCheck.find(item => item.term === 'negotiating leverage')?.categories) === JSON.stringify(['background']),
    JSON.stringify(clientCategoryCheck.filter(item =>
      ['financial law', 'banking regulation', 'fintech', 'jointly controlled equity stake', 'divorce asset division', 'marital property division', 'geopolitical risk premium', 'policy risk premium', 'negotiating leverage'].includes(item.term))));
  const methodEvidenceCheck = await page.evaluate(async ({ baseUrl }) => {
    const response = await fetch('/api/annotate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'METHOD_EVIDENCE_AUDIT_TEST',
        paragraphs: ['Complete analytical procedures should be recognized without turning financial valuation or operating tools into methods.'],
        baseUrl,
        apiKey: 'feedback-v2-key',
        model: 'feedback-v2-model',
        vocabFocus: 'finance'
      })
    });
    return { status: response.status, body: await response.json() };
  }, { baseUrl: CONTENT + '/v1' });
  const methodCards = methodEvidenceCheck.body.article?.knowledge || [];
  const methodByTerm = Object.fromEntries(methodCards.map(card => [card.term, card.category]));
  const methodCategoriesByTerm = Object.fromEntries(methodCards.map(card => [card.term, card.categories]));
  const expectedMethods = [
    'founder-market fit',
    'venture capital team evaluation',
    'incremental vote-margin comparison',
    'seasonal adjustment',
    'data surprise analysis',
    'job-growth breadth analysis',
    'source completeness screening',
    'new-item count vs sales value',
    'UPC-based retail sales tracking',
    'consumer trend evidence verification',
    'stated preference survey',
    'wealth quantile analysis',
    'opportunity cost and time allocation',
    'attribution in reported speech',
    'personal narrative vs fundamentals'
  ];
  check('Complete procedures missed by English-only evidence rules are classified as methods',
    methodEvidenceCheck.status === 200 &&
    expectedMethods.every(term => methodByTerm[term] === 'method'),
    JSON.stringify(Object.fromEntries(expectedMethods.map(term => [term, methodByTerm[term]]))));
  check('Relative valuation and revenue management stay financial while tools and mechanisms remain background',
    methodByTerm['relative valuation'] === 'finance' &&
    methodByTerm['相对估值'] === 'finance' &&
    methodByTerm['airline revenue management'] === 'finance' &&
    JSON.stringify(methodCategoriesByTerm['relative valuation']) === JSON.stringify(['finance', 'method']) &&
    JSON.stringify(methodCategoriesByTerm['相对估值']) === JSON.stringify(['finance', 'method']) &&
    JSON.stringify(methodCategoriesByTerm['airline revenue management']) === JSON.stringify(['finance']) &&
    methodByTerm['autonomous laboratory'] === 'background' &&
    methodByTerm['drug discovery pipeline'] === 'background' &&
    methodByTerm['incentive compatibility'] === 'background' &&
    methodByTerm['ad hoc policymaking'] === 'background' &&
    methodByTerm['agenda setting'] === 'background',
    JSON.stringify({
      relativeValuation: methodByTerm['relative valuation'],
      chineseRelativeValuation: methodByTerm['相对估值'],
      relativeValuationCategories: methodCategoriesByTerm['relative valuation'],
      chineseRelativeValuationCategories: methodCategoriesByTerm['相对估值'],
      airlineRevenueManagement: methodByTerm['airline revenue management'],
      autonomousLaboratory: methodByTerm['autonomous laboratory'],
      drugDiscoveryPipeline: methodByTerm['drug discovery pipeline'],
      incentiveCompatibility: methodByTerm['incentive compatibility'],
      adHocPolicymaking: methodByTerm['ad hoc policymaking'],
      agendaSetting: methodByTerm['agenda setting']
    }));
  const clientMethodAudit = await page.evaluate(() => {
    const fixtures = [
      {
        term: 'seasonal adjustment', expected: 'method', cardType: 'method',
        body: '输入原始月度序列，估计季节因子，剔除季节成分并输出季调值；需结合修订和一次性冲击解释误差。',
        methodSteps: ['读取原始序列', '估计季节因子', '剔除季节成分', '结合修订解释']
      },
      {
        term: 'data surprise analysis', expected: 'method', cardType: 'method',
        body: '确认预期口径并计算实际差异，检查前值修正和分项，再映射政策和资产价格；单月噪音限制结论。',
        methodSteps: ['确认预期', '计算差异', '检查分项', '映射政策']
      },
      {
        term: 'founder-market fit', expected: 'method', cardType: 'method',
        body: '核查创始人经历、支付方理解和监管流程，再比较获客与单位经济性；叙事不能替代经营数据。',
        methodSteps: ['核查经历', '理解支付方', '比较单位经济性']
      },
      {
        term: '相对估值', expected: 'finance', expectedCategories: ['finance', 'method'], cardType: 'method',
        body: '比较市盈率和企业价值倍数，并核对盈利周期、会计口径和风险差异。',
        methodSteps: ['选择可比对象', '统一口径', '比较倍数', '检查风险']
      },
      {
        term: 'autonomous laboratory', expected: 'background', cardType: 'method',
        body: '机器人、传感器和模型协同执行实验，属于科研基础设施而非可迁移分析方法。',
        methodSteps: ['连接设备', '执行实验', '采集数据']
      }
    ];
    return fixtures.map(item => ({
      term: item.term,
      expected: item.expected,
      ...classifyKnowledgeCategoryClient({
        term: item.term,
        en: item.term,
        category: 'background',
        cardType: item.cardType,
        one: item.term,
        body: item.body,
        methodSteps: item.methodSteps
      })
    }));
  });
  check('Client-side method evidence handles Chinese procedures and financial valuation explicitly',
    clientMethodAudit.every(item => item.category === item.expected &&
      (!item.expectedCategories || JSON.stringify(item.categories) === JSON.stringify(item.expectedCategories))),
    JSON.stringify(clientMethodAudit));
  const industryCheck = await page.evaluate(async ({ baseUrl }) => {
    const response = await fetch('/api/annotate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'INDUSTRY_BOUNDARY_TEST',
        paragraphs: [
          'Electrification requires equipment investment, grid and storage investment, and better electricity access.',
          'Payback periods and concessional capital affect financing decisions.'
        ],
        baseUrl,
        apiKey: 'feedback-v2-key',
        model: 'feedback-v2-model',
        vocabFocus: 'finance'
      })
    });
    return { status: response.status, body: await response.json() };
  }, { baseUrl: CONTENT + '/v1' });
  const industryCards = industryCheck.body.article?.knowledge || [];
  const industryByTerm = Object.fromEntries(industryCards.map(card => [card.term, card]));
  check('Industry actions and physical investment stay out of finance',
    industryCheck.status === 200 &&
    industryByTerm.electrification?.category === 'background' &&
    industryByTerm['equipment investment']?.category === 'background' &&
    industryByTerm['grid and storage investment']?.category === 'background' &&
    industryByTerm['electricity access']?.category === 'background' &&
    industryByTerm['avoided fuel import savings']?.category === 'background' &&
    industryByTerm['energy import spending as a share of GDP']?.category === 'background' &&
    industryByTerm['relative price effect']?.category === 'background' &&
    industryByTerm['policy-market complementarity']?.category === 'background' &&
    industryByTerm['market signals and incentive structures']?.category === 'background',
    JSON.stringify(Object.fromEntries(Object.entries(industryByTerm).map(([term, card]) => [term, card.category]))));
  check('Financial analysis, financing and tax-policy concepts retain their proper layer',
    industryByTerm['payback period']?.category === 'finance' &&
    industryByTerm['concessional capital']?.category === 'finance' &&
    industryByTerm['cost of capital']?.category === 'finance' &&
    industryByTerm['loan guarantee']?.category === 'finance' &&
    industryByTerm['value-added tax reduction']?.category === 'background' &&
    JSON.stringify(industryByTerm['value-added tax reduction']?.categories) === JSON.stringify(['background', 'finance']),
    JSON.stringify(Object.fromEntries(Object.entries(industryByTerm).map(([term, card]) => [term, { category: card.category, categories: card.categories }]))));
  check('Method classification requires an analytical procedure rather than generic framework or model wording',
    industryByTerm['regulatory framework']?.category === 'background' &&
    industryByTerm['business model']?.category === 'background' &&
    industryByTerm['DCF']?.category === 'method' &&
    industryByTerm['cost-benefit analysis']?.category === 'method' &&
    industryByTerm['climate scenario analysis']?.category === 'method' &&
    industryByTerm['climate model']?.category === 'background',
    JSON.stringify(Object.fromEntries(['regulatory framework', 'business model', 'DCF', 'cost-benefit analysis',
      'climate scenario analysis', 'climate model']
      .map(term => [term, industryByTerm[term]?.category]))));
  check('Scientific tools, computing infrastructure and lab automation stay out of analytical methods',
    ['computing power', 'drug discovery pipeline', 'automated labs', 'autonomous laboratory',
      'AI-for-science stack', 'research infrastructure'].every(term => industryByTerm[term]?.category === 'background'),
    JSON.stringify(Object.fromEntries(['computing power', 'drug discovery pipeline', 'automated labs',
      'autonomous laboratory', 'AI-for-science stack', 'research infrastructure']
      .map(term => [term, industryByTerm[term]?.category]))));
  check('Concrete scenario, forecasting and risk model tools stay out of analytical methods',
    industryByTerm['scenario model']?.category === 'background' &&
    industryByTerm['forecasting model']?.category === 'background' &&
    industryByTerm['risk model']?.category === 'background' &&
    industryByTerm['forecasting method']?.category === 'method',
    JSON.stringify(Object.fromEntries(['scenario model', 'forecasting model', 'risk model', 'forecasting method']
      .map(term => [term, industryByTerm[term]?.category]))));
  const modelMethodCheck = await page.evaluate(async ({ baseUrl }) => {
    const response = await fetch('/api/annotate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'MODEL_METHOD_BOUNDARY_TEST',
        paragraphs: [
          'Scenario, forecasting and risk models can support financial decisions when their assumptions and outputs are documented.'
        ],
        baseUrl,
        apiKey: 'feedback-v2-key',
        model: 'feedback-v2-model',
        vocabFocus: 'finance'
      })
    });
    const body = await response.json();
    return {
      status: response.status,
      cards: (body.article?.knowledge || []).map(card => ({
        term: card.term,
        category: card.category,
        methods: card.methodSteps,
        reason: card.categoryReason
      }))
    };
  }, { baseUrl: CONTENT + '/v1' });
  const modelMethodByTerm = Object.fromEntries(modelMethodCheck.cards.map(card => [card.term, card]));
  check('Models enter analytical methods only when the described chain is complete',
    modelMethodCheck.status === 200 &&
    modelMethodByTerm['scenario model']?.category === 'method' &&
    modelMethodByTerm['forecasting model']?.category === 'method' &&
    modelMethodByTerm['risk model']?.category === 'method' &&
    modelMethodByTerm['scenario model']?.methods?.length >= 2 &&
    modelMethodByTerm['forecasting model']?.methods?.length >= 2 &&
    modelMethodByTerm['risk model']?.methods?.length >= 2,
    JSON.stringify(modelMethodCheck));
  check('Generic model names and model platforms do not become analytical methods',
    modelMethodByTerm.model?.category === 'background' &&
    modelMethodByTerm['scenario simulation platform']?.category === 'background' &&
    /软件|平台|计算实现/.test(modelMethodByTerm['scenario simulation platform']?.reason || ''),
    JSON.stringify(modelMethodCheck));
  const clientModelMethodCheck = await page.evaluate(() => {
    const fixtures = [
      {
        term: 'scenario model',
        category: 'background',
        one: '比较政策与市场情景下金融结果的分析模型。',
        body: '模型先设定增长、利率和政策路径假设，再读取宏观输入，通过资产负债表与传导方程计算各情景下的资本充足率，并将结果用于风险限额判断。',
        methodSteps: ['设定情景假设与政策路径', '读取宏观和资产负债表输入', '按传导方程计算各情景结果', '比较资本充足率并解释不确定性边界'],
        expected: 'method'
      },
      {
        term: 'forecasting model',
        category: 'background',
        one: '从历史数据生成通胀预测并评价误差的分析程序。',
        body: '模型以滞后通胀、工资和利率为输入，使用时间序列估计参数，输出未来通胀路径与置信区间，并按样本外误差和适用条件解释预测可靠性。',
        methodSteps: ['选择变量与样本', '估计时间序列参数', '生成预测和置信区间', '用样本外误差评价模型边界'],
        expected: 'method'
      },
      {
        term: 'risk model',
        category: 'background',
        one: '把风险因子与损失分布连接起来的风险计量程序。',
        body: '模型以风险暴露、波动率和相关性为输入，通过历史模拟或蒙特卡洛方法生成损失分布，输出 VaR 和预期损失，并用于限额与资本决策；同时列明分布假设和失效条件。',
        methodSteps: ['读取风险暴露与市场因子', '设定波动率和相关性假设', '模拟损益分布', '输出 VaR 与预期损失并校验边界'],
        expected: 'method'
      },
      {
        term: 'model',
        category: 'method',
        one: '一个模型。',
        body: '这是一个模型，用于生成结果。',
        methodSteps: [],
        expected: 'background'
      },
      {
        term: 'scenario simulation platform',
        category: 'method',
        one: '运行情景模拟任务的软件平台。',
        body: '该平台提供计算资源、任务调度和结果存储，不包含分析假设或推断规则。',
        methodSteps: [],
        expected: 'background'
      }
    ];
    return fixtures.map(fixture => ({
      term: fixture.term,
      expected: fixture.expected,
      ...classifyKnowledgeCategoryClient(fixture)
    }));
  });
  check('Client classifier applies the same model evidence boundary',
    clientModelMethodCheck.every(item => item.category === item.expected),
    JSON.stringify(clientModelMethodCheck));
  const aiMechanismCheck = await page.evaluate(async ({ baseUrl }) => {
    const response = await fetch('/api/annotate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'AI_MECHANISM_BOUNDARY_TEST',
        paragraphs: [
          'AI agents can execute tasks, while a turn in AI sentiment can reprice financial assets and acquisition financing can transmit risk.'
        ],
        baseUrl,
        apiKey: 'feedback-v2-key',
        model: 'feedback-v2-model',
        vocabFocus: 'finance'
      })
    });
    const body = await response.json();
    return {
      status: response.status,
      cards: (body.article?.knowledge || []).map(card => ({
        term: card.term,
        category: card.category,
        categories: card.categories,
        cardType: card.cardType,
        methods: card.methodSteps,
        reason: card.categoryReason
      }))
    };
  }, { baseUrl: CONTENT + '/v1' });
  const aiMechanismByTerm = Object.fromEntries(aiMechanismCheck.cards.map(card => [card.term, card]));
  check('AI agents and agentic workflows stay in the background as technology systems',
    aiMechanismCheck.status === 200 &&
    aiMechanismByTerm['AI agents']?.category === 'background' &&
    aiMechanismByTerm['agentic workflow']?.category === 'background' &&
    aiMechanismByTerm['multi-agent system']?.category === 'background' &&
    aiMechanismByTerm['multi-agent simulation platform']?.category === 'background',
    JSON.stringify(aiMechanismCheck));
  check('Agent-based modeling and multi-agent simulation need complete method evidence',
    aiMechanismByTerm['agent-based modeling']?.category === 'method' &&
    aiMechanismByTerm['multi-agent simulation']?.category === 'method' &&
    aiMechanismByTerm['agent-based modeling']?.methods?.length >= 2 &&
    aiMechanismByTerm['multi-agent simulation']?.methods?.length >= 2,
    JSON.stringify(aiMechanismCheck));
  check('AI trade repricing is primarily background with financial repricing cross-listed',
    aiMechanismByTerm['AI trade repricing']?.category === 'background' &&
    JSON.stringify(aiMechanismByTerm['AI trade repricing']?.categories) === JSON.stringify(['background', 'finance']),
    JSON.stringify(aiMechanismByTerm['AI trade repricing']));
  check('Detailed financing mechanisms remain financial rather than becoming analytical methods',
    aiMechanismByTerm['insurance premium financing acquisition']?.category === 'finance' &&
    aiMechanismByTerm['insurance premium financing acquisition']?.cardType === 'mechanism' &&
    aiMechanismByTerm['acquisition financing']?.category === 'finance' &&
    aiMechanismByTerm['acquisition financing']?.cardType === 'mechanism' &&
    aiMechanismByTerm['保费资金融资收购']?.category === 'finance' &&
    aiMechanismByTerm['保费资金融资收购']?.cardType === 'mechanism',
    JSON.stringify(aiMechanismCheck));
  check('Judicial enforcement measures and executable property stay in the background layer',
    aiMechanismByTerm['限制高消费']?.category === 'background' &&
    aiMechanismByTerm['失信被执行人']?.category === 'background' &&
    aiMechanismByTerm['可执行资产']?.category === 'background' &&
    aiMechanismByTerm['可供执行财产']?.category === 'background',
    JSON.stringify(aiMechanismCheck));
  check('Asset recovery is separated by enforcement and non-performing asset contexts',
    aiMechanismByTerm['资产回收']?.category === 'background' &&
    aiMechanismByTerm['不良资产回收']?.category === 'finance' &&
    aiMechanismByTerm['recovery rate']?.category === 'finance',
    JSON.stringify(aiMechanismCheck));
  const consumerBiomedCheck = await page.evaluate(async ({ baseUrl }) => {
    const response = await fetch('/api/annotate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'CONSUMER_BIOMED_BOUNDARY_TEST',
        paragraphs: [
          'Electrolyte hydration trends, category disruption, GLP-1 receptor agonists, CEOs and beverage category expansion are transforming consumer markets.'
        ],
        baseUrl,
        apiKey: 'feedback-v2-key',
        model: 'feedback-v2-model',
        vocabFocus: 'finance'
      })
    });
    const body = await response.json();
    return {
      status: response.status,
      cards: (body.article?.knowledge || []).map(card => ({
        term: card.term,
        category: card.category,
        reason: card.categoryReason
      }))
    };
  }, { baseUrl: CONTENT + '/v1' });
  const consumerBiomedByTerm = Object.fromEntries(consumerBiomedCheck.cards.map(card => [card.term, card]));
  check('Consumer trends, product categories, drug classes and executive roles stay in the background layer',
    consumerBiomedCheck.status === 200 &&
    ['电解质补水趋势', '品类颠覆', 'GLP-1 receptor agonist', '首席执行官', '补水需求', '饮料品类扩张']
      .every(term => consumerBiomedByTerm[term]?.category === 'background'),
    JSON.stringify(consumerBiomedCheck));
  check('Marketing, brand and consumer growth concepts stay background while financing and acquisitions remain financial',
    consumerBiomedCheck.status === 200 &&
    ['market segmentation', 'Product differentiation', '品牌资产', '品牌相关性', '复购买家率', 'Consumer staples growth strategy']
      .every(term => consumerBiomedByTerm[term]?.category === 'background') &&
    consumerBiomedByTerm['Strategic acquisition']?.category === 'finance' &&
    consumerBiomedByTerm['Self-funding (bootstrapping)']?.category === 'finance' &&
    consumerBiomedByTerm['fragrance layering trend']?.category === 'background' &&
    consumerBiomedByTerm['microbiome skin care']?.category === 'background' &&
    consumerBiomedByTerm['securitisation tranche']?.category === 'finance',
    JSON.stringify(consumerBiomedCheck));
  const clientAiMechanismCheck = await page.evaluate(() => {
    const fixtures = [
      { term: 'AI agents', category: 'method', cardType: 'concept', one: '自主软件系统。', body: '组合模型、工具调用和执行环境。', methodSteps: [], expected: 'background' },
      { term: 'agentic workflow', category: 'method', cardType: 'concept', one: '自主代理执行流程。', body: '调用工具并检查结果。', methodSteps: ['接收任务', '调用工具'], expected: 'background' },
      { term: 'multi-agent system', category: 'method', cardType: 'concept', one: '多个软件代理协作的系统。', body: '代理通过消息传递协调任务。', methodSteps: [], expected: 'background' },
      { term: 'AI trade repricing', category: 'method', cardType: 'phenomenon', one: 'AI 情绪变化引发资产重定价。', body: 'AI 主题估值和仓位发生变化。', methodSteps: [], expected: 'background', categories: ['background', 'finance'] },
      {
        term: 'agent-based modeling', category: 'background', cardType: 'method',
        one: '定义主体行为并进行模拟的程序。',
        body: '模型设定主体、行为规则、网络环境和随机扰动，运行迭代模拟，输出结果并用敏感性分析验证边界。',
        methodSteps: ['定义主体与行为规则', '设定网络和初始条件', '运行模拟并校验边界'], expected: 'method'
      },
      {
        term: 'multi-agent simulation', category: 'background', cardType: 'method',
        one: '多个交互代理执行情景模拟的方法。',
        body: '以代理参数、交互规则和政策情景为输入，通过多轮迭代生成分布结果并评价适用条件。',
        methodSteps: ['设定代理与交互规则', '输入情景并迭代模拟', '评估结果和边界'], expected: 'method'
      },
      { term: 'multi-agent simulation platform', category: 'method', cardType: 'concept', one: '模拟软件平台。', body: '提供计算资源、任务调度和结果存储。', methodSteps: [], expected: 'background' },
      {
        term: 'insurance premium financing acquisition', category: 'method', cardType: 'mechanism',
        one: '通过债务融资收购保费融资机构。',
        body: '收购方以债务支付对价，并用目标公司现金流覆盖融资成本；估值模型用于分析回报。',
        methodSteps: ['确定对价与资金来源', '安排债务结构', '评估现金流覆盖'], expected: 'finance'
      },
      {
        term: 'acquisition financing', category: 'method', cardType: 'mechanism',
        one: '为收购交易安排融资。',
        body: '融资结构影响收购方杠杆、现金流和风险分担；风险管理用于交易判断。',
        methodSteps: ['确定资金需求', '安排融资结构', '评估偿债来源'], expected: 'finance'
      },
      {
        term: '保费资金融资收购', category: 'method', cardType: 'mechanism',
        one: '围绕保费融资业务开展的收购。',
        body: '收购方以债务资金取得目标公司权益，并以业务现金流偿付融资成本；传导机制不等于分析方法。',
        methodSteps: ['确定收购对价', '安排债务融资', '评估现金流覆盖'], expected: 'finance'
      },
      { term: '限制高消费', category: 'finance', cardType: 'mechanism', one: '法院限制被执行人非必要消费。', body: '属于民事执行措施而不是金融工具。', methodSteps: [], expected: 'background' },
      { term: '失信被执行人', category: 'finance', cardType: 'concept', one: '法院依法纳入失信名单的被执行人。', body: '该法律身份来自司法执行中的信用惩戒。', methodSteps: [], expected: 'background' },
      { term: '可执行资产', category: 'finance', cardType: 'concept', one: '可依法执行的被执行人财产。', body: '可执行性属于司法执行状态，应写可供执行财产。', methodSteps: [], expected: 'background' },
      { term: '可供执行财产', category: 'finance', cardType: 'concept', one: '可供法院采取执行措施的财产。', body: '法院可以查封、冻结、拍卖或变卖该财产。', methodSteps: [], expected: 'background' },
      { term: '资产回收', category: 'finance', cardType: 'mechanism', one: '通过处置财产实现回收。', body: '司法执行中通过查封、拍卖和分配实现债权。', methodSteps: ['查明财产', '处置财产', '实现债权'], expected: 'background' },
      { term: '不良资产回收', category: 'background', cardType: 'mechanism', one: '回收不良贷款价值。', body: '银行通过现金清收、抵押物处置和债务重组回收不良资产。', methodSteps: ['识别不良资产', '清收或处置', '计算回收损失'], expected: 'finance' },
      { term: 'recovery rate', category: 'background', cardType: 'concept', one: '违约后回收金额占比。', body: '回收率用于信用风险计量。', methodSteps: [], expected: 'finance' }
    ];
    return fixtures.map(fixture => ({
      term: fixture.term,
      expected: fixture.expected,
      expectedCategories: fixture.categories,
      ...classifyKnowledgeCategoryClient(fixture)
    }));
  });
  check('Client classifier keeps AI tools, repricing and financing mechanisms in their proper layers',
    clientAiMechanismCheck.every(item =>
      item.category === item.expected &&
      (!item.expectedCategories || JSON.stringify(item.categories) === JSON.stringify(item.expectedCategories))),
    JSON.stringify(clientAiMechanismCheck));
  const clientConsumerBiomedCheck = await page.evaluate(() => {
    const fixtures = [
      { term: '电解质补水趋势', en: 'Electrolyte hydration trend', category: 'finance', cardType: 'phenomenon', one: '消费者补水需求上升。', body: '饮料品牌扩展运动补水和功能饮料。', methodSteps: [], expected: 'background' },
      { term: '品类颠覆', en: 'Category disruption', category: 'finance', cardType: 'phenomenon', one: '新产品形态改变品类格局。', body: '新品牌通过配方和渠道改变消费者选择。', methodSteps: [], expected: 'background' },
      { term: 'GLP-1 receptor agonist', en: 'GLP-1 receptor agonist', category: 'finance', cardType: 'concept', one: '一类代谢与糖尿病药物。', body: '涉及受体机制和临床适应症。', methodSteps: [], expected: 'background' },
      { term: '首席执行官', en: 'Chief executive officer', category: 'finance', cardType: 'concept', one: '企业最高经营管理角色。', body: '负责战略和经营执行。', methodSteps: [], expected: 'background' },
      { term: '补水需求', en: 'Hydration demand', category: 'finance', cardType: 'concept', one: '消费者对补水产品的需求。', body: '属于消费需求变化。', methodSteps: [], expected: 'background' },
      { term: '饮料品类扩张', en: 'Beverage category expansion', category: 'finance', cardType: 'mechanism', one: '饮料企业扩展新品类。', body: '从碳酸饮料进入功能和电解质饮料。', methodSteps: [], expected: 'background' },
      { term: 'market segmentation', en: 'Market segmentation', category: 'finance', cardType: 'concept', one: '按人群和场景划分市场。', body: '品牌覆盖运动补水和日常补水。', methodSteps: [], expected: 'background' },
      { term: 'Product differentiation', en: 'Product differentiation', category: 'finance', cardType: 'concept', one: '通过配方和定位区分产品。', body: '属于产品与品牌策略。', methodSteps: [], expected: 'background' },
      { term: '品牌资产', en: 'Brand equity', category: 'finance', cardType: 'concept', one: '品牌带来的认知和定价能力。', body: '属于营销和无形资产。', methodSteps: [], expected: 'background' },
      { term: '品牌相关性', en: 'Brand relevance', category: 'finance', cardType: 'concept', one: '品牌在购买决策中仍有意义。', body: '属于营销概念。', methodSteps: [], expected: 'background' },
      { term: '复购买家率', en: 'Repeat buyer rate', category: 'finance', cardType: 'concept', one: '重复购买买家占比。', body: '属于消费品经营指标。', methodSteps: [], expected: 'background' },
      { term: 'Consumer staples growth strategy', en: 'Consumer staples growth strategy', category: 'finance', cardType: 'mechanism', one: '通过新品类寻找增长。', body: '利用品牌和渠道进入高增长品类。', methodSteps: ['识别品类', '评估协同', '跟踪份额'], expected: 'background' },
      { term: 'Strategic acquisition', en: 'Strategic acquisition', category: 'background', cardType: 'concept', one: '产业买方收购公司。', body: '通过支付对价取得控制权并整合业务。', methodSteps: [], expected: 'finance' },
      { term: 'Self-funding (bootstrapping)', en: 'Self-funding / bootstrapping', category: 'background', cardType: 'concept', one: '创始人自筹资金。', body: '涉及资金来源、控制权和融资约束。', methodSteps: [], expected: 'finance' },
      { term: 'fragrance layering trend', en: 'Fragrance layering trend', category: 'finance', cardType: 'phenomenon', one: '消费者叠加香氛产品的趋势。', body: '属于消费文化与产品趋势。', methodSteps: [], expected: 'background' },
      { term: 'microbiome skin care', en: 'Microbiome skin care', category: 'finance', cardType: 'concept', one: '围绕皮肤微生物群的护肤品类。', body: '属于生物科技与消费品背景。', methodSteps: [], expected: 'background' },
      { term: 'securitisation tranche', en: 'Securitisation tranche', category: 'background', cardType: 'concept', one: '证券化产品中的风险分层份额。', body: '涉及优先级、损失分配和信用风险。', methodSteps: [], expected: 'finance' }
    ];
    return fixtures.map(fixture => ({ term: fixture.term, expected: fixture.expected, ...classifyKnowledgeCategoryClient(fixture) }));
  });
  check('Client classifier applies consumer, marketing and financing boundaries',
    clientConsumerBiomedCheck.every(item => item.category === item.expected),
    JSON.stringify(clientConsumerBiomedCheck));
  check('Health equity is not mistaken for financial equity',
    industryByTerm['health equity']?.category === 'background' &&
    industryByTerm['health inequality']?.category === 'background' &&
    industryByTerm['health insurance']?.category === 'finance' &&
    industryByTerm['equity financing']?.category === 'finance',
    JSON.stringify(Object.fromEntries(['health equity', 'health inequality', 'health insurance', 'equity financing']
      .map(term => [term, industryByTerm[term]?.category]))));
  check('Unemployment duration is labor-market background while bond duration remains financial',
    industryByTerm['unemployment duration']?.category === 'background' &&
    industryByTerm['duration of unemployment']?.category === 'background' &&
    industryByTerm['long-term unemployment']?.category === 'background' &&
    industryByTerm['modified duration']?.category === 'finance' &&
    industryByTerm['bond duration']?.category === 'finance' &&
    industryByTerm['duration gap']?.category === 'finance',
    JSON.stringify(Object.fromEntries(['unemployment duration', 'duration of unemployment', 'long-term unemployment',
      'modified duration', 'bond duration', 'duration gap'].map(term => [term, industryByTerm[term]?.category]))));
  check('Health funding gaps are background while corporate financing gaps remain financial',
    industryByTerm["women's health funding gap"]?.category === 'background' &&
    industryByTerm['health research funding gap']?.category === 'background' &&
    industryByTerm['medical research funding gap']?.category === 'background' &&
    industryByTerm['corporate financing gap']?.category === 'finance' &&
    industryByTerm['refinancing gap']?.category === 'finance',
    JSON.stringify(Object.fromEntries(["women's health funding gap", 'health research funding gap', 'medical research funding gap',
      'corporate financing gap', 'refinancing gap'].map(term => [term, industryByTerm[term]?.category]))));
  check('Regulatory and general risks stay in background while financial risk exposures remain financial',
    industryByTerm['regulatory risk']?.category === 'background' &&
    industryByTerm['compliance risk']?.category === 'background' &&
    industryByTerm['legal risk']?.category === 'background' &&
    industryByTerm['operational risk']?.category === 'background' &&
    industryByTerm['market risk']?.category === 'finance' &&
    industryByTerm['credit risk']?.category === 'finance' &&
    industryByTerm['bank operational risk']?.category === 'finance' &&
    industryByTerm['regulatory capital risk']?.category === 'finance' &&
    industryByTerm['financial risk management']?.category === 'finance',
    JSON.stringify(Object.fromEntries(['regulatory risk', 'compliance risk', 'legal risk', 'operational risk',
      'market risk', 'credit risk', 'bank operational risk', 'regulatory capital risk',
      'financial risk management'].map(term => [term, industryByTerm[term]?.category]))));
  check('General risk and compliance management frameworks are analytical methods',
    industryByTerm['enterprise risk management']?.category === 'method',
    JSON.stringify({ enterpriseRiskManagement: industryByTerm['enterprise risk management']?.category }));
  check('Market corrections are financial phenomena while property price corrections stay background',
    industryByTerm['market correction']?.category === 'finance' &&
    industryByTerm['housing market correction']?.category === 'background',
    JSON.stringify(Object.fromEntries(['market correction', 'housing market correction']
      .map(term => [term, industryByTerm[term]?.category]))));
  check('Circular financing requires a financial loop while accounting loops stay background',
    industryByTerm['circular financing']?.category === 'finance' &&
    industryByTerm['circular financing']?.categories?.includes('background') &&
    industryByTerm['circular accounting entries']?.category === 'background',
    JSON.stringify(Object.fromEntries(['circular financing', 'circular accounting entries']
      .map(term => [term, industryByTerm[term]]))));
  check('Capex shifts into finance when the primary object is its cash-flow impact',
    industryByTerm['capital expenditure versus cash flow']?.category === 'finance' &&
    industryByTerm['capital expenditure versus cash flow']?.categories?.includes('background') &&
    industryByTerm['capital expenditure']?.category === 'background',
    JSON.stringify(Object.fromEntries(['capital expenditure versus cash flow', 'capital expenditure']
      .map(term => [term, industryByTerm[term]]))));
  check('Purchasing power is classified as a financial indicator',
    industryByTerm['purchasing power']?.category === 'finance',
    JSON.stringify(industryByTerm['purchasing power']));
  const clientIndustryCheck = await page.evaluate(() => {
    const fixtures = [
      ['electrification', 'finance', 'background'],
      ['equipment investment', 'finance', 'background'],
      ['grid and storage investment', 'finance', 'background'],
      ['electricity access', 'finance', 'background'],
      ['relative price effect', 'finance', 'background'],
      ['market signals and incentive structures', 'finance', 'background'],
      ['COP', 'finance', 'background'],
      ['state intervention', 'finance', 'background'],
      ['Paris Agreement climate plans', 'finance', 'background'],
      ['energy security', 'finance', 'background'],
      ['energy import dependency', 'finance', 'background'],
      ['permitting and regulatory reform', 'finance', 'background'],
      ['electrification pathways', 'finance', 'background'],
      ['payback period', 'background', 'finance'],
      ['concessional capital', 'background', 'finance'],
      ['cost of capital', 'background', 'finance'],
      ['loan guarantee', 'background', 'finance'],
      ['regulatory framework', 'method', 'background'],
      ['business model', 'method', 'background'],
      ['DCF', 'finance', 'method'],
      ['cost-benefit analysis', 'background', 'method'],
      ['climate model', 'method', 'background'],
      ['climate scenario analysis', 'background', 'method'],
      ['computing power', 'method', 'background'],
      ['drug discovery pipeline', 'method', 'background'],
      ['automated labs', 'method', 'background'],
      ['autonomous laboratory', 'method', 'background'],
      ['AI-for-science stack', 'method', 'background'],
      ['research infrastructure', 'method', 'background'],
      ['scenario model', 'method', 'background'],
      ['forecasting model', 'method', 'background'],
      ['risk model', 'method', 'background'],
      ['forecasting method', 'background', 'method'],
      ['health equity', 'finance', 'background'],
      ['health inequality', 'finance', 'background'],
      ['health insurance', 'background', 'finance'],
      ['equity financing', 'background', 'finance'],
      ['unemployment duration', 'finance', 'background'],
      ['duration of unemployment', 'finance', 'background'],
      ['long-term unemployment', 'finance', 'background'],
      ['modified duration', 'background', 'finance'],
      ['bond duration', 'background', 'finance'],
      ['duration gap', 'background', 'finance'],
      ["women's health funding gap", 'finance', 'background'],
      ['health research funding gap', 'finance', 'background'],
      ['medical research funding gap', 'finance', 'background'],
      ['corporate financing gap', 'background', 'finance'],
      ['refinancing gap', 'background', 'finance'],
      ['regulatory risk', 'finance', 'background'],
      ['compliance risk', 'finance', 'background'],
      ['legal risk', 'finance', 'background'],
      ['operational risk', 'finance', 'background'],
      ['market risk', 'background', 'finance'],
      ['credit risk', 'background', 'finance'],
      ['bank operational risk', 'background', 'finance'],
      ['regulatory capital risk', 'background', 'finance'],
      ['financial risk management', 'background', 'finance'],
      ['enterprise risk management', 'background', 'method']
    ];
    return fixtures.map(([term, model, expected]) => {
      const result = classifyKnowledgeCategoryClient({
        term,
        en: term,
        category: model,
        one: term,
        body: term
      });
      return { term, expected, ...result };
    });
  });
  check('Client classifier distinguishes industry actions from finance',
    clientIndustryCheck.every(item => item.category === item.expected),
    JSON.stringify(clientIndustryCheck));
  const shareResult = await page.evaluate(async url => {
    const response = await fetch('/api/fetch?url=' + encodeURIComponent(url));
    return { status: response.status, body: await response.json() };
  }, CONTENT + '/share');
  check('Fetched article removes inline Share controls from the body',
    shareResult.body.ok &&
    shareResult.body.paragraphs.every(paragraph => !/\bShare\b/.test(paragraph)),
    JSON.stringify(shareResult.body.paragraphs || []).slice(0, 260));
  const boilerplateResult = await page.evaluate(async url => {
    const response = await fetch('/api/fetch?url=' + encodeURIComponent(url));
    return { status: response.status, body: await response.json() };
  }, CONTENT + '/boilerplate');
  const boilerplateText = JSON.stringify(boilerplateResult.body.paragraphs || []);
  check('Fetch cleanup removes embedded site boilerplate without deleting legitimate article sentences',
    boilerplateResult.body.ok &&
    boilerplateResult.body.paragraphs.length === 2 &&
    boilerplateText.includes('Investors who subscribe to the view') &&
    !/confidential news tip|delivered to your inbox|real-time snapshot|Global Business and Financial News|Download our app/i.test(boilerplateText),
    boilerplateText.slice(0, 520));
  const newsletterFetch = await page.evaluate(async url => {
    const response = await fetch('/api/fetch?url=' + encodeURIComponent(url));
    return { status: response.status, body: await response.json() };
  }, CONTENT + '/cnbc-newsletter');
  check('CNBC newsletter navigation is removed from a complete article body',
    newsletterFetch.status === 200 &&
    newsletterFetch.body.ok &&
    newsletterFetch.body.paragraphs.length >= 5 &&
    newsletterFetch.body.paragraphs.every(paragraph => !/Sign up today for the CNBC Sport Newsletter/i.test(paragraph)),
    JSON.stringify(newsletterFetch.body.paragraphs || []).slice(0, 520));
  const chunkQuality = await page.evaluate(async ({ paragraphs, baseUrl }) => {
    const response = await fetch('/api/annotate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'Complete multi-chunk article',
        paragraphs,
        baseUrl,
        apiKey: 'feedback-v2-key',
        model: 'feedback-v2-model',
        vocabFocus: 'ielts'
      })
    });
    return { status: response.status, body: await response.json() };
  }, { paragraphs: newsletterFetch.body.paragraphs || [], baseUrl: CONTENT + '/v1' });
  check('One fragmented model chunk does not reject a complete multi-chunk article',
    chunkQuality.status === 200 &&
    chunkQuality.body.ok &&
    chunkQuality.body.article?.paragraphs?.length >= 2 &&
    chunkQuality.body.article?.vocab?.length > 0,
    JSON.stringify(chunkQuality.body).slice(0, 700));
  const pastedCleaning = await page.evaluate(() => cleanImportedText(
    'Investors who subscribe to the view that rates will stay high are watching long-dated supply. ' +
    'Got a confidential news tip? We want to hear from you. ' +
    'Data is a real-time snapshot *Data is delayed at least 15 minutes. ' +
    'Global Business and Financial News, Stock Quotes, and Market Data and Analysis.'
  ));
  check('Pasted content uses the same sentence-level boilerplate cleanup',
    pastedCleaning.includes('Investors who subscribe to the view') &&
    !/confidential news tip|real-time snapshot|Stock Quotes/i.test(pastedCleaning),
    pastedCleaning);
  const vocabOnlyResult = await page.evaluate(async ({ baseUrl }) => {
    const response = await fetch('/api/vocab-focus', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'Vocabulary-only API fixture',
        paragraphs: [
          'Investors demanded a larger {{term premium}} while liquidity remained stable.',
          'The central bank monitored policy rates and credit conditions before its next meeting.'
        ],
        baseUrl,
        apiKey: 'feedback-v2-key',
        model: 'feedback-v2-model',
        vocabFocus: 'finance'
      })
    });
    const text = await response.text();
    let body = {};
    try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 200) }; }
    return { status: response.status, body };
  }, { baseUrl: CONTENT + '/v1' });
  check('Vocabulary-only API returns vocabulary without article modules',
    vocabOnlyResult.status === 200 &&
    vocabOnlyResult.body.vocab?.length > 0 &&
    !Object.hasOwn(vocabOnlyResult.body, 'article') &&
    !Object.hasOwn(vocabOnlyResult.body, 'paragraphs') &&
    !Object.hasOwn(vocabOnlyResult.body, 'knowledge'),
    JSON.stringify(vocabOnlyResult.body).slice(0, 280));
  check('Vocabulary-only prompt preserves locked term markers',
    lastModelBody.includes('只生成词汇标注') &&
    lastModelBody.includes('{{term premium}}') &&
    lastModelBody.includes('不得移除、改写、移动或输出术语标记'),
    lastModelBody.slice(0, 300));
  const connectionTest = await page.evaluate(async ({ baseUrl }) => {
    const response = await fetch('/api/test-model', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        baseUrl,
        apiKey: 'feedback-v2-key',
        model: 'feedback-v2-model'
      })
    });
    return { status: response.status, body: await response.json() };
  }, { baseUrl: CONTENT + '/v1' });
  check('Real model connection test uses a minimal chat completion',
    connectionTest.status === 200 &&
    connectionTest.body.ok &&
    connectionTest.body.model === 'feedback-v2-model' &&
    Number.isFinite(connectionTest.body.latencyMs),
    JSON.stringify(connectionTest.body));
  const failedConnectionTest = await page.evaluate(async () => {
    const response = await fetch('/api/test-model', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        baseUrl: 'http://127.0.0.1:1/v1',
        apiKey: 'feedback-v2-key',
        model: 'feedback-v2-model'
      })
    });
    return { status: response.status, body: await response.json() };
  });
  check('Connection failure explains that the model endpoint is unreachable',
    failedConnectionTest.status === 400 &&
    failedConnectionTest.body.error.includes('无法连接模型接口'),
    `${failedConnectionTest.status}: ${failedConnectionTest.body.error}`);
  await page.locator('[data-open-engine]').first().click();
  await page.locator('#btnTestModel').click();
  await page.waitForFunction(
    () => document.querySelector('#modelStatus')?.textContent.includes('连接成功'),
    null,
    { timeout: 10000 }
  );
  check('Real connection button uses the dedicated chat test',
    (await page.locator('#modelStatus').innerText()).includes('连接成功'));
  await page.locator('#engineModal .modal-head [data-close]').click();

  const pdfPath = path.resolve('tests/shots/audit-fixed/FinLens-print-final.pdf');
  if (fs.existsSync(pdfPath)) {
    const pdfBase64 = fs.readFileSync(pdfPath).toString('base64');
    const pdfResult = await page.evaluate(async data => {
      const response = await fetch('/api/document', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'FinLens-print-final.pdf', data })
      });
      return { status: response.status, body: await response.json() };
    }, pdfBase64);
    const pdfParagraphs = pdfResult.body.paragraphs || [];
    check('PDF wrapped lines are merged back into complete sentences',
      pdfResult.body.ok &&
      pdfParagraphs.some(text => text.includes('Central banks bought them by the trillion')),
      pdfParagraphs.slice(0, 5).join(' | ').slice(0, 260));
    check('PDF extraction removes page footer artifacts',
      pdfResult.body.ok && !paragraphsContain(pdfParagraphs, /--\s*\d+\s+of\s+\d+\s*--/i));
  }

  check('Article filters expose an Other category',
    (await page.locator('#topicSeg').innerText()).includes('其他'));
  check('Other articles expose a suggested topic tag',
    (await page.locator('.acard[data-a="fb-a"]').innerText()).includes('政治与制度'));
  check('Articles can sort by date or source in both directions',
    await page.locator('#articleSort option[value="date-desc"]').count() === 1 &&
    await page.locator('#articleSort option[value="date-asc"]').count() === 1 &&
    await page.locator('#articleSort option[value="source-asc"]').count() === 1 &&
    await page.locator('#articleSort option[value="source-desc"]').count() === 1);
  await page.selectOption('#articleSort', 'date-asc');
  const dateAscTitles = await page.locator('.acard-title').allInnerTexts();
  check('Date ascending sorting is applied to the article list',
    dateAscTitles.indexOf('Older Alpha') < dateAscTitles.indexOf('Newest Beta'),
    dateAscTitles.join(' > '));
  await page.selectOption('#articleSort', 'source-asc');
  const sourceAscTitles = await page.locator('.acard-title').allInnerTexts();
  check('Source ascending sorting is applied to the article list',
    sourceAscTitles.indexOf('Newest Beta') < sourceAscTitles.indexOf('Older Alpha'),
    sourceAscTitles.join(' > '));

  check('Navigation counts are dynamic and Output has no count',
    await page.locator('#navArticles').count() === 1 &&
    await page.locator('#navKnowledge').count() === 1 &&
    await page.locator('[data-view="export"] .ni-badge, [data-view="export"] .ni-kbd').count() === 0);
  const articleCount = await page.locator('#navArticles').innerText();
  check('Article navigation count matches the library',
    Number(articleCount) === 9,
    articleCount);

  await page.locator('.nav-item[data-view="knowledge"]').click();
  const kbCategory = page.locator('#kbCategorySeg');
  check('Knowledge base separates finance, background, and method categories',
    await kbCategory.count() === 1 &&
    (await kbCategory.innerText()).includes('金融') &&
    (await kbCategory.innerText()).includes('背景') &&
    (await kbCategory.innerText()).includes('方法'));
  await kbCategory.locator('button[data-kcat="background"]').click();
  const backgroundTerms = await page.locator('#kbGrid .kb-card .kb-term').allInnerTexts().catch(() => []);
  const backgroundBadges = await page.locator('#kbGrid .knowledge-category-badge').allInnerTexts();
  check('Knowledge category filtering shows only the selected layer',
    backgroundTerms.length >= 2 &&
    backgroundBadges.every(label => ['背景层', '金融术语'].includes(label.trim())) &&
    backgroundTerms.some(term => term.includes('fiscal supply')) &&
    backgroundTerms.some(term => term.includes('financial law')) &&
    backgroundTerms.some(term => term.includes('fintech')) &&
    backgroundTerms.some(term => term.includes('judicial review')) &&
    backgroundTerms.some(term => term.includes('electrification')) &&
    backgroundTerms.some(term => term.includes('grid and storage investment')) &&
    !backgroundTerms.some(term => /short-selling|real wages|fiscal surplus/i.test(term)),
    backgroundTerms.join(', '));
  const financialLawBadges = await page.locator('#kbGrid .kb-card[data-kid="fb-c-k-financial-law"] .knowledge-category-badge').allInnerTexts();
  check('Cross-listed financial law appears in background with both category badges',
    JSON.stringify(financialLawBadges.map(label => label.trim())) === JSON.stringify(['背景层', '金融术语']),
    JSON.stringify(financialLawBadges));
  await page.locator('#kbGrid .kb-card[data-kid="fb-c-k-electrification"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(OUT, 'knowledge-industry-boundary.png') });
  await kbCategory.locator('button[data-kcat="finance"]').click();
  const financeTerms = await page.locator('#kbGrid .kb-card .kb-term').allInnerTexts().catch(() => []);
  const financeBadges = await page.locator('#kbGrid .knowledge-category-badge').allInnerTexts();
  check('Financial terms retain fiscal and statistical indicators but exclude political and industrial concepts',
    financeTerms.length >= 2 &&
    financeBadges.every(label => ['金融术语', '背景层'].includes(label.trim())) &&
    financeTerms.some(term => /short-selling/i.test(term)) &&
    financeTerms.some(term => /real wages/i.test(term)) &&
    financeTerms.some(term => /fiscal surplus/i.test(term)) &&
    financeTerms.some(term => /financial law/i.test(term)) &&
    financeTerms.some(term => /fintech/i.test(term)) &&
    financeTerms.some(term => /concessional capital/i.test(term)) &&
    !financeTerms.some(term => /electrification|grid and storage investment/i.test(term)) &&
    !financeTerms.some(term => /judicial review/i.test(term)) &&
    !financeTerms.some(term => /political risk|supply bottleneck/i.test(term)),
    financeTerms.join(', '));
  const fintechBadges = await page.locator('#kbGrid .kb-card[data-kid="fb-c-k-fintech"] .knowledge-category-badge').allInnerTexts();
  check('Fintech appears in both finance and background categories',
    JSON.stringify(fintechBadges.map(label => label.trim())) === JSON.stringify(['金融术语', '背景层']),
    JSON.stringify(fintechBadges));
  await page.locator('#kbGrid .kb-card[data-kid="fb-c-k-fintech"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(OUT, 'knowledge-cross-categories.png') });
  await kbCategory.locator('button[data-kcat="all"]').click();
  const dedupedKnowledge = await page.evaluate(() =>
    ARTICLES.find(article => article.id === 'fb-b').knowledge.map(card => ({
      id: card.id,
      term: card.term,
      en: card.en,
      match: card.match
    })));
  check('Knowledge cards merge duplicate concepts and aliases',
    dedupedKnowledge.length === 3 &&
    dedupedKnowledge.filter(card => String(card.en).toLowerCase() === 'term premium').length === 1,
    JSON.stringify(dedupedKnowledge));
  await page.locator('.nav-item[data-view="reader"]').click();
  await page.locator('.acard[data-a="fb-b"]').click();
  check('Terms without matching cards do not render ghost knowledge highlights',
    await page.locator('.kmark[data-term="unlinked term"]').count() === 0 &&
    await page.locator('.kmark[data-term="term premium uncertainty"]').count() === 0);
  const termPremiumMark = page.locator('.kmark[data-term="term premium"]').first();
  check('Exact term aliases still render knowledge highlights',
    await termPremiumMark.count() === 1);
  await termPremiumMark.click();
  check('Term popover resolves to the matching knowledge card',
    await page.locator('#popover').isVisible() &&
    (await page.locator('#popover').innerText()).toLowerCase().includes('term premium'));
  await page.keyboard.press('Escape');
  await page.locator('.nav-item[data-view="knowledge"]').click();
  const detailCard = page.locator('#kbGrid .kb-card[data-kid="fb-b-k-background"]');
  check('Knowledge cards provide a detailed authority view', await detailCard.count() === 1);
  const researchedKnowledge = await page.evaluate(async ({ baseUrl }) => {
    const response = await fetch('/api/knowledge', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        knowledge: {
          term: 'term premium',
          en: 'Term premium',
          category: 'finance',
          one: '长期债券投资者要求的额外补偿。',
          body: '期限溢价反映久期、通胀和财政供给的不确定性。'
        },
        title: 'Treasury supply and term premium',
        paragraphs: [
          'Bond investors demanded a larger term premium as fiscal supply increased.',
          'The Treasury expanded long-dated issuance while inflation uncertainty remained elevated.'
        ],
        baseUrl,
        model: 'feedback-v2-model',
        apiKey: 'feedback-v2-key',
        researchOnline: true
      })
    });
    return { status: response.status, body: await response.json() };
  }, { baseUrl: CONTENT + '/v1' });
  const researchedResult = researchedKnowledge.body.result || {};
  const researchedSources = researchedResult.sources || [];
  check('Knowledge research classifies card type and verifies news plus academic sources',
    researchedKnowledge.status === 200 &&
    researchedResult.cardType === 'phenomenon' &&
    researchedResult.classificationReason?.includes('市场现象') &&
    (researchedResult.scenarios || []).length === 2 &&
    (researchedResult.indicators || []).some(item => item.name === '期限溢价') &&
    researchedResult.research?.verifiedSources >= 2 &&
    researchedSources.some(item => item.kind === 'news' && /Reuters/i.test(item.publisher || item.title)) &&
    researchedSources.some(item => item.kind === 'paper' && /Term premia/i.test(item.title)) &&
    !JSON.stringify(researchedResult).includes('example.invalid'),
    JSON.stringify({
      type: researchedResult.cardType,
      research: researchedResult.research,
      sources: researchedSources.map(item => ({ title: item.title, kind: item.kind, publisher: item.publisher }))
    }).slice(0, 760));
  const offlineKnowledge = await page.evaluate(async ({ baseUrl }) => {
    const response = await fetch('/api/knowledge', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        knowledge: {
          term: 'term premium',
          en: 'Term premium',
          category: 'finance',
          one: '长期债券投资者要求的额外补偿。',
          body: '期限溢价反映久期、通胀和财政供给的不确定性。'
        },
        title: 'Offline research fixture',
        paragraphs: ['Bond investors demanded a larger term premium as fiscal supply increased.'],
        baseUrl,
        model: 'feedback-v2-model',
        apiKey: 'feedback-v2-key',
        researchOnline: false
      })
    });
    return response.json();
  }, { baseUrl: CONTENT + '/v1' });
  check('Knowledge research can be explicitly disabled without blocking explanation generation',
    offlineKnowledge.ok &&
    offlineKnowledge.result?.research?.status === 'disabled' &&
    offlineKnowledge.result?.research?.verifiedSources === 0 &&
    offlineKnowledge.result?.detail?.includes('财政供给增加'));
  if (await detailCard.count()) {
    await detailCard.locator('.kb-term').click();
    check('Knowledge detail opens as a full application page with a back action',
      await page.locator('#view-knowledge-detail').isVisible() &&
      await page.locator('#btnKnowledgeBack').isVisible() &&
      await page.locator('#knowledgeModal').isVisible() === false &&
      (await page.locator('#knowledgeDetailContent').innerText()).includes('背景层') &&
      await page.locator('#knowledgeQuestion').count() === 1);
    const detailSubtitleStyle = await page.evaluate(() => {
      const title = document.querySelector('.knowledge-detail-hero h3');
      const subtitle = title?.querySelector('em');
      if (!title || !subtitle) return null;
      const titleStyle = getComputedStyle(title);
      const subtitleStyle = getComputedStyle(subtitle);
      return {
        titleColor: titleStyle.color,
        subtitleColor: subtitleStyle.color,
        titleSize: parseFloat(titleStyle.fontSize),
        subtitleSize: parseFloat(subtitleStyle.fontSize),
        subtitleFontStyle: subtitleStyle.fontStyle,
        subtitleWeight: subtitleStyle.fontWeight
      };
    });
    check('Knowledge detail English subtitle uses a subdued grey treatment',
      detailSubtitleStyle &&
      detailSubtitleStyle.subtitleColor !== detailSubtitleStyle.titleColor &&
      detailSubtitleStyle.subtitleSize < detailSubtitleStyle.titleSize &&
      detailSubtitleStyle.subtitleFontStyle === 'normal' &&
      Number(detailSubtitleStyle.subtitleWeight) <= 400,
      JSON.stringify(detailSubtitleStyle));
    const categoryDisclosure = page.locator('#knowledgeCategoryDisclosure');
    const categoryDetail = page.locator('#knowledgeCategoryDetail');
    check('Knowledge category rationale is hidden until the category badge is expanded',
      await categoryDisclosure.count() === 1 &&
      (await categoryDisclosure.locator('summary').innerText()).includes('领域分类') &&
      (await categoryDisclosure.locator('summary').innerText()).includes('背景层') &&
      await categoryDetail.isHidden() &&
      await page.locator('#knowledgeDetailContent [data-knowledge-category-button]').count() === 0);
    await categoryDisclosure.locator('summary').click();
    const categoryDetailText = await categoryDetail.innerText();
    check('Expanding the category badge reveals rationale and confidence',
      await categoryDetail.isVisible() &&
      !categoryDetailText.includes('领域分类') &&
      categoryDetailText.includes('置信度'),
      categoryDetailText);
    await page.locator('#btnGenerateKnowledgeDetail').click();
    await page.waitForFunction(() => document.querySelector('#knowledgeDetailContent')?.textContent.includes('财政供给增加'), null, { timeout: 10000 });
    const detailText = await page.locator('#knowledgeDetailContent').innerText();
    check('Knowledge detail generation returns structured explanation, sources, cases and methods',
      detailText.includes('机制与逻辑') &&
      detailText.includes('知识卡类型') &&
      detailText.includes('现象类') &&
      detailText.includes('出现场景') &&
      detailText.includes('指标') &&
      detailText.includes('联网核验') &&
      detailText.includes('权威书目与来源') &&
      detailText.includes('长期国债供给上升与期限溢价') &&
      detailText.includes('识别财政供给变化') &&
      detailText.includes('International Monetary Fund') &&
      detailText.includes('Reuters'));
    await page.fill('#knowledgeQuestion', '财政供给如何影响期限溢价？');
    await page.locator('#btnAskKnowledge').click();
    await page.waitForFunction(() => document.querySelector('#knowledgeDetailContent .knowledge-answer'), null, { timeout: 10000 });
    const answerText = await page.locator('#knowledgeDetailContent .knowledge-answer').innerText();
    check('Knowledge follow-up separates original, knowledge, and authority evidence',
      answerText.includes('原文依据') &&
      answerText.includes('知识库依据') &&
      answerText.includes('权威依据') &&
      answerText.includes('IMF'),
      answerText.slice(0, 220));
    await page.waitForTimeout(220);
    await page.screenshot({ path: path.join(OUT, 'feedback-v2-knowledge.png') });
    await page.locator('#btnKnowledgeBack').click();
    check('Knowledge detail back action restores the knowledge library',
      await page.locator('#view-knowledge').isVisible());
  }
  await page.locator('.nav-item[data-view="reader"]').click();

  const sideToggle = page.locator('#btnSideToggle');
  check('Right sidebar can be toggled by the user', await sideToggle.count() === 1);
  if (await sideToggle.count()) {
    await sideToggle.click();
    const hidden = await page.locator('.side-pane').isHidden();
    await sideToggle.click();
    const visible = await page.locator('.side-pane').isVisible();
    check('Right sidebar collapse state is reversible', hidden && visible);
  }

  await page.locator('.acard[data-a="fb-b"]').click();
  const done = page.locator('#btnDone');
  check('Mark-as-learned button is available before the article body',
    await done.count() === 1 && await done.isDisabled());
  await page.locator('#docScroll').evaluate(element => {
    element.scrollTop = element.scrollHeight - element.clientHeight;
  });
  await page.waitForTimeout(700);
  const stateAfterScroll = await page.evaluate(() => JSON.parse(localStorage.getItem('finlens.v1') || '{}'));
  check('Scrolling to the bottom does not auto-mark the article as learned',
    !stateAfterScroll.read?.['fb-b']?.done);
  check('Mark-as-learned button enables after reaching the bottom',
    await done.isEnabled());
  await done.click();
  await page.waitForTimeout(100);
  const stateAfterClick = await page.evaluate(() => JSON.parse(localStorage.getItem('finlens.v1') || '{}'));
  check('Clicking the enabled button records one completed article',
    stateAfterClick.read?.['fb-b']?.done === true);
  const articleLearningStatus = await page.evaluate(() => ({
    done: document.querySelector('.acard[data-a="fb-b"] .acard-learning-status')?.textContent || '',
    pending: document.querySelector('.acard[data-a="fb-a"] .acard-learning-status')?.textContent || ''
  }));
  check('Article cards show explicit completed and incomplete learning states',
    articleLearningStatus.done.includes('学习已完成') &&
    articleLearningStatus.pending.includes('学习未完成'),
    JSON.stringify(articleLearningStatus));

  await page.locator('.nav-item[data-view="cards"]').click();
  const vocabManage = page.locator('#btnVocabManage');
  check('Vocabulary bank exposes a management entry', await vocabManage.count() === 1);
  if (await vocabManage.count()) {
    await vocabManage.click();
    await page.locator('#vocabManageModal').waitFor({ state: 'visible' });
    await page.check('#vocabArticleList input[data-vocab-a="fb-b"]');
    await page.check('#vocabArticleList input[data-vocab-a="fb-c"]');
    await page.locator('#btnAddVocabFromArticles').click();
    const added = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('finlens.v1') || '{}').words || {}));
    check('Selected article vocabulary can be added to the learning bank',
      added.includes('fb-b:liquidity') && added.includes('fb-c:liquidity'),
      added.join(', '));
    const unstudiedLanes = await page.evaluate(() => {
      const counts = Object.fromEntries(
        [...document.querySelectorAll('#deckSeg button')].map(button => [button.dataset.deck, button.dataset.count])
      );
      return {
        counts,
        context: document.querySelector('#deckContext')?.textContent || ''
      };
    });
    check('New words stay in the vocabulary library without becoming review tasks',
      unstudiedLanes.counts.new === '1' &&
      unstudiedLanes.counts.due === '0' &&
      unstudiedLanes.counts.all === '1' &&
      /1 个未学习/.test(unstudiedLanes.context),
      JSON.stringify(unstudiedLanes));
    const filterButtons = await page.locator('#reviewFilterSeg button').evaluateAll(buttons =>
      buttons.map(button => ({ filter: button.dataset.reviewFilter, text: button.textContent.trim() })));
    check('Vocabulary management exposes the card and quiz filter',
      JSON.stringify(filterButtons.map(item => item.filter)) === JSON.stringify(['all', 'current', 'wrong']) &&
      filterButtons.some(item => item.text === '本篇生词') &&
      filterButtons.some(item => item.text === '易错词'),
      JSON.stringify(filterButtons));
    await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem('finlens.v1') || '{}');
      state.words['fb-b:liquidity'].lastReviewedAt = Date.now();
      state.words['fb-b:liquidity'].right = 2;
      state.words['fb-raw:baselineword'] = {
        box: 0,
        due: 0,
        right: 0,
        wrong: 0,
        seen: 1,
        added: Date.now(),
        learnedAt: 0,
        reviewEligible: false
      };
      localStorage.setItem('finlens.v1', JSON.stringify(state));
    });
    await page.locator('#vocabManageModal .modal-head [data-close]').click();
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('.nav-item[data-view="cards"]').click();
    await page.locator('#btnVocabManage').click();
    await page.selectOption('#vocabReviewFilter', 'reviewed');
    const reviewedIds = await page.locator('#vocabWordList input[data-vocab-id]').evaluateAll(items =>
      items.map(item => item.dataset.vocabId));
    check('Reviewed vocabulary can be isolated for selective cleanup',
      reviewedIds.length === 1 && reviewedIds[0] === 'fb-b:liquidity',
      reviewedIds.join(', '));
    await page.waitForTimeout(220);
    await page.screenshot({ path: path.join(OUT, 'feedback-v2-vocab-manager.png') });
    await page.check('#vocabWordList input[data-vocab-id="fb-b:liquidity"]');
    await page.locator('#btnClearSelectedVocab').click();
    const afterSelectiveClear = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('finlens.v1') || '{}').words || {}));
    check('Selectively clearing a reviewed word removes all duplicate aliases and keeps unreviewed words',
      afterSelectiveClear.length === 1 && afterSelectiveClear[0] === 'fb-raw:baselineword',
      afterSelectiveClear.join(', '));
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#btnClearAllVocab').click();
    const afterClearAll = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('finlens.v1') || '{}').words || {}));
    check('Clear-all removes the entire vocabulary bank', afterClearAll.length === 0);
    await page.locator('#vocabManageModal .modal-head [data-close]').click();
  }

  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('finlens.v1') || '{}');
    const now = Date.now();
    state.words = {
      'fb-b:liquidity': {
        box: 1, due: now + 3 * 86400000, right: 2, wrong: 1, seen: 3,
        added: now - 5 * 86400000, lastReviewedAt: now - 86400000, lastScore: 1
      },
      'fb-c:liquidity': {
        box: 4, due: now - 60000, right: 5, wrong: 1, seen: 6,
        added: now - 3 * 86400000, lastReviewedAt: now - 120000, lastScore: 0
      },
      'fb-raw:baselineword': {
        box: 0, due: 0, right: 0, wrong: 0, seen: 1,
        added: now - 86400000, learnedAt: 0, reviewEligible: false
      }
    };
    state.settings.deck = 'due';
    localStorage.setItem('finlens.v1', JSON.stringify(state));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.nav-item[data-view="cards"]').click();
  const deckLabels = await page.evaluate(() =>
    [...document.querySelectorAll('#deckSeg button')].map(button => ({
      deck: button.dataset.deck,
      text: button.textContent.trim(),
      count: button.dataset.count
    })));
  check('Review lanes expose new, due and all-vocabulary counts',
    deckLabels.length === 3 &&
    deckLabels.some(item => item.deck === 'new' && item.count === '1') &&
    deckLabels.find(item => item.deck === 'due')?.count === '1' &&
    deckLabels.find(item => item.deck === 'all')?.count === '2',
    JSON.stringify(deckLabels));
  const persistentFilterCount = await page.locator('#reviewFilterSeg button').count();
  check('Vocabulary management exposes a persistent card and quiz filter',
    persistentFilterCount === 3,
    String(persistentFilterCount));
  if (persistentFilterCount === 3) {
    await page.locator('.nav-item[data-view="reader"]').click();
    await page.locator('.acard[data-a="fb-c"]').click();
    await page.locator('.nav-item[data-view="cards"]').click();
    await page.locator('#btnVocabManage').click();
    await page.locator('#reviewFilterSeg button[data-review-filter="current"]').click();
    await page.locator('#vocabManageModal .modal-head [data-close]').click();
    await page.locator('#deckSeg button[data-deck="due"]').click();
    const filteredDue = await page.evaluate(() => ({
      word: document.querySelector('#cardsStage .fc-word')?.textContent || '',
      progress: document.querySelector('#cardsStage .fc-top span')?.textContent || ''
    }));
    check('Review filter intersects with the selected due lane',
      filteredDue.word === 'liquidity' && filteredDue.progress === '1 / 1',
      JSON.stringify(filteredDue));
    await page.locator('#btnVocabManage').click();
    await page.locator('#reviewFilterSeg button[data-review-filter="all"]').click();
    await page.locator('#vocabManageModal .modal-head [data-close]').click();
    await page.locator('#deckSeg button[data-deck="due"]').click();
  }
  const dueContext = await page.locator('#deckContext').innerText();
  const dueCard = await page.locator('#cardsStage').innerText();
  check('Due review explains its boundary and shows the latest rating',
    /只显示.*到期/.test(dueContext) &&
    dueCard.includes('上次') &&
    dueCard.includes('忘记') &&
    dueCard.includes('下次'),
    `${dueContext} | ${dueCard.slice(0, 220)}`);
  await page.locator('#cardsStage .flashcard').click();
  const ratingLabels = await page.locator('#cardsStage .rate').allInnerTexts();
  await page.locator('#cardsStage .rate.r1').click();
  const fuzzySchedule = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('finlens.v1') || '{}');
    const word = state.words['fb-c:liquidity'];
    return {
      days: (word.due - Date.now()) / 86400000,
      lastScore: word.lastScore,
      box: word.box
    };
  });
  check('Fuzzy recall uses a longer interval for mature words instead of resetting to one day',
    ratingLabels.some(label => label.includes('忘记')) &&
    ratingLabels.some(label => label.includes('模糊')) &&
    ratingLabels.some(label => label.includes('记住了')) &&
    fuzzySchedule.lastScore === 1 &&
    fuzzySchedule.box === 4 &&
    fuzzySchedule.days >= 4 &&
    fuzzySchedule.days <= 9,
    JSON.stringify(fuzzySchedule));
  await page.locator('#deckSeg button[data-deck="all"]').click();
  const allContext = await page.locator('#deckContext').innerText();
  check('All-vocabulary lane clearly includes words that are not due yet',
    /全部词汇/.test(allContext) &&
    /未到期/.test(allContext) &&
    allContext.includes('2'),
    allContext);

  await page.locator('.nav-item[data-view="reader"]').click();
  await page.locator('.acard[data-a="fb-c"]').click();
  const vocabRow = page.locator('#sideBody .vitem').first();
  check('Vocabulary rows include an English dictionary definition',
    vocabRow.count &&
    (await vocabRow.innerText()).includes('the ability to buy or sell assets quickly'),
    await vocabRow.innerText());
  const vocabStatus = vocabRow.locator('.vitem-status');
  const vocabStateBeforeClick = await page.evaluate(() =>
    JSON.stringify(Object.fromEntries(Object.entries(S.words))));
  const legacyStatusAction = await vocabRow.locator('[data-act="go"]').count();
  if (await vocabStatus.count()) {
    await vocabStatus.click();
    await page.keyboard.press('Escape');
  }
  const vocabStateAfterClick = await page.evaluate(() =>
    JSON.stringify(Object.fromEntries(Object.entries(S.words))));
  check('Reader vocabulary status is read-only and derived from the vocabulary bank',
    await vocabStatus.count() === 1 &&
    legacyStatusAction === 0 &&
    vocabStateBeforeClick === vocabStateAfterClick,
    `legacy=${legacyStatusAction}; changed=${vocabStateBeforeClick !== vocabStateAfterClick}`);

  const customFocusBaseline = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('finlens.v1') || '{}');
    return JSON.parse(JSON.stringify((state.custom || []).find(article => article.id === 'fb-raw')));
  });
  await page.locator('.acard[data-a="fb-raw"]').click();
  check('Reader does not contain a standalone re-annotation button',
    await page.locator('#btnReannotate').count() === 0);
  await page.locator('[data-open-learning]').first().click();
  await page.selectOption('#setVocabFocus', 'ielts');
  await page.locator('#settingsModal .modal-head [data-close]').click();
  await page.waitForFunction(
    () => {
      const state = JSON.parse(localStorage.getItem('finlens.v1') || '{}');
      return state.vocabOverrides?.['fb-raw']?.vocab?.length > 0;
    },
    null,
    { timeout: 15000 }
  );
  const focusedState = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('finlens.v1') || '{}');
    const base = (state.custom || []).find(article => article.id === 'fb-raw');
    const override = state.vocabOverrides?.['fb-raw'] || null;
    const effective = ARTICLES.find(article => article.id === 'fb-raw');
    return {
      base: JSON.parse(JSON.stringify(base)),
      override: JSON.parse(JSON.stringify(override)),
      effective: JSON.parse(JSON.stringify(effective)),
      status: document.querySelector('#vocabFocusStatus')?.textContent || ''
    };
  });
  const customFocusModelBody = [...modelBodies].reverse().find(body => body.includes('只生成词汇标注')) || '';
  const customFocusAnalysisBody = [...modelBodies].reverse().find(body => body.includes('只生成精读解析')) || '';
  check('Vocabulary focus creates a vocabulary override for imported articles',
    focusedState.override?.focus === 'ielts' &&
    focusedState.override?.vocab?.some(item => item.w === 'duration') &&
    focusedState.base?.vocab?.some(item => item.w === 'baselineword'));
  check('Focus refresh keeps the source article but updates its analysis',
    JSON.stringify(focusedState.base?.paragraphs) === JSON.stringify(customFocusBaseline.paragraphs) &&
    JSON.stringify(focusedState.base?.knowledge) === JSON.stringify(customFocusBaseline.knowledge) &&
    focusedState.base?.title === customFocusBaseline.title &&
    focusedState.base?.deck === customFocusBaseline.deck &&
    JSON.stringify(focusedState.effective?.knowledge) === JSON.stringify(customFocusBaseline.knowledge) &&
    focusedState.effective?.paragraphs?.every((paragraph, index) =>
      paragraph.en === customFocusBaseline.paragraphs[index].en &&
      paragraph.zh === customFocusBaseline.paragraphs[index].zh &&
      paragraph.note === customFocusBaseline.paragraphs[index].note) &&
    focusedState.effective?.paragraphs?.[0]?.analysis?.focus?.label === 'IELTS 学术表达' &&
    focusedState.effective?.paragraphs?.some(paragraph => paragraph.en.includes('{{term premium}}')),
    JSON.stringify(focusedState.effective?.paragraphs || []).slice(0, 220));
  check('Focus refresh reports that translations, knowledge and annotations were preserved',
    focusedState.status.includes('译文、知识卡与标注未改动') &&
    focusedState.status.includes('精读解析'));
  const focusedAnnotations = await page.evaluate(() => ({
    newWord: document.querySelectorAll('#doc .w[data-v="fb-raw:duration"]').length,
    oldWord: document.querySelectorAll('#doc .w[data-v="fb-raw:baselineword"]').length
  }));
  check('Vocabulary focus immediately refreshes reader annotations',
    focusedAnnotations.newWord > 0 && focusedAnnotations.oldWord === 0,
    JSON.stringify(focusedAnnotations));
  check('Focus refresh requests vocabulary and analysis with the selected focus',
    customFocusModelBody.includes('只生成词汇标注') &&
    customFocusModelBody.includes('{{term premium}}') &&
    customFocusModelBody.includes('IELTS 学术阅读高频词汇') &&
    customFocusAnalysisBody.includes('只生成精读解析') &&
    customFocusAnalysisBody.includes('IELTS 学术表达'),
    `${customFocusModelBody.slice(0, 160)} | ${customFocusAnalysisBody.slice(0, 160)}`);
  await page.reload({ waitUntil: 'networkidle' });
  const customReloaded = await page.evaluate(() => {
    const article = ARTICLES.find(item => item.id === 'fb-raw');
    return {
      vocab: article?.vocab?.map(item => item.w) || [],
      paragraphs: JSON.parse(JSON.stringify(article?.paragraphs || [])),
      knowledge: JSON.parse(JSON.stringify(article?.knowledge || []))
    };
  });
  check('Imported article focus override survives reload with updated analysis',
    customReloaded.vocab.includes('duration') &&
    customReloaded.paragraphs.every((paragraph, index) =>
      paragraph.en === customFocusBaseline.paragraphs[index].en &&
      paragraph.zh === customFocusBaseline.paragraphs[index].zh &&
      paragraph.note === customFocusBaseline.paragraphs[index].note) &&
    customReloaded.paragraphs[0]?.analysis?.focus?.label === 'IELTS 学术表达' &&
    JSON.stringify(customReloaded.knowledge) === JSON.stringify(customFocusBaseline.knowledge));

  const builtinInfo = await page.evaluate(() => {
    const article = ARTICLES.find(item =>
      item.official &&
      item.knowledge?.length &&
      item.paragraphs?.some(paragraph => /\{\{/.test(paragraph.en)));
    return { id: article?.id || '', baseline: JSON.parse(JSON.stringify(article)) };
  });
  await page.locator(`.acard[data-a="${builtinInfo.id}"]`).click();
  await page.locator('[data-open-learning]').first().click();
  await page.selectOption('#setVocabFocus', 'toefl');
  await page.locator('#settingsModal .modal-head [data-close]').click();
  await page.waitForFunction(
    id => {
      const state = JSON.parse(localStorage.getItem('finlens.v1') || '{}');
      return state.vocabOverrides?.[id]?.focus === 'toefl';
    },
    builtinInfo.id,
    { timeout: 15000 }
  );
  const builtinAfter = await page.evaluate(id => {
    const state = JSON.parse(localStorage.getItem('finlens.v1') || '{}');
    return {
      override: JSON.parse(JSON.stringify(state.vocabOverrides?.[id] || null)),
      effective: JSON.parse(JSON.stringify(ARTICLES.find(article => article.id === id))),
      storedAsCustom: (state.custom || []).some(article => article.id === id)
    };
  }, builtinInfo.id);
  check('Vocabulary override also applies to built-in articles',
    !!builtinInfo.id &&
    builtinAfter.override?.focus === 'toefl' &&
    builtinAfter.override?.vocab?.some(item => item.w === 'academic term') &&
    builtinAfter.effective?.vocab?.some(item => item.w === 'academic term') &&
    !builtinAfter.storedAsCustom);
  check('Built-in article keeps source, terms and knowledge while updating focus analysis',
    builtinAfter.effective?.paragraphs?.every((paragraph, index) =>
      paragraph.en === builtinInfo.baseline.paragraphs[index].en &&
      paragraph.zh === builtinInfo.baseline.paragraphs[index].zh &&
      paragraph.note === builtinInfo.baseline.paragraphs[index].note) &&
    builtinAfter.effective?.paragraphs?.[0]?.analysis?.focus?.label === 'TOEFL 学术阅读' &&
    JSON.stringify(builtinAfter.effective?.knowledge) === JSON.stringify(builtinInfo.baseline?.knowledge) &&
    builtinAfter.effective?.title === builtinInfo.baseline?.title &&
    builtinAfter.effective?.deck === builtinInfo.baseline?.deck &&
    builtinAfter.effective?.paragraphs?.some(paragraph => /\{\{/.test(paragraph.en)));
  await page.reload({ waitUntil: 'networkidle' });
  const builtinReloaded = await page.evaluate(id => {
    const state = JSON.parse(localStorage.getItem('finlens.v1') || '{}');
    const article = ARTICLES.find(item => item.id === id);
    return {
      overrideFocus: state.vocabOverrides?.[id]?.focus,
      vocab: article?.vocab?.map(item => item.w) || [],
      termPreserved: article?.paragraphs?.some(paragraph => /\{\{/.test(paragraph.en))
    };
  }, builtinInfo.id);
  check('Vocabulary override survives reload without mutating the built-in corpus',
    builtinReloaded.overrideFocus === 'toefl' &&
    builtinReloaded.vocab.includes('academic term') &&
    builtinReloaded.termPreserved);
  const beforeFailureOverride = await page.evaluate(id =>
    JSON.parse(JSON.stringify(JSON.parse(localStorage.getItem('finlens.v1') || '{}').vocabOverrides?.[id] || null)),
    builtinInfo.id);
  await page.route('**/api/focus-refresh', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: false, error: '模拟词汇更新失败' })
  }));
  await page.locator('[data-open-learning]').first().click();
  await page.selectOption('#setVocabFocus', 'finance');
  await page.locator('#settingsModal .modal-head [data-close]').click();
  await page.waitForFunction(
    () => document.querySelector('#vocabFocusStatus')?.textContent.includes('模拟词汇更新失败'),
    null,
    { timeout: 5000 }
  );
  const afterFailureOverride = await page.evaluate(id =>
    JSON.parse(JSON.stringify(JSON.parse(localStorage.getItem('finlens.v1') || '{}').vocabOverrides?.[id] || null)),
    builtinInfo.id);
  check('Failed vocabulary update preserves the previous override',
    JSON.stringify(afterFailureOverride) === JSON.stringify(beforeFailureOverride));
  await page.unroute('**/api/focus-refresh');
  check('No JavaScript runtime errors in feedback UI flow',
    errors.length === 0,
    errors.slice(0, 3).join(' | '));
  await page.screenshot({ path: path.join(OUT, 'feedback-v2-navigation.png') });

  const retryContext = await browser.newContext({ viewport: { width: 1512, height: 950 } });
  const retryPage = await retryContext.newPage();
  const retryErrors = [];
  const retryFetchUrls = [];
  retryPage.on('pageerror', error => retryErrors.push(error.message));
  retryPage.on('request', request => {
    if (request.url().includes('/api/fetch?url=')) retryFetchUrls.push(request.url());
  });
  retryPage.on('console', message => {
    if (message.type() === 'error' &&
        !message.text().includes('502 (Bad Gateway)') &&
        !message.text().includes('400 (Bad Request)')) retryErrors.push(message.text());
  });
  await retryPage.goto(BASE, { waitUntil: 'networkidle' });
  await retryPage.evaluate(({ baseUrl }) => {
    const state = JSON.parse(localStorage.getItem('finlens.v1') || '{}');
    state.custom = [];
    state.settings = {
      ...(state.settings || {}),
      baseUrl,
      model: 'feedback-v2-model',
      apiKey: ''
    };
    localStorage.setItem('finlens.v1', JSON.stringify(state));
  }, { baseUrl: CONTENT + '/v1' });
  await retryPage.reload({ waitUntil: 'networkidle' });
  await retryPage.locator('#btnImport').click();
  await retryPage.locator('#importSource').focus();
  await retryPage.waitForTimeout(120);
  check('Opening the import form does not steal focus from a field the user chose',
    await retryPage.evaluate(() => document.activeElement?.id === 'importSource'));
  await retryPage.fill('#importUrl', CONTENT + '/wechat-retry');
  await retryPage.fill('#importSource', 'Retry fixture');
  await retryPage.locator('#btnImportGo').click();
  await retryPage.locator('#importFailure').waitFor({ state: 'visible', timeout: 10000 });
  const failureText = await retryPage.locator('#importFailure').innerText();
  check('Retry import requests the dedicated WeChat fixture',
    retryFetchUrls.some(url => url.includes(encodeURIComponent(CONTENT + '/wechat-retry'))),
    retryFetchUrls.join(' | '));
  check('Import failure stays in the import dialog with reason and solutions',
    failureText.includes('模型密钥') &&
    failureText.includes('CC Switch') &&
    failureText.includes('重试导入') &&
    failureText.includes('测试模型连接'),
    `${failureText.slice(0, 260)} | ${retryFetchUrls.join(' | ')}`);
  check('Import failure panel appears above the extracted article preview',
    await retryPage.evaluate(() => {
      const failure = document.querySelector('#importFailure');
      const preview = document.querySelector('#importPreview');
      return !!failure && !!preview &&
        Boolean(failure.compareDocumentPosition(preview) & Node.DOCUMENT_POSITION_FOLLOWING);
    }));
  const failureAdvice = await retryPage.evaluate(() => ({
    json: importFailureAdvice(new Error('模型未返回合法 JSON（finish=length）'), { stage: 'AI 标注' }),
    upstream: importFailureAdvice(new Error('上游返回 500: gateway error'), { stage: 'AI 标注' })
  }));
  check('Import failure reasons are human-readable and specific',
    failureAdvice.json.title.includes('格式') &&
    failureAdvice.upstream.title.includes('模型服务'));
  await retryPage.locator('#btnTestImportModel').click();
  await retryPage.locator('#engineModal').waitFor({ state: 'visible' });
  await retryPage.fill('#setApiKey', 'feedback-v2-key');
  await retryPage.locator('#setApiKey').press('Tab');
  await retryPage.locator('#engineModal .modal-head [data-close]').click();
  await retryPage.locator('#btnRetryImport').click();
  await retryPage.waitForFunction(
    () => taskCenterSummary().latest?.type === 'annotation' &&
      taskCenterSummary().latest?.status === 'success',
    null,
    { timeout: 15000 }
  );
  await retryPage.evaluate(() => openTaskCenter('history'));
  const retryProgress = await retryPage.locator('#taskCenterModal').innerText();
  check('Retry import creates a completed annotation task',
    retryProgress.includes('文章标注') &&
    retryProgress.includes('标注完成') &&
    retryProgress.includes('100%'),
    retryProgress.slice(0, 220));
  await retryPage.locator('#taskCenterModal .modal-head [data-close]').click();
  await retryPage.screenshot({ path: path.join(OUT, 'import-retry-progress.png') });
  await retryPage.locator('#importModal').waitFor({ state: 'hidden', timeout: 15000 });
  check('Legacy floating annotation progress is removed',
    await retryPage.locator('#aiProgressPanel').count() === 0);
  const retriedArticle = await retryPage.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('finlens.v1') || '{}');
    return (state.custom || []).find(article => article._url.includes('/wechat'));
  });
  check('Retry completes the annotation and closes the import dialog',
    retriedArticle?.vocab?.length > 0 && retriedArticle?.knowledge?.length > 0);
  await retryPage.locator('[data-open-learning]').first().click();
  await retryPage.selectOption('#setVocabFocus', 'ielts');
  await retryPage.locator('#settingsModal .modal-head [data-close]').click();
  await retryPage.waitForFunction(id => {
    const state = JSON.parse(localStorage.getItem('finlens.v1') || '{}');
    return state.vocabOverrides?.[id]?.vocab?.length > 0 &&
      state.vocabOverrides?.[id]?.analyses?.length > 0;
  }, retriedArticle.id, { timeout: 15000 });
  const newlyImportedFocus = await retryPage.evaluate(id => {
    const state = JSON.parse(localStorage.getItem('finlens.v1') || '{}');
    const base = (state.custom || []).find(article => article.id === id);
    const effective = ARTICLES.find(article => article.id === id);
    return {
      override: JSON.parse(JSON.stringify(state.vocabOverrides?.[id] || null)),
      paragraphBodiesUnchanged: effective?.paragraphs?.every((paragraph, index) =>
        paragraph.en === base?.paragraphs?.[index]?.en &&
        paragraph.zh === base?.paragraphs?.[index]?.zh &&
        paragraph.note === base?.paragraphs?.[index]?.note),
      analysisUpdated: effective?.paragraphs?.every(paragraph =>
        paragraph.analysis?.focus?.label === 'IELTS 学术表达'),
      knowledgeUnchanged: JSON.stringify(effective?.knowledge) === JSON.stringify(base?.knowledge),
      baselineVocab: base?.vocab?.map(item => item.w) || [],
      effectiveVocab: effective?.vocab?.map(item => item.w) || []
    };
  }, retriedArticle.id);
  check('Newly imported article receives a synchronized vocabulary and analysis override',
    newlyImportedFocus.override?.focus === 'ielts' &&
    newlyImportedFocus.override?.vocab?.some(item => item.w === 'duration') &&
    newlyImportedFocus.override?.analyses?.length > 0 &&
    newlyImportedFocus.effectiveVocab.includes('duration') &&
    !newlyImportedFocus.baselineVocab.includes('duration'));
  check('Newly imported article keeps source and knowledge while analysis follows the focus',
    newlyImportedFocus.paragraphBodiesUnchanged &&
    newlyImportedFocus.analysisUpdated &&
    newlyImportedFocus.knowledgeUnchanged);
  const retriedFields = JSON.stringify(retriedArticle || {});
  check('AI annotation HTML entities are decoded across every learning field',
    retriedFields.includes("investor's") &&
    retriedFields.includes("market's ability") &&
    retriedFields.includes("It's easier") &&
    !/&#x27;|&amp;/.test(retriedFields),
    retriedFields.slice(0, 300));
  check('Retry flow has no JavaScript runtime errors', retryErrors.length === 0, retryErrors.slice(0, 3).join(' | '));
  await retryContext.close();

  const focusContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const focusPage = await focusContext.newPage();
  await focusPage.goto(BASE, { waitUntil: 'networkidle' });
  const focusCredential = await focusPage.evaluate(async ({ baseUrl, model }) => {
    const response = await fetch('/api/credentials', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Focus manager test',
        baseUrl,
        model,
        apiKey: 'feedback-v2-key',
        automation: true
      })
    });
    return response.json();
  }, { baseUrl: CONTENT + '/v1', model: 'feedback-v2-model' });
  await focusPage.evaluate(({ credentialId }) => {
    const state = JSON.parse(localStorage.getItem('finlens.v1') || '{}');
    state.settings = {
      ...(state.settings || {}),
      baseUrl: 'http://127.0.0.1:8894/v1',
      model: 'feedback-v2-model',
      apiKey: '',
      localCredentialId: credentialId,
      ccSwitchProviderId: '',
      ccSwitchAppType: '',
      vocabFocus: 'balanced'
    };
    localStorage.setItem('finlens.v1', JSON.stringify(state));
  }, { credentialId: focusCredential.credential?.id || '' });
  await focusPage.reload({ waitUntil: 'networkidle' });
  const focusArticleId = await focusPage.evaluate(() =>
    ARTICLES.find(article =>
      article.vocab.some(item => normalizeVocabularyWord(item.w) === 'liquidity'))?.id || ARTICLES[0].id);
  await focusPage.locator(`.acard[data-a="${focusArticleId}"]`).click();
  const focusArticle = await focusPage.evaluate(() => {
    const article = cur;
    const words = article.vocab.map(item => normalizeVocabularyWord(item.w));
    const preservedOldWord = words.includes('surge') ? 'surge' : words[0] || '';
    const removedOldWord = words.find(word => word !== preservedOldWord) || preservedOldWord;
    return {
      id: article.id,
      title: article.title,
      words,
      preservedOldWord,
      removedOldWord
    };
  });
  await focusPage.locator('.nav-item[data-view="cards"]').click();
  await focusPage.locator('#btnVocabManage').click();
  const focusControls = await focusPage.evaluate(() => ({
    focus: document.querySelector('#vocabManageFocus')?.tagName || '',
    scopes: [...document.querySelectorAll('#vocabFocusScopeSeg button')].map(button => button.dataset.focusScope),
    preview: document.querySelector('#btnPreviewVocabFocus')?.textContent || ''
  }));
  check('Vocabulary management exposes focus, scope and diff preview controls',
    focusControls.focus === 'SELECT' &&
    JSON.stringify(focusControls.scopes) === JSON.stringify(['current', 'selected', 'all']) &&
    /预览/.test(focusControls.preview),
    JSON.stringify(focusControls));
  check('Focus-management fixture has importable vocabulary',
    focusArticle.words.length > 0,
    JSON.stringify(focusArticle));
  await focusPage.check(`#vocabArticleList input[data-vocab-a="${focusArticle.id}"]`);
  await focusPage.locator('#btnAddVocabFromArticles').click();
  const preservedStateId = await focusPage.evaluate(({ articleId, preservedOldWord }) => {
    const article = ARTICLES.find(item => item.id === articleId);
    const vocab = article.vocab.find(item => normalizeVocabularyWord(item.w) === preservedOldWord);
    const id = wordKey(articleId, vocab.w);
    S.words[id] = {
      box: 4,
      due: Date.now() + 7 * DAY_MS,
      right: 5,
      wrong: 1,
      seen: 6,
      added: Date.now() - DAY_MS,
      learnedAt: Date.now() - DAY_MS,
      lastReviewedAt: Date.now(),
      lastScore: 2,
      reviewEligible: true
    };
    save();
    return id;
  }, { articleId: focusArticle.id, preservedOldWord: focusArticle.preservedOldWord });
  const availableArticleIds = await focusPage.locator('#vocabArticleList input[data-vocab-a]').evaluateAll(inputs =>
    inputs.slice(0, 2).map(input => input.dataset.vocabA));
  for (const articleId of availableArticleIds) {
    await focusPage.check(`#vocabArticleList input[data-vocab-a="${articleId}"]`);
  }
  await focusPage.locator('#vocabFocusScopeSeg button[data-focus-scope="selected"]').click();
  await focusPage.selectOption('#vocabManageFocus', 'ielts');
  await focusPage.locator('#btnPreviewVocabFocus').click();
  await focusPage.locator('#vocabFocusPreview').waitFor({ state: 'visible', timeout: 15000 });
  const selectedPreview = await focusPage.evaluate(() => ({
    items: document.querySelectorAll('#vocabFocusPreview .vocab-focus-preview-item').length,
    text: document.querySelector('#vocabFocusPreview')?.textContent || '',
    overrides: Object.keys(S.vocabOverrides || {}).length
  }));
  check('Focus preview supports selected articles without applying changes',
    selectedPreview.items >= 2 &&
    selectedPreview.text.includes('duration') &&
    selectedPreview.text.includes('liquidity') &&
    selectedPreview.overrides === 0,
    JSON.stringify(selectedPreview));
  await focusPage.locator('#btnCancelVocabFocus').click();
  await focusPage.locator('#vocabFocusScopeSeg button[data-focus-scope="current"]').click();
  await focusPage.selectOption('#vocabManageFocus', 'ielts');
  await focusPage.locator('#btnPreviewVocabFocus').click();
  await focusPage.locator('#vocabFocusPreview').waitFor({ state: 'visible', timeout: 15000 });
  const currentPreview = await focusPage.evaluate(articleId => ({
    items: document.querySelectorAll('#vocabFocusPreview .vocab-focus-preview-item').length,
    text: document.querySelector('#vocabFocusPreview')?.textContent || '',
    overrideExists: Boolean(S.vocabOverrides?.[articleId]),
    applyEnabled: !document.querySelector('#btnApplyVocabFocus')?.disabled
  }), focusArticle.id);
  check('Current-article focus preview stays pending until confirmation',
    currentPreview.items === 1 &&
    currentPreview.text.includes('duration') &&
    currentPreview.text.includes('liquidity') &&
    !currentPreview.overrideExists &&
    currentPreview.applyEnabled,
    JSON.stringify(currentPreview));
  await focusPage.screenshot({ path: path.join(OUT, 'vocab-focus-preview.png') });
  focusPage.once('dialog', dialog => dialog.accept());
  await focusPage.locator('#btnApplyVocabFocus').click();
  await focusPage.waitForFunction(
    articleId => Boolean(S.vocabOverrides?.[articleId]?.vocab?.some(item => normalizeVocabularyWord(item.w) === 'duration')),
    focusArticle.id,
    { timeout: 15000 }
  );
  const appliedFocus = await focusPage.evaluate(({ articleId, removedOldWord, preservedId }) => {
    const article = ARTICLES.find(item => item.id === articleId);
    const words = article.vocab.map(item => normalizeVocabularyWord(item.w));
    return {
      words,
      focus: S.vocabOverrides?.[articleId]?.focus,
      globalFocus: S.settings.vocabFocus,
      removedWordState: S.words[wordKey(articleId, removedOldWord)] || null,
      preservedState: S.words[preservedId] || null,
      addedDurationState: S.words[wordKey(articleId, 'duration')] || null,
      analysesCount: S.vocabOverrides?.[articleId]?.analyses?.length || 0,
      analysisFocusLabel: article.paragraphs[0]?.analysis?.focus?.label || '',
      previewHidden: document.querySelector('#vocabFocusPreview')?.hidden
    };
  }, {
    articleId: focusArticle.id,
    removedOldWord: focusArticle.removedOldWord,
    preservedId: preservedStateId
  });
  check('Applying focus replaces changed vocabulary while preserving unchanged SRS state',
    appliedFocus.words.includes('duration') &&
    appliedFocus.words.includes('liquidity') &&
    appliedFocus.words.includes(focusArticle.preservedOldWord) &&
    !appliedFocus.words.includes(focusArticle.removedOldWord) &&
    appliedFocus.focus === 'ielts' &&
    appliedFocus.globalFocus === 'ielts' &&
    appliedFocus.preservedState?.right === 5 &&
    appliedFocus.preservedState?.box === 4 &&
    appliedFocus.addedDurationState &&
    !appliedFocus.addedDurationState.lastReviewedAt &&
    !appliedFocus.removedWordState &&
    appliedFocus.analysesCount === 5 &&
    appliedFocus.analysisFocusLabel === 'IELTS 学术表达' &&
    appliedFocus.previewHidden,
    JSON.stringify(appliedFocus));
  await focusContext.close();

  const cardContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const cardPage = await cardContext.newPage();
  await cardPage.goto(BASE, { waitUntil: 'networkidle' });
  await cardPage.locator('.nav-item[data-view="cards"]').click();
  if (await cardPage.locator('#btnRefill').count()) await cardPage.locator('#btnRefill').click();
  await cardPage.locator('#deckSeg button[data-deck="all"]').click();
  await cardPage.locator('#cardModeSeg button[data-cmode="flip"]').click();
  const firstSessionWord = await cardPage.locator('.fc-word').innerText();
  await cardPage.locator('.flashcard').click();
  await cardPage.locator('.rate[data-score="2"]').click();
  const resumedSessionWord = await cardPage.locator('.fc-word').innerText();
  const resumedSessionProgress = await cardPage.locator('.fc-top span').first().innerText();
  await cardPage.reload({ waitUntil: 'networkidle' });
  await cardPage.locator('.nav-item[data-view="cards"]').click();
  check('Card queue resumes the same word and position after reload',
    await cardPage.locator('.fc-word').innerText() === resumedSessionWord &&
    await cardPage.locator('.fc-top span').first().innerText() === resumedSessionProgress,
    `first=${firstSessionWord}; resumed=${resumedSessionWord}; progress=${resumedSessionProgress}`);
  const studiedCardWords = [];
  const changedAfterReveal = [];
  for (let index = 0; index < 18; index += 1) {
    const wordBeforeReveal = await cardPage.locator('.fc-word').innerText();
    studiedCardWords.push(wordBeforeReveal);
    await cardPage.locator('.flashcard').click();
    const wordAfterReveal = await cardPage.locator('.fc-word').innerText();
    if (wordBeforeReveal !== wordAfterReveal) {
      changedAfterReveal.push(`${wordBeforeReveal}->${wordAfterReveal}`);
    }
    await cardPage.locator('.rate[data-score="2"]').click();
  }
  check('Studying all vocabulary does not skip and repeat cards after rating',
    studiedCardWords.length === new Set(studiedCardWords.map(word => word.toLowerCase())).size &&
    changedAfterReveal.length === 0,
    `${studiedCardWords.join(' > ')} | changed=${changedAfterReveal.join(', ')}`);
  const cardWordBeforeFlash = await cardPage.locator('.fc-word').innerText();
  const reviewStateBeforeFlash = await cardPage.evaluate(() =>
    JSON.stringify(Object.fromEntries(Object.entries(S.words).map(([id, state]) => [id, {
      due: state.due,
      learnedAt: state.learnedAt,
      lastReviewedAt: state.lastReviewedAt,
      lastScore: state.lastScore
    }]))));
  await cardPage.locator('#cardModeSeg button[data-cmode="flash"]').click();
  const flashContext = await cardPage.locator('#deckContext').innerText();
  check('Flash mode ignores learned and due filters',
    /全部.*词汇/.test(flashContext) &&
    !/待复习/.test(flashContext) &&
    await cardPage.locator('#btnFlashStart').isVisible(),
    flashContext);
  await cardPage.locator('#btnFlashStart').click();
  await cardPage.waitForTimeout(2300);
  await cardPage.locator('#btnFlashStop').click();
  const reviewStateAfterFlash = await cardPage.evaluate(() =>
    JSON.stringify(Object.fromEntries(Object.entries(S.words).map(([id, state]) => [id, {
      due: state.due,
      learnedAt: state.learnedAt,
      lastReviewedAt: state.lastReviewedAt,
      lastScore: state.lastScore
    }]))));
  await cardPage.locator('#cardModeSeg button[data-cmode="flip"]').click();
  check('Flash and card modes keep independent progress and review state',
    reviewStateAfterFlash === reviewStateBeforeFlash &&
    await cardPage.locator('.fc-word').innerText() === cardWordBeforeFlash,
    `before=${cardWordBeforeFlash}; after=${await cardPage.locator('.fc-word').innerText()}`);
  await cardPage.locator('#cardModeSeg button[data-cmode="quiz"]').click();
  await cardPage.locator('.quiz-opt').first().click();
  await cardPage.locator('#btnQuizNext').click();
  const quizWordBeforeFlash = await cardPage.locator('.fc-word').innerText();
  const quizProgressBeforeFlash = await cardPage.locator('.fc-ipa').first().innerText();
  await cardPage.reload({ waitUntil: 'networkidle' });
  await cardPage.locator('.nav-item[data-view="cards"]').click();
  check('Quiz queue resumes the same word and progress after reload',
    await cardPage.locator('.fc-word').innerText() === quizWordBeforeFlash &&
    await cardPage.locator('.fc-ipa').first().innerText() === quizProgressBeforeFlash,
    `before=${quizProgressBeforeFlash}:${quizWordBeforeFlash}; after=${await cardPage.locator('.fc-ipa').first().innerText()}:${await cardPage.locator('.fc-word').innerText()}`);
  await cardPage.locator('#cardModeSeg button[data-cmode="flash"]').click();
  await cardPage.locator('#cardModeSeg button[data-cmode="quiz"]').click();
  check('Quiz and flash modes keep independent progress',
    await cardPage.locator('.fc-word').innerText() === quizWordBeforeFlash &&
    await cardPage.locator('.fc-ipa').first().innerText() === quizProgressBeforeFlash,
    `before=${quizProgressBeforeFlash}:${quizWordBeforeFlash}; after=${await cardPage.locator('.fc-ipa').first().innerText()}:${await cardPage.locator('.fc-word').innerText()}`);
  await cardContext.close();

  const queueContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const queuePage = await queueContext.newPage();
  await queuePage.goto(BASE, { waitUntil: 'networkidle' });
  await queuePage.locator('.nav-item[data-view="cards"]').click();
  if (await queuePage.locator('#btnRefill').count()) await queuePage.locator('#btnRefill').click();
  await queuePage.locator('#deckSeg button[data-deck="all"]').click();
  await queuePage.locator('#cardModeSeg button[data-cmode="flip"]').click();
  for (let index = 0; index < 2; index += 1) {
    await queuePage.locator('.flashcard').click();
    await queuePage.locator('.rate[data-score="2"]').click();
  }
  const wordAfterCompletedItems = await queuePage.locator('.fc-word').innerText();
  await queuePage.evaluate(() => {
    const session = S.reviewSessions[reviewSessionKey('flip')];
    const completedKey = session.keys[0];
    const completed = activeVocabularyEntries().find(entry => entry.key === completedKey);
    for (const id of completed?.ids || []) delete S.words[id];
    save();
    resetCardRuntime();
    renderCards();
  });
  const queueAfterHistoryRemoval = await queuePage.evaluate(() => ({
    word: document.querySelector('#cardsStage .fc-word')?.textContent || '',
    progress: document.querySelector('#cardsStage .fc-top span')?.textContent || '',
    total: S.reviewSessions[reviewSessionKey('flip')]?.keys?.length || 0
  }));
  check('Removing a completed word does not skip the current review card',
    queueAfterHistoryRemoval.word === wordAfterCompletedItems &&
    queueAfterHistoryRemoval.progress.startsWith('2 / '),
    `expected=${wordAfterCompletedItems}; actual=${JSON.stringify(queueAfterHistoryRemoval)}`);
  await queueContext.close();

  const noteContext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const notePage = await noteContext.newPage();
  await notePage.goto(BASE, { waitUntil: 'networkidle' });
  await notePage.locator('.acard').first().click();
  await notePage.locator('.para[data-i="0"]').hover();
  await notePage.locator('.para[data-i="0"] .op-mark').click();
  await notePage.locator('#sideTabs button[data-tab="notes"]').click();
  const paragraphMark = notePage.locator('.mark-item[data-mark-type="paragraph"]').first();
  check('Paragraph marking creates a typed annotation with note input',
    await paragraphMark.count() === 1 &&
    await paragraphMark.locator('.mark-note').count() === 1);
  const paragraphMarkId = await paragraphMark.getAttribute('data-mark-id');
  await paragraphMark.locator('.mark-note').fill('整段笔记：通胀影响的分配差异。');

  await notePage.evaluate(() => {
    const paragraph = document.querySelector('.para[data-i="0"] .para-en');
    const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node && node.textContent.trim().length < 24) node = walker.nextNode();
    if (!node) throw new Error('No selectable text node');
    const range = document.createRange();
    range.setStart(node, 0);
    range.setEnd(node, Math.min(28, node.textContent.length));
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  });
  await notePage.locator('#btnMarkSelection').waitFor({ state: 'visible', timeout: 5000 });
  check('Multi-word selection keeps annotation without offering lookup',
    await notePage.locator('#btnMarkSelection').isVisible() &&
    !(await notePage.locator('#btnLookupSelection').isVisible()));
  await notePage.locator('#btnMarkSelection').click();
  const sentenceMark = notePage.locator('.mark-item[data-mark-type="sentence"]').first();
  const sentenceMarkId = await sentenceMark.getAttribute('data-mark-id');
  check('Selected sentence creates an independent annotation and inline highlight',
    await sentenceMark.count() === 1 &&
    await notePage.locator(`.para[data-i="0"] .sentence-mark[data-mark-id="${sentenceMarkId}"]`).count() > 0,
    sentenceMarkId || '');
  await sentenceMark.locator('.mark-note').fill('句子笔记：注意实际购买力下降。');
  await notePage.screenshot({ path: path.join(OUT, 'annotations-v3.png') });

  await notePage.reload({ waitUntil: 'networkidle' });
  await notePage.locator('#sideTabs button[data-tab="notes"]').click();
  const restoredNotes = await notePage.locator('.mark-item').evaluateAll(items =>
    items.map(item => ({
      id: item.dataset.markId,
      type: item.dataset.markType,
      note: item.querySelector('.mark-note')?.value || ''
    })));
  check('Paragraph and sentence notes survive reload together',
    restoredNotes.length === 2 &&
    restoredNotes.some(item => item.id === paragraphMarkId && item.type === 'paragraph' && item.note.includes('整段笔记')) &&
    restoredNotes.some(item => item.id === sentenceMarkId && item.type === 'sentence' && item.note.includes('句子笔记')) &&
    await notePage.locator(`.para[data-i="0"] .sentence-mark[data-mark-id="${sentenceMarkId}"]`).count() > 0,
    JSON.stringify(restoredNotes));

  await notePage.locator('.nav-item[data-view="export"]').click();
  await notePage.locator(`#exportList input[value="${await notePage.evaluate(() => S.lastArticle)}"]`).check();
  if (!(await notePage.locator('#expNotes').isChecked())) await notePage.locator('#expNotes').check();
  const noteDownload = notePage.waitForEvent('download');
  await notePage.locator('#btnExportMd').click();
  const downloadedNotes = await noteDownload;
  const downloadedNotesPath = await downloadedNotes.path();
  const downloadedNotesText = fs.readFileSync(downloadedNotesPath, 'utf8');
  check('Paragraph and sentence notes are included in Markdown export',
    downloadedNotesText.includes('### 我的标注') &&
    downloadedNotesText.includes('整段笔记：通胀影响的分配差异。') &&
    downloadedNotesText.includes('句子笔记：注意实际购买力下降。'));

  await notePage.locator('.nav-item[data-view="reader"]').click();
  await notePage.locator('#sideTabs button[data-tab="notes"]').click();
  await notePage.locator(`[data-remove-mark="${sentenceMarkId}"]`).click();
  check('Deleting a sentence annotation also removes its inline highlight',
    await notePage.locator(`.mark-item[data-mark-id="${sentenceMarkId}"]`).count() === 0 &&
    await notePage.locator(`.para[data-i="0"] .sentence-mark[data-mark-id="${sentenceMarkId}"]`).count() === 0);
  await noteContext.close();

  const lookupContext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  await lookupContext.addInitScript(({ articles, baseUrl }) => {
    localStorage.setItem('finlens.dataResetVersion', '2026-11-03-feedback-reset-v1');
    const state = JSON.parse(localStorage.getItem('finlens.v1') || '{}');
    state.custom = articles;
    state.read = {};
    state.words = {};
    state.marks = {};
    state.summaries = {};
    state.tutor = {};
    state.dictionaries = {};
    state.settings = {
      ...(state.settings || {}),
      mode: 'intensive', zh: 'off', vocab: true, know: true,
      readingDefaultsVersion: 2, articleSort: 'date-desc', sideOpen: true,
      baseUrl, apiKey: '', model: ''
    };
    state.lastArticle = articles[0].id;
    localStorage.setItem('finlens.v1', JSON.stringify(state));
  }, { articles: seedArticles, baseUrl: CONTENT + '/v1' });
  const lookupPage = await lookupContext.newPage();
  const dictionaryRequests = [];
  lookupPage.on('request', request => {
    if (request.url().includes('/api/dictionary')) {
      let body = {};
      try { body = request.postDataJSON(); } catch {}
      dictionaryRequests.push(body);
    }
  });
  await lookupPage.goto(BASE, { waitUntil: 'networkidle' });
  await lookupPage.evaluate(() => openArticle('fb-a'));
  await lookupPage.locator('.para[data-i="0"] .para-en').waitFor({ state: 'visible' });
  await lookupPage.evaluate(() => {
    const paragraph = document.querySelector('.para[data-i="0"] .para-en');
    const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    let offset = -1;
    while (node) {
      offset = node.textContent.indexOf('finance');
      if (offset >= 0) break;
      node = walker.nextNode();
    }
    if (!node || offset < 0) throw new Error('No selectable word fixture');
    const range = document.createRange();
    range.setStart(node, offset);
    range.setEnd(node, offset + 'finance'.length);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  });
  await lookupPage.waitForTimeout(180);
  check('Single-word selection offers both lookup and annotation actions',
    await lookupPage.locator('#btnLookupSelection').isVisible() &&
    await lookupPage.locator('#btnMarkSelection').isVisible());
  check('Selecting a word does not query the dictionary before lookup is requested',
    dictionaryRequests.length === 0,
    `requests=${dictionaryRequests.length}`);
  await lookupPage.locator('#btnLookupSelection').click();
  await lookupPage.locator('#popover .dict-ecdict-source').waitFor({ state: 'visible', timeout: 10000 });
  const lookupRequest = dictionaryRequests[0] || {};
  check('Selection lookup sends the selected word with its current sentence',
    dictionaryRequests.length === 1 &&
    lookupRequest.word === 'finance' &&
    /finance/i.test(lookupRequest.sentence || '') &&
    /investors/i.test(lookupRequest.sentence || ''),
    JSON.stringify(lookupRequest).slice(0, 300));
  const lookupPopoverText = await lookupPage.locator('#popover').innerText();
  check('Selection lookup renders contextual meaning and offline dictionary source',
    lookupPopoverText.includes('finance') &&
    lookupPopoverText.includes('当前语境') &&
    lookupPopoverText.includes('ECDICT 离线') &&
    /finance/i.test(await lookupPage.locator('#popover .pop-context').innerText()) &&
    await lookupPage.locator('#popover .dict-sense').count() > 0,
    lookupPopoverText.slice(0, 320));
  await lookupPage.screenshot({ path: path.join(OUT, 'selection-lookup-v1.png') });
  await lookupContext.close();

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true
  });
  const mobilePage = await mobileContext.newPage();
  const mobileErrors = [];
  mobilePage.on('pageerror', error => mobileErrors.push(error.message));
  await mobilePage.goto(BASE, { waitUntil: 'networkidle' });
  await mobilePage.locator('#toast').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  await mobilePage.locator('.nav-item[data-view="cards"]').click();
  const mobileCardsOverflow = await mobilePage.evaluate(() =>
    document.documentElement.scrollWidth - window.innerWidth);
  check('Mobile review view has no horizontal overflow',
    mobileCardsOverflow <= 1 &&
    await mobilePage.locator('#deckContext').isVisible() &&
    mobileErrors.length === 0,
    `overflow=${mobileCardsOverflow}; errors=${mobileErrors.slice(0, 2).join(' | ')}`);
  await mobilePage.screenshot({ path: path.join(OUT, 'mobile-review-v3.png'), fullPage: true });
  await mobilePage.locator('#btnVocabManage').click();
  const mobileFocusManageOverflow = await mobilePage.evaluate(() =>
    document.documentElement.scrollWidth - window.innerWidth);
  check('Mobile vocabulary focus manager fits the viewport',
    mobileFocusManageOverflow <= 1 &&
    await mobilePage.locator('#vocabManageFocus').isVisible() &&
    await mobilePage.locator('#vocabFocusScopeSeg').isVisible() &&
    await mobilePage.locator('#btnPreviewVocabFocus').isVisible(),
    `overflow=${mobileFocusManageOverflow}`);
  await mobilePage.screenshot({ path: path.join(OUT, 'mobile-vocab-focus-manager.png'), fullPage: true });
  await mobilePage.locator('#vocabManageModal .modal-head [data-close]').click();
  await mobilePage.locator('.nav-item[data-view="knowledge"]').click();
  await mobilePage.locator('#kbGrid .kb-card').first().click();
  const mobileKnowledgeOverflow = await mobilePage.evaluate(() =>
    document.documentElement.scrollWidth - window.innerWidth);
  check('Mobile knowledge detail fits the viewport',
    mobileKnowledgeOverflow <= 1 &&
    await mobilePage.locator('#view-knowledge-detail').isVisible() &&
    await mobilePage.locator('#knowledgeDetailContent').isVisible(),
    `overflow=${mobileKnowledgeOverflow}`);
  await mobilePage.screenshot({ path: path.join(OUT, 'mobile-knowledge-v3.png'), fullPage: true });
  await mobilePage.locator('.nav-item[data-view="reader"]').click();
  await mobilePage.evaluate(() => {
    const paragraph = document.querySelector('.para[data-i="0"] .para-en');
    const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    let match = null;
    while (node) {
      match = node.textContent.match(/[A-Za-z][A-Za-z'-]{2,}/);
      if (match) break;
      node = walker.nextNode();
    }
    if (!node || !match || match.index === undefined) throw new Error('No selectable mobile word fixture');
    const range = document.createRange();
    range.setStart(node, match.index);
    range.setEnd(node, match.index + match[0].length);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  });
  await mobilePage.locator('#btnMarkSelection').waitFor({ state: 'visible', timeout: 5000 });
  const selectionToolbarBox = await mobilePage.locator('#selectionToolbar').boundingBox();
  check('Mobile lookup and annotation toolbar stays inside the viewport',
    await mobilePage.locator('#btnLookupSelection').isVisible() &&
    await mobilePage.locator('#btnMarkSelection').isVisible() &&
    !!selectionToolbarBox &&
    selectionToolbarBox.x >= 0 &&
    selectionToolbarBox.y >= 0 &&
    selectionToolbarBox.x + selectionToolbarBox.width <= 390 &&
    selectionToolbarBox.y + selectionToolbarBox.height <= 844,
    JSON.stringify(selectionToolbarBox));
  await mobilePage.screenshot({ path: path.join(OUT, 'mobile-annotation-selection-v3.png'), fullPage: true });
  await mobileContext.close();
} finally {
  if (browser) await browser.close();
  if (server && !server.killed) server.kill();
  contentServer.close();
}

function paragraphsContain(paragraphs, pattern) {
  return (paragraphs || []).some(paragraph => pattern.test(String(paragraph)));
}

const failed = results.filter(result => !result.pass);
console.log(`\n=== ${results.length - failed.length}/${results.length} passed ===`);
if (failed.length) {
  for (const result of failed) console.log(' -', result.name, result.extra);
  process.exitCode = 1;
}
