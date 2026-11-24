# Learning Workspace V2 Design

日期：2026-11-24

状态：已批准，待实现

## Goal

把 FinLens 从“单篇文章学习与词汇复习”扩展为可回看、可计划、可批处理的学习工作台。第一批交付包含学习事件账本、日历与计划、统一任务中心、今日单词卡导出和文章思维导图。依据学习目的组织考试与金融学习路线的功能留给后续版本。

## Non-goals

- 本次不实现四六级、雅思、托福或金融岗位导向的题型研究。
- 本次不改变文章原文、翻译、知识卡和现有 SRS 算法的语义。
- 本次不引入前端框架或图数据库。
- 旧数据无法准确还原的部分不做虚构，只标记为“旧版汇总记录”。

## Architecture

新增两个独立浏览器模块，由 `index.html` 在 `app.js` 之前加载：

- `src/learning-events.js`：学习事件、每日计划、历史汇总、热力图和旧数据回填的纯函数。
- `src/task-center.js`：任务生命周期、进度、失败、恢复建议和历史任务的纯函数。

`app.js` 继续负责界面、持久化和业务编排，但不再把任务状态和每日事件藏在临时 DOM 或闭包变量中。思维导图生成由 `server/server.mjs` 提供 `/api/mind-map`，返回经过边界校验的树形 JSON。

## Data Model

### Learning event

```js
{
  id: "evt-...",
  date: "2026-11-24",
  ts: 1795500000000,
  type: "article-read" | "article-review" | "word-learned" | "word-reviewed" | "legacy-day",
  articleId: "eco-inflation",
  wordKey: "eco-inflation:surge",
  word: "surge",
  score: 0 | 1 | 2,
  source: "reader" | "cards" | "quiz" | "migration",
  legacyCount: 0
}
```

规则：

- 事件只追加，不依赖 UI 当前可见状态。
- 同一单词一天可多次复习，但“当天单词列表”按 `wordKey` 去重。
- 第一次评分记录 `word-learned`；后续评分记录 `word-reviewed`。
- 标记文章已学习记录 `article-read`；点击“继续复习”记录 `article-review`。
- 旧版数据升级时：
  - `S.read[id].ts` 可回填为 `article-read`。
  - `S.words[id].lastReviewedAt` 可回填为 `word-learned` 或 `word-reviewed`。
  - 仅有 `S.days` 而没有明细的日期生成 `legacy-day`，不伪造文章或单词。

### Study plan

`S.studyPlans[date]`：

```js
{
  date: "2026-11-24",
  items: [
    { articleId: "eco-inflation", mode: "read" },
    { articleId: "eco-short-sellers", mode: "review" }
  ],
  readTarget: 1,
  wordTarget: 12,
  note: "",
  createdAt: 1795500000000,
  updatedAt: 1795500000000
}
```

计划完成状态由事件派生，不单独保存布尔值：

- `mode=read` 完成条件：当天存在对应 `article-read`。
- `mode=review` 完成条件：当天存在对应 `article-review`。
- 单词目标完成条件：当天去重后的 `word-learned + word-reviewed` 数量达到 `wordTarget`。
- 阅读目标完成条件：当天去重后的已读文章数达到 `readTarget`。

### Task

```js
{
  id: "task-...",
  type: "annotation" | "focus-batch" | "mind-map" | "ai-summary" |
        "knowledge-revalidation" | "crawl" | "backup",
  title: "正在标注文章",
  subtitle: "文章标题",
  status: "queued" | "running" | "success" | "failed" | "cancelled",
  progress: 0,
  step: "analyze",
  message: "分段翻译与质量分析 2/5",
  error: "",
  recovery: [],
  articleId: "",
  meta: {},
  createdAt: 0,
  updatedAt: 0,
  finishedAt: 0
}
```

任务中心保留最近 100 条任务。运行中任务按更新时间排序；失败任务保留错误、恢复建议和可重试类型。

## UI Changes

### Task center

- 左下“本地预标注”卡改为“任务中心”摘要卡。
- 收起状态显示：运行中任务数、最新任务名、百分比或失败数。
- 点击卡片打开任务中心弹窗，按“进行中 / 失败 / 历史”筛选。
- 每项显示进度条、步骤、失败原因、恢复建议和可用的重试动作。
- 删除右下 `ai-progress-panel`。
- 删除自动抓取设置内的状态文字、失败详情按钮和失败详情面板；启动抓取仍留在原处。
- 原有文章标注、自动抓取标注、词汇侧重批处理、AI 总结、知识卡核验全部创建统一的持久任务。

### Learning calendar

- 左侧导航新增“学习日历”。
- 月历显示每日完成状态、计划文章数、实际阅读数和单词数。
- 选中日期后，右侧显示：
  - 当日计划：添加/移除文章，选择“精读”或“复习”。
  - 当日实际上课篇目和单词明细。
  - 阅读目标、单词目标与计划项完成状态。
  - 备注。
- 月历下方显示最近 26 周热力图，颜色深浅由当天去重事件数量决定。
- 点击历史文章可直接打开文章。
- 打开日历、标记文章学习、完成单词评分后刷新日历。

### Word export

词汇页“导出 CSV”改为“导出词汇”，打开导出弹窗：

- 今日已学习单词卡片：自包含 HTML，卡面包含单词、音标、词性、中文、英文释义、例句、来源；可打印为 PDF。
- 今日词汇 CSV：当天去重后的已学习与已复习单词。
- 全部词汇 CSV：保留现有 Anki / Quizlet 字段。
- 当前待复习词汇 CSV：仅导出已学习且到期的词。

当天没有单词事件时，明确提示“今天还没有已学习单词”，不生成空卡片。

### Mind map

- 文章末尾新增“生成思维导图”。
- 首次点击调用 `/api/mind-map`；成功后缓存到 `S.mindMaps[articleId]`。
- 导图弹窗以横向逻辑树显示中心论点、分论点、证据和结论，支持重新生成。
- 服务端限制最大深度 4、最大节点 40、每个标签 80 字，避免异常模型输出破坏布局。
- 无模型凭据或生成失败时，在任务中心记录失败并提供恢复建议。

## Error Handling

- 所有长任务先创建任务，再更新进度；成功和失败都必须落终态。
- 失败任务不删除，保留最近一次错误。
- 生成失败不覆盖旧思维导图或旧词汇覆盖层。
- 今日单词卡没有数据时不下载空文件。
- 旧数据结构不完整时使用空数组/空对象恢复，不清空已有学习进度。

## Testing

- 纯函数测试：事件规范化、旧数据回填、每日去重汇总、计划完成、热力图、任务生命周期和任务上限。
- 浏览器测试：任务中心摘要与筛选、失败重试入口、日历计划读写、热力图、今日卡片导出、CSV 导出、思维导图渲染。
- 服务端测试：思维导图提示词、结构清洗、节点上限、模型失败回滚。
- 回归测试：现有 72、154、20、13、26 等测试组全部继续通过。

## Delivery Order

1. 学习事件与任务中心基础模块。
2. 应用状态迁移和统一任务中心。
3. 学习日历、计划和热力图。
4. 今日单词卡与词汇导出弹窗。
5. 思维导图服务端与阅读器界面。
6. 私有版本完整测试、公开版本去四六级同步。
