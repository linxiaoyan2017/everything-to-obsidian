## Context

插件当前使用暗色 CSS 变量体系（`--color-bg: #1e1e2e` 等），所有颜色通过 CSS 变量集中管理。改动只涉及 `popup.css` 的变量重定义和少量 HTML 改动（header logo 替换），不影响任何 JS 逻辑。

## Goals / Non-Goals

**Goals:**
- 建立完整的暖色浅色 CSS 变量体系（背景/文字/强调/边框/状态）
- Header logo 换成 bee.png img 标签
- 按钮、radio、checkbox 统一使用琥珀黄主色
- 视觉层级：Header 轻 → 状态栏极低调 → 卡片主体清晰

**Non-Goals:**
- 不改动 `progress/progress.css`（独立窗口样式）
- 不改动 `options/` 样式（下一个 change）
- 不改动任何 JS 逻辑

## Decisions

### 决策 1：CSS 变量集中重定义，不散改
在 `:root` 块统一重定义所有颜色变量，组件样式不变，只改变量值。
好处：改动最小、风险最低、后续维护方便。

### 决策 2：配色体系
```
背景
  --color-bg:        #FAFAF9   页面底色（极浅暖灰）
  --color-bg-card:   #FFFFFF   卡片背景
  --color-bg-hover:  #FEF3C7   hover 背景（琥珀黄浅色 Amber-100）

文字
  --color-text:      #1C1917   主文字（暖棕黑 Stone-900）
  --color-text-muted:#78716C   次级文字（Stone-500）

强调色（蜜蜂琥珀黄）
  --color-primary:   #F59E0B   Amber-500
  --color-primary-hover: #D97706  Amber-600

边框
  --color-border:    #E7E5E4   Stone-200
  --color-border-light: #F5F5F4  Stone-100

状态色
  --color-success:   #16A34A   绿
  --color-danger:    #DC2626   红
  --color-warning-bg:#FEF9C3   黄浅背景
```

### 决策 3：按钮样式
主按钮：`background: #F59E0B; color: #1C1917; font-weight: 600`
hover：`background: #D97706`
去掉原来的 box-shadow 紫光，改为极轻的暖色阴影。

### 决策 4：Header logo
```html
<!-- 原来 -->
<span class="header-logo">📖</span>
<!-- 改为 -->
<img src="../icons/bee.png" class="header-logo" alt="bee" />
```
CSS：`width: 28px; height: 28px; border-radius: 50%; object-fit: cover`
margin-right 给足呼吸感。

### 决策 5：Header 分割线
```css
.header { border-bottom: 1px solid #F0EDE8; }
```
极浅暖灰，不抢眼。

### 决策 6：状态栏低调化
已授权状态：去掉绿色背景块，改为一行小文字 + 绿点指示器。
未授权状态：保留警告但降低视觉重量（amber 浅色背景，不用红色）。

## Risks / Trade-offs

- `bee.png` 路径是 `../icons/bee.png`（相对 popup 目录），需确认路径正确 → 已知路径，低风险
- 浅色系在某些低亮度屏幕上对比度需验证 → Stone-900 文字对白底对比度 > 12:1，安全
