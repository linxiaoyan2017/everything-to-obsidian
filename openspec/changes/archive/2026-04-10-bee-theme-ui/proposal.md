## Why

插件目前的 UI 是深蓝紫暗色系，整体偏游戏/主题化风格，与"专业效率工具"的定位不符。需要重新建立以蜜蜂品牌色（琥珀黄）为主色调的浅色效率工具风格，提升视觉专业感和品牌一致性。

## What Changes

- 整体配色从暗色系切换为浅色效率工具风（参考 Notion / Linear Light）
- 主强调色改为蜜蜂琥珀黄 `#F59E0B`，与 bee.png icon 和谐统一
- Header logo 从 `📖` emoji 替换为 `bee.png` 图片，增加呼吸感（28px 圆形）
- 主操作按钮改为黄底深字（方案A），视觉权重更合理
- 视觉层级重构：Header 轻量化 → 状态栏低调化 → 功能卡片主体突出
- Header 底部加极浅分割线
- checkbox / radio 选中色统一改为琥珀黄
- 卡片背景改为纯白，底色改为极浅暖灰 `#FAFAF9`
- 文字色系改为暖棕黑体系，避免纯黑的冷硬感

## Capabilities

### New Capabilities
- 无

### Modified Capabilities
- `plugin-ui`：Popup 整体视觉风格、配色体系、按钮样式、Header logo、状态栏样式、信息层级全面重构

## Impact

- 改动文件：`popup/popup.css`、`popup/popup.html`（header logo img 标签）
- 不影响任何功能逻辑，纯视觉改动
- `progress/progress.css` 暂不修改（独立窗口可后续跟进）
