## MODIFIED Requirements

### Requirement: Popup 整体视觉风格
插件 Popup SHALL 使用浅色效率工具风格（参考 Notion / Linear Light），以琥珀黄（`#F59E0B`）为主强调色，背景为极浅暖灰，卡片为纯白，文字为暖棕黑色系。

#### Scenario: 页面底色为极浅暖灰
- **WHEN** Popup 打开
- **THEN** 页面背景色 SHALL 为 `#FAFAF9`（极浅暖灰），而非深色

#### Scenario: 卡片背景为纯白
- **WHEN** 功能卡片渲染
- **THEN** 卡片背景色 SHALL 为 `#FFFFFF`，边框颜色 SHALL 为 `#E7E5E4`

#### Scenario: 主文字为暖棕黑
- **WHEN** 任意文字内容渲染
- **THEN** 主文字颜色 SHALL 为 `#1C1917`（Stone-900），次级文字 SHALL 为 `#78716C`（Stone-500）

### Requirement: Header logo 使用 bee.png 图片
Popup Header 的 logo 图标 SHALL 使用 `bee.png` 图片替代原 `📖` emoji，展示品牌图标，带圆形裁剪和呼吸感。

#### Scenario: Header 显示 bee.png 圆形图标
- **WHEN** Popup Header 渲染
- **THEN** logo 位置 SHALL 显示 `../icons/bee.png` 图片，宽高为 28px，圆形裁剪（`border-radius: 50%`），右侧与标题文字有足够间距

#### Scenario: Header 底部有极浅分割线
- **WHEN** Popup Header 渲染
- **THEN** Header 底部 SHALL 有 1px 极浅暖色分割线（`#F0EDE8`），区分 header 与内容区

### Requirement: 主操作按钮使用琥珀黄底深字样式
所有主操作按钮（「立即保存」「开始导入」）SHALL 使用琥珀黄背景配深色文字，hover 时加深背景色。

#### Scenario: 主按钮默认样式
- **WHEN** 主操作按钮渲染
- **THEN** 按钮背景 SHALL 为 `#F59E0B`，文字颜色 SHALL 为 `#1C1917`，font-weight SHALL 为 600

#### Scenario: 主按钮 hover 样式
- **WHEN** 用户鼠标悬停在主按钮上
- **THEN** 按钮背景 SHALL 变为 `#D97706`（Amber-600）

### Requirement: 选中状态使用琥珀黄
Radio 按钮和 Checkbox 的选中状态 SHALL 使用琥珀黄主色，与整体品牌色统一。

#### Scenario: Radio 选中色为琥珀黄
- **WHEN** 用户选中 radio 按钮
- **THEN** radio 选中指示器颜色 SHALL 为 `#F59E0B`

#### Scenario: Checkbox 选中色为琥珀黄
- **WHEN** 用户勾选 checkbox
- **THEN** checkbox 背景色 SHALL 为 `#F59E0B`，accent-color SHALL 为 `#F59E0B`

### Requirement: 目录状态栏低调化
目录授权状态栏 SHALL 降低视觉重量，已授权状态仅显示小绿点 + 文字，不占用大面积背景色块。

#### Scenario: 已授权状态低调显示
- **WHEN** 目录已授权
- **THEN** 状态栏 SHALL 显示绿色小圆点 + 「已授权: xxx」文字，背景为极浅绿色或透明，不显示大面积色块

#### Scenario: 未授权状态使用琥珀黄警告色
- **WHEN** 目录未授权
- **THEN** 状态栏 SHALL 使用琥珀黄浅色背景（`#FEF9C3`）+ 深色文字，而非红色背景

### Requirement: hover 交互反馈使用琥珀黄浅色
可交互元素（收藏夹树行、叶子书签行）的 hover 背景 SHALL 使用琥珀黄浅色（`#FEF3C7`），与主色调一致。

#### Scenario: 收藏夹树行 hover 背景
- **WHEN** 用户鼠标悬停在文件夹行或叶子书签行
- **THEN** 行背景色 SHALL 变为 `#FEF3C7`（Amber-100）
