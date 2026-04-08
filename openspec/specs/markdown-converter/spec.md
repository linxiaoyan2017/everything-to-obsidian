## ADDED Requirements

### Requirement: 使用 Turndown.js 将 HTML 转换为 Markdown
系统 SHALL 使用 Turndown.js 将 Readability 提取的 HTML 正文转换为 Markdown，配置为 ATX 标题风格（`#`）、围栏代码块（` ``` `）、列表标记使用 `-`。

#### Scenario: 正常 HTML 转 Markdown
- **WHEN** Readability 成功提取正文 HTML
- **THEN** 系统 SHALL 使用 Turndown 将其转换为格式规范的 Markdown 文本

#### Scenario: 含代码块的页面
- **WHEN** 正文包含 `<pre><code>` 代码块
- **THEN** 系统 SHALL 将其转换为围栏式代码块（` ```language\n...\n``` `）

### Requirement: 生成含完整 frontmatter 的 Obsidian Markdown 文件
系统 SHALL 为每个保存的页面生成 YAML frontmatter，包含以下字段：`title`（页面标题）、`source`（原始 URL）、`author`（作者，可为空）、`date_saved`（保存日期，格式 `YYYY-MM-DD`）、`tags`（来自收藏夹路径或用户设置）、`type`（固定值 `clipping`）。

#### Scenario: 生成完整 frontmatter
- **WHEN** 保存一个含完整元数据的页面
- **THEN** 系统 SHALL 在文件头部输出合法 YAML frontmatter，所有字段均正确填入

#### Scenario: 作者字段缺失
- **WHEN** 页面无 `<meta name="author">` 标签
- **THEN** 系统 SHALL 将 `author` 字段设为空字符串（`author: ""`），不影响其他字段

### Requirement: 文件末尾附加原始链接
系统 SHALL 在 Markdown 文件末尾追加格式化的原始链接区域，格式为 `> 🔗 原文: [标题](URL)` 和 `> 📅 保存时间: YYYY-MM-DD`。

#### Scenario: 文件末尾链接
- **WHEN** 任何页面保存成功
- **THEN** 系统 SHALL 在文件末尾追加分割线和原文链接块
