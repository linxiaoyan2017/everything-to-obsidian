/**
 * bookmark-helper.js — 收藏夹导入模块
 * 5.1 读取书签树、5.2 收集URL、5.3 并发队列、5.4 单书签处理、5.5 死链跳过
 */

// ─── 5.1 加载书签树 ───────────────────────────────────────────

/**
 * 读取 Chrome 完整书签树
 * @returns {Promise<chrome.bookmarks.BookmarkTreeNode[]>}
 */
export function loadBookmarkTree() {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.getTree((tree) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(tree);
      }
    });
  });
}

// ─── 5.2 递归收集选中文件夹的所有书签 ────────────────────────

/**
 * 根据选中的文件夹 ID 集合，递归收集所有子书签 URL
 * @param {Set<string>} selectedFolderIds  用户勾选的文件夹 id 集合
 * @param {chrome.bookmarks.BookmarkTreeNode[]} tree  完整书签树
 * @returns {{ url: string, title: string, tags: string[] }[]}
 */
export function collectUrlsFromFolders(selectedFolderIds, tree) {
  const results = [];

  function traverse(node, pathSegments) {
    if (!node) return;

    if (node.url) {
      // 叶子书签，只能由 traverseCollect 处理，这里跳过
      return;
    }

    // 文件夹节点
    const children = node.children || [];
    const folderName = node.title || '';
    const isSelected = selectedFolderIds.has(node.id);

    if (isSelected) {
      // 选中的文件夹：从该文件夹名开始构建路径
      const newPath = folderName ? [...pathSegments, folderName] : pathSegments;
      for (const child of children) {
        traverseCollect(child, newPath);
      }
    } else {
      // 未选中，继续往下找选中的子文件夹
      for (const child of children) {
        traverse(child, pathSegments);
      }
    }
  }

  /**
   * 递归收集书签，path 为从选中文件夹开始的相对路径数组
   * 书签叶子节点：path 就是它所在的目录层级
   * tags 从 path 自动生成
   */
  function traverseCollect(node, path) {
    if (!node) return;
    if (node.url) {
      results.push({
        url: node.url,
        title: node.title || node.url,
        path: [...path],          // 目录层级，用于写文件时创建子目录
        tags: [...path],          // 同时作为 YAML tags
      });
      return;
    }
    // 子文件夹：继续深入，路径追加文件夹名
    const newPath = node.title ? [...path, node.title] : path;
    for (const child of node.children || []) {
      traverseCollect(child, newPath);
    }
  }

  for (const root of tree) {
    traverse(root, []);
  }

  return results;
}

// ─── 5.3 并发任务队列 ─────────────────────────────────────────

/**
 * 以固定并发数运行任务数组
 * @param {Array<() => Promise<any>>} tasks  任务函数数组
 * @param {number} concurrency  并发数（设计默认 3）
 * @param {(result: any, index: number) => void} onProgress  每完成一个任务的回调
 * @param {{ cancelled: boolean }} cancelSignal  取消信号对象
 */
export async function runConcurrent(tasks, concurrency, onProgress, cancelSignal) {
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      if (cancelSignal && cancelSignal.cancelled) break;
      const i = index++;
      const task = tasks[i];
      try {
        const result = await task();
        onProgress && onProgress(result, i);
      } catch (err) {
        onProgress && onProgress({ error: err.message, skipped: true }, i);
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
}

// ─── 5.4 单书签处理流程 ───────────────────────────────────────

/**
 * 处理单个书签：打开后台标签页 → 注入脚本提取内容 → 关闭标签页 → 返回提取结果
 * @param {{ url: string, title: string, tags: string[] }} bookmark
 * @param {'summary' | 'full'} mode
 * @returns {Promise<{ meta: object, contentHtml: string, skipped: boolean, reason?: string }>}
 */
export async function processBookmark(bookmark, mode) {
  const TIMEOUT_MS = 15000;

  // 5.5 超时控制
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('TIMEOUT')), TIMEOUT_MS)
  );

  let createdTabId = null;

  const fetchPromiseWithTabTracking = (async () => {
    const tab = await new Promise((resolve, reject) => {
      chrome.tabs.create({ url: bookmark.url, active: false }, (tab) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(tab);
      });
    });
    createdTabId = tab.id;

    await waitForTabLoad(tab.id, TIMEOUT_MS);

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['lib/readability.min.js'],
    });

    const extracted = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content/extractor.js'],
    });

    chrome.tabs.remove(tab.id);
    createdTabId = null;

    const data = extracted[0]?.result;
    if (!data || !data.success) throw new Error('EXTRACT_FAILED');

    return {
      meta: {
        title: data.title || bookmark.title,
        source: bookmark.url,
        author: data.author,
        description: data.description,
        tags: bookmark.tags,
        dateSaved: new Date().toISOString().slice(0, 10),
      },
      contentHtml: mode === 'full' ? data.contentHtml : '',
      skipped: false,
    };
  })();

  try {
    return await Promise.race([fetchPromiseWithTabTracking, timeoutPromise]);
  } catch (err) {
    // 超时或失败：确保关闭遗留的标签页
    if (createdTabId !== null) {
      chrome.tabs.remove(createdTabId).catch(() => {});
      createdTabId = null;
    }
    const reason = err.message === 'TIMEOUT' ? `超时（>${TIMEOUT_MS / 1000}s）` : err.message;
    return {
      meta: { title: bookmark.title, source: bookmark.url, tags: bookmark.tags },
      contentHtml: '',
      skipped: true,
      reason,
    };
  }
}

/**
 * 等待指定标签页加载完成
 */
function waitForTabLoad(tabId, timeout) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('TIMEOUT')), timeout);

    function listener(updatedTabId, changeInfo) {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}
