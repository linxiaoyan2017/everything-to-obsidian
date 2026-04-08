## ADDED Requirements

### Requirement: 从当前页面提取元数据
系统 SHALL 在保存当前页面时，通过注入 Content Script 从页面 DOM 中提取以下元数据：标题（`document.title` 或 `<meta property="og:title">`）、来源 URL、作者（`<meta name="author">`）、摘要（`<meta name="description">`，为空时取正文前 200 字）。

#### Scenario: 提取含完整元数据的页面
- **WHEN** 用户触发保存，页面含 `<meta name="description">` 和 `<meta name="author">`
- **THEN** 系统 SHALL 将 description 内容作为摘要，author 内容作为作者写入 frontmatter

#### Scenario: 页面缺少 description 元标签
- **WHEN** 用户触发保存，页面无 `<meta name="description">`
- **THEN** 系统 SHALL 用正文前 200 字作为摘要 fallback

### Requirement: 使用 Readability.js 提取正文
系统 SHALL 使用 Mozilla Readability.js 算法从页面 HTML 中提取主体正文内容，过滤导航栏、广告、页脚等噪声元素。

#### Scenario: 正常文章页面提取
- **WHEN** 用户选择「完整正文」模式并触发保存
- **THEN** 系统 SHALL 使用 Readability 提取主体 HTML，转换为 Markdown 后写入文件正文区域

#### Scenario: Readability 提取失败
- **WHEN** Readability 无法识别正文（返回 null）
- **THEN** 系统 SHALL 记录失败原因，提示用户"该页面正文提取失败，已保存标题和摘要"，仍生成仅含 frontmatter 的文件

### Requirement: 支持摘要/完整正文两种提取深度
系统 SHALL 提供两种提取深度模式，用户可在保存前选择：摘要模式（仅保存 frontmatter + meta description）和完整正文模式（保存 frontmatter + Readability 提取的全文 Markdown）。

#### Scenario: 用户选择摘要模式
- **WHEN** 用户选择「摘要」并触发保存
- **THEN** 系统 SHALL 生成只含 frontmatter 和摘要段落的 Markdown 文件，不包含正文内容

#### Scenario: 用户选择完整正文模式
- **WHEN** 用户选择「完整正文」并触发保存
- **THEN** 系统 SHALL 生成含完整正文 Markdown 的文件
