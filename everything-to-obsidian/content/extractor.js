/**
 * extractor.js — Content Script
 * 注入目标页面，使用 Readability.js 提取正文及元数据
 * 通过 chrome.scripting.executeScript 注入后执行，返回提取结果
 */

(function () {
  // ─── 辅助：获取 meta 标签内容 ─────────────────────────────
  function getMeta(name) {
    const el =
      document.querySelector(`meta[name="${name}"]`) ||
      document.querySelector(`meta[property="${name}"]`);
    return el ? (el.getAttribute('content') || '').trim() : '';
  }

  // ─── 3.1 提取基础元数据 ────────────────────────────────────
  const title =
    getMeta('og:title') ||
    document.title ||
    'Untitled';

  const url = location.href;
  const author = getMeta('author') || getMeta('article:author') || '';
  const description = getMeta('description') || getMeta('og:description') || '';

  // ─── 3.2 使用 Readability.js 提取正文 ─────────────────────
  // Readability 会修改 DOM，需克隆文档
  let contentHtml = '';
  let readabilityText = '';

  try {
    const docClone = document.cloneNode(true);
    // Readability 通过全局变量注入（web_accessible_resources 方式注入）
    const reader = new Readability(docClone);
    const article = reader.parse();
    if (article) {
      contentHtml = article.content || '';
      readabilityText = article.textContent || '';
    }
  } catch (e) {
    // 提取失败，contentHtml 保持空字符串
    console.warn('[extractor] Readability failed:', e.message);
  }

  // ─── 3.3 description fallback：取正文前 200 字 ────────────
  const finalDescription =
    description ||
    (readabilityText ? readabilityText.replace(/\s+/g, ' ').trim().slice(0, 200) : '');

  // ─── 返回结果 ──────────────────────────────────────────────
  return {
    title,
    url,
    author,
    description: finalDescription,
    contentHtml,  // 完整正文 HTML（摘要模式时不使用）
    success: true,
  };
})();
