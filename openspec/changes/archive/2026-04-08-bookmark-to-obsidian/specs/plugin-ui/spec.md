## ADDED Requirements

### Requirement: Popup 提供「保存当前页面」入口
系统 SHALL 在 Popup 主界面提供「保存当前页面」功能区，用户可选择提取深度（摘要 / 完整正文）后点击「立即保存」触发保存，并展示操作结果（成功/失败提示）。

#### Scenario: 成功保存当前页面
- **WHEN** 目录已授权，用户选择深度并点击「立即保存」
- **THEN** 系统 SHALL 在按钮下方显示「✅ 已保存至 Clippings/<文件名>.md」

#### Scenario: 未授权目录时点击保存
- **WHEN** 用户尚未授权 Obsidian 目录就点击「立即保存」
- **THEN** 系统 SHALL 提示「请先在设置中选择 Obsidian 目录」，并提供跳转设置页的链接

### Requirement: Popup 提供「批量导入收藏夹」入口
系统 SHALL 在 Popup 主界面提供「批量导入收藏夹」功能区，展示可折叠树形收藏夹文件夹选择器，用户选择文件夹和深度后可启动批量导入，实时显示进度。

#### Scenario: 展示收藏夹选择器
- **WHEN** 用户展开「批量导入收藏夹」面板
- **THEN** 系统 SHALL 异步加载并渲染 Chrome 收藏夹文件夹树，每节点含勾选框

#### Scenario: 批量导入进行中切换到进度视图
- **WHEN** 用户点击「开始导入」
- **THEN** 系统 SHALL 切换 Popup 主体内容为进度视图，展示实时进度条和日志

### Requirement: Popup 展示当前目录授权状态
系统 SHALL 在 Popup 底部始终显示当前授权目录的状态：已授权时显示目录名称，未授权或权限失效时显示警告并提供授权入口。

#### Scenario: 已授权状态显示
- **WHEN** Popup 打开，系统检测到有效授权
- **THEN** 系统 SHALL 在底部显示「📁 已授权: <目录名>」

#### Scenario: 未授权状态显示
- **WHEN** Popup 打开，IndexedDB 中无 handle 或权限失效
- **THEN** 系统 SHALL 在底部显示「⚠️ 未授权目录，点击授权」按钮

### Requirement: Options 页面提供 Obsidian 目录授权入口
系统 SHALL 提供 Options 页面，用户可点击「选择 Obsidian 目录」按钮触发 File System Access API 授权，并显示当前已授权目录名和子目录名（可自定义 `Clippings` 名称）。

#### Scenario: 在 Options 中授权目录
- **WHEN** 用户点击 Options 中的「选择 Obsidian 目录」
- **THEN** 系统 SHALL 弹出目录选择器，授权后显示目录名，并存入 IndexedDB

#### Scenario: 自定义子目录名
- **WHEN** 用户在 Options 中修改子目录名称输入框
- **THEN** 系统 SHALL 将新子目录名存入 `chrome.storage.sync`，后续写入文件时使用此子目录名
