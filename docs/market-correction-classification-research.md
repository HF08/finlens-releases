# 三项术语分类研究：market correction、circular financing、capex vs cash flow

更新日期：2026-11-11
适用范围：FinLens 知识库分类与卡片入库建议
状态：仅研究与文档，不修改应用代码

## 一、结论摘要

| 术语 | 默认分类 | 主要例外交叉 | 建议 cardType | 建议置信度 |
|---|---|---|---|---|
| market correction / 股市修正 | `finance` | 非金融资产或一般经济价格的修正回退 `background` | `phenomenon` | `0.97` |
| circular financing / 循环融资 | `finance + background`（有 AI/科技产业闭环证据时） | 纯会计循环、无真实融资关系的产业活动回退 `background` | `mechanism` | `0.86-0.92` |
| capital expenditure / 资本支出 | 术语本身为 `background` | 核心分析现金流、流动性或融资缺口时 `finance + background`；有完整计算程序时 `finance + method` | `concept` / `mechanism` / `method` | `0.91-0.96` |

核心原则：

1. 先判断卡片主要解释对象，不按单个词形分类。
2. `market correction` 是金融资产价格现象，不是 “market” 或 “correction” 的字面组合。
3. `circular financing` 不是统一监管术语，必须看到可命名的融资闭环或供应商融资关系；循环信贷、rollover financing 不能仅凭 “circular” 近似词归入同一概念。
4. `capital expenditure` 单独出现仍是实体投资或会计概念；只有卡片主要解释其现金流、融资、流动性或估值后果，才进入金融；只有具备完整可复现计算链，才进入方法。
5. 金融影响是结果不等于金融本体，机制完整不等于分析方法。

## 二、判定标准

### 金融本体证据

主解释对象至少命中一类：

- 金融资产、证券、市场价格、收益率、利差、估值或风险溢价。
- 债权、债务、贷款、担保、租赁义务、流动性或融资缺口。
- 投资、采购、云承诺与供应商融资之间形成可识别的资金闭环或信用暴露。
- 现金流、自由现金流、资本成本、资本结构或融资约束。

### 背景层证据

- 技术路线、算力基础设施、设备采购、厂房建设、产能或供应链本身。
- 一般会计循环、记账重分类、内部资金划转，但没有可识别的融资关系或金融暴露。
- 产业战略、商业合作、客户订单或云服务合同本身。
- 一般经济、房地产、商品供需或产业价格修正，而不是金融资产价格修正。

### 方法程序证据

方法层需要同时满足：

1. 明确分析目的；
2. 明确输入、期间、口径和假设；
3. 至少两个可执行计算或推断步骤；
4. 明确输出指标及解释规则；
5. 有适用边界、误差或验证要求；
6. 可迁移到不同公司、文章或数据集。

只有名称含 `model`、`analysis`、`framework`，或只描述一条传导链，不构成方法证据。

## 三、market correction / 股市修正

### 定义

在金融语境中，`market correction` 通常指证券或广泛股票市场从近期高点出现明显回撤，属于资产价格现象。Nasdaq 官方词汇将 market correction 描述为股票市场价格相对短期的下跌，常被视为高估价格向公司价值附近回归。

市场常用的操作阈值是：

- `correction`：从近期收盘高点回撤约 `10%`，通常尚未达到 `20%`。
- `bear market`：通常指从近期高点回撤约 `20%` 或以上，并可能持续更久。
- `crash`：强调下跌速度快、幅度大、交易或流动性秩序受冲击，不能只按固定回撤幅度判断。
- `volatility`：价格波动幅度和频率，是波动状态，不是有方向的回撤事件。
- `market risk`：市场因子造成损失的风险暴露；correction 是该风险实现后的一种价格结果。

需要特别说明：`10%` 和 `20%` 是市场惯例和媒体常用口径，不是所有交易所、监管机构或法律文本统一规定的法定阈值。FinLens 不应把 10% 当作绝对法律定义；若原文明确给出阈值或使用收盘价、盘中价、特定指数，应按原文口径记录。

### 为什么主分类是金融

`market correction` 的主要解释对象是金融资产价格和投资者面临的回撤风险，具备直接金融本体证据：

- 对象是股票、债券、基金、指数或其他可交易资产的价格。
- 现象通过收益率、回撤、波动率和风险暴露计量。
- 解释重心在市场价格、估值和投资者损失，而不是外部制度或分析程序。

### FinLens 建议

#### 标准金融语境

```json
{
  "category": "finance",
  "categories": ["finance"],
  "cardType": "phenomenon",
  "categoryConfidence": 0.97
}
```

适用：

- 股票市场、指数、证券组合或金融资产价格从近期高点回撤。
- 讨论 correction 与 bear market、crash、volatility 或 market risk 的区别。
- 讨论回撤对投资者、估值或资产配置的影响。

#### 回退为背景

```json
{
  "category": "background",
  "categories": ["background"],
  "cardType": "phenomenon",
  "categoryConfidence": 0.82
}
```

适用：

- 房地产、一般商品、产业供需或企业定价中的 “价格修正”，且没有金融资产定价关系。
- 文章只把 correction 用作一般经济调整或库存周期描述。
- 卡片核心是产业行动、技术采用或实体投资，而不是金融市场价格。

#### 方法边界

单独的 `correction` 事件不是方法。只有卡片主要解释一套可复现的回撤计算、阈值检验或风险计量程序，并且满足方法程序证据时，才考虑：

```json
{
  "category": "finance",
  "categories": ["finance", "method"],
  "cardType": "method",
  "categoryConfidence": 0.88
}
```

若只是“某指数下跌 10% 被称为修正”，仍应使用 `finance + phenomenon`，不要因出现百分比就升级为方法。

## 四、circular financing / 循环融资

### 术语边界

`circular financing` 没有像 DCF、VaR 或 revolving credit facility 那样的统一、单一监管定义。它在不同语境中可能指：

1. **AI/科技互惠资金闭环**：投资方、客户、供应商或云服务商之间形成投资、采购、算力承诺、预付款、应收应付或供应商融资的相互依赖，使收入或现金流部分依赖同一闭环中的另一主体。
2. **供应商融资/反向保理**：供应商从金融机构提前收款，采购方在较晚日期向金融机构付款；核心是应付账款、融资安排和流动性风险。
3. **循环信贷或 rollover financing**：标准金融产品和债务续作安排，不应仅因名称接近而称为 circular financing。
4. **会计循环或 round-tripping**：资金或交易在关联方、客户、供应商之间往返，可能用于虚增收入、资产或现金流；是否金融，取决于卡片主要解释会计操纵、证券欺诈、融资关系还是资本市场后果。

本文建议 FinLens 使用以下功能性定义：

> 循环融资是指一项融资或商业安排中，资金、投资、采购、云承诺、供应商融资或偿付义务在相互关联的主体之间形成闭环，使一方的收入、现金流、资产价值或偿债能力实质依赖同一闭环中另一方的投资、采购或再融资。

该定义要求至少有可识别的融资关系或信用暴露，不能仅凭两家公司互相签约就成立。

### 判断条件

#### 支持 `finance + background` 的证据

同时看到以下至少两类证据，且卡片主要在解释资金闭环、融资关系、现金流、流动性或信用风险：

- 股权、债权、担保、租赁、预付款、应付款或供应商融资；
- 采购、算力、云容量、设备或服务的长期承诺；
- 投资方的回报依赖被投资方采购、收入或后续融资；
- 客户、供应商、投资方之间存在关联、控制或重大相互依赖；
- 卡片明确说明现金回流、收入确认、债务偿付或融资缺口如何受闭环影响。

适用于 AI/科技公司之间的资本投资、云承诺、GPU/算力采购、供应商融资和客户融资形成的相互依赖结构。产业背景是必要的交叉，但金融主体仍是资金闭环和信用暴露。

#### 回退 `background` 的证据

以下情况不应仅因出现 investment、funding、contract 或 cash flow 就归金融：

- 只有一般商业合作、采购协议或云服务使用关系，没有融资、信用或偿付闭环；
- 只有会计科目重分类、内部资金调拨或记账流程；
- 只有技术、算力平台、供应链或产业投资活动；
- 只有 “资金在部门之间流转” 的描述，无法命名投资方、融资方、债权债务或金融暴露；
- 主要是会计舞弊、内部控制或收入确认程序，且没有实质金融关系。

### FinLens 建议

#### AI/科技互惠融资闭环

```json
{
  "category": "finance",
  "categories": ["finance", "background"],
  "cardType": "mechanism",
  "categoryConfidence": 0.88
}
```

适用：卡片核心是投资、采购或云承诺形成的资金闭环，以及其对现金流、收入、融资缺口、流动性或信用风险的影响。若只解释产业合作或技术部署，缺少融资闭环和信用暴露，则应回退背景。

#### 供应商融资或反向保理

```json
{
  "category": "finance",
  "categories": ["finance", "background"],
  "cardType": "mechanism",
  "categoryConfidence": 0.92
}
```

适用：融资安排改变应付账款结算、供应商回款、采购方付款期限或流动性风险。行业背景只是交叉，不是主分类。

#### 循环信贷或 rollover financing

```json
{
  "category": "finance",
  "categories": ["finance"],
  "cardType": "concept",
  "categoryConfidence": 0.95
}
```

这是标准融资工具或债务续作，不应自动贴上 circular financing 标签。若文章只是用 “circular” 描述资金周转，必须按主解释对象重新判断。

#### 纯会计或产业循环

```json
{
  "category": "background",
  "categories": ["background"],
  "cardType": "mechanism",
  "categoryConfidence": 0.78
}
```

适用：卡片核心是会计循环、内部流程、产业活动或一般商业安排，没有可识别的融资关系、信用暴露或金融市场价格。

#### 方法候选

只有卡片提供一套可复现的检测或计量程序，例如：

1. 识别投资方、客户、供应商和融资方；
2. 追踪投资、采购、预付款、应收账款和现金流；
3. 统一期间和关联关系口径；
4. 计算闭环收入占比、承诺覆盖率、现金流依赖度或再融资依赖度；
5. 检验重复计算、关联交易和表外承诺；
6. 给出阈值、敏感性或验证方法。

才建议：

```json
{
  "category": "finance",
  "categories": ["finance", "method"],
  "cardType": "method",
  "categoryConfidence": 0.84
}
```

仅仅复述“投资—采购—收入—再投资”的传导链，是机制，不是方法。

## 五、capital expenditure versus cash flow / 资本支出与现金流比较

### 定义与会计边界

资本支出通常指取得、建设或改良长期资产，包括不动产、厂房、设备、 capitalized software 等。按现金流的列报逻辑：

- 经营现金流来自主要经营活动；
- 投资现金流包括长期资产和其他非现金等价物投资的取得与处置；
- 融资现金流来自权益、借款等融资规模和构成的变化；
- 非现金的投资和融资交易不进入现金流量表，但应另行披露。

因此，`capex`、`operating cash flow` 和 `free cash flow` 不是同一个指标：

- capex 可以是现金支出，也可以是应计资本支出或承诺；
- operating cash flow 不等于自由现金流；
- free cash flow 通常按经营现金流减 capex 计算，但并非所有会计准则下都有统一、唯一的法定定义；使用前必须写明公式、期间和非现金项目处理。

比较时还要区分：

- 维持性资本支出与扩张性资本支出；
- 现金已支付 capex 与已承诺但尚未支付的 capex；
- 租赁、 capitalised software、并购和资产处置；
- 应收账款、应付账款和库存变化对经营现金流的影响。

### 为什么单用 capex 是背景

`capital expenditure` 本身首先描述实体资产形成、会计分类或企业投资活动。设备、厂房、电网、算力设施和产能建设不因带有金额、价格或投资字样而自动成为金融术语。现有 FinLens 规则将单用 capex 归入 `background` 是合理的。

但当卡片主要解释 capex 如何改变经营现金流、自由现金流、融资缺口、流动性、偿债能力或资本成本时，金融关系已经成为主解释对象，不能继续机械归入背景。

### FinLens 建议

#### capex 单词或实体投资本身

```json
{
  "category": "background",
  "categories": ["background"],
  "cardType": "concept",
  "categoryConfidence": 0.96
}
```

适用：

- 资本支出定义、设备采购、厂房或基础设施建设；
- 产业投资计划、资本形成或产能扩张；
- 只说明 capex 的会计列报，没有进一步金融分析。

#### capex 对经营现金流、自由现金流或融资缺口的影响

```json
{
  "category": "finance",
  "categories": ["finance", "background"],
  "cardType": "mechanism",
  "categoryConfidence": 0.91
}
```

适用：

- 卡片核心是 capex 挤压经营现金流或自由现金流；
- capex 导致融资缺口、债务上升、流动性下降或资本成本变化；
- 文章解释 capex 对偿债能力、信用风险或估值的传导。

这里金融为主，是因为卡片在解释现金流、融资和流动性；实体投资只是交叉背景。

#### 完整的 capex 与现金流比较程序

```json
{
  "category": "finance",
  "categories": ["finance", "method"],
  "cardType": "method",
  "categoryConfidence": 0.93
}
```

至少应包括：

1. 说明比较目的和口径；
2. 计算经营现金流、自由现金流或融资缺口；
3. 区分维持性 capex、扩张性 capex 和未付承诺；
4. 统一期间、币种、租赁和一次性项目；
5. 进行敏感性或情景检验；
6. 解释结果和适用边界。

若只是“capex 增加会减少现金流”一句，不应归方法；只有当卡片本身提供可复现的比较、归一化和推断步骤时，才进入 `finance + method`。

## 六、三项术语的冲突矩阵

| 文本信号 | 应归入 | 不应归入 | 关键理由 |
|---|---|---|---|
| 指数从近期高点下跌约 10% | `finance` | `background` | 金融资产价格回撤 |
| 房地产或一般商品价格“修正” | `background` | `finance` | 没有证券或金融资产定价关系 |
| 投资方投资客户，客户承诺采购投资方产品 | `finance + background` | 单纯 `background` | 形成资金与采购闭环 |
| 公司购买云服务，但没有融资或信用闭环 | `background` | `finance` | 只有商业服务合同 |
| 银行反向保理安排 | `finance + background` | 纯 `background` | 应付账款、供应商融资和流动性风险 |
| 循环信贷额度 | `finance` | `circular financing` | 是标准融资工具，不是互惠资金闭环 |
| capex 购买设备 | `background` | `finance` | 实体投资或会计分类 |
| capex 导致自由现金流下降和融资缺口 | `finance + background` | `background` | 主解释对象转为现金流与融资 |
| capex/OCF/FCF 的完整计算比较 | `finance + method` | 仅 `finance` | 同时具备金融本体和完整方法程序 |

## 七、来源与访问记录

访问日期均为 2026-11-11（Asia/Shanghai）。以下只列实际成功读取或明确失败的来源；搜索页和其他二手材料不作为核心依据。

### 成功访问的官方来源

1. Nasdaq, *Market correction Definition*
   https://www.nasdaq.com/glossary/m/market-correction
   成功读取。官方词汇将 market correction 解释为股票市场价格相对短期的下跌，通常被视为高估价格向公司价值附近回归。该页没有把 10% 写成统一法律阈值，因此本文把 10% 标注为市场惯例而非监管定义。

2. U.S. SEC Investor.gov, *What is Risk?*
   https://www.investor.gov/introduction-investing/investing-basics/what-risk
   成功读取。页面将风险定义为投资决策中的不确定性和潜在财务损失，并区分 volatility risk：即使公司没有倒闭，股票价格也可能上下波动，受公司内部事件和公司无法控制的政治或市场事件影响。

3. IFRS Foundation, *IAS 7 Statement of Cash Flows*
   https://www.ifrs.org/issued-standards/list-of-standards/ias-7-statement-of-cash-flows/
   成功读取。IAS 7 将现金流分为 operating、investing 和 financing activities；投资活动包括长期资产和其他非现金等价物投资的取得与处置；不涉及现金的投资和融资交易不计入现金流量表但需另行披露。

4. IFRS Foundation, *Supplier Finance Arrangements*
   https://www.ifrs.org/projects/completed-projects/2023/supplier-finance-arrangements/
   成功读取。IASB 于 2023 年 5 月发布供应商融资安排修订，修订 IAS 7 和 IFRS 7。该来源用于确认供应商融资是独立于普通商业采购的融资与披露关系。

### 访问失败或未作为核心依据

1. FINRA 公开搜索接口
   `https://gsearch.finra.org/search?query=market%20correction`
   访问请求在该环境下超时，未获得可核验结果，因此未用 FINRA 搜索页作为依据。

2. SEC 非 GAAP 指标问答页
   https://www.sec.gov/divisions/corpfin/guidance/nongaapinterp.htm
   请求未稳定返回可解析内容，因此未把自由现金流的特定 SEC 问答作为核心引用。文档中关于自由现金流的表述保留为“常见计算口径、并非统一唯一法定定义”，不据此宣称具体监管阈值。

3. DuckDuckGo 和 Google 搜索
   在受限网络环境下连接失败；没有使用搜索结果、百科、投资博客或媒体摘要作为分类依据。

## 八、落地规则

1. 分类器先识别主解释对象，再读取术语名。
2. `market correction` 默认 `finance + phenomenon`；只有非金融价格修正回退 `background`。
3. `circular financing` 必须先区分互惠融资闭环、供应商融资、循环信贷和纯会计/产业循环。没有融资关系时不自动归金融。
4. `capex` 不能因出现 capex 直接归金融，也不能因它是实体投资就永远归背景；要看卡片是否主要解释现金流、融资缺口、流动性或资金成本。
5. `finance + method` 只用于有完整、可复现计算和推断程序的卡片。机制、流程、会计分类和一般模型名称均不足以进入方法。
6. 置信度低于 `0.85` 的卡片应显示分类理由，并在用户展开“领域分类”时提示“存在上下文歧义”；分类理由默认隐藏，不新增独立强调按钮。
