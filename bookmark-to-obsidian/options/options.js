/**
 * options.js — 设置页面控制器
 * 7.1 目录授权  7.2 子目录名配置
 */

import { pickDirectory, getDirectoryHandle } from '../popup/fs-helper.js';

const dirDisplay  = document.getElementById('dir-display');
const btnPickDir  = document.getElementById('btn-pick-dir');
const inputSubdir = document.getElementById('input-subdir');
const btnSave     = document.getElementById('btn-save');
const saveHint    = document.getElementById('save-hint');

async function init() {
  // 显示当前目录状态
  await refreshDirDisplay();

  // 加载已保存的子目录名
  const { subDir = 'Clippings' } = await chrome.storage.sync.get({ subDir: 'Clippings' });
  inputSubdir.value = subDir;

  btnPickDir.addEventListener('click', onPickDir);
  btnSave.addEventListener('click', onSave);
}

async function refreshDirDisplay() {
  dirDisplay.textContent = '正在检查...';
  dirDisplay.className = 'dir-display';
  try {
    const result = await getDirectoryHandle();
    if (result) {
      dirDisplay.textContent = `✅ 已授权: ${result.name}`;
      dirDisplay.className = 'dir-display granted';
    } else {
      dirDisplay.textContent = '未授权，请点击下方按钮选择目录';
    }
  } catch {
    dirDisplay.textContent = '未授权';
  }
}

async function onPickDir() {
  try {
    await pickDirectory();
    await refreshDirDisplay();
  } catch (e) {
    if (e.name !== 'AbortError') {
      dirDisplay.textContent = `授权失败: ${e.message}`;
    }
  }
}

// 7.2 保存子目录名到 chrome.storage.sync
async function onSave() {
  const subDir = inputSubdir.value.trim() || 'Clippings';
  inputSubdir.value = subDir;
  await chrome.storage.sync.set({ subDir });
  saveHint.style.display = 'block';
  setTimeout(() => { saveHint.style.display = 'none'; }, 2000);
}

init();
