## 1. 自定义 Icon 生成（bee.png 圆形裁剪）

- [x] 1.1 安装 Pillow：`pip3 install Pillow`
- [x] 1.2 创建 `scripts/gen-icons.py`：读取 `icons/bee.png`，中心裁剪正方形 → 圆形 alpha 遮罩 → 导出 icon16.png / icon48.png / icon128.png
- [x] 1.3 运行脚本生成三个尺寸的 icon 文件，确认效果

## 2. Popup 默认展开收藏夹面板（popup.html + popup.js）

- [x] 2.1 `popup.html`：删除 `id="btn-expand-bookmarks"` 按钮元素，`id="bookmark-panel"` 去掉 `style="display:none"`
- [x] 2.2 `popup.js`：删除 `onExpandBookmarks` 函数及其事件绑定；在 `init()` 中直接调用加载书签树逻辑（原 `onExpandBookmarks` 中的内容移入 `init`）

## 3. 树状选择器整行可点击（popup.js）

- [x] 3.1 `buildFolderNode()`：为 `.folder-row` 元素绑定 `click` 事件，切换对应 `node.id` 的勾选状态并更新 checkbox UI
- [x] 3.2 展开箭头 `toggle` 的 `click` 事件：保留现有逻辑，确保调用 `e.stopPropagation()`
- [x] 3.3 勾选框 `checkbox` 的 `change` 事件：改为只更新 `selectedFolderIds` 和计数（不再改 checkbox 的 checked，由行点击或用户直接操作驱动），同时在 checkbox 的 `click` 上加 `e.stopPropagation()` 防止冒泡触发行点击

## 4. 功能卡片左侧色条（popup.css + popup.html）

- [x] 4.1 `popup.css`：新增 `.card--save { border-left: 3px solid #7c6af5; }` 和 `.card--import { border-left: 3px solid #3ecfcf; }`
- [x] 4.2 `popup.html`：「保存当前页面」`<section>` 添加 `card--save` 类，「批量导入收藏夹」`<section>` 添加 `card--import` 类

## 5. fs-helper.js 新增 listSubDirectories

- [x] 5.1 在 `fs-helper.js` 中实现并导出 `listSubDirectories(handle)`：遍历 `handle.entries()`，过滤 `kind === 'directory'`，返回按字母排序的名称数组

## 6. Options 页子目录下拉选择器（options.html + options.js）

- [x] 6.1 `options.html`：将子目录文本输入框 + 保存按钮替换为 `<select id="select-subdir">` 下拉框 + 「新建目录」区域（默认隐藏的输入框 + 确认按钮）；更新相关样式
- [x] 6.2 `options.js`：授权目录后自动调用 `listSubDirectories(handle)` 填充下拉框，末尾追加「✏️ 新建目录…」选项，并将已保存的 `subDir` 设为选中值
- [x] 6.3 `options.js`：监听下拉框 `change` 事件：选择已有目录时立即保存到 `chrome.storage.sync` 并提示「✅ 已保存」；选择「新建目录…」时显示输入框
- [x] 6.4 `options.js`：「确认创建」按钮逻辑：调用 `dirHandle.getDirectoryHandle(name, { create: true })` 创建目录，保存名称，刷新下拉框并选中新目录
- [x] 6.5 `options.js`：未授权状态下禁用下拉框，显示「请先选择授权目录」提示

## 7. 验证

- [ ] 7.1 刷新插件后确认 Popup 打开即显示收藏夹树（无需点击展开）
- [ ] 7.2 点击收藏夹条目整行验证勾选切换正常，点击箭头验证只折叠不勾选
- [ ] 7.3 确认两个功能卡片左侧色条颜色正确显示
- [ ] 7.4 在 Options 页验证子目录下拉框正确显示已有目录，选择后自动保存
- [ ] 7.5 在 Options 页验证「新建目录」流程：输入名称 → 确认创建 → 目录实际存在 → 下拉框刷新
- [ ] 7.6 确认工具栏和扩展管理页中显示新的 bee.png 图标
