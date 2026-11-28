# FinLens Windows 安装包设计

日期：2026-11-11  
状态：已实现（0.3.0 未签名公开测试版）
发布者名称：`FINLENS`

## 目标

为现有 FinLens Web 工作台提供 Windows 桌面安装包，让用户不需要预装 Node.js、手动启动服务或记住本地地址。

首版必须满足：

- 提供 Windows x64 安装程序，默认按当前用户安装，不要求管理员权限。
- 双击应用图标即可启动完整工作台。
- 保留现有文章、词汇、知识库、导入、模型设置、问答历史和产出归档功能。
- 用户数据与安装目录分离，升级或卸载程序时不默认删除学习数据。
- 模型密钥只存放在本机用户数据目录，不进入前端包、日志或安装包。
- 首版生成未签名安装包，供用户本人和少数设备安装测试；代码签名作为后续可选升级，不阻塞首版交付。

## 已确定的技术选择

- 桌面框架：Electron。
- 安装器：electron-builder + NSIS。
- 应用产品名和安装器元数据：`FINLENS`。
- 首版不做 Authenticode 代码签名。
- 首版平台：Windows x64。

选择 Electron 的原因：

- 可直接复用现有 Web 前端和 Node 服务，不需要重写业务逻辑。
- 能可靠处理本地文件、窗口生命周期、单实例和系统外链。
- 当前前端依赖 Chromium 能力，Electron 的运行时与现有测试环境一致。

## 非目标

首版不包含：

- macOS、Linux、iOS 或 Android 安装包。
- Microsoft Store、Mac App Store 或移动应用商店上架。
- 自动更新服务。
- Authenticode 代码签名。
- 云账号、跨设备同步或公共 HTTPS 网关。
- 把 Node 服务暴露到局域网或公网。
- 重写现有前端或移动端布局。

## 架构

### 目录边界

仓库新增桌面入口目录：

```text
desktop/
  main.cjs
  preload.cjs
  window-state.cjs
  assets/
    icon.ico
```

- `main.cjs` 负责应用生命周期、窗口、服务启动和错误页。
- `preload.cjs` 只暴露必要的只读桌面信息，不开放任意 IPC 或文件系统访问。
- `window-state.cjs` 保存窗口位置、尺寸和最大化状态。
- `icon.ico` 首版可使用占位图标，最终图标由用户补充后替换。

### 本地服务

现有 `server/server.mjs` 重构为可嵌入的服务模块：

```text
startFinLensServer({
  host: '127.0.0.1',
  port: 0,
  appRoot,
  dataRoot
}) -> {
  url,
  close()
}
```

约束：

- 服务只监听 `127.0.0.1`。
- 使用系统分配的随机空闲端口，避免 `8787` 冲突。
- 保留命令行启动能力；直接运行 `node server/server.mjs` 仍使用现有行为和默认端口。
- Electron 主进程启动服务并等待 `/api/health` 成功后再加载窗口。
- 应用退出时关闭 HTTP 服务、数据库连接和子进程。

### 只读资源与用户数据

安装目录只承载只读资源：

- 前端静态文件。
- 内置文章。
- 词典许可证和元数据。
- 打包后的 ECDICT SQLite 快照。
- 桌面图标和 Electron 运行时。

用户可写数据迁移到：

```text
%APPDATA%\FinLens\
  data\
    backups\
    cache\
    credentials\
    tmp\
  desktop-state.json
  logs\
```

新增服务参数 `FINLENS_DATA_DIR`，并派生：

- `FINLENS_BACKUP_DIR`
- `FINLENS_CREDENTIAL_DIR`
- GitHub EPUB 缓存目录
- PDF 临时目录

ECDICT 数据库保持只读，不复制到用户数据目录。构建过程必须验证 `data/dictionary/ecdict.sqlite` 存在；缺失时阻止生成正式安装包。

浏览器 `localStorage` 由 Electron 保存在其用户数据目录。应用升级不得清空 Chromium profile。用户可以继续使用现有 JSON 备份导入和导出。

### 窗口与交互

- 主窗口加载 `http://127.0.0.1:<随机端口>`。
- 首屏尺寸使用当前桌面工作台适合的尺寸；最小尺寸防止三栏布局被压坏。
- 只允许一个应用实例；再次启动时聚焦已有窗口。
- 外部链接交给系统默认浏览器，应用窗口不允许导航到外部站点。
- 关闭最后一个窗口时退出应用，不驻留后台。
- 开发环境保留 DevTools 开关；正式包默认关闭。

### Electron 安全设置

- `nodeIntegration: false`
- `contextIsolation: true`
- `sandbox: true`
- 禁止窗口内任意导航。
- 禁止新窗口直接加载远程页面。
- 不把 API Key、文件路径或 Node API 暴露给页面。
- 仅允许本地服务需要的 CORS 和回环地址访问。

## PDF 与在线能力

首版继续使用系统 Chrome 或 Edge 进行 PDF 渲染：

- Windows 10/11 默认具备 Microsoft Edge，通常可直接生成 PDF。
- 启动时和生成失败时提供明确诊断，不静默失败。
- 若系统浏览器均不可用，保留讲义 HTML/Markdown 导出并提示用户安装 Edge。

模型标注、知识来源核验、微信公众号抓取、RSS 更新、在线词典和 Edge 朗读仍需要网络。安装包只解决启动与分发，不把在线能力伪装成离线能力。

## 安装与卸载

NSIS 配置：

- `oneClick: false`
- `perMachine: false`
- `allowElevation: false`
- `createDesktopShortcut: true`
- `createStartMenuShortcut: true`
- 默认安装目录由 Windows 当前用户的应用目录决定。
- 安装完成后可选择立即启动。

卸载行为：

- 删除程序和快捷方式。
- 默认保留 `%APPDATA%\FinLens` 中的学习数据、密钥和备份。
- 在卸载确认页说明数据处理方式，不把“卸载”误解为“清空学习记录”。

## 版本与产物

- 应用版本继承 `package.json`，首版为 `0.1.17`。
- 产品名：`FinLens`
- 产品元数据发布者：`FINLENS`
- App ID：`com.finlens.desktop`
- 安装包目标名称：`FinLens-0.1.17-x64-Setup.exe`
- 构建输出目录：`release/`
- 同时生成 SHA-256 校验文件。

图标未到位前使用可替换占位图标；应用包、窗口和 NSIS 安装器统一引用同一个 `.ico`。

## 代码签名

本次不做 Authenticode 代码签名。

原因：

- Microsoft Artifact Signing 的公共信任证书不适配中国大陆个人或普通项目主体。
- SSL.com 等兼容云签名方案需要每年证书费用和持续订阅费用。
- 当前安装包仅用于用户本人和少数设备测试，尚不需要维护公共发布者信誉。

明确限制：

- `FINLENS` 是应用和安装器元数据，不是经过证书验证的 Windows 发布者。
- Windows 可能显示“未知发布者”或 SmartScreen 提示。
- 用户首次运行下载的安装包时，可能需要在提示中选择“更多信息”后继续运行。
- 不生成自签名证书，不把自签名程序包装成“已验证发布者”。
- 安装说明和发布说明必须明确标注“未签名测试版”。

后续如需公开分发，再单独评估 SSL.com eSigner、OV/EV 证书或其他兼容云签名方案，并更新构建流程。

## 构建流程

新增脚本：

```text
npm run desktop:dev
npm run desktop:build
npm run desktop:verify
```

行为：

- `desktop:dev`：启动 Electron 与当前工作区代码，支持开发调试。
- `desktop:build`：验证资源、构建未签名测试安装包。
- `desktop:verify`：检查产物、文件版本、图标、未签名状态和数据目录边界。

打包只包含运行所需文件，不包含测试截图、备份、凭据、缓存、开发依赖或用户图片。

## 验证标准

### 功能回归

- 现有完整 `npm test` 通过。
- Electron 开发模式能加载当前首页、知识库、导入、词汇、问答和产出模块。
- 关闭后重新打开，学习数据和窗口状态保留。

### 安装包验证

- 当前用户无需管理员权限即可安装和卸载。
- 安装后从开始菜单和桌面快捷方式均可启动。
- 重复启动不会产生第二个实例。
- 安装目录不可写时，应用仍能正常运行。
- `%APPDATA%\FinLens` 自动创建并包含备份、凭据和缓存目录。
- 模型密钥不出现在安装包、日志、前端存储或 Chromium local storage 明文中。
- PDF、Markdown、CSV 和备份导入导出可用。
- 升级安装不覆盖用户数据。

### 未签名产物验证

- `Get-AuthenticodeSignature` 明确返回 `NotSigned`。
- 安装器在产品名称和版权信息中使用 `FINLENS`。
- 发布说明明确标注“未签名测试版”。
- SHA-256 校验文件与实际安装包一致。

### 失败路径

- 本地服务启动失败时显示可诊断错误页和日志路径。
- 端口被占用时自动重试随机端口，不打开空白窗口。
- PDF 浏览器缺失时显示 Edge/Chrome 安装提示。
- 词典快照缺失时构建失败，不生成残缺正式安装包。

## 实施顺序

1. 抽象本地服务启动接口与可写数据目录。
2. 增加 Electron 主进程、预加载桥接和单实例控制。
3. 增加 electron-builder、NSIS、图标和版本元数据。
4. 增加构建资源检查、未签名标识和产物校验。
5. 运行现有回归、Electron 冒烟测试和安装/卸载验证。

## 外部依赖

- 用户已提供主图标图像，实施时转换为 Windows 多尺寸 `.ico`。

首版可以完整交付未签名安装包，但不得对外宣称已通过代码签名或可信发布者验证。
