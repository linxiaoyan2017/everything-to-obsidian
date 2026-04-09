## Why

插件当前的 Popup 界面存在以下体验问题：
1. 收藏夹选择面板默认折叠，用户需额外点击才能看到内容，增加操作步骤
2. 收藏夹树状选择器只有勾选框可触发选中，整行点击无响应，与常规列表交互习惯不符
3. 「保存当前页面」和「批量导入收藏夹」两个功能卡片视觉样式完全相同，用户需要阅读才能区分
4. 设置页「文件存储」子目录通过文本框手动输入，用户不知道主目录下已有哪些子目录，容易填错
5. 插件图标为程序生成的占位图，无法体现产品个性

## What Changes

- **批量导入面板默认展开**：移除「展开选择」按钮，Popup 打开时直接显示收藏夹树
- **树状选择器整行可点击**：点击条目整行（除展开箭头外）均可切换勾选状态；展开箭头通过 `stopPropagation` 避免误触
- **功能卡片视觉区分**：为「保存当前页面」卡片添加紫色左侧色条，为「批量导入收藏夹」卡片添加青色左侧色条
- **子目录下拉选择器**：设置页「文件存储」改为动态读取已授权主目录的子目录列表，以下拉框形式呈现，支持选择已有子目录或新建
- **自定义插件 Icon**：读取 `icons/bee.png`，自动执行圆形裁剪并生成 16×16、48×48、128×128 三个尺寸的 PNG 文件

## Capabilities

### Modified Capabilities

- `plugin-ui`：修改 Popup 界面交互逻辑（默认展开、整行点击、卡片色条）及 Options 设置页（子目录下拉选择器）
- `filesystem-writer`：新增 `listSubDirectories(handle)` 方法，枚举已授权主目录下的子目录列表，供 Options 页面下拉框使用

### New Capabilities

（无）

## Impact

- 改动范围：`popup/popup.html`、`popup/popup.css`、`popup/popup.js`、`popup/fs-helper.js`、`options/options.html`、`options/options.js`、`icons/`
- 新增 Python 脚本 `scripts/gen-icons.py`：处理 `bee.png` 圆形裁剪与多尺寸生成（依赖 Pillow 库）
- 不涉及核心提取、转换、写入逻辑，无功能性风险
- Chrome 插件需在 `chrome://extensions/` 刷新后生效
