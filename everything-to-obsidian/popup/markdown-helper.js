/**
 * markdown-helper.js — Markdown 生成模块
 * 依赖：turndown.min.js（需在使用前通过 importScripts 或 <script> 加载）
 */

// ─── 4.1 生成 YAML frontmatter ────────────────────────────────

/**
 * 生成 Obsidian 兼容的 YAML frontmatter 字符串
 * @param {{ title, source, author, dateSaved, tags, type }} meta
 * @returns {string}
 */
export function buildFrontmatter(meta) {
  const { title = '', source = '', author = '', dateSaved = '', tags = [], type = 'clipping' } = meta;

  // YAML 字符串值转义：若含冒号/引号等特殊字符，用双引号包裹
  const escapeYaml = (str) => {
    if (!str) return '""';
    const needsQuote = /[:#\[\]{},|>&*!'"?]/.test(str) || str.includes('\n');
    return needsQuote ? `"${str.replace(/"/g, '\\"')}"` : str;
  };

  const tagsYaml = tags.length > 0
    ? `[${tags.map((t) => escapeYaml(t)).join(', ')}]`
    : '[]';

  return [
    '---',
    `title: ${escapeYaml(title)}`,
    `source: ${escapeYaml(source)}`,
    `author: ${escapeYaml(author)}`,
    `date_saved: ${dateSaved}`,
    `tags: ${tagsYaml}`,
    `type: ${type}`,
    '---',
  ].join('\n');
}

// ─── 4.2 HTML → Markdown ─────────────────────────────────────

/**
 * 使用 Turndown.js 将 HTML 字符串转为 Markdown
 * @param {string} html
 * @returns {string}
 */
export function htmlToMarkdown(html) {
  if (!html) return '';

  // TurndownService 在 popup/options 页面中通过 <script> 加载
  // 在 service worker 中通过 importScripts 加载
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    hr: '---',
  });

  // 保留 <figure> 内的图片 alt 文字
  td.addRule('figure', {
    filter: 'figure',
    replacement: (content) => content,
  });

  return td.turndown(html);
}

// ─── 4.3 组装完整 Markdown 文件内容 ──────────────────────────

/**
 * 组装最终 Markdown 文件内容
 * @param {{ title, source, author, dateSaved, tags, description }} meta
 * @param {string} contentHtml  完整正文 HTML（摘要模式传空字符串）
 * @param {'summary' | 'full'} mode
 * @returns {string}
 */
export function buildMarkdownFile(meta, contentHtml, mode) {
  const frontmatter = buildFrontmatter(meta);

  const parts = [frontmatter, ''];

  // 摘要段落（始终包含）
  if (meta.description) {
    parts.push(`## 摘要\n\n${meta.description}\n`);
  }

  // 完整正文（仅 full 模式）
  if (mode === 'full' && contentHtml) {
    const bodyMd = htmlToMarkdown(contentHtml);
    if (bodyMd.trim()) {
      parts.push('---\n');
      parts.push(bodyMd);
      parts.push('');
    }
  }

  // 末尾原文链接
  parts.push('---');
  parts.push(`> 🔗 原文: [${meta.title}](${meta.source})`);
  parts.push(`> 📅 保存时间: ${meta.dateSaved}`);

  return parts.join('\n');
}
