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

const bookmarkTree  = document.getElementById('bookmark-tree');
const selectedCount = document.getElementById('selected-count');
const btnStartImport= document.getElementById('btn-start-import');

// ─── 状态 ─────────────────────────────────────────────────────
let dirHandle = null;
let bookmarkTreeData = null;
let selectedFolderIds = new Set();  // 勾选的文件夹 id
let selectedLeafUrls  = new Map();  // 单独勾选的叶子：url → bookmark 对象
let cancelSignal = { cancelled: false };

// ─── 初始化 ───────────────────────────────────────────────────
async function init() {
  await refreshDirStatus();
  btnPickDir.addEventListener('click', onPickDir);
  btnOptions.addEventListener('click', () => chrome.runtime.openOptionsPage());
  btnSavePage.addEventListener('click', onSavePage);
  btnStartImport.addEventListener('click', onStartImport);

  // 默认展开：直接加载收藏夹树
  loadBookmarksIntoTree();
}

async function loadBookmarksIntoTree() {
  if (bookmarkTreeData) return; // 已加载过则跳过
  if (!bookmarkTree) { console.error('[popup] #bookmark-tree not found in DOM'); return; }
  bookmarkTree.innerHTML = '<div class="loading-hint">正在加载...</div>';
  try {
    bookmarkTreeData = await loadBookmarkTree();
    renderTree(bookmarkTreeData);
  } catch (e) {
    bookmarkTree.innerHTML = `<div class="loading-hint" style="color:var(--color-danger)">加载失败: ${e.message}</div>`;
  }
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

function renderTree(nodes) {
  bookmarkTree.innerHTML = '';
  // Chrome 书签树顶层是一个无标题的虚拟根节点（id:"0"），
  // 直接跳过它，展示其子节点（书签栏、其他书签等）作为第一层
  const topNodes = (nodes.length === 1 && !nodes[0].url && !nodes[0].title)
    ? (nodes[0].children || [])
    : nodes;

  for (const node of topNodes) {
    const el = buildFolderNode(node);
    if (el) bookmarkTree.appendChild(el);
  }
}

function countBookmarks(node) {
  if (node.url) return 1;
  return (node.children || []).reduce((sum, c) => sum + countBookmarks(c), 0);
}

function buildFolderNode(node, parentPath = []) {
  // ── 书签叶子节点（有 url）──
  if (node.url) {
    const leaf = document.createElement('div');
    leaf.className = 'bookmark-leaf';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'leaf-checkbox';
    cb.dataset.url = node.url;

    leaf.addEventListener('click', () => {
      cb.checked = !cb.checked;
      toggleLeaf(node, parentPath, cb.checked);
    });
    cb.addEventListener('click', (e) => e.stopPropagation());
    cb.addEventListener('change', () => toggleLeaf(node, parentPath, cb.checked));

    const icon = document.createElement('span');
    icon.className = 'leaf-icon';
    icon.textContent = '🔗';

    const title = document.createElement('span');
    title.className = 'leaf-title';
    title.title = node.url;
    title.textContent = node.title || node.url;

    leaf.appendChild(cb);
    leaf.appendChild(icon);
    leaf.appendChild(title);
    return leaf;
  }

  // ── 文件夹节点 ──
  const total = countBookmarks(node);
  if (total === 0 && (node.children || []).length === 0) return null;

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

  // 展开/折叠箭头
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = childrenWrap.style.display !== 'none';
    childrenWrap.style.display = open ? 'none' : 'block';
    toggle.classList.toggle('open', !open);
  });

  // 勾选框
  checkbox.addEventListener('click', (e) => e.stopPropagation());
  checkbox.addEventListener('change', () => {
    toggleSelectionRecursive(node, checkbox.checked);
  });

  // 整行点击切换勾选
  row.addEventListener('click', () => {
    const newChecked = !checkbox.checked;
    checkbox.checked = newChecked;
    toggleSelectionRecursive(node, newChecked);
  });

  // 构建当前文件夹的路径，传给子叶子节点
  const currentPath = node.title ? [...parentPath, node.title] : parentPath;

  // 渲染所有子节点（包括书签叶子）
  for (const child of node.children || []) {
    const childEl = buildFolderNode(child, currentPath);
    if (childEl) childrenWrap.appendChild(childEl);
  }

  item.appendChild(row);
  if (childrenWrap.children.length > 0) item.appendChild(childrenWrap);

  return item;
}

/** 切换单个叶子书签的选中状态 */
function toggleLeaf(node, parentPath, checked) {
  if (checked) {
    selectedLeafUrls.set(node.url, { url: node.url, title: node.title || node.url, path: [...parentPath], tags: [...parentPath] });
  } else {
    selectedLeafUrls.delete(node.url);
  }
  updateSelectedCount();
}

/**
 * 递归勾选/取消节点及其所有子文件夹
 * 同时同步 DOM 中对应 checkbox 的视觉状态
 */
function toggleSelectionRecursive(node, checked) {
  if (node.url) return; // 跳过书签叶子

  // 更新 state
  if (checked) {
    selectedFolderIds.add(node.id);
  } else {
    selectedFolderIds.delete(node.id);
  }

  // 同步 DOM checkbox 视觉状态
  const domCheckbox = bookmarkTree.querySelector(`input[data-id="${node.id}"]`);
  if (domCheckbox) domCheckbox.checked = checked;

  // 递归处理子节点
  for (const child of node.children || []) {
    if (!child.url) {
      // 子文件夹：递归处理
      toggleSelectionRecursive(child, checked);
    } else {
      // 叶子书签：同步 DOM checkbox 视觉状态
      const leafCb = bookmarkTree.querySelector(`.leaf-checkbox[data-url="${CSS.escape(child.url)}"]`);
      if (leafCb) leafCb.checked = checked;
    }
  }

  updateSelectedCount();
}

function updateSelectedCount() {
  if (!bookmarkTreeData) return;
  const fromFolders = collectUrlsFromFolders(selectedFolderIds, bookmarkTreeData);
  // 合并叶子选择，按 url 去重
  const urlSet = new Set(fromFolders.map(b => b.url));
  const extra = [...selectedLeafUrls.values()].filter(b => !urlSet.has(b.url));
  selectedCount.textContent = `已选 ${fromFolders.length + extra.length} 个书签`;
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

  // 合并文件夹来源 + 单独勾选的叶子，按 url 去重
  const fromFolders = collectUrlsFromFolders(selectedFolderIds, bookmarkTreeData || []);
  const folderUrlSet = new Set(fromFolders.map(b => b.url));
  const fromLeafs = [...selectedLeafUrls.values()].filter(b => !folderUrlSet.has(b.url));
  const bookmarks = [...fromFolders, ...fromLeafs];

  if (bookmarks.length === 0) {
    alert('请至少选择一个文件夹或书签');
    return;
  }

  const mode = document.querySelector('input[name="import-mode"]:checked')?.value || 'summary';
  const { subDir = 'Clippings' } = await chrome.storage.sync.get({ subDir: 'Clippings' });

  cancelSignal = { cancelled: false };
  // 重置 session 里的取消标志
  await chrome.storage.session.set({ importCancelled: false });

  // 打开独立进度窗口
  const progressWin = await chrome.windows.create({
    url: chrome.runtime.getURL('progress/progress.html'),
    type: 'popup',
    width: 700,
    height: 600,
    focused: true,
  });

  // 等待进度窗口加载完成再开始推送（给它一点时间注册 onMessage）
  await new Promise(r => setTimeout(r, 600));

  // 监听来自进度窗口的取消指令（两种方式并存：消息监听 + session 轮询）
  chrome.runtime.onMessage.addListener(function cancelListener(message) {
    if (message.type === 'CANCEL_IMPORT') {
      cancelSignal.cancelled = true;
      chrome.storage.session.set({ importCancelled: true });
      chrome.runtime.onMessage.removeListener(cancelListener);
    }
  });

  // session 轮询：即使 popup 未关闭也能感知到取消（防止消息丢失）
  const cancelPoller = setInterval(async () => {
    const { importCancelled } = await chrome.storage.session.get({ importCancelled: false });
    if (importCancelled) {
      cancelSignal.cancelled = true;
      clearInterval(cancelPoller);
    }
  }, 300);

  // 通知 Service Worker 启动保活
  chrome.runtime.sendMessage({ type: 'START_IMPORT' });

  let done = 0, skipped = 0, failed = 0;
  const total = bookmarks.length;

  // 初始化进度窗口进度条
  broadcastProgress(done, skipped, failed, total);

  const tasks = bookmarks.map((bm) => async () => {
    if (cancelSignal.cancelled) return;

    // 告知进度窗口当前正在处理哪条
    chrome.runtime.sendMessage({ type: 'IMPORT_PROCESSING', title: bm.title || bm.url });

    const result = await processBookmark(bm, mode);
    if (result.skipped) {
      skipped++;
      broadcastLog(`⏭️ ${bm.title || bm.url}（${result.reason || '跳过'}）`, 'skip');
    } else {
      try {
        const mdContent = buildMarkdownFile(result.meta, result.contentHtml, mode);
        const writePath = bm.path && bm.path.length > 0 ? [subDir, ...bm.path] : [subDir];
        await writeMarkdownFile(dirHandle, writePath, result.meta.title, mdContent);
        done++;
        broadcastLog(`✅ ${result.meta.title}`, 'success');
      } catch (e) {
        failed++;
        broadcastLog(`❌ ${bm.title || bm.url}（写入失败: ${e.message}）`, 'error');
      }
    }

    broadcastProgress(done, skipped, failed, total);
    // 同步到 session storage（进度窗口刷新时可恢复）
    chrome.storage.session.set({ importProgress: { done, skipped, failed, total, finished: false } });
    return result;
  });

  await runConcurrent(tasks, CONCURRENCY, null, cancelSignal);

  // 完成：通知进度窗口
  const cancelled = cancelSignal.cancelled;
  chrome.runtime.sendMessage({ type: 'IMPORT_DONE', cancelled, done, skipped, failed });
  chrome.storage.session.set({ importProgress: { done, skipped, failed, total, finished: true, cancelled } });
  chrome.runtime.sendMessage({ type: 'STOP_IMPORT' });
}

/** 向所有扩展页面广播进度更新 */
function broadcastProgress(done, skipped, failed, total) {
  chrome.runtime.sendMessage({ type: 'IMPORT_PROGRESS', done, skipped, failed, total });
}

/** 向所有扩展页面广播日志条目 */
function broadcastLog(text, logType) {
  chrome.runtime.sendMessage({ type: 'IMPORT_LOG', text, logType });
}

// ─── 启动 ─────────────────────────────────────────────────────
init();
