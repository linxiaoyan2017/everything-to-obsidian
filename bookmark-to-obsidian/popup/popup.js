/**
 * popup.js — Popup 主控制器
 * 整合 fs-helper、markdown-helper、bookmark-helper
 */

import { pickDirectory, getDirectoryHandle, writeMarkdownFile } from './fs-helper.js';
import { buildMarkdownFile } from './markdown-helper.js';
import { loadBookmarkTree, collectUrlsFromFolders, runConcurrent, processBookmark } from './bookmark-helper.js';

const CONCURRENCY = 3;

// ─── DOM 引用 ─────────────────────────────────────────────────
const dirStatus     = document.getElementById('dir-status');
const dirStatusText = document.getElementById('dir-status-text');
const btnPickDir    = document.getElementById('btn-pick-dir');
const btnOptions    = document.getElementById('btn-options');

const viewMain     = document.getElementById('view-main');
const viewProgress = document.getElementById('view-progress');

const btnSavePage   = document.getElementById('btn-save-page');
const saveResult    = document.getElementById('save-result');

const btnExpandBM   = document.getElementById('btn-expand-bookmarks');
const bookmarkPanel = document.getElementById('bookmark-panel');
const bookmarkTree  = document.getElementById('bookmark-tree');
const selectedCount = document.getElementById('selected-count');
const btnStartImport= document.getElementById('btn-start-import');

const progressBar    = document.getElementById('progress-bar');
const progressLabel  = document.getElementById('progress-label');
const progressLog    = document.getElementById('progress-log');
const importSummary  = document.getElementById('import-summary');
const btnCancelImport= document.getElementById('btn-cancel-import');
const btnImportDone  = document.getElementById('btn-import-done');

// ─── 状态 ─────────────────────────────────────────────────────
let dirHandle = null;
let bookmarkTreeData = null;
let selectedFolderIds = new Set();
let cancelSignal = { cancelled: false };

// ─── 初始化 ───────────────────────────────────────────────────
async function init() {
  await refreshDirStatus();
  btnPickDir.addEventListener('click', onPickDir);
  btnOptions.addEventListener('click', () => chrome.runtime.openOptionsPage());
  btnSavePage.addEventListener('click', onSavePage);
  btnExpandBM.addEventListener('click', onExpandBookmarks);
  btnStartImport.addEventListener('click', onStartImport);
  btnCancelImport.addEventListener('click', onCancelImport);
  btnImportDone.addEventListener('click', () => showView('main'));
}

// ─── 6.6 目录状态 ─────────────────────────────────────────────
async function refreshDirStatus() {
  dirStatus.className = 'dir-status dir-status--unknown';
  dirStatusText.textContent = '正在检查目录授权...';
  btnPickDir.style.display = 'none';

  try {
    const result = await getDirectoryHandle();
    if (result) {
      dirHandle = result.handle;
      dirStatus.className = 'dir-status dir-status--granted';
      dirStatusText.textContent = `📁 已授权: ${result.name}`;
    } else {
      dirHandle = null;
      dirStatus.className = 'dir-status dir-status--denied';
      dirStatusText.textContent = '⚠️ 未授权目录';
      btnPickDir.style.display = 'inline-flex';
    }
  } catch {
    dirHandle = null;
    dirStatus.className = 'dir-status dir-status--denied';
    dirStatusText.textContent = '⚠️ 未授权目录';
    btnPickDir.style.display = 'inline-flex';
  }
}

async function onPickDir() {
  try {
    dirHandle = await pickDirectory();
    await refreshDirStatus();
  } catch (e) {
    if (e.name !== 'AbortError') {
      showSaveResult(`目录授权失败: ${e.message}`, 'error');
    }
  }
}

// ─── 6.3 保存当前页面 ─────────────────────────────────────────
async function onSavePage() {
  if (!dirHandle) {
    showSaveResult('请先授权读写目录（点击底部「授权目录」按钮）', 'error');
    return;
  }

  const mode = document.querySelector('input[name="save-mode"]:checked')?.value || 'full';
  btnSavePage.disabled = true;
  btnSavePage.textContent = '提取中...';
  saveResult.style.display = 'none';

  try {
    // 获取当前活跃标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // 注入 Readability
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['lib/readability.min.js'] });

    // 注入提取器
    const results = await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content/extractor.js'] });
    const data = results[0]?.result;

    if (!data?.success) throw new Error('页面内容提取失败');

    // 读取用户设置的子目录名
    const { subDir = 'Clippings' } = await chrome.storage.sync.get({ subDir: 'Clippings' });

    const meta = {
      title: data.title,
      source: tab.url,
      author: data.author,
      description: data.description,
      tags: [],
      dateSaved: new Date().toISOString().slice(0, 10),
    };

    const mdContent = buildMarkdownFile(meta, data.contentHtml, mode);
    const filename = await writeMarkdownFile(dirHandle, subDir, data.title, mdContent);

    showSaveResult(`✅ 已保存至 ${subDir}/${filename}`, 'success');
  } catch (e) {
    showSaveResult(`❌ 保存失败: ${e.message}`, 'error');
  } finally {
    btnSavePage.disabled = false;
    btnSavePage.textContent = '立即保存';
  }
}

function showSaveResult(msg, type) {
  saveResult.textContent = msg;
  saveResult.className = `result-msg ${type}`;
  saveResult.style.display = 'block';
}

// ─── 6.4 收藏夹树形渲染 ───────────────────────────────────────
async function onExpandBookmarks() {
  const isOpen = bookmarkPanel.style.display !== 'none';
  if (isOpen) {
    bookmarkPanel.style.display = 'none';
    btnExpandBM.textContent = '展开选择';
    return;
  }

  bookmarkPanel.style.display = 'block';
  btnExpandBM.textContent = '收起';

  if (!bookmarkTreeData) {
    bookmarkTree.innerHTML = '<div class="loading-hint">正在加载...</div>';
    try {
      bookmarkTreeData = await loadBookmarkTree();
      renderTree(bookmarkTreeData);
    } catch (e) {
      bookmarkTree.innerHTML = `<div class="loading-hint" style="color:var(--color-danger)">加载失败: ${e.message}</div>`;
    }
  }
}

function renderTree(nodes) {
  bookmarkTree.innerHTML = '';
  for (const node of nodes) {
    const el = buildFolderNode(node);
    if (el) bookmarkTree.appendChild(el);
  }
}

function countBookmarks(node) {
  if (node.url) return 1;
  return (node.children || []).reduce((sum, c) => sum + countBookmarks(c), 0);
}

function buildFolderNode(node) {
  if (node.url) return null; // 只显示文件夹
  const children = (node.children || []).filter(c => !c.url);
  const total = countBookmarks(node);
  if (total === 0 && children.length === 0) return null;

  const item = document.createElement('div');
  item.className = 'folder-item';

  const row = document.createElement('div');
  row.className = 'folder-row';
  row.innerHTML = `
    <span class="folder-toggle">▶</span>
    <input type="checkbox" data-id="${node.id}" />
    <span class="folder-icon">📁</span>
    <span class="folder-name">${escapeHtml(node.title || '无标题')}</span>
    <span class="folder-count">${total}</span>
  `;

  const childrenWrap = document.createElement('div');
  childrenWrap.className = 'folder-children';
  childrenWrap.style.display = 'none';

  const toggle = row.querySelector('.folder-toggle');
  const checkbox = row.querySelector('input[type=checkbox]');

  // 展开/折叠
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = childrenWrap.style.display !== 'none';
    childrenWrap.style.display = open ? 'none' : 'block';
    toggle.classList.toggle('open', !open);
  });

  // 勾选
  checkbox.addEventListener('change', () => {
    if (checkbox.checked) {
      selectedFolderIds.add(node.id);
    } else {
      selectedFolderIds.delete(node.id);
    }
    updateSelectedCount();
  });

  // 渲染子文件夹
  for (const child of node.children || []) {
    const childEl = buildFolderNode(child);
    if (childEl) childrenWrap.appendChild(childEl);
  }

  item.appendChild(row);
  if (childrenWrap.children.length > 0) item.appendChild(childrenWrap);

  return item;
}

function updateSelectedCount() {
  if (!bookmarkTreeData) return;
  const bookmarks = collectUrlsFromFolders(selectedFolderIds, bookmarkTreeData);
  selectedCount.textContent = `已选 ${bookmarks.length} 个书签`;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── 6.5 批量导入进度 ─────────────────────────────────────────
async function onStartImport() {
  if (!dirHandle) {
    alert('请先授权 Obsidian 目录');
    return;
  }

  const bookmarks = collectUrlsFromFolders(selectedFolderIds, bookmarkTreeData || []);
  if (bookmarks.length === 0) {
    alert('请至少选择一个文件夹');
    return;
  }

  const mode = document.querySelector('input[name="import-mode"]:checked')?.value || 'summary';
  const { subDir = 'Clippings' } = await chrome.storage.sync.get({ subDir: 'Clippings' });

  showView('progress');
  progressLog.innerHTML = '';
  importSummary.style.display = 'none';
  btnImportDone.style.display = 'none';
  btnCancelImport.style.display = 'inline-flex';
  cancelSignal = { cancelled: false };

  // 8.1 通知 Service Worker 启动保活
  chrome.runtime.sendMessage({ type: 'START_IMPORT' });

  let done = 0, skipped = 0, failed = 0;
  const total = bookmarks.length;

  progressBar.style.width = '0%';
  progressLabel.textContent = `0 / ${total}`;

  const tasks = bookmarks.map((bm) => async () => {
    const result = await processBookmark(bm, mode);
    if (result.skipped) {
      skipped++;
      addLog(`⏭️ ${bm.title || bm.url}（${result.reason || '跳过'}）`, 'skip');
    } else {
      try {
        const mdContent = buildMarkdownFile(result.meta, result.contentHtml, mode);
        await writeMarkdownFile(dirHandle, subDir, result.meta.title, mdContent);
        done++;
        addLog(`✅ ${result.meta.title}`, 'success');
      } catch (e) {
        failed++;
        addLog(`❌ ${bm.title || bm.url}（写入失败: ${e.message}）`, 'error');
      }
    }

    const processed = done + skipped + failed;
    progressBar.style.width = `${Math.round(processed / total * 100)}%`;
    progressLabel.textContent = `${processed} / ${total}`;

    // 同步任务状态到 storage
    chrome.storage.session.set({ importProgress: { done, skipped, failed, total } });

    return result;
  });

  await runConcurrent(tasks, CONCURRENCY, null, cancelSignal);

  // 完成
  const cancelled = cancelSignal.cancelled;
  importSummary.innerHTML = cancelled
    ? `已取消<br>✅ 已完成 ${done} 条 &nbsp;⏭️ 跳过 ${skipped} 条 &nbsp;❌ 失败 ${failed} 条`
    : `导入完成！<br>✅ 成功 ${done} 条 &nbsp;⏭️ 跳过 ${skipped} 条 &nbsp;❌ 失败 ${failed} 条`;
  importSummary.style.display = 'block';
  btnCancelImport.style.display = 'none';
  btnImportDone.style.display = 'inline-flex';

  const titleEl = viewProgress.querySelector('.card-title');
  if (titleEl) titleEl.textContent = cancelled ? '📥 已取消' : '📥 导入完成';
}

function addLog(msg, type) {
  const item = document.createElement('div');
  item.className = `log-item ${type}`;
  item.textContent = msg;
  progressLog.appendChild(item);
  progressLog.scrollTop = progressLog.scrollHeight;
}

function onCancelImport() {
  cancelSignal.cancelled = true;
  btnCancelImport.disabled = true;
  btnCancelImport.textContent = '取消中...';
}

function showView(name) {
  viewMain.style.display = name === 'main' ? 'block' : 'none';
  viewProgress.style.display = name === 'progress' ? 'block' : 'none';
}

// ─── 启动 ─────────────────────────────────────────────────────
init();
