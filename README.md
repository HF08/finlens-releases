# FinLens · 财经外刊学习工作台

把「读外刊」变成一条可闭环的学习流水线：**抓取 → 逐段精读 → 词汇与金融知识双标注 → 间隔重复 → 计划复盘 → 讲义归档**。
零构建、核心学习功能可离线使用；在线模型标注、Edge 朗读和 RSS 更新需要联网。

---

## 快速开始

**方式一：直接打开（核心学习功能离线可用）**

双击 `index.html`。内置 5 篇来自 The Economist 的财经文章节选（25 段、35 个学习词汇、10 张金融知识卡），无需任何配置。

**方式二：本地服务（推荐，解锁抓取 + 在线标注）**

```bash
npm install                     # 首次安装 Edge 朗读与 JSON 修复依赖
node server/server.mjs          # 默认 http://127.0.0.1:8787
```

需要 Node.js 22.5 或更高版本。Windows 可直接双击 `start.cmd`。

**Windows 安装包**

当前提供 Windows 10/11 x64 的 Electron 安装版：

```text
release\FinLens-0.2.0-x64-Setup.exe
```

安装按当前用户完成，不需要管理员权限；用户数据位于 `%APPDATA%\FinLens`，卸载默认保留学习记录。安装版会从公开的 GitHub Releases 仓库检查更新，下载和重启均由用户确认；升级会替换旧程序目录并保留用户数据。桌面版支持关闭到系统托盘继续运行，本地服务和自动抓取不会因隐藏窗口而停止。该版本是**未签名测试版**，Windows 可能提示未知发布者。安装、更新、数据位置、PDF 与构建说明见 [Windows 安装包指南](docs/windows-installer.md)。

离线词典使用 MIT 许可的 [ECDICT](https://github.com/skywind3000/ECDICT)，运行时读取 `data/dictionary/ecdict.sqlite`。更新源 CSV 后可重新生成：

```bash
npm run dictionary:build
```

当前已安装 770,611 条词目的完整快照；包来源、SHA-256 和构建信息见 `data/dictionary/PROVENANCE.md`。

**方式三：启用在线 LLM 引擎**

1. 点击右上角 `AI` 打开模型引擎；本机 CC Switch 配置会自动读取，点击「导入所选配置」只带入地址、模型目录和供应商引用。API Key 由本地服务按供应商 ID 使用，不返回或写入浏览器。手动输入的 Key 也会在输入框失焦后立即迁移到本地凭据库，浏览器只保存本地凭据 ID
2. 点击「拉取模型列表」和「真实连接测试」，确认接口与模型确实可用
3. 点击「导入外刊链接」可导入网页、微信公众号，或上传 TXT / Markdown / HTML / DOCX / PDF
4. 打开“导入文章”后，可设置知识详解是否联网检索 GDELT 新闻与 Crossref 学术元数据
5. 同一导入面板可配置 RSS / Atom、日期窗和检查间隔，工作台保持打开时会自动导入新文章

学习目标、词汇详略和“词汇与解析侧重”在右上角 `⚙` 中设置，模型连接在 `AI` 中设置；自动抓取、来源核验和文章导入统一放在“导入文章”中。

“导入文章”面板还可读取 GitHub 的 `awesome-english-ebooks/01_economist` 资源：自动列出期号、选择最新或历史一期、解析该期 EPUB 并选择文章导入。财经订阅提供两个本地固定配置列表，不再从 GitHub 拉取 Feed：列表 1 为 5 个官方一手源，列表 2 为 7 个已验证的市场媒体与宏观源。

也可用环境变量启动：`OPENAI_API_KEY=sk-xxx node server/server.mjs`

知识详解的新闻检索默认使用无需密钥的 GDELT；如果网络或接口受限，可额外设置 `TAVILY_API_KEY` 作为专业新闻搜索备用通道。学术元数据默认使用 Crossref。可用 `FINLENS_RESEARCH_MODE=off` 统一关闭联网核验。

原生 App 化评估见 `docs/native-app-feasibility.md`。

---

## 功能地图（对应原流程图的四个模块）

| 模块 | 原图设计 | 本工作台实现 |
|---|---|---|
| ① 内容抓取 | 定时爬虫 / 统一接口 / 时间线列表 | `/api/feed` 解析 RSS / Atom 并按最长一年的日期窗过滤；`/api/fetch` 支持普通网页和公众号正文；`/api/document` 支持文档上传；提供 Fed、BIS、ECB、SEC、CNBC 推荐源 |
| ② 翻译与词汇标注 | 逐段对照 / 交互注释 / 词汇浮层 | 默认先显示原文；点词先给当前语境，可再进入词典详解；详细模式展示按语法类型标注的词形转换。正文中选中任意英文单词可直接查词，选中句子仍只显示标注操作。支持音标、词形、同义词、IELTS/TOEFL/金融侧重、例句和生词本。学习侧重通过 `/api/focus-refresh` 原子更新词汇与精读解析 |
| ③ 金融知识批注 | 大模型接口 / 文中检索 / 行内批注 / 补充总结 | 每段分离英语层（长难句、语法逻辑、表达）和金融层（术语、机制背景、文章关联）；AI 总结与追问使用专门金融教学提示词 |
| ④ 学习产出与归档 | 一键讲义 / 词汇闪现 / 主题归档 | Markdown 讲义导出（可选译文/词汇表/知识卡/个人标记）、按所选文章打印/存为 PDF、全部/今日/待复习词汇 CSV、今日单词卡 HTML、JSON 备份与恢复、词汇闪现与测验、主题掌握度与连续天数统计 |

自动抓取在**应用运行期间**按配置间隔运行；Windows 桌面版最小化或关闭到托盘后仍会继续。配置列表 1 为 Fed、BIS、ECB、SEC、CNBC 五个官方源；配置列表 2 为 CNBC Top、CNBC Markets、Fortune、NPR Business、SEC、ECB、FRED Blog 七个已验证源。列表 2 只保留“RSS 可读且正文页可抓取”的源；MarketWatch 与 Nasdaq 虽提供 RSS，但正文页分别返回 401/403，因此已移出默认配置。自动检查开关默认关闭，避免后台无提示请求。
订阅源通过 RSS / Atom 提供历史条目；日期窗只能筛选源站实际提供的内容，不能保证所有站点都能回溯完整一年。

## 设计要点：灵活性 · 可选择性 · 专业性

- **三种阅读模式**：原文（默认，辅助关闭）／精读（全开）／沉浸（译文悬停）
- **两级标注可独立开关**：生词始终使用青色系（已学仅降低底色强度），金融术语始终使用琥珀实线；术语内包含生词时保留青色底纹与术语实线双重编码
- **插件式筛选**：主题 × 难度 × 未学习/学习中/已学习；记录上次学习时间、进度和复习次数。文章末尾可先确认导入本篇全部生词，再进入仅含本篇词汇的复习队列，已有评分和到期时间保持不变
- **文章管理**：内置文章只读，导入文章可进入管理模式批量删除；删除时同步清理该文的阅读记录、生词、标记、总结、问答和词典缓存
- **我的标注**：支持整段星标和正文划词句子标注；正文保留句子高亮，“我的标注”可写笔记、回跳原文或删除。笔记随 JSON 备份保存，并可导出到 Markdown 和打印讲义
- **失败重跑**：若导入时模型标注失败而选择“仅保存原文”，阅读页正文顶部会保留“重新运行标注”入口；重跑成功后在原位替换为完整译文、词汇、术语和解析，失败则保留原文并显示原因
- **选区查词**：在正文选中单个英文单词时出现紧凑的“查词 / 标注所选”浮标；查词仅由用户点击触发，结合当前句子展示 ECDICT 释义及可选韦氏权威释义。多词或句子选区只提供标注，手机端浮标限制在视口内
- **导入失败诊断**：没有模型 Key、正文质量不足或模型结果缺少词汇/知识卡时，导入弹窗会保留并显示具体原因、处理方案、重试、测试模型连接、仅保存原文和复制诊断；重复导入同一链接会打开已有文章
- **词汇与解析侧重**：切换侧重会原子更新当前文章的 `vocab` 与段落 `analysis` 覆盖层。IELTS 强调学术改写、论证衔接和写作口语表达；TOEFL 强调指代、句间关系、推断和摘要表达；金融侧重压缩泛化英语说明，强化术语机制、估值与风险推理。任何一侧生成失败都不会写入半套结果；原文、译文、`{{术语标记}}`、知识卡、用户标注和问答记录保持不变
- **内容质量闸门**：修复常见乱码，按句子清理新闻提示、订阅推广、实时行情免责声明、下载声明、广告和图注；保留正文中合法出现的 `subscribe` 等词，少于两段或约 25 词的内容拒绝导入
- **知识三层与类型**：知识卡分为金融术语、背景层和分析方法，并标记概念、现象、机制或方法类型；知识库支持分类筛选与别名去重，详解使用独立页面呈现定义、机制、适用场景、指标、案例、来源与 AI 追问。英文副标题统一使用灰色等宽小字，避免与中文主标题争夺视觉层级
- **知识分类校验**：服务端和客户端执行同一套专业边界校验。金融卡必须以金融资产/合约、金融机构、融资与资本结构、资本预算、估值、保险、投资组合、风险转移或市场定价为主要解释对象；设备采购、厂房建设、电网与储能扩容、制造产能、技术采用、供应链、运营、电气化与能源转型属于实体产业或基础设施，归背景层。一般法律、司法、技术、军事、健康公平、健康科研 funding gap、失业持续期与产业概念也归背景层；`equity` 只有构成股权融资、股票市场、股东权益等明确金融组合时才归金融，`duration` 只有构成修正久期、债券久期或久期缺口时才归金融。`funding` 也只有形成企业融资缺口、再融资缺口等明确融资关系时才归金融。`bargaining power`、`negotiating leverage`、谈判筹码和议价能力属于谈判与组织关系背景，裸词 `leverage` 不得误触发财务杠杆。`regulatory risk`、`compliance risk`、`legal risk` 和一般 `operational risk` 归背景，只有市场风险、信用风险、监管资本风险等明确金融暴露才归金融。分析方法定义为具有假设、输入、步骤、输出和推断规则的可重复程序；DCF、压力测试、气候情景分析、seasonal adjustment、data surprise analysis 和中文完整程序都归方法。`scenario model`、`forecasting model`、`risk model` 不按名称直接分类：描述能还原完整分析链并给出 `methodSteps` 时归方法。`relative valuation`、`相对估值`和可比公司估值主分类为金融；只有同时具备可比对象、口径统一、倍数计算、风险检查和边界时，才作为“金融 + 方法”交叉，其他金融概念不因有数字就自动交叉。`AI agents`、`agentic workflow`、`multi-agent system` 和 AI 模拟平台归背景；`agent-based modeling`、`multi-agent simulation` 是方法候选，必须满足完整程序证据。`cardType=mechanism` 不自动触发方法分类，`insurance premium financing acquisition`、`acquisition financing` 和中文“保费资金融资收购”仍归金融。`AI trade repricing` 使用背景主分类并交叉金融；`geopolitical risk premium`、`political risk premium`、`regulatory risk premium` 等外生条件型风险溢价只有在描述出现收益率、利差、折现率或保险价格等定价证据时，才以金融为主并交叉背景，否则保留背景；`equity risk premium`、`term premium`、`credit spread` 保持金融。金融法律、金融监管与金融政策、金融科技使用“主分类 + 交叉板块”。完整专业依据、旧规则、当前规则及全库审计见 [知识库分类规则书](docs/knowledge-taxonomy-rulebook.md)、[跨分类边界研究](docs/cross-classification-negotiation-geopolitical-risk.md)、[方法与工具边界](docs/method-vs-tool-research.md)、[分析模型边界研究](docs/model-as-method-research.md) 与 [AI 与金融机制边界研究](docs/ai-agents-and-financial-mechanism-research.md)
- **民事执行与资产回收**：限制高消费、失信被执行人、可执行资产、可供执行财产归背景层；单独“资产回收”默认背景，只有不良资产回收、债权回收、recovery rate、LGD 等明确金融语境归金融。查封、拍卖、分配和回收流程属于机制，不因步骤完整而进入方法层
- **消费与医药产业边界**：电解质补水趋势、补水需求、饮料品类扩张、品类颠覆、GLP-1 receptor agonist 等药物类别、首席执行官、市场细分、产品差异化、品牌资产/相关性、复购买家率和消费品增长战略归背景层；战略收购、自筹资金和融资活动仍归金融
- **通用分类判断**：先识别卡片的主要解释对象，再依次检验完整方法程序、金融本体和背景交叉。模型初始标签只是弱提示；缺少正面金融本体证据时不保留 `finance`，缺少完整程序证据时不保留 `method`，默认归背景层。完整决策树、反事实检验、易混淆矩阵和置信度规则见 [知识分类判断框架](docs/knowledge-classification-decision-framework.md)
- **分类重新核验**：知识库工具栏和每张知识卡内均可发起规则优先的分类核验。预览把证据拆成主对象片段、独立交叉片段和明确否定片段，并显示对应判断理由；来源目录与检索页面只作为后续研究入口，不单独构成分类依据。只有正文证据充分的变化项才会默认勾选；证据不足时保留原分类、降低置信度并禁止自动应用。支持当前筛选或全库范围、逐项人工确认、撤销最近一次应用；分类核验与详解来源联网核验分别显示状态
- **案例质量规则**：`cases` 只用于说明术语本体、机制或边界，不参与分类。真实案例优先，无法核验时留空；数字必须注明期间、单位、来源或口径，假设数字必须标记“假设/示例计算”。含无来源百分比的案例会在重新核验时提示，并进入“正文与案例核验”确认窗口，用户确认前不自动覆盖
- **来源核验**：知识详解可联网检索 GDELT 新闻和 Crossref 学术元数据，并补充 SEC、Fed、BIS、IMF、BLS、BEA、IFRS、FINRA、Nasdaq、AEA、NBER、World Bank、OECD 等权威目录；来源明确区分在线已核验、官方目录和未核验状态
- **词汇库管理**：可按文章批量加入词汇，设置卡片与测验筛选，并按已复习/未复习状态清理。批量侧重调整会同时生成词汇差异与精读解析更新：选择当前/所选/全部文章后预览，确认后保留未变化词的学习进度、加入新词并移除被替换词，同时刷新各段的侧重解析
- **学习完成判定**：滚到底只记录进度，必须点击工具栏“标记已学习”才算完成；“继续复习”同样位于正文前
- **文章浏览**：支持其他主题与建议标签、日期/来源正倒序、动态导航计数和右栏收起
- **自动化与可控性**：RSS / Atom 只配置一次，可设定 30 分钟到每天的检查频率、起止日期和单次导入上限
- **词汇信息密度**：简略模式适合快速阅读，详细模式用于精读；可切换通用、IELTS、TOEFL 或金融术语侧重
- **间隔重复**：简化 SM-2，记忆间隔为 1/3/7/16/35 天；忘记为 10 分钟后，模糊按当前记忆盒取半程间隔，记住进入下一盒
- **专业语料**：术语卡不是词条翻译，而是「一句话讲透 + 机制 + 真实案例」，例如期限溢价、基本赤字、债务通缩、金融脱媒、财政盈亏平衡油价
- **朗读**：默认使用无需密钥的 Edge 在线语音；仍可选择浏览器本地语音或支持 `/audio/speech` 的 OpenAI 兼容服务，提供原生音频控件与停止操作
- **词汇复习**：主视图固定为“待学习 / 待复习 / 全部词汇”。新词只进入“待学习”和“全部词汇”，首次评分后才进入复习调度；“待复习”只显示已学习且到期的词。“全部词汇”按规范化词形跨文章去重，同一个词只保留一个学习与复习状态
- **队列恢复**：开始一轮后会冻结词单并保存卡片、测验各自的位置。评分只推进当前位置，新加入词汇不会插入本轮；中断、刷新或下次打开会恢复同一轮和同一位置，“重新开始本轮”才会按最新词库重新取词
- **模式隔离**：卡片、测验、闪现分别保存各自的队列和位置；词汇库管理中的筛选只影响卡片和测验，闪现固定使用全部词汇，不受到期、学习状态或筛选影响
- **词汇状态只读**：阅读台侧栏的“未收录 / 未学习 / 待复习 / 已安排”徽标由词汇库记录自动计算，不能点击修改；只有卡片或测验评分会更新学习状态与到期时间
- **回顾与日志**：词汇侧栏可查看已复习记录；学习状态自动写入 `data/backups/` 并保留最近 20 份
- **学习事件账本**：标记文章已学习、开始文章复习、首次评分单词和后续单词复习都会写入按日事件；历史日历按真实事件显示读过的文章、新学与复习的单词
- **学习日历与计划**：日历可为每一天指定精读或复习文章，设置文章/词汇目标和备注；选中日期可查看实际完成明细、目标状态和最近 26 周学习热力图。旧数据中无法还原的日期标记为旧版汇总，不伪造明细
- **统一任务中心**：文章标注、词汇侧重批处理、AI 总结、知识卡核验和自动抓取共用持久任务状态。左下任务卡显示运行中任务和缩略进度，展开后可按进行中、失败、历史和全部筛选，查看失败原因、恢复建议并重试
- **文章思维导图**：文章末尾可按“中心论点 → 分论点 → 证据 → 结论/影响”生成横向逻辑树，节点保留正文段落来源；悬停或聚焦节点可查看推理链、相关句子、重点单词和关联知识卡，点击“相关句子”会关闭导图并滚动高亮原文对应段落。导图按文章缓存，可重新生成；服务端限制树深度、节点数和标签长度，异常输出不会覆盖已保存导图
- **单词卡导出**：词汇页支持导出今日已学习单词卡片 HTML、今日词汇 CSV、全部词汇 CSV 和当前待复习 CSV；今日卡片为自包含可打印 HTML，不依赖外部资源
- **词典分层**：ECDICT 提供离线中英释义、音标、词性和词形变化；可选 Merriam-Webster Learner’s 提供独立权威释义。韦氏结果只作当前会话展示，不写入本地持久缓存，也不会发送给模型继续加工

---

## 验证结果

`tests/verify.mjs` 覆盖原有学习闭环（71/71），`tests/feedback.mjs` 覆盖 2026-10 反馈、固定 Feed 配置、CC Switch 与手输密钥的服务端托管（55/55），`tests/feedback-v2.mjs` 覆盖正文深度清洗、知识分类强制校验、金融与实体产业边界、风险与制度边界、分析方法与工具边界、中文方法证据、金融估值交叉、分析模型证据链、AI agents 与 AI 交易重定价、金融机制与分析方法分离、通用背景兜底、消费营销与企业管理边界、导入弹窗焦点稳定性、健康公平与股权歧义、健康科研 funding gap、失业持续期与债券久期、交叉板块、分类依据折叠、知识类型与联网来源核验、词汇与解析侧重同步刷新、批量预览与应用、失败回滚、稳定卡片与测验队列、刷新后队列恢复、已完成词清理后的当前位置保持、三种词汇模式隔离、只读词汇状态、段落/句子标注与笔记、选区查词、知识卡副标题层级、遗忘曲线、左栏学习状态、测试备份隔离和移动端侧重管理（154/154）。新增 `tests/focus-analysis-and-forms.mjs`（1/1）验证词形转换展示，以及词汇成功但解析失败时不写入半套结果。分类专项由 `tests/classification-research.mjs`（13/13）、`tests/knowledge-card-verification.mjs`（4/4）和 `tests/category-revalidation.mjs`（26/26）覆盖，新增案例不参与分类、证据分级、证据不足保护、独立交叉与否定片段展示、无来源百分比案例告警、完整当前正文对比、分类应用与撤销、卡内核验入口和移动端确认窗口；`tests/ai-data-management.mjs`（13/13）、`tests/export-archive.mjs`（20/20）和 `tests/term-highlighting.mjs`（5/5）覆盖问答历史、文章数据管理、产出归档与术语高亮。`tests/github-import.mjs` 覆盖 Economist GitHub EPUB（12/12），`tests/live-resources.mjs` 覆盖真实资源与配置列表 2（7/7，需运行服务具备联网权限），`tests/build-ecdict.mjs` 覆盖词库构建（4/4），`tests/dictionary.mjs` 覆盖离线词典、词形转换与韦氏适配（17/17），`tests/article-management.mjs` 覆盖导入兜底、阅读页失败重跑、抓取补位、术语高亮和文章管理（28/28），`tests/reset.mjs` 覆盖一次性数据重置（3/3）：

学习工作台 V2 新增测试覆盖事件回填与按日去重、任务生命周期与保留上限、任务中心失败重试、日历计划与热力图、今日单词卡/CSV 导出、思维导图结构清洗/生成/缓存/响应式布局：`tests/learning-events.mjs`、`tests/task-center.mjs`、`tests/task-center-ui.mjs`、`tests/learning-calendar.mjs`、`tests/vocab-export.mjs`、`tests/mind-map.mjs`。

```
node tests/verify.mjs      # 需先启动 server
node tests/feedback.mjs    # 自行启动隔离测试服务
node tests/github-import.mjs # 自行启动隔离测试服务，验证期号、EPUB、选择与导入
node tests/live-resources.mjs # 需启动联网 server，验证真实 GitHub 和 RSS 资源
node tests/build-ecdict.mjs   # 验证 ECDICT CSV → SQLite 转换
node tests/dictionary.mjs     # 验证离线词典、韦氏适配、来源标签与缓存边界
node tests/article-management.mjs # 验证导入兜底、正文点击与文章批量删除
node tests/feedback-v2.mjs        # 验证 2026-11-03 全部反馈
node tests/category-revalidation.mjs # 验证分类预览、应用、撤销和正文/案例确认
node tests/export-archive.mjs     # 验证精读选段、知识卡和 PDF 产出归档
node tests/ai-data-management.mjs # 验证问答历史与文章数据清理/恢复
node tests/learning-events.mjs    # 验证学习事件、旧数据回填、计划和热力图
node tests/task-center.mjs         # 验证任务状态机、失败与保留上限
node tests/task-center-ui.mjs      # 验证任务中心缩略进度、筛选和重试
node tests/learning-calendar.mjs   # 验证日历计划、历史明细、目标与移动端
node tests/vocab-export.mjs        # 验证今日单词卡和三类 CSV 导出
node tests/mind-map.mjs            # 验证导图生成、结构清洗、缓存和移动端
node tests/term-highlighting.mjs  # 验证术语高亮与上下文实体边界
node tests/server-embed.mjs       # 验证 Electron 可嵌入服务与独立数据目录
node tests/desktop-smoke.mjs      # 验证桌面壳、关闭到托盘与后台服务保活
node tests/reset.mjs              # 验证一次性清空旧数据
```

覆盖：渲染完整性、原文默认模式、点词查义、语境词典、术语联动知识卡、译文三态、精读计数、
筛选与关键词搜索、词汇简略/详细、卡片翻转与评分、测验出题、知识库检索、讲义下载与内容校验、
按所选文章打印、词汇 CSV、备份脱敏与恢复、刷新后持久化、设置面板、服务连通、移动端日期窗、
**真实 HTTP 文章抓取 + 完整 OpenAI 兼容标注链 + 实时模型列表 + CC Switch 导入 + TTS + PDF/DOCX 上传 +
公众号正文 + RSS 时间窗 + 自动抓取 + 全文总结 + 分类式原文/知识库/权威依据追问 + Economist GitHub EPUB 导入**、
导入失败诊断与显式保存原文、重复导入拦截和无 JS 运行时异常。

截图见 `tests/shots/`，样例讲义见 `tests/shots/sample-handout.md`。

> 说明：内置正文来自用户本机提供的 The Economist PDF，仅保留用于个人学习的节选；英文正文未做目标词替换，翻译、词汇和解析为 FinLens 学习标注。
> 联网抓取受目标站点反爬与付费墙限制。公众号无可公开搜索的 RSS，建议使用 RSSHub / wewe-rss 自建桥接，或直接粘贴正文。

---

## 目录结构

```
finlens/
├─ index.html            单一页面，四个视图
├─ src/styles.css        设计系统（浅色、金融阅读器风格、打印样式）
├─ src/app.js            状态管理 / 阅读器 / SRS / 检索 / 导出 / 导入
├─ src/learning-events.js 学习事件账本、每日汇总、计划与热力图
├─ src/task-center.js     持久任务状态、失败与恢复
├─ data/articles.js      语料库（文章·词汇·知识卡·主题）
├─ server/server.mjs     本地服务：抓取、文档解析、模型与 CC Switch、词典、TTS、总结和追问
├─ scripts/build-ecdict.mjs  ECDICT CSV → SQLite 构建工具
├─ data/dictionary/       离线词库、许可证与构建元数据（不通过静态 Web 暴露）
├─ tests/verify.mjs      原有学习闭环回归
├─ tests/feedback.mjs    本轮反馈需求回归
├─ tests/github-import.mjs Economist GitHub EPUB 导入回归
├─ tests/live-resources.mjs 真实 GitHub 与 RSS 资源联网回归
├─ tests/article-management.mjs 高亮交互与文章管理回归
├─ tests/feedback-v2.mjs 2026-11-03 反馈回归
├─ tests/reset.mjs 一次性数据重置回归
└─ start.cmd             一键启动
```

数据全部存于浏览器 `localStorage`（键 `finlens.v1`），不上传任何服务器；
「产出与归档」页会把不含 API Key 的学习日志自动保存至 `data/backups/`，并支持从 JSON 恢复学习进度。

Economist EPUB 首次导入需要联网，文件下载后缓存在 `data/cache/github/`，后续可复用；缓存与备份目录均禁止通过静态 Web 路径访问。GitHub 公共目录接口偶发限流或网络波动时，稍后重试即可。
财经订阅不再从 `FinanceReader` GitHub 文件动态导入。配置列表 2 只保留当前验证可用的 7 个源，并同时检查 RSS 与正文页可导入性。Yahoo、NYT、BIS 空 Feed、MarketWatch、Nasdaq、MarketWatch Market Pulse 与 WSJ Markets 等存在 401、403、连接失败或停更问题的源不进入默认配置。

Merriam-Webster 免费 API 仅限非商业应用，受每日查询量和参考作品数量限制；应用只发送用户主动点击产生的单词查询，不进行批量预取。Oxford 条款要求本地存储或 AI 组合使用取得额外许可，Collins 官方文档当前无法完成公开核验，因此两者仅保留扩展位，默认不启用。
