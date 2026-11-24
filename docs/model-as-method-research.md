# 分析模型与分析方法边界研究

核验日期：2026-11-08

## 一、问题

`scenario model`、`forecasting model`、`risk model` 是否属于分析方法？

结论先行：它们都属于“可能构成分析方法”的对象，但不是因为名称中含有 `model`。只有当卡片描述能够还原完整的分析程序时，才归入分析方法；如果对象实际上是软件、计算系统、平台、具体实现，或只有一句“这是模型”，则不应仅凭 `model` 归入方法层。

## 二、权威依据

### 1. 美联储 SR 11-7

来源：

- [SR 11-7: Guidance on Model Risk Management](https://www.federalreserve.gov/boarddocs/srletters/2011/sr1107.htm)
- [SR 11-7 attachment PDF](https://www.federalreserve.gov/boarddocs/srletters/2011/sr1107a1.pdf)

原文第 3 页将模型界定为：

> “a quantitative method, system, or approach that applies statistical, economic, financial, or mathematical theories, techniques, and assumptions to process input data into quantitative estimates.”

原文进一步说明模型由三部分组成：

1. information input：把假设和数据送入模型；
2. processing：把输入转换为估计值；
3. reporting：把估计值转换为可用的业务信息。

原文还列出模型可服务于分析商业策略、识别和计量风险、估值、压力测试、资本充足性评估和限额管理等。

核验结论：

- 模型可以是“quantitative method”，这说明模型不是天然的工具类别。
- 模型也不是自动等于方法；美联储的定义同时包含 `system` 和 `approach`。
- 判断时应看它是否具有假设、输入、处理转换和输出解释，而不是只看 `model` 一词。

### 2. 英格兰银行 PRA SS1/23

来源：

- [SS1/23: Model risk management principles for banks](https://www.bankofengland.co.uk/prudential-regulation/publication/2023/may/model-risk-management-principles-for-banks-ss)
- [SS1/23 PDF](https://www.bankofengland.co.uk/-/media/boe/files/prudential-regulation/supervisory-statement/2023/ss123.pdf)

原文第 2.3 段：

> “Models are a subset of quantitative methods.”

同段说明模型输出是 estimates、forecasts、predictions 或 projections，并且模型是不完美的现实表示，是复杂系统和过程的简化，建立在有限观察之上。

原文第 2.4 段将模型定义为：

> “a quantitative method that applies statistical, economic, financial, or mathematical theories, techniques, and assumptions to process input data into output.”

原文同时说明输入可以是定量、定性或专家判断，输出也可以是定量或定性。

核验结论：

- 预测模型、情景模型和风险模型可以属于定量方法，而不是只能归背景。
- 它们的共同核心是理论或假设、输入数据、处理过程、输出，以及适用边界。
- 模型输出具有不确定性，因此适用条件、假设有效性和结果解释属于方法定义的必要组成部分。

### 3. BIS 压力测试原则

来源：

- [Stress testing principles](https://www.bis.org/bcbs/publ/d450.htm)
- [Stress testing principles PDF](https://www.bis.org/publications/201810-guidelines-stress-testing-principles.pdf)

第 7 条原则指出，评估情景和敏感性影响的模型与方法应当 fit for purpose，并要求：

- 在建模阶段明确数据覆盖、分段、粒度和风险类型；
- 模型复杂度与测试目标、组合类型和重要性匹配；
- 模型和方法有充分理由并形成文档；
- 模型开发与业务目标、风险驱动因素和情境假设结合；
- 模型、假设、情景和结果接受挑战与定期复核。

核验结论：

- 情景模型可以是一个分析方法的组成部分，尤其是压力测试、情景分析和风险计量中的建模程序。
- 仅有“模型”或“软件”不足以构成完整方法；必须能够看到情景、输入、传导、输出和结果解释。
- 同一名称既可能指方法，也可能指实现该方法的系统，因此必须依据卡片描述而非词尾判定。

### 4. NIST/SEMATECH 过程建模

来源：

- [NIST/SEMATECH e-Handbook: What is process modeling?](https://www.itl.nist.gov/div898/handbook/pmd/section1/pmd11.htm)

NIST 将过程建模描述为：把一个变量的总变异拆分为一个由其他变量构成的确定性函数，再加上一个服从特定概率分布的随机部分。

核验结论：

- 模型包含变量、函数关系、随机结构和假设，不等同于软件平台。
- 一个模型只有在说明如何从输入得到可解释输出时，才具有方法属性。
- “过程建模”“预测建模”“风险建模”是方法或方法体系；具体软件实现是工具。

## 三、FinLens 判定标准

### 可以归入分析方法

`scenario model`、`forecasting model`、`risk model` 同时满足以下证据链时，可以归入 `method`：

1. **分析目的**：用于情景比较、预测、风险计量、估值或决策。
2. **假设或模型设定**：说明关键假设、函数关系、参数或结构。
3. **输入**：说明数据、变量、情景或参数来源。
4. **变换步骤**：说明估计、模拟、传导、折现、计算或检验过程。
5. **输出与解释**：说明输出指标以及如何据此判断或决策。
6. **适用边界**：说明误差、不确定性、失效条件、验证或复核要求。

至少应当能够从卡片正文、`methodSteps` 或分类理由中还原上述主要链路。仅有“模型”“系统”“方法”字样不算证据。

### 仍归背景或原分类

以下情况不能因为名称是模型而归入方法层：

- 只说“这是一个预测/情景/风险模型”，没有输入、处理或输出解释；
- 描述的核心是软件、平台、计算资源、数据库、自动化系统或具体产品；
- 只描述模型用途，没有分析程序和机制；
- 只有某个参数或结果，没有从输入到输出的推断规则；
- 模型名称本身可以识别，但卡片内容不足以还原假设、步骤与边界；
- 研究对象主要是技术基础设施或产业流程，而非分析程序。

## 四、正反例

| 对象 | 分类 | 判定依据 |
|---|---|---|
| 情景模型：以增长、利率和政策路径为输入，按传导关系生成情景结果，并用资本充足率阈值解释 | 方法 | 有情景假设、输入、传导步骤、输出和决策规则 |
| 情景模型：情景分析所使用的软件工具 | 背景层 | 核心对象是软件实现，不是完整分析程序 |
| 预测模型：说明训练数据、变量、估计方法、误差评价和预测输出 | 方法 | 可还原从数据到预测的完整程序 |
| 预测模型：生成预测结果的具体模型 | 背景层 | 只说明用途，缺少假设、步骤和边界 |
| 风险模型：说明风险因子、暴露、相关性和损失分布，输出 VaR/ES 并用于限额 | 方法 | 有输入、建模、模拟、输出和风险决策规则 |
| 风险模型：风险计量平台或模型运行系统 | 背景层 | 核心是平台或实现环境 |
| 压力测试 | 方法 | 有情景、传导、结果解释和行动边界 |
| 气候模型 | 视描述而定 | 作为物理模拟工具可为背景；若卡片完整呈现建模程序、输入、输出和解释，可按方法处理 |

## 五、对当前规则的修改建议

1. 从背景层硬编码中移除 `scenario model`、`forecasting model`、`risk model`。
2. 新增“分析模型证据判定”：模型词只能触发候选检查，不能单独触发 `method`。
3. 分类器同时读取 `methodSteps`、`body`、`one`、`classificationReason` 和 `categoryReason`，检查目的、假设、输入、步骤、输出解释和边界。
4. 不满足方法证据的模型词默认保留背景层，避免把软件实现、平台或简短定义误判为方法。
5. 模型输出提示词要求：若把对象归为 `method`，必须给出可执行步骤和适用边界；否则不得使用 `method`。
6. 回归测试同时覆盖：
   - 只有“模型工具”描述时仍为背景；
   - 具有完整分析链的预测、情景和风险模型为方法；
   - `model` 单独出现不能改变分类。

## 六、参考来源核验状态

- 美联储 SR 11-7 附件 PDF：已联网读取并提取原文。
- 英格兰银行 SS1/23 PDF：已联网读取并提取原文。
- BIS 压力测试原则 PDF：已联网读取并提取原文。
- NIST/SEMATECH 过程建模页面：已联网读取原文。
