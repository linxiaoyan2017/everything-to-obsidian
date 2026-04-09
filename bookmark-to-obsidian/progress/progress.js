/**
 * progress.js — 独立进度窗口控制器
 * 通过 chrome.runtime.onMessage 接收来自 popup 的实时进度推送
 */

const titleEl       = document.getElementById('title');
const progressBar   = document.getElementById('progress-bar');
const progressLabel = document.getElementById('progress-label');
const processingHint= document.getElementById('processing-hint');
const progressLog   = document.getElementById('progress-log');
const summaryEl     = document.getElementById('import-summary');
const btnCancel     = document.getElementById('btn-cancel');
const btnClose      = document.getElementById('btn-close');

// ─── 接收实时消息 ─────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message) => {
  switch (message.type) {
    case 'IMPORT_PROCESSING':
      // 显示当前正在处理哪条
      processingHint.textContent = `⏳ 正在处理：${message.title}`;
      break;
    case 'IMPORT_PROGRESS':
      onProgress(message);
      break;
    case 'IMPORT_LOG':
      addLog(message.text, message.logType);
      // 日志写入后清空"正在处理"提示
      processingHint.textContent = '';
      break;
    case 'IMPORT_DONE':
      processingHint.textContent = '';
      onDone(message);
      break;
    case 'IMPORT_CANCEL_ACK':
      btnCancel.disabled = true;
      btnCancel.textContent = '取消中…';
      break;
  }
});

// ─── 初始化：从 session storage 恢复进度（防止页面刷新丢失） ─
async function init() {
  btnCancel.style.display = 'inline-block';
  btnCancel.addEventListener('click', async () => {
    // 双保险：消息 + session storage 都写入，确保 popup.js 一定能收到
    chrome.runtime.sendMessage({ type: 'CANCEL_IMPORT' });
    await chrome.storage.session.set({ importCancelled: true });
    btnCancel.disabled = true;
    btnCancel.textContent = '取消中…';
  });
  btnClose.addEventListener('click', () => window.close());

  // 尝试恢复已有进度
  const { importProgress } = await chrome.storage.session.get({ importProgress: null });
  if (importProgress) {
    const { done, skipped, failed, total } = importProgress;
    const processed = done + skipped + failed;
    updateProgressBar(processed, total);
    if (importProgress.finished) {
      onDone({ cancelled: importProgress.cancelled, done, skipped, failed });
    }
  }
}

function onProgress({ done, skipped, failed, total }) {
  const processed = done + skipped + failed;
  updateProgressBar(processed, total);
}

function updateProgressBar(processed, total) {
  const pct = total > 0 ? Math.round(processed / total * 100) : 0;
  progressBar.style.width = `${pct}%`;
  progressLabel.textContent = `${processed} / ${total}`;
}

function addLog(text, type = 'success') {
  const item = document.createElement('div');
  item.className = `log-item ${type}`;
  item.textContent = text;
  progressLog.appendChild(item);
  progressLog.scrollTop = progressLog.scrollHeight;
}

function onDone({ cancelled, done, skipped, failed }) {
  titleEl.textContent = cancelled ? '📥 已取消' : '📥 导入完成';
  summaryEl.innerHTML = cancelled
    ? `已取消<br>✅ 已完成 ${done} 条 &nbsp;⏭️ 跳过 ${skipped} 条 &nbsp;❌ 失败 ${failed} 条`
    : `导入完成！<br>✅ 成功 ${done} 条 &nbsp;⏭️ 跳过 ${skipped} 条 &nbsp;❌ 失败 ${failed} 条`;
  summaryEl.style.display = 'block';
  btnCancel.style.display = 'none';
  btnClose.style.display = 'inline-block';
}

init();
