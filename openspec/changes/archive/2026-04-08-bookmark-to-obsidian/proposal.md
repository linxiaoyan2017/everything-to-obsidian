## Why

Chrome 收藏夹积累了大量有价值的网页链接，但缺乏有效的知识管理手段——它们无法被全文检索、无法建立关联、无法在离线状态下访问。用户需要一种一键式工具，将收藏夹内容及当前浏览的网页提取为结构化 Markdown 文件，直接导入 Obsidian 本地知识库，构建可检索、可关联的个人知识体系。

## What Changes

- 新增 Chrome 浏览器插件（Manifest V3），提供 Popup 主界面与 Options 设置页
- 新增「保存当前页面」功能：一键将当前标签页内容提取并保存为 Markdown 文件
- 新增「批量导入收藏夹」功能：可选择收藏夹文件夹树，批量抓取网页正文并导出
- 新增内容提取深度选择：用户可按需选择仅保存「摘要」或「完整正文」
- 新增本地文件写入：通过 File System Access API 直接写入用户指定的 Obsidian 文件夹
- 新增进度展示：批量处理时显示实时进度、成功/跳过/失败统计
- 死链自动跳过，重复文件直接覆盖

## Capabilities

### New Capabilities

- `page-extractor`: 网页正文提取能力，使用 Readability.js 提取正文，`<meta name="description">` 获取摘要，支持摘要/完整正文两种深度模式
- `bookmark-importer`: 收藏夹批量导入能力，读取 Chrome Bookmarks API、展示树形文件夹选择器、小并发（3-5）批量处理、死链跳过、进度追踪
- `markdown-converter`: HTML 转 Markdown 能力，使用 Turndown.js 转换，生成包含 frontmatter（title/source/author/date_saved/tags/type）的标准 Obsidian 格式文件
- `filesystem-writer`: 本地文件写入能力，使用 File System Access API 授权并持久化目录句柄（IndexedDB），将 .md 文件写入 `📥 Clippings/` 目录，重复文件覆盖
- `plugin-ui`: 插件界面能力，包含 Popup 主界面（双入口：当前页/收藏夹）、Options 设置页、批量导入进度界面

### Modified Capabilities

（无，全新项目）

## Impact

- **新增依赖**：Readability.js（Mozilla，MIT 协议）、Turndown.js（MIT 协议）
- **Chrome API**：`chrome.bookmarks`、`chrome.tabs`、`chrome.scripting`、`chrome.storage`
- **Web API**：File System Access API（Chrome 86+）、IndexedDB
- **权限要求**：`bookmarks`、`activeTab`、`scripting`、`storage`、`<all_urls>`
- **目标平台**：Chrome 86+（桌面端）
- **输出目录**：`/Users/linxiaoyan/学习/个人知识库/myobsidian/📥 Clippings/`
