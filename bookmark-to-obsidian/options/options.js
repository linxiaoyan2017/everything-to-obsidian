/**
 * options.js — 设置页面控制器
 * 6.2~6.5 子目录下拉选择器完整逻辑
 */

import { pickDirectory, getDirectoryHandle, listSubDirectories } from '../popup/fs-helper.js';

const dirDisplay   = document.getElementById('dir-display');
const btnPickDir   = document.getElementById('btn-pick-dir');
const selectSubdir = document.getElementById('select-subdir');
const newDirArea   = document.getElementById('new-dir-area');
const inputNewDir  = document.getElementById('input-new-dir');
const btnCreateDir = document.getElementById('btn-create-dir');
const saveHint     = document.getElementById('save-hint');

const NEW_DIR_VALUE = '__new__';
let currentDirHandle = null;

async function init() {
  await refreshDirDisplay();
  btnPickDir.addEventListener('click', onPickDir);
  selectSubdir.addEventListener('change', onSelectChange);
  btnCreateDir.addEventListener('click', onCreateDir);
}

// ─── 授权目录显示 & 子目录列表加载 ───────────────────────────

async function refreshDirDisplay() {
  dirDisplay.textContent = '正在检查...';
  dirDisplay.className = 'dir-display';

  try {
    const result = await getDirectoryHandle();
    if (result) {
      currentDirHandle = result.handle;
      dirDisplay.textContent = `✅ 已授权: ${result.name}`;
      dirDisplay.className = 'dir-display granted';
      await loadSubDirOptions();
    } else {
      currentDirHandle = null;
      dirDisplay.textContent = '未授权，请点击下方按钮选择目录';
      setSelectDisabled();
    }
  } catch {
    currentDirHandle = null;
    dirDisplay.textContent = '未授权';
    setSelectDisabled();
  }
}

// 6.5 未授权时禁用下拉框
function setSelectDisabled() {
  selectSubdir.innerHTML = '<option value="">请先选择授权目录</option>';
  selectSubdir.disabled = true;
  newDirArea.style.display = 'none';
}

// 6.2 填充子目录下拉框
async function loadSubDirOptions() {
  selectSubdir.innerHTML = '<option value="">加载中...</option>';
  selectSubdir.disabled = true;

  try {
    const dirs = await listSubDirectories(currentDirHandle);
    const { subDir = 'Clippings' } = await chrome.storage.sync.get({ subDir: 'Clippings' });

    selectSubdir.innerHTML = '';

    // 添加已有子目录选项
    if (dirs.length === 0) {
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = '（暂无子目录）';
      placeholder.disabled = true;
      selectSubdir.appendChild(placeholder);
    } else {
      for (const dir of dirs) {
        const opt = document.createElement('option');
        opt.value = dir;
        opt.textContent = `📁 ${dir}`;
        selectSubdir.appendChild(opt);
      }
    }

    // 末尾追加「新建目录」
    const newOpt = document.createElement('option');
    newOpt.value = NEW_DIR_VALUE;
    newOpt.textContent = '✏️ 新建目录…';
    selectSubdir.appendChild(newOpt);

    // 恢复上次保存的选中值
    if (subDir && dirs.includes(subDir)) {
      selectSubdir.value = subDir;
    } else if (dirs.length > 0) {
      selectSubdir.value = dirs[0];
    } else {
      selectSubdir.value = NEW_DIR_VALUE;
      newDirArea.style.display = 'block';
    }

    selectSubdir.disabled = false;
  } catch (e) {
    selectSubdir.innerHTML = `<option value="">读取失败: ${e.message}</option>`;
    selectSubdir.disabled = true;
  }
}

// 6.3 下拉框变化：自动保存 or 显示新建输入框
async function onSelectChange() {
  const val = selectSubdir.value;

  if (val === NEW_DIR_VALUE) {
    newDirArea.style.display = 'block';
    inputNewDir.focus();
    return;
  }

  // 隐藏新建区域
  newDirArea.style.display = 'none';
  inputNewDir.value = '';

  if (val && val !== '') {
    await chrome.storage.sync.set({ subDir: val });
    showSaved();
  }
}

// 6.4 确认创建新子目录
async function onCreateDir() {
  const name = inputNewDir.value.trim();
  if (!name) {
    inputNewDir.focus();
    return;
  }
  if (!currentDirHandle) {
    alert('请先选择授权目录');
    return;
  }

  try {
    // 在文件系统中实际创建目录
    await currentDirHandle.getDirectoryHandle(name, { create: true });

    // 保存到 storage
    await chrome.storage.sync.set({ subDir: name });

    // 刷新下拉框并选中新目录
    inputNewDir.value = '';
    newDirArea.style.display = 'none';
    await loadSubDirOptions();

    showSaved();
  } catch (e) {
    alert(`创建目录失败: ${e.message}`);
  }
}

async function onPickDir() {
  try {
    const handle = await pickDirectory();
    currentDirHandle = handle;
    await refreshDirDisplay();
  } catch (e) {
    if (e.name !== 'AbortError') {
      dirDisplay.textContent = `授权失败: ${e.message}`;
    }
  }
}

function showSaved() {
  saveHint.style.display = 'block';
  setTimeout(() => { saveHint.style.display = 'none'; }, 2000);
}

init();