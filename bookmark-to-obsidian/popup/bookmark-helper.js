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

  function traverse(node, pathTags) {
    if (!node) return;

    if (node.url) {
      // 这是书签叶子节点，但 traverse 只负责寻找选中的文件夹
      // 书签收集只能由 traverseCollect 完成，这里直接跳过
      return;
    }

    // 这是文件夹
    const children = node.children || [];
    const folderName = node.title || '';
    const isSelected = selectedFolderIds.has(node.id);

    if (isSelected) {
      // 选中的文件夹：把此文件夹名加入 tags，递归收集所有子项
      const newTags = folderName ? [...pathTags, folderName] : pathTags;
      for (const child of children) {
        traverseCollect(child, newTags);
      }
    } else {
      // 未选中，继续往下找是否有选中的子文件夹
      for (const child of children) {
        traverse(child, pathTags);
      }
    }
  }

  function traverseCollect(node, tags) {
    if (!node) return;
    if (node.url) {
      results.push({ url: node.url, title: node.title || node.url, tags: [...tags] });
      return;
    }
    const newTags = node.title ? [...tags, node.title] : tags;
    for (const child of node.children || []) {
      traverseCollect(child, newTags);
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

  const fetchPromise = (async () => {
    // 打开后台标签页（不激活，用户不感知）
    const tab = await new Promise((resolve, reject) => {
      chrome.tabs.create({ url: bookmark.url, active: false }, (tab) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(tab);
      });
    });

    // 等待页面加载完成
    await waitForTabLoad(tab.id, TIMEOUT_MS);

    // 注入 Readability + extractor
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['lib/readability.min.js'],
    });

    const extracted = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content/extractor.js'],
    });

    // 关闭标签页
    chrome.tabs.remove(tab.id);

    const data = extracted[0]?.result;
    if (!data || !data.success) {
      throw new Error('EXTRACT_FAILED');
    }

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
    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (err) {
    // 5.5 死链处理：记录原因，标记跳过
    const reason = err.message === 'TIMEOUT' ? '超时（>15s）' : err.message;
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
