## ADDED Requirements

### Requirement: 通过 File System Access API 授权本地目录
系统 SHALL 在首次使用时通过 `window.showDirectoryPicker()` 弹出系统文件夹选择器，引导用户授权 Obsidian vault 目录，并将 `FileSystemDirectoryHandle` 持久化到 IndexedDB。

#### Scenario: 首次授权目录
- **WHEN** 用户首次点击「选择 Obsidian 目录」
- **THEN** 系统 SHALL 弹出系统文件夹选择对话框，用户选择文件夹后，系统 SHALL 将 handle 存入 IndexedDB，并在界面显示已授权路径名称

#### Scenario: 重新授权（浏览器重启后）
- **WHEN** 系统检测到 IndexedDB 中存有 handle 但权限已失效
- **THEN** 系统 SHALL 在 Popup 顶部显示「📁 需要重新授权目录」提示，用户点击后调用 `handle.requestPermission()` 恢复权限

### Requirement: 在目标目录下创建子目录并写入 Markdown 文件
系统 SHALL 在授权目录下自动创建 `Clippings` 子目录（如不存在），将生成的 .md 文件写入其中；文件名为 sanitize 后的页面标题（去除非法字符，截断至 100 字符），同名文件直接覆盖。

#### Scenario: 正常写入新文件
- **WHEN** 用户触发保存，目录已授权
- **THEN** 系统 SHALL 在 `<授权目录>/Clippings/<sanitized-title>.md` 路径创建/覆盖文件，并写入 Markdown 内容

#### Scenario: 子目录不存在时自动创建
- **WHEN** `Clippings` 子目录尚未存在
- **THEN** 系统 SHALL 通过 `getDirectoryHandle('Clippings', { create: true })` 自动创建

#### Scenario: 重复文件覆盖
- **WHEN** 同名文件已存在
- **THEN** 系统 SHALL 覆盖原文件内容，不创建副本，不提示用户

### Requirement: 文件名 sanitize
系统 SHALL 对页面标题做合法文件名处理：去除 `/ : * ? " < > | \` 等字符，将空白替换为空格，截断至 100 字符，确保文件名合法。

#### Scenario: 含非法字符的标题
- **WHEN** 页面标题包含 `:`、`/` 等文件名非法字符
- **THEN** 系统 SHALL 去除或替换这些字符后生成合法文件名，不报错

#### Scenario: 标题过长
- **WHEN** 页面标题超过 100 字符
- **THEN** 系统 SHALL 截断至 100 字符再加 `.md` 后缀

### Requirement: 新增 listSubDirectories 方法
系统 SHALL 在 `fs-helper.js` 中新增 `listSubDirectories(handle)` 函数，枚举已授权根目录下的所有直接子目录，返回目录名称数组。

#### Scenario: 正常读取子目录列表
- **WHEN** 传入有效的 `FileSystemDirectoryHandle`
- **THEN** 系统 SHALL 返回该目录下所有 `kind === 'directory'` 条目的名称数组，按字母顺序排列

#### Scenario: 根目录下无子目录
- **WHEN** 授权的根目录为空（无任何子目录）
- **THEN** 系统 SHALL 返回空数组 `[]`

### Requirement: Options 页子目录改为下拉选择器
系统 SHALL 将设置页「文件存储」中的子目录名称文本输入框替换为动态下拉选择器，列出已授权根目录下的子目录，并提供「新建目录」选项。

#### Scenario: 已授权时展示子目录下拉框
- **WHEN** Options 页加载且已有授权目录
- **THEN** 系统 SHALL 读取根目录子目录列表，渲染 `<select>` 下拉框，列出所有子目录名 + 末尾「✏️ 新建目录…」选项，并将当前已保存的 `subDir` 设为默认选中值

#### Scenario: 选择已有子目录自动保存
- **WHEN** 用户从下拉框选择一个已有子目录名称
- **THEN** 系统 SHALL 立即将该名称存入 `chrome.storage.sync`，并显示「✅ 已保存」提示，无需用户额外点击保存按钮

#### Scenario: 选择「新建目录」展示输入框
- **WHEN** 用户从下拉框选择「✏️ 新建目录…」
- **THEN** 系统 SHALL 在下拉框下方显示文本输入框和「确认创建」按钮

#### Scenario: 确认创建新子目录
- **WHEN** 用户在输入框填入目录名并点击「确认创建」
- **THEN** 系统 SHALL 通过 `getDirectoryHandle(name, { create: true })` 在文件系统中实际创建该子目录，将名称存入 `chrome.storage.sync`，刷新下拉框列表并选中新目录

#### Scenario: 未授权时下拉框禁用
- **WHEN** Options 页加载但尚未授权根目录
- **THEN** 系统 SHALL 禁用下拉框并显示提示文字「请先选择授权目录」

### Requirement: writeMarkdownFile 支持多级路径
系统 SHALL 支持传入字符串数组作为路径参数，逐级创建子目录，保持收藏夹原有目录结构。

#### Scenario: 按收藏夹层级写入文件
- **WHEN** 传入 `['Clippings', '技术', '前端']` 路径数组
- **THEN** 系统 SHALL 逐层调用 `getDirectoryHandle({ create: true })`，在 `<根目录>/Clippings/技术/前端/` 下写入文件
