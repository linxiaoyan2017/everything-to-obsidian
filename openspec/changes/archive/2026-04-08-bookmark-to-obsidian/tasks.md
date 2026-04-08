## 1. 项目脚手架

- [x] 1.1 创建项目目录结构（`background/`、`content/`、`popup/`、`options/`、`lib/`）
- [x] 1.2 编写 `manifest.json`（MV3，声明权限：`bookmarks`、`activeTab`、`scripting`、`storage`、`<all_urls>`）
- [x] 1.3 下载 `readability.min.js`（Mozilla Readability）并放入 `lib/`
- [x] 1.4 下载 `turndown.min.js` 并放入 `lib/`

## 2. 文件写入模块（filesystem-writer）

- [x] 2.1 在 `popup/popup.js` 中实现 `pickDirectory()`：调用 `showDirectoryPicker()` 并将 handle 存入 IndexedDB
- [x] 2.2 实现 `getDirectoryHandle()`：从 IndexedDB 读取已存 handle，调用 `requestPermission()` 验证有效性
- [x] 2.3 实现 `sanitizeFilename(title)`：去除非法字符、截断至 100 字符
- [x] 2.4 实现 `writeMarkdownFile(handle, subDir, filename, content)`：自动创建子目录并覆盖写入 `.md` 文件

## 3. 网页内容提取模块（page-extractor）

- [x] 3.1 编写 `content/extractor.js`：注入页面，提取 `title`、`url`、`author`（meta author）、`description`（meta description）
- [x] 3.2 在 `content/extractor.js` 中引入 Readability.js，实现 `extractContent(mode)`：摘要模式仅返回元数据，完整模式额外返回 `content` HTML
- [x] 3.3 处理 description 缺失的 fallback：从 Readability 正文取前 200 字

## 4. Markdown 生成模块（markdown-converter）

- [x] 4.1 实现 `buildFrontmatter(meta)`：生成 YAML frontmatter（title/source/author/date_saved/tags/type）
- [x] 4.2 实现 `htmlToMarkdown(html)`：使用 Turndown.js，配置 ATX 标题、围栏代码块、`-` 列表
- [x] 4.3 实现 `buildMarkdownFile(meta, contentHtml, mode)`：组合 frontmatter + 摘要/正文 + 末尾原文链接

## 5. 收藏夹导入模块（bookmark-importer）

- [x] 5.1 实现 `loadBookmarkTree()`：调用 `chrome.bookmarks.getTree()` 返回完整树结构
- [x] 5.2 实现 `collectUrlsFromFolders(selectedFolderIds, tree)`：递归收集选中文件夹下的所有书签 URL 及其文件夹路径（用于 tags）
- [x] 5.3 实现并发任务队列 `runConcurrent(tasks, concurrency, onProgress)`：Promise 池，并发数 3，支持取消信号
- [x] 5.4 实现单书签处理流程：打开后台标签页 → 注入 Content Script → 提取内容 → 转换 Markdown → 写入文件 → 关闭标签页
- [x] 5.5 实现死链检测与跳过：超时（15s）或非 2xx 响应时标记 skip，记录原因

## 6. Popup 界面（plugin-ui）

- [x] 6.1 编写 `popup/popup.html`：两个功能卡片（当前页 / 批量收藏夹）+ 底部目录状态栏 + 设置入口
- [x] 6.2 编写 `popup/popup.css`：简洁现代风格，宽度 360px，支持暗色适配
- [x] 6.3 实现「保存当前页面」交互：选择深度 → 点击保存 → 调用提取+写入模块 → 展示成功/失败提示
- [x] 6.4 实现收藏夹树形渲染：可展开/折叠，每节点带勾选框，显示文件夹名和书签数
- [x] 6.5 实现进度视图：进度条 + 实时日志列表（✅/⏭️/❌）+ 汇总统计 + 取消按钮
- [x] 6.6 实现底部目录状态展示：已授权显示目录名，未授权显示警告 + 一键授权按钮

## 7. Options 设置页（plugin-ui）

- [x] 7.1 编写 `options/options.html` + `options/options.js`：提供「选择 Obsidian 目录」按钮 + 目录名展示
- [x] 7.2 实现子目录名自定义输入框（默认 `Clippings`），存入 `chrome.storage.sync`

## 8. Service Worker 整合

- [x] 8.1 编写 `background/service-worker.js`：监听来自 popup 的消息，协调提取和写入流程
- [x] 8.2 处理 MV3 Service Worker 保活：在批量任务期间通过 `chrome.alarms` 定期唤醒防止中断
- [x] 8.3 将批量任务状态（已处理/跳过/总数）持久化到 `chrome.storage.session`，支持 Popup 重新打开后恢复进度

## 9. 集成测试与打磨

- [ ] 9.1 测试「保存当前页面」：在典型文章页（知乎/掘金/Medium）验证正文提取和 Markdown 格式
- [ ] 9.2 测试「批量导入收藏夹」：选择含 10+ 书签的文件夹，验证并发、进度、死链跳过、文件写入
- [ ] 9.3 测试 File System API 权限恢复：浏览器重启后验证授权提示和重新授权流程
- [ ] 9.4 验证生成的 .md 文件在 Obsidian 中正常解析（frontmatter、tags、正文、末尾链接）
- [x] 9.5 编写 `README.md`：插件安装步骤（开发者模式加载）、使用说明、已知限制
