## MODIFIED Requirements

### Requirement: 新增 listSubDirectories 方法
系统 SHALL 在 `fs-helper.js` 中新增 `listSubDirectories(handle)` 函数，枚举已授权根目录下的所有直接子目录，返回目录名称数组。

#### Scenario: 正常读取子目录列表
- **WHEN** 传入有效的 `FileSystemDirectoryHandle`
- **THEN** 系统 SHALL 返回该目录下所有 `kind === 'directory'` 条目的名称数组，按字母顺序排列

#### Scenario: 根目录下无子目录
- **WHEN** 授权的根目录为空（无任何子目录）
- **THEN** 系统 SHALL 返回空数组 `[]`

---

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
