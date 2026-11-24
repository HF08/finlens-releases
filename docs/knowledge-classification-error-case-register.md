# 知识分类错误案例与交叉判定登记

更新日期：2026-11-13

本文件记录已经发现、核验并写入实现规则的反例。它不替代主规则书；当本文件与主规则书冲突时，以经过权威来源核验的本文件为准，并随后回写主规则书。

## 判定原则

1. 先判断卡片的主解释对象，不能由文章主题、单个词形或术语旁边的融资数字决定分类。
2. 金融后果不等于金融本体。产业行动、技术工具、法律身份和一般市场情绪不能因为“影响市场”就变成金融术语。
3. 交叉分类要求背景本体和金融关系分别成立，不能因为出现 `risk`、`premium`、`policy`、`model`、`investment` 或 `price` 就交叉。
4. 机制、流程和传导链不等于分析方法；方法必须有假设、输入、步骤、输出解释和边界。
5. 当前分类应保存核验来源、置信度和分类锁定状态。用户执行的核验结果不能被旧模型标签静默覆盖。

## 已确认的错误案例

| 案例 | 错误做法 | 正确规则 | 依据 |
|---|---|---|---|
| electrification、equipment investment、grid and storage investment | 看到 investment 就归金融 | 主对象是实体产业行动、设备、基础设施或能源转型时归 `background` | BEA；项目融资和资本成本另立金融卡 |
| capital expenditure / capex | 所有 capex 一律归背景 | 单独实体投资和会计分类归 `background`；主解释对象转为现金流、融资缺口、流动性、偿债能力或资本成本时归 `finance + background`；具备完整现金流比较程序时归 `finance + method` | BEA；IFRS IAS 7 |
| computing power、drug discovery pipeline、automated labs、autonomous laboratory、AI-for-science stack | 因为用于研究就归方法 | 工具、平台、科研基础设施和产业流程归 `background` | 方法程序要件 |
| scenario model、forecasting model、risk model、climate model | 因为含 model 就归方法 | 只有具备完整分析目的、输入、变换、输出和边界时才是方法；仅有模型名称或软件平台时归 `background` | 方法程序要件 |
| agent-based modeling、multi-agent simulation | 因为名称像模型就直接归方法 | 先按方法候选核验完整程序和步骤；模拟平台、软件工具归 `background` | 方法候选审计 |
| mechanism / 传导链 | 因为有步骤或因果链就归方法 | `cardType=mechanism` 可以属于金融、背景或方法中的任一层；机制本身不自动等于 `method` | 机制边界 |
| regulatory risk、compliance risk、legal risk、operational risk | 看到 risk 就归金融 | 一般监管、合规、法律、战略、声誉和运营风险归 `background`；只有明确金融暴露才归 `finance` | SEC、BIS、COSO、AEA |
| market risk、credit risk、liquidity risk、counterparty risk | 看到风险就归背景 | 这些是可识别的金融暴露、损失或风险转移关系，归 `finance` | BIS / Basel；AEA |
| geopolitical / political / regulatory risk premium | 只凭 risk premium 就归纯金融 | 外部条件本体和可识别定价补偿都成立时，主分类 `finance` 并交叉 `background`；只有笼统市场影响时归 `background` | 外生条件型风险溢价规则 |
| financial law | 直接归金融或直接归背景 | 主分类 `background`，交叉 `finance`；它首先规范金融交易、机构与投资者关系 | AEA JEL `K` 与 `G` 分列 |
| divorce asset division / 离婚财产分割 | 因出现 `asset`、股份、信托或估值词就归纯金融 | 默认 `background`；本案若实质涉及证券或企业权益的估值、流动性、控制权、税务或披露，则 `background + finance`。只处理住房、家庭用品等非金融财产时保持 `background` | Cornell LII；UK Matrimonial Causes Act；AEA JEL `K36` / `G`；17 C.F.R. § 240.13d-3 |
| jointly controlled equity stake / 共同控制股权 | 因存在共同控制、信托或婚姻治理就归纯背景 | 主对象是上市公司或其他企业股权资产时，主分类 `finance` 并交叉 `background`；信托与共同控制解释治理和处分限制，不改变金融资产本体 | 17 C.F.R. § 240.13d-3；Cornell LII Trust / Beneficiary |
| financial policy、金融监管、fintech | 只看 `policy`/`tech` 或只看金融词 | 主对象是金融政策/监管或金融服务数字化机制时，主分类 `finance` 并交叉 `background`；一般产业政策仍归背景 | AEA JEL；监管职责边界 |
| AI trade repricing | 把外部 AI 冲击直接归纯金融 | 外部 AI 技术、竞争或情绪冲击为主时，主分类 `background` 并交叉 `finance` | 外生冲击与资产重定价规则 |
| AI trade | 把 AI 主题交易当成一般产业趋势 | 主对象是投资者围绕 AI 资产形成的主题交易和仓位时，主分类 `finance` 并交叉 `background` | 文章语境与投资组合边界 |
| market correction / 股市修正 | 看到 correction 就归背景，或把 ETF 产品说明当成市场修正 | 股票、指数、证券或其他金融资产从高点回撤时归 `finance`、`phenomenon`；房地产、商品或产业价格修正且无金融定价关系时归 `background` | Nasdaq market correction；SEC Investor.gov |
| circular financing / 循环融资 | 把所有投资合作、采购协议或会计循环都归金融 | 只有投资、采购、云/算力承诺、供应商融资、应收应付和再融资形成实质资金闭环，并产生现金流或信用暴露时归 `finance + background`；普通合作和纯会计循环归 `background` | IFRS 现金流与供应商融资边界 |
| purchasing power / 购买力 | 因为出现在生活成本、工资谈判或抗议报道中就归背景 | 指标本体衡量货币的实际商品与服务购买能力时归 `finance`；完整给出商品篮子、价格指数、权重和实际值计算程序时归 `finance + method`；劳动和抗议只是文章背景 | BLS/Purchasing Power；实际收入与物价口径 |
| OpenAI 等上下文实体进入知识卡 `match` | 把相关实体当成术语等价别名，导致正文误标 | `match` 只能放主术语的可互换表达、缩写、词形变体或完整译名；机构、公司、人物、产品、国家和项目不得作为等价别名 | 知识卡内容匹配边界 |
| Market Correction 正文解释 ETF | 术语与正文严重错配 | 先修正正文和附属指标，再核验分类；不能用提高/降低置信度掩盖错配 | Nasdaq 定义；当前文章核验报告 |
| Wall of Worry 正文解释牛市 / ARK ETF | 术语与正文严重错配 | 解释为“市场持续担忧但价格仍可能上行”的情绪概念，不包装成统一监管术语 | 文章原句；市场情绪来源 |
| General Purpose Technology 正文解释 DCF / 久期 | 主题概念被错误替换成估值方法 | 解释技术扩散、互补性、持续改进和生产率外溢；不能因为 AI 主题基金讨论就写成估值方法 | Bresnahan & Trajtenberg 研究 |
| 消费趋势、品类颠覆、GLP-1 药物类别、CEO、品牌资产、复购买家率 | 因为文章属于财经媒体就归金融 | 消费、医药、技术、营销和公司治理背景归 `background`；只有融资、估值、资产定价或完整方法程序成立时另立金融/方法卡 | AEA 与产业边界 |
| 案例含“工资涨 5%、物价涨 7%”等无来源数字 | 把假设数字写成真实案例，并直接用增速相减 | 标注“假设/示例计算”，说明指数口径、基期、覆盖期和计算方式；精确实际值不能由两个增速直接相减 | BLS 实际工资口径；案例字段规则 |
| 案例用单一事件证明监管风险必然导致股价变化 | 把相关、事件先后或单一市场表现写成普遍因果 | 先陈述可观察事实，再说明解释和同期因素；案例不能证明普遍规律，也不能替代正文定义 | 案例字段规则；事实与解释分离 |
| 方法卡案例没有输入、假设和输出 | 用“某模型曾成功预测”代替可复述的方法演示 | 方法演示必须给出输入、假设、步骤、输出和边界；数据不足时留空或明确标注示例 | 方法程序要件；案例字段规则 |

## 交叉分类决策表

| 条件 | 主分类 | 交叉 | 说明 |
|---|---|---|---|
| 金融法律直接规范金融交易或投资者关系 | `background` | `finance` | 法律规则先成立，金融关系是规范对象 |
| 离婚财产分割 + 独立的证券/企业权益估值、流动性、控制、税务或披露关系 | `background` | `finance` | 法律分配机制为主；金融权利实现和定价关系独立成立才交叉 |
| 共同控制股权资产 + 信托、婚姻或受托人治理背景 | `finance` | `background` | 股权资产及减持、投票、披露和估值为主；法律治理解释控制来源 |
| 金融监管、金融政策、金融科技 | `finance` | `background` | 金融制度或金融服务机制为主，政策/技术背景交叉 |
| 外部条件 + 可识别收益率、利差、折现率或保险价格补偿 | `finance` | `background` | 定价补偿是主解释对象；外部条件是来源 |
| 外部条件 + 只有笼统市场影响 | `background` | 无强制交叉 | 没有独立金融关系时不得机械加 `finance` |
| AI 主题投资和仓位 | `finance` | `background` | 主题交易本体是金融资产配置；AI 产业是交叉背景 |
| AI 外部冲击导致资产重定价 | `background` | `finance` | 冲击和传导是主对象；重定价是金融后果 |
| 金融估值 + 完整可比对象、口径、倍数计算和边界 | `finance` | `method` | 金融本体和完整程序都成立才交叉 |
| capex + 完整现金流比较计算程序 | `finance` | `method` | 实体投资不是主对象；现金流比较是主程序 |
| 资产回收或恢复率 + 不良资产、债权、LGD 语境 | `finance` | 无强制交叉 | 未限定的普通财产处置仍归背景 |
| 企业内部账户循环、无融资关系 | `background` | 无强制交叉 | 会计流程不等于金融融资闭环 |

## 实施要求

“重新核验分类”按钮必须先运行规则分类，再对建议变化、低置信度或存在内容错配的卡片查询权威来源。预览中显示原分类、建议分类、交叉分类、类型、置信度、来源和状态，并从 `one`、`body` 提取主对象、独立交叉与明确否定三类原文证据。来源目录只是研究入口，不单独作为分类证明；关键词命中也不能直接产生建议。证据不足时保留原分类、把置信度降至不超过 `65%` 并保持未勾选。默认只勾选正文证据充分且建议变化的卡片。应用时建立恢复点，只修改分类相关字段，不覆盖用户标注、问答历史、词汇学习状态或文章正文。
