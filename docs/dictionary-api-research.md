# 英语词典 API 官方资料核查

**研究日期：2026-11-01**

**范围与限制：** 仅记录官方开发者、产品、定价或条款页面中可核验的内容。此次核查在用户要求停止联网前被中断，因此 Collins 以及部分面向学习者的产品页未能保留可核验正文；这些项目明确标为“未核实”，不根据记忆或第三方资料补全。不建议抓取词典网站。

## 补充核验

主代理在子任务结束后继续核验了以下官方原文：

- **Oxford：** 官方 API Terms 页面明确写明，除“仅为在应用中展示内容而进行的用户级会话缓存”外，不得 `cache, store, or save Content`；如需本地保存，必须事先联系 Oxford 并取得许可。条款还禁止把其内容用于提示、训练、微调、 grounding 或运行 AI 工具。因此 Oxford 技术上可以接入，但当前工作台的本地缓存与模型语境解释流程不能在未获书面许可的情况下使用 Oxford 内容。
- **Merriam-Webster Learner's：** 官方产品页确认端点为 `https://www.dictionaryapi.com/api/v3/references/learners/json/{word}?key={key}`。官方条款允许非商业应用在每天每部参考作品 1,000 次以内、最多使用两部参考作品的条件下免费调用，但禁止未经书面批准的自动化或记录式查询。为避免越界，在线权威结果应只作临时展示，不写入 localStorage 或备份，也不发送给模型继续加工。
- **Collins：** 官方 API 根路径和 `/api/v1/documentation` 均返回 Cloudflare `403` 安全验证页，无法取得可核验正文。目前不能确认其开放状态、凭据、费用、缓存及再分发规则，因此不应在未获得官方开发者文档或书面授权前接入或抓取。

依据以上补充核验，建议首版正式接入顺序为：**ECDICT 离线底座 → Merriam-Webster Learner's 临时权威展示 → 模型仅基于原词、原句和 ECDICT 生成语境解释**。Oxford 与 Collins 保留 provider 接口，不默认启用；拥有正式凭据和许可后再接入。

## 结论表

| 服务 | 当前可用性 | 认证方式 | 免费、试用与定价 | 商业、再分发与存储限制 | 学习者端点 | 本地个人英语学习桌面应用的适用性 |
|---|---|---|---|---|---|---|
| Oxford Dictionaries API（Oxford Languages） | **已核实仍在官方文档站提供**；页面称其为统一的词典、翻译和结构化词汇 API，覆盖多个端点与语言。 | **已核实：** 使用 `app_id` 与 `app_key`；Sandbox 请求示例将二者放在请求头中。凭据需从 Oxford 账户获取。 | **已核实：** 提供免费的 Sandbox 试用账户；长期使用需购买付费方案；另称 Enterprise 方案按年定制。官方页面说明 Enterprise 许可仅供商业用途，起价为每语言每年 £5,000。 | **未核实。** 官方页面链接了 API Terms and Conditions，但中断前未取得并核验正文，因此不能确认是否允许缓存、持久化、再分发或商业桌面应用使用。 | **未核实有专门的学习者词典端点。** 已核验页面称 Dictionary API 可提供释义、发音、例句、同义词及结构化数据，并提供儿童词典数据；这不等于 Learner's Dictionary 专用端点。 | **暂不能判定为可直接上线。** Sandbox 可用于个人原型评估；若个人应用需要长期、离线缓存或分发词典内容，必须先核对官方条款。免费试用不等同于永久免费许可。 |
| Collins Dictionary API | **未核实。** 官方 API 与文档页面地址已记录，但中断前未保留可读正文，无法确认当前开放状态或是否已变更。 | **未核实。** | **未核实。** | **未核实。** 未取得条款正文，不能确认商业使用、再分发、持久化或缓存规则。 | **未核实。** | **不能得出结论。** 在核实官方 API 文档、条款和定价前，不应把它作为本地应用的数据源。 |
| Merriam-Webster Learner's Dictionary API | **部分核实。** 官方 Dictionary API Terms 页面可访问；Learner's Dictionary 产品页地址已记录，但产品页和端点正文未在中断前核验，因此其专门端点当前是否可用仍不确定。 | **已核实 API key 机制：** 官方条款称注册并申请 key 即接受条款；key 的具体请求参数形式未核实。 | **已核实非商业条款范围内的免费使用：** 应用须为非商业；每部参考作品每日不超过 1,000 次查询；最多使用两部参考作品。超出限制需联系 Merriam-Webster 约定条款与付款。公开价格未在已核验条款中列出。 | **已核实为非商业许可：** 仅限开发者拥有或控制的非商业网站或应用；禁止商业使用；未经书面批准不得提交自动化或记录式查询；未经许可不得复制、再分发、出售、转授或以其他方式传播相关软件/应用。API 返回内容的本地持久化与离线缓存是否获准，条款未明确说明，**未解决**。 | **未核实。** 官方 Learner's Dictionary 产品页地址已知，但端点路径、响应结构及是否与其他 MW API 共用认证均未核验。 | **有条件适合。** 对非商业、联网的个人学习应用，免费层在查询量和参考作品数量限制内可能合适；但本地缓存、离线存储及“自动化查询”是否涵盖应用内按用户操作发起的查词，需向官方确认。不得把内容再分发或做成商业产品。 |

## 对本地桌面应用的实际判断

1. **Oxford：** 可先用 Sandbox 验证查词、发音和例句功能，但不能据此假设允许离线词库、长期缓存或打包分发。当前的许可证缺口是关键阻断项。
2. **Collins：** 官方事实不足，暂不作采用判断。
3. **Merriam-Webster：** 非商业个人应用在条款限额内最接近可用，但应按需联网查询，默认不保存或再分发返回内容；缓存和自动化查询边界需书面确认。
4. **共同要求：** 不应抓取网页。所有接入、缓存、展示和离线能力都应以书面许可或明确条款为准。

## 官方来源

### Oxford Languages / Oxford Dictionaries API

- 官方入口：<https://developer.oxforddictionaries.com/>
- 凭据与免费试用/付费计划说明：<https://developer.oxforddictionaries.com/documentation/getting_started>
- Sandbox 与 `app_id`/`app_key` 请求头示例：<https://developer.oxforddictionaries.com/documentation/getting_started/sandbox>
- 功能概览：<https://developer.oxforddictionaries.com/documentation/features>
- 官方 API 条款入口（本次未核验正文）：<https://developer.oxforddictionaries.com/api-terms-and-conditions>
- 官方定价入口（本次未核验详情）：<https://account.oxforddictionaries.com/pricing>

### Collins Dictionary API

- 官方 API 入口（本次未核验正文）：<https://api.collinsdictionary.com/>
- 官方文档入口（本次未核验正文）：<https://api.collinsdictionary.com/api/v1/documentation>

### Merriam-Webster Dictionary API

- 官方 Dictionary API 入口：<https://dictionaryapi.com/>
- 官方非商业 API 条款：<https://dictionaryapi.com/info/terms-of-service>
- Learner's Dictionary API 产品页（本次未核验正文）：<https://dictionaryapi.com/products/api-learners-dictionary>

## 未解决事项

- Collins API 的当前可用性、认证、定价、条款、再分发/缓存规则和学习者端点；官方页面目前被 Cloudflare 安全验证阻断。
- Oxford 商业计划或 Enterprise 许可是否可单独授权本地存储、离线使用及与 AI 工具组合。
- Merriam-Webster 按用户主动点击发起的查词请求是否属于条款所称的 “automated queries”，以及是否允许会话级临时展示之外的任何缓存。
- Merriam-Webster 是否允许将 API 返回内容持久化到本地数据库。
