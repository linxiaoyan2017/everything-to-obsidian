## Context

本项目是一个全新的 Chrome 浏览器插件（Manifest V3），目标是帮助用户将 Chrome 收藏夹及当前网页内容一键提取并保存为 Obsidian 格式的 Markdown 文件。

当前状态：工作区为全新项目，无已有代码基础。用户使用 macOS，Obsidian 知识库位于本地路径 `/Users/linxiaoyan/学习/个人知识库/myobsidian`。

核心约束：
- 浏览器插件无法直接写入本地文件系统（安全沙箱），需借助 File System Access API
- 插件必须使用 Manifest V3（Chrome 当前标准）
- 不引入打包构建工具，保持纯 HTML/CSS/JS 结构，方便直接在 Chrome 开发者模式加载

## Goals / Non-Goals

**Goals:**
- 一键保存当前标签页为 Markdown 文件到 Obsidian 目录
- 批量导入 Chrome 收藏夹（支持文件夹选择、小并发、进度展示）
- 支持摘要/完整正文两种提取深度
- 通过 File System Access API 直接写入本地 Obsidian 文件夹
- 生成符合 Obsidian 规范的 frontmatter（title/source/date_saved/tags/type）
- 收藏夹文件夹层级自动映射为 tags

**Non-Goals:**
- 不支持 Firefox / Edge 等其他浏览器（File System Access API 在 Chrome 最成熟）
- 不支持图片下载保存（仅保存文字内容）
- 不提供云端同步或远程存储
- 不处理需要登录才能访问的页面
- 不支持 PDF、视频等非 HTML 内容

## Decisions

### D1: 文件写入方案 — File System Access API

**选择**：File System Access API + IndexedDB 持久化目录句柄

**理由**：
- 无需用户安装任何额外软件（Native Messaging 方案需安装本地 Host 程序）
- 用户只需一次性授权目标文件夹，后续无感知写入
- 可直接写入任意本地目录（包括 Obsidian vault）
- Chrome 86+ 完全支持

**替代方案**：
- `chrome.downloads` API：只能写入 `Downloads` 目录，无法直接存入 Obsidian，❌ 排除
- Native Messaging：需额外安装本地程序，体验繁琐，❌ 排除

**权限持久化**：将 `FileSystemDirectoryHandle` 存入 IndexedDB，每次使用前调用 `handle.requestPermission({ mode: 'readwrite' })` 验证权限有效性。

---

### D2: 正文提取 — Readability.js

**选择**：Mozilla Readability.js（Content Script 注入方式执行）

**理由**：
- 业界最成熟的正文提取方案，Firefox 阅读模式及 Pocket 均使用此算法
- 能自动去除导航栏、广告、页脚等噪音
- 覆盖率高（主流文章类页面准确率 85%+）

**替代方案**：
- 自定义 CSS 选择器规则：维护成本高，适配性差，❌ 排除
- 服务端抓取：需要后端，增加架构复杂度，❌ 排除

**摘要来源**：优先读取 `<meta name="description">` 标签；若不存在，取 Readability 提取正文的前 200 字符作为降级摘要。

---

### D3: HTML → Markdown 转换 — Turndown.js

**选择**：Turndown.js，配置 ATX 标题风格（`#`）+ 围栏代码块（` ``` `）

**理由**：轻量、无依赖、MIT 协议、对 Obsidian Markdown 语法兼容性良好。

---

### D4: 批量处理并发策略 — 并发数 3

**选择**：固定并发数 3，使用 Promise 池模式

**理由**：
- 并发太高（>5）容易触发目标网站反爬限制或导致 Chrome 内存压力
- 并发 3 在速度与稳定性之间取得平衡
- 死链（网络超时、HTTP 4xx/5xx）直接跳过并记录，不中断整体流程

**超时设置**：单页面抓取超时 15 秒，超时视为死链跳过。

---

### D5: 文件组织 — 打平结构 + frontmatter tags

**选择**：所有文件存入 `📥 Clippings/` 目录，通过 frontmatter `tags` 字段携带层级信息

**理由**：
- Obsidian 的 Dataview 插件可通过 tags 做强大的知识管理查询
- 避免深层文件夹带来的文件管理复杂性
- 收藏夹文件夹路径（如 `技术/前端/React`）拆分为 tags 数组 `[技术, 前端, React]`

**文件命名**：`<页面标题>.md`，对标题做合法文件名处理（去除 `/ : * ? " < > |` 等字符，截断至 100 字符）。重复文件直接覆盖。

---

### D6: 插件架构 — 纯静态 MV3，无打包工具

**选择**：Manifest V3，手动引入 lib 目录存放第三方库

**项目结构**：
```
bookmark-to-obsidian/
├── manifest.json
├── background/
│   └── service-worker.js      # 处理跨页面逻辑、文件写入
├── content/
│   └── extractor.js           # 注入网页，调用 Readability
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── options/
│   ├── options.html
│   └── options.js
└── lib/
    ├── readability.min.js
    └── turndown.min.js
```

## Risks / Trade-offs

- **[风险] File System Access API 权限每次浏览器重启后需重新确认**
  → 缓解：在 Popup 界面顶部展示当前授权状态，引导用户点击「重新授权」按钮；交互设计上做到友好提示，避免用户困惑

- **[风险] 动态渲染页面（SPA）内容可能无法被 Readability 完整抓取**
  → 缓解：Content Script 等待 `document.readyState === 'complete'` 后再提取；对失败页面提示用户，不静默丢失

- **[风险] 网站反爬措施导致批量抓取部分失败**
  → 缓解：超时跳过 + 进度日志记录，用户导入完成后可查看跳过列表

- **[风险] 页面标题包含特殊字符导致文件名非法**
  → 缓解：统一做文件名 sanitize，确保写入不报错

- **[Trade-off] 不支持图片保存**
  → 为控制复杂度，图片以原始 URL 保留在 Markdown 中，在线时可正常显示；离线不可用，这是可接受的权衡

## Open Questions

- 无。所有关键决策已在探索阶段与用户确认完毕。