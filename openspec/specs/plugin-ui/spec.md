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

### Requirement: 批量导入面板默认展开
系统 SHALL 在 Popup 打开时默认显示收藏夹树形选择区域，无需用户点击额外按钮展开。

#### Scenario: Popup 打开时直接显示收藏夹树
- **WHEN** 用户点击工具栏图标打开 Popup
- **THEN** 系统 SHALL 直接显示收藏夹树形选择器（无折叠状态），并自动开始加载书签数据

### Requirement: 树状选择器整行可点击切换勾选
系统 SHALL 支持点击收藏夹条目的整行区域（除展开/折叠箭头外）来切换该文件夹的勾选状态，勾选父目录时递归选中所有子目录及叶子书签。

#### Scenario: 点击文件夹行切换勾选
- **WHEN** 用户点击条目行内的文件夹图标、名称文字或空白区域
- **THEN** 系统 SHALL 切换该文件夹的勾选状态，并更新底部「已选 N 个书签」计数

#### Scenario: 勾选父目录递归选中子节点
- **WHEN** 用户勾选一个文件夹
- **THEN** 系统 SHALL 递归将所有子文件夹和叶子书签 checkbox 设为选中状态

#### Scenario: 点击展开箭头不触发勾选
- **WHEN** 用户点击条目行最左侧的 `▶` 展开箭头
- **THEN** 系统 SHALL 仅切换子文件夹的展开/折叠状态，不改变当前文件夹的勾选状态

### Requirement: 功能卡片通过左侧色条视觉区分
系统 SHALL 为两个功能卡片添加不同颜色的左侧色条，使用户无需阅读文字即可在视觉上区分两个功能区域。

#### Scenario: 保存当前页面卡片色条
- **WHEN** Popup 主界面渲染完成
- **THEN**「保存当前页面」卡片 SHALL 在左侧显示 3px 宽的紫色（`#7c6af5`）实色边框

#### Scenario: 批量导入收藏夹卡片色条
- **WHEN** Popup 主界面渲染完成
- **THEN**「批量导入收藏夹」卡片 SHALL 在左侧显示 3px 宽的青色（`#3ecfcf`）实色边框

### Requirement: 批量导入使用独立进度窗口
系统 SHALL 在用户点击「开始导入」时弹出独立的进度窗口，实时展示导入进度和日志，不因 Popup 关闭而中断。

#### Scenario: 弹出独立进度窗口
- **WHEN** 用户点击「开始导入」
- **THEN** 系统 SHALL 通过 `chrome.windows.create` 打开独立进度窗口，显示进度条、实时日志和取消按钮

#### Scenario: 取消导入
- **WHEN** 用户点击进度窗口中的「取消导入」
- **THEN** 系统 SHALL 通过 `chrome.storage.session` 设置取消标志，导入任务感知后停止，进度窗口显示汇总

### Requirement: 叶子书签可单独勾选导入
系统 SHALL 在收藏夹树中展示叶子书签节点，允许用户单独勾选特定书签进行导入，不依赖文件夹批量勾选。

#### Scenario: 单独勾选叶子书签
- **WHEN** 用户展开文件夹后点击叶子书签行
- **THEN** 系统 SHALL 将该书签加入导入队列，底部计数更新

#### Scenario: 叶子与文件夹去重
- **WHEN** 用户同时勾选了文件夹和该文件夹下的某个叶子书签
- **THEN** 系统 SHALL 在合并时按 URL 去重，该书签只导入一次
