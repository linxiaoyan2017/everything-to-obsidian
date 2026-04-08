/**
 * fs-helper.js — File System Access API 封装
 * 提供目录授权、持久化、文件写入功能
 */

const DB_NAME = 'bookmark-obsidian';
const DB_VERSION = 1;
const STORE_NAME = 'fs-handles';
const HANDLE_KEY = 'obsidian-dir';

// ─── IndexedDB 工具 ───────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function saveHandle(handle) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
    tx.oncomplete = resolve;
    tx.onerror = (e) => reject(e.target.error);
  });
}

async function loadHandle() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(HANDLE_KEY);
    req.onsuccess = (e) => resolve(e.target.result || null);
    req.onerror = (e) => reject(e.target.error);
  });
}

// ─── 2.1 目录选择与授权 ──────────────────────────────────────

/**
 * 弹出目录选择器，将选择的 handle 存入 IndexedDB
 * @returns {FileSystemDirectoryHandle} 授权的目录句柄
 */
export async function pickDirectory() {
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
  await saveHandle(handle);
  return handle;
}

// ─── 2.2 读取已保存的目录句柄并验证权限 ─────────────────────

/**
 * 从 IndexedDB 读取已存 handle，验证权限有效性
 * @returns {{ handle: FileSystemDirectoryHandle, name: string } | null}
 */
export async function getDirectoryHandle() {
  const handle = await loadHandle();
  if (!handle) return null;

  const permission = await handle.queryPermission({ mode: 'readwrite' });
  if (permission === 'granted') {
    return { handle, name: handle.name };
  }

  // 权限已失效，尝试重新请求（需要在用户手势上下文中调用）
  const requested = await handle.requestPermission({ mode: 'readwrite' });
  if (requested === 'granted') {
    return { handle, name: handle.name };
  }

  return null;
}

// ─── 2.3 文件名 sanitize ─────────────────────────────────────

/**
 * 将页面标题转为合法文件名（去除非法字符，截断至 100 字符）
 * @param {string} title
 * @returns {string} 合法文件名（不含扩展名）
 */
export function sanitizeFilename(title) {
  if (!title || title.trim() === '') return 'Untitled';
  return title
    .replace(/[/\\:*?"<>|]/g, '')  // 去除文件系统非法字符
    .replace(/\s+/g, ' ')           // 合并空白
    .trim()
    .slice(0, 100);
}

// ─── 2.4 写入 Markdown 文件 ───────────────────────────────────

/**
 * 在授权目录的指定子目录下写入 .md 文件（子目录不存在时自动创建，同名文件覆盖）
 * @param {FileSystemDirectoryHandle} dirHandle  授权的根目录句柄
 * @param {string} subDir  子目录名（如 "Clippings"）
 * @param {string} filename  文件名（不含 .md 后缀）
 * @param {string} content  Markdown 内容
 */
export async function writeMarkdownFile(dirHandle, subDir, filename, content) {
  // 自动创建子目录
  const subDirHandle = await dirHandle.getDirectoryHandle(subDir, { create: true });

  // 创建或覆盖文件
  const safeFilename = sanitizeFilename(filename) + '.md';
  const fileHandle = await subDirHandle.getFileHandle(safeFilename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();

  return safeFilename;
}
