# 金融概念与分析方法边界研究

更新日期：2026-11-08

本文回答两个独立问题：

1. `computing power`、`drug discovery pipeline`、`automated labs`、`autonomous laboratory`、`AI-for-science stack` 是否属于金融？
2. 什么对象属于“分析方法”，什么对象属于工具、基础设施、平台、科学模型或工作流？

结论先行：前五个对象均不属于金融；它们默认属于背景层中的科研技术、基础设施或研发流程。它们也不满足本文给出的“分析方法”定义。

## 一、科研技术是否属于金融

### 权威分类依据

**AEA JEL Codes**

来源：[American Economic Association, JEL Codes](https://www.aeaweb.org/econlit/jelCodes.php?view=jel)

- `G Financial Economics` 覆盖金融资产、金融市场、金融机构、公司融资、估值与金融风险。
- `C Mathematical and Quantitative Methods` 覆盖计量、统计、预测和模拟方法。
- `L Industrial Organization`、`O Technological Change`、`M Business Administration and Business Economics` 与金融经济学分列。

因此，一项活动涉及计算、实验、研发或技术平台，并不能单独构成金融分类依据。

**NBER Programs**

来源：[NBER, Programs & Working Groups](https://www.nber.org/programs-projects/programs-working-groups)

NBER 将金融研究与技术和产业研究分列：

- 金融：`Asset Pricing`、`Corporate Finance`、`Financial Institutions`。
- 技术与产业：`Industrial Organization`、`Productivity, Innovation, and Entrepreneurship`。

其中 `Corporate Finance` 研究企业与家庭的融资决策；`Industrial Organization` 研究企业行为、产业动态、竞争和定价；`Productivity, Innovation, and Entrepreneurship` 研究创新、专利、创业和生产率。算力、药物研发管线和自动化实验室主要落在后两类科技与产业语境，而不是融资、资产定价或金融机构语境。

**OECD Frascati Manual**

来源：[OECD, Frascati Manual 2015: Guidelines for Collecting and Reporting Data on Research and Experimental Development](https://doi.org/10.1787/9789264239012-en)

Frascati Manual 将研究与实验开发界定为增加知识存量并创造新应用的系统性创造性工作，并区分基础研究、应用研究和实验开发。实验室、科研平台、研发管线和 AI-for-science 工具服务于 R&D 活动，属于科研与创新统计范围，不是金融活动的定义。

**FDA 药物开发流程**

来源：[U.S. Food and Drug Administration, The Drug Development Process](https://www.fda.gov/patients/drug-development-process)

FDA 将药物开发描述为从发现与筛选、临床前研究、临床试验到监管审评的连续阶段。`drug discovery pipeline` 表示这一科研与开发流程，英文中的 `pipeline` 不表示融资项目管线。

### 逐项结论

| 对象 | 主要含义 | 分类 | 理由 |
|---|---|---|---|
| `computing power` | 计算资源或算力供给 | 背景层：技术基础设施 | 不是金融资产、金融工具、融资或定价关系 |
| `drug discovery pipeline` | 候选药物从发现到开发的研发阶段序列 | 背景层：科研与产业流程 | 属于 R&D 和新药开发，不是投资或融资管线 |
| `automated labs` | 自动化实验设施 | 背景层：科研基础设施 | 工具和执行环境，不是分析方法本身 |
| `autonomous laboratory` | 可自主规划、执行或迭代实验的实验室系统 | 背景层：科研基础设施 | 属于科研平台/系统，不是金融概念 |
| `AI-for-science stack` | 面向科学研究的 AI 软件、模型和基础设施组合 | 背景层：技术工具链 | 属于科研技术栈，不是金融或纯分析方法 |

如果卡片讨论的是算力中心建设贷款、设备租赁、项目融资或相关金融风险，金融分类应落在“融资、资本成本、担保或金融风险”这一主对象上；`computing power` 或实验室本身仍应保留为背景。不能因为正文偶然出现 `funding`、`investment` 或 `cost`，就把技术对象判为金融。

## 二、分析方法与工具

### 权威依据

**AEA JEL C**

来源：[AEA, JEL Codes](https://www.aeaweb.org/econlit/jelCodes.php?view=jel)

`C Mathematical and Quantitative Methods` 单列计量经济与统计方法、模型、预测、模拟、最优化和博弈论。这支持把“分析方法”理解为分析程序或模型体系，而不是计算机、软件平台或实验设施。

**BIS Stress testing principles**

来源：[Basel Committee on Banking Supervision, Stress testing principles](https://www.bis.org/publications/201810-guidelines-stress-testing-principles)

BIS 将压力测试界定为一套具有目标、治理、政策、流程、方法、资源和文档要求的活动。压力测试之所以是方法，是因为它规定情景、输入、传导步骤、结果解释和行动边界；硬件、数据库或模拟软件只是执行设施。

**NIST/SEMATECH e-Handbook of Statistical Methods**

来源：[NIST/SEMATECH e-Handbook of Statistical Methods](https://www.itl.nist.gov/div898/handbook/)

NIST 手册把统计方法呈现为假设、数据输入、模型选择、估计或检验步骤以及结果解释的程序。统计软件是实现程序的工具，不能代替方法本身。

**IPCC 气候模型定义**

来源：[IPCC, Annex I: Glossary](https://www.ipcc.ch/report/ar6/wg1/chapter/annex-i-glossary/)

IPCC 将气候模型描述为基于物理、化学和生物过程对气候系统进行数值表示的科学模型。模型可以是情景分析所调用的工具，但模型对象本身不等于分析方法的完整决策程序。

### FinLens 定义

> 分析方法是可重复、可迁移的推理程序：它说明假设和输入，通过明确的变换与推断规则产生可解释输出，用于估计、检验、预测、估值、归因、风险计量或决策。

方法候选应在以下六类证据中至少命五类，并强制包含分析目的、输入、变换步骤、输出解释：

1. **明确分析程序**：说明要解决何种分析问题。
2. **假设**：给出模型、因果、统计或行为假设及适用边界。
3. **输入**：说明数据、参数、情景或变量来源。
4. **变换步骤**：说明计算、估计、检验、折现或模拟过程。
5. **输出与推断/决策规则**：说明结果如何解释，以及如何形成判断或行动。
6. **可重复应用**：同一程序可应用于不同数据或案例，而不是只指一个具体设备、软件实例或平台。

不要求每个术语名本身都写出全部六项，但卡片正文或方法步骤必须足以还原这套程序。仅有 `model`、`framework`、`method`、`analysis` 等泛词不构成方法证据。

`relative valuation`、`相对估值`和可比公司估值是金融估值程序：主分类为金融；如果同时具备可比对象、口径统一、倍数计算、风险检查和边界，才交叉归入方法。

### 方法、模型与工具的区别

- **方法**是“如何从假设和输入得到结论”的程序。
- **模型**可以是对现实关系的数学、统计或逻辑表示，也可以是以假设和输入生成估计、预测、情景或风险结果的分析程序；是否属于方法取决于描述能否还原完整分析链。
- **工具/平台/基础设施**是执行方法或承载模型的设备、软件和资源。
- **工作流/管线**是多个步骤、工具和组织环节的编排，不自动构成分析方法。

因此：

- `DCF` 是估值方法；Excel 财务模型或估值软件是工具。
- `regression analysis` 是统计方法；统计软件或回归平台是工具。
- `event study` 是事件窗口与异常收益推断方法。
- `stress testing` 是方法；计算集群、数据库和报表系统是工具。
- `scenario analysis` 是方法；情景模拟软件是工具。
- `cost-benefit analysis` 是方法；项目评估系统是工具。
- `Monte Carlo` 是方法；随机数生成器和计算平台是工具。
- `climate scenario analysis` 可以是方法；`climate model` 作为物理投影工具时归背景，若卡片完整说明建模假设、输入、模拟步骤、输出解释与边界，可按方法处理。
- `machine learning analysis` 在明确训练、验证、评估和推断程序时可以是方法；`machine learning platform` 是工具。
- `scenario model`、`forecasting model` 和 `risk model` 只有在提供分析目的、假设与输入、变换或模拟步骤、输出解释和适用边界时才是方法；仅描述软件工具或单一模型名称时归背景。
- `AI-for-science stack`、`automated labs` 和 `autonomous laboratory` 是工具、平台或基础设施，默认归背景层。
- `AI agents`、`autonomous agents`、`agentic workflow`、`multi-agent system` 和 AI 模拟平台是软件系统、执行流程或工具环境，归背景层。
- `agent-based modeling` 和 `multi-agent simulation` 是方法候选；只有描述能够还原主体、规则、输入、模拟步骤、输出和边界时才归方法。
- `drug discovery pipeline` 是研发工作流，默认归背景层。
- 传导机制、因果路径或风险链条可以归为 `cardType=mechanism`，但机制本身不等于分析方法；只有可执行、可迁移的推断程序才归 method。

### 易混淆案例

| 对象 | 正确分类 | 原因 |
|---|---|---|
| 机器学习分析 | 方法 | 有训练、验证、评估和推断规则 |
| 机器学习平台 | 背景层：工具 | 承载模型的软件环境 |
| 气候情景分析 | 方法 | 明确情景、暴露、影响和决策解释 |
| 气候模型 | 视描述而定 | 作为物理投影工具归背景；完整呈现建模假设、输入、模拟、输出和边界时可归方法 |
| 压力测试 | 方法 | 有情景、传导机制、结果解释和管理行动 |
| 自动化实验室 | 背景层：基础设施 | 执行实验的设备和系统 |
| 情景模型：软件工具 | 背景层 | 核心对象是分析程序的实现环境 |
| 预测模型：训练数据、估计方法、误差评价与预测输出完整 | 方法 | 可还原从数据到预测的完整程序 |
| 风险模型：风险因子、损失分布、VaR/ES 输出和限额规则完整 | 方法 | 有输入、建模、模拟、输出和风险决策边界 |
| AI agents、agentic workflow、multi-agent system | 背景层 | 软件系统、执行代理或工作流工具 |
| agent-based modeling：主体、规则、输入、模拟和边界完整 | 方法 | 可还原的模拟分析程序 |
| multi-agent simulation platform | 背景层 | 模拟程序的软件实现环境 |
| insurance premium financing acquisition | 金融术语 + mechanism | 融资收购安排，传导机制不等于分析方法 |

## 应用规则

1. 先判断卡片主要解释对象，不因正文偶然出现资金、成本或投资词而改归类。
2. 科技对象只有在研究对象明确转为融资、估值、资本预算、保险、金融风险或金融定价时，相关部分才进入金融。
3. 只有具备可还原的分析程序与推断规则，才进入方法层。
4. 算力、AI 技术栈、科研平台、实验室、研发管线和模型软件实现默认进入背景层。
5. 不得用 `pipeline`、`stack`、`platform`、`model`、`automation` 或单纯的 `analysis` 字样触发方法分类。
6. 分析模型只有在卡片能够还原分析目的、假设与输入、变换步骤、输出解释和适用边界时才进入方法层。
7. `cardType=mechanism` 只描述知识卡的解释形式，不能单独触发 `category=method`。

模型方法的专业依据与正反例见 [分析模型与分析方法边界研究](model-as-method-research.md)。
