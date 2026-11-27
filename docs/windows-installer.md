# FinLens Windows 安装包

更新日期：2026-11-12

## 适用范围

- Windows 10 / Windows 11，x64。
- 当前版本：`0.1.23`。
- 当前安装包是**未签名测试版**，仅供本人和少数设备使用。

安装文件：

```text
release\FinLens-0.1.23-x64-Setup.exe
release\FinLens-0.1.23-x64-Setup.exe.sha256
```

## 安装

1. 下载或复制上述安装文件。
2. 双击 `FinLens-0.1.23-x64-Setup.exe`。
3. 按当前用户安装，不需要管理员权限。
4. 安装完成后可从桌面或开始菜单启动。

由于安装包没有 Authenticode 签名，Windows 可能提示“未知发布者”或 SmartScreen 警告。确认文件来源后，可选择“更多信息”再继续运行。

不要从无法确认来源的地址下载或转发安装包。

## 后台运行

- 点击窗口关闭按钮时，FinLens 默认隐藏到 Windows 系统托盘，不退出应用。
- 隐藏后本地服务、页面计时器和已开启的 RSS / Atom 自动检查继续运行。
- 单击或双击托盘图标可恢复窗口；右键菜单可显示、隐藏、检查更新、打开数据目录或彻底退出。
- 应用不会自动设置为开机启动。
- 需要完全停止后台任务时，应从托盘菜单或“文件”菜单选择“退出 FinLens”。

## 自动更新

安装版使用公开仓库 `HF08/finlens-releases` 的 GitHub Releases 作为更新源：

1. 应用启动约 5 秒后自动检查更新。
2. 也可以在菜单“帮助 → 检查更新”或托盘菜单“检查更新”中手动检查。
3. 发现新版本后，由用户确认是否下载。
4. 下载完成后，由用户选择立即重启或在下次退出时安装。
5. 更新会覆盖旧程序目录，不创建新旧两个版本的并列文件夹。

更新不会删除以下用户数据：

```text
%APPDATA%\FinLens
```

如果旧版本曾把备份或凭据留在程序目录的 `data\backups`、`data\credentials`，新版首次启动会复制缺失文件到用户数据目录，不覆盖已有文件。也可通过 `FINLENS_LEGACY_DATA_DIR` 指定一个或多个旧数据目录，多个路径使用系统路径分隔符连接。

首次启动如果当前学习状态为空，会自动从最新的有效学习备份恢复文章、词汇、阅读进度、标注和问答记录。已有文章、词汇或标注时不会自动覆盖；可在“产出与归档 → 恢复学习数据”中手动选择备份。

当前安装包未签名，更新包同样没有代码签名。Windows 可能在更新或重启后再次提示未知发布者。

## 数据位置

程序安装在：

```text
%LOCALAPPDATA%\Programs\FinLens
```

用户数据保存在：

```text
%APPDATA%\FinLens
  data\
    backups\
    cache\
    credentials\
    tmp\
  logs\
  desktop-state.json
```

- 文章、词汇、学习进度和导出选择保存在 Electron 的本地浏览器存储。
- 模型密钥、学习备份和运行缓存保存在 `%APPDATA%\FinLens`。
- 密钥不会进入安装包、日志或前端源码。
- 升级安装不覆盖用户数据。
- 卸载默认保留用户数据，避免误删学习记录。

如需彻底清除本地数据，应在确认备份完成后手动删除 `%APPDATA%\FinLens`。

## 联网能力

以下功能需要网络：

- 新文章 AI 标注。
- 知识详解、来源核验和 AI 问答。
- 微信公众号抓取。
- RSS / Atom 更新。
- 在线词典与 Edge 朗读。

以下功能可在本地使用：

- 内置文章阅读。
- 词汇复习。
- 本地知识库。
- 已下载或已导入文章的学习。
- Markdown、CSV 和 JSON 备份导出。

PDF 讲义生成需要系统 Microsoft Edge 或 Google Chrome。Windows 10/11 通常已包含 Edge；如果两者均不可用，应用会显示明确错误，Markdown 导出仍可使用。

## 本地服务

Electron 启动时会在 `127.0.0.1` 上使用随机空闲端口启动本地服务。

- 使用固定的 `127.0.0.1:47887`，保证 Electron localStorage 来源稳定。
- 可通过 `FINLENS_DESKTOP_PORT` 覆盖端口；`0` 仅用于自动化测试。
- 不监听 `0.0.0.0`。
- 不向局域网公开。
- 窗口隐藏到托盘时服务继续运行。
- 从托盘或文件菜单彻底退出应用时关闭服务。

## 开发与构建

首次安装依赖：

```powershell
npm install
```

开发模式：

```powershell
npm run desktop:dev
```

检查图标、词典和打包配置：

```powershell
npm run desktop:check
npm run desktop:verify
```

运行 Electron 开发态与打包目录冒烟测试：

```powershell
npm run desktop:smoke
npm run desktop:smoke:packaged
```

生成 Windows 安装包：

```powershell
npm run desktop:build
```

构建过程要求以下文件存在：

```text
desktop\assets\icon.png
data\dictionary\ecdict.sqlite
```

ECDICT SQLite 快照体积较大，不进入源码仓库。缺少词典时 `desktop:check` 会停止构建。

验证安装包未签名状态和 SHA-256：

```powershell
npm run desktop:verify:artifact
```

## 发布说明模板

```text
FinLens 0.1.23 Windows x64 未签名测试版

- 当前安装包未进行代码签名，Windows 可能显示未知发布者提示。
- 安装不需要管理员权限。
- 用户数据保存在 %APPDATA%\FinLens。
- 卸载默认保留学习数据。
- 更新从 GitHub Releases 获取，并覆盖旧程序目录。
- 首次启动可从旧备份自动恢复网页端与桌面端学习数据。
- 词汇详解新增带语法标签的词形转换。
- 切换学习侧重会原子更新词汇与精读解析；失败时不写入半套结果。
- 修复 CNBC 订阅导航混入正文、单个分段质量判断误拒绝整篇长文的问题。
- 配置列表 2 移除正文页返回 401/403 的 MarketWatch 与 Nasdaq，替换为可完整抓取的 SEC 与 ECB。
- 修复离婚财产分割与共同控制股权的分类主次、法律/金融交叉规则及否定句误判。
- 分类核验新增主对象、独立交叉、明确否定三段证据预览；证据不足时保留原分类并降低置信度。
- 桌面版支持关闭到系统托盘继续运行，托盘菜单可恢复窗口、检查更新、打开数据目录或退出。
- 安装包 SHA-256：请同时附带 .sha256 文件。
```

后续如公开分发，应单独评估代码签名，不应把当前未签名测试包描述为“已验证发布者”。
