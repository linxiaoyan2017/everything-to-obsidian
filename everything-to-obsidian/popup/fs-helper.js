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
/**
 * 从 IndexedDB 读取已存 handle，仅查询权限（不弹授权弹窗）
 * 适合页面加载时自动调用，无需用户手势
 * @returns {{ handle, name, needsReauth: boolean } | null}
 */
export async function getDirectoryHandle() {
  const handle = await loadHandle();
  if (!handle) return null;

  const permission = await handle.queryPermission({ mode: 'readwrite' });
  if (permission === 'granted') {
    return { handle, name: handle.name, needsReauth: false };
  }

  // 权限已失效（prompt 状态），告知调用方需要用户手势才能恢复
  // 不在这里调用 requestPermission，因为此时可能不在用户手势上下文
  return { handle, name: handle.name, needsReauth: true };
}

/**
 * 在用户手势上下文中恢复权限（点击按钮时调用）
 * @returns {{ handle, name } | null}
 */
export async function reauthorizeHandle() {
  const handle = await loadHandle();
  if (!handle) return null;

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
 * 枚举已授权根目录下的所有直接子目录，返回名称数组（按字母顺序）
 * @param {FileSystemDirectoryHandle} dirHandle
 * @returns {Promise<string[]>}
 */
export async function listSubDirectories(dirHandle) {
  const names = [];
  for await (const [name, entry] of dirHandle.entries()) {
    if (entry.kind === 'directory') {
      names.push(name);
    }
  }
  return names.sort((a, b) => a.localeCompare(b, 'zh'));
}

/**
 * 写入 Markdown 文件，支持多级子目录
 * @param {FileSystemDirectoryHandle} dirHandle  根目录句柄
 * @param {string | string[]} subPath  子目录：字符串（单级）或字符串数组（多级路径）
 * @param {string} filename  文件名（不含扩展名）
 * @param {string} content   文件内容
 * @returns {Promise<string>}  实际写入的文件名
 */
export async function writeMarkdownFile(dirHandle, subPath, filename, content) {
  // 支持字符串（单级）和数组（多级）
  const segments = Array.isArray(subPath) ? subPath : [subPath];

  // 逐级创建目录
  let currentHandle = dirHandle;
  for (const seg of segments) {
    if (seg) {
      currentHandle = await currentHandle.getDirectoryHandle(seg, { create: true });
    }
  }

  // 创建或覆盖文件
  const safeFilename = sanitizeFilename(filename) + '.md';
  const fileHandle = await currentHandle.getFileHandle(safeFilename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();

  return safeFilename;
}
