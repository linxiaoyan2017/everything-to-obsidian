## 1. CSS 变量体系重建（popup.css）

- [x] 1.1 重写 `:root` 变量块：背景色系（`--color-bg` / `--color-bg-card` / `--color-bg-hover`）
- [x] 1.2 重写文字色系变量（`--color-text` / `--color-text-muted`）
- [x] 1.3 重写主强调色变量（`--color-primary` / `--color-primary-hover`）
- [x] 1.4 重写边框色变量（`--color-border` / `--color-border-light`）
- [x] 1.5 重写状态色变量（`--color-success` / `--color-danger`）并新增 `--color-warning-bg`

## 2. Header 改造（popup.html + popup.css）

- [x] 2.1 `popup.html`：将 `<span class="header-logo">📖</span>` 替换为 `<img src="../icons/bee.png" class="header-logo" alt="bee" />`
- [x] 2.2 `popup.css`：`.header-logo` 改为 `width:28px; height:28px; border-radius:50%; object-fit:cover`，增加右侧 margin 呼吸感
- [x] 2.3 `popup.css`：`.header` 添加 `border-bottom: 1px solid #F0EDE8`
- [x] 2.4 `popup.css`：Header 背景色、文字色适配浅色体系

## 3. 主按钮样式（popup.css）

- [x] 3.1 `.btn--primary`：背景改为 `#F59E0B`，文字改为 `#1C1917`，font-weight 600
- [x] 3.2 `.btn--primary:hover`：背景改为 `#D97706`，去掉紫色 box-shadow
- [x] 3.3 `.btn--ghost`（授权目录按钮）：适配浅色风格，边框 `#E7E5E4`，文字 `#78716C`

## 4. 选中色改为琥珀黄（popup.css）

- [x] 4.1 全局 `accent-color` 改为 `#F59E0B`
- [x] 4.2 `.folder-row input[type=checkbox]` 和 `.leaf-checkbox` 的 `accent-color` 确认为 `#F59E0B`
- [x] 4.3 radio 按钮 `accent-color` 改为 `#F59E0B`

## 5. 状态栏低调化（popup.css）

- [x] 5.1 `.dir-status--granted`：去掉大面积绿色背景，改为极浅透明背景 + 绿色小圆点伪元素
- [x] 5.2 `.dir-status--denied`：背景改为 `#FEF9C3`（琥珀黄浅色），文字改为 `#92400E`，去掉红色

## 6. 卡片和收藏夹树适配（popup.css）

- [x] 6.1 `.card` 背景色、边框色适配新变量（白底 + 浅棕边框）
- [x] 6.2 `.folder-row:hover` / `.bookmark-leaf:hover` 背景改为 `#FEF3C7`（Amber-100）
- [x] 6.3 `.folder-toggle`、`.folder-name`、`.folder-count` 文字色适配暖棕色系
- [x] 6.4 左侧色条 `.card--save` / `.card--import` 颜色保留或微调（与新主色协调）

## 7. 验证

- [ ] 7.1 刷新插件，确认 Header 显示 bee.png 圆形图标
- [ ] 7.2 确认整体背景为浅暖灰，卡片为白色
- [ ] 7.3 确认主按钮为琥珀黄底深色字
- [ ] 7.4 确认 radio / checkbox 选中色为琥珀黄
- [ ] 7.5 确认状态栏已授权状态低调显示，未授权为黄色警告
- [ ] 7.6 确认收藏夹树 hover 为 Amber-100 浅黄色
