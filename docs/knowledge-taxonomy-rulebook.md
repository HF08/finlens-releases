# FinLens 知识库分类规则书

更新日期：2026-11-13

本文件适用于内置文章、导入文章、旧卡片重分类、知识详解和模型新生成的卡片。

通用判断入口见 [知识分类判断框架](knowledge-classification-decision-framework.md)。本文件保留专业依据、领域细则、旧规则审计和历史案例；两者冲突时，以通用判断框架的“主解释对象 + 正面证据 + 默认背景”原则为准。

谈判杠杆与外生条件型风险溢价的专项依据见 [交叉分类边界研究](cross-classification-negotiation-geopolitical-risk.md)。离婚财产分割与共同控制股权的专项依据见 [分类边界研究](divorce-asset-division-classification-research.md)。

## 一、专业依据

### American Economic Association, JEL Codes

来源：[AEA JEL Codes](https://www.aeaweb.org/econlit/jelCodes.php?view=jel)

相关一级分类彼此独立：

- `C Mathematical and Quantitative Methods`
- `D Microeconomics`
- `E Macroeconomics and Monetary Economics`
- `G Financial Economics`
- `H Public Economics`
- `K Law and Economics`
- `L Industrial Organization`
- `M Business Administration and Business Economics`
- `Q4 Energy`
- `Q5 Environmental Economics`

`G Financial Economics` 的重点包括：

- `G1`：投资组合、投资决策、资产定价、债券利率、金融预测和金融监管。
- `G2`：银行、保险、精算、非银行金融机构、金融工具、投资银行、风投和评级。
- `G3`：资本预算、固定投资研究、融资政策、金融风险管理、资本结构、企业价值、破产、并购和股利政策。

`C` 承载计量、统计、模型、预测和模拟方法；`L`、`M`、`Q4`、`Q5` 分别承载产业组织、企业经营、能源和环境问题。它们不能因为使用数字或涉及成本，就默认归入金融。

### NBER Programs & Working Groups

来源：[NBER Programs & Projects](https://www.nber.org/programs-projects/programs-working-groups)

NBER 将以下项目分列：

- 金融：`Asset Pricing`、`Corporate Finance`、`Financial Institutions`、`Monetary Economics`
- 背景：`Industrial Organization`、`Environment and Energy Economics`、`Political Economy`、`Law and Economics`、`Economics of National Security`、`Productivity, Innovation, and Entrepreneurship`

这支持“金融活动”与“产业、能源、法律、政治、技术、军事背景”之间的边界。

### 谈判、议价与金融杠杆

AEA JEL 将 `C78 Bargaining Theory; Matching Theory` 与 `J5 Labor-Management Relations, Trade Unions, and Collective Bargaining` 列在计量/博弈与劳动经济学分类，而不是 `G Financial Economics`。

因此：

- `bargaining power`、`bargaining leverage`、`negotiating leverage`、`negotiation leverage`、`bargaining chip`、`谈判筹码`、`谈判杠杆`、`谈判力`、`议价能力`和`议价权`首先属于谈判、组织关系、劳动市场或政策博弈背景。
- 这些短语中的 `leverage` 表示相对谈判优势，不是财务杠杆。不得由裸词 `leverage` 触发金融分类。
- 只有当卡片的主要解释对象转为贷款契约、证券、抵押品、融资条件或可计量的金融敞口时，才另行归入金融。

### U.S. Bureau of Economic Analysis

来源：[BEA Glossary](https://www.bea.gov/help/glossary)

BEA 将 `Capital expenditures` 定义为取得、增加或改良厂房、设备等 `property, plant, and equipment` 的支出，包括建筑物、机器、设备、专用工具、在建工程和勘探开发成本。

因此，设备采购、厂房建设、电网扩容、储能设施和制造产能首先是实体资本形成；资本预算、资本成本、项目融资、贷款担保、金融风险和金融资产定价才进入金融或方法分类。

### World Health Organization

来源：[WHO Health Equity](https://www.who.int/health-topics/health-equity)

WHO 将 `Health equity` 定义为消除不同群体之间不公平、可避免且可改善的健康差异。健康公平受出生、成长、生活、工作、年龄、社会、经济、政治、法律和医疗可及性等条件影响。

AEA 将 `I13 Health Insurance, Public and Private` 与 `I14 Health and Inequality` 分列：

- 健康公平、健康不平等和健康可及性属于公共卫生与健康政策。
- 健康保险、医疗融资和费用风险转移属于保险金融。
- `equity` 不能单独作为金融关键词，因为它在英文中同时表示“股权”和“公平”。

### AEA Labor Economics

AEA 将 `J64 Unemployment: Models, Duration, Incidence, and Job Search` 列在劳动与人口经济学下，而不是金融经济学下。

因此：

- `unemployment duration`、`duration of unemployment`、`unemployment spell`、`long-term unemployment` 和 `job search duration` 属于劳动力市场背景。
- `duration` 在金融中特指固定收益资产价格对利率变化的敏感度，不能把所有含 `duration` 的概念都归入金融。

`funding` 同样是歧义词。健康研究 funding、医学研究 funding、女性健康 funding gap 属于卫生与科研政策背景；企业融资缺口和再融资缺口才属于金融。不能因为出现 `funding` 就自动归入金融。

### 风险管理与金融风险的权威边界

来源：

- [AEA JEL Codes](https://www.aeaweb.org/econlit/jelCodes.php?view=jel)：`G32 Financing Policy • Financial Risk and Risk Management • Capital and Ownership Structure • Value of Firms`
- [BIS, Principles for the Sound Management of Operational Risk](https://www.bis.org/publ/bcbs195.pdf)
- [BIS Basel Framework: Risk-based capital requirements](https://www.bis.org/basel_framework/chapter/RBC/25.htm)
- [COSO Enterprise Risk Management](https://www.coso.org/erm-framework)

权威材料支持以下区分：

- AEA `G32` 将金融风险与风险管理放在公司金融，而不是把所有风险概念都归入金融。
- BIS/Basel 对银行风险的监管框架具体区分信用风险、市场风险、操作风险和流动性风险，并配套资本与风险管理要求。
- COSO ERM 覆盖战略、治理、绩效、合规和运营风险，不把一般合规、战略或运营风险等同于金融风险。

因此：

- `regulatory risk`、`compliance risk`、`legal risk`、`policy risk`、`strategic risk`、`reputational risk` 默认归背景层。
- 一般 `operational risk`、`risk control` 默认归背景层。
- `market risk`、`credit risk`、`interest rate risk`、`liquidity risk`、`counterparty risk`、`underwriting risk`、`insurance risk`、`currency risk`、`bank operational risk`、`regulatory capital risk` 和 `capital adequacy risk` 归金融层。
- `enterprise risk management`、`regulatory risk management` 和 `compliance risk management` 是管理框架或程序，归方法层。
- `financial risk management` 和 `financial risk control` 是对金融暴露的管理，归金融层。
- `regulatory risk premium` 只有在被明确作为资产定价补偿时才进入金融关系；若卡片主要解释定价补偿，则金融为主并交叉背景；若主要解释对象仍是监管条件，则保留背景。

“外生条件型风险溢价”按背景本体与金融定价关系拆分：地缘政治、政治、监管、政策、战争等条件本身属于背景；当卡片明确说明该条件转化为收益率、利差、折现率、资本成本或保险价格中的补偿时，风险来源交叉背景、金融定价为主，使用 `finance + background`。只有外部条件和笼统市场影响、没有可识别定价对象时，保留背景，不机械交叉。

## 二、三个分类的含义

### 金融术语

卡片的主要解释对象必须是：

- 货币、信用、金融合约、金融工具或金融资产。
- 银行、保险、基金、券商、评级机构等金融机构。
- 融资政策、资本结构、资本成本、项目融资、贷款担保或破产清偿。
- 企业或金融资产估值、投资组合、资产配置或资本预算。
- 保险承保、精算、风险转移、对冲或金融风险管理。
- 金融市场、收益率、利差、风险溢价、流动性或市场微观结构。
- 可计量的金融、财政、税收或家庭财务指标。
- 不良资产处置、债权回收、现金清收、抵押物处置、回收率和违约损失率。

### 背景层

背景层承载解释金融活动的外部条件、制度环境和实体对象，包括：

- 政治、地缘、国际关系、选举、制裁和历史。
- 法律、司法、监管程序、政策框架和公共治理。
- 民事执行、限制消费措施、失信被执行人名单、可供执行财产和财产查控。
- 消费趋势、消费需求、产品品类扩张或颠覆、市场细分、产品差异化、品牌资产/相关性、复购率、营销策略、医药与生物科技类别、企业高级管理角色。
- 产业组织、企业战略、商业模式、供应链、生产与产能。
- 能源、环境、气候、电气化、基础设施和电力可及性。
- 一般技术、网络安全、数据隐私、技术采用与创新。
- 军事、国防、国家安全和采购。
- 宏观经济、外部账户和产业统计中的非金融指标。

### 分析方法

方法层只承载可重复的推理程序，用来把输入转换为有边界、可解释的分析结论。进入方法层至少需要：

1. 明确的分析目的：估计、检验、预测、估值、归因、风险计量或决策。
2. 可复述的程序：假设、输入、变量和主要变换步骤。
3. 推断规则：如何解释结果、比较方案、处理不确定性。
4. 可迁移性：同一方法可应用于不同文章或数据，而不是某个具体设备实例。

例如 DCF、情景分析、压力测试、回归分析、VaR、敏感性分析和成本收益分析属于方法。

算力、AI 技术栈、自动化实验室、研发管线、软件平台和执行环境属于工具或基础设施，归背景层。它们可以执行方法，但本身没有完整的分析假设与推断结构。

`AI agents`、`autonomous agents`、`agentic workflow`、`multi-agent system` 和 AI 模拟平台是软件系统、执行流程或工具环境，归背景层。

`scenario model`、`forecasting model`、`risk model` 和 `climate model` 不能仅凭 `model` 词尾分类。若卡片描述构成完整分析链，说明分析目的、假设与输入、变换或模拟步骤、输出解释和适用边界，可归入方法层；若只是软件、平台、计算实现或名称，则归背景层。

`agent-based modeling` 和 `multi-agent simulation` 是方法候选：只有卡片类型为方法、至少提供两个方法步骤，并能还原主体、规则、输入、模拟过程、输出和边界时，才归入方法层；模拟平台、软件和引擎归背景层。

查封、扣押、冻结、拍卖、变卖、分配和资产回收流程属于机制或程序，不能仅凭步骤完整而进入方法层。只有回收率、LGD 等指标形成可重复的计量程序时，才可作为方法候选。

### 金融估值与金融 + 方法交叉

金融估值首先属于金融内容。只有当卡片同时给出完整、可迁移的计算分析程序时，才可在金融之外交叉归入方法：

- `relative valuation`、`相对估值`、`可比公司估值`：主分类 `finance`；若说明可比对象、会计口径统一、估值倍数计算、增长与风险差异检查和适用边界，则 `categories` 为 `['finance', 'method']`。
- 只有“资产较贵/较便宜”的结论，没有计算步骤、输入输出或边界：仅归 `finance`。
- 金融政策、金融风险、金融机构、融资工具、保险、利率和风险溢价等，不得因为涉及数字或定量描述就自动交叉方法。
- `airline revenue management`、收益管理和动态定价属于金融价格与收益管理，不因包含预测和库存控制步骤而归方法。

`regulatory framework`、`business model`、`policy framework`、`legal framework` 和 `institutional framework` 归背景层；`climate scenario analysis` 是明确方法。

依据见 [分析方法、工具与科研技术边界](method-vs-tool-research.md) 与 [分析模型与分析方法边界研究](model-as-method-research.md)。

### 案例字段（cases）规则

案例是知识卡的说明材料，不是分类证据，也不是权威来源的替代品。`category` 只由 `term`、`one`、`body` 的主解释对象和完整方法证据决定；即使案例涉及融资、证券、法律或技术，也不能反向改变术语分类。

案例按以下顺序处理：

1. **直接绑定术语**：案例必须说明当前术语的本体、机制、用途或判断边界，不能改成相邻概念的故事，也不能只说明文章主题或金融后果。
2. **优先使用可核验材料**：真实事件、政策文件、市场数据、统计序列或原文明确语境优先；至少保留时间、机构、地区、指标、数据口径或原文出处之一。
3. **没有材料时留空**：不得为了填满 `cases` 编造机构、日期、数字、统计关系、案例来源或因果关系。可靠材料不足时，空字符串优于虚构案例。
4. **数字必须标明性质**：真实数据应有期间、单位、来源或可回到原始序列的口径；假设数字必须以“假设”或“示例计算”开头，说明关键假设和计算方式，不能伪装成历史事实。
5. **区分百分比与百分点**：百分比表示相对变化，百分点表示两个百分数之差；不得混用水平、增速和差值，也不得把两个增速直接相减当作精确结果。
6. **区分存量与流量**：资产、负债和余额是存量；收入、支出和现金流是流量。案例不能在没有口径说明时比较不同性质的数值。
7. **区分名义与实际**：涉及工资、利率、收益率或购买力时，说明是否已剔除价格变化；实际值通常需要价格指数和基期，而不是只做文字判断。
8. **保留制度条件**：法律、监管、会计和税收案例应说明法域、准则、适用期间或生效时间，不能把一地一时的规则写成通用事实。
9. **事实与解释分开**：案例先陈述可观察事实，再说明解释；不得把相关性、事件先后或单一案例写成确定的因果关系或普遍规律。
10. **控制长度和粒度**：一个案例只保留与术语直接相关的单一语境，通常控制在 30-120 个中文字符；复杂背景应放入 `body` 或另立相关卡片。

案例类型只用于约束写法，不新增分类：

- **事实案例**：真实事件、政策、机构或市场数据，重点是可追溯。
- **文章语境案例**：直接引用原文中的具体使用场景，重点是不超出原文证据。
- **方法演示**：用于说明分析步骤，必须给出输入、假设、计算和输出边界。
- **示例计算**：可以没有真实事件，但必须明确标注“假设/示例”，不能冒充统计事实。

`cases` 不得使用以下写法：

- “某公司”“某机构”编造一个无法核验的故事，却写成真实案例。
- 用“工资涨 5%、物价涨 7%”这类数字直接推出精确的实际工资变化，却不说明指数口径、基期和计算公式。
- 用“监管风险上升导致股价下跌”作为唯一因果证明，却不说明时间、市场和同期影响因素。
- 术语讲 A，案例主要在讲相邻的 B，只是两者都出现在同一篇文章。
- 用案例中的 financing、credit、valuation 等词把背景术语升级为金融术语。

重新核验时，若案例含具体百分比但没有时间、来源或“假设/示例计算”标注，应提示人工确认，并生成建议案例；用户确认前不得覆盖原案例。案例质量提示与正文错配提示共用确认窗口，但分类、正文和案例仍是三个独立变更面。

### 分类重新核验的证据展示规则

分类核验不得只显示规则结论和来源列表，还必须从卡片的 `one`、`body` 中提取原文片段，并分别展示：

- **主对象证据**：支持术语本体的定义、机制或关系片段；
- **独立交叉证据**：只有当规则提出两个板块时，另行寻找的第二板块证据；
- **明确否定证据**：不涉及、不包含、没有、无需、并非、而不是、不构成等否定句。

否定片段不参与正面分类。术语名称、关键词、案例、来源目录和检索页面都不能单独构成修改建议。若找不到实质性的主对象证据，或交叉分类缺少独立片段，保留原分类并把置信度压低到 `65%` 以内，默认不勾选。来源页面只作为研究入口，不充当分类证明。内容错配与分类证据不足分开处理：前者保留候选但要求人工确认，后者直接阻止自动修改。

## 三、当前规则

### 判定顺序

先看卡片的主要解释对象，再按以下顺序执行，先命中先停止：

1. 明确的分析方法，或经证据核验具备完整分析链的分析模型。
2. 金融法律。
3. 金融监管与金融政策。
4. 税收、补贴和价格上限政策工具。
5. 金融科技。
6. 实体产业、基础设施、能源转型与经营行动。
7. 谈判、议价与组织博弈中的相对影响力。
8. 外生条件型风险溢价：存在可识别的金融定价关系时归金融为主并交叉背景；缺少定价证据时归背景。
9. 可定价的金融概念。
10. 政治、法律、产业、技术、军事、历史与一般政策背景。
11. 一般金融工具、机构、指标与金融风险。
12. 没有正面金融本体或完整方法程序证据时归背景层。
13. 模型初始分类只作为弱提示，不单独决定最终分类。

### 方法强规则

当前仅匹配明确程序：

```text
stress testing
scenario analysis / scenario testing
event study
regression analysis / regression model
econometrics / econometric analysis / econometric model
DCF / discounted cash flow
VaR / value at risk
sensitivity analysis
Monte Carlo simulation / Monte Carlo model
factor model / CAPM / option pricing model
game theory / ratio analysis / duration analysis
comparative statics
cost-benefit analysis / break-even analysis
valuation model / valuation framework
risk management framework
forecasting method
machine learning analysis
statistical method / quantitative method
decision analysis / multi-criteria analysis
seasonal adjustment / data surprise analysis
job-growth breadth analysis / vote-margin analysis
stated preference survey / wealth quantile analysis
source completeness screening / UPC-based retail sales tracking
```

方法证据必须同时理解中英文表达：核查、比较、计算、排序、汇总、映射、剔除、筛选、判断和验证等中文程序词，与英文 `estimate`、`compare`、`calculate`、`map`、`classify`、`verify` 具有同等证据地位。不能因为卡片描述使用中文就漏判完整方法。

`scenario model`、`forecasting model`、`risk model` 和 `climate model` 属于“分析方法候选”，不能仅凭名称进入方法层，也不能一律压入背景层。分类器至少核验以下六类证据中的五类，并确认分析目的、输入、变换步骤和输出解释存在：

1. 分析目的；
2. 假设或模型设定；
3. 输入数据、变量、暴露或情景；
4. 计算、估计、模拟、传导或检验步骤；
5. 输出指标及解释或决策用途；
6. 适用边界、误差、不确定性、验证或复核要求。

同时，`methodSteps` 应提供至少两个可执行步骤。只有模型名称、软件平台、计算实现或“这是模型”的简短描述时，归背景层。`AI agents`、`agentic workflow`、`multi-agent system`、`computing power`、`AI-for-science stack`、`autonomous laboratory` 和 `drug discovery pipeline` 仍明确归背景层。`agent-based modeling`、`multi-agent simulation` 同样执行“五类证据 + 两个步骤”的方法候选规则，不能仅凭名称直接归方法。

### 机制不等于方法

`cardType=mechanism` 表示卡片解释因果路径、传导链或制度运行逻辑；它不决定 `category`。一张金融卡可以同时是 `finance` 和 `mechanism`，但只有主要解释对象本身是可重复的分析、计量、估值或检验程序时，`category` 才能是 `method`。

`insurance premium financing`、`premium financing acquisition`、`acquisition financing` 和中文“保费资金融资收购”首先属于金融活动。即使正文列出资金来源、偿债覆盖和风险传导步骤，也只能是 `finance + mechanism`，不能自动升级为 `method`。

### 交叉分类

交叉分类不是“出现两个领域词”就自动成立，而是要求主对象和交叉关系分别通过独立证据：

1. **背景本体可命名**：政治、地缘、监管、法律、产业、技术、消费等外部条件能够单独定义。
2. **金融关系可命名**：定价补偿、现金流、估值、融资、风险转移、资产负债或金融合约关系能够单独说明。
3. **关系不是附带后果**：卡片不能只是说“某事件影响市场”；必须把两个对象连接成可解释的定价或金融关系。
4. **主分类看解释重心**：卡片主要解释外部条件本身或一般市场影响时，以 `background` 为主；卡片主要解释外部条件如何形成收益率、利差、折现率或保险价格补偿时，以 `finance` 为主并交叉 `background`；主要解释溢价测算程序时，以 `method` 为主。

#### AI trade repricing

- 主分类：`background`
- 交叉：`finance`
- 依据：AI 技术、竞争或市场情绪变化属于外部背景冲击；其结果表现为 AI 相关股票、估值和仓位重定价。该词不是统一标准术语，但事件核心具有金融资产定价属性。

#### 外生条件型风险溢价

```text
geopolitical risk premium / political risk premium
regulatory risk premium / policy risk premium
election risk premium / war risk premium
地缘政治风险溢价 / 政治风险溢价 / 监管风险溢价 / 政策风险溢价
```

- 主分类：`finance`
- 交叉板块：`background`
- 条件：卡片必须同时说明外部条件本体，以及收益率、利差、折现率、资本成本或保险价格中的可识别定价补偿关系。
- 回退：只有外部条件和笼统市场影响、没有可识别定价对象时，归 `background`，不机械交叉。
- 方法边界：如果卡片主要提供溢价的计算公式、数据口径、估值模型或风险计量程序，则按主要对象归入 `finance` 或 `method`。
- 对照：`equity risk premium`、`term premium`、`credit spread`、`liquidity premium` 是可定价金融指标，通常直接归 `finance`。

#### 金融 + 方法交叉

- 主分类：`finance`
- 交叉板块：`method`
- 适用：`relative valuation`、`相对估值`、`可比公司估值`等金融估值程序。
- 条件：金融估值本体明确，同时具备可比对象、口径统一、倍数或价值计算、风险差异检查和适用边界。
- 限制：不得把一般金融概念、金融产品介绍、只有单个指标或只有“估值”结论的卡片升级为方法交叉。

#### 金融法律

```text
financial law / banking law / securities law / insurance law
insolvency law / bankruptcy law / investor protection
deposit insurance / financial compliance / securities litigation
```

- 主分类：`background`
- 交叉板块：`finance`
- 原因：法律规则属于制度背景，但直接规范金融交易、机构和投资者关系。

#### 婚姻财产分割与共同控制股权

```text
divorce asset division / divorce property division
marital property division / community property division
离婚财产分割 / 夫妻共同财产分割 / 婚姻财产分割
```

- 默认主分类：`background`
- 交叉板块：`finance`，仅当正文实质涉及证券、企业权益、信托资产、估值、流动性、控制权、债务或税务处理时成立。
- 原因：离婚财产分割首先解决婚姻财产制度下“谁依据何种权利取得什么”，属于家庭法与财产法机制；金融资产与估值关系是分配机制中的独立交叉维度。
- 限制：仅出现 `asset`、`value`、`trust`、具体金额或“需要估值”不自动交叉；不得仅因涉及资产就归 `finance`。若金融分析已经成为主要解释对象，才改为 `finance + background`。

```text
jointly controlled equity stake / jointly controlled equity interest
共同控制的股权 / 共同控制的股份 / 共同控制的权益
```

- 主分类：`finance`
- 交叉板块：`background`
- 原因：主解释对象是上市公司或其他企业的股权资产，经济收益、投票、出售和处分权直接影响减持、控制权、证券披露与估值。
- 背景维度：共同信托、婚姻财产制度、受托人治理或家庭安排解释控制权为何分散，但不把股权资产本身变成纯背景概念。
- 对照：`trust`、`co-trustee`、`living trust` 等法律安排仍默认 `background`；只有其主解释对象转为可计价股权或金融权益时，才按金融为主处理。

详细比较法和证券披露依据见 [离婚财产分割与信托持有上市公司股份分类研究](divorce-asset-division-classification-research.md)。

#### 金融监管与金融政策

```text
monetary policy / fiscal policy / tax policy
financial policy / financial regulation / banking regulation
prudential policy / macroprudential
regulatory capital / capital requirement
regulatory risk / regulatory environment
financial supervision / deposit protection
```

- 主分类：`finance`
- 交叉板块：`background`

#### 税收、补贴与价格政策工具

```text
value-added tax reduction / VAT reduction
tax cut / tax reduction / fuel-levy cut
consumer subsidy / price cap
```

- 主分类：`background`
- 交叉板块：`finance`
- 原因：首先是公共政策工具，其次通过价格、税负或资金成本产生金融传导。

#### 金融科技

```text
fintech / financial technology / financial innovation
digital finance / open banking / digital payment
payment system / payment infrastructure
algorithmic trading / high-frequency trading
robo-adviser / digital currency / CBDC
stablecoin / crypto currency / crypto asset / digital asset
```

- 主分类：`finance`
- 交叉板块：`background`

### 实体产业和基础设施强规则

以下默认归背景层：

- `electrification`、`electrification pathway`、`energy transition`
- `equipment investment`、`business investment`、`capital expenditure`、`capex`
- `grid investment`、`grid and storage investment`、`grid expansion`
- `power grid`、`electricity access`、`electricity demand`
- `electricity infrastructure`、`energy efficiency`、`energy security`
- `energy import dependency/intensity/spending`
- `avoided fuel import savings`、`fuel import`
- `manufacturing capacity`、`industrial capacity`、`production capacity`
- `factory`、`plant construction`、`infrastructure investment`
- `infrastructure`、`construction`、`equipment`、`machinery`
- `heat pump`、`electric vehicle`、`charging infrastructure`
- `battery storage`、`storage capacity`
- `supply chain`、`industrial process`、`technology adoption`
- `relative price effect`、`policy-market complementarity`
- `market signal and incentive structure`
- `state intervention`、`permitting and regulatory reform`
- `climate plan`、`COP`、`Paris Agreement`

即使正文讨论融资、成本或投资金额，只要卡片主概念是实体建设、设备采用或能源转型，仍归背景层。

### 市场修正、循环融资与资本支出边界

权威依据与三项条件式结论见 [市场修正、循环融资与资本支出分类研究](market-correction-classification-research.md)。

#### Market correction / 股市修正

- 股票、指数、证券组合或其他金融资产从近期高点回撤时，主分类 `finance`，`cardType=phenomenon`，置信度 `0.97`。
- 约 `10%` 是市场惯例和媒体常用口径，不是统一法定阈值；不得把阈值当作法律事实。
- 房地产、一般商品、产业供需或库存周期中的“价格修正”，没有金融资产定价关系时归 `background`。
- 只有卡片本身提供可复现的回撤计算、阈值检验或风险计量程序，并满足完整方法证据时，才可交叉 `method`；仅仅出现百分比不构成方法。

#### Circular financing / 循环融资

- `circular financing` 不是统一监管术语。必须识别投资、采购、云或算力承诺、供应商融资、应收应付、现金流和再融资之间是否形成可命名资金闭环。
- 当金融关系是主要解释对象，并形成现金流、融资缺口、流动性或信用暴露时，主分类 `finance`，交叉 `background`，`cardType=mechanism`，置信度约 `0.89-0.92`。
- 普通商业合作、云服务合同、产业活动、会计循环或内部资金调拨没有实质融资关系时，归 `background`。
- 循环信贷额度、revolving credit facility 和 rollover financing 是标准融资工具或债务续作，不等同于 circular financing。

#### Capital expenditure versus cash flow / 资本支出与现金流比较

- `capital expenditure` / `capex` 单独描述设备、厂房、基础设施、会计分类或实体资本形成时，仍归 `background`。
- 当卡片主解释对象转为 capex 对经营现金流、自由现金流、融资缺口、流动性、偿债能力、信用风险或资本成本的影响时，主分类 `finance`，交叉 `background`，`cardType=mechanism`，置信度约 `0.91`。
- 当卡片同时提供期间、币种、capex/OCF/FCF 口径、计算步骤、结果解释、敏感性或适用边界时，主分类 `finance`，交叉 `method`，`cardType=method`，置信度约 `0.93`。
- 仅有一句“capex 会增加支出或减少现金”不构成方法。资本支出词形不能抢先压过明确的现金流、融资缺口或流动性主解释对象。

### 金融定价强规则

金融模式不再接受单独的 `price`、`return`、`ratio`、`index`、`margin`、`leverage` 或 `premium`。当前要求金融对象或明确关系：

```text
risk premium / term premium / equity risk premium
liquidity premium / insurance premium
credit spread / yield spread / bid-ask spread
yield / duration / convexity / volatility / delta / beta
cost of capital / exchange rate / interest rate
asset price / equity price
business valuation / company valuation / equity valuation / asset valuation
valuation multiple / enterprise value / equity value
underwriting / actuarial / annuity / reinsurance
portfolio / asset allocation / hedging / financial risk management
capital structure / capital budgeting / payback period
concessional capital / blended finance / project finance / loan guarantee
working capital / corporate finance
money supply / money market / monetary aggregate / fiat money
```

其中 `geopolitical risk premium`、`political risk premium`、`regulatory risk premium` 等外生条件型风险溢价先走交叉规则，不能被通用 `risk premium` 抢先归为纯金融。

### 金融资产回收强规则

以下涉及信用风险和金融资产处置，归金融层：

```text
recovery rate / recovery amount / loss given default / LGD
non-performing asset recovery / debt recovery / loan recovery
不良资产处置 / 不良资产回收 / 不良贷款回收 / 不良贷款清收
债权回收 / 现金清收 / 抵押物处置
```

单独的“资产回收”不自动归金融；必须结合不良资产、债权、贷款、抵押物或回收率等语境。

### 一般背景强规则

以下归背景层：

- 政治、地缘、选举、制裁、贸易战、政治经济。
- 谈判筹码、谈判杠杆、谈判力、议价能力、议价权、bargaining power/chip 和 negotiating leverage。
- 法律、司法、法院、诉讼、宪法、成文法、监管框架。
- 限制高消费、限制消费措施、限制消费令、失信被执行人、可执行资产、可供执行财产、被执行人财产和责任财产。
- 电解质补水趋势、补水需求、饮料品类扩张、品类颠覆、市场细分、产品差异化、品牌资产、品牌相关性、复购买家率、消费品增长战略、GLP-1 receptor agonist 等药物类别、首席执行官。
- 产业政策、产业结构、供应链、供给瓶颈、价值链和产业产能。
- 企业战略、商业模式、经营模式、市场结构和采购。
- 一般技术、网络安全、加密、数据隐私和算法。
- 军事、国防、武装力量与国家安全。
- 历史、制度与制度环境。

其中“可执行资产”是口语化概括，更规范的法律表达是“被执行人的财产”“可供执行财产”或“责任财产”。此类执行状态不因财产本身是银行存款、证券或基金份额而成为金融术语。

消费趋势、产品需求、品类扩张或颠覆、市场细分、产品差异化、品牌资产/相关性、复购率、营销策略、医药作用机制和 CEO 等管理角色属于消费、产业、医药、营销或公司治理背景。即使文章来自财经媒体，也不得因为这些词与公司收入、市场表现或投资主题有关而直接归金融。只有在同一卡片的主要解释对象转为融资结构、估值、资本预算、资产定价或金融风险时，才另立金融卡。战略收购、并购交易和自筹资金属于金融卡。
- 健康公平、健康不平等、健康差异、公共卫生、医疗可及性、全民健康覆盖和健康政策。
- 失业持续时间、长期失业、失业 spell 和求职持续时间。
- 女性健康 funding gap、健康研究 funding gap、医学研究 funding gap 和公共科研资金配置。
- 监管风险、合规风险、法律风险、政策风险、战略风险、声誉风险和一般运营风险。
- 环境估值，而非企业或金融资产估值。

### 一般金融强规则

包括但不限于：

- 利率风险、政策利率、信用利差、期限溢价和风险溢价。
- 流动性、久期、凸性、债券、股票、债务、贷款和信用。
- 违约、衍生品、期权、期货、互换、资产负债表和现金流。
- 资本充足率、杠杆、银行、中央银行、货币和汇率。
- 通胀预期、通胀风险、收益率曲线、主权风险和国家风险。
- 实际工资、工资增长、财政盈余、税档爬升、偿债成本。
- 购买力 / purchasing power：衡量货币单位可购买的实际商品与服务，并连接名义收入、物价和家庭实际财务能力。
- 税收转嫁、税负归宿和税收负担。
- 保险、保险理赔、投资基金、对冲基金、共同基金和养老金。
- 健康保险、医疗融资、股权融资、股权资本、股票市场、股东权益和净资产收益率。
- 修正久期、Macaulay 久期、有效久期、债券久期、组合久期、久期风险和久期缺口。
- 企业融资缺口、再融资缺口和资金流动性缺口。
- 市场风险、信用风险、利率风险、流动性风险、交易对手风险、承保风险、保险风险、汇率风险、银行操作风险、监管资本风险和资本充足风险。
- 主权财富基金、私募股权、风投、基金管理和经纪。
- 金融市场、金融工具、金融风险、市场风险、信用风险。
- 股票、指数或证券组合的 market correction / 股市修正。
- 投资、采购、供应商融资和再融资形成实质资金闭环的 circular financing / 循环融资。
- 以资本支出与经营现金流、自由现金流、融资缺口或流动性关系为主解释对象的 capex versus cash flow。
- 操作风险、流动性风险、偿付能力。
- 优惠资本、投资回收期、资本成本、贷款担保和项目融资。

### 回退规则

- 模型分类为 `background` 且没有相反强证据：保留背景层，置信度 `78%`。
- 模型分类为 `finance` 或 `method`，但术语本体和描述缺少正面金融本体或完整程序证据：默认归背景层，置信度 `70%`。
- 无有效分类：保守归入背景层，置信度 `50%`。
- 分类依据和置信度默认隐藏，只在用户展开“领域分类”时显示。

### 数据结构和筛选

```json
{
  "category": "finance",
  "categories": ["finance", "background"],
  "categoryReason": "术语涉及金融监管，同时属于政策与制度背景。",
  "categoryConfidence": 0.98
}
```

- `category` 保存主分类，兼容旧数据和权威来源选择。
- `categories` 最多两项，主分类在前。
- 知识库筛选和阅读侧栏按 `categories` 归组。
- 交叉卡片显示多个分类徽标。

## 四、旧规则

以下规则来自上一版已提交实现。

### 旧判定顺序

1. 方法模式。
2. 宽泛的金融定价词。
3. 背景模式。
4. 一般金融模式。
5. 保留模型分类。
6. 默认背景。

### 旧方法模式

```regex
\b(analysis|analytics|model|framework|methodology|method|stress test(?:ing)?|scenario analysis|event study|regression|econometric|dcf|discounted cash flow|value at risk|var|sensitivity analysis|monte carlo|factor model|capm|option pricing|game theory|ratio analysis|duration analysis|comparative statics)\b
```

缺陷：任意 `framework`、`model` 或 `method` 都会进入方法层，导致 `regulatory framework` 和 `business model` 误分类。

### 旧金融定价模式

```regex
\b(premium|spread|yield|return|price|pricing|valuation|multiple|ratio|index|duration|convexity|volatility|delta|beta|margin|cost of capital|exchange rate|interest rate)\b
```

缺陷：`relative price effect`、`price cap` 和一般市场回报会因单个词进入金融层。

### 旧背景模式

```regex
\b(political risk|geopolitical risk|political instability|election risk|policy uncertainty|regulatory risk|regulatory environment|sanctions?|trade war|industrial policy|industrial structure|industry structure|supply chain|supply bottleneck|value chain|industrial capacity|political economy|fiscal policy|monetary policy|institution|institutional context|history|historical context)\b
```

缺陷：缺少法律、司法、技术、军事、能源、基础设施和实体投资边界。

### 旧一般金融模式

```regex
\b(interest rate risk|policy rate|credit spread|term premium|risk premium|liquidity|duration|convexity|bond|equity|stock|debt|loan|credit|default|derivative|option|futures?|swap|balance sheet|cash flow|capital adequacy|leverage|bank|central bank|currency|exchange rate|inflation expectations?|inflation risk|yield curve|asset|sovereign risk|country risk|real wages?|wage growth|fiscal surplus|bracket creep|debt-service cost|debt service cost|tax pass-through|tax incidence|tax burden)\b
```

缺陷：保险、投资组合、资本预算、项目融资、优惠资本和金融监管覆盖不足，只能依赖模型分类。

### 旧回退和数据结构

```text
有模型分类 → 保留模型分类，置信度 65%
无模型分类 → 背景层，置信度 50%
每张卡只能保存一个 category
```

## 五、旧规则与当前规则对照

| 项目 | 旧规则 | 当前规则 |
|---|---|---|
| 方法分类 | 任意 `framework/model/method/analysis` | 只接受明确的分析与计量程序 |
| 金融定价 | 单个 `price/return/ratio/index/margin` | 必须出现金融对象或明确关系 |
| `equity` 歧义 | 裸词 `equity` 可直接触发金融 | 只接受股权融资、股票市场、股东权益等明确金融组合；健康公平归背景 |
| `duration` 歧义 | 裸词 `duration` 可直接触发金融 | 只接受修正久期、债券久期等明确金融组合；失业持续期归背景 |
| `funding` 歧义 | 模型容易把 funding gap 一律归金融 | 健康与科研 funding 归背景；企业融资缺口和再融资缺口归金融 |
| `risk` 歧义 | 任何风险短语都可能被模型或关键词归金融 | regulatory/compliance/legal/strategic/operational risk 归背景；明确金融暴露才归金融 |
| 实体投资 | 通用 `investment` 可能进入金融 | 设备、厂房、电网、储能和制造产能默认背景 |
| 能源转型 | 无强制规则 | 电气化、能源安全和电力可及性归背景 |
| 法律与技术 | 覆盖不完整 | 一般法律、司法、技术、军事明确归背景 |
| 金融法律 | 无交叉 | 背景主分类 + 金融交叉 |
| 金融监管与政策 | 无交叉 | 金融主分类 + 背景交叉 |
| 金融科技 | 无交叉 | 金融主分类 + 背景交叉 |
| 税收和补贴工具 | 容易依赖模型或金融词 | 背景主分类 + 金融交叉 |
| 外生条件型风险溢价 | `risk premium` 抢先命中，误归纯金融且无交叉 | 有明确收益率/利差/折现率证据时金融主分类 + 背景交叉；无定价证据时归背景 |
| 谈判杠杆 | 裸词 `leverage` 误把 negotiating leverage 归金融 | 谈判、议价和组织关系归 background |
| 金融估值程序 | 有步骤就归方法，或只有结论就完全排除方法 | 主分类 finance；具备完整计算分析链时交叉 method |
| 中文方法证据 | 只识别英文 `data / output / compare` | 中英文程序词、输入、输出和口径边界同等处理 |
| 卡片结构 | 单一 `category` | `category` + `categories[]`；案例不参与分类 |
| 筛选 | 只匹配主分类 | 匹配所有交叉板块 |
| 模型回退 | 65% / 50% | 背景默认；`finance` / `method` 必须有正面证据 |

## 六、全库内容审计

当前文章的逐卡联网核验与修订记录见 [Cathie Wood 文章知识卡核验报告](cathie-wood-knowledge-card-verification.md)。该报告覆盖 `uoweyl8` 的全部 21 张卡，应用会按文章 ID 与卡片 ID 应用版本化修订，不覆盖用户标注、问答历史或阅读进度。

历史错误案例、交叉边界和实现约束见 [知识分类错误案例与交叉判定登记](knowledge-classification-error-case-register.md)。新增领域规则或进行全库重分类前，必须先对照该登记表；已核验的错误案例不能只依赖模型提示或术语词形。

### 内置知识库 10 张卡

| 卡片 | 当前分类 | 结论 |
|---|---|---|
| 实际工资 / Real wages | 金融术语 | 可计量的购买力与工资指标 |
| 通胀预期 / Inflation expectations | 金融术语 | 资产定价和政策判断指标 |
| 做空 / Short-selling | 金融术语 | 证券借贷和交易机制 |
| 非对称收益 / Asymmetric payoff | 金融术语 | 交易策略的收益结构 |
| 财政盈余 / Fiscal surplus | 金融术语 | 可计量的财政指标 |
| 税档爬升 / Bracket creep | 金融术语 | 可计量的税负变化 |
| 财政与货币政策组合 / Policy mix | 背景层 | 宏观政策协调；当前不强制标为金融 |
| 偿债成本 / Debt-service cost | 金融术语 | 利率、债务与预算传导指标 |
| 税收转嫁 / Tax pass-through | 金融术语 | 税负归宿和价格传导指标 |
| 供给瓶颈 / Supply bottleneck | 背景层 | 产业、运输和产能约束 |

结论：内置 10 张卡与当前规则一致，无需改写正文分类。

### 导入文章 18 张卡

文章：`Markets are pushing electrification. Governments must push harder`

| 分类 | 卡片 |
|---|---|
| 背景层 | electrification、Policy-market complementarity、COP、Relative price effect、state intervention、Paris Agreement climate plans、market signals and incentive structures、Energy security、Energy import dependency、Grid and storage investment、Permitting and regulatory reform、Energy import spending as a share of GDP、Electrification pathways、Electricity access、Avoided fuel import savings |
| 金融术语 | payback period、Concessional capital |
| 背景 + 金融交叉 | Value-added tax reduction |

### 规则家族审计

| 规则家族 | 正例 | 反例 |
|---|---|---|
| 金融法律 | financial law、securities litigation | 一般 law、judicial review |
| 金融政策 | monetary policy、banking regulation | industrial policy、supply bottleneck |
| 金融科技 | fintech、stablecoin | 一般 technology、algorithm |
| AI 工具与市场现象 | AI agents（背景）、AI trade repricing（背景 + 金融） | agent-based modeling（方法候选）、multi-agent simulation platform（背景） |
| 金融机制 | insurance premium financing acquisition、acquisition financing | 因有传导链就归 method |
| 民事执行 | 限制消费措施、失信被执行人、可供执行财产 | 可执行资产（不是规范术语） |
| 资产回收 | 不良资产回收、债权回收、recovery rate、LGD | 单独“资产回收”、查封拍卖分配流程 |
| 消费与医药产业 | 电解质补水趋势、品类颠覆、GLP-1 receptor agonist、首席执行官、市场细分、品牌资产、复购买家率 | 战略收购、自筹资金、公司融资、资产估值、资本预算 |
| 金融资产与定价 | term premium、credit spread、asset valuation | relative price effect、price cap |
| 外生条件与定价补偿 | geopolitical risk premium（有定价证据时金融 + 背景）、political risk premium（有定价证据时金融 + 背景） | 仅笼统市场影响的风险叙事（背景）、equity risk premium（金融） |
| 谈判与杠杆 | bargaining power、negotiating leverage、谈判筹码 | financial leverage、leveraged acquisition |
| 企业融资与资本预算 | cost of capital、payback period | equipment investment、factory construction |
| 保险与风险转移 | insurance underwriting、loan guarantee | energy security、operational safety |
| 投资组合 | portfolio、asset allocation、hedging | grid and storage investment |
| 计量与分析方法 | DCF、stress testing、证据完整的 scenario/risk/forecasting model | 仅称 model、模型软件平台、computing power、autonomous laboratory、business model |
| 产业组织 | supply bottleneck、manufacturing capacity | credit spread |
| 能源环境 | electrification、energy transition、electricity access | concessional capital |
| 法律与司法 | judicial review、regulatory framework | financial regulation（交叉） |
| 技术与军事 | cybersecurity、military procurement | fintech（交叉） |
| 健康领域 | health insurance、healthcare finance | health equity、health inequality |
| 劳动领域 | bond duration、modified duration | unemployment duration、long-term unemployment |
| 科研与卫生资金 | corporate financing gap、refinancing gap | women's health funding gap、health research funding gap |
| 风险领域 | market risk、credit risk、regulatory capital risk | regulatory risk、compliance risk、legal risk、operational risk |
| 金融估值 | relative valuation（金融 + 方法交叉）、airline revenue management（金融） | 仅有估值结论、没有计算程序时只归金融 |

### 2026-11-11 方法候选审计

对导入文章中模型标为 `cardType=method`、但此前未进入方法层的候选进行复核：

| 处理 | 术语 |
|---|---|
| 补回方法层 | founder-market fit、venture capital team evaluation、incremental vote-margin comparison、seasonal adjustment、data surprise analysis、job-growth breadth analysis、source completeness screening、new-item count vs sales value、UPC-based retail sales tracking、consumer trend evidence verification、stated preference survey、wealth quantile analysis、opportunity cost and time allocation、attribution in reported speech、personal narrative vs fundamentals |
| 金融 + 方法交叉 | relative valuation、相对估值 |
| 保持金融 | airline revenue management；原有航线收益管理与直飞溢价继续归金融 |
| 合理保留背景 | autonomous laboratory、drug discovery pipeline、incentive compatibility、ad hoc policymaking、agenda setting |

审计结论：此前的主要问题不是方法定义过严，而是分类器把模型初始 `category=method` 作为普通方法候选的必要条件，并且方法证据词几乎只覆盖英文。修正后，普通方法由 `cardType=method + 五类证据 + 两个步骤` 决定，不再依赖模型初始 `category`。

## 七、判定算法

对任意新卡片：

1. 提取主词与英文名，不以正文中偶然出现的投资或资金词直接分类。
2. 识别卡片的主要解释对象，不把金融后果或文章主题当成本体。
3. 判断主对象是否为金融估值，并同时具备完整、可重复的估值程序；是则 `finance + method`。
4. 判断是否有其他完整、可重复的方法程序；是则方法层。
5. 判断主要对象是否为金融资产、合约、机构、融资、估值、保险、投资、市场定价或金融风险；是则金融层。
6. 若主对象是外生条件，且卡片进一步说明其转化为收益率、利差、折现率、资本成本或保险价格中的补偿，则金融主分类 + 背景交叉；没有可识别定价证据时保留背景。
7. 判断背景对象与金融关系是否都实质成立；是则背景主分类 + 金融交叉。
8. 都不命中时归背景层。
9. 模型初始 `finance` 或 `method` 缺少正面证据时，不保留该分类，按背景层处理，置信度 70%。
10. 背景是默认层，不代表分类失败。

## 八、已知限制

- 关键词规则只能处理已枚举的常见术语；通用框架负责覆盖未枚举的新对象。
- `finance` 和 `method` 都需要正面证据；未命中时默认背景，避免继承模型误判。
- 同一个术语在不同语境下可能有不同主对象，例如 `valuation` 可用于企业估值，也可用于环境价值评估；后者必须由语境规则归背景。
- 本规则是产品知识分类，不构成投资、法律或会计意见。
