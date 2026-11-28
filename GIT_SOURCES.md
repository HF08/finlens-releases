# Git 项目来源与使用说明

更新日期：2026-11-28

本文件记录 FinLens 从哪些 Git/GitHub 项目获取代码、数据或运行时内容，以及这些项目在本项目中的实际用途。普通网页链接和 npm 依赖不在此逐项展开；npm 依赖的精确版本与完整性哈希以 `package-lock.json` 为准。

## 项目来源

| 项目 | 可见性 | 使用方式 |
| --- | --- | --- |
| [HF08/finlens](https://github.com/HF08/finlens) | 私有 | FinLens 私有主项目。公开仓库以私有提交 `fc8863f` 为同步基线，移除四六级功能、词表和入口后发布；本次公开清理提交为 `41acb14`。 |
| [HF08/finlens-releases](https://github.com/HF08/finlens-releases) | 公开 | 当前公开源码与 Windows 发布资产仓库。 |

## 拉取或派生使用

### ECDICT

- 项目：[skywind3000/ECDICT](https://github.com/skywind3000/ECDICT)
- 默认分支：`master`
- 本次核验时的上游提交：`39cfb9672c0906b63569e0453c2e6abfb9ab182a`
- 许可证：MIT
- 用途：生成 `data/dictionary/ecdict.sqlite`，为应用提供离线英汉释义、音标、词性和词形变化。
- 实际数据库来源：npm 包 `ecdict@0.0.4` 中的完整 CSV，npm shasum `aadfa6e46ed9c586144a3f749d585111168ec5f2`。
- 构建记录：CSV SHA-256、条目数和数据库大小见 `data/dictionary/PROVENANCE.md` 与 `data/dictionary/ecdict.metadata.json`。
- 分发方式：CSV 和 SQLite 不进入 Git 源码历史；构建 Windows 安装包时，由 `electron-builder.yml` 将本机生成的 SQLite 作为只读资源打入安装目录。
- 许可证全文：`data/dictionary/ECDICT-LICENSE.txt`。

## 运行时从 GitHub 拉取内容

### awesome-english-ebooks

- 项目：[hehonghui/awesome-english-ebooks](https://github.com/hehonghui/awesome-english-ebooks)
- 默认分支：`master`
- 本次核验时的上游提交：`a341fed0f18c20b8efd1e73c66b55dbbbaa4fc1e`
- 用途：用户主动触发 Economist EPUB 导入时，通过 GitHub API 读取目录，并通过 jsDelivr 拉取 `01_economist/` 下的 EPUB。
- 分发边界：本项目不把该仓库的 EPUB 纳入 Git 历史或安装包；下载内容只缓存到用户本机的 `data/cache/github/`。
- 权利说明：截至本文件更新时，GitHub 未检测到该仓库的统一仓库级许可证。电子书及文章内容的权利仍归原作者或出版方，使用者应自行确认访问、保存和学习用途的合法性。

## 界面推荐的关联项目

以下项目只在界面中作为可选的抓取桥接方案推荐，不属于 FinLens 内置代码，也不会被自动拉取或随本项目分发：

| 项目 | 许可证 | 说明 |
| --- | --- | --- |
| [DIYgod/RSSHub](https://github.com/DIYgod/RSSHub) | AGPL-3.0 | 用户可自行部署 RSSHub，再把自己的实例地址加入 FinLens 订阅。核验时 `master` 为 `09fd9a8bc4f0f6b6be57ee1fef3b7da33a71c48b`。 |
| [cooderl/wewe-rss](https://github.com/cooderl/wewe-rss) | MIT | 用户可自行部署的微信公众号 RSS 桥接方案。核验时 `main` 为 `e751c64294080d83deb1610d2667bed3cfa4b393`，仓库已归档。 |

## 维护规则

- 新增或替换直接拉取、派生、内置或运行时读取的 Git 项目时，同步更新本文件。
- 记录用途、许可证、默认分支和最后核验提交；无法确认许可证或内容权利时明确写出限制。
- 公开仓库不应包含私有词表、密钥、用户数据或无权再分发的内容。
