# FinLens 反馈修复与测试报告

日期：2026-11-01

## 反馈逐项处理

| 反馈 | 处理结果 |
|---|---|
| 抓取成功后仍显示失败 | 根因有两层：Fed 等页面把官网安全提示误当正文；复杂模型响应含围栏或未转义字符导致严格 JSON 解析失败。现已优先提取 article/main 正文、过滤站点提示，并兼容围栏、JSON 修复和单段重试 |
| 抓取基本都失败 | 移除不可靠示例地址；Fed、BIS、ECB、SEC、CNBC 五个财经 RSS 已作为默认配置；保留任意 RSSHub / wewe-rss 订阅桥接 |
| 查 GitHub 财经 RSS 项目 | 在引擎设置中给出 RSSHub 与 wewe-rss 项目入口；公众号自动订阅采用自建桥接，不伪装成官方 API |
| 词汇点击后提示跳转字典 | 点词先显示音标、词性和当前文章语境；新增“是否查看词典详解？”按钮，返回词义、例句、搭配、易混点和语境解释；侧栏和闪卡入口同步 |
| 模型接通有点假 | `/api/models` 真实请求模型列表；界面显示连接结果；已用本机 CC Switch 的 DeepSeek 配置验证 `/models` 与 `/chat/completions` 均返回 200 |
| 从 CC Switch 导入 | 只读读取本机 `~/.cc-switch/cc-switch.db`，导入 OpenAI 兼容地址、模型和密钥；已真实识别本机 DeepSeek 配置 |
| 内置文章均为示例 | 替换为用户本机提供的 5 篇 The Economist 财经文章节选，共 25 段、35 个词汇、10 张知识卡；删除文件名中的目标单词元数据 |
| 朗读基本是摆设 | 默认接入无需密钥的 Edge 在线语音，已实际生成并播放 MP3；同时保留浏览器语音和支持 `/audio/speech` 的模型语音 |
| 模式排序应原文优先 | 默认改为“原文 → 精读 → 沉浸”；原文模式关闭翻译、词汇和术语，用户可按需独立开启 |
| 支持上传文档和公众号抓取 | 支持 TXT / Markdown / HTML / DOCX；公众号 URL 走独立正文提取，失败时可粘贴正文 |
| PDF 文档上传 | `/api/document` 已支持可检索文本 PDF；扫描版 PDF 仍需要 OCR |
| GitHub 资源提取 | Economist 已支持“期号 → EPUB → 文章”三级选择并真正导入阅读台；兼容当前年份顶层与年份归档目录，实测列出 96 个期号，最新 `2026.10.31` 解析出 76 篇文章，首篇 `Politics` 含 19 段。FinanceReader 路径校验已独立修复，可合并 12 个财经 RSS |
| 词典来源与专业性 | 增加 MIT 许可 ECDICT 离线 SQLite 底座；可选 Merriam-Webster Learner’s 权威校验。韦氏结果仅作会话展示，不进入 localStorage 或备份，也不发送给模型。Oxford/Collins 因授权边界默认关闭 |
| 划线词语偶发不弹解析 | 根因有两层：段落操作按钮覆盖正文第一行；部分金融术语没有关联知识卡但使用问号光标并静默返回。现操作按钮移入段落顶部预留区，无卡术语提供兜底说明和 ECDICT/韦氏查询 |
| 文章删除与管理 | 增加文章管理模式；内置文章只读，导入文章可全选或逐篇选择后批量删除，并级联清理阅读进度、生词、标记、总结、问答、词典缓存 |
| 标注颜色不统一 | 已学生词此前变灰、无卡术语使用点线、术语内部生词被清空，形成 8 种样式组合。现统一为青色系=生词、琥珀实线=术语；重叠时以青色底纹和琥珀实线双重编码 |
| 导入总是失败 | 普通链接导入未启用原文兜底，无 Key 或模型失败时会停在标注失败弹窗；重复导入也会停留在重复提示。现自动保存原文并进入阅读台，重复链接直接打开已有文章 |
| 自动抓取显示多项失败 | 原逻辑只尝试时间线前 N 条，正文失败后不会继续补位；状态也只显示失败数量。现持续尝试后续候选直到导入目标数，订阅/正文/标注分别归类，并支持展开失败详情 |
| 英语与金融需求太简略 | 每段新增英语层（长难句、语法逻辑、表达）和金融层（术语、背景机制、文章关联）；导出讲义同步包含双模块解析 |
| 滚动条与模式联动异常 | 根因是桌面正文容器被内容撑到 1454px，且 body 禁止滚动，容器实际没有可滚动高度；已固定视图高度并恢复正文滚动容器 |
| 对话与总结需要金融 Skill | 所有标注、词典、总结和追问请求注入统一财经教学 Skill，禁止编造事实并强调机制、传导渠道和原文证据 |
| 回答依据需要分开 | 问答按“原文怎么说 / 知识库依据 / 权威依据”分类；权威依据附官网链接，并明确证据边界 |
| 学习计划与设置重复 | 拆成学习设置 `⚙` 和模型/抓取设置 `AI`；移动端两个入口均可访问 |
| 测验没有对错、词汇跳变 | 答题后暂停自动切题，显示正确/错误与正确答案；测验队列固定为开题快照，下一题由用户确认 |
| 闪现停止后从头开始 | 保存当前闪现位置，中断后显示停留位置，再次开始从同词继续 |
| 已复习缺少回顾 | 增加已复习回顾侧栏，可查看上次评分、复习时间、到期时间，并可重新复习 |
| 备份会触发下载 | 改为自动写入 `data/backups/`，保留最近 20 份；恢复功能仍保留 |
| 已学习和未学习混在一起 | 增加全部/未学习/已学习筛选，文章卡显示上次学习时间、进度和复习次数 |

## 真实 API 与抓取验证

- 本机 CC Switch 读取结果：1 个兼容配置（DeepSeek）。
- `/models`：HTTP 200，可用模型包含 `deepseek-flash`、`deepseek-v4-pro`。
- 当前配置模型 `deepseek-v4-flash` 的 `/chat/completions`：HTTP 200。
- 应用相同的 `response_format: json_object` 参数：HTTP 200，返回可解析 JSON 内容。
- 模型列表验证器不会因为返回列表不含当前配置模型而擅自覆盖当前模型。
- 推荐 RSS 中 BIS、Fed、ECB、SEC、CNBC 均已通过 HTTP 可用性检查。
- 真实 Fed 文章：正文提取不再包含 `.gov` 安全提示；真实模型返回译文、英/金双模块解析、12 个词汇和 3 张知识卡。
- 完整浏览器导入：Fed 文章成功进入阅读台并渲染 3 段译文，无 JS 错误。
- 默认 Edge 朗读：HTTP 200、`audio/mpeg`、28,224 字节，浏览器音频控件实际开始播放。
- Economist GitHub：`/api/github-resource?key=awesome` 返回当前年份期号与 `2025` 年份归档，界面合并列出 96 个期号；最新期号为 `te_2026.10.31`，EPUB 解析出 76 篇文章。
- Economist 浏览器导入：默认选中最新期号和首篇文章，点击后进入 `Politics` 阅读页，来源显示 `THE ECONOMIST · GITHUB EPUB`，无 JS 运行时错误。
- FinanceReader：`docs/FEEDS.md` 不再被 Economist 路径规则误判，真实浏览器导入 12 个 RSS，合并后订阅总数为 16。
- RSS 抽样：CNBC、MarketWatch、Fortune 等代表性源由本地服务真实抓取成功，返回 10 条；Yahoo Finance 与 NYT Economy 当前分别出现 403/连接失败，属于源站可用性边界。
- EPUB 缓存：静态访问返回 403，非法路径穿越返回 400；真实文件只通过受控 API 与哈希缓存读取。
- ECDICT：许可证为 MIT；构建工具输出 SQLite 和带源文件 SHA-256、条目数、构建时间的元数据。
- 词典浏览器流程：ECDICT 标签、韦氏 Learner’s 标签和离线/权威释义均正常显示；韦氏内容不进入 localStorage，备份同时排除 `mwApiKey`。
- 高亮交互：真实导入语料逐个检查 667 个高亮词，段落操作按钮遮挡为 0；30 个无知识卡术语点击后均有有效反馈。
- 文章管理：两篇导入文章批量删除成功，5 篇内置文章保持只读；当前文章删除后自动切换到安全兜底文章。
- 标注样式：已学/未学生词保持同一青色虚线下划线，金融术语无论是否有知识卡均保持琥珀实线，术语内嵌生词保留青色底纹。
- 真实 Fed 导入：成功提取 4 段并进入阅读台；无 Key、模拟模型 500、重复 URL 三条路径均正常收口。
- 自动抓取：用最近学习快照真实运行“立即检查更新”，成功导入 5 篇且无 JavaScript 错误；候选失败时会继续补足目标并展示失败详情。

## 自动化验证

- `node tests/verify.mjs`：原有学习闭环回归，最终结果 70/70。
- `node tests/feedback.mjs`：反馈需求回归，最终结果 45/45。
- `node tests/github-import.mjs`：GitHub EPUB 导入回归，最终结果 12/12；覆盖 FinanceReader 路径、年份子目录和同期多 EPUB 的日期匹配。网络不可用时，2 项在线目录检查明确标记为 SKIP。
- `node tests/live-resources.mjs`：联网服务回归，最终结果 8/8；真实读取 GitHub、正式 ECDICT 词库、解析 76 篇文章并合并 FinanceReader 的 12 个 RSS。
- `node tests/build-ecdict.mjs`：ECDICT CSV → SQLite 构建回归，最终结果 4/4。
- `node tests/dictionary.mjs`：离线词典、韦氏适配、来源标签、回退与持久化边界回归，最终结果 16/16。
- `node tests/article-management.mjs`：导入兜底、抓取补位、失败详情、标注颜色、术语兜底、正文点击和文章管理回归，最终结果 22/22。
- `node --check src/app.js`
- `node --check server/server.mjs`
- `node --check data/articles.js`
- `node --check tests/feedback.mjs`
- `node --check tests/github-import.mjs`

覆盖重点：真实 HTTP 抓取、OpenAI 兼容 Chat Completions、模型列表、CC Switch 数据库读取、词典、TTS、
RSS 与日期窗、自动导入、TXT/DOCX/PDF、公众号正文、英语/金融双模块解析、默认原文模式、移动端滚动、
测验反馈、闪现续点、复习侧栏、已学习筛选和自动学习日志。

## 视觉验证

- 原文默认界面：`tests/shots/feedback-final/reader-original-clean.png`
- 双模块解析：`tests/shots/feedback-final/reader-analysis-clean.png`
- 词典语境浮层：`tests/shots/feedback-final/word-context-clean.png`
- 模型与抓取设置：`tests/shots/feedback-final/engine-settings-clean.png`
- 学习计划：`tests/shots/feedback-final/learning-settings.png`
- 手机原文界面：`tests/shots/feedback-final/mobile-original-clean.png`
- 手机滚动后：`tests/shots/feedback-final/mobile-scrolled-clean.png`
- 桌面真实滚轮滚动：`tests/shots/feedback-final/desktop-scroll-fixed.png`
- CC Switch 三模型导入：`tests/shots/feedback-final/cc-switch-models-fixed.png`
- 测验对错反馈：`tests/shots/feedback-final/quiz-feedback-fixed.png`
- 已复习回顾侧栏：`tests/shots/feedback-final/review-history.png`
- 已学习筛选：`tests/shots/feedback-final/read-filter-fixed.png`
- 自动学习日志：`tests/shots/feedback-final/auto-backup-log.png`
- GitHub EPUB 期号与文章选择：`tests/shots/feedback-final/github-epub-import.png`
- GitHub EPUB 导入后的阅读页：`tests/shots/feedback-final/github-epub-reader.png`
- GitHub 与 FinanceReader 实时加载：`tests/shots/feedback-final/github-and-feeds-live.png`
- 词典来源分层：`tests/shots/feedback-final/dictionary-sources.png`
- 无知识卡术语兜底：`tests/shots/feedback-final/article-term-fallback.png`
- 导入文章批量管理：`tests/shots/feedback-final/article-manage-mode.png`

## 已知边界

- 公众号没有公开搜索 RSS；微信反爬或验证页出现时必须使用粘贴正文或自建 RSS 桥接。
- PDF 上传已支持可检索文本层；纯扫描 PDF 仍需 OCR 或先转换后导入。
- 自动抓取依赖工作台页面保持打开，不是系统后台服务。
- Edge 在线朗读需要联网；无网络时可切回浏览器本地语音。
- Economist EPUB 首次下载需要联网，之后优先读取 `data/cache/github/`；GitHub 公共目录 API 偶发限流或网络波动时，稍后重试即可。
- FinanceReader 会保留完整的 12 个默认 RSS；个别源可能被出版方限制或临时下线，此时继续保留该行并显示抓取错误，不影响其他有效源。
- Merriam-Webster 免费层要求非商业使用，且每日每部参考作品最多 1,000 次、最多使用两部参考作品；不进行批量预取或持久化权威内容。
- Oxford 需要沙盒/付费凭据，并明确限制本地保存和与 AI 工具组合；Collins 官方文档当前受 Cloudflare 验证阻断，未完成授权核验，因此两者未默认接入。
