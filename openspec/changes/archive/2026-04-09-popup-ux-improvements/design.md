## Context

这是对已上线的 bookmark-to-obsidian Chrome 插件（MV3）的纯 UI/UX 迭代，不涉及核心功能逻辑（提取、转换、写入）。改动集中在 Popup 界面和 Options 设置页的交互与视觉层面。

## Goals / Non-Goals

**Goals:**
- 减少用户操作步骤（去掉「展开选择」一次点击）
- 符合直觉的整行点击选中体验
- 通过视觉色条让两个功能区域在视觉上明确区分
- 用下拉选择器替代手动输入子目录名，降低出错率
- 用户自定义 Icon（bee.png）生效

**Non-Goals:**
- 不改变任何核心功能逻辑（提取/转换/写入）
- 不改变数据存储格式

## Decisions

### D1: 批量导入面板默认展开

**决定**：移除 `id="btn-expand-bookmarks"` 按钮，`id="bookmark-panel"` 初始不再 `display:none`，在 `popup.js` 的 `init()` 中直接触发 `loadBookmarkTree()`。

**理由**：用户打开插件的主要目的之一就是选择收藏夹导入，折叠面板增加了无意义的一次点击。默认展开让界面更直接。

**副作用**：Popup 高度会增加，需要确认 Chrome 插件 Popup 最大高度（600px）不会超出。

---

### D2: 树状选择器整行可点击，展开箭头 stopPropagation

**决定**：在 `buildFolderNode()` 中，为整个 `.folder-row` 绑定 `click` 事件切换勾选；展开箭头的 `click` 事件调用 `e.stopPropagation()` 阻止冒泡，避免展开/折叠时误触勾选。

**交互规则**：
- 点击 `▶` 箭头 → 仅展开/折叠，不改变勾选状态
- 点击行内其他任意区域（图标/文件夹名/书签数/空白区）→ 切换勾选
- 勾选框本身点击 → 正常切换（同时 `stopPropagation` 防止双触发）

---

### D3: 功能卡片左侧色条视觉区分

**决定**：在 `popup.css` 中新增两个卡片修饰类：
- `.card--save`：左侧 3px 实色边框，颜色 `#7c6af5`（紫色，与主色一致）
- `.card--import`：左侧 3px 实色边框，颜色 `#3ecfcf`（青色）

在 `popup.html` 中分别为两个 `<section class="card">` 添加对应修饰类。不改变其他样式，保持整体暗色风格一致。

---

### D4: 子目录选择器 — 动态读取 + 下拉框

**决定**：在 `fs-helper.js` 新增 `listSubDirectories(handle)` 函数，使用 `FileSystemDirectoryHandle.entries()` 遍历并过滤出 `kind === 'directory'` 的条目，返回目录名数组。

**Options 页交互设计**：
1. 授权目录后自动触发读取子目录列表
2. 展示 `<select>` 下拉框，列出已有子目录 + 「✏️ 新建目录…」选项
3. 用户选择「新建目录…」时显示文本输入框，输入后点击「确认创建」
4. 选择已有目录时直接保存到 `chrome.storage.sync`，无需额外点击「保存设置」

**边界情况**：
- 主目录下无子目录 → 下拉框只有「✏️ 新建目录…」，直接引导创建
- 主目录未授权 → 下拉框禁用并提示「请先选择授权目录」
- 新建的子目录在文件系统中实际创建（`getDirectoryHandle(name, { create: true })`），确保写入时目录已存在

---

### D5: 自定义 Icon — bee.png 圆形裁剪

**决定**：新增 `scripts/gen-icons.py` 脚本，使用 Pillow 库处理图片：
1. 读取 `bookmark-to-obsidian/icons/bee.png`
2. 以图片中心为圆心，取最短边为直径，裁剪为正方形
3. 应用圆形 alpha 遮罩
4. 缩放并导出为 `icon16.png`、`icon48.png`、`icon128.png`

脚本在本地一次性执行，生成结果直接提交到 `icons/` 目录，插件运行时无额外依赖。

## Risks / Trade-offs

- **Popup 高度**：默认展开后如果收藏夹层级深，可能接近 600px 上限。`.bookmark-tree` 已设置 `max-height: 200px` + 滚动，可控。
- **整行点击双触发**：需确保勾选框的 `change` 事件和行 `click` 事件不会同时触发（通过 `stopPropagation` 解决）。
- **子目录列表读取时机**：授权后需要异步读取目录，Options 页应显示 loading 状态防止空白闪烁。
