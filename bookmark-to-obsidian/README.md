# 📖 Bookmark to Obsidian

将 Chrome 收藏夹和当前网页一键提取为 Markdown，直接写入本地 Obsidian 知识库。

## ✨ 功能特性

- **保存当前页面**：一键将当前标签页提取为 Markdown 文件，支持「摘要」或「完整正文」两种深度
- **批量导入收藏夹**：树形文件夹选择器，支持选择部分文件夹批量导入，小并发（3）处理
- **智能正文提取**：使用 Mozilla Readability.js（Firefox 阅读模式同款算法）
- **Obsidian 友好**：生成含完整 frontmatter（title/source/author/date_saved/tags/type）的标准格式
- **无需后端**：通过 File System Access API 直接写入本地目录，零配置
- **死链跳过**：批量处理时自动跳过无效链接，实时进度展示

## 🛠️ 安装方法

### 前置条件
- Chrome 86+（支持 File System Access API）
- 已安装 Obsidian 并有本地 Vault 目录

### 步骤

1. **下载插件代码**

   将本仓库克隆或下载到本地：
   ```bash
   git clone https://github.com/yourname/bookmark-to-obsidian.git
   ```

2. **在 Chrome 中加载插件**

   - 打开 Chrome，访问 `chrome://extensions/`
   - 开启右上角「**开发者模式**」
   - 点击「**加载已解压的扩展程序**」
   - 选择本项目的 `bookmark-to-obsidian/` 文件夹

3. **初始化设置**

   插件首次安装后会自动打开设置页，点击「**选择 Obsidian 目录**」，在弹出的文件夹选择器中选择你的 Obsidian Vault 根目录（如 `myobsidian`）。

4. **开始使用**

   点击 Chrome 工具栏中的插件图标即可使用。

## 📂 文件存储结构

所有文件统一保存到 `<Obsidian Vault>/Clippings/` 目录（子目录名可在设置中自定义）：

```
myobsidian/
└── Clippings/
    ├── React 18 新特性详解.md
    ├── TypeScript 入门指南.md
    └── ...
```

每个文件格式：

```markdown
---
title: "React 18 新特性详解"
source: "https://react.dev/blog/..."
author: "React Team"
date_saved: "2025-04-08"
tags: [技术, 前端, React]
type: clipping
---

## 摘要

React 18 带来了并发特性...

---

（完整正文模式下包含全文）

---
> 🔗 原文: [React 18 新特性详解](https://react.dev/...)
> 📅 保存时间: 2025-04-08
```

## ⚙️ 使用说明

### 保存当前页面

1. 打开目标网页（等待页面完全加载）
2. 点击工具栏中的插件图标
3. 在「保存当前页面」区域选择深度：**摘要**（仅标题+摘要）或**完整正文**
4. 点击「立即保存」

### 批量导入收藏夹

1. 点击「展开选择」展开收藏夹面板
2. 勾选需要导入的文件夹（支持多选）
3. 选择提取深度
4. 点击「开始导入」，等待进度完成

### 重新授权目录

Chrome 重启后可能需要重新确认目录权限：
- Popup 底部会显示「⚠️ 未授权目录」
- 点击「授权目录」按钮，在弹出提示中点击「允许」即可（无需重新选择文件夹）

## ⚠️ 已知限制

| 限制 | 说明 |
|---|---|
| 动态渲染页面 | SPA（如 Twitter、知乎）部分内容由 JS 渲染，可能导致正文提取不完整 |
| 需要登录的页面 | 插件无法访问需要登录才能查看的内容 |
| 图片不本地化 | 正文中的图片以原始 URL 保留，离线时无法显示 |
| Chrome 重启后需确认权限 | 这是 Chrome 安全策略，点击一次即可恢复 |
| 仅支持 Chrome | 不支持 Firefox / Edge / Safari |

## 🏗️ 技术栈

| 技术 | 用途 |
|---|---|
| Chrome Extension MV3 | 插件框架 |
| File System Access API | 本地文件写入 |
| Mozilla Readability.js | 正文提取 |
| Turndown.js | HTML → Markdown 转换 |
| IndexedDB | 目录句柄持久化 |
| chrome.storage | 配置和任务状态 |

## 📄 许可证

MIT License
